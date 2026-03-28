type BottomStatusBarProps = {
  currentDir: string;
  count: number;
};

export function BottomStatusBar({ currentDir, count }: BottomStatusBarProps) {
  return (
    <footer className="relative z-20 flex min-h-[30px] shrink-0 items-center justify-between gap-2 px-4 py-1 text-[11px] leading-none text-slate-600">
      <span>当前目录：{currentDir}</span>
      <span>文件数量：{count}</span>
    </footer>
  );
}
