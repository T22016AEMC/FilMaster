import React, { useEffect, useState, useRef } from 'react';
import { SavedCalibratedCurve, ResinType, PredictionResult, MeasuredPoint } from '../types';
import { describeRSquared } from '../utils/format';
import { RESIN_CONFIGS } from '../utils/resinConfigs';
import {
  X,
  Save,
  Trash2,
  Check,
  Download,
  Upload,
  Layers,
  Sparkles,
  Calendar,
  Sliders,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  saveCurve,
  deleteCurve,
  exportCurvesAsJSON,
  importCurvesFromJSON,
  ImportSkippedItem,
} from '../utils/customCurves';

interface SavedCurvesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedCurves: SavedCalibratedCurve[];
  onUpdateSavedCurves: (curves: SavedCalibratedCurve[]) => void;
  onApplyCurve: (curve: SavedCalibratedCurve) => void;
  currentPrediction: PredictionResult;
  /** 目前畫面上的實測點；儲存校正曲線時一併存入 */
  measuredPoints: MeasuredPoint[];
  saveDisabled?: boolean;
}

export const SavedCurvesModal: React.FC<SavedCurvesModalProps> = ({
  isOpen,
  onClose,
  savedCurves,
  onUpdateSavedCurves,
  onApplyCurve,
  currentPrediction,
  measuredPoints,
  saveDisabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<'save_current' | 'manage_list'>('save_current');
  const [curveName, setCurveName] = useState<string>(
    `${currentPrediction.resin.name} 產線校正配方 (${new Date().toLocaleDateString('zh-TW')})`
  );
  const [description, setDescription] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ importedCount: number; skipped: ImportSkippedItem[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen && saveDisabled) setActiveTab('manage_list');
  }, [isOpen, saveDisabled]);

  if (!isOpen) return null;

  const { calibration, resin, spinSpeed, spinTime, targetThickness } = currentPrediction;

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!curveName.trim() || saveDisabled) return;

    const newCurve: SavedCalibratedCurve = {
      id: `curve-${Date.now()}`,
      name: curveName.trim(),
      resinType: resin.id,
      createdAt: new Date().toISOString().split('T')[0],
      description: description.trim() || `以 ${spinSpeed} RPM, ${spinTime} s, 目標膜厚 ${targetThickness.toFixed(3)} nm (容差 ±${currentPrediction.tolerancePercent.toFixed(1)}%) 校正儲存。`,
      spinSpeed,
      spinTime,
      targetThickness,
      tolerancePercent: currentPrediction.tolerancePercent,
      calibratedC: calibration.calibratedC,
      calibratedAlpha: calibration.calibratedAlpha,
      beta: calibration.beta,
      gamma: calibration.gamma,
      scaleFactor: calibration.scaleFactor,
      rSquared: calibration.rSquared,
      measuredPoints: currentPrediction.calibration.pointsCount > 0 ? measuredPoints : [],
    };

    const updated = saveCurve(newCurve);
    onUpdateSavedCurves(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveTab('manage_list');
    }, 1200);
  };

  const handleDelete = (id: string) => {
    const updated = deleteCurve(id);
    onUpdateSavedCurves(updated);
  };

  const handleExportAll = () => {
    const jsonStr = exportCurvesAsJSON(savedCurves);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spin_coating_calibrated_curves_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        const result = importCurvesFromJSON(content);
        onUpdateSavedCurves(result.curves);
        setImportResult({ importedCount: result.importedCount, skipped: result.skipped });
        setActiveTab('manage_list');
      } catch (err) {
        setImportError(err instanceof Error && err.message ? err.message : '匯入失敗');
        setActiveTab('manage_list'); // 錯誤訊息顯示在列表頁籤，需切換過去才看得到
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/25  flex items-center justify-center p-4">
      <div
        className="bg-white rounded-card max-w-2xl w-full shadow-sm shadow-black/80 border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-50 text-slate-900 px-8 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 ">
                材料基本值與校正庫管理 (Material Baselines & Custom Library)
              </h2>
              <p className="text-xs text-slate-600 ">
                將校正物理常數儲存為材料基本值 (C₀, α₀)。載入時自動作為乾淨基準，以利新配方輸入時再次獨立校正。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-50 border-b border-slate-200 px-8 pt-3 flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('save_current')}
              disabled={saveDisabled}
              title={saveDisabled ? '請在求固含量模式儲存' : undefined}
              className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all  ${
                activeTab === 'save_current'
                  ? 'border-blue-200 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>儲存當前為材料基本值</span>
            </button>
            <button
              onClick={() => setActiveTab('manage_list')}
              className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all  ${
                activeTab === 'manage_list'
                  ? 'border-blue-200 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>已存材料基本值列表 ({savedCurves.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors "
              title="從 JSON 檔案匯入校正曲線"
            >
              <Upload className="w-3.5 h-3.5 text-blue-700" />
              <span>匯入 JSON</span>
            </button>
            <button
              type="button"
              onClick={handleExportAll}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors "
              title="備份所有自訂曲線為 JSON"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>匯出備份</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Save Current Formulation */}
        {activeTab === 'save_current' && (
          <div className="p-8 overflow-y-auto space-y-5 flex-1 bg-white">
            {/* Snapshot of Current Calibration */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 ">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-700" />
                  當前校正狀態快照 (Current Live Snapshot)
                </span>
                <span className=" text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {calibration.modeLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs ">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-600 text-xs">基底材料類別</div>
                  <div className="font-bold text-slate-900 mt-0.5">{resin.name} ({resin.id})</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-600 text-xs">製程條件</div>
                  <div className=" font-bold text-slate-900 mt-0.5">{spinSpeed} RPM / {spinTime}s</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-600 text-xs">校正係數 C_cal</div>
                  <div className=" font-bold text-blue-700 mt-0.5">{calibration.calibratedC.toFixed(2)}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-600 text-xs">固含量指數 α_cal</div>
                  <div className=" font-bold text-blue-700 mt-0.5">{calibration.calibratedAlpha.toFixed(4)}</div>
                </div>
              </div>

              <div className="text-xs text-slate-600  flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <span>目標膜厚: <strong className="text-slate-900">{targetThickness.toFixed(3)} nm</strong></span>
                <span>建議固含量: <strong className="text-blue-700">{currentPrediction.recommendedSolids.toFixed(4)} wt%</strong></span>
                <span>實測點數: <strong className="text-blue-700">{calibration.pointsCount} 點</strong></span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCurrent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ">
                  自訂曲線名稱 (Curve Profile Name) <span className="text-rose-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={curveName}
                  onChange={e => setCurveName(e.target.value)}
                  placeholder="例如: SOC 產線批次 Lot-A (2000RPM 已校正)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 text-slate-600 focus:ring-2 focus:ring-blue-200 focus:border-blue-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ">
                  備註與機台說明 (Optional Note / Description)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="例如: TEL Clean Track 3號機台專用參數，實測 8.0 wt% 膜厚 180.000 nm"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 text-slate-600 focus:ring-2 focus:ring-blue-200 focus:border-blue-200"
                />
              </div>

              {saveSuccess && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium flex items-center gap-2 animate-in fade-in ">
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  <span>已成功儲存為材料基本值！已加入材料選單，載入時將以此為乾淨基準以利二次校正。</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-100 rounded-lg transition-colors "
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saveSuccess || saveDisabled}
                  className="px-5 py-2 text-xs font-bold text-slate-900      rounded-lg  transition-all flex items-center gap-1.5 "
                >
                  <Save className="w-4 h-4" />
                  <span>{saveSuccess ? '儲存成功' : '確認存為材料基本值'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Manage Saved Curves List */}
        {activeTab === 'manage_list' && (
          <div className="p-8 overflow-y-auto space-y-4 flex-1 bg-white">
            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-500 rounded-lg text-xs text-rose-700 flex items-center gap-2 ">
                <AlertCircle className="w-4 h-4 text-rose-700" />
                <span>{importError}</span>
              </div>
            )}

            {importResult && (
              <div
                id="import-result"
                className={`p-3 rounded-lg text-xs space-y-1.5  border ${
                  importResult.importedCount > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>成功匯入 {importResult.importedCount} 筆</span>
                </div>
                {importResult.skipped.length > 0 && (
                  <div className="text-amber-700 space-y-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>略過 {importResult.skipped.length} 筆：</span>
                    </div>
                    <ul className="list-disc pl-8 space-y-0.5">
                      {importResult.skipped.map(item => (
                        <li key={item.index}>
                          {item.name ? `「${item.name}」` : `第 ${item.index + 1} 筆`}：{item.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {savedCurves.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-600 space-y-2 ">
                <Layers className="w-8 h-8 mx-auto text-slate-600" />
                <p className="font-semibold text-slate-700">目前尚無已儲存的自訂校正曲線</p>
                <p className="text-slate-600">請切換至「儲存當前為材料基本值」頁籤將當前製程校正數據儲存。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedCurves.map(curve => {
                  const baseResin = RESIN_CONFIGS[curve.resinType];
                  return (
                    <div
                      key={curve.id}
                      className="bg-slate-50 border border-slate-200 hover:border-blue-200 rounded-xl p-4 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 ">{curve.name}</span>
                          <span className="px-2 py-0.5 rounded text-xs  font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {curve.resinType} ({baseResin?.name || curve.resinType})
                          </span>
                        </div>

                        {curve.description && (
                          <p className="text-xs text-slate-600">{curve.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs  text-slate-600 pt-1">
                          <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                            ω={curve.spinSpeed} RPM, t={curve.spinTime}s
                          </span>
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                            C_cal: {curve.calibratedC.toFixed(2)}
                          </span>
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                            α_cal: {curve.calibratedAlpha.toFixed(4)}
                          </span>
                          {(() => {
                            const r2 = describeRSquared(curve.rSquared, curve.measuredPoints?.length ?? 0);
                            return r2.reason === null ? (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                R²={r2.text}
                              </span>
                            ) : (
                              <span className="bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                R²={r2.text}（{r2.reason}）
                              </span>
                            );
                          })()}
                          <span className="text-slate-600 text-xs">
                            {curve.createdAt}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ">
                        <button
                          type="button"
                          onClick={() => {
                            onApplyCurve(curve);
                            onClose();
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-slate-900      rounded-lg transition-all flex items-center gap-1 "
                          title="載入此材料之校正常數作為基本值，並清空實測點位以利二次校正"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>載入為基本值</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(curve.id)}
                          className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-500"
                          title="刪除此自訂材料基本值"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-8 py-3 flex items-center justify-between text-xs text-slate-600 ">
          <span>支援隨機存取、JSON 格式無縫匯出/匯入</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
