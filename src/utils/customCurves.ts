import { SavedCalibratedCurve, ResinType, MeasuredPoint, CalibrationResult } from '../types';
import { RESIN_CONFIGS } from './resinConfigs';

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

export interface ImportSkippedItem {
  index: number; // 該筆在匯入陣列中的位置（從 0 開始）
  name?: string;
  reason: string;
}

export interface ImportCurvesResult {
  curves: SavedCalibratedCurve[];
  importedCount: number;
  skipped: ImportSkippedItem[];
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPositive = (v: unknown): v is number => isFiniteNumber(v) && v > 0;

/** 驗證匯入的單筆曲線；合格回傳 null，不合格回傳原因 */
function validateImportedCurve(item: unknown): string | null {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    return '不是有效的曲線物件';
  }
  const c = item as Record<string, unknown>;

  if (typeof c.name !== 'string' || c.name.trim() === '') {
    return 'name 必須為非空字串';
  }
  if (
    typeof c.resinType !== 'string' ||
    !Object.prototype.hasOwnProperty.call(RESIN_CONFIGS, c.resinType)
  ) {
    return `resinType 不是支援的樹脂類別${typeof c.resinType === 'string' ? `：${c.resinType}` : ''}`;
  }
  for (const key of ['spinSpeed', 'spinTime', 'targetThickness', 'calibratedC', 'calibratedAlpha']) {
    if (!isPositive(c[key])) return `${key} 必須為大於 0 的有限數值`;
  }
  for (const key of ['beta', 'gamma']) {
    if (!isFiniteNumber(c[key]) || (c[key] as number) < 0) {
      return `${key} 必須為大於或等於 0 的有限數值`;
    }
  }
  if (c.measuredPoints !== undefined) {
    if (!Array.isArray(c.measuredPoints)) return 'measuredPoints 必須為陣列';
    for (let i = 0; i < c.measuredPoints.length; i++) {
      const p = c.measuredPoints[i];
      if (p === null || typeof p !== 'object') return `measuredPoints[${i}] 不是有效的實測點物件`;
      const pt = p as Record<string, unknown>;
      if (!isPositive(pt.solidsContent)) return `measuredPoints[${i}].solidsContent 必須為大於 0 的有限數值`;
      if (!isPositive(pt.thickness)) return `measuredPoints[${i}].thickness 必須為大於 0 的有限數值`;
      for (const key of ['spinSpeed', 'spinTime']) {
        if (pt[key] !== undefined && !isPositive(pt[key])) {
          return `measuredPoints[${i}].${key} 若有提供，必須為大於 0 的有限數值`;
        }
      }
    }
  }
  return null;
}

export function importCurvesFromJSON(jsonString: string): ImportCurvesResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('檔案不是有效的 JSON 格式');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('JSON 內容必須是校正曲線陣列');
  }

  const current = getSavedCurves();
  const existingIds = new Set(current.map(c => c.id));
  const accepted: SavedCalibratedCurve[] = [];
  const skipped: ImportSkippedItem[] = [];

  parsed.forEach((item: unknown, index: number) => {
    const reason = validateImportedCurve(item);
    if (reason) {
      const name = (item as {name?: unknown} | null)?.name;
      skipped.push({index, ...(typeof name === 'string' ? {name} : {}), reason});
      return;
    }
    const raw = item as SavedCalibratedCurve;
    const hasUsableId = typeof raw.id === 'string' && raw.id !== '' && !existingIds.has(raw.id);
    const id = hasUsableId ? raw.id : `imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    existingIds.add(id);
    accepted.push({
      ...raw,
      id,
      // 補齊舊檔或手寫檔可能缺少的欄位，避免介面讀到 undefined
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString().split('T')[0],
      scaleFactor: isFiniteNumber(raw.scaleFactor)
        ? raw.scaleFactor
        : raw.calibratedC / RESIN_CONFIGS[raw.resinType].defaultC,
      rSquared: isFiniteNumber(raw.rSquared) ? raw.rSquared : null,
      measuredPoints: raw.measuredPoints ?? [],
    });
  });

  const importedCount = accepted.length;
  // 與原版一致：後匯入的排在最前面
  const merged = importedCount > 0 ? [...accepted.reverse(), ...current] : current;
  if (importedCount > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
  return {curves: merged, importedCount, skipped};
}
