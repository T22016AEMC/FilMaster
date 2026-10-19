import React, { useState } from 'react';
import { PredictionResult, CurvePoint } from '../types';
import { generateCurvePoints, generateStructuredReport, generateCSV, DEFAULT_SOLIDS_STEPS } from '../utils/meyerhofer';
import { Table, Copy, Check, Download, Plus, Search, Filter, Sparkles, FileSpreadsheet } from 'lucide-react';

interface DataTableSectionProps {
  prediction: PredictionResult;
  onCopyReport: () => void;
  onDownloadCSV: () => void;
  copied: boolean;
}

export const DataTableSection: React.FC<DataTableSectionProps> = ({
  prediction,
  onCopyReport,
  onDownloadCSV,
  copied,
}) => {
  const [customSolidsInput, setCustomSolidsInput] = useState<string>('');
  const [customSteps, setCustomSteps] = useState<number[]>(DEFAULT_SOLIDS_STEPS);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleAddCustomStep = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customSolidsInput);
    if (!isNaN(val) && val > 0 && val <= 60) {
      if (!customSteps.includes(val)) {
        setCustomSteps([...customSteps, val].sort((a, b) => a - b));
      }
      setCustomSolidsInput('');
    }
  };

  const curvePoints: CurvePoint[] = generateCurvePoints(prediction, customSteps);

  const filteredPoints = curvePoints.filter(pt =>
    searchTerm === ''
      ? true
      : pt.solidsContent.toString().includes(searchTerm) ||
        pt.calibratedThickness.toString().includes(searchTerm) ||
        pt.theoreticalThickness.toString().includes(searchTerm)
  );

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl shadow-black/50 border border-slate-800 p-5 space-y-4">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 font-mono">
              <Table className="w-4 h-4 text-cyan-400" />
              04. 固含量對應膜厚數值表 (Formulation Data Points Table)
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Discretized Formulation Curve Data for AI Analysis & Excel
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            id="btn-copy-structured-report"
            type="button"
            onClick={onCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shadow-xs"
            title="複製符合規範之結構化文字報告"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? '已複製結構化報告' : '複製結構化報告'}</span>
          </button>

          <button
            id="btn-export-csv"
            type="button"
            onClick={onDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            title="匯出為標準 CSV 檔案"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出 CSV 檔</span>
          </button>
        </div>
      </div>

      {/* Filter & Custom Add Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="搜尋固含量或膜厚..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
          />
        </div>

        {/* Add custom query solids point */}
        <form onSubmit={handleAddCustomStep} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              placeholder="新增自訂固含量 wt%"
              value={customSolidsInput}
              onChange={e => setCustomSolidsInput(e.target.value)}
              className="w-44 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
            />
            <span className="absolute right-2 top-1.5 text-slate-500 text-[10px]">wt%</span>
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 font-mono"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>插入點位</span>
          </button>
        </form>
      </div>

      {/* Data Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto shadow-inner">
        <table className="min-w-full divide-y divide-slate-800 text-xs">
          <thead className="bg-slate-950 text-slate-400 font-mono font-semibold sticky top-0 z-10 shadow-xs">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono">固含量 S (wt%)</th>
              <th className="px-4 py-2.5 text-right font-mono">理論膜厚 (nm)</th>
              <th className="px-4 py-2.5 text-right font-mono text-cyan-400">校正後膜厚 (nm)</th>
              <th className="px-4 py-2.5 text-right font-mono">偏差 Δh (nm)</th>
              <th className="px-4 py-2.5 text-right font-mono">偏差幅度 (%)</th>
              <th className="px-4 py-2.5 text-center">目標鄰近標記</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
            {filteredPoints.map((pt, idx) => {
              const isCloseToTarget =
                Math.abs(pt.solidsContent - prediction.recommendedSolids) < 0.6;
              const isExactTarget =
                Math.abs(pt.solidsContent - prediction.recommendedSolids) < 0.05;

              return (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    isExactTarget
                      ? 'bg-rose-950/40 text-rose-200 font-semibold'
                      : isCloseToTarget
                      ? 'bg-cyan-950/40 text-cyan-200'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-4 py-2 font-mono font-bold text-slate-200 flex items-center gap-1.5">
                    {pt.solidsContent.toFixed(4)}%
                    {isCloseToTarget && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-sans font-medium">
                        目標區
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-400">
                    {pt.theoreticalThickness.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-cyan-400">
                    {pt.calibratedThickness.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-300">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                        pt.diffNm > 0
                          ? 'text-emerald-300 bg-emerald-950/80 border-emerald-800/60'
                          : pt.diffNm < 0
                          ? 'text-rose-300 bg-rose-950/80 border-rose-800/60'
                          : 'text-slate-400 bg-slate-900 border-slate-800'
                      }`}
                    >
                      {pt.diffNm >= 0 ? '+' : ''}
                      {pt.diffNm.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    <span className="text-slate-300">
                      {pt.diffPercent >= 0 ? '+' : ''}
                      {pt.diffPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-[11px] font-mono">
                    {isExactTarget ? (
                      <span className="font-bold text-rose-400">★ 標稱目標固含量</span>
                    ) : isCloseToTarget ? (
                      <span className="text-cyan-400 font-medium">±5% 容許窗型內</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
        <span>共計 {filteredPoints.length} 個採樣離散點 (間隔 0.5% ~ 20.0%)</span>
        <div className="flex items-center gap-3">
          <span>
            目標膜厚：<strong className="text-slate-200">{prediction.targetThickness.toFixed(3)} nm</strong>
          </span>
          <span>
            建議固含量：<strong className="text-cyan-400">{prediction.recommendedSolids.toFixed(4)} wt%</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
