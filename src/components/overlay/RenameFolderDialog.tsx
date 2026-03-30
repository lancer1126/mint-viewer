import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

type RenameFolderDialogProps = {
  visible: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RenameFolderDialog({
  visible,
  value,
  onValueChange,
  onCancel,
  onConfirm,
}: RenameFolderDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!visible) return;
    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
    return () => window.clearTimeout(timeoutId);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [visible, onCancel]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(236,236,232,0.24)] backdrop-blur-sm">
      <div className="w-[min(92vw,360px)] rounded-2xl border border-white/48 bg-[rgba(250,248,244,0.72)] p-4 shadow-[0_18px_46px_rgba(148,163,184,0.22),0_2px_10px_rgba(255,255,255,0.18)_inset] backdrop-blur-2xl">
        <div className="text-[15px] font-semibold text-slate-900">修改名称</div>
        <div className="mt-1 text-xs text-slate-500">仅修改软件内显示名称，不影响本地目录。</div>

        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm();
          }}
        >
          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="输入新的显示名称"
            className="h-10 rounded-xl border-white/45 bg-white/52 text-slate-800 shadow-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:border-slate-300"
          />

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-9 items-center justify-center rounded-xl px-4 text-sm font-medium text-slate-600 transition hover:bg-black/[0.05] hover:text-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              确定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
