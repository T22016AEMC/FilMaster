import type {CalculationMode, ProcessSolveMode, ResinType, SavedCalibratedCurve} from '../types';
import {RESIN_CONFIGS} from '../utils/resinConfigs';
import {NumericField} from './NumericField';

interface ProcessInputsProps {
  selectedResin: ResinType; onSelectResin: (resin: ResinType) => void;
  savedCurves: SavedCalibratedCurve[]; activeCustomCurveId?: string | null;
  onSelectCustomCurve: (curve: SavedCalibratedCurve) => void;
  onOpenSaveCurveModal: () => void; onOpenManageCurvesModal: () => void;
  spinSpeed: number; onSpinSpeedChange: (v: number) => void;
  spinTime: number; onSpinTimeChange: (v: number) => void;
  targetThickness: number; onTargetThicknessChange: (v: number) => void;
  tolerancePercent: number; onTolerancePercentChange: (v: number) => void;
  calculationMode: CalculationMode; processSolveMode: ProcessSolveMode;
  onProcessSolveModeChange: (mode: ProcessSolveMode) => void;
  fixedSolids: number; onFixedSolidsChange: (v: number) => void;
}

export function ProcessInputs(p: ProcessInputsProps) {
  const process = p.calculationMode === 'solve_process';
  const resin = RESIN_CONFIGS[p.selectedResin];
  const active = p.savedCurves.find(c => c.id === p.activeCustomCurveId);
  return <section className="card space-y-6" aria-label="計算輸入">
    <h2 className="font-semibold text-base">材料與製程</h2>
    <div className="space-y-2">
      <label htmlFor="material-select-dropdown" className="block text-sm font-medium">材料</label>
      <select id="material-select-dropdown" className="numeric-input"
        value={p.activeCustomCurveId ? `custom:${p.activeCustomCurveId}` : p.selectedResin}
        onChange={e => {
          const value = e.target.value;
          if (value.startsWith('custom:')) {
            const curve = p.savedCurves.find(c => c.id === value.slice(7));
            if (curve) p.onSelectCustomCurve(curve);
          } else p.onSelectResin(value as ResinType);
        }}>
        <optgroup label="標準材料">{Object.values(RESIN_CONFIGS).map(r => <option key={r.id} value={r.id}>{r.name}（{r.id}）</option>)}</optgroup>
        <optgroup label="已儲存自訂曲線">{p.savedCurves.map(c => <option key={c.id} value={`custom:${c.id}`}>{c.name}</option>)}</optgroup>
      </select>
      <p className="text-xs text-slate-600 leading-relaxed">{active ? `已載入自訂材料基本值：${active.name}` : resin.description}</p>
      {active && <button className="text-sm text-blue-700" onClick={() => p.onSelectResin(active.resinType)}>還原為標準 {active.resinType}</button>}
      <div className="flex flex-wrap items-center gap-2">
        <button id="btn-save-current-curve-quick" type="button" className="button-secondary"
          disabled={process} title={process ? '請在求固含量模式儲存' : '儲存目前校正參數與實測點'} onClick={p.onOpenSaveCurveModal}>儲存為自訂曲線</button>
        <button id="btn-manage-saved-curves" type="button" className="text-sm text-blue-700" onClick={p.onOpenManageCurvesModal}>管理庫（{p.savedCurves.length}）</button>
      </div>
      {process && <p className="text-xs text-slate-600">請在求固含量模式儲存</p>}
    </div>
    {process && <>
      <NumericField id="fixed-solids-input" label="固定固含量" value={p.fixedSolids} onChange={p.onFixedSolidsChange} unit="wt%" />
      <div className="segmented" role="group" aria-label="求製程方式">
        <button className="segment" aria-pressed={p.processSolveMode === 'solve_speed'} onClick={() => p.onProcessSolveModeChange('solve_speed')}>求轉速（時間固定）</button>
        <button className="segment" aria-pressed={p.processSolveMode === 'solve_time'} onClick={() => p.onProcessSolveModeChange('solve_time')}>求時間（轉速固定）</button>
      </div>
    </>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {(!process || p.processSolveMode === 'solve_time') && <NumericField id="spin-speed-input" label={process ? '固定轉速' : '主轉速 ω'}
        value={p.spinSpeed} onChange={p.onSpinSpeedChange} unit="rpm" presets={[1000, 1500, 2000, 2500, 3000]} />}
      {(!process || p.processSolveMode === 'solve_speed') && <NumericField id="spin-time-input" label={process ? '固定時間' : '旋塗時間 t'}
        value={p.spinTime} onChange={p.onSpinTimeChange} unit="s" presets={[15, 20, 30, 45, 60]} />}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
      <NumericField id="target-thickness-input" label="目標膜厚" value={p.targetThickness} onChange={p.onTargetThicknessChange} unit="nm" />
      <NumericField id="input-tolerance-percent" label="膜厚容差" value={p.tolerancePercent} onChange={p.onTolerancePercentChange} unit="%"
        normalize={v => Math.min(10, Math.max(0.1, v))} />
    </div>
    <p className="text-xs text-slate-600">材料建議膜厚：{resin.recommendedThicknessRange[0]} ～ {resin.recommendedThicknessRange[1]} nm；容差可設定 0.1%～10%。</p>
  </section>;
}
