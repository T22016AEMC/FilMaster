import React from 'react';
import { PredictionResult, PredictionWarning } from '../types';
import { Target, CheckCircle2, ArrowRight, ShieldCheck, Activity, Cpu, Percent, HelpCircle, AlertTriangle } from 'lucide-react';
import { describeRSquared } from '../utils/format';

interface PredictionSummaryProps {
  prediction: PredictionResult;
  onTolerancePercentChange?: (val: number) => void;
}

// 固含量超出合理範圍時，在數值旁加上警示圖示（數值照常顯示）
const SolidsWarnIcon: React.FC<{ warnings: PredictionWarning[]; field: string; className?: string }> = ({
  warnings,
  field,
  className = 'w-4 h-4 text-amber-700',
}) => {
  const w = warnings.find(x => x.code === 'SOLIDS_OUT_OF_RANGE' && x.field === field);
  if (!w) return null;
  return (
    <span role="img" aria-label="固含量超出合理範圍" title={w.message} className="inline-flex align-middle">
      <AlertTriangle className={`shrink-0 ${className}`} />
    </span>
  );
};

export const PredictionSummary: React.FC<PredictionSummaryProps> = ({
  prediction,
  onTolerancePercentChange,
}) => {
  const {
    targetThickness,
    recommendedSolids,
    tolerancePercent = 5.0,
    lowerThickness,
    lowerSolids,
    upperThickness,
    upperSolids,
    spinSpeed,
    spinTime,
    calibration,
    resin,
  } = prediction;

  const rSquaredDisplay = describeRSquared(calibration.rSquared, calibration.pointsCount);

  const toleranceSolidsSpan = upperSolids - lowerSolids;
  const tolerancePercentSolids = recommendedSolids > 0 ? (toleranceSolidsSpan / (2 * recommendedSolids)) * 100 : 0;
  const quickTolOptions = [1.0, 3.0, 5.0, 8.0, 10.0];

  return (
    <div className="space-y-4">
      {/* Top Main Result Banner - Sci-Fi Dark Tech HUD */}
      <div className="bg-white border border-blue-200 text-slate-900 rounded-2xl p-5 shadow-sm shadow-sm relative overflow-hidden">
        {/* Background circuit glow effect */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-50 rounded-full  pointer-events-none -mr-20 -mt-20" />
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-50 rounded-full  pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Recommended Solids Content (Main Output) */}
          <div className="lg:col-span-5 space-y-2.5 border-b lg:border-b-0 lg:border-r border-slate-200 lg:pr-6 pb-4 lg:pb-0">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold   ">
                建議調配配方 (Formulation)
              </span>
              <span className="text-xs text-slate-600 ">
                {resin.name} @ {spinSpeed} RPM, {spinTime}s
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-700 block ">
                建議目標固含量 (Solids Content, S_target)
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl sm:text-5xl font-black tracking-tight  text-blue-700 ">
                  {recommendedSolids.toFixed(4)}
                </span>
                <span className="text-xl font-bold  text-blue-700">wt%</span>
                <SolidsWarnIcon warnings={prediction.warnings} field="recommendedSolids" className="w-6 h-6 text-amber-700" />
              </div>
            </div>

            <p className="text-xs text-slate-700 flex items-center gap-1.5 ">
              <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                塗佈預期達成 <strong className="text-slate-900  text-blue-700">{targetThickness.toFixed(3)} nm</strong> 標稱膜厚
              </span>
            </p>
          </div>

          {/* Center-Right: ±Tolerance% Film Thickness Tolerance Window */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700   ">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>±{tolerancePercent.toFixed(1)}% 膜厚容忍區間與配方工程</span>
              </div>

              {/* Quick tolerance pill selectors if callback provided */}
              {onTolerancePercentChange && (
                <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-200 text-xs ">
                  <span className="text-slate-600 mr-1">容差:</span>
                  {quickTolOptions.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onTolerancePercentChange(t)}
                      className={`px-1.5 py-0.5 rounded transition-all ${
                        Math.abs(tolerancePercent - t) < 0.05
                          ? 'bg-amber-50 text-slate-600 font-bold '
                          : 'text-slate-600 hover:text-amber-700'
                      }`}
                    >
                      ±{t.toFixed(0)}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tolerance Cards Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Lower Bound (-tolerance%) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-center shadow-sm">
                <div className="text-xs text-slate-600 font-medium  flex items-center justify-center gap-1">
                  <span>下限 (-{tolerancePercent.toFixed(1)}%)</span>
                </div>
                <div className="text-base sm:text-lg font-bold  text-slate-900">
                  {lowerThickness.toFixed(3)} <span className="text-xs text-slate-600">nm</span>
                </div>
                <div className="text-xs  font-semibold text-blue-700 bg-white py-1 rounded-lg border border-slate-200 flex items-center justify-center gap-1">
                  <span>S = {lowerSolids.toFixed(4)} wt%</span>
                  <SolidsWarnIcon warnings={prediction.warnings} field="lowerSolids" />
                </div>
              </div>

              {/* Target (100%) */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 space-y-1 text-center relative ">
                <div className="text-xs text-blue-700 font-bold  flex items-center justify-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  <span>標稱目標</span>
                </div>
                <div className="text-base sm:text-lg font-black  text-slate-900">
                  {targetThickness.toFixed(3)} <span className="text-xs text-blue-700">nm</span>
                </div>
                <div className="text-xs  font-bold text-slate-600    py-1 rounded-lg shadow-sm flex items-center justify-center gap-1">
                  <span>S = {recommendedSolids.toFixed(4)} wt%</span>
                  <SolidsWarnIcon warnings={prediction.warnings} field="recommendedSolids" className="w-4 h-4 text-amber-700" />
                </div>
              </div>

              {/* Upper Bound (+tolerance%) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-center shadow-sm">
                <div className="text-xs text-slate-600 font-medium  flex items-center justify-center gap-1">
                  <span>上限 (+{tolerancePercent.toFixed(1)}%)</span>
                </div>
                <div className="text-base sm:text-lg font-bold  text-slate-900">
                  {upperThickness.toFixed(3)} <span className="text-xs text-slate-600">nm</span>
                </div>
                <div className="text-xs  font-semibold text-blue-700 bg-white py-1 rounded-lg border border-slate-200 flex items-center justify-center gap-1">
                  <span>S = {upperSolids.toFixed(4)} wt%</span>
                  <SolidsWarnIcon warnings={prediction.warnings} field="upperSolids" />
                </div>
              </div>
            </div>

            {/* Tolerance Guidance */}
            <div className="text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 ">
              <span>
                配方工程容差寬度：
                <strong className="text-blue-700  ml-1">
                  {lowerSolids.toFixed(4)} wt% ~ {upperSolids.toFixed(4)} wt% (ΔS = {(toleranceSolidsSpan).toFixed(4)} wt%)
                </strong>
              </span>
              <span className=" text-amber-700 font-semibold">
                [ 膜厚 ±{tolerancePercent.toFixed(1)}%: {lowerThickness.toFixed(3)} ~ {upperThickness.toFixed(3)} nm ]
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model & Parameters Matrix Card */}
      <div className="bg-white  rounded-2xl shadow-sm shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs font-bold   text-slate-900 ">
              模型與最終參數矩陣 (Mathematical Model & Calibrated Parameters)
            </h3>
          </div>
          <span className="text-xs text-slate-600 ">
            模式: <strong className="text-blue-700">{calibration.modeLabel}</strong>
          </span>
        </div>

        {/* Meyerhofer Equation Display */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="space-y-1">
            <span className="text-slate-600 font-medium  text-xs">實時解析式 (Live Meyerhofer Formulation):</span>
            <div className=" text-sm font-bold text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200 inline-block ">
              h = {calibration.calibratedC.toFixed(2)} · S^{calibration.calibratedAlpha.toFixed(4)} · {spinSpeed}^(-{calibration.beta.toFixed(2)}) · {spinTime}^(-{calibration.gamma.toFixed(2)})
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-0.5 ">
            <div>流體模型: <strong className="text-slate-900">{resin.modelName}</strong></div>
            <div>適用膜厚: <strong className="text-blue-700">{resin.recommendedThicknessRange[0].toFixed(3)} ~ {resin.recommendedThicknessRange[1].toFixed(3)} nm</strong></div>
          </div>
        </div>

        {/* Parameter Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* C Parameter */}
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="text-slate-600 font-medium text-xs">比例係數 C</div>
            <div className=" font-bold text-blue-700 text-sm mt-0.5">
              {calibration.calibratedC.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600 mt-0.5 ">
              基準: {calibration.theoreticalC.toFixed(1)}
            </div>
          </div>

          {/* Alpha Exponent */}
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="text-slate-600 font-medium text-xs">固含量指數 α</div>
            <div className=" font-bold text-blue-700 text-sm mt-0.5">
              {calibration.calibratedAlpha.toFixed(4)}
            </div>
            <div className="text-xs text-slate-600 mt-0.5 ">
              理論: {calibration.theoreticalAlpha.toFixed(2)}
            </div>
          </div>

          {/* Beta Exponent */}
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="text-slate-600 font-medium text-xs">轉速指數 β</div>
            <div className=" font-bold text-blue-700 text-sm mt-0.5">
              {calibration.beta.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600 mt-0.5 ">
              RPM 指數
            </div>
          </div>

          {/* Gamma Exponent */}
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="text-slate-600 font-medium text-xs">時間指數 γ</div>
            <div className=" font-bold text-blue-700 text-sm mt-0.5">
              {calibration.gamma.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600 mt-0.5 ">
              蒸發秒數指數
            </div>
          </div>

          {/* Scaling Factor */}
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="text-slate-600 font-medium text-xs">平移因子 Scale</div>
            <div className=" font-bold text-blue-700 text-sm mt-0.5">
              {calibration.scaleFactor.toFixed(4)}
            </div>
            <div className="text-xs text-slate-600 mt-0.5 ">
              {calibration.scaleFactor >= 1 ? `+${((calibration.scaleFactor - 1) * 100).toFixed(1)}%` : `${((calibration.scaleFactor - 1) * 100).toFixed(1)}%`}
            </div>
          </div>

          {/* R^2 Determination */}
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="text-slate-600 font-medium text-xs">決定係數 R²</div>
            <div
              className={` font-bold text-sm mt-0.5 ${
                rSquaredDisplay.reason === null ? 'text-blue-700' : 'text-slate-600'
              }`}
            >
              {rSquaredDisplay.text}
            </div>
            <div className="text-xs text-slate-600 mt-0.5 ">
              {rSquaredDisplay.reason ?? '最小平方擬合度'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
