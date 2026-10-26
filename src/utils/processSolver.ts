import type {
  EquipmentLimits,
  MeasuredPoint,
  PredictionWarning,
  ProcessConditions,
  ProcessSolveMode,
  ProcessSolveParams,
  ProcessSolveResult,
  ResinConfig,
} from '../types';
import {calculateThickness, calibrateModel, SOLIDS_MAX} from './meyerhofer';

export const DEFAULT_EQUIPMENT_LIMITS: EquipmentLimits = {
  minSpeed: 500,
  maxSpeed: 6000,
  minTime: 5,
  maxTime: 120,
};

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** 固定另一製程條件，反算冪次公式中的未知製程值；無有效有限正解時回傳 null。 */
function calculateRequiredProcess(
  targetThickness: number,
  solids: number,
  fixedValue: number,
  C: number,
  alpha: number,
  solvedExponent: number,
  fixedExponent: number
): number | null {
  if (![targetThickness, solids, fixedValue, C, solvedExponent].every(isPositiveFinite)
    || !Number.isFinite(alpha) || !Number.isFinite(fixedExponent)) return null;

  const numerator = C * Math.pow(solids, alpha) * Math.pow(fixedValue, -fixedExponent);
  const result = Math.pow(numerator / targetThickness, 1 / solvedExponent);
  return isPositiveFinite(result) ? result : null;
}

/** 時間固定，ω = (C · S^α · t^(−γ) / h)^(1/β)，轉速單位 rpm。 */
export function calculateRequiredSpinSpeed(
  targetThickness: number,
  solids: number,
  time: number,
  C: number,
  alpha: number,
  beta: number,
  gamma: number
): number | null {
  return calculateRequiredProcess(targetThickness, solids, time, C, alpha, beta, gamma);
}

/** 轉速固定，t = (C · S^α · ω^(−β) / h)^(1/γ)，時間單位 s。 */
export function calculateRequiredSpinTime(
  targetThickness: number,
  solids: number,
  rpm: number,
  C: number,
  alpha: number,
  beta: number,
  gamma: number
): number | null {
  return calculateRequiredProcess(targetThickness, solids, rpm, C, alpha, gamma, beta);
}

/** 先將實測膜厚換算至第一個有效點的條件，再交由既有 calibrateModel 校正。 */
export function normalizeMeasuredPoints(
  resin: ResinConfig,
  points: MeasuredPoint[],
  fallbackConditions?: ProcessConditions
) {
  const warnings: PredictionWarning[] = [];
  const preparedPoints: Array<MeasuredPoint & ProcessConditions> = [];
  let assumedCount = 0;
  let missingCount = 0;

  for (const point of points) {
    if (!isPositiveFinite(point.solidsContent) || !isPositiveFinite(point.thickness)) continue;
    const spinSpeed = point.spinSpeed ?? fallbackConditions?.spinSpeed;
    const spinTime = point.spinTime ?? fallbackConditions?.spinTime;
    if (spinSpeed === undefined || spinTime === undefined
      || !isPositiveFinite(spinSpeed) || !isPositiveFinite(spinTime)) {
      missingCount++;
      continue;
    }
    if (point.spinSpeed === undefined || point.spinTime === undefined) assumedCount++;
    preparedPoints.push({...point, spinSpeed, spinTime});
  }

  if (assumedCount > 0 && fallbackConditions) {
    warnings.push({
      code: 'POINT_CONDITIONS_ASSUMED',
      message: `有 ${assumedCount} 個實測點沒有記錄量測條件，已假設為 ${fallbackConditions.spinSpeed} rpm / ${fallbackConditions.spinTime} s；僅補上缺少的欄位，已記錄的條件維持不變`,
    });
  }
  if (missingCount > 0) {
    warnings.push({
      code: 'POINT_CONDITIONS_MISSING',
      message: `有 ${missingCount} 個實測點缺少有效的量測轉速或時間，且無法由備用條件補足，已排除校正；若沒有可用實測點，則使用理論模式`,
    });
  }

  const first = preparedPoints[0];
  const referenceConditions = first
    ? {spinSpeed: first.spinSpeed, spinTime: first.spinTime}
    : null;
  const normalizedPoints: MeasuredPoint[] = [];
  if (referenceConditions) {
    for (const point of preparedPoints) {
      const thickness = point.thickness
        * Math.pow(point.spinSpeed / referenceConditions.spinSpeed, resin.beta)
        * Math.pow(point.spinTime / referenceConditions.spinTime, resin.gamma);
      if (isPositiveFinite(thickness)) {
        normalizedPoints.push({...point, ...referenceConditions, thickness});
      } else {
        warnings.push({
          code: 'PROCESS_UNSOLVABLE',
          message: `實測點 ${point.id} 的等效膜厚無法換算為有限正數，已排除該點的校正`,
        });
      }
    }
  }
  return {normalizedPoints, referenceConditions: normalizedPoints.length ? referenceConditions : null, warnings};
}

/** 固定固含量，反算轉速或時間；超出設備範圍僅警告，不截斷數值。 */
export function runProcessSolve(
  resin: ResinConfig,
  mode: ProcessSolveMode,
  params: ProcessSolveParams
): ProcessSolveResult {
  const {solids, targetThickness, measuredPoints, fallbackConditions} = params;
  const normalized = normalizeMeasuredPoints(resin, measuredPoints, fallbackConditions);
  const referenceConditions = normalized.referenceConditions;
  // 0 點校正不使用製程條件，給予有效佔位值，不以未知製程值作為量測條件。
  const calibration = calibrateModel(
    resin,
    referenceConditions?.spinSpeed ?? 1,
    referenceConditions?.spinTime ?? 1,
    normalized.normalizedPoints
  );
  const warnings: PredictionWarning[] = [...normalized.warnings, ...calibration.warnings];
  const tolerancePercent = Math.min(10.0, Math.max(0.1, params.tolerancePercent || 5.0));
  const lowerThickness = targetThickness * (1 - tolerancePercent / 100.0);
  const upperThickness = targetThickness * (1 + tolerancePercent / 100.0);
  const fixedValue = (mode === 'solve_speed' ? params.fixedTime : params.fixedSpeed) ?? NaN;
  const solve = mode === 'solve_speed' ? calculateRequiredSpinSpeed : calculateRequiredSpinTime;
  const solveAt = (thickness: number) => solve(
    thickness, solids, fixedValue, calibration.calibratedC, calibration.calibratedAlpha,
    resin.beta, resin.gamma
  );
  let recommended = solveAt(targetThickness);
  let rangeMin = solveAt(upperThickness);
  let rangeMax = solveAt(lowerThickness);

  if (!isPositiveFinite(solids) || solids > SOLIDS_MAX) {
    warnings.push({
      code: 'SOLIDS_OUT_OF_RANGE',
      message: !isPositiveFinite(solids)
        ? `固含量不是有限正數（${solids} wt%），無法反算，建議值與容差窗回傳無解`
        : `固含量 ${solids} wt% 超過上限 ${SOLIDS_MAX} wt%，反算數值照常回傳，結果僅供參考`,
      field: 'solids',
      value: solids,
    });
  }

  if (recommended === null || rangeMin === null || rangeMax === null) {
    recommended = rangeMin = rangeMax = null;
    warnings.push({
      code: 'PROCESS_UNSOLVABLE',
      message: `無法反算${mode === 'solve_speed' ? '轉速' : '時間'}：固含量、目標膜厚與固定製程值須為有限正數，${mode === 'solve_speed' ? 'β' : 'γ'} 須大於 0，且模型參數與運算結果須有效；建議值與容差窗回傳無解`,
    });
  } else {
    const limits = {...DEFAULT_EQUIPMENT_LIMITS, ...params.limits};
    const min = mode === 'solve_speed' ? limits.minSpeed : limits.minTime;
    const max = mode === 'solve_speed' ? limits.maxSpeed : limits.maxTime;
    const unit = mode === 'solve_speed' ? 'rpm' : 's';
    const label = mode === 'solve_speed' ? '轉速' : '時間';
    for (const [field, endpoint, value] of [
      ['recommended', '建議值', recommended],
      ['rangeMin', '容差窗下界', rangeMin],
      ['rangeMax', '容差窗上界', rangeMax],
    ] as const) {
      if (value < min || value > max) {
        warnings.push({
          code: 'PROCESS_OUT_OF_RANGE',
          message: `${label}${endpoint} ${value} ${unit} ${value < min ? `低於設備下限 ${min}` : `超過設備上限 ${max}`} ${unit}，數值照常回傳，未截斷至設備範圍`,
          field,
          value,
        });
      }
    }
  }

  return {
    mode,
    solids,
    targetThickness,
    tolerancePercent,
    lowerThickness,
    upperThickness,
    ...(mode === 'solve_speed' ? {fixedTime: params.fixedTime} : {fixedSpeed: params.fixedSpeed}),
    recommended,
    rangeMin,
    rangeMax,
    calibration,
    referenceConditions,
    warnings,
    exponentsCalibrated: false,
  };
}

/** 在設備範圍內等距取樣，使用校正後參數與固定固含量。 */
export function generateProcessCurvePoints(
  result: ProcessSolveResult & {equipmentLimits?: EquipmentLimits},
  count: number = 60
): Array<{x: number; thickness: number}> {
  if (!Number.isInteger(count) || count < 2 || result.recommended === null) return [];
  const limits = result.equipmentLimits ?? DEFAULT_EQUIPMENT_LIMITS;
  const min = result.mode === 'solve_speed' ? limits.minSpeed : limits.minTime;
  const max = result.mode === 'solve_speed' ? limits.maxSpeed : limits.maxTime;
  const c = result.calibration;
  return Array.from({length: count}, (_, i) => {
    const x = min + (max - min) * i / (count - 1);
    return {x, thickness: calculateThickness(result.solids,
      result.mode === 'solve_speed' ? x : result.fixedSpeed!,
      result.mode === 'solve_time' ? x : result.fixedTime!,
      c.calibratedC, c.calibratedAlpha, c.beta, c.gamma)};
  });
}
