import type { RefObject } from "react";

type ImageContextMenuProps = {
  visible: boolean;
  x: number;
  y: number;
  onRevealImage: () => Promise<void>;
  menuRef: RefObject<HTMLDivElement | null>;
};

export function ImageContextMenu({ visible, x, y, onRevealImage, menuRef }: ImageContextMenuProps) {
  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu-enter fixed z-[1000] min-w-[132px] overflow-hidden rounded-xl border border-white/52 bg-[rgba(250,248,244,0.84)] shadow-[0_14px_34px_rgba(148,163,184,0.18),0_2px_10px_rgba(255,255,255,0.24)_inset] backdrop-blur-2xl"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <button
        type="button"
        onClick={onRevealImage}
        className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-black/[0.08] hover:text-slate-900"
      >
        打开本地位置
      </button>
    </div>
  );
}
