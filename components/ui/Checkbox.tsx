interface CheckboxProps {
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function CheckIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" />
    </svg>
  );
}

function Checkbox({ checked, onCheckedChange, disabled = false, className = "" }: CheckboxProps) {
  const isChecked = checked === true;
  const isIndeterminate = checked === "indeterminate";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isIndeterminate ? "mixed" : isChecked}
      disabled={disabled}
      onClick={() => onCheckedChange(!isChecked)}
      className={`inline-flex items-center justify-center w-4 h-4 rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 ${
        isChecked || isIndeterminate
          ? "bg-lime-300 text-zinc-900 border border-lime-300"
          : "border border-zinc-600 bg-transparent hover:border-zinc-400"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      {isChecked && <CheckIcon />}
      {isIndeterminate && <DashIcon />}
    </button>
  );
}

export { Checkbox };
export type { CheckboxProps };
