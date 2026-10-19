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
  rSquared: number | null; // For >= 2 points
  pointsCount: number;
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
