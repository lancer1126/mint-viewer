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
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full overflow-hidden rounded-none bg-[rgb(241,237,231)] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16),0_18px_44px_rgba(148,163,184,0.12)]">
          {options.map((item) => (
            <button
              key={item}
              onClick={() => {
                onChange(item);
                onOpenChange(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition ${
                item === value ? "bg-black/[0.045] text-slate-900" : "text-slate-700 hover:bg-black/[0.03]"
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
