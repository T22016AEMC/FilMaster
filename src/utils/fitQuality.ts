import type {CalibrationResult, MeasuredPoint, PredictionWarning, ProcessConditions, ResinConfig} from '../types';
import {calculateThickness} from './meyerhofer';
import {normalizeMeasuredPoints} from './processSolver';

export interface FitQualityPoint extends MeasuredPoint {
  spinSpeed: number;
  spinTime: number;
  predicted: number;
  residual: number; // 預測 − 實測，nm
  residualPercent: number;
}

export interface FitQualityResult {
  notApplicable: boolean;
  reason: string | null;
  points: FitQualityPoint[];
  count: number;
  rmse: number | null;
  meanAbsoluteErrorPercent: number | null;
  maxAbsoluteErrorPercent: number | null;
  maxErrorPointId: string | null;
  warnings: PredictionWarning[];
}

/** 僅檢視已採用模型的誤差，不重新擬合，也不改變校正與預測結果。 */
export function calculateFitQuality(
  resin: ResinConfig,
  calibration: CalibrationResult,
  measuredPoints: MeasuredPoint[],
  fallbackConditions?: ProcessConditions
): FitQualityResult {
  // 重用既有條件假設、排除與警告；等效膜厚不拿來計算殘差。
  const normalized = normalizeMeasuredPoints(resin, measuredPoints, fallbackConditions);
  const warnings = [...normalized.warnings, ...calibration.warnings];
  const unavailable = (reason: string): FitQualityResult => ({
    notApplicable: true, reason, points: [], count: 0, rmse: null,
    meanAbsoluteErrorPercent: null, maxAbsoluteErrorPercent: null, maxErrorPointId: null, warnings,
  });
  if (calibration.mode === 'theoretical' || calibration.pointsCount === 0) {
    return unavailable('純理論模式，沒有可用於校正的實測點，不計算殘差。');
  }

  const points: FitQualityPoint[] = [];
  const positive = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v) && v > 0;
  for (const point of measuredPoints) {
    const spinSpeed = point.spinSpeed ?? fallbackConditions?.spinSpeed;
    const spinTime = point.spinTime ?? fallbackConditions?.spinTime;
    if (!positive(point.solidsContent) || !positive(point.thickness) || !positive(spinSpeed) || !positive(spinTime)) continue;
    const predicted = calculateThickness(point.solidsContent, spinSpeed, spinTime,
      calibration.calibratedC, calibration.calibratedAlpha, calibration.beta, calibration.gamma);
    const residual = predicted - point.thickness;
    const residualPercent = residual / point.thickness * 100;
    if (!positive(predicted) || !Number.isFinite(residualPercent)) {
      return unavailable('採用的模型無法產生有限正數的預測膜厚或殘差，無法計算擬合品質。');
    }
    points.push({...point, spinSpeed, spinTime, predicted, residual, residualPercent});
  }
  if (points.length === 0) return unavailable('沒有具備有效固含量、膜厚與量測條件的實測點，無法計算擬合品質。');

  let maxPoint = points[0];
  let meanAbsoluteErrorPercent = 0;
  let rmse = 0;
  for (const point of points) {
    if (Math.abs(point.residualPercent) > Math.abs(maxPoint.residualPercent)) maxPoint = point;
    meanAbsoluteErrorPercent += Math.abs(point.residualPercent) / points.length;
    // hypot 避免先平方造成不必要的溢位。
    rmse = Math.hypot(rmse, point.residual / Math.sqrt(points.length));
  }
  return {
    notApplicable: false,
    reason: calibration.mode === 'single_point_shift'
      ? '單點校正，殘差必為 0，不代表擬合品質。' : null,
    points,
    count: points.length,
    rmse,
    meanAbsoluteErrorPercent,
    maxAbsoluteErrorPercent: Math.abs(maxPoint.residualPercent),
    maxErrorPointId: maxPoint.id,
    warnings,
  };
}
