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
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-cyan-900/40 text-white sticky top-0 z-40 shadow-2xl shadow-cyan-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative h-10 w-10 rounded-xl bg-slate-900 border border-cyan-500/50 flex items-center justify-center shadow-inner">
                <Cpu className="h-5 w-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent flex items-center gap-2 font-mono">
                  FilMaster
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-mono tracking-normal shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    PRO v{__APP_VERSION__}
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-cyan-400 inline" />
                Semiconductor Spin Coating & Thickness Formulation Predictor
              </p>
            </div>
          </div>

          {/* Actions & Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets Dropdown */}
            <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-xs shadow-inner overflow-x-auto max-w-full">
              <span className="px-2 text-slate-400 font-medium flex items-center gap-1 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">情境預設:</span>
              </span>
              {PRESET_SCENARIOS.map(p => (
                <button
                  key={p.id}
                  id={`preset-btn-${p.id}`}
                  onClick={() => onSelectPreset(p)}
                  className={`px-2.5 py-1 rounded text-xs transition-all font-mono font-medium whitespace-nowrap shrink-0 ${
                    activePresetId === p.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                      : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800'
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-lg transition-all"
              title="查看物理數學模型與常數定義"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>模型原理</span>
            </button>

            <button
              id="header-copy-report-btn"
              onClick={onCopyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
              title="複製結構化報告"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? '已複製' : '報告'}</span>
            </button>

            <button
              id="header-download-csv-btn"
              onClick={onDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
              title="下載完整 CSV 曲線數據點"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出 CSV</span>
            </button>

            <button
              id="header-reset-btn"
              onClick={onReset}
              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
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
