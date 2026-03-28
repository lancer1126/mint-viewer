type PathTooltipProps = {
  visible: boolean;
  x: number;
  y: number;
  text: string;
};

export function PathTooltip({ visible, x, y, text }: PathTooltipProps) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed z-[999] max-w-[80vw] rounded-lg border border-slate-300/70 bg-[rgb(241,237,231)] px-2.5 py-1.5 text-[11px] leading-relaxed text-slate-700 shadow-[0_8px_20px_rgba(100,116,139,0.18)]"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <span className={text.length > 96 ? "break-all" : "whitespace-nowrap"}>{text}</span>
    </div>
  );
}
