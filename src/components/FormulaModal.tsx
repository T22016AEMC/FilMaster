import React from 'react';
import { X, BookOpen, Layers, Check, Copy, Sparkles, Terminal } from 'lucide-react';
import { RESIN_CONFIGS } from '../utils/resinConfigs';
import { ResinType } from '../types';

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormulaModal: React.FC<FormulaModalProps> = ({ isOpen, onClose }) => {
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);

  if (!isOpen) return null;

  const systemInstructionsText = `你是一名專精於半導體微影材料（Photoresist & SOC Planarization Layer）與旋塗製程（Spin Coating）的化學配方研發程式專家。

你的任務是根據使用者輸入的製程參數、樹脂類型、實測數據與目標膜厚，準確預測所需的「固含量 (wt%)」，並輸出數據點以供繪製固含量對應膜厚的曲線圖。

【數學與物理模型基本式】
膜厚 h (nm) 與固含量 S (wt%)、轉速 w (RPM)、時間 t (s) 之關係為：
h = C * (S ^ alpha) * (w ^ -beta) * (t ^ -gamma)

【樹脂類別預設參數】
1. EUV (5.0 - 50.0 nm):
   - 建議模型：Emslie-Meyerhofer 超薄膜蒸發修正模型
   - alpha = 1.25, beta = 0.50, gamma = 0.25, C_default = 120.0
2. ArF (50.0 - 150.0 nm):
   - 建議模型：Standard Meyerhofer 流體蒸發模型
   - alpha = 1.33, beta = 0.50, gamma = 0.20, C_default = 110.0
3. KrF (150.0 - 500.0 nm):
   - 建議模型：Empirical Power Law 冪律模型
   - alpha = 1.40, beta = 0.50, gamma = 0.15, C_default = 95.0
4. BARC (5.0 - 200.0 nm):
   - 建議模型：Meyerhofer 抗反射薄膜蒸發流體模型
   - alpha = 1.30, beta = 0.50, gamma = 0.20, C_default = 650.0
5. SOC (50.0 - 500.0 nm):
   - 建議模型：High-Viscosity Flow & Evaporation 模型
   - alpha = 1.45, beta = 0.48, gamma = 0.18, C_default = 85.0

【校正邏輯與運算流程】
1. 若使用者「未提供」實測數據（0 個點）：使用預設理論參數進行推算。
2. 若使用者提供「1 個實測數據 (S1, h1)」：
   - 計算該 S1 在理論模型下的膜厚 h_pred。
   - 計算校正因子 Scale = h1 / h_pred。
   - 修正 C_calibrated = C_default * Scale，使模型曲線平移過該點。
3. 若使用者提供「>= 2 個實測數據」：
   - 使用最小平方法（Least Squares）對 S 與 h 進行擬合，修正 C 與 alpha 值。
4. 計算目標膜厚 h_target 所需的目標固含量 S_target。
5. 計算 +-5% 膜厚容忍區間：
   - h_lower = h_target * 0.95 -> 計算對應 S_lower
   - h_upper = h_target * 1.05 -> 計算對應 S_upper

【回應格式要求】
每次回應請務必結構化輸出下列資訊：
1. 【模型與參數資訊】：顯示選擇的樹脂、使用的模型名稱、最終校正後的 C 與 alpha 參數。
2. 【預測結果摘要】：
   - 目標膜厚 (nm)
   - 建議固含量 (wt%)
   - +-5% 膜厚容忍區間 (Lower nm ~ Upper nm) 對應的固含量範圍 (S_lower wt% ~ S_upper wt%)
3. 【數據曲線點表格】：生成固含量從 0.5% 到 20.0%（適當間隔取 10-15 個點）對應的膜厚 (nm) 表格，供使用者在 Excel 或前端繪製曲線圖。`;

  const handleCopySystemPrompt = () => {
    navigator.clipboard.writeText(systemInstructionsText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/90 border border-slate-800">
        {/* Header */}
        <div className="sticky top-0 bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 rounded-t-2xl z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono">半導體旋塗 Meyerhofer 模型物理與校正原理</h2>
              <p className="text-xs text-slate-400 font-mono">Mathematical Physics & Calibration Mechanics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-slate-300 text-sm">
          {/* Section 1: Fundamental Equation */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              一、 理論基礎：Meyerhofer 蒸發-流體力學模型
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">
              在晶圓旋塗製程中，薄膜最終厚度由液態樹脂在離心力驅動下的徑向流動（Fluid Flow）與溶劑揮發（Solvent Evaporation）共同主導。Meyerhofer 模型以冪律形式描述各關鍵製程參數與物理常數之關係：
            </p>

            <div className="bg-slate-950 text-cyan-400 p-4 rounded-xl font-mono text-center text-base sm:text-lg shadow-inner border border-slate-800">
              h = C · S<sup>α</sup> · ω<sup>-β</sup> · t<sup>-γ</sup>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-200 font-mono">主要物理變數：</div>
                <div>• <strong className="font-mono text-cyan-300">h</strong>: 旋塗成膜厚度 (nm)</div>
                <div>• <strong className="font-mono text-cyan-300">S</strong>: 樹脂固含量 (Solids Content, wt%)</div>
                <div>• <strong className="font-mono text-cyan-300">ω</strong>: 主旋塗轉速 (Spin Speed, 500–5000 RPM)</div>
                <div>• <strong className="font-mono text-cyan-300">t</strong>: 旋塗持續秒數 (Spin Duration, 1–60 s)</div>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-200 font-mono">材料與溶劑常數：</div>
                <div>• <strong className="font-mono text-cyan-300">C</strong>: 比例因子（反映溶劑飽和蒸氣壓、初黏度）</div>
                <div>• <strong className="font-mono text-cyan-300">α</strong>: 固含量指數 (1.25 ~ 1.45)</div>
                <div>• <strong className="font-mono text-cyan-300">β</strong>: 轉速指數 (0.48 ~ 0.50)</div>
                <div>• <strong className="font-mono text-cyan-300">γ</strong>: 蒸發時間指數 (0.15 ~ 0.25)</div>
              </div>
            </div>
          </div>

          {/* Section 2: Resin Presets Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              二、 基礎材料庫與預設物理常數 (微影、中厚膜至超厚膜 PI/SU-8)
            </h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono font-semibold">
                  <tr>
                    <th className="px-3 py-2 text-left">樹脂類別</th>
                    <th className="px-3 py-2 text-left">建議適用膜厚</th>
                    <th className="px-3 py-2 text-left">建議理論模型</th>
                    <th className="px-3 py-2 text-center font-mono">α (固含量)</th>
                    <th className="px-3 py-2 text-center font-mono">β (轉速)</th>
                    <th className="px-3 py-2 text-center font-mono">γ (時間)</th>
                    <th className="px-3 py-2 text-center font-mono">預設 C₀</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono">
                  {(Object.keys(RESIN_CONFIGS) as ResinType[]).map(type => {
                    const c = RESIN_CONFIGS[type];
                    return (
                      <tr key={type} className="hover:bg-slate-800/50">
                        <td className="px-3 py-2 font-bold text-slate-200">{c.name}</td>
                        <td className="px-3 py-2 text-slate-400">
                          {c.recommendedThicknessRange[0]} ~ {c.recommendedThicknessRange[1]} nm
                        </td>
                        <td className="px-3 py-2 text-slate-300">{c.modelName}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold text-cyan-300">{c.alpha}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-400">{c.beta}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-400">{c.gamma}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-cyan-400">
                          {c.defaultC}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Calibration Mechanism */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              三、 多模式校正運算機制 (0 點 / 1 點平移 / 多點擬合)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              {/* 0 points */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="font-bold text-slate-200 text-sm">1. 0 個真實數據</div>
                <div className="text-slate-400 font-medium">純理論預設推算</div>
                <p className="text-slate-400 mt-1 font-sans text-xs">
                  完全使用文獻與該樹脂種類之理論參數預測，適用於新材料初步配方探索。
                </p>
              </div>

              {/* 1 point */}
              <div className="p-3 bg-cyan-950/40 rounded-xl border border-cyan-800/60 space-y-1">
                <div className="font-bold text-cyan-300 text-sm">2. 1 個真實數據 (S₁, h₁)</div>
                <div className="text-cyan-400 font-medium">乘法縮放平移 (Scaling Shift)</div>
                <p className="text-cyan-300 mt-1 font-mono text-[11px]">
                  C_cal = C_theo · [ h₁ / h_model(S₁) ]
                </p>
                <p className="text-slate-400 font-sans text-xs">
                  修正整體比例因子，確保理論曲線精確通過該實測點。
                </p>
              </div>

              {/* >= 2 points */}
              <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/60 space-y-1">
                <div className="font-bold text-emerald-300 text-sm">3. ≥ 2 個真實數據</div>
                <div className="text-emerald-400 font-medium">最小平方法擬合 (Least Squares)</div>
                <p className="text-emerald-300 mt-1 font-mono text-[11px]">
                  ln(h) = ln(K) + α · ln(S)
                </p>
                <p className="text-slate-400 font-sans text-xs">
                  在對數空間回歸擬合出專屬於該批次/配方的最佳指數 α 與常數 C。
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: System Instructions Copyable Block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
                <Terminal className="w-4 h-4 text-cyan-400" />
                四、 Google AI Studio System Instructions (可直接複製使用)
              </h3>
              <button
                type="button"
                onClick={handleCopySystemPrompt}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-medium transition-colors"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>已複製到剪貼簿</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>複製 System Instructions</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 text-cyan-300/90 p-4 rounded-xl text-[11px] font-mono leading-relaxed overflow-x-auto max-h-48 border border-slate-800">
              {systemInstructionsText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 rounded-b-2xl flex items-center justify-end font-mono">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
          >
            關閉說明視窗
          </button>
        </div>
      </div>
    </div>
  );
};
