import { Header } from './components/Header';
import { ProcessInputs } from './components/ProcessInputs';
import { CalibrationManager } from './components/CalibrationManager';
import { PredictionSummary } from './components/PredictionSummary';
import { WarningPanel } from './components/WarningPanel';
import { CurveChart } from './components/CurveChart';
import { SensitivityExplorer } from './components/SensitivityExplorer';
import { DataTableSection } from './components/DataTableSection';
import { FormulaModal } from './components/FormulaModal';
import { SavedCurvesModal } from './components/SavedCurvesModal';
import { useFilMasterState } from './hooks/useFilMasterState';
import { Sparkles, BookmarkCheck, AlertTriangle } from 'lucide-react';

export default function App() {
  const state = useFilMasterState();
  const {
    selectedResin,
    spinSpeed,
    spinTime,
    targetThickness,
    tolerancePercent,
    measuredPoints,
    activePresetId,
    copied,
    isFormulaOpen,
    setIsFormulaOpen,
    savedCurves,
    setSavedCurves,
    activeCustomCurveId,
    activeCurveObj,
    isCurvesModalOpen,
    setIsCurvesModalOpen,
    currentResin,
    prediction,
    handleSelectResin,
    handleSpinSpeedChange,
    handleSpinTimeChange,
    handleTargetThicknessChange,
    handleTolerancePercentChange,
    handleUpdatePoints,
    handleSelectPreset,
    handleSelectCustomCurve,
    handleReset,
    handleCopyReport,
    handleDownloadCSV,
  } = state;

  return (
    <div className="min-h-screen tech-grid-bg text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation & Controls */}
      <Header
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
        onOpenFormula={() => setIsFormulaOpen(true)}
        onCopyReport={handleCopyReport}
        onDownloadCSV={handleDownloadCSV}
        copied={copied}
        onReset={handleReset}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick Context & Status Banner - Dark Tech Style */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-3.5 border border-cyan-900/40 shadow-xl shadow-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-700/60 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
              {activeCurveObj ? <BookmarkCheck className="w-4 h-4 text-cyan-400" /> : <Sparkles className="w-4 h-4 text-cyan-400" />}
            </span>
            <div>
              <span className="font-semibold text-slate-200">
                {activeCurveObj ? (
                  <span className="text-cyan-300 font-bold">已載入自訂材料基本值：{activeCurveObj.name}</span>
                ) : (
                  <span>當前製程配方: <span className="text-cyan-300 font-medium">{currentResin.name}</span> ({currentResin.modelName})</span>
                )}
              </span>
              <span className="text-slate-400 ml-2 font-mono text-[11px]">
                ω=<span className="text-cyan-400">{spinSpeed}</span> RPM | t=<span className="text-cyan-400">{spinTime}</span>s | 目標膜厚=<span className="text-cyan-300 font-bold">{targetThickness.toFixed(3)}</span> nm
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            {prediction.warnings.length > 0 && (
              <span
                id="status-warning-badge"
                className="px-2 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold flex items-center gap-1"
                title={prediction.warnings.map(w => w.message).join('；')}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>警告 {prediction.warnings.length}</span>
              </span>
            )}
            <span className="px-2.5 py-1 rounded bg-slate-950/90 border border-cyan-500/40 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              S_target = {prediction.recommendedSolids.toFixed(4)} wt%
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 font-medium" title={`±${prediction.tolerancePercent.toFixed(1)}% 容許固含量範圍`}>
              ±{prediction.tolerancePercent.toFixed(1)}% 窗型: [{prediction.lowerSolids.toFixed(4)} ~ {prediction.upperSolids.toFixed(4)} wt%]
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Inputs & Calibration (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            <ProcessInputs
              selectedResin={selectedResin}
              onSelectResin={handleSelectResin}
              savedCurves={savedCurves}
              activeCustomCurveId={activeCustomCurveId}
              onSelectCustomCurve={handleSelectCustomCurve}
              onOpenSaveCurveModal={() => setIsCurvesModalOpen(true)}
              onOpenManageCurvesModal={() => setIsCurvesModalOpen(true)}
              spinSpeed={spinSpeed}
              onSpinSpeedChange={handleSpinSpeedChange}
              spinTime={spinTime}
              onSpinTimeChange={handleSpinTimeChange}
              targetThickness={targetThickness}
              onTargetThicknessChange={handleTargetThicknessChange}
              tolerancePercent={tolerancePercent}
              onTolerancePercentChange={handleTolerancePercentChange}
            />

            <CalibrationManager
              measuredPoints={measuredPoints}
              onUpdatePoints={handleUpdatePoints}
              calibration={prediction.calibration}
              spinSpeed={spinSpeed}
              spinTime={spinTime}
              currentResin={currentResin}
            />
          </div>

          {/* Right Column: Prediction Summary & Interactive Curve Chart (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            <WarningPanel warnings={prediction.warnings} />

            <PredictionSummary
              prediction={prediction}
              onTolerancePercentChange={handleTolerancePercentChange}
            />

            <CurveChart prediction={prediction} measuredPoints={measuredPoints} />
          </div>
        </div>

        {/* Coater Sensitivity & Process Window */}
        <SensitivityExplorer prediction={prediction} />

        {/* Data Table with Export & Copy */}
        <DataTableSection
          prediction={prediction}
          onCopyReport={handleCopyReport}
          onDownloadCSV={handleDownloadCSV}
          copied={copied}
        />
      </main>

      {/* Footer - Dark Tech Style */}
      <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 text-xs py-5 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-200">
              FilMaster
            </span>
            <span id="app-version" className="text-cyan-400/90">v{__APP_VERSION__}</span>
            <span>•</span>
            <span className="text-slate-400">Semiconductor Hydrodynamics Meyerhofer Engine</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span className="text-cyan-400/90">EUV / ArF / KrF / SOC Architecture</span>
            <span>•</span>
            <button
              onClick={() => setIsFormulaOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 underline font-medium transition-colors"
            >
              物理常數與演算法說明
            </button>
          </div>
        </div>
      </footer>

      {/* Educational & Mathematical Physics Modal */}
      <FormulaModal isOpen={isFormulaOpen} onClose={() => setIsFormulaOpen(false)} />

      {/* Saved Calibrated Curves Management Modal */}
      <SavedCurvesModal
        isOpen={isCurvesModalOpen}
        onClose={() => setIsCurvesModalOpen(false)}
        savedCurves={savedCurves}
        onUpdateSavedCurves={curves => setSavedCurves(curves)}
        onApplyCurve={handleSelectCustomCurve}
        currentPrediction={prediction}
        measuredPoints={measuredPoints}
      />
    </div>
  );
}
