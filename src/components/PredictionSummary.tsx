import type {PredictionResult, ProcessPredictionResult} from '../types';
import {PROCESS_EXPONENT_HINT} from '../utils/reportProcess';

export function PredictionSummary({prediction, processResult, onCopyReport, onDownloadCSV, copied}: {
  prediction: PredictionResult; processResult?: ProcessPredictionResult;
  onCopyReport: () => void; onDownloadCSV: () => void; copied: boolean;
}) {
  const result = processResult ?? prediction;
  const speed = processResult?.mode === 'solve_speed';
  const value = processResult ? processResult.recommended : prediction.recommendedSolids;
  const unit = processResult ? (speed ? 'rpm' : 's') : 'wt%';
  const label = processResult ? (speed ? '建議轉速' : '建議時間') : '建議固含量';
  const number = (n: number | null, digits: number) => n === null ? '—' : n.toFixed(digits);
  const digits = processResult ? (speed ? 0 : 1) : 4;
  const min = processResult ? processResult.rangeMin : prediction.lowerSolids;
  const max = processResult ? processResult.rangeMax : prediction.upperSolids;
  return <section className="card space-y-5" aria-label="預測結果">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-medium text-slate-600">{label}</h2>
        <div aria-label={label} className="mt-2 flex items-baseline gap-2">
          <strong className="result-number font-semibold tracking-tight font-mono">{value === null ? '無法求解' : number(value, digits)}</strong>
          {value !== null && <span className="text-lg text-slate-600">{unit}</span>}
          {!processResult && prediction.warnings.some(w => w.code === 'SOLIDS_OUT_OF_RANGE') && <span role="img" aria-label="固含量超出合理範圍" className="text-amber-700">⚠</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <button className="button-secondary" onClick={onCopyReport}>{copied ? '已複製' : '複製報告'}</button>
        <button className="button-secondary" onClick={onDownloadCSV}>下載 CSV</button>
      </div>
    </div>
    {value === null ? <p className="text-sm text-amber-800">{result.warnings.find(w => w.code === 'PROCESS_UNSOLVABLE')?.message ?? '請檢查輸入與校正參數。'}</p> : <div className="result-window space-y-1">
      <p className="text-sm text-blue-900">±{result.tolerancePercent.toFixed(1)}% 容差範圍：<span className="font-mono font-semibold">{number(min, processResult ? 3 : 4)} ～ {number(max, processResult ? 3 : 4)}</span> {unit}</p>
      <p className="text-xs text-slate-600">膜厚 {result.lowerThickness.toFixed(3)} ～ {result.upperThickness.toFixed(3)} nm
        {processResult ? '（較厚膜對應製程下界，較薄膜對應製程上界）' : ''}</p>
    </div>}
    {processResult && <p className="text-xs leading-relaxed text-slate-600">{PROCESS_EXPONENT_HINT}</p>}
  </section>;
}
