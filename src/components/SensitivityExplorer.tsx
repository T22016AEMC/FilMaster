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
    <div className="bg-white  rounded-2xl shadow-sm shadow-sm border border-slate-200 p-5 space-y-4">
      {/* Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-50 " />
          <div>
            <h2 className="text-sm font-bold   text-slate-900 flex items-center gap-2 ">
              <SlidersHorizontal className="w-4 h-4 text-blue-700" />
              05. 機台製程窗型靈敏度分析 (Process Window & Sensitivity)
            </h2>
            <p className="text-xs text-slate-600 ">
              固定建議固含量 S = {recommendedSolids.toFixed(4)} wt% 下之機台塗佈反應
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-semibold ">
          <button
            type="button"
            onClick={() => setActiveTab('rpm')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'rpm'
                ? 'bg-slate-100 text-blue-700  border border-blue-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-blue-700" />
            <span>主轉速靈敏度 (h vs. RPM)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('time')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'time'
                ? 'bg-slate-100 text-blue-700  border border-blue-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-700" />
            <span>旋塗時間動態 (h vs. Time)</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'rpm' ? (
            <LineChart data={rpmData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="rpm"
                label={{
                  value: '主轉速 ω (RPM)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#475569',
                  fontSize: 12,
                }}
                tick={{ fill: '#475569', fontSize: 12 }}
                tickFormatter={val => `${val}`}
              />
              <YAxis
                label={{
                  value: '膜厚 h (nm)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fill: '#475569',
                  fontSize: 12,
                }}
                tick={{ fill: '#475569', fontSize: 12 }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(val: any) => [`${Number(val).toFixed(3)} nm`, '預估膜厚']}
                labelFormatter={label => `轉速: ${label} RPM`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  color: '#1d4ed8',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine
                x={spinSpeed}
                stroke="#2563eb"
                strokeDasharray="3 3"
                label={{
                  value: `設定轉速 ${spinSpeed} RPM`,
                  position: 'top',
                  fill: '#1d4ed8',
                  fontSize: 12,
                }}
              />
              <ReferenceLine
                y={targetThickness}
                stroke="#2563eb"
                strokeDasharray="3 3"
                label={{
                  value: `目標膜厚 ${targetThickness.toFixed(3)} nm`,
                  position: 'insideTopRight',
                  fill: '#1d4ed8',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="thickness"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                name="膜厚反應"
              />
            </LineChart>
          ) : (
            <LineChart data={timeData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                label={{
                  value: '旋塗時間 t (sec)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#475569',
                  fontSize: 12,
                }}
                tick={{ fill: '#475569', fontSize: 12 }}
                tickFormatter={val => `${val}s`}
              />
              <YAxis
                label={{
                  value: '膜厚 h (nm)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fill: '#475569',
                  fontSize: 12,
                }}
                tick={{ fill: '#475569', fontSize: 12 }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(val: any) => [`${Number(val).toFixed(3)} nm`, '預估膜厚']}
                labelFormatter={label => `時間: ${label} 秒`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  color: '#1d4ed8',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <ReferenceLine
                x={spinTime}
                stroke="#2563eb"
                strokeDasharray="3 3"
                label={{
                  value: `設定時間 ${spinTime} s`,
                  position: 'top',
                  fill: '#1d4ed8',
                  fontSize: 12,
                }}
              />
              <ReferenceLine
                y={targetThickness}
                stroke="#2563eb"
                strokeDasharray="3 3"
                label={{
                  value: `目標膜厚 ${targetThickness.toFixed(3)} nm`,
                  position: 'insideTopRight',
                  fill: '#1d4ed8',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="thickness"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                name="膜厚反應"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ">
        <span>
          {activeTab === 'rpm'
            ? `隨轉速提高，流體剪切力增強且溶劑揮發加速，膜厚呈現 ω^(-${calibration.beta.toFixed(2)}) 冪律衰減。`
            : `隨秒數推進，多餘樹脂甩出後主要由溶劑蒸發主導，膜厚呈現 t^(-${calibration.gamma.toFixed(2)}) 緩慢收斂。`}
        </span>
        <span className=" font-semibold text-blue-700 shrink-0">
          當前製程點: {spinSpeed} RPM / {spinTime} s → {targetThickness.toFixed(3)} nm
        </span>
      </div>
    </div>
  );
};
