import {useMemo} from 'react';
import {CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import type {ProcessPredictionResult} from '../types';
import {generateProcessCurvePoints} from '../utils/processSolver';

export function ProcessCurveChart({result}: {result: ProcessPredictionResult}) {
  const speed = result.mode === 'solve_speed';
  const unit = speed ? 'rpm' : 's';
  const min = speed ? result.equipmentLimits.minSpeed : result.equipmentLimits.minTime;
  const max = speed ? result.equipmentLimits.maxSpeed : result.equipmentLimits.maxTime;
  const domainMin = Math.min(min, (result.rangeMin ?? min) * 0.9);
  const domainMax = Math.max(max, (result.rangeMax ?? max) * 1.1);
  const data = useMemo(() => generateProcessCurvePoints({...result, equipmentLimits: {
    ...result.equipmentLimits,
    ...(speed ? {minSpeed: domainMin, maxSpeed: domainMax} : {minTime: domainMin, maxTime: domainMax}),
  }}, 80), [result, speed, domainMin, domainMax]);
  return <section className="card space-y-3" aria-label="製程曲線">
    <h2 className="font-semibold">{speed ? '轉速' : '時間'}與膜厚</h2>
    <p className="text-xs text-slate-600">藍色為校正後曲線，淡藍為膜厚容差帶，灰色區段超出設備範圍。</p>
    {result.recommended === null ? <p className="py-16 text-center text-slate-600">無法求解，請確認輸入條件。</p> : <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{top: 28, right: 25, left: 5, bottom: 25}}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="x" type="number" domain={[domainMin, domainMax]} tick={{fill: '#475569', fontSize: 12}}
            tickFormatter={v => Number(v).toFixed(speed ? 0 : 1)} label={{value: `${speed ? '轉速' : '時間'}（${unit}）`, position: 'insideBottom', offset: -18, fill: '#475569', fontSize: 12}} />
          <YAxis tick={{fill: '#475569', fontSize: 12}} label={{value: '膜厚（nm）', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12}} />
          {domainMin < min && <ReferenceArea x1={domainMin} x2={min} fill="#e2e8f0" fillOpacity={0.6} />}
          {domainMax > max && <ReferenceArea x1={max} x2={domainMax} fill="#e2e8f0" fillOpacity={0.6} />}
          <ReferenceArea y1={result.lowerThickness} y2={result.upperThickness} fill="#dbeafe" fillOpacity={0.7} ifOverflow="extendDomain" />
          <Line dataKey="thickness" name="校正膜厚（nm）" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
          <ReferenceLine y={result.targetThickness} stroke="#1d4ed8" strokeDasharray="4 4" label={{value: `目標 ${result.targetThickness} nm`, position: 'insideTopRight', fill: '#1d4ed8', fontSize: 12}} />
          {[min, max].map(x => <ReferenceLine key={x} x={x} stroke="#64748b" strokeDasharray="3 3" label={{value: `${x} ${unit}`, position: 'top', fill: '#475569', fontSize: 12}} />)}
          <ReferenceLine x={result.recommended} stroke="#2563eb" strokeDasharray="4 4" />
          <ReferenceDot x={result.recommended} y={result.targetThickness} r={5} fill="#2563eb" stroke="#fff" />
          <Tooltip labelFormatter={v => `${Number(v).toFixed(3)} ${unit}`} formatter={v => `${Number(v).toFixed(3)} nm`} contentStyle={{borderRadius: 8, borderColor: '#cbd5e1', fontSize: 12}} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>}
  </section>;
}
