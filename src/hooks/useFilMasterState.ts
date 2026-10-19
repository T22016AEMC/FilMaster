import {useMemo, useState} from 'react';
import type {
  MeasuredPoint,
  PresetScenario,
  ResinConfig,
  ResinType,
  SavedCalibratedCurve,
} from '../types';
import {RESIN_CONFIGS} from '../utils/resinConfigs';
import {
  generateCSV,
  generateCurvePoints,
  generateStructuredReport,
  runPrediction,
} from '../utils/meyerhofer';
import {getSavedCurves} from '../utils/customCurves';

// 預設（官方測試範例）：SOC、2000 RPM、30 s、1 個實測點 (8.0 wt%, 180 nm)、目標 220 nm
const DEFAULT_SPIN_SPEED = 2000;
const DEFAULT_SPIN_TIME = 30;

const officialExamplePoint = (id: string): MeasuredPoint => ({
  id,
  solidsContent: 8.0,
  thickness: 180.0,
  note: '官方測試範例 (8.0 wt% -> 180.000 nm)',
  spinSpeed: DEFAULT_SPIN_SPEED,
  spinTime: DEFAULT_SPIN_TIME,
});

/** 載入自訂曲線時：把其校正後的 C、α 固化為材料基準值 (C_0, α_0) */
function buildCustomBaselineResin(custom: SavedCalibratedCurve): ResinConfig {
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

/** App 的所有狀態、衍生計算與處理函式；App.tsx 只負責組合畫面 */
export function useFilMasterState() {
  const [selectedResin, setSelectedResin] = useState<ResinType>('SOC');
  const [spinSpeed, setSpinSpeed] = useState<number>(DEFAULT_SPIN_SPEED);
  const [spinTime, setSpinTime] = useState<number>(DEFAULT_SPIN_TIME);
  const [targetThickness, setTargetThickness] = useState<number>(220.0);
  const [tolerancePercent, setTolerancePercent] = useState<number>(5.0);
  const [measuredPoints, setMeasuredPoints] = useState<MeasuredPoint[]>([
    officialExamplePoint('pt-init-1'),
  ]);
  const [activePresetId, setActivePresetId] = useState<string>('test_soc_1pt');
  const [copied, setCopied] = useState<boolean>(false);
  const [isFormulaOpen, setIsFormulaOpen] = useState<boolean>(false);

  // Custom calibrated curves storage & active state
  const [savedCurves, setSavedCurves] = useState<SavedCalibratedCurve[]>(() => getSavedCurves());
  const [activeCustomCurveId, setActiveCustomCurveId] = useState<string | null>(null);
  const [isCurvesModalOpen, setIsCurvesModalOpen] = useState<boolean>(false);

  // Current resin configuration: if activeCustomCurveId is set, bake its calibrated C and alpha as the new baseline (C_0, alpha_0)
  const currentResin = useMemo<ResinConfig>(() => {
    if (activeCustomCurveId) {
      const custom = savedCurves.find(c => c.id === activeCustomCurveId);
      if (custom) return buildCustomBaselineResin(custom);
    }
    return RESIN_CONFIGS[selectedResin];
  }, [selectedResin, activeCustomCurveId, savedCurves]);

  // Run calculation and calibration engine
  const prediction = useMemo(
    () => runPrediction(currentResin, spinSpeed, spinTime, targetThickness, measuredPoints, tolerancePercent),
    [currentResin, spinSpeed, spinTime, targetThickness, measuredPoints, tolerancePercent],
  );

  const curvePoints = useMemo(() => generateCurvePoints(prediction), [prediction]);

  const activeCurveObj = savedCurves.find(c => c.id === activeCustomCurveId);

  // ---- 製程條件：手動修改後即不再對應任何預設情境 ----
  const handleSelectResin = (resin: ResinType) => {
    setSelectedResin(resin);
    setActiveCustomCurveId(null);
    setActivePresetId('');
  };
  const handleSpinSpeedChange = (spd: number) => {
    setSpinSpeed(spd);
    setActivePresetId('');
  };
  const handleSpinTimeChange = (t: number) => {
    setSpinTime(t);
    setActivePresetId('');
  };
  const handleTargetThicknessChange = (th: number) => {
    setTargetThickness(th);
    setActivePresetId('');
  };
  const handleTolerancePercentChange = (tol: number) => {
    setTolerancePercent(tol);
    setActivePresetId('');
  };
  const handleUpdatePoints = (pts: MeasuredPoint[]) => {
    setMeasuredPoints(pts);
    setActivePresetId('');
  };

  // ---- 預設情境與自訂曲線 ----
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
        spinSpeed: preset.spinSpeed,
        spinTime: preset.spinTime,
      })),
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
    setSpinSpeed(DEFAULT_SPIN_SPEED);
    setSpinTime(DEFAULT_SPIN_TIME);
    setTargetThickness(220.0);
    setTolerancePercent(5.0);
    setMeasuredPoints([officialExamplePoint('pt-reset-1')]);
    setActivePresetId('test_soc_1pt');
    setActiveCustomCurveId(null);
  };

  // ---- 匯出 ----
  const handleCopyReport = () => {
    const reportText = generateStructuredReport(prediction, curvePoints);
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCSV = () => {
    const csvContent = generateCSV(prediction, curvePoints);
    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `spin_coating_${selectedResin}_${spinSpeed}rpm_${targetThickness.toFixed(3)}nm.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    // 狀態
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
    // 衍生
    currentResin,
    prediction,
    curvePoints,
    // 處理函式
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
  };
}
