import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { PredictionWarning } from '../types';

interface WarningPanelProps {
  warnings: PredictionWarning[];
}

/** 計算警告：有警告時以琥珀色警示框逐條顯示，沒有警告時不顯示 */
export const WarningPanel: React.FC<WarningPanelProps> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  return (
    <div
      role="alert"
      id="prediction-warning-panel"
      className="warning-card"
    >
      <div className="flex items-center gap-2 font-bold text-amber-700  mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
        <span>計算警告 ({warnings.length})</span>
      </div>
      <ul className="space-y-1.5 text-amber-700 list-disc pl-5 marker:text-amber-700">
        {warnings.map((w, idx) => (
          <li key={`${w.code}-${w.field ?? ''}-${idx}`}>{w.message}</li>
        ))}
      </ul>
    </div>
  );
};
