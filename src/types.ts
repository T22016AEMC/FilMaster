export type ResinType =
  | 'EUV'
  | 'ArF'
  | 'KrF'
  | 'BARC'
  | 'SOC'
  | 'THICK_500_1000'
  | 'THICK_1000_5000'
  | 'THICK_2000_20000';

export interface ResinConfig {
  id: ResinType;
  name: string;
  fullName: string;
  modelName: string;
  recommendedThicknessRange: [number, number]; // in nm [min, max]
  alpha: number; // solids content exponent
  beta: number;  // spin speed exponent
  gamma: number; // spin time exponent
  defaultC: number; // default proportionality constant C
  description: string;
  typicalSolvents: string[];
  isCustomBaseline?: boolean;
  customCurveId?: string;
}

export interface MeasuredPoint {
  id: string;
  solidsContent: number; // wt%
  thickness: number;     // nm
  note?: string;
  spinSpeed?: number;    // RPM，記錄該點的實測轉速（選填，計算目前不使用）
  spinTime?: number;     // s，記錄該點的實測旋塗時間（選填，計算目前不使用）
}

export type WarningCode =
  | 'ALPHA_OUT_OF_RANGE'
  | 'FIT_DEGENERATE'
  | 'PROCESS_OUT_OF_RANGE'
  | 'PROCESS_UNSOLVABLE'
  | 'POINT_CONDITIONS_ASSUMED'
  | 'POINT_CONDITIONS_MISSING'
  | 'SOLIDS_OUT_OF_RANGE';

export interface PredictionWarning {
  code: WarningCode;
  message: string; // 繁體中文，說明發生什麼事與程式如何處理
  field?: string;  // 相關欄位名稱
  value?: number;  // 相關數值
}

export type CalibrationMode = 'theoretical' | 'single_point_shift' | 'multi_point_lsq';

export interface CalibrationResult {
  mode: CalibrationMode;
  modeLabel: string;
  theoreticalC: number;
  calibratedC: number;
  theoreticalAlpha: number;
  calibratedAlpha: number;
  beta: number;
  gamma: number;
  scaleFactor: number;
  rSquared: number | null; // 僅多點擬合有意義；0 點、1 點或無法擬合時為 null
  pointsCount: number;
  fittedAlpha: number | null; // 多點擬合實際算出的斜率；未擬合時為 null
  warnings: PredictionWarning[];
}

export interface PredictionResult {
  targetThickness: number; // nm
  recommendedSolids: number; // wt%
  tolerancePercent: number; // % (0.1 ~ 10.0%)
  lowerThickness: number; // nm (-tolerance%)
  lowerSolids: number;    // wt%
  upperThickness: number; // nm (+tolerance%)
  upperSolids: number;    // wt%
  spinSpeed: number;      // RPM
  spinTime: number;       // s
  calibration: CalibrationResult;
  resin: ResinConfig;
  warnings: PredictionWarning[]; // calibration 的警告加上反算階段的警告
}

export interface CurvePoint {
  solidsContent: number; // wt%
  theoreticalThickness: number; // nm
  calibratedThickness: number;  // nm
  diffNm: number;
  diffPercent: number;
}

export interface PresetScenario {
  id: string;
  name: string;
  tag: string;
  resinType: ResinType;
  spinSpeed: number;
  spinTime: number;
  targetThickness: number;
  tolerancePercent?: number;
  measuredPoints: Array<{ solidsContent: number; thickness: number; note?: string }>;
  description: string;
}

export interface SavedCalibratedCurve {
  id: string;
  name: string;
  resinType: ResinType;
  createdAt: string;
  description?: string;
  spinSpeed: number;
  spinTime: number;
  targetThickness: number;
  tolerancePercent?: number;
  calibratedC: number;
  calibratedAlpha: number;
  beta: number;
  gamma: number;
  scaleFactor: number;
  rSquared: number | null;
  measuredPoints: MeasuredPoint[];
}

export type ProcessSolveMode = 'solve_speed' | 'solve_time';

export interface ProcessConditions {
  spinSpeed: number; // rpm
  spinTime: number;  // s
}

export interface EquipmentLimits {
  minSpeed: number;
  maxSpeed: number;
  minTime: number;
  maxTime: number;
}

export interface ProcessSolveParams {
  solids: number; // wt%
  targetThickness: number; // nm
  tolerancePercent?: number;
  fixedTime?: number;  // solve_speed 使用
  fixedSpeed?: number; // solve_time 使用
  measuredPoints: MeasuredPoint[];
  fallbackConditions?: ProcessConditions;
  limits?: Partial<EquipmentLimits>;
}

export interface ProcessSolveResult {
  mode: ProcessSolveMode;
  solids: number;
  targetThickness: number;
  tolerancePercent: number;
  lowerThickness: number;
  upperThickness: number;
  fixedSpeed?: number;
  fixedTime?: number;
  recommended: number | null;
  rangeMin: number | null; // 對應 upperThickness
  rangeMax: number | null; // 對應 lowerThickness
  calibration: CalibrationResult;
  referenceConditions: ProcessConditions | null;
  warnings: PredictionWarning[];
  exponentsCalibrated: false; // β、γ 維持材料預設值
}
