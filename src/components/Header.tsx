import {useState} from 'react';
import {BrandMark} from './BrandMark';
import {PRESET_SCENARIOS} from '../utils/resinConfigs';
import type {PresetScenario} from '../types';

export function Header({onSelectPreset, activePresetId, onOpenFormula, onOpenCurves, onReset}: {
  onSelectPreset: (preset: PresetScenario) => void; activePresetId?: string;
  onOpenFormula: () => void; onOpenCurves: () => void; onReset: () => void;
}) {
  const [presetsOpen, setPresetsOpen] = useState(false);
  return <header className="brand-header">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap justify-between items-center gap-6">
      <div className="flex items-center gap-5">
        <BrandMark />
        <div className="space-y-1">
          <h1 className="brand-title">FilMaster</h1>
          <p className="brand-subtitle">半導體旋塗膜厚與固含量預測</p>
          <p className="brand-version">版本 v{__APP_VERSION__}</p>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="次要操作">
        <div className="relative">
          <button className="button-text" aria-expanded={presetsOpen} onClick={() => setPresetsOpen(!presetsOpen)}>預設情境</button>
          <div hidden={!presetsOpen} className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] card z-40 space-y-1">
            {PRESET_SCENARIOS.map(p => <button id={`preset-btn-${p.id}`} key={p.id} title={p.description}
              className={`block w-full rounded-lg p-2 text-left text-sm hover:bg-blue-50 ${activePresetId === p.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
              onClick={() => {onSelectPreset(p); setPresetsOpen(false);}}>{p.name}</button>)}
          </div>
        </div>
        <button className="button-text" onClick={onOpenCurves}>自訂曲線</button>
        <button id="header-formula-btn" className="button-text" onClick={onOpenFormula}>公式說明</button>
        <button id="header-reset-btn" className="button-secondary" onClick={onReset}>重置</button>
      </nav>
    </div>
  </header>;
}
