import React from 'react';
import { Cpu, Sparkles, BookOpen, Download, Copy, Check, RotateCcw, Activity } from 'lucide-react';
import { PRESET_SCENARIOS } from '../utils/resinConfigs';
import { PresetScenario } from '../types';

interface HeaderProps {
  onSelectPreset: (preset: PresetScenario) => void;
  activePresetId?: string;
  onOpenFormula: () => void;
  onCopyReport: () => void;
  onDownloadCSV: () => void;
  copied: boolean;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectPreset,
  activePresetId,
  onOpenFormula,
  onCopyReport,
  onDownloadCSV,
  copied,
  onReset,
}) => {
  return (
    <header className="bg-slate-50  border-b border-blue-200 text-slate-900 sticky top-0 z-40 shadow-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="absolute -inset-0.5    rounded-xl  opacity-60 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative h-10 w-10 rounded-xl bg-white border border-blue-200 flex items-center justify-center shadow-sm">
                <Cpu className="h-5 w-5 text-blue-700 " />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-lg font-extrabold        flex items-center gap-2 ">
                  FilMaster
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200  tracking-normal ">
                    PRO v{__APP_VERSION__}
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-600  flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-blue-700 inline" />
                Semiconductor Spin Coating & Thickness Formulation Predictor
              </p>
            </div>
          </div>

          {/* Actions & Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets Dropdown */}
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-1 text-xs shadow-sm overflow-x-auto max-w-full">
              <span className="px-2 text-slate-600 font-medium flex items-center gap-1 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">情境預設:</span>
              </span>
              {PRESET_SCENARIOS.map(p => (
                <button
                  key={p.id}
                  id={`preset-btn-${p.id}`}
                  onClick={() => onSelectPreset(p)}
                  className={`px-2.5 py-1 rounded text-xs transition-all  font-medium whitespace-nowrap shrink-0 ${
                    activePresetId === p.id
                      ? 'bg-blue-50 text-slate-600 font-bold '
                      : 'text-slate-700 hover:text-blue-700 hover:bg-slate-100'
                  }`}
                  title={p.description}
                >
                  {p.tag}
                </button>
              ))}
            </div>

            {/* Utility Buttons */}
            <button
              id="header-formula-btn"
              onClick={onOpenFormula}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-100 border border-slate-200 hover:border-blue-200 rounded-lg transition-all"
              title="查看物理數學模型與常數定義"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-700" />
              <span>模型原理</span>
            </button>

            <button
              id="header-copy-report-btn"
              onClick={onCopyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-200 rounded-lg transition-colors"
              title="複製結構化報告"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-blue-700" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copied ? '已複製' : '報告'}</span>
            </button>

            <button
              id="header-download-csv-btn"
              onClick={onDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600      rounded-lg  transition-all"
              title="下載完整 CSV 曲線數據點"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出 CSV</span>
            </button>

            <button
              id="header-reset-btn"
              onClick={onReset}
              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="重設為官方標準參數"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
