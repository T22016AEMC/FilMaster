// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {EQUIPMENT_STORAGE_KEY, getEquipmentLimits, isEquipmentLimits, saveEquipmentLimits} from './equipmentLimits';
import {DEFAULT_EQUIPMENT_LIMITS} from './processSolver';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe('設備界限驗證與儲存', () => {
  it('沒有設定時使用預設', () => expect(getEquipmentLimits()).toEqual(DEFAULT_EQUIPMENT_LIMITS));
  it('有效設定可讀寫', () => {
    const limits = {...DEFAULT_EQUIPMENT_LIMITS, minSpeed: 250};
    expect(saveEquipmentLimits(limits)).toBe(true);
    expect(getEquipmentLimits()).toEqual(limits);
  });
  it.each([null, [], {}, 'bad', {...DEFAULT_EQUIPMENT_LIMITS, minSpeed: 0},
    {...DEFAULT_EQUIPMENT_LIMITS, minTime: -1}, {...DEFAULT_EQUIPMENT_LIMITS, maxTime: Infinity},
    {...DEFAULT_EQUIPMENT_LIMITS, maxSpeed: NaN}, {...DEFAULT_EQUIPMENT_LIMITS, minSpeed: 6000},
    {...DEFAULT_EQUIPMENT_LIMITS, minTime: 121}, {...DEFAULT_EQUIPMENT_LIMITS, minTime: '5'}])(
    '無效設定 %j 使用預設', value => {
      expect(isEquipmentLimits(value)).toBe(false);
      localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(value));
      expect(getEquipmentLimits()).toEqual(DEFAULT_EQUIPMENT_LIMITS);
    });
  it('損毀 JSON 使用預設', () => {
    localStorage.setItem(EQUIPMENT_STORAGE_KEY, '{broken');
    expect(getEquipmentLimits()).toEqual(DEFAULT_EQUIPMENT_LIMITS);
  });
  it('存取被拒絕時不丟例外', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {throw new Error('denied');});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {throw new Error('denied');});
    expect(getEquipmentLimits()).toEqual(DEFAULT_EQUIPMENT_LIMITS);
    expect(saveEquipmentLimits(DEFAULT_EQUIPMENT_LIMITS)).toBe(false);
  });
  it('不儲存無效設定', () => {
    expect(saveEquipmentLimits({...DEFAULT_EQUIPMENT_LIMITS, minTime: 200})).toBe(false);
    expect(localStorage.getItem(EQUIPMENT_STORAGE_KEY)).toBeNull();
  });
});
