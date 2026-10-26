import type {ProcessPredictionResult} from '../types';
import {describeRSquared} from './format';
import {generateProcessCurvePoints} from './processSolver';

export const PROCESS_EXPONENT_HINT = 'β、γ 為材料預設值，未經實測校正；換條件的預測精度取決於這兩個指數。';

export function generateProcessReport(result: ProcessPredictionResult): string {
  const c = result.calibration;
  const limits = result.equipmentLimits;
  const speed = result.mode === 'solve_speed';
  const unit = speed ? 'rpm' : 's';
  const number = (v: number | null) => v === null ? '無法求解' : `${v.toFixed(3)} ${unit}`;
  const r2 = describeRSquared(c.rSquared, c.pointsCount);
  const reference = result.referenceConditions;
  return `【FilMaster 求製程報告】
材料：${result.resin.name} (${result.resin.id})
模式：${speed ? '求轉速（時間固定）' : '求時間（轉速固定）'}
固定固含量：${result.solids.toFixed(4)} wt%
固定${speed ? '時間' : '轉速'}：${speed ? result.fixedTime : result.fixedSpeed} ${speed ? 's' : 'rpm'}
目標膜厚：${result.targetThickness.toFixed(3)} nm
容差：±${result.tolerancePercent.toFixed(1)}%
膜厚範圍：${result.lowerThickness.toFixed(3)} ～ ${result.upperThickness.toFixed(3)} nm
建議值：${number(result.recommended)}
容差範圍：${number(result.rangeMin)} ～ ${number(result.rangeMax)}
校正模式：${c.modeLabel}
C：${c.calibratedC.toFixed(3)}，α：${c.calibratedAlpha.toFixed(6)}，β：${c.beta}，γ：${c.gamma}
點數：${c.pointsCount}，縮放倍率：${c.scaleFactor.toFixed(6)}，R²：${r2.text}${r2.reason ? `（${r2.reason}）` : ''}
參考條件：${reference ? `${reference.spinSpeed} rpm / ${reference.spinTime} s` : '無（理論模式）'}
設備轉速範圍：${limits.minSpeed} ～ ${limits.maxSpeed} rpm
設備時間範圍：${limits.minTime} ～ ${limits.maxTime} s
${PROCESS_EXPONENT_HINT}
警告：${result.warnings.length ? '\n' + result.warnings.map(w => `- ${w.message}`).join('\n') : '無'}
`;
}

export function generateProcessCSV(result: ProcessPredictionResult): string {
  // 所有文字加引號並跳脫，避免材料名稱與警告中的逗號破壞 CSV 欄位。
  const quote = (text: string) => `"${text.replaceAll('"', '""')}"`;
  const meta = generateProcessReport(result).trim().split('\n').map(line => `# ${quote(line)}`).join('\n');
  const header = result.mode === 'solve_speed' ? 'SpinSpeed_rpm,Thickness_nm' : 'SpinTime_s,Thickness_nm';
  return `${meta}\n${header}\n${generateProcessCurvePoints(result).map(p => `${p.x.toFixed(3)},${p.thickness.toFixed(3)}`).join('\n')}\n`;
}
