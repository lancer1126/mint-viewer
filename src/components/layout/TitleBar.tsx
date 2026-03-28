import { Minus, Square, X } from "lucide-react";

type TitleBarProps = {
  onMinimize: () => Promise<void>;
  onMaximize: () => Promise<void>;
  onClose: () => Promise<void>;
  onStartDrag: () => Promise<void>;
};

export function TitleBar({ onMinimize, onMaximize, onClose, onStartDrag }: TitleBarProps) {
  return (
    <header className="relative z-20 h-7 shrink-0 bg-transparent">
      <div className="flex h-full items-center justify-between">
        <div
          className="flex min-w-0 flex-1 cursor-default items-center px-4 text-[13px] font-medium text-slate-700"
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            if (e.detail >= 2) return;
            void onStartDrag();
          }}
          onDoubleClick={(e) => {
            if (e.button !== 0) return;
            void onMaximize();
          }}
        >
          <span className="flex items-center gap-2">
            <img src="/app-icon.png" alt="" className="h-5 w-5 object-contain" />
            <span className="truncate text-[14px] font-semibold">mint</span>
          </span>
        </div>

        <div
          className="h-full flex-1"
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            if (e.detail >= 2) return;
            void onStartDrag();
          }}
          onDoubleClick={(e) => {
            if (e.button !== 0) return;
            void onMaximize();
          }}
        />

        <div className="flex shrink-0 items-stretch">
          <button
            type="button"
            onClick={onMinimize}
            className="flex h-7 w-11 items-center justify-center text-slate-700 transition hover:bg-black/[0.04]"
            aria-label="最小化窗口"
          >
            <Minus size={16} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onMaximize}
            className="flex h-7 w-11 items-center justify-center text-slate-700 transition hover:bg-black/[0.04]"
            aria-label="最大化窗口"
          >
            <Square size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-11 items-center justify-center text-slate-700 transition hover:bg-[#c42b1c] hover:text-white"
            aria-label="关闭窗口"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
