import {useNumericInput, INVALID_NUMBER_HINT} from '../hooks/useNumericInput';

export function NumericField({id, label, value, onChange, normalize, presets, unit}: {
  id: string; label: string; value: number; onChange: (v: number) => void;
  normalize?: (v: number) => number; presets?: number[]; unit?: string;
}) {
  const input = useNumericInput(value, onChange, normalize);
  return <div className="space-y-2 min-w-0">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <div className="relative">
      <input id={id} type="number" step="any" {...input.inputProps}
        aria-describedby={input.invalid ? `${id}-hint` : undefined}
        className={`numeric-input pr-14 ${input.invalid ? 'border-rose-500! focus:ring-rose-500!' : ''}`} />
      {unit && <span className="numeric-unit">{unit}</span>}
    </div>
    {input.invalid && <p id={`${id}-hint`} className="text-xs text-red-700">{INVALID_NUMBER_HINT}</p>}
    {presets && <div className="quick-values flex flex-nowrap gap-1 overflow-x-auto min-w-0">
      {presets.map(preset => <button key={preset} type="button" onClick={() => onChange(preset)}
        className={`quick-value shrink-0 whitespace-nowrap text-xs ${value === preset ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
        {preset}{unit === 's' ? 's' : ''}
      </button>)}
    </div>}
  </div>;
}
