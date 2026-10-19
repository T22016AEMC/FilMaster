import React from 'react';
import { ResinType, ResinConfig, SavedCalibratedCurve } from '../types';
import { RESIN_CONFIGS } from '../utils/resinConfigs';
import {
  Gauge,
  Clock,
  Target,
  Info,
  AlertTriangle,
  CheckCircle2,
  BookmarkPlus,
  Layers,
  ChevronDown,
  Sparkles,
  Settings2,
} from 'lucide-react';

interface ProcessInputsProps {
  selectedResin: ResinType;
  onSelectResin: (resin: ResinType) => void;
  savedCurves: SavedCalibratedCurve[];
  activeCustomCurveId?: string | null;
  onSelectCustomCurve: (curve: SavedCalibratedCurve) => void;
  onOpenSaveCurveModal: () => void;
  onOpenManageCurvesModal: () => void;
  spinSpeed: number;
  onSpinSpeedChange: (speed: number) => void;
  spinTime: number;
  onSpinTimeChange: (time: number) => void;
  targetThickness: number;
  onTargetThicknessChange: (thickness: number) => void;
  tolerancePercent: number;
  onTolerancePercentChange: (tol: number) => void;
}

export const ProcessInputs: React.FC<ProcessInputsProps> = ({
  selectedResin,
  onSelectResin,
  savedCurves,
  activeCustomCurveId,
  onSelectCustomCurve,
  onOpenSaveCurveModal,
  onOpenManageCurvesModal,
  spinSpeed,
  onSpinSpeedChange,
  spinTime,
  onSpinTimeChange,
  targetThickness,
  onTargetThicknessChange,
  tolerancePercent,
  onTolerancePercentChange,
}) => {
  const currentResin: ResinConfig = RESIN_CONFIGS[selectedResin];
  const [minRange, maxRange] = currentResin.recommendedThicknessRange;
  const isThicknessOutOfRange = targetThickness < minRange || targetThickness > maxRange;

  const rpmPresets = [1000, 1500, 2000, 2500, 3000];
  const timePresets = [15, 20, 30, 45, 60];
  const tolerancePresets = [1.0, 3.0, 5.0, 8.0, 10.0];

  const activeSavedCurve = savedCurves.find(c => c.id === activeCustomCurveId);

  // Dropdown change handler
  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val.startsWith('custom:')) {
      const curveId = val.replace('custom:', '');
      const found = savedCurves.find(c => c.id === curveId);
      if (found) {
        onSelectCustomCurve(found);
      }
    } else {
      onSelectResin(val as ResinType);
    }
  };

  const selectedValue = activeCustomCurveId
    ? `custom:${activeCustomCurveId}`
    : selectedResin;

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl shadow-black/50 border border-slate-800 p-5 space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono flex items-center gap-2">
            <span>01. 製程條件與材料選擇</span>
            <span className="text-xs text-slate-500 font-normal hidden sm:inline">(Process & Materials)</span>
          </h2>
        </div>
        <span className="text-xs text-cyan-400/80 font-mono">Meyerhofer Model Matrix</span>
      </div>

      {/* 1. Material & Calibrated Curve Dropdown Selector */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <label htmlFor="material-select-dropdown" className="font-bold text-slate-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>材料與已校正基準選擇 (Material / Baseline Selector)</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              id="btn-save-current-curve-quick"
              type="button"
              onClick={onOpenSaveCurveModal}
              className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              title="將當前已校正之模型參數與實測數據儲存為自訂曲線"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>存取材料基本值</span>
            </button>
            <button
              id="btn-manage-saved-curves"
              type="button"
              onClick={onOpenManageCurvesModal}
              className="text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              title="管理、匯入或匯出已儲存之材料基本值庫"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
              <span>管理庫 ({savedCurves.length})</span>
            </button>
          </div>
        </div>

        {/* Dropdown Select Element */}
        <div className="relative">
          <select
            id="material-select-dropdown"
            value={selectedValue}
            onChange={handleDropdownChange}
            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 text-slate-100 border border-slate-700 hover:border-cyan-500/80 focus:border-cyan-400 rounded-xl text-sm font-semibold transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/30 shadow-inner"
          >
            <optgroup label="── 📁 標準半導體微影/填平材料 (Standard Resins) ──" className="bg-slate-950 text-slate-300">
              {(Object.keys(RESIN_CONFIGS) as ResinType[]).map(type => {
                const config = RESIN_CONFIGS[type];
                return (
                  <option key={type} value={type} className="bg-slate-950 text-slate-100 py-1">
                    {config.name} ({type}) ─ 建議膜厚: {config.recommendedThicknessRange[0].toFixed(3)} ~ {config.recommendedThicknessRange[1].toFixed(3)} nm
                  </option>
                );
              })}
            </optgroup>

            {savedCurves.length > 0 && (
              <optgroup label="── ⭐ 已儲存材料基準值庫 (Saved Material Baselines) ──" className="bg-slate-950 text-cyan-300">
                {savedCurves.map(curve => (
                  <option key={curve.id} value={`custom:${curve.id}`} className="bg-slate-950 text-cyan-200 py-1">
                    ★ {curve.name} [{curve.resinType}] (基本常數 C₀={curve.calibratedC.toFixed(2)}, α₀={curve.calibratedAlpha.toFixed(3)})
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>

        {/* Active Material / Saved Curve Info Banner */}
        {activeSavedCurve ? (
          <div className="p-3 bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-500/40 rounded-xl text-xs space-y-2 animate-in fade-in shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>已載入自訂材料基本值：{activeSavedCurve.name}</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectResin(activeSavedCurve.resinType)}
                className="text-[11px] font-semibold text-cyan-300 hover:text-white bg-cyan-950 px-2 py-0.5 rounded border border-cyan-600/50 hover:bg-cyan-900 transition-colors"
                title="還原為原廠標準材料參數"
              >
                還原為標準 {activeSavedCurve.resinType}
              </button>
            </div>
            
            <p className="text-[11px] text-slate-300">
              已將校正參數固化為本材料之<strong>理論基本值 (C₀={activeSavedCurve.calibratedC.toFixed(2)}, α₀={activeSavedCurve.calibratedAlpha.toFixed(4)})</strong>。實測點位已清空為基本狀態，後續輸入新配方樣品時將直接以此基本值進行二次校正，避免原校正點位干擾！
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 font-mono text-[11px] text-slate-300">
              <span className="bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-800/60 text-slate-200">
                基底材料: <strong className="text-cyan-300">{currentResin.name} ({activeSavedCurve.resinType})</strong>
              </span>
              <span className="bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-800/60 text-cyan-300">
                基準常數 C₀: <strong>{activeSavedCurve.calibratedC.toFixed(2)}</strong>
              </span>
              <span className="bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-800/60 text-cyan-300">
                固含量指數 α₀: <strong>{activeSavedCurve.calibratedAlpha.toFixed(4)}</strong>
              </span>
              <span className="bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-800/60 text-slate-300">
                原校正轉速: <strong>{activeSavedCurve.spinSpeed} RPM</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-300">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong className="text-cyan-300">{currentResin.fullName}</strong> — {currentResin.description}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px] bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
              <span>α: <strong className="text-cyan-400">{currentResin.alpha.toFixed(2)}</strong></span>
              <span>β: <strong className="text-cyan-400">{currentResin.beta.toFixed(2)}</strong></span>
              <span>γ: <strong className="text-cyan-400">{currentResin.gamma.toFixed(2)}</strong></span>
              <span>C₀: <strong className="text-cyan-400">{currentResin.defaultC.toFixed(1)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Process Parameters Inputs: Spin Speed & Spin Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-800">
        {/* Main Spin Speed (RPM) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="spin-speed-input" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              主轉速 ω (Main Spin Speed)
            </label>
            <div className="flex items-center gap-1 text-xs">
              <input
                id="spin-speed-input"
                type="number"
                min="500"
                max="5000"
                step="50"
                value={spinSpeed}
                onChange={e => onSpinSpeedChange(Number(e.target.value))}
                className="w-20 px-2 py-1 text-right font-mono font-bold text-cyan-300 bg-slate-950 border border-slate-700 rounded-lg focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 text-xs shadow-inner"
              />
              <span className="font-mono text-slate-400">RPM</span>
            </div>
          </div>
          <input
            id="spin-speed-slider"
            type="range"
            min="500"
            max="5000"
            step="50"
            value={spinSpeed}
            onChange={e => onSpinSpeedChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>500 RPM</span>
            <div className="flex gap-1">
              {rpmPresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSpinSpeedChange(preset)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    spinSpeed === preset
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <span>5000 RPM</span>
          </div>
        </div>

        {/* Spin Duration (Seconds) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="spin-time-input" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              旋塗時間 t (Spin Duration)
            </label>
            <div className="flex items-center gap-1 text-xs">
              <input
                id="spin-time-input"
                type="number"
                min="1"
                max="60"
                step="1"
                value={spinTime}
                onChange={e => onSpinTimeChange(Number(e.target.value))}
                className="w-16 px-2 py-1 text-right font-mono font-bold text-cyan-300 bg-slate-950 border border-slate-700 rounded-lg focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 text-xs shadow-inner"
              />
              <span className="font-mono text-slate-400">sec</span>
            </div>
          </div>
          <input
            id="spin-time-slider"
            type="range"
            min="1"
            max="60"
            step="1"
            value={spinTime}
            onChange={e => onSpinTimeChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>1 s</span>
            <div className="flex gap-1">
              {timePresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSpinTimeChange(preset)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    spinTime === preset
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {preset}s
                </button>
              ))}
            </div>
            <span>60 s</span>
          </div>
        </div>
      </div>

      {/* 3. Target Thickness & Tolerance Inputs (h_target & ±Tolerance%) */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <div className="bg-slate-950 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 font-mono">
              <Target className="w-4 h-4 text-cyan-400" />
              <span>目標膜厚 (Target Film Thickness h_target)</span>
            </div>
            <p className="text-xs text-slate-300">
              系統將依據流體蒸發模型反推建議固含量 (wt%) 與 ±{tolerancePercent.toFixed(1)}% 容許公差。
            </p>
            <div className="text-[11px] text-slate-400 font-mono">
              推薦適配區間: <span className="text-cyan-300">{minRange.toFixed(3)}</span> ~ <span className="text-cyan-300">{maxRange.toFixed(3)}</span> nm
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <input
                id="target-thickness-input"
                type="number"
                min="0.1"
                max="50000"
                step="0.001"
                value={targetThickness}
                onChange={e => onTargetThicknessChange(Number(e.target.value))}
                className="w-32 sm:w-36 px-3 py-2 text-right font-mono font-extrabold text-xl text-cyan-300 bg-slate-900 border-2 border-cyan-500/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
              />
              <span className="absolute right-3 top-2.5 font-mono text-xs text-cyan-400 pointer-events-none">
                nm
              </span>
            </div>

            {/* Range status badge */}
            <div className="hidden sm:flex items-center text-xs">
              {!isThicknessOutOfRange ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-950/80 px-2.5 py-1.5 rounded-lg border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  適配推薦區間
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-300 font-medium bg-amber-950/80 px-2.5 py-1.5 rounded-lg border border-amber-500/50" title={`此材料建議膜厚為 ${minRange.toFixed(3)} ~ ${maxRange.toFixed(3)} nm`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  超出典型區間
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Film Thickness Tolerance Selector (0.1% ~ 10.0%) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 font-mono">
              <span>膜厚容忍範圍 (Tolerance Window):</span>
              <strong className="text-amber-300 font-bold font-mono">±{tolerancePercent.toFixed(1)}%</strong>
              <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">(可設定 0.1% ~ 10.0%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="input-tolerance-percent"
                type="number"
                min="0.1"
                max="10.0"
                step="0.1"
                value={tolerancePercent}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    onTolerancePercentChange(Math.min(10.0, Math.max(0.1, val)));
                  }
                }}
                className="w-16 px-2 py-1 text-right font-mono font-bold text-amber-300 bg-slate-950 border border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-400 text-xs shadow-inner"
              />
              <span className="font-mono text-xs text-amber-400 font-bold">%</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="slider-tolerance-percent"
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={tolerancePercent}
              onChange={e => onTolerancePercentChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>±0.1% (嚴苛光學級)</span>
            <div className="flex items-center gap-1">
              {tolerancePresets.map(tp => (
                <button
                  key={tp}
                  type="button"
                  id={`btn-preset-tol-${tp}`}
                  onClick={() => onTolerancePercentChange(tp)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    Math.abs(tolerancePercent - tp) < 0.05
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  ±{tp.toFixed(1)}%
                </button>
              ))}
            </div>
            <span>±10.0% (寬鬆製程)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
