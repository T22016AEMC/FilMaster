import type {MeasuredPoint} from '../types';

export interface RSquaredDisplay {
  /** 顯示用文字：有效時為 4 位小數，否則為「不適用」 */
  text: string;
  /** R² 不適用時的簡短原因；有效時為 null */
  reason: string | null;
}

/**
 * 決定 R² 的顯示方式。
 * - R² 有值且實測點 ≥ 2：顯示數值
 * - 否則顯示「不適用」，原因依實測點數：
 *   0 點 →「理論模式」、1 點 →「單點校正」、≥ 2 點 →「未採用擬合」
 *   （≥ 2 點卻沒有 R² 時，必定伴隨 FIT_DEGENERATE 或 ALPHA_OUT_OF_RANGE 警告）
 *
 * 單點校正的舊資料可能存有 rSquared = 1，此處一律視為不適用。
 */
export function describeRSquared(rSquared: number | null, pointsCount: number): RSquaredDisplay {
  if (rSquared !== null && pointsCount >= 2) {
    return {text: rSquared.toFixed(4), reason: null};
  }
  const reason = pointsCount === 0 ? '理論模式' : pointsCount === 1 ? '單點校正' : '未採用擬合';
  return {text: '不適用', reason};
}

/** 實測點的量測條件文字，例如「2000 rpm / 30 s」；沒有記錄的舊資料顯示「—」 */
export function formatMeasureCondition(point: Pick<MeasuredPoint, 'spinSpeed' | 'spinTime'>): string {
  const {spinSpeed, spinTime} = point;
  if (spinSpeed === undefined && spinTime === undefined) return '—';
  return `${spinSpeed ?? '—'} rpm / ${spinTime ?? '—'} s`;
}
