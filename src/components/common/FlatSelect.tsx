import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import type { FlatSelectProps } from "@/types";

export function FlatSelect({ prefix, value, options, open, onOpenChange, onChange }: FlatSelectProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOpenChange]);

  return (
    <div ref={wrapRef} className="relative inline-block w-fit max-w-full">
      <button
        onClick={() => onOpenChange(!open)}
        className="inline-flex h-8 w-fit max-w-full items-center gap-0.5 overflow-hidden rounded-xl bg-transparent pl-2.5 pr-2 text-sm text-slate-700 transition hover:bg-black/[0.05]"
      >
        <span className="shrink-0 text-slate-500">{prefix}</span>
        <span className="min-w-0 truncate pr-1 text-left">{value}</span>
        <ChevronRight size={16} strokeWidth={2} className="shrink-0 rotate-90" />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full overflow-hidden rounded-xl border border-white/52 bg-[rgba(250,248,244,0.84)] shadow-[0_14px_34px_rgba(148,163,184,0.18),0_2px_10px_rgba(255,255,255,0.24)_inset] backdrop-blur-2xl">
          {options.map((item) => (
            <button
              key={item}
              onClick={() => {
                onChange(item);
                onOpenChange(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ${
                item === value ? "bg-black/[0.08] text-slate-900" : "text-slate-700 hover:bg-black/[0.08] hover:text-slate-900"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
