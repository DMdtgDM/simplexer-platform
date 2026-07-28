'use client';

export function QuizOption({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
        checked ? 'border-primary bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="h-4 w-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

export function QuizOptionResult({
  label,
  isCorrect,
  isSelected,
}: {
  label: string;
  isCorrect: boolean;
  isSelected: boolean;
}) {
  const style = isCorrect
    ? 'border-success bg-success/10'
    : isSelected
      ? 'border-error bg-error/10'
      : 'border-gray-200 bg-white';

  return (
    <div className={`flex min-h-[44px] items-center gap-3 rounded-xl border px-4 py-3 text-sm ${style}`}>
      <span>{label}</span>
      {isCorrect && <span className="ml-auto text-xs font-semibold text-success">Correct</span>}
      {!isCorrect && isSelected && <span className="ml-auto text-xs font-semibold text-error">Your answer</span>}
    </div>
  );
}
