import {useEffect, useState, type ChangeEvent} from 'react';

/** 解析使用者輸入：必須是大於 0 的有限數值，否則回傳 null */
export function parsePositive(text: string): number | null {
  const t = text.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const INVALID_NUMBER_HINT = '請輸入大於 0 的數值';

/**
 * 數值輸入防呆：
 * - 輸入框保留使用者正在輸入的內容（draft），不強制跳回數字
 * - 只有輸入有效（> 0 的有限數值）時才呼叫 onValidChange，無效時維持上一次的有效值
 * - 失去焦點時恢復為上一次的有效值
 * normalize 可用來限制範圍（例如容差限制在 0.1～10）
 */
export function useNumericInput(
  value: number,
  onValidChange: (v: number) => void,
  normalize: (v: number) => number = v => v,
) {
  const [draft, setDraft] = useState<string>(String(value));
  const [invalid, setInvalid] = useState<boolean>(false);

  // 外部改變數值（滑桿、預設按鈕、載入情境）時同步輸入框；
  // 輸入框內容解析後與目前數值相符時保留使用者輸入的原樣
  useEffect(() => {
    setDraft(prev => {
      const parsed = parsePositive(prev);
      return parsed !== null && normalize(parsed) === value ? prev : String(value);
    });
    setInvalid(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setDraft(text);
    const parsed = parsePositive(text);
    if (parsed === null) {
      setInvalid(true);
    } else {
      setInvalid(false);
      onValidChange(normalize(parsed));
    }
  };

  const onBlur = () => {
    setDraft(String(value));
    setInvalid(false);
  };

  return {
    invalid,
    inputProps: {
      value: draft,
      onChange,
      onBlur,
      'aria-invalid': invalid || undefined,
    },
  };
}
