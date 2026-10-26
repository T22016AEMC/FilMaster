import {Header} from './components/Header';
import {ProcessInputs} from './components/ProcessInputs';
import {CalibrationManager} from './components/CalibrationManager';
import {FitQualityPanel} from './components/FitQualityPanel';
import {PredictionSummary} from './components/PredictionSummary';
import {CalibrationDetails} from './components/CalibrationDetails';
import {WarningPanel} from './components/WarningPanel';
import {CurveChart} from './components/CurveChart';
import {ProcessCurveChart} from './components/ProcessCurveChart';
import {EquipmentSettings} from './components/EquipmentSettings';
import {SensitivityExplorer} from './components/SensitivityExplorer';
import {DataTableSection} from './components/DataTableSection';
import {FormulaModal} from './components/FormulaModal';
import {SavedCurvesModal} from './components/SavedCurvesModal';
import {useFilMasterState} from './hooks/useFilMasterState';
import {generateProcessCurvePoints} from './utils/processSolver';

export default function App() {
  const s = useFilMasterState();
  const process = s.calculationMode === 'solve_process';
  const result = process ? s.processPrediction : s.prediction;
  const sensitivityPrediction = process ? {...s.prediction,
    recommendedSolids: s.fixedSolids, calibration: s.processPrediction.calibration,
    spinSpeed: s.processSolveMode === 'solve_speed' ? s.processPrediction.recommended ?? s.spinSpeed : s.spinSpeed,
    spinTime: s.processSolveMode === 'solve_time' ? s.processPrediction.recommended ?? s.spinTime : s.spinTime,
  } : s.prediction;
  return <div className="min-h-screen flex flex-col bg-page text-slate-900">
    <Header onSelectPreset={s.handleSelectPreset} activePresetId={s.activePresetId}
      onOpenFormula={() => s.setIsFormulaOpen(true)} onOpenCurves={() => s.setIsCurvesModalOpen(true)} onReset={s.handleReset} />
    <main className="workspace flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 space-y-7">
      <div className="mode-card flex flex-wrap items-center justify-between gap-4">
        <div className="segmented" role="group" aria-label="計算模式">
          <button className="segment" aria-pressed={!process} onClick={() => s.setCalculationMode('solve_solids')}>求固含量</button>
          <button className="segment" aria-pressed={process} onClick={() => s.setCalculationMode('solve_process')}>求製程</button>
        </div>
        <p className="text-sm text-slate-600">{process ? '固定固含量，求達到目標膜厚的轉速或時間' : '固定轉速與時間，求達到目標膜厚的固含量'}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] gap-7 items-start">
        <div className="space-y-7">
          <ProcessInputs selectedResin={s.selectedResin} onSelectResin={s.handleSelectResin}
            savedCurves={s.savedCurves} activeCustomCurveId={s.activeCustomCurveId} onSelectCustomCurve={s.handleSelectCustomCurve}
            onOpenSaveCurveModal={() => s.setIsCurvesModalOpen(true)} onOpenManageCurvesModal={() => s.setIsCurvesModalOpen(true)}
            spinSpeed={s.spinSpeed} onSpinSpeedChange={s.handleSpinSpeedChange} spinTime={s.spinTime} onSpinTimeChange={s.handleSpinTimeChange}
            targetThickness={s.targetThickness} onTargetThicknessChange={s.handleTargetThicknessChange}
            tolerancePercent={s.tolerancePercent} onTolerancePercentChange={s.handleTolerancePercentChange}
            calculationMode={s.calculationMode} processSolveMode={s.processSolveMode} onProcessSolveModeChange={s.setProcessSolveMode}
            fixedSolids={s.fixedSolids} onFixedSolidsChange={s.setFixedSolids} />
          <CalibrationManager key={`${s.calculationMode}-${s.processSolveMode}`} measuredPoints={s.measuredPoints} onUpdatePoints={s.handleUpdatePoints}
            calibration={result.calibration} spinSpeed={s.spinSpeed} spinTime={s.spinTime} currentResin={s.currentResin}
            unknownCondition={process ? s.processSolveMode : undefined} />
          <FitQualityPanel resin={s.currentResin} calibration={result.calibration} measuredPoints={s.measuredPoints}
            fallbackConditions={{spinSpeed: s.spinSpeed, spinTime: s.spinTime}} />
          {process && <EquipmentSettings limits={s.equipmentLimits} onChange={s.handleEquipmentLimitsChange}
            onReset={s.resetEquipmentLimits} storageError={s.equipmentStorageError} />}
        </div>
        <div className="space-y-7 min-w-0">
          {result.warnings.length > 0 && <div id="status-warning-badge" className="text-xs text-amber-800">警告 {result.warnings.length}</div>}
          <WarningPanel warnings={result.warnings} />
          <PredictionSummary prediction={s.prediction} processResult={process ? s.processPrediction : undefined}
            onCopyReport={s.handleCopyReport} onDownloadCSV={s.handleDownloadCSV} copied={s.copied} />
          {process ? <ProcessCurveChart result={s.processPrediction} /> : <CurveChart prediction={s.prediction} measuredPoints={s.measuredPoints} />}
          <CalibrationDetails calibration={result.calibration} reference={process ? s.processPrediction.referenceConditions : undefined} />
          <details className="card"><summary>敏感度分析</summary>
            {process && s.processPrediction.recommended === null ? <p className="mt-4 text-sm text-slate-600">無法求解，請先確認輸入條件。</p>
              : <div className="mt-4"><SensitivityExplorer prediction={sensitivityPrediction} /></div>}
          </details>
          <details className="card"><summary>數據表</summary><div className="mt-4">
            {process ? <div className="max-h-96 overflow-auto"><table className="w-full text-sm text-right">
              <thead><tr><th className="p-2">{s.processSolveMode === 'solve_speed' ? '轉速（rpm）' : '時間（s）'}</th><th className="p-2">膜厚（nm）</th></tr></thead>
              <tbody>{generateProcessCurvePoints(s.processPrediction).map(point => <tr className="border-t border-slate-100 font-mono" key={point.x}>
                <td className="p-2">{point.x.toFixed(3)}</td><td className="p-2">{point.thickness.toFixed(3)}</td>
              </tr>)}</tbody>
            </table></div> : <DataTableSection prediction={s.prediction} onCopyReport={s.handleCopyReport} onDownloadCSV={s.handleDownloadCSV} copied={s.copied} />}
          </div></details>
        </div>
      </div>
    </main>
    <footer className="border-t border-slate-200 bg-white mt-6 py-5 text-xs text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap justify-between gap-3">
        <div className="flex gap-2"><span>FilMaster</span><span id="app-version">v{__APP_VERSION__}</span></div>
        <button onClick={() => s.setIsFormulaOpen(true)} className="text-blue-700">物理常數與演算法說明</button>
      </div>
    </footer>
    <FormulaModal isOpen={s.isFormulaOpen} onClose={() => s.setIsFormulaOpen(false)} />
    <SavedCurvesModal isOpen={s.isCurvesModalOpen} onClose={() => s.setIsCurvesModalOpen(false)} savedCurves={s.savedCurves}
      onUpdateSavedCurves={s.setSavedCurves} onApplyCurve={s.handleSelectCustomCurve} currentPrediction={s.prediction}
      measuredPoints={s.measuredPoints} saveDisabled={process} />
  </div>;
}
