import {
  ResinConfig,
  MeasuredPoint,
  CalibrationResult,
  PredictionResult,
  PredictionWarning,
  CurvePoint,
} from '../types';

/** 多點擬合所得 α 的合理範圍；超出時改用基準 α 並發出警告 */
export const ALPHA_FIT_MIN = 0.05;
export const ALPHA_FIT_MAX = 4.0;

/** 固含量 (wt%) 的上限；反算結果超過此值會發出警告 */
export const SOLIDS_MAX = 100;

/**
 * Meyerhofer Forward Calculation:
 * h = C * (S ^ alpha) * (w ^ -beta) * (t ^ -gamma)
 *
 * @param solids Solids Content S in wt% (e.g., 8.0)
 * @param rpm Main Spin Speed w in RPM (e.g., 2000)
 * @param time Spin Duration t in seconds (e.g., 30)
 * @param C Proportionality coefficient
 * @param alpha Solids exponent
 * @param beta Spin speed exponent
 * @param gamma Spin time exponent
 * @returns Film thickness h in nm
 */
export function calculateThickness(
  solids: number,
  rpm: number,
  time: number,
  C: number,
  alpha: number,
  beta: number,
  gamma: number
): number {
  if (solids <= 0 || rpm <= 0 || time <= 0 || C <= 0) return 0;
  const wTerm = Math.pow(rpm, -beta);
  const tTerm = Math.pow(time, -gamma);
  const sTerm = Math.pow(solids, alpha);
  return C * sTerm * wTerm * tTerm;
}

/**
 * Inverse Solver for Required Solids Content:
 * S = [ h / (C * w^-beta * t^-gamma) ] ^ (1 / alpha)
 *
 * @param targetThickness Film thickness h in nm
 * @param rpm Spin speed w in RPM
 * @param time Spin time t in seconds
 * @param C Proportionality coefficient
 * @param alpha Solids exponent
 * @param beta Spin speed exponent
 * @param gamma Spin time exponent
 * @returns Required solids content S in wt%
 */
export function calculateRequiredSolids(
  targetThickness: number,
  rpm: number,
  time: number,
  C: number,
  alpha: number,
  beta: number,
  gamma: number
): number {
  if (targetThickness <= 0 || rpm <= 0 || time <= 0 || C <= 0 || alpha <= 0) return 0;
  const wTerm = Math.pow(rpm, -beta);
  const tTerm = Math.pow(time, -gamma);
  const denominator = C * wTerm * tTerm;
  if (denominator <= 0) return 0;
  const ratio = targetThickness / denominator;
  return Math.pow(ratio, 1 / alpha);
}

/**
 * Calibrate model parameters based on experimental measured points:
 * 0 points: Pure theoretical default
 * 1 point: Multiplicative scaling shift: C_cal = C_theo * (h1 / h_pred(S1))
 * >= 2 points: Least Squares Fit in log-space: ln(h) = ln(K) + alpha * ln(S)
 */
export function calibrateModel(
  resin: ResinConfig,
  rpm: number,
  time: number,
  points: MeasuredPoint[]
): CalibrationResult {
  const validPoints = points.filter(p => p.solidsContent > 0 && p.thickness > 0);

  // 0 points: Theoretical
  if (validPoints.length === 0) {
    return {
      mode: 'theoretical',
      modeLabel: '理論模式 (0 數據點)',
      theoreticalC: resin.defaultC,
      calibratedC: resin.defaultC,
      theoreticalAlpha: resin.alpha,
      calibratedAlpha: resin.alpha,
      beta: resin.beta,
      gamma: resin.gamma,
      scaleFactor: 1.0,
      rSquared: null,
      pointsCount: 0,
      fittedAlpha: null,
      warnings: [],
    };
  }

  // 1 point: Scaling Shift
  if (validPoints.length === 1) {
    const p1 = validPoints[0];
    const hPred = calculateThickness(
      p1.solidsContent,
      rpm,
      time,
      resin.defaultC,
      resin.alpha,
      resin.beta,
      resin.gamma
    );

    const scaleFactor = hPred > 0 ? p1.thickness / hPred : 1.0;
    const calibratedC = resin.defaultC * scaleFactor;

    return {
      mode: 'single_point_shift',
      modeLabel: '單點平移校正 (1 數據點)',
      theoreticalC: resin.defaultC,
      calibratedC: calibratedC,
      theoreticalAlpha: resin.alpha,
      calibratedAlpha: resin.alpha,
      beta: resin.beta,
      gamma: resin.gamma,
      scaleFactor: scaleFactor,
      rSquared: null, // 單點必然通過該點，R² 沒有意義
      pointsCount: 1,
      fittedAlpha: null,
      warnings: [],
    };
  }

  // >= 2 points: Least Squares Fit in Log space
  // h = C * S^alpha * w^-beta * t^-gamma = K * S^alpha
  // ln(h) = ln(K) + alpha * ln(S)
  // Let y = ln(h), x = ln(S)
  // y = a + b * x, where b = alpha, a = ln(K)
  const n = validPoints.length;
  let sumX = 0;
  let sumY = 0;
  const xVals: number[] = [];
  const yVals: number[] = [];

  for (const pt of validPoints) {
    const x = Math.log(pt.solidsContent);
    const y = Math.log(pt.thickness);
    xVals.push(x);
    yVals.push(y);
    sumX += x;
    sumY += y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssXX = 0;
  let ssXY = 0;
  let ssYY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - meanX;
    const dy = yVals[i] - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
    ssYY += dy * dy;
  }

  let calibratedAlpha = resin.alpha;
  let calibratedC = resin.defaultC;
  let rSquared: number | null = null;
  let fittedAlpha: number | null = null;
  const warnings: PredictionWarning[] = [];

  if (ssXX > 1e-8) {
    const slope = ssXY / ssXX;
    fittedAlpha = slope;
    if (slope > ALPHA_FIT_MIN && slope < ALPHA_FIT_MAX) {
      calibratedAlpha = slope;
    } else {
      warnings.push({
        code: 'ALPHA_OUT_OF_RANGE',
        message: `擬合 α = ${slope.toFixed(2)} 超出合理範圍 ${ALPHA_FIT_MIN.toFixed(2)}～${ALPHA_FIT_MAX.toFixed(1)}，已改用基準值 ${resin.alpha}`,
        field: 'calibratedAlpha',
        value: slope,
      });
    }
    const interceptA = meanY - calibratedAlpha * meanX;
    const K = Math.exp(interceptA);
    // K = C * w^-beta * t^-gamma  ==> C = K * w^beta * t^gamma
    calibratedC = K * Math.pow(rpm, resin.beta) * Math.pow(time, resin.gamma);

    if (ssYY > 1e-8) {
      rSquared = Math.max(0, Math.min(1, (ssXY * ssXY) / (ssXX * ssYY)));
    } else {
      rSquared = 1.0;
    }
  } else {
    // If all points have the same solids content, fall back to average single point scaling
    const avgScale = validPoints.reduce((acc, p) => {
      const pred = calculateThickness(
        p.solidsContent,
        rpm,
        time,
        resin.defaultC,
        resin.alpha,
        resin.beta,
        resin.gamma
      );
      return acc + (pred > 0 ? p.thickness / pred : 1);
    }, 0) / n;

    calibratedC = resin.defaultC * avgScale;
    rSquared = null;
    warnings.push({
      code: 'FIT_DEGENERATE',
      message: `所有實測點的固含量相同，無法擬合 α；已改用平均縮放校正 C，α 維持基準值 ${resin.alpha}，R² 不適用`,
    });
  }

  const theoreticalMidThickness = calculateThickness(
    validPoints[0].solidsContent,
    rpm,
    time,
    resin.defaultC,
    resin.alpha,
    resin.beta,
    resin.gamma
  );
  const calibratedMidThickness = calculateThickness(
    validPoints[0].solidsContent,
    rpm,
    time,
    calibratedC,
    calibratedAlpha,
    resin.beta,
    resin.gamma
  );
  const overallScale = theoreticalMidThickness > 0 ? calibratedMidThickness / theoreticalMidThickness : 1.0;

  return {
    mode: 'multi_point_lsq',
    modeLabel: `多點最小平方法擬合 (${n} 數據點)`,
    theoreticalC: resin.defaultC,
    calibratedC: calibratedC,
    theoreticalAlpha: resin.alpha,
    calibratedAlpha: calibratedAlpha,
    beta: resin.beta,
    gamma: resin.gamma,
    scaleFactor: overallScale,
    rSquared: rSquared,
    pointsCount: n,
    fittedAlpha: fittedAlpha,
    warnings: warnings,
  };
}

const SOLIDS_FIELD_LABELS = {
  recommendedSolids: '建議固含量',
  lowerSolids: '下限固含量',
  upperSolids: '上限固含量',
} as const;

/** 反算所得固含量若不是有限正數或超過 SOLIDS_MAX，回傳警告（數值本身不修改） */
function checkSolidsRange(
  field: keyof typeof SOLIDS_FIELD_LABELS,
  value: number
): PredictionWarning | null {
  const label = SOLIDS_FIELD_LABELS[field];
  const hint = '結果僅供參考，請確認目標膜厚、轉速、時間與校正參數是否合理';
  if (!Number.isFinite(value)) {
    return {
      code: 'SOLIDS_OUT_OF_RANGE',
      message: `${label}不是有效數值，${hint}`,
      field,
      value,
    };
  }
  if (value <= 0) {
    return {
      code: 'SOLIDS_OUT_OF_RANGE',
      message: `${label} = ${value.toFixed(4)} wt% 小於或等於 0，無法反算出有效固含量，${hint}`,
      field,
      value,
    };
  }
  if (value > SOLIDS_MAX) {
    return {
      code: 'SOLIDS_OUT_OF_RANGE',
      message: `${label} = ${value.toFixed(2)} wt% 超過上限 ${SOLIDS_MAX} wt%，${hint}`,
      field,
      value,
    };
  }
  return null;
}

/**
 * Full Prediction Calculation
 */
export function runPrediction(
  resin: ResinConfig,
  spinSpeed: number,
  spinTime: number,
  targetThickness: number,
  measuredPoints: MeasuredPoint[],
  tolerancePercent: number = 5.0
): PredictionResult {
  const calibration = calibrateModel(resin, spinSpeed, spinTime, measuredPoints);

  // Clamp tolerance to valid range 0.1% ~ 10.0%
  const validTolerance = Math.min(10.0, Math.max(0.1, tolerancePercent || 5.0));
  const tolFraction = validTolerance / 100.0;

  const lowerThickness = targetThickness * (1 - tolFraction);
  const upperThickness = targetThickness * (1 + tolFraction);

  const recommendedSolids = calculateRequiredSolids(
    targetThickness,
    spinSpeed,
    spinTime,
    calibration.calibratedC,
    calibration.calibratedAlpha,
    calibration.beta,
    calibration.gamma
  );

  const lowerSolids = calculateRequiredSolids(
    lowerThickness,
    spinSpeed,
    spinTime,
    calibration.calibratedC,
    calibration.calibratedAlpha,
    calibration.beta,
    calibration.gamma
  );

  const upperSolids = calculateRequiredSolids(
    upperThickness,
    spinSpeed,
    spinTime,
    calibration.calibratedC,
    calibration.calibratedAlpha,
    calibration.beta,
    calibration.gamma
  );

  const warnings: PredictionWarning[] = [...calibration.warnings];
  for (const [field, value] of [
    ['recommendedSolids', recommendedSolids],
    ['lowerSolids', lowerSolids],
    ['upperSolids', upperSolids],
  ] as const) {
    const w = checkSolidsRange(field, value);
    if (w) warnings.push(w);
  }

  return {
    targetThickness,
    recommendedSolids,
    tolerancePercent: validTolerance,
    lowerThickness,
    lowerSolids,
    upperThickness,
    upperSolids,
    spinSpeed,
    spinTime,
    calibration,
    resin,
    warnings,
  };
}

/**
 * Standard solids range (0.5% to 50.0%) curve points generator
 */
export const DEFAULT_SOLIDS_STEPS = [
  0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 25.0, 28.0, 30.0, 35.0, 40.0, 45.0, 50.0,
];

export function generateCurvePoints(
  prediction: PredictionResult,
  customSteps: number[] = DEFAULT_SOLIDS_STEPS
): CurvePoint[] {
  const { resin, spinSpeed, spinTime, calibration } = prediction;

  // Merge custom steps and sort
  const steps = Array.from(new Set(customSteps)).sort((a, b) => a - b);

  return steps.map(s => {
    const theoH = calculateThickness(
      s,
      spinSpeed,
      spinTime,
      calibration.theoreticalC,
      calibration.theoreticalAlpha,
      calibration.beta,
      calibration.gamma
    );

    const calH = calculateThickness(
      s,
      spinSpeed,
      spinTime,
      calibration.calibratedC,
      calibration.calibratedAlpha,
      calibration.beta,
      calibration.gamma
    );

    const diffNm = calH - theoH;
    const diffPercent = theoH > 0 ? (diffNm / theoH) * 100 : 0;

    return {
      solidsContent: Number(s.toFixed(4)),
      theoreticalThickness: Number(theoH.toFixed(3)),
      calibratedThickness: Number(calH.toFixed(3)),
      diffNm: Number(diffNm.toFixed(3)),
      diffPercent: Number(diffPercent.toFixed(2)),
    };
  });
}

/**
 * Generates continuous smooth curve for charts
 */
export function generateDenseChartPoints(
  prediction: PredictionResult,
  minS: number = 0.5,
  maxS: number = 20.0,
  stepsCount: number = 60
) {
  const { spinSpeed, spinTime, calibration, tolerancePercent = 5.0 } = prediction;
  const tolFraction = (tolerancePercent || 5.0) / 100.0;
  const result: Array<{
    solids: number;
    theoretical: number;
    calibrated: number;
    lowerTolerance: number;
    upperTolerance: number;
  }> = [];

  const stepSize = (maxS - minS) / (stepsCount - 1);
  for (let i = 0; i < stepsCount; i++) {
    const s = minS + i * stepSize;
    const theo = calculateThickness(
      s,
      spinSpeed,
      spinTime,
      calibration.theoreticalC,
      calibration.theoreticalAlpha,
      calibration.beta,
      calibration.gamma
    );
    const cal = calculateThickness(
      s,
      spinSpeed,
      spinTime,
      calibration.calibratedC,
      calibration.calibratedAlpha,
      calibration.beta,
      calibration.gamma
    );

    result.push({
      solids: Number(s.toFixed(4)),
      theoretical: Number(theo.toFixed(3)),
      calibrated: Number(cal.toFixed(3)),
      lowerTolerance: Number((cal * (1 - tolFraction)).toFixed(3)),
      upperTolerance: Number((cal * (1 + tolFraction)).toFixed(3)),
    });
  }

  return result;
}

/**
 * Format Structured AI Studio Report
 */
export function generateStructuredReport(
  prediction: PredictionResult,
  curvePoints: CurvePoint[]
): string {
  const { resin, calibration, targetThickness, recommendedSolids, tolerancePercent, lowerThickness, lowerSolids, upperThickness, upperSolids, spinSpeed, spinTime } = prediction;

  let calibrationDesc = '';
  if (calibration.mode === 'theoretical') {
    calibrationDesc = '無實測數據校正 (使用理論預設參數)';
  } else if (calibration.mode === 'single_point_shift') {
    calibrationDesc = `單點平移縮放 (Scale Factor = ${calibration.scaleFactor.toFixed(4)})`;
  } else {
    calibrationDesc = `多點最小平方法迴歸 (${calibration.pointsCount} 點, R² = ${calibration.rSquared !== null ? calibration.rSquared.toFixed(4) : 'N/A'})`;
  }

  const tableHeader = '| 固含量 S (wt%) | 理論膜厚 (nm) | 校正後膜厚 (nm) | 偏差 Δh (nm) | 偏差幅度 (%) |\n| :---: | :---: | :---: | :---: | :---: |';
  const tableRows = curvePoints
    .map(
      pt =>
        `| ${pt.solidsContent.toFixed(4)}% | ${pt.theoreticalThickness.toFixed(3)} | ${pt.calibratedThickness.toFixed(3)} | ${pt.diffNm >= 0 ? '+' : ''}${pt.diffNm.toFixed(3)} | ${pt.diffPercent >= 0 ? '+' : ''}${pt.diffPercent.toFixed(1)}% |`
    )
    .join('\n');

  // 有警告時才附加第 4 區段；沒有警告時輸出與原版完全相同
  const warningSection =
    prediction.warnings.length > 0
      ? `\n4. 【警告事項】：\n${prediction.warnings.map(w => `- ${w.message}`).join('\n')}\n`
      : '';

  return `=======================================================
【半導體旋塗製程配方預測與校正報告】
=======================================================

1. 【模型與參數資訊】：
- 選取樹脂類別：${resin.name} (${resin.fullName})
- 物理推薦膜厚區間：${resin.recommendedThicknessRange[0].toFixed(3)} ~ ${resin.recommendedThicknessRange[1].toFixed(3)} nm
- 採用流體模型：${resin.modelName}
- 製程條件：主轉速 = ${spinSpeed} RPM，旋塗時間 = ${spinTime} s
- 理論常數：C_theo = ${calibration.theoreticalC.toFixed(2)}, α_theo = ${calibration.theoreticalAlpha.toFixed(2)}, β = ${calibration.beta.toFixed(2)}, γ = ${calibration.gamma.toFixed(2)}
- 校正模式：${calibrationDesc}
- 最終校正參數：C_calibrated = ${calibration.calibratedC.toFixed(2)}, α_calibrated = ${calibration.calibratedAlpha.toFixed(4)}

2. 【預測結果摘要】：
- 目標膜厚 (Target Thickness)：${targetThickness.toFixed(3)} nm
- 建議目標固含量 (Recommended Solids Content)：${recommendedSolids.toFixed(4)} wt%
- ±${tolerancePercent.toFixed(1)}% 膜厚容忍區間：
  * 下限 (Lower Bound -${tolerancePercent.toFixed(1)}%)：${lowerThickness.toFixed(3)} nm -> 對應固含量 S_lower = ${lowerSolids.toFixed(4)} wt%
  * 上限 (Upper Bound +${tolerancePercent.toFixed(1)}%)：${upperThickness.toFixed(3)} nm -> 對應固含量 S_upper = ${upperSolids.toFixed(4)} wt%
- 配方工程容差範圍 (Tolerance Window)：ΔS = ${(upperSolids - lowerSolids).toFixed(4)} wt% (${lowerSolids.toFixed(4)} ~ ${upperSolids.toFixed(4)} wt%)

3. 【數據曲線點表格 (固含量離散分佈表)】:
${tableHeader}
${tableRows}
${warningSection}`;
}

/**
 * Format CSV Data string
 */
export function generateCSV(prediction: PredictionResult, curvePoints: CurvePoint[]): string {
  const header = 'Solids_wt%,Theoretical_Thickness_nm,Calibrated_Thickness_nm,Diff_nm,Diff_percent\n';
  const rows = curvePoints
    .map(
      pt =>
        `${pt.solidsContent.toFixed(4)},${pt.theoreticalThickness.toFixed(3)},${pt.calibratedThickness.toFixed(3)},${pt.diffNm.toFixed(3)},${pt.diffPercent.toFixed(2)}`
    )
    .join('\n');

  // 有警告時才在檔頭加上 "# Warning:" 行；沒有警告時輸出與原版完全相同
  const warningLines = prediction.warnings.map(w => `# Warning: ${w.message}\n`).join('');

  const meta = `# Resin: ${prediction.resin.name}\n# Model: ${prediction.resin.modelName}\n# Spin Speed: ${prediction.spinSpeed} RPM\n# Spin Time: ${prediction.spinTime} s\n# Target Thickness: ${prediction.targetThickness.toFixed(3)} nm\n# Tolerance Window: +/-${prediction.tolerancePercent.toFixed(1)}%\n# Recommended Solids: ${prediction.recommendedSolids.toFixed(4)} wt%\n# Lower Bound (-${prediction.tolerancePercent.toFixed(1)}%): ${prediction.lowerThickness.toFixed(3)} nm (${prediction.lowerSolids.toFixed(4)} wt%)\n# Upper Bound (+${prediction.tolerancePercent.toFixed(1)}%): ${prediction.upperThickness.toFixed(3)} nm (${prediction.upperSolids.toFixed(4)} wt%)\n# Calibrated C: ${prediction.calibration.calibratedC.toFixed(3)}\n# Calibrated Alpha: ${prediction.calibration.calibratedAlpha.toFixed(4)}\n${warningLines}`;

  return meta + header + rows;
}
