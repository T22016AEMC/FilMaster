import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
  Scatter,
} from 'recharts';
import { PredictionResult, MeasuredPoint } from '../types';
import { generateDenseChartPoints } from '../utils/meyerhofer';
import { TrendingUp, ZoomIn, ZoomOut, Layers, Eye } from 'lucide-react';

interface CurveChartProps {
  prediction: PredictionResult;
  measuredPoints: MeasuredPoint[];
}

export const CurveChart: React.FC<CurveChartProps> = ({ prediction, measuredPoints }) => {
  const [zoomAroundTarget, setZoomAroundTarget] = useState<boolean>(false);
  const [showTheoreticalCurve, setShowTheoreticalCurve] = useState<boolean>(true);
  const [showToleranceBand, setShowToleranceBand] = useState<boolean>(true);

  const {
    targetThickness,
    recommendedSolids,
    lowerThickness,
    lowerSolids,
    upperThickness,
    upperSolids,
    spinSpeed,
    spinTime,
    calibration,
    resin,
  } = prediction;

  // Determine chart solids range
  let minS = 0.5;
  const maxMeasured = measuredPoints.reduce((max, p) => Math.max(max, p.solidsContent), 0);
  let maxS = Math.max(20.0, Math.ceil(Math.max(recommendedSolids, maxMeasured) * 1.35));
  maxS = Math.min(60.0, maxS);

  if (zoomAroundTarget && recommendedSolids > 0) {
    minS = Math.max(0.5, Number((recommendedSolids * 0.4).toFixed(1)));
    maxS = Math.min(60.0, Number((recommendedSolids * 1.6).toFixed(1)));
  }

  const chartData = generateDenseChartPoints(prediction, minS, maxS, 70);

  // Filter measured points in range
  const scatterPoints = measuredPoints.map(p => ({
    solids: p.solidsContent,
    thickness: p.thickness,
    note: p.note || '實測點',
  }));

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white rounded-lg p-3 shadow-xl text-xs space-y-1.5 font-sans">
          <div className="font-bold border-b border-slate-700 pb-1 text-cyan-300 font-mono flex items-center justify-between">
            <span>固含量 S: {Number(label).toFixed(4)} wt%</span>
          </div>
          <div className="space-y-1 font-mono">
            <div className="flex items-center justify-between gap-4 text-blue-300">
              <span>校正後膜厚 (h_cal):</span>
              <strong className="text-white">{dataPoint.calibrated.toFixed(3)} nm</strong>
            </div>
            {showTheoreticalCurve && (
              <div className="flex items-center justify-between gap-4 text-slate-400">
                <span>理論原始膜厚 (h_theo):</span>
                <span>{dataPoint.theoretical.toFixed(3)} nm</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 text-amber-300 text-[11px]">
              <span>±{prediction.tolerancePercent.toFixed(1)}% 容許區間:</span>
              <span>{dataPoint.lowerTolerance.toFixed(3)} ~ {dataPoint.upperTolerance.toFixed(3)} nm</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl shadow-black/50 border border-slate-800 p-5 space-y-4">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 font-mono">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              03. 固含量 (S) 與膜厚 (h) 旋塗特性曲線圖
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Film Thickness vs. Solids Content Characteristic Curve (Meyerhofer Power-Law)
            </p>
          </div>
        </div>

        {/* Toggle Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setZoomAroundTarget(!zoomAroundTarget)}
            className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 transition-all ${
              zoomAroundTarget
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80 shadow-[0_0_10px_rgba(6,182,212,0.3)] font-semibold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {zoomAroundTarget ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
            <span>{zoomAroundTarget ? `還原全域 (0.5~${maxS.toFixed(0)}%)` : '聚焦目標區間'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTheoreticalCurve(!showTheoreticalCurve)}
            className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 transition-all ${
              showTheoreticalCurve
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800 line-through'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>理論虛線</span>
          </button>

          <button
            type="button"
            onClick={() => setShowToleranceBand(!showToleranceBand)}
            className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 transition-all ${
              showToleranceBand
                ? 'bg-amber-950/80 text-amber-300 border-amber-600/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-slate-950 text-slate-500 border-slate-800 line-through'
            }`}
          >
            <span>±{prediction.tolerancePercent.toFixed(1)}% 容許色帶</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-80 sm:h-96 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 25 }}>
            <defs>
              <linearGradient id="toleranceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

            <XAxis
              dataKey="solids"
              type="number"
              domain={[minS, maxS]}
              label={{
                value: '固含量 S (wt%)',
                position: 'insideBottom',
                offset: -15,
                fill: '#94a3b8',
                fontSize: 12,
                fontWeight: 600,
              }}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={val => `${val}%`}
            />

            <YAxis
              label={{
                value: '膜厚 h (nm)',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: '#94a3b8',
                fontSize: 12,
                fontWeight: 600,
              }}
              tick={{ fill: '#64748b', fontSize: 11 }}
              domain={[0, 'auto']}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Tolerance Band Area */}
            {showToleranceBand && (
              <Area
                type="monotone"
                dataKey="upperTolerance"
                stroke="transparent"
                fill="url(#toleranceGradient)"
                name={`±${prediction.tolerancePercent.toFixed(1)}% 膜厚容許帶`}
              />
            )}

            {/* Theoretical Baseline Curve (Dashed) */}
            {showTheoreticalCurve && (
              <Line
                type="monotone"
                dataKey="theoretical"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="理論未校正曲線 (Theoretical)"
              />
            )}

            {/* Calibrated Fitted Curve (Solid Cyan Neon) */}
            <Line
              type="monotone"
              dataKey="calibrated"
              stroke="#06b6d4"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
              name="校正後預測曲線 (Calibrated)"
            />

            {/* Target Thickness Horizontal Reference Line */}
            <ReferenceLine
              y={targetThickness}
              stroke="#f43f5e"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{
                value: `目標膜厚 ${targetThickness.toFixed(3)} nm`,
                position: 'right',
                fill: '#fb7185',
                fontSize: 11,
                fontWeight: 700,
              }}
            />

            {/* Target Solids Vertical Reference Line */}
            {recommendedSolids >= minS && recommendedSolids <= maxS && (
              <ReferenceLine
                x={Number(recommendedSolids.toFixed(4))}
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: `S = ${recommendedSolids.toFixed(4)}%`,
                  position: 'top',
                  fill: '#fb7185',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            )}

            {/* ±Tolerance% Tolerance Lines */}
            <ReferenceLine
              y={lowerThickness}
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="2 2"
              label={{
                value: `-${prediction.tolerancePercent.toFixed(1)}% (${lowerThickness.toFixed(3)} nm)`,
                position: 'insideBottomRight',
                fill: '#fbbf24',
                fontSize: 10,
              }}
            />
            <ReferenceLine
              y={upperThickness}
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="2 2"
              label={{
                value: `+${prediction.tolerancePercent.toFixed(1)}% (${upperThickness.toFixed(3)} nm)`,
                position: 'insideTopRight',
                fill: '#fbbf24',
                fontSize: 10,
              }}
            />

            {/* Intersection Highlight Dot for Target */}
            {recommendedSolids >= minS && recommendedSolids <= maxS && (
              <ReferenceDot
                x={Number(recommendedSolids.toFixed(4))}
                y={targetThickness}
                r={6}
                fill="#f43f5e"
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}

            {/* Measured Data Points Scatter Overlays */}
            {scatterPoints.map((pt, i) => (
              <ReferenceDot
                key={`scatter-${i}`}
                x={pt.solids}
                y={pt.thickness}
                r={7}
                fill="#fbbf24"
                stroke="#78350f"
                strokeWidth={2}
                label={{
                  value: `實測 #${i + 1} (${pt.solids.toFixed(4)}%, ${pt.thickness.toFixed(3)}nm)`,
                  position: 'top',
                  fill: '#fde68a',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend / Explanation Bar */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-cyan-400 rounded shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
            <span className="font-medium text-slate-200">校正後模型曲線 (h_cal)</span>
          </div>
          {showTheoreticalCurve && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-slate-500" />
              <span>理論原始模型 (h_theo)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-900 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            <span className="font-medium text-rose-300">目標調配點 ({recommendedSolids.toFixed(4)} wt%, {targetThickness.toFixed(3)} nm)</span>
          </div>
          {measuredPoints.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-400 rotate-45 ring-2 ring-amber-900 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <span className="font-medium text-amber-300">實驗實測數據點 ({measuredPoints.length} 組)</span>
            </div>
          )}
        </div>

        <div className="font-mono text-slate-500 text-[10px]">
          h = C·S^{calibration.calibratedAlpha.toFixed(2)}·ω^(-{calibration.beta})·t^(-{calibration.gamma})
        </div>
      </div>
    </div>
  );
};
