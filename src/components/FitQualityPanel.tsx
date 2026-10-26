import {useState} from 'react';
import {CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis} from 'recharts';
import type {CalibrationResult, MeasuredPoint, ProcessConditions, ResinConfig} from '../types';
import {calculateFitQuality} from '../utils/fitQuality';

export function FitQualityPanel({resin, calibration, measuredPoints, fallbackConditions}: {
  resin: ResinConfig; calibration: CalibrationResult; measuredPoints: MeasuredPoint[];
  fallbackConditions: ProcessConditions;
}) {
  const [open, setOpen] = useState(false);
  const quality = calculateFitQuality(resin, calibration, measuredPoints, fallbackConditions);
  const format = (value: number | null) => value === null ? '—' : Number(value.toFixed(3)).toFixed(3);
  const maxPointIndex = quality.points.findIndex(point => point.id === quality.maxErrorPointId);
  return <details className="card" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>擬合品質</summary>
    <section className="mt-4 space-y-4" aria-label="擬合品質內容">
      {quality.reason && <p className="text-sm text-slate-600">{quality.reason}</p>}
      {!quality.notApplicable && <>
        <p className="text-xs leading-relaxed text-slate-700">
          RMSE：<span className="font-mono">{format(quality.rmse)} nm</span> · 平均絕對誤差：<span className="font-mono">{format(quality.meanAbsoluteErrorPercent)}%</span> · 最大絕對誤差：<span className="font-mono">{format(quality.maxAbsoluteErrorPercent)}%</span>（實測點 {maxPointIndex + 1}）
        </p>
        <p className="text-xs text-slate-600">殘差 = 預測 − 實測；淡藍色列表示絕對殘差超過 5%。各點以自己的量測條件計算。</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-xs text-right" aria-label="實測點殘差表">
            <thead className="border-b border-slate-200 text-slate-600"><tr>
              {['實測點', 'S（wt%）', 'ω（rpm）', 't（s）', '實測（nm）', '預測（nm）', '殘差（nm）', '殘差（%）']
                .map(label => <th scope="col" className="p-2 font-medium" key={label}>{label}</th>)}
            </tr></thead>
            <tbody>{quality.points.map((point, i) => {
              const marked = Math.abs(point.residualPercent) > 5;
              return <tr key={point.id} className={`border-b border-slate-100 ${marked ? 'bg-blue-50' : ''}`}
                data-outlier={marked || undefined} title={`實測點 ${i + 1}：${point.note || point.id}`}>
                <th scope="row" className="p-2 font-medium">{i + 1}</th>
                {[point.solidsContent, point.spinSpeed, point.spinTime, point.thickness, point.predicted, point.residual, point.residualPercent]
                  .map((value, column) => <td className="p-2 font-mono" key={column}>{format(value)}</td>)}
              </tr>;
            })}</tbody>
          </table>
        </div>
        {quality.points.length < 2
          ? <p className="text-xs text-slate-600">至少需要 2 個有效實測點才能繪製殘差圖。</p>
          : open && <div className="h-64 w-full" role="img" aria-label="實測點殘差圖">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{top: 20, right: 15, bottom: 25, left: 5}}>
                <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="solidsContent" name="固含量" unit=" wt%" tick={{fill: 'var(--color-muted)', fontSize: 'var(--text-xs)'}}
                  label={{value: '固含量（wt%）', position: 'insideBottom', offset: -18, fill: 'var(--color-muted)', fontSize: 'var(--text-xs)'}} />
                <YAxis type="number" dataKey="residualPercent" name="殘差" unit="%" tick={{fill: 'var(--color-muted)', fontSize: 'var(--text-xs)'}}
                  label={{value: '殘差（%）', angle: -90, position: 'insideLeft', fill: 'var(--color-muted)', fontSize: 'var(--text-xs)'}} />
                <ReferenceLine y={0} stroke="var(--color-muted)" strokeDasharray="4 4" ifOverflow="extendDomain"
                  label={{value: '0%', position: 'insideTopRight', fill: 'var(--color-muted)', fontSize: 'var(--text-xs)'}} />
                <Scatter data={quality.points} fill="var(--color-measured)" shape="circle" isAnimationActive={false} />
                <Tooltip formatter={(value, name) => [format(Number(value)), name]}
                  contentStyle={{fontSize: 'var(--text-xs)', borderColor: 'var(--color-line-strong)', borderRadius: 'var(--radius-control)'}} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>}
      </>}
      {quality.warnings.length > 0 && <ul className="list-disc pl-4 text-xs text-amber-800 space-y-1">
        {quality.warnings.map((warning, i) => <li key={`${warning.code}-${i}`}>{warning.message}</li>)}
      </ul>}
    </section>
  </details>;
}
