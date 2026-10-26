import type {EquipmentLimits} from '../types';
import {DEFAULT_EQUIPMENT_LIMITS} from './processSolver';

export const EQUIPMENT_STORAGE_KEY = 'filmaster_equipment_limits_v1';

export function isEquipmentLimits(value: unknown): value is EquipmentLimits {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const limits = value as EquipmentLimits;
  return [limits.minSpeed, limits.maxSpeed, limits.minTime, limits.maxTime]
    .every(v => typeof v === 'number' && Number.isFinite(v) && v > 0)
    && limits.minSpeed < limits.maxSpeed && limits.minTime < limits.maxTime;
}

export function getEquipmentLimits(): EquipmentLimits {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(EQUIPMENT_STORAGE_KEY) ?? 'null');
    if (isEquipmentLimits(parsed)) return parsed;
  } catch { /* 儲存空間受限或內容損毀時使用預設值。 */ }
  return {...DEFAULT_EQUIPMENT_LIMITS};
}

export function saveEquipmentLimits(limits: EquipmentLimits): boolean {
  if (!isEquipmentLimits(limits)) return false;
  try {
    localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(limits));
    return true;
  } catch {
    return false;
  }
}
