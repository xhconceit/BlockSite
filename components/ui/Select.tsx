import { useState, useRef, useEffect, useCallback } from "react";

interface SelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  disabled?: boolean;
}

function Select({ options, value, onChange, className = "", disabled = false }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const close = useCallback(() => {
    setOpen(false);
    setHighlightIndex(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) => Math.min(prev + 1, options.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < options.length) {
            const opt = options[highlightIndex]!;
            onChange({ target: { value: opt.value } });
            close();
          }
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, highlightIndex, options, onChange, close]);

  useEffect(() => {
    if (open && highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [open, highlightIndex]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ${
          open ? "ring-2 ring-lime-300 border-transparent" : ""
        }`}
      >
        <span className={value ? "text-zinc-100" : "text-zinc-500"}>{selectedLabel}</span>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl max-h-60 overflow-auto"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHighlighted = i === highlightIndex;
            return (
              <li
                key={opt.value}
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  close();
                }}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors duration-75 ${
                  isSelected
                    ? "text-lime-300"
                    : isHighlighted
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-300 hover:bg-zinc-700/50"
                }`}
              >
                <span className="w-4 shrink-0">
                  {isSelected && (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { Select };
export type { SelectProps };
