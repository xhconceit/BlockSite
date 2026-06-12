import { createContext, useContext, useId } from "react";

interface RadioGroupContextValue {
  name: string;
  value: string;
  onChange: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue>({
  name: "",
  value: "",
  onChange: () => {},
});

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function RadioGroup({ value, onChange, children, className = "" }: RadioGroupProps) {
  const name = useId();
  return (
    <RadioGroupContext.Provider value={{ name, value, onChange }}>
      <div className={`flex flex-col gap-2 ${className}`}>{children}</div>
    </RadioGroupContext.Provider>
  );
}

interface RadioProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function Radio({ value, disabled = false, className = "", children }: RadioProps) {
  const ctx = useContext(RadioGroupContext);
  const isSelected = ctx.value === value;

  return (
    <label
      className={`flex items-center gap-2 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        disabled={disabled}
        onClick={() => ctx.onChange(value)}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 ${
          isSelected ? "border-lime-300" : "border-zinc-600 hover:border-zinc-400"
        }`}
      >
        {isSelected && <span className="w-2 h-2 rounded-full bg-lime-300" />}
      </button>
      {children && <span className="text-sm text-zinc-300">{children}</span>}
    </label>
  );
}

export { RadioGroup, Radio };
export type { RadioGroupProps, RadioProps };
