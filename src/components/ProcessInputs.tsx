import React from 'react';
import { ResinType, ResinConfig, SavedCalibratedCurve } from '../types';
import { RESIN_CONFIGS } from '../utils/resinConfigs';
import { useNumericInput, INVALID_NUMBER_HINT } from '../hooks/useNumericInput';
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

const INVALID_INPUT_CLASS = 'border-rose-500! focus:ring-rose-500! focus:border-rose-500!';

/** 數值無效時顯示在輸入框下方的提示 */
const InvalidHint: React.FC<{ show: boolean; id: string; className?: string }> = ({ show, id, className = '' }) =>
  show ? (
    <p id={id} aria-live="polite" className={`text-xs  text-rose-700 ${className}`}>
      {INVALID_NUMBER_HINT}
    </p>
  ) : null;

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
  const speedInput = useNumericInput(spinSpeed, onSpinSpeedChange);
  const timeInput = useNumericInput(spinTime, onSpinTimeChange);
  const thicknessInput = useNumericInput(targetThickness, onTargetThicknessChange);
  const toleranceInput = useNumericInput(tolerancePercent, onTolerancePercentChange, v =>
    Math.min(10.0, Math.max(0.1, v)),
  );

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
    <div className="bg-white  rounded-2xl shadow-sm shadow-sm border border-slate-200 p-5 space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-50 " />
          <h2 className="text-sm font-bold   text-slate-900  flex items-center gap-2">
            <span>01. 製程條件與材料選擇</span>
            <span className="text-xs text-slate-600 font-normal hidden sm:inline">(Process & Materials)</span>
          </h2>
        </div>
        <span className="text-xs text-blue-700 ">Meyerhofer Model Matrix</span>
      </div>

      {/* 1. Material & Calibrated Curve Dropdown Selector */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <label htmlFor="material-select-dropdown" className="font-bold text-slate-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-700" />
            <span>材料與已校正基準選擇 (Material / Baseline Selector)</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              id="btn-save-current-curve-quick"
              type="button"
              onClick={onOpenSaveCurveModal}
              className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              title="將當前已校正之模型參數與實測數據儲存為自訂曲線"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-blue-700" />
              <span>存取材料基本值</span>
            </button>
            <button
              id="btn-manage-saved-curves"
              type="button"
              onClick={onOpenManageCurvesModal}
              className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              title="管理、匯入或匯出已儲存之材料基本值庫"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-600" />
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
            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 text-slate-900 border border-slate-200 hover:border-blue-200 focus:border-blue-200 rounded-xl text-sm font-semibold transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
          >
            <optgroup label="── 📁 標準半導體微影/填平材料 (Standard Resins) ──" className="bg-slate-50 text-slate-700">
              {(Object.keys(RESIN_CONFIGS) as ResinType[]).map(type => {
                const config = RESIN_CONFIGS[type];
                return (
                  <option key={type} value={type} className="bg-slate-50 text-slate-900 py-1">
                    {config.name} ({type}) ─ 建議膜厚: {config.recommendedThicknessRange[0].toFixed(3)} ~ {config.recommendedThicknessRange[1].toFixed(3)} nm
                  </option>
                );
              })}
            </optgroup>

            {savedCurves.length > 0 && (
              <optgroup label="── ⭐ 已儲存材料基準值庫 (Saved Material Baselines) ──" className="bg-slate-50 text-blue-700">
                {savedCurves.map(curve => (
                  <option key={curve.id} value={`custom:${curve.id}`} className="bg-slate-50 text-blue-700 py-1">
                    ★ {curve.name} [{curve.resinType}] (基本常數 C₀={curve.calibratedC.toFixed(2)}, α₀={curve.calibratedAlpha.toFixed(3)})
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <div className="absolute right-3 top-3 pointer-events-none text-slate-600">
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>

        {/* Active Material / Saved Curve Info Banner */}
        {activeSavedCurve ? (
          <div className="p-3    border border-blue-200 rounded-xl text-xs space-y-2 animate-in fade-in ">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-blue-700">
                <Sparkles className="w-4 h-4 text-blue-700" />
                <span>已載入自訂材料基本值：{activeSavedCurve.name}</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectResin(activeSavedCurve.resinType)}
                className="text-xs font-semibold text-blue-700 hover:text-slate-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                title="還原為原廠標準材料參數"
              >
                還原為標準 {activeSavedCurve.resinType}
              </button>
            </div>
            
            <p className="text-xs text-slate-700">
              已將校正參數固化為本材料之<strong>理論基本值 (C₀={activeSavedCurve.calibratedC.toFixed(2)}, α₀={activeSavedCurve.calibratedAlpha.toFixed(4)})</strong>。實測點位已清空為基本狀態，後續輸入新配方樣品時將直接以此基本值進行二次校正，避免原校正點位干擾！
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-0.5  text-xs text-slate-700">
              <span className="bg-slate-50 px-2 py-0.5 rounded border border-blue-200 text-slate-900">
                基底材料: <strong className="text-blue-700">{currentResin.name} ({activeSavedCurve.resinType})</strong>
              </span>
              <span className="bg-slate-50 px-2 py-0.5 rounded border border-blue-200 text-blue-700">
                基準常數 C₀: <strong>{activeSavedCurve.calibratedC.toFixed(2)}</strong>
              </span>
              <span className="bg-slate-50 px-2 py-0.5 rounded border border-blue-200 text-blue-700">
                固含量指數 α₀: <strong>{activeSavedCurve.calibratedAlpha.toFixed(4)}</strong>
              </span>
              <span className="bg-slate-50 px-2 py-0.5 rounded border border-blue-200 text-slate-700">
                原校正轉速: <strong>{activeSavedCurve.spinSpeed} RPM</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                <strong className="text-blue-700">{currentResin.fullName}</strong> — {currentResin.description}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700  text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
              <span>α: <strong className="text-blue-700">{currentResin.alpha.toFixed(2)}</strong></span>
              <span>β: <strong className="text-blue-700">{currentResin.beta.toFixed(2)}</strong></span>
              <span>γ: <strong className="text-blue-700">{currentResin.gamma.toFixed(2)}</strong></span>
              <span>C₀: <strong className="text-blue-700">{currentResin.defaultC.toFixed(1)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Process Parameters Inputs: Spin Speed & Spin Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-200">
        {/* Main Spin Speed (RPM) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="spin-speed-input" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-blue-700" />
              主轉速 ω (Main Spin Speed)
            </label>
            <div className="flex items-center gap-1 text-xs">
              <input
                id="spin-speed-input"
                type="number"
                min="500"
                max="5000"
                step="50"
                {...speedInput.inputProps}
                aria-describedby={speedInput.invalid ? 'spin-speed-hint' : undefined}
                className={`w-20 px-2 py-1 text-right  font-bold text-blue-700 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-200 focus:border-blue-200 text-xs shadow-sm ${
                  speedInput.invalid ? INVALID_INPUT_CLASS : ''
                }`}
              />
              <span className=" text-slate-600">RPM</span>
            </div>
          </div>
          <InvalidHint show={speedInput.invalid} id="spin-speed-hint" className="text-right" />
          <input
            id="spin-speed-slider"
            type="range"
            min="500"
            max="5000"
            step="50"
            value={spinSpeed}
            onChange={e => onSpinSpeedChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex items-center justify-between text-xs text-slate-600 ">
            <span>500 RPM</span>
            <div className="flex gap-1">
              {rpmPresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSpinSpeedChange(preset)}
                  className={`px-1.5 py-0.5 rounded text-xs  transition-colors ${
                    spinSpeed === preset
                      ? 'bg-blue-50 text-slate-600 font-bold '
                      : 'bg-slate-100 hover:bg-slate-100 text-slate-700'
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
            <label htmlFor="spin-time-input" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-700" />
              旋塗時間 t (Spin Duration)
            </label>
            <div className="flex items-center gap-1 text-xs">
              <input
                id="spin-time-input"
                type="number"
                min="1"
                max="60"
                step="1"
                {...timeInput.inputProps}
                aria-describedby={timeInput.invalid ? 'spin-time-hint' : undefined}
                className={`w-16 px-2 py-1 text-right  font-bold text-blue-700 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-200 focus:border-blue-200 text-xs shadow-sm ${
                  timeInput.invalid ? INVALID_INPUT_CLASS : ''
                }`}
              />
              <span className=" text-slate-600">sec</span>
            </div>
          </div>
          <InvalidHint show={timeInput.invalid} id="spin-time-hint" className="text-right" />
          <input
            id="spin-time-slider"
            type="range"
            min="1"
            max="60"
            step="1"
            value={spinTime}
            onChange={e => onSpinTimeChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex items-center justify-between text-xs text-slate-600 ">
            <span>1 s</span>
            <div className="flex gap-1">
              {timePresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSpinTimeChange(preset)}
                  className={`px-1.5 py-0.5 rounded text-xs  transition-colors ${
                    spinTime === preset
                      ? 'bg-blue-50 text-slate-600 font-bold '
                      : 'bg-slate-100 hover:bg-slate-100 text-slate-700'
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
      <div className="pt-2 border-t border-slate-200 space-y-3">
        <div className="bg-slate-50 text-slate-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-200 ">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 ">
              <Target className="w-4 h-4 text-blue-700" />
              <span>目標膜厚 (Target Film Thickness h_target)</span>
            </div>
            <p className="text-xs text-slate-700">
              系統將依據流體蒸發模型反推建議固含量 (wt%) 與 ±{tolerancePercent.toFixed(1)}% 容許公差。
            </p>
            <div className="text-xs text-slate-600 ">
              推薦適配區間: <span className="text-blue-700">{minRange.toFixed(3)}</span> ~ <span className="text-blue-700">{maxRange.toFixed(3)}</span> nm
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
                {...thicknessInput.inputProps}
                aria-describedby={thicknessInput.invalid ? 'target-thickness-hint' : undefined}
                className={`w-32 sm:w-36 px-3 py-2 text-right  font-extrabold text-xl text-blue-700 bg-white border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200  ${
                  thicknessInput.invalid ? INVALID_INPUT_CLASS : ''
                }`}
              />
              <span className="absolute right-3 top-2.5  text-xs text-blue-700 pointer-events-none">
                nm
              </span>
              <InvalidHint show={thicknessInput.invalid} id="target-thickness-hint" className="absolute right-0 top-full mt-1 whitespace-nowrap" />
            </div>

            {/* Range status badge */}
            <div className="hidden sm:flex items-center text-xs">
              {!isThicknessOutOfRange ? (
                <span className="flex items-center gap-1 text-blue-700 font-medium bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 ">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  適配推薦區間
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200" title={`此材料建議膜厚為 ${minRange.toFixed(3)} ~ ${maxRange.toFixed(3)} nm`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  超出典型區間
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Film Thickness Tolerance Selector (0.1% ~ 10.0%) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 ">
              <span>膜厚容忍範圍 (Tolerance Window):</span>
              <strong className="text-amber-700 font-bold ">±{tolerancePercent.toFixed(1)}%</strong>
              <span className="text-xs text-slate-600 font-normal hidden sm:inline">(可設定 0.1% ~ 10.0%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="input-tolerance-percent"
                type="number"
                min="0.1"
                max="10.0"
                step="0.1"
                {...toleranceInput.inputProps}
                aria-describedby={toleranceInput.invalid ? 'tolerance-hint' : undefined}
                className={`w-16 px-2 py-1 text-right  font-bold text-amber-700 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-200 text-xs shadow-sm ${
                  toleranceInput.invalid ? INVALID_INPUT_CLASS : ''
                }`}
              />
              <span className=" text-xs text-amber-700 font-bold">%</span>
            </div>
          </div>
          <InvalidHint show={toleranceInput.invalid} id="tolerance-hint" className="text-right" />

          <div className="flex items-center gap-3">
            <input
              id="slider-tolerance-percent"
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={tolerancePercent}
              onChange={e => onTolerancePercentChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 ">
            <span>±0.1% (嚴苛光學級)</span>
            <div className="flex items-center gap-1">
              {tolerancePresets.map(tp => (
                <button
                  key={tp}
                  type="button"
                  id={`btn-preset-tol-${tp}`}
                  onClick={() => onTolerancePercentChange(tp)}
                  className={`px-2 py-0.5 rounded text-xs  transition-colors ${
                    Math.abs(tolerancePercent - tp) < 0.05
                      ? 'bg-amber-50 text-slate-600 font-bold '
                      : 'bg-slate-100 hover:bg-slate-100 text-slate-700'
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
