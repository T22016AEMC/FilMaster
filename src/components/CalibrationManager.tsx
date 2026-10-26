import React, { useState } from 'react';
import { MeasuredPoint, CalibrationResult, ResinConfig, ProcessSolveMode } from '../types';
import {parsePositive} from '../hooks/useNumericInput';
import { formatMeasureCondition } from '../utils/format';

// 範例按鈕載入的實測點，記錄範例本身的量測條件（不使用畫面上目前的轉速與時間）
const EXAMPLE_SPIN_SPEED = 2000;
const EXAMPLE_SPIN_TIME = 30;

interface CalibrationManagerProps {
  measuredPoints: MeasuredPoint[];
  onUpdatePoints: (points: MeasuredPoint[]) => void;
  calibration: CalibrationResult;
  spinSpeed: number;
  spinTime: number;
  currentResin?: ResinConfig; unknownCondition?: ProcessSolveMode;
}

export const CalibrationManager: React.FC<CalibrationManagerProps> = ({
  measuredPoints,
  onUpdatePoints,
  calibration,
  spinSpeed,
  spinTime,
  currentResin, unknownCondition,
}) => {
  const [newSolids, setNewSolids] = useState<string>('');
  const [newThickness, setNewThickness] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');

  const [newSpeed, setNewSpeed] = useState('');
  const [newTime, setNewTime] = useState('');
  const measuredSpeed = unknownCondition === 'solve_speed' ? parsePositive(newSpeed) : spinSpeed;
  const measuredTime = unknownCondition === 'solve_time' ? parsePositive(newTime) : spinTime;
  const canAdd = parsePositive(newSolids) !== null && parsePositive(newThickness) !== null && measuredSpeed !== null && measuredTime !== null;

  const isCustomBase = !!currentResin?.isCustomBaseline;

  const handleAddPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseFloat(newSolids);
    const h = parseFloat(newThickness);
    if (canAdd && measuredSpeed !== null && measuredTime !== null) {
      const newPoint: MeasuredPoint = {
        id: `point-${Date.now()}`,
        solidsContent: s,
        thickness: h,
        note: newNote.trim() || `新配方樣品 #${measuredPoints.length + 1}`,
        spinSpeed: measuredSpeed,
        spinTime: measuredTime,
      };
      onUpdatePoints([...measuredPoints, newPoint]);
      setNewSolids('');
      setNewThickness('');
      setNewNote('');
      setNewSpeed(''); setNewTime('');
    }
  };

  const handleRemovePoint = (id: string) => {
    onUpdatePoints(measuredPoints.filter(p => p.id !== id));
  };

  const handleClearAll = () => {
    onUpdatePoints([]);
  };

  const handleLoadOfficialTestExample = () => {
    onUpdatePoints([
      {
        id: 'official-test-1',
        solidsContent: 8.0,
        thickness: 180.0,
        note: '官方測試範例: 固含量 8.0 wt%, 實測 180.000 nm',
        spinSpeed: EXAMPLE_SPIN_SPEED,
        spinTime: EXAMPLE_SPIN_TIME,
      },
    ]);
  };

  const handleLoadMultiPointDemo = () => {
    onUpdatePoints([
      { id: 'm-1', solidsContent: 5.0, thickness: 85.0, note: '低濃度批次 (5.0 wt%)', spinSpeed: EXAMPLE_SPIN_SPEED, spinTime: EXAMPLE_SPIN_TIME },
      { id: 'm-2', solidsContent: 8.0, thickness: 182.0, note: '標稱批次 (8.0 wt%)', spinSpeed: EXAMPLE_SPIN_SPEED, spinTime: EXAMPLE_SPIN_TIME },
      { id: 'm-3', solidsContent: 10.0, thickness: 260.0, note: '中高濃度 (10.0 wt%)', spinSpeed: EXAMPLE_SPIN_SPEED, spinTime: EXAMPLE_SPIN_TIME },
      { id: 'm-4', solidsContent: 12.0, thickness: 350.0, note: '高膜厚驗證 (12.0 wt%)', spinSpeed: EXAMPLE_SPIN_SPEED, spinTime: EXAMPLE_SPIN_TIME },
    ]);
  };

  const missingCount = measuredPoints.filter(p => p.spinSpeed === undefined || p.spinTime === undefined).length;
  return <section className="card space-y-4" aria-label="實測點">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold text-base">實測點</h2>
      <div className="flex gap-2">
        <button type="button" className="text-xs text-blue-700" onClick={handleLoadOfficialTestExample}>1 點測試範例 (8.0 wt%, 180 nm)</button>
        <button type="button" className="text-xs text-blue-700" onClick={handleLoadMultiPointDemo}>多點擬合範例</button>
      </div>
    </div>
    <p className="text-xs text-slate-600">{calibration.modeLabel}{isCustomBase ? ' · 已套用自訂材料基本值' : ''}</p>
    <form onSubmit={handleAddPoint} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs space-y-1">固含量（wt%）<input id="input-new-solids" aria-label="實測固含量" type="number" step="any" value={newSolids}
          onChange={e => setNewSolids(e.target.value)} className="numeric-input" required /></label>
        <label className="text-xs space-y-1">膜厚（nm）<input id="input-new-thickness" aria-label="實測膜厚" type="number" step="any" value={newThickness}
          onChange={e => setNewThickness(e.target.value)} className="numeric-input" required /></label>
      </div>
      {unknownCondition && <label className="block text-xs space-y-1">
        {unknownCondition === 'solve_speed' ? '量測轉速（rpm，必填）' : '量測時間（s，必填）'}
        <input aria-label={unknownCondition === 'solve_speed' ? '新增點量測轉速' : '新增點量測時間'} type="number" step="any" required
          value={unknownCondition === 'solve_speed' ? newSpeed : newTime}
          onChange={e => unknownCondition === 'solve_speed' ? setNewSpeed(e.target.value) : setNewTime(e.target.value)}
          className="numeric-input" />
        <span className="text-slate-600">請填寫實際量測條件，求解中的條件不會自動帶入。</span>
      </label>}
      <div className="flex gap-2">
        <input id="input-new-note" aria-label="實測點備註" placeholder="備註（選填）" value={newNote} onChange={e => setNewNote(e.target.value)} className="numeric-input min-w-0" />
        <button id="btn-add-point" type="submit" className="button-primary shrink-0" disabled={!canAdd}>加入校正</button>
      </div>
    </form>
    {missingCount > 0 && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800" data-testid="missing-conditions-hint">
      有 {missingCount} 個實測點未記錄量測條件，目前假設為 {spinSpeed} rpm / {spinTime} s，可直接在表格內補填
    </p>}
    {measuredPoints.length > 0 ? <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left"><thead className="text-slate-600 border-b border-slate-200"><tr>
          <th className="py-2 pr-2">固含量 / 膜厚</th><th className="py-2 pr-2">量測條件</th><th className="py-2">操作</th>
        </tr></thead><tbody>
          {measuredPoints.map((point, i) => <tr key={point.id} className="border-b border-slate-100">
            <td className="py-3 pr-2"><span className="font-mono">{point.solidsContent.toFixed(4)} wt%<br />{point.thickness.toFixed(3)} nm</span>
              {point.note && <span className="block max-w-40 text-slate-600 mt-1">{point.note}</span>}</td>
            <td className="py-3 pr-2">{point.spinSpeed !== undefined && point.spinTime !== undefined
              ? <span>{formatMeasureCondition(point)}</span>
              : <div className="space-y-2">
                {(['spinSpeed', 'spinTime'] as const).map(field => point[field] !== undefined
                  ? <span key={field} className="block">{point[field]} {field === 'spinSpeed' ? 'rpm' : 's'}</span>
                  : <MissingConditionField key={field} label={`實測點 ${i + 1} ${field === 'spinSpeed' ? '轉速' : '時間'}`}
                    unit={field === 'spinSpeed' ? 'rpm' : 's'} onCommit={value => onUpdatePoints(measuredPoints.map(p => p.id === point.id ? {...p, [field]: value} : p))} />)}
              </div>}</td>
            <td><button type="button" aria-label={`刪除實測點 ${i + 1}`} className="text-slate-600 hover:text-red-700" onClick={() => handleRemovePoint(point.id)}>刪除</button></td>
          </tr>)}
        </tbody></table>
      </div>
      <button type="button" className="text-xs text-slate-600 hover:text-red-700" onClick={handleClearAll}>重設點位為基本值（清空實測點）</button>
    </> : <p className="text-sm text-slate-600">目前為「0 數據點理論推算模式」，可新增實測點進行校正。</p>}
  </section>;
};

function MissingConditionField({label, unit, onCommit}: {label: string; unit: string; onCommit: (v: number) => void}) {
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);
  const commit = () => {
    const value = parsePositive(draft);
    if (value !== null) onCommit(value);
    else {setDraft(''); setInvalid(false);}
  };
  return <div>
    <input aria-label={label} placeholder={unit} type="number" step="any" value={draft}
      className={`numeric-input max-w-28 ${invalid ? 'border-rose-500!' : ''}`} aria-invalid={invalid || undefined}
      onChange={e => {setDraft(e.target.value); setInvalid(parsePositive(e.target.value) === null);}}
      onBlur={commit} onKeyDown={e => {if (e.key === 'Enter') {e.preventDefault(); commit();}}} />
    {invalid && <span className="text-xs text-red-700">請輸入大於 0 的數值</span>}
  </div>;
}
