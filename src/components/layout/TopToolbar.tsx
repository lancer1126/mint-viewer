import { Input } from "@/components/ui/input";
import { FlatSelect } from "@/components/common/FlatSelect";

type TopToolbarProps = {
  viewMode: string;
  sortMode: string;
  viewOpen: boolean;
  sortOpen: boolean;
  keyword: string;
  zoomValue: number;
  onViewModeChange: (value: string) => void;
  onSortModeChange: (value: string) => void;
  onViewOpenChange: (open: boolean) => void;
  onSortOpenChange: (open: boolean) => void;
  onKeywordChange: (value: string) => void;
  onZoomChange: (value: number) => void;
};

export function TopToolbar({
  viewMode,
  sortMode,
  viewOpen,
  sortOpen,
  keyword,
  zoomValue,
  onViewModeChange,
  onSortModeChange,
  onViewOpenChange,
  onSortOpenChange,
  onKeywordChange,
  onZoomChange,
}: TopToolbarProps) {
  const isListView = viewMode === "列表";

  return (
    <header className="relative z-40 flex min-h-[48px] items-center justify-between gap-3 px-4">
      <div className="flex items-center gap-1">
        <FlatSelect
          prefix="视图："
          value={viewMode}
          options={["网格", "列表"]}
          open={viewOpen}
          onOpenChange={onViewOpenChange}
          onChange={onViewModeChange}
        />
        <FlatSelect
          prefix="排序："
          value={sortMode}
          options={["修改时间", "名称", "大小", "类型"]}
          open={sortOpen}
          onOpenChange={onSortOpenChange}
          onChange={onSortModeChange}
        />
        <div
          className={`ml-0.5 flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition ${
            isListView ? "bg-black/[0.02] opacity-45" : "bg-transparent hover:bg-black/[0.05]"
          }`}
        >
          <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">缩放</span>
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={zoomValue}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            disabled={isListView}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-slate-300/45 accent-slate-600 disabled:cursor-default"
          />
          <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
            {zoomValue}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="搜索当前目录..."
          className="h-8 w-[260px] rounded-xl border-0 border-transparent bg-transparent text-slate-700 shadow-none outline-none placeholder:text-slate-500 transition hover:bg-black/[0.05] focus:bg-black/[0.05] focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 focus-visible:shadow-none"
        />
      </div>
    </header>
  );
}
