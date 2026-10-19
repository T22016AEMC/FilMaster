import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { PredictionResult } from '../types';
import { calculateThickness } from '../utils/meyerhofer';
import { Gauge, Clock, SlidersHorizontal } from 'lucide-react';

interface SensitivityExplorerProps {
  prediction: PredictionResult;
}

export const SensitivityExplorer: React.FC<SensitivityExplorerProps> = ({ prediction }) => {
  const [activeTab, setActiveTab] = useState<'rpm' | 'time'>('rpm');

  const { recommendedSolids, spinSpeed, spinTime, calibration, targetThickness } = prediction;

  // 1. RPM Curve Data (500 to 5000 RPM at recommended solids content)
  const rpmData: Array<{ rpm: number; thickness: number }> = [];
  for (let w = 500; w <= 5000; w += 100) {
    const h = calculateThickness(
      recommendedSolids,
      w,
      spinTime,
      calibration.calibratedC,
      calibration.calibratedAlpha,
      calibration.beta,
      calibration.gamma
    );
    rpmData.push({ rpm: w, thickness: Number(h.toFixed(3)) });
  }

  // 2. Spin Time Curve Data (5 to 60 seconds at recommended solids content)
  const timeData: Array<{ time: number; thickness: number }> = [];
  for (let t = 5; t <= 60; t += 2) {
    const h = calculateThickness(
      recommendedSolids,
      spinSpeed,
      t,
      calibration.calibratedC,
      calibration.calibratedAlpha,
      calibration.beta,
      calibration.gamma
    );
    timeData.push({ time: t, thickness: Number(h.toFixed(3)) });
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl shadow-black/50 border border-slate-800 p-5 space-y-4">
      {/* Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 font-mono">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              05. 機台製程窗型靈敏度分析 (Process Window & Sensitivity)
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              固定建議固含量 S = {recommendedSolids.toFixed(4)} wt% 下之機台塗佈反應
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('rpm')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'rpm'
                ? 'bg-slate-800 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)] border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span>主轉速靈敏度 (h vs. RPM)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('time')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'time'
                ? 'bg-slate-800 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)] border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>旋塗時間動態 (h vs. Time)</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'rpm' ? (
            <LineChart data={rpmData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="rpm"
                label={{
                  value: '主轉速 ω (RPM)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={val => `${val}`}
              />
              <YAxis
                label={{
                  value: '膜厚 h (nm)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(val: any) => [`${Number(val).toFixed(3)} nm`, '預估膜厚']}
                labelFormatter={label => `轉速: ${label} RPM`}
                contentStyle={{
                  backgroundColor: '#030712',
                  borderColor: '#1e293b',
                  color: '#38bdf8',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine
                x={spinSpeed}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                label={{
                  value: `設定轉速 ${spinSpeed} RPM`,
                  position: 'top',
                  fill: '#fb7185',
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                y={targetThickness}
                stroke="#06b6d4"
                strokeDasharray="3 3"
                label={{
                  value: `目標膜厚 ${targetThickness.toFixed(3)} nm`,
                  position: 'insideTopRight',
                  fill: '#38bdf8',
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="thickness"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                name="膜厚反應"
              />
            </LineChart>
          ) : (
            <LineChart data={timeData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="time"
                label={{
                  value: '旋塗時間 t (sec)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={val => `${val}s`}
              />
              <YAxis
                label={{
                  value: '膜厚 h (nm)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(val: any) => [`${Number(val).toFixed(3)} nm`, '預估膜厚']}
                labelFormatter={label => `時間: ${label} 秒`}
                contentStyle={{
                  backgroundColor: '#030712',
                  borderColor: '#1e293b',
                  color: '#38bdf8',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine
                x={spinTime}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                label={{
                  value: `設定時間 ${spinTime} s`,
                  position: 'top',
                  fill: '#fb7185',
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                y={targetThickness}
                stroke="#06b6d4"
                strokeDasharray="3 3"
                label={{
                  value: `目標膜厚 ${targetThickness.toFixed(3)} nm`,
                  position: 'insideTopRight',
                  fill: '#38bdf8',
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="thickness"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                name="膜厚反應"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="text-[11px] text-slate-400 bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono">
        <span>
          {activeTab === 'rpm'
            ? `隨轉速提高，流體剪切力增強且溶劑揮發加速，膜厚呈現 ω^(-${calibration.beta.toFixed(2)}) 冪律衰減。`
            : `隨秒數推進，多餘樹脂甩出後主要由溶劑蒸發主導，膜厚呈現 t^(-${calibration.gamma.toFixed(2)}) 緩慢收斂。`}
        </span>
        <span className="font-mono font-semibold text-cyan-300 shrink-0">
          當前製程點: {spinSpeed} RPM / {spinTime} s → {targetThickness.toFixed(3)} nm
        </span>
      </div>
    </div>
  );
};
