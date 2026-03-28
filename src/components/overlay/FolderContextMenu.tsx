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
      className="context-menu-enter fixed z-[1000] min-w-[96px] overflow-hidden rounded-lg bg-[rgba(241,237,231,0.96)] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.22),0_10px_26px_rgba(100,116,139,0.18)]"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <button
        type="button"
        onClick={onOpenDirectory}
        className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-black/[0.05]"
      >
        打开目录
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-500/10"
      >
        移除
      </button>
    </div>
  );
}
