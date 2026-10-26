import {useState} from 'react';
import {Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import type {PredictionResult, MeasuredPoint} from '../types';
import {generateDenseChartPoints} from '../utils/meyerhofer';

export function CurveChart({prediction: p, measuredPoints}: {prediction: PredictionResult; measuredPoints: MeasuredPoint[]}) {
  const [focused, setFocused] = useState(false);
  const [theoretical, setTheoretical] = useState(true);
  const [tolerance, setTolerance] = useState(true);
  const min = focused ? Math.max(0.5, p.recommendedSolids * 0.6) : 0.5;
  const max = focused ? Math.max(min + 1, p.recommendedSolids * 1.4) : Math.min(60, Math.max(20, p.recommendedSolids * 1.35, ...measuredPoints.map(pt => pt.solidsContent * 1.35)));
  const data = generateDenseChartPoints(p, min, max, 70).map(point => ({...point, band: [point.lowerTolerance, point.upperTolerance]}));
  const c = p.calibration;
  const points = measuredPoints.map(point => ({...point, equivalentThickness: point.thickness
    * Math.pow((point.spinSpeed ?? p.spinSpeed) / p.spinSpeed, c.beta)
    * Math.pow((point.spinTime ?? p.spinTime) / p.spinTime, c.gamma)}));
  const converted = measuredPoints.some(point => (point.spinSpeed ?? p.spinSpeed) !== p.spinSpeed || (point.spinTime ?? p.spinTime) !== p.spinTime);
  return <section className="card space-y-3" aria-label="固含量曲線">
    <div className="flex flex-wrap justify-between gap-3 items-center">
      <h2 className="font-semibold">固含量與膜厚</h2>
      <div className="flex flex-wrap gap-3 text-xs">
        <button aria-pressed={focused} onClick={() => setFocused(!focused)} className="text-blue-700">{focused ? '還原全域' : '聚焦目標'}</button>
        <label className="flex items-center gap-1"><input type="checkbox" checked={theoretical} onChange={e => setTheoretical(e.target.checked)} />理論虛線</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={tolerance} onChange={e => setTolerance(e.target.checked)} />容差帶</label>
      </div>
    </div>
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{top: 20, right: 25, left: 5, bottom: 25}}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="solids" type="number" domain={[min, max]} tick={{fill: '#475569', fontSize: 12}}
            label={{value: '固含量（wt%）', position: 'insideBottom', offset: -18, fill: '#475569', fontSize: 12}} />
          <YAxis tick={{fill: '#475569', fontSize: 12}} label={{value: '膜厚（nm）', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12}} />
          <Tooltip contentStyle={{borderRadius: 8, borderColor: '#cbd5e1', fontSize: 12}} labelFormatter={v => `${Number(v).toFixed(4)} wt%`}
            formatter={v => Array.isArray(v) ? `${Number(v[0]).toFixed(3)} ～ ${Number(v[1]).toFixed(3)} nm` : `${Number(v).toFixed(3)} nm`} />
          {tolerance && <Area dataKey="band" name="膜厚容差帶" stroke="none" fill="#dbeafe" fillOpacity={0.8} isAnimationActive={false} />}
          {theoretical && <Line dataKey="theoretical" name="理論膜厚" stroke="#64748b" strokeDasharray="5 5" dot={false} isAnimationActive={false} />}
          <Line dataKey="calibrated" name="校正膜厚" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
          <ReferenceLine y={p.targetThickness} stroke="#2563eb" strokeDasharray="4 4" label={{value: `目標 ${p.targetThickness} nm`, position: 'insideTopRight', fill: '#1d4ed8', fontSize: 12}} />
          {p.recommendedSolids >= min && p.recommendedSolids <= max && <>
            <ReferenceLine x={p.recommendedSolids} stroke="#2563eb" strokeDasharray="4 4" />
            <ReferenceDot x={p.recommendedSolids} y={p.targetThickness} r={5} fill="#2563eb" stroke="#fff" />
          </>}
          {points.filter(point => point.solidsContent >= min && point.solidsContent <= max).map(point => <ReferenceDot key={point.id}
            x={point.solidsContent} y={point.equivalentThickness} r={4} fill="#1e293b" stroke="#fff" ifOverflow="extendDomain" />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <p className="text-xs text-slate-600">藍線：校正模型；灰色虛線：理論模型；深色點：實測數據。{converted && '實測膜厚已換算至目前製程條件。'}</p>
  </section>;
}
