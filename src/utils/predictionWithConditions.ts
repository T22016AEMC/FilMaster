import type {MeasuredPoint, PredictionResult, ResinConfig} from '../types';
import {calibrateModel, predictionFromCalibration} from './meyerhofer';
import {normalizeMeasuredPoints} from './processSolver';

/** 依各點自己的量測條件校正；舊資料以畫面製程條件補足。 */
export function runPredictionWithConditions(
  resin: ResinConfig,
  spinSpeed: number,
  spinTime: number,
  targetThickness: number,
  measuredPoints: MeasuredPoint[],
  tolerancePercent: number = 5.0
): PredictionResult {
  const normalized = normalizeMeasuredPoints(resin, measuredPoints, {spinSpeed, spinTime});
  const reference = normalized.referenceConditions;
  const calibration = calibrateModel(resin, reference?.spinSpeed ?? spinSpeed,
    reference?.spinTime ?? spinTime, normalized.normalizedPoints);
  const prediction = predictionFromCalibration(resin, spinSpeed, spinTime,
    targetThickness, calibration, tolerancePercent);
  return {...prediction, warnings: [...normalized.warnings, ...prediction.warnings]};
}
