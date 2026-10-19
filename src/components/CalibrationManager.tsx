import React, { useState } from 'react';
import { MeasuredPoint, CalibrationResult, ResinConfig } from '../types';
import { Plus, Trash2, Sliders, CheckCircle, RefreshCw, HelpCircle, FileText, Sparkles, RotateCcw, BookmarkCheck } from 'lucide-react';
import { calculateThickness } from '../utils/meyerhofer';
import { describeRSquared, formatMeasureCondition } from '../utils/format';

interface CalibrationManagerProps {
  measuredPoints: MeasuredPoint[];
  onUpdatePoints: (points: MeasuredPoint[]) => void;
  calibration: CalibrationResult;
  spinSpeed: number;
  spinTime: number;
  currentResin?: ResinConfig;
}

export const CalibrationManager: React.FC<CalibrationManagerProps> = ({
  measuredPoints,
  onUpdatePoints,
  calibration,
  spinSpeed,
  spinTime,
  currentResin,
}) => {
  const [newSolids, setNewSolids] = useState<string>('');
  const [newThickness, setNewThickness] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');

  const isCustomBase = !!currentResin?.isCustomBaseline;

  const handleAddPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseFloat(newSolids);
    const h = parseFloat(newThickness);
    if (!isNaN(s) && s > 0 && !isNaN(h) && h > 0) {
      const newPoint: MeasuredPoint = {
        id: `point-${Date.now()}`,
        solidsContent: s,
        thickness: h,
        note: newNote.trim() || `新配方樣品 #${measuredPoints.length + 1}`,
        spinSpeed,
        spinTime,
      };
      onUpdatePoints([...measuredPoints, newPoint]);
      setNewSolids('');
      setNewThickness('');
      setNewNote('');
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
        spinSpeed,
        spinTime,
      },
    ]);
  };

  const handleLoadMultiPointDemo = () => {
    onUpdatePoints([
      { id: 'm-1', solidsContent: 5.0, thickness: 85.0, note: '低濃度批次 (5.0 wt%)', spinSpeed, spinTime },
      { id: 'm-2', solidsContent: 8.0, thickness: 182.0, note: '標稱批次 (8.0 wt%)', spinSpeed, spinTime },
      { id: 'm-3', solidsContent: 10.0, thickness: 260.0, note: '中高濃度 (10.0 wt%)', spinSpeed, spinTime },
      { id: 'm-4', solidsContent: 12.0, thickness: 350.0, note: '高膜厚驗證 (12.0 wt%)', spinSpeed, spinTime },
    ]);
  };

  // Get badge styling based on calibration mode
  const getModeBadge = () => {
    if (calibration.mode === 'theoretical') {
      if (isCustomBase) {
        return {
          bg: 'bg-cyan-950/70 text-cyan-200 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
          dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]',
          title: '已套用自訂材料基本值 (0 實測點基準狀態)',
          desc: `採用「${currentResin?.name}」固化之基本常數 (C₀=${currentResin?.defaultC.toFixed(2)}, α₀=${currentResin?.alpha.toFixed(4)})。點位已歸零為基本值，輸入新樣品可直接二次校正。`,
        };
      }
      return {
        bg: 'bg-slate-950/70 text-slate-300 border-slate-800',
        dot: 'bg-slate-500',
        title: '理論預設模式 (0 數據點)',
        desc: '未提供實測數據，系統依據文獻及該樹脂類型之理論物理常數進行預測。',
      };
    } else if (calibration.mode === 'single_point_shift') {
      return {
        bg: 'bg-blue-950/70 text-blue-200 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
        dot: 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]',
        title: isCustomBase ? '二次單點平移校正 (1 數據點)' : '單點乘法平移校正 (1 數據點)',
        desc: `比例縮放因子 Scale = ${calibration.scaleFactor.toFixed(4)}，曲線已精確平移通過新實測點（基準 C₀: ${calibration.theoreticalC.toFixed(2)} → 校正 C_cal: ${calibration.calibratedC.toFixed(2)}）。`,
      };
    } else {
      return {
        bg: 'bg-emerald-950/70 text-emerald-200 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
        dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
        title: isCustomBase ? `二次多點最小平方法擬合 (${calibration.pointsCount} 數據點)` : `多點最小平方法擬合 (${calibration.pointsCount} 數據點)`,
        desc: `Least Squares 回歸最佳化指數 α = ${calibration.calibratedAlpha.toFixed(4)}，決定係數 R² = ${
          rSquaredDisplay.reason === null ? rSquaredDisplay.text : `${rSquaredDisplay.text} (${rSquaredDisplay.reason})`
        }`,
      };
    }
  };

  const modeBadge = getModeBadge();
  const rSquaredDisplay = describeRSquared(calibration.rSquared, calibration.pointsCount);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl shadow-black/50 border border-slate-800 p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono flex items-center gap-2">
            <span>02. 實驗實測數據校正機制</span>
            <span className="text-xs text-slate-500 font-normal hidden sm:inline">(Calibration)</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadOfficialTestExample}
            className="text-[11px] font-medium text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 px-2 py-1 rounded-lg border border-cyan-600/40 transition-colors flex items-center gap-1 shadow-sm font-mono"
            title="載入題目測試範例: 8.0 wt% -> 180.000 nm"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            1 點測試範例 (8.0 wt%, 180 nm)
          </button>
          <button
            type="button"
            onClick={handleLoadMultiPointDemo}
            className="text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 transition-colors font-mono"
            title="載入 4 組實測濃度多點擬合"
          >
            多點擬合範例
          </button>
        </div>
      </div>

      {/* Calibration Status Alert */}
      <div className={`p-3.5 rounded-xl border ${modeBadge.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs`}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${modeBadge.dot}`} />
            <span>{modeBadge.title}</span>
          </div>
          <p className="opacity-90 font-medium text-[11px]">{modeBadge.desc}</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <span className="bg-slate-950/80 text-cyan-300 px-2.5 py-1 rounded-md border border-cyan-800/60 font-semibold shadow-xs">
            C_cal: {calibration.calibratedC.toFixed(2)}
          </span>
          <span className="bg-slate-950/80 text-cyan-300 px-2.5 py-1 rounded-md border border-cyan-800/60 font-semibold shadow-xs">
            α_cal: {calibration.calibratedAlpha.toFixed(4)}
          </span>
          {rSquaredDisplay.reason === null ? (
            <span className="bg-emerald-950/90 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/50 font-semibold shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              R²: {rSquaredDisplay.text}
            </span>
          ) : (
            <span className="bg-slate-950/80 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700 font-semibold">
              R²: {rSquaredDisplay.text}（{rSquaredDisplay.reason}）
            </span>
          )}
        </div>
      </div>

      {/* Add New Measured Point Form */}
      <form onSubmit={handleAddPoint} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2 shadow-inner">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5 font-mono">
            <span>新增實測數據點 (Add New Data Point)</span>
            {isCustomBase && (
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-600/50 px-1.5 py-0.5 rounded font-normal">
                二次校正
              </span>
            )}
          </span>
          <span className="text-[11px] text-slate-500 font-normal">
            輸入特定固含量在相同條件下測得之膜厚
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          <div className="sm:col-span-3 relative">
            <input
              id="input-new-solids"
              type="number"
              step="0.0001"
              min="0.1"
              max="70"
              placeholder="固含量 S (wt%)"
              value={newSolids}
              onChange={e => setNewSolids(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-cyan-300 placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
              required
            />
            <span className="absolute right-2 top-1.5 text-slate-500 text-[10px] pointer-events-none">wt%</span>
          </div>

          <div className="sm:col-span-3 relative">
            <input
              id="input-new-thickness"
              type="number"
              step="0.001"
              min="0.1"
              max="50000"
              placeholder="實測膜厚 h (nm)"
              value={newThickness}
              onChange={e => setNewThickness(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-cyan-300 placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
              required
            />
            <span className="absolute right-2 top-1.5 text-slate-500 text-[10px] pointer-events-none">nm</span>
          </div>

          <div className="sm:col-span-4">
            <input
              id="input-new-note"
              type="text"
              placeholder="樣品備註 (如: Lot-2026B)"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              id="btn-add-point"
              type="submit"
              className="w-full px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>加入校正</span>
            </button>
          </div>
        </div>
      </form>

      {/* Measured Points Table */}
      {measuredPoints.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>目前已匯入 <strong className="text-cyan-400">{measuredPoints.length}</strong> 組新實驗點</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
              title="清空所有實測點位，回到材料基本值模型"
            >
              <RotateCcw className="w-3 h-3" />
              重設點位為基本值 (清空新實測點)
            </button>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">序號</th>
                  <th className="px-3 py-2 text-right">實測固含量 (wt%)</th>
                  <th className="px-3 py-2 text-right">實測膜厚 (nm)</th>
                  <th className="px-3 py-2 text-right">模型預測值 (nm)</th>
                  <th className="px-3 py-2 text-right">殘差 (Residual)</th>
                  <th className="px-3 py-2 text-left">樣品備註</th>
                  <th className="px-3 py-2 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {measuredPoints.map((pt, idx) => {
                  const modelPred = calculateThickness(
                    pt.solidsContent,
                    spinSpeed,
                    spinTime,
                    calibration.calibratedC,
                    calibration.calibratedAlpha,
                    calibration.beta,
                    calibration.gamma
                  );
                  const residual = pt.thickness - modelPred;
                  const residualPercent = modelPred > 0 ? (residual / modelPred) * 100 : 0;

                  return (
                    <tr key={pt.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 py-2 font-mono text-slate-500">#{idx + 1}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-200">
                        {pt.solidsContent.toFixed(4)} %
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-cyan-400">
                        {pt.thickness.toFixed(3)} nm
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-400">
                        {modelPred.toFixed(3)} nm
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                            Math.abs(residual) < 1.0
                              ? 'text-emerald-300 bg-emerald-950/80 border-emerald-700/50'
                              : 'text-amber-300 bg-amber-950/80 border-amber-700/50'
                          }`}
                        >
                          {residual >= 0 ? '+' : ''}
                          {residual.toFixed(3)} nm ({residualPercent >= 0 ? '+' : ''}
                          {residualPercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400 max-w-[160px]">
                        <div className="truncate">{pt.note || '—'}</div>
                        <div className="text-[10px] text-slate-500 font-mono" title="此點的量測條件（僅記錄，不參與計算）">
                          {formatMeasureCondition(pt)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePoint(pt.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-rose-950/50"
                          title="刪除此點"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 px-3 bg-slate-950/50 border border-dashed border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
          {isCustomBase ? (
            <>
              <p className="font-semibold text-cyan-300 flex items-center justify-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-cyan-400" />
                已套用「{currentResin?.name}」自訂材料基本值
              </p>
              <p className="text-[11px] text-slate-400">
                目前點位處於乾淨基準狀態 (C₀ = <span className="text-cyan-400">{currentResin?.defaultC.toFixed(2)}</span>, α₀ = <span className="text-cyan-400">{currentResin?.alpha.toFixed(4)}</span>)。
              </p>
              <p className="text-[11px] text-cyan-400 font-medium">
                若有新配方或新批次實驗數據，可直接在上方輸入進行二次校正，完全避免舊點位干擾！
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-slate-300">目前為「0 數據點理論推算模式」</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                若產線已有樣品實測膜厚，可於上方輸入 1 組數據平移校正，或輸入 2 組以上進行迴歸擬合。
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
