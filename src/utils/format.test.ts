import {describe, expect, it} from 'vitest';
import {describeRSquared, formatMeasureCondition} from './format';

describe('describeRSquared', () => {
  it('多點擬合有 R²：顯示 4 位小數、沒有原因', () => {
    expect(describeRSquared(0.99823, 4)).toEqual({text: '0.9982', reason: null});
    expect(describeRSquared(1, 2)).toEqual({text: '1.0000', reason: null});
  });

  it('0 點 →「不適用（理論模式）」', () => {
    expect(describeRSquared(null, 0)).toEqual({text: '不適用', reason: '理論模式'});
  });

  it('1 點 →「不適用（單點校正）」，即使舊資料存有 R² = 1', () => {
    expect(describeRSquared(null, 1)).toEqual({text: '不適用', reason: '單點校正'});
    expect(describeRSquared(1, 1)).toEqual({text: '不適用', reason: '單點校正'});
  });

  it('≥ 2 點但沒有 R² →「不適用（未採用擬合）」', () => {
    expect(describeRSquared(null, 2)).toEqual({text: '不適用', reason: '未採用擬合'});
    expect(describeRSquared(null, 5)).toEqual({text: '不適用', reason: '未採用擬合'});
  });
});

describe('formatMeasureCondition', () => {
  it('有轉速與時間', () => {
    expect(formatMeasureCondition({spinSpeed: 2000, spinTime: 30})).toBe('2000 rpm / 30 s');
  });
  it('舊資料沒有記錄：顯示「—」', () => {
    expect(formatMeasureCondition({})).toBe('—');
  });
  it('只記錄其中一項：缺少的以「—」表示', () => {
    expect(formatMeasureCondition({spinSpeed: 1500})).toBe('1500 rpm / — s');
    expect(formatMeasureCondition({spinTime: 20})).toBe('— rpm / 20 s');
  });
});
