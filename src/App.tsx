import React, { useState, useMemo, useEffect } from 'react';
import { ResinType, MeasuredPoint, PresetScenario, SavedCalibratedCurve } from './types';
import { RESIN_CONFIGS, PRESET_SCENARIOS } from './utils/resinConfigs';
import { runPrediction, generateCurvePoints, generateStructuredReport, generateCSV } from './utils/meyerhofer';
import { getSavedCurves } from './utils/customCurves';
import { Header } from './components/Header';
import { ProcessInputs } from './components/ProcessInputs';
import { CalibrationManager } from './components/CalibrationManager';
import { PredictionSummary } from './components/PredictionSummary';
import { CurveChart } from './components/CurveChart';
import { SensitivityExplorer } from './components/SensitivityExplorer';
import { DataTableSection } from './components/DataTableSection';
import { FormulaModal } from './components/FormulaModal';
import { SavedCurvesModal } from './components/SavedCurvesModal';
import { Sparkles, BookmarkCheck } from 'lucide-react';

export default function App() {
  // Main state initialized with the prompt's official test case:
  // SOC, 2000 RPM, 30s, 1 measured point (8.0 wt%, 180 nm), target 220 nm
  const [selectedResin, setSelectedResin] = useState<ResinType>('SOC');
  const [spinSpeed, setSpinSpeed] = useState<number>(2000);
  const [spinTime, setSpinTime] = useState<number>(30);
  const [targetThickness, setTargetThickness] = useState<number>(220.0);
  const [tolerancePercent, setTolerancePercent] = useState<number>(5.0);
  const [measuredPoints, setMeasuredPoints] = useState<MeasuredPoint[]>([
    {
      id: 'pt-init-1',
      solidsContent: 8.0,
      thickness: 180.0,
      note: '官方測試範例 (8.0 wt% -> 180.000 nm)',
    },
  ]);
  const [activePresetId, setActivePresetId] = useState<string>('test_soc_1pt');
  const [copied, setCopied] = useState<boolean>(false);
  const [isFormulaOpen, setIsFormulaOpen] = useState<boolean>(false);

  // Custom calibrated curves storage & active state
  const [savedCurves, setSavedCurves] = useState<SavedCalibratedCurve[]>(() => getSavedCurves());
  const [activeCustomCurveId, setActiveCustomCurveId] = useState<string | null>(null);
  const [isCurvesModalOpen, setIsCurvesModalOpen] = useState<boolean>(false);

  // Expose measured points for snapshot saving
  useEffect(() => {
    (window as any).__lastMeasuredPoints = measuredPoints;
  }, [measuredPoints]);

  // Current resin configuration: if activeCustomCurveId is set, bake its calibrated C and alpha as the new baseline (C_0, alpha_0)
  const currentResin = useMemo(() => {
    if (activeCustomCurveId) {
      const custom = savedCurves.find(c => c.id === activeCustomCurveId);
      if (custom) {
        const base = RESIN_CONFIGS[custom.resinType];
        return {
          id: custom.resinType,
          name: custom.name,
          fullName: `${custom.name} (已固化自訂基本值)`,
          modelName: `${base.name} 機構流體模型 [自訂基準常數 C₀=${custom.calibratedC.toFixed(2)}, α₀=${custom.calibratedAlpha.toFixed(4)}]`,
          recommendedThicknessRange: base.recommendedThicknessRange,
          alpha: custom.calibratedAlpha, // Saved calibrated alpha becomes the new theoretical base alpha!
          beta: custom.beta,
          gamma: custom.gamma,
          defaultC: custom.calibratedC, // Saved calibrated C becomes the new theoretical base C_0!
          description: custom.description || `${base.name} 基底之已校正基準配方`,
          typicalSolvents: base.typicalSolvents,
          isCustomBaseline: true,
          customCurveId: custom.id,
        };
      }
    }
    return RESIN_CONFIGS[selectedResin];
  }, [selectedResin, activeCustomCurveId, savedCurves]);

  // Run calculation and calibration engine
  const prediction = useMemo(() => {
    return runPrediction(currentResin, spinSpeed, spinTime, targetThickness, measuredPoints, tolerancePercent);
  }, [currentResin, spinSpeed, spinTime, targetThickness, measuredPoints, tolerancePercent]);

  // Generate curve points
  const curvePoints = useMemo(() => {
    return generateCurvePoints(prediction);
  }, [prediction]);

  // Handlers for Presets and Custom Curves
  const handleSelectPreset = (preset: PresetScenario) => {
    setSelectedResin(preset.resinType);
    setSpinSpeed(preset.spinSpeed);
    setSpinTime(preset.spinTime);
    setTargetThickness(preset.targetThickness);
    if (preset.tolerancePercent) {
      setTolerancePercent(preset.tolerancePercent);
    }
    setMeasuredPoints(
      preset.measuredPoints.map((p, idx) => ({
        id: `preset-pt-${idx}-${Date.now()}`,
        solidsContent: p.solidsContent,
        thickness: p.thickness,
        note: p.note || `預設樣品 #${idx + 1}`,
      }))
    );
    setActivePresetId(preset.id);
    setActiveCustomCurveId(null);
  };

  const handleSelectCustomCurve = (curve: SavedCalibratedCurve) => {
    setSelectedResin(curve.resinType);
    setActiveCustomCurveId(curve.id);
    setSpinSpeed(curve.spinSpeed);
    setSpinTime(curve.spinTime);
    setTargetThickness(curve.targetThickness);
    if (curve.tolerancePercent) {
      setTolerancePercent(curve.tolerancePercent);
    }
    // CRITICAL: The calibrated values (C_cal, alpha_cal) from the saved curve are now baked into the material baseline (C_0, alpha_0).
    // Active measured points are reset to empty [] so that any subsequent new formula or sample inputs
    // can be calibrated freshly against this new baseline, WITHOUT being interfered with by old points.
    setMeasuredPoints([]);
    setActivePresetId('');
  };

  const handleReset = () => {
    setSelectedResin('SOC');
    setSpinSpeed(2000);
    setSpinTime(30);
    setTargetThickness(220.0);
    setTolerancePercent(5.0);
    setMeasuredPoints([
      {
        id: `pt-reset-1`,
        solidsContent: 8.0,
        thickness: 180.0,
        note: '官方測試範例 (8.0 wt% -> 180.000 nm)',
      },
    ]);
    setActivePresetId('test_soc_1pt');
    setActiveCustomCurveId(null);
  };

  const handleCopyReport = () => {
    const reportText = generateStructuredReport(prediction, curvePoints);
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCSV = () => {
    const csvContent = generateCSV(prediction, curvePoints);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `spin_coating_${selectedResin}_${spinSpeed}rpm_${targetThickness.toFixed(3)}nm.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeCurveObj = savedCurves.find(c => c.id === activeCustomCurveId);

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
              onSelectResin={resin => {
                setSelectedResin(resin);
                setActiveCustomCurveId(null);
                setActivePresetId('');
              }}
              savedCurves={savedCurves}
              activeCustomCurveId={activeCustomCurveId}
              onSelectCustomCurve={handleSelectCustomCurve}
              onOpenSaveCurveModal={() => setIsCurvesModalOpen(true)}
              onOpenManageCurvesModal={() => setIsCurvesModalOpen(true)}
              spinSpeed={spinSpeed}
              onSpinSpeedChange={spd => {
                setSpinSpeed(spd);
                setActivePresetId('');
              }}
              spinTime={spinTime}
              onSpinTimeChange={t => {
                setSpinTime(t);
                setActivePresetId('');
              }}
              targetThickness={targetThickness}
              onTargetThicknessChange={th => {
                setTargetThickness(th);
                setActivePresetId('');
              }}
              tolerancePercent={tolerancePercent}
              onTolerancePercentChange={tol => {
                setTolerancePercent(tol);
                setActivePresetId('');
              }}
            />

            <CalibrationManager
              measuredPoints={measuredPoints}
              onUpdatePoints={pts => {
                setMeasuredPoints(pts);
                setActivePresetId('');
              }}
              calibration={prediction.calibration}
              spinSpeed={spinSpeed}
              spinTime={spinTime}
              currentResin={currentResin}
            />
          </div>

          {/* Right Column: Prediction Summary & Interactive Curve Chart (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            <PredictionSummary
              prediction={prediction}
              onTolerancePercentChange={tol => {
                setTolerancePercent(tol);
                setActivePresetId('');
              }}
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
              FilmMaster Studio
            </span>
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
      />
    </div>
  );
}
