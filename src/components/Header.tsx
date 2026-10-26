import {useState} from 'react';
import {Cpu} from 'lucide-react';
import {PRESET_SCENARIOS} from '../utils/resinConfigs';
import type {PresetScenario} from '../types';

export function Header({onSelectPreset, activePresetId, onOpenFormula, onOpenCurves, onReset}: {
  onSelectPreset: (preset: PresetScenario) => void; activePresetId?: string;
  onOpenFormula: () => void; onOpenCurves: () => void; onReset: () => void;
}) {
  const [presetsOpen, setPresetsOpen] = useState(false);
  return <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-wrap justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <span data-testid="header-logo" aria-hidden="true" className="h-10 w-10 shrink-0 rounded-xl border border-blue-200 bg-blue-50 flex items-center justify-center">
          <Cpu size={20} className="h-5 w-5 text-blue-700" aria-hidden="true" />
        </span>
        <div className="flex items-baseline gap-3"><h1 className="text-xl font-bold tracking-tight">FilMaster</h1><span className="text-xs text-slate-600">v{__APP_VERSION__}</span></div>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="次要操作">
        <div className="relative">
          <button className="button-secondary" aria-expanded={presetsOpen} onClick={() => setPresetsOpen(!presetsOpen)}>預設情境</button>
          <div hidden={!presetsOpen} className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] card z-40 space-y-1">
            {PRESET_SCENARIOS.map(p => <button id={`preset-btn-${p.id}`} key={p.id} title={p.description}
              className={`block w-full rounded-lg p-2 text-left text-sm hover:bg-blue-50 ${activePresetId === p.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
              onClick={() => {onSelectPreset(p); setPresetsOpen(false);}}>{p.name}</button>)}
          </div>
        </div>
        <button className="button-secondary" onClick={onOpenCurves}>自訂曲線</button>
        <button id="header-formula-btn" className="button-secondary" onClick={onOpenFormula}>公式說明</button>
        <button id="header-reset-btn" className="button-secondary" onClick={onReset}>重置</button>
      </nav>
    </div>
  </header>;
}
