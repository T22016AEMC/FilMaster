import React from 'react';
import { PredictionResult } from '../types';
import { Target, CheckCircle2, ArrowRight, ShieldCheck, Activity, Cpu, Percent, HelpCircle } from 'lucide-react';

interface PredictionSummaryProps {
  prediction: PredictionResult;
  onTolerancePercentChange?: (val: number) => void;
}

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

  const toleranceSolidsSpan = upperSolids - lowerSolids;
  const tolerancePercentSolids = recommendedSolids > 0 ? (toleranceSolidsSpan / (2 * recommendedSolids)) * 100 : 0;
  const quickTolOptions = [1.0, 3.0, 5.0, 8.0, 10.0];

  return (
    <div className="space-y-4">
      {/* Top Main Result Banner - Sci-Fi Dark Tech HUD */}
      <div className="bg-slate-900/90 border border-cyan-500/40 text-white rounded-2xl p-5 shadow-2xl shadow-cyan-950/40 relative overflow-hidden">
        {/* Background circuit glow effect */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Recommended Solids Content (Main Output) */}
          <div className="lg:col-span-5 space-y-2.5 border-b lg:border-b-0 lg:border-r border-slate-800/80 lg:pr-6 pb-4 lg:pb-0">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50 text-xs font-semibold font-mono tracking-wide shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                建議調配配方 (Formulation)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {resin.name} @ {spinSpeed} RPM, {spinTime}s
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-300 block font-mono">
                建議目標固含量 (Solids Content, S_target)
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl sm:text-5xl font-black tracking-tight font-mono text-cyan-300 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                  {recommendedSolids.toFixed(4)}
                </span>
                <span className="text-xl font-bold font-mono text-cyan-400">wt%</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                塗佈預期達成 <strong className="text-white font-mono text-cyan-200">{targetThickness.toFixed(3)} nm</strong> 標稱膜厚
              </span>
            </p>
          </div>

          {/* Center-Right: ±Tolerance% Film Thickness Tolerance Window */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>±{tolerancePercent.toFixed(1)}% 膜厚容忍區間與配方工程</span>
              </div>

              {/* Quick tolerance pill selectors if callback provided */}
              {onTolerancePercentChange && (
                <div className="flex items-center gap-1 bg-slate-950/90 px-1.5 py-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                  <span className="text-slate-400 mr-1">容差:</span>
                  {quickTolOptions.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onTolerancePercentChange(t)}
                      className={`px-1.5 py-0.5 rounded transition-all ${
                        Math.abs(tolerancePercent - t) < 0.05
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                          : 'text-slate-400 hover:text-amber-300'
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
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1 text-center shadow-inner">
                <div className="text-[11px] text-slate-400 font-medium font-mono flex items-center justify-center gap-1">
                  <span>下限 (-{tolerancePercent.toFixed(1)}%)</span>
                </div>
                <div className="text-base sm:text-lg font-bold font-mono text-slate-200">
                  {lowerThickness.toFixed(3)} <span className="text-[10px] text-slate-400">nm</span>
                </div>
                <div className="text-xs font-mono font-semibold text-cyan-300 bg-slate-900 py-1 rounded-lg border border-slate-800">
                  S = {lowerSolids.toFixed(4)} wt%
                </div>
              </div>

              {/* Target (100%) */}
              <div className="bg-cyan-950/70 border-2 border-cyan-500/80 rounded-xl p-3 space-y-1 text-center relative shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                <div className="text-[11px] text-cyan-300 font-bold font-mono flex items-center justify-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  <span>標稱目標</span>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-white">
                  {targetThickness.toFixed(3)} <span className="text-[10px] text-cyan-300">nm</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-500 py-1 rounded-lg shadow-sm">
                  S = {recommendedSolids.toFixed(4)} wt%
                </div>
              </div>

              {/* Upper Bound (+tolerance%) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1 text-center shadow-inner">
                <div className="text-[11px] text-slate-400 font-medium font-mono flex items-center justify-center gap-1">
                  <span>上限 (+{tolerancePercent.toFixed(1)}%)</span>
                </div>
                <div className="text-base sm:text-lg font-bold font-mono text-slate-200">
                  {upperThickness.toFixed(3)} <span className="text-[10px] text-slate-400">nm</span>
                </div>
                <div className="text-xs font-mono font-semibold text-cyan-300 bg-slate-900 py-1 rounded-lg border border-slate-800">
                  S = {upperSolids.toFixed(4)} wt%
                </div>
              </div>
            </div>

            {/* Tolerance Guidance */}
            <div className="text-[11px] text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 font-mono">
              <span>
                配方工程容差寬度：
                <strong className="text-cyan-300 font-mono ml-1">
                  {lowerSolids.toFixed(4)} wt% ~ {upperSolids.toFixed(4)} wt% (ΔS = {(toleranceSolidsSpan).toFixed(4)} wt%)
                </strong>
              </span>
              <span className="font-mono text-amber-400 font-semibold">
                [ 膜厚 ±{tolerancePercent.toFixed(1)}%: {lowerThickness.toFixed(3)} ~ {upperThickness.toFixed(3)} nm ]
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model & Parameters Matrix Card */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl shadow-black/50 border border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              模型與最終參數矩陣 (Mathematical Model & Calibrated Parameters)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            模式: <strong className="text-cyan-400">{calibration.modeLabel}</strong>
          </span>
        </div>

        {/* Meyerhofer Equation Display */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-inner">
          <div className="space-y-1">
            <span className="text-slate-400 font-medium font-mono text-[11px]">實時解析式 (Live Meyerhofer Formulation):</span>
            <div className="font-mono text-sm font-bold text-cyan-300 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-cyan-800/40 inline-block shadow-[0_0_10px_rgba(6,182,212,0.15)]">
              h = {calibration.calibratedC.toFixed(2)} · S^{calibration.calibratedAlpha.toFixed(4)} · {spinSpeed}^(-{calibration.beta.toFixed(2)}) · {spinTime}^(-{calibration.gamma.toFixed(2)})
            </div>
          </div>

          <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
            <div>流體模型: <strong className="text-slate-200">{resin.modelName}</strong></div>
            <div>適用膜厚: <strong className="text-cyan-300">{resin.recommendedThicknessRange[0].toFixed(3)} ~ {resin.recommendedThicknessRange[1].toFixed(3)} nm</strong></div>
          </div>
        </div>

        {/* Parameter Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* C Parameter */}
          <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/70">
            <div className="text-slate-400 font-medium text-[11px]">比例係數 C</div>
            <div className="font-mono font-bold text-cyan-300 text-sm mt-0.5">
              {calibration.calibratedC.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              基準: {calibration.theoreticalC.toFixed(1)}
            </div>
          </div>

          {/* Alpha Exponent */}
          <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/70">
            <div className="text-slate-400 font-medium text-[11px]">固含量指數 α</div>
            <div className="font-mono font-bold text-cyan-300 text-sm mt-0.5">
              {calibration.calibratedAlpha.toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              理論: {calibration.theoreticalAlpha.toFixed(2)}
            </div>
          </div>

          {/* Beta Exponent */}
          <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/70">
            <div className="text-slate-400 font-medium text-[11px]">轉速指數 β</div>
            <div className="font-mono font-bold text-cyan-300 text-sm mt-0.5">
              {calibration.beta.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              RPM 指數
            </div>
          </div>

          {/* Gamma Exponent */}
          <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/70">
            <div className="text-slate-400 font-medium text-[11px]">時間指數 γ</div>
            <div className="font-mono font-bold text-cyan-300 text-sm mt-0.5">
              {calibration.gamma.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              蒸發秒數指數
            </div>
          </div>

          {/* Scaling Factor */}
          <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/70">
            <div className="text-slate-400 font-medium text-[11px]">平移因子 Scale</div>
            <div className="font-mono font-bold text-blue-400 text-sm mt-0.5">
              {calibration.scaleFactor.toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              {calibration.scaleFactor >= 1 ? `+${((calibration.scaleFactor - 1) * 100).toFixed(1)}%` : `${((calibration.scaleFactor - 1) * 100).toFixed(1)}%`}
            </div>
          </div>

          {/* R^2 Determination */}
          <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/70">
            <div className="text-slate-400 font-medium text-[11px]">決定係數 R²</div>
            <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
              {calibration.rSquared !== null ? calibration.rSquared.toFixed(4) : '1.0000 (Exact)'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              {calibration.pointsCount >= 2 ? '最小平方擬合度' : '精確通過'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
