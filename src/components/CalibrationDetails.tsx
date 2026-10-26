import type {CalibrationResult, ProcessConditions} from '../types';
import {describeRSquared} from '../utils/format';

export function CalibrationDetails({calibration: c, reference}: {calibration: CalibrationResult; reference?: ProcessConditions | null}) {
  const r2 = describeRSquared(c.rSquared, c.pointsCount);
  return <details className="card"><summary>校正參數詳情</summary>
    <p className="text-sm text-slate-600 mt-4">{c.modeLabel}</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
      {[
        ['比例係數 C', c.calibratedC.toFixed(3)], ['固含量指數 α', c.calibratedAlpha.toFixed(4)],
        ['轉速指數 β', c.beta.toFixed(2)], ['時間指數 γ', c.gamma.toFixed(2)], ['縮放倍率', c.scaleFactor.toFixed(4)],
      ].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-600">{label}</div><div className="font-mono mt-1">{value}</div></div>)}
      <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-600">決定係數 R²</div><div className="font-mono mt-1">{r2.text}</div><div className="text-xs text-slate-600 mt-1">{r2.reason ?? '最小平方擬合度'}</div></div>
    </div>
    {reference && <p className="text-xs text-slate-600 mt-3">校正參考條件：{reference.spinSpeed} rpm / {reference.spinTime} s</p>}
    <p className="text-xs text-slate-600 mt-3">基準 C = {c.theoreticalC.toFixed(3)}；基準 α = {c.theoreticalAlpha.toFixed(4)}</p>
  </details>;
}
