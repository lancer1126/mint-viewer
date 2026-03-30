import type { RefObject } from "react";

type FolderContextMenuProps = {
  visible: boolean;
  x: number;
  y: number;
  onOpenDirectory: () => Promise<void>;
  onRemove: () => void;
  menuRef: RefObject<HTMLDivElement | null>;
};

export function FolderContextMenu({ visible, x, y, onOpenDirectory, onRemove, menuRef }: FolderContextMenuProps) {
  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu-enter fixed z-[1000] min-w-[118px] overflow-hidden rounded-xl border border-white/48 bg-[rgba(250,248,244,0.58)] shadow-[0_14px_34px_rgba(148,163,184,0.18),0_2px_10px_rgba(255,255,255,0.2)_inset] backdrop-blur-2xl"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <button
        type="button"
        onClick={onOpenDirectory}
        className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-black/[0.08] hover:text-slate-900"
      >
        打开目录
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="block w-full px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors duration-150 hover:bg-[rgba(244,63,94,0.14)] hover:text-rose-700"
      >
        移除
      </button>
    </div>
  );
}
