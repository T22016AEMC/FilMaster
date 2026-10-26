import {useEffect, useState} from 'react';
import type {EquipmentLimits} from '../types';
import {isEquipmentLimits} from '../utils/equipmentLimits';

const labels: Record<keyof EquipmentLimits, string> = {
  minSpeed: '轉速下限（rpm）', maxSpeed: '轉速上限（rpm）',
  minTime: '時間下限（s）', maxTime: '時間上限（s）',
};

function LimitField({field, limits, onChange}: {
  field: keyof EquipmentLimits; limits: EquipmentLimits; onChange: (limits: EquipmentLimits) => void;
}) {
  const value = limits[field];
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {setDraft(String(value)); setInvalid(false);}, [limits, value]);
  return <label className="space-y-1 text-sm">{labels[field]}
    <input type="number" aria-label={labels[field]} value={draft} min="0" step="any"
      aria-invalid={invalid || undefined} aria-describedby={invalid ? `limit-${field}-hint` : undefined}
      className={`numeric-input ${invalid ? 'border-rose-500!' : ''}`}
      onChange={e => {
        setDraft(e.target.value);
        const candidate = {...limits, [field]: Number(e.target.value)};
        const valid = e.target.value.trim() !== '' && isEquipmentLimits(candidate);
        setInvalid(!valid);
        if (valid) onChange(candidate);
      }} onBlur={() => {setDraft(String(value)); setInvalid(false);}} />
    {invalid && <span id={`limit-${field}-hint`} className="block text-xs text-red-700">請輸入大於 0 的數值，且下限須小於上限</span>}
  </label>;
}

export function EquipmentSettings({limits, onChange, onReset, storageError}: {
  limits: EquipmentLimits; onChange: (limits: EquipmentLimits) => void; onReset: () => void; storageError: boolean;
}) {
  return <details className="card"><summary>進階設定</summary>
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {(Object.keys(labels) as Array<keyof EquipmentLimits>).map(field =>
        <LimitField key={field} field={field} limits={limits} onChange={onChange} />)}
    </div>
    <button type="button" className="button-secondary mt-4" onClick={onReset}>恢復預設</button>
    {storageError && <p className="text-sm text-amber-800 mt-2">設定已套用，但瀏覽器無法儲存；重新載入後可能恢復預設。</p>}
  </details>;
}
