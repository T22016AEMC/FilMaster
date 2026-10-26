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
    <div className="card space-y-5">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-50 " />
          <div>
            <h2 className="text-sm font-bold   text-slate-900 flex items-center gap-2 ">
              <Table className="w-4 h-4 text-blue-700" />
              04. 固含量對應膜厚數值表 (Formulation Data Points Table)
            </h2>
            <p className="text-xs text-slate-600 ">
              Discretized Formulation Curve Data for AI Analysis & Excel
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2  text-xs">
          <button
            id="btn-copy-structured-report"
            type="button"
            onClick={onCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-900 bg-slate-100 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-xs"
            title="複製符合規範之結構化文字報告"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-blue-700" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
            <span>{copied ? '已複製結構化報告' : '複製結構化報告'}</span>
          </button>

          <button
            id="btn-export-csv"
            type="button"
            onClick={onDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-900      rounded-lg transition-all "
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
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-600" />
          <input
            type="text"
            placeholder="搜尋固含量或膜厚..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 text-slate-600 focus:ring-1 focus:ring-blue-200 focus:border-blue-200"
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
              className="w-44 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs  text-blue-700 text-slate-600 focus:ring-1 focus:ring-blue-200 focus:border-blue-200"
            />
            <span className="absolute right-2 top-1.5 text-slate-600 text-xs">wt%</span>
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-100 text-slate-900 border border-slate-200 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 "
          >
            <Plus className="w-3.5 h-3.5 text-blue-700" />
            <span>插入點位</span>
          </button>
        </form>
      </div>

      {/* Data Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto shadow-sm">
        <table className="min-w-full divide-y divide-slate-800 text-xs">
          <thead className="bg-slate-50 text-slate-600  font-semibold sticky top-0 z-10 shadow-xs">
            <tr>
              <th className="px-4 py-2.5 text-left ">固含量 S (wt%)</th>
              <th className="px-4 py-2.5 text-right ">理論膜厚 (nm)</th>
              <th className="px-4 py-2.5 text-right  text-blue-700">校正後膜厚 (nm)</th>
              <th className="px-4 py-2.5 text-right ">偏差 Δh (nm)</th>
              <th className="px-4 py-2.5 text-right ">偏差幅度 (%)</th>
              <th className="px-4 py-2.5 text-center">目標鄰近標記</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-white">
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
                      ? 'bg-rose-50 text-rose-700 font-semibold'
                      : isCloseToTarget
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <td className="px-4 py-2  font-bold text-slate-900 flex items-center gap-1.5">
                    {pt.solidsContent.toFixed(4)}%
                    {isCloseToTarget && (
                      <span className="text-xs px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded font-sans font-medium">
                        目標區
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right  text-slate-600">
                    {pt.theoreticalThickness.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-right  font-bold text-blue-700">
                    {pt.calibratedThickness.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-right  text-slate-700">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium border ${
                        pt.diffNm > 0
                          ? 'text-blue-700 bg-blue-50 border-blue-200'
                          : pt.diffNm < 0
                          ? 'text-rose-700 bg-rose-50 border-rose-500'
                          : 'text-slate-600 bg-white border-slate-200'
                      }`}
                    >
                      {pt.diffNm >= 0 ? '+' : ''}
                      {pt.diffNm.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right ">
                    <span className="text-slate-700">
                      {pt.diffPercent >= 0 ? '+' : ''}
                      {pt.diffPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-xs ">
                    {isExactTarget ? (
                      <span className="font-bold text-rose-700">★ 標稱目標固含量</span>
                    ) : isCloseToTarget ? (
                      <span className="text-blue-700 font-medium">±5% 容許窗型內</span>
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
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 pt-1 ">
        <span>共計 {filteredPoints.length} 個採樣離散點 (間隔 0.5% ~ 20.0%)</span>
        <div className="flex items-center gap-3">
          <span>
            目標膜厚：<strong className="text-slate-900">{prediction.targetThickness.toFixed(3)} nm</strong>
          </span>
          <span>
            建議固含量：<strong className="text-blue-700">{prediction.recommendedSolids.toFixed(4)} wt%</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
