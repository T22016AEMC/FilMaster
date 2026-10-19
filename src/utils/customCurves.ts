import { SavedCalibratedCurve, ResinType, MeasuredPoint, CalibrationResult } from '../types';

const STORAGE_KEY = 'spin_coating_custom_calibrated_curves_v2';

export const DEFAULT_INITIAL_SAVED_CURVES: SavedCalibratedCurve[] = [
  {
    id: 'custom-curve-soc-lot-a',
    name: 'SOC 產線批次 Lot-A (1點實測校正)',
    resinType: 'SOC',
    createdAt: '2026-08-20',
    description: '標準 2000 RPM, 30s 旋塗條件，以 8.0 wt% (180.000 nm) 單點平移校正後之曲線。',
    spinSpeed: 2000,
    spinTime: 30,
    targetThickness: 220.0,
    calibratedC: 84.12,
    calibratedAlpha: 1.45,
    beta: 0.48,
    gamma: 0.18,
    scaleFactor: 0.9896,
    rSquared: 1.0,
    measuredPoints: [
      { id: 'p-soc-1', solidsContent: 8.0, thickness: 180.0, note: 'Lot-A 標稱樣品' },
    ],
  },
  {
    id: 'custom-curve-arf-multi',
    name: 'ArF 浸潤式 193nm 驗證配方 (4點最小平方法)',
    resinType: 'ArF',
    createdAt: '2026-08-24',
    description: 'ArF 浸潤式光阻多濃度樣品擬合，指數 α 優化至 1.3450，R²=0.9982。',
    spinSpeed: 1800,
    spinTime: 30,
    targetThickness: 90.0,
    calibratedC: 108.45,
    calibratedAlpha: 1.345,
    beta: 0.50,
    gamma: 0.20,
    scaleFactor: 0.985,
    rSquared: 0.9982,
    measuredPoints: [
      { id: 'p-arf-1', solidsContent: 5.0, thickness: 60.5, note: '濃度 5%' },
      { id: 'p-arf-2', solidsContent: 6.5, thickness: 82.0, note: '標稱 6.5%' },
      { id: 'p-arf-3', solidsContent: 8.0, thickness: 108.2, note: '濃度 8%' },
      { id: 'p-arf-4', solidsContent: 10.0, thickness: 145.0, note: '濃度 10%' },
    ],
  },
];

export function getSavedCurves(): SavedCalibratedCurve[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed default initial curves
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_SAVED_CURVES));
      return DEFAULT_INITIAL_SAVED_CURVES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_INITIAL_SAVED_CURVES;
  } catch (e) {
    console.error('Failed to load saved curves from localStorage', e);
    return DEFAULT_INITIAL_SAVED_CURVES;
  }
}

export function saveCurve(curve: SavedCalibratedCurve): SavedCalibratedCurve[] {
  const current = getSavedCurves();
  const index = current.findIndex(c => c.id === curve.id);
  let updated: SavedCalibratedCurve[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = curve;
  } else {
    updated = [curve, ...current];
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save curve to localStorage', e);
  }
  return updated;
}

export function deleteCurve(id: string): SavedCalibratedCurve[] {
  const current = getSavedCurves();
  const updated = current.filter(c => c.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete curve from localStorage', e);
  }
  return updated;
}

export function exportCurvesAsJSON(curves: SavedCalibratedCurve[]): string {
  return JSON.stringify(curves, null, 2);
}

export function importCurvesFromJSON(jsonString: string): SavedCalibratedCurve[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('匯入之 JSON 格式必須為校正曲線陣列');
    }
    const current = getSavedCurves();
    const existingIds = new Set(current.map(c => c.id));
    const merged = [...current];
    for (const item of parsed) {
      if (item.name && item.resinType) {
        if (!item.id || existingIds.has(item.id)) {
          item.id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        }
        merged.unshift(item);
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    throw new Error('匯入失敗：請確認 JSON 檔案格式是否正確。');
  }
}
