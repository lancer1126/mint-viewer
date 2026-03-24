import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { ChevronLeft, ChevronRight, Folder, FolderPlus, History, Settings } from "lucide-react";

import { Input } from "@/components/ui/input";

type ImageEntry = {
  name: string;
  path: string;
  ext: string;
  size: number;
  modifiedMs: number;
};

type FlatSelectProps = {
  prefix: string;
  value: string;
  options: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
};

function FlatSelect({ prefix, value, options, open, onOpenChange, onChange }: FlatSelectProps) {
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
    <div ref={wrapRef} className="relative inline-block w-fit">
      <button
        onClick={() => onOpenChange(!open)}
        className="inline-flex h-9 w-fit items-center gap-0.5 rounded-xl pl-3 pr-2 text-sm text-[#4d4d4a] transition hover:bg-[#e5e5e6]"
      >
        <span className="shrink-0 text-[#6c6c68]">{prefix}</span>
        <span className="shrink-0 pr-1 truncate text-left">{value}</span>
        <ChevronRight size={16} strokeWidth={2} className="shrink-0 rotate-90" />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-full overflow-hidden rounded-lg border border-[#bdbdb8] bg-[#f5f5f3]">
          {options.map((item) => (
            <button
              key={item}
              onClick={() => {
                onChange(item);
                onOpenChange(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm ${
                item === value ? "bg-[#7d7d7d] text-white" : "text-[#3f4043] hover:bg-[#e5e5e6]"
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

function formatSize(size: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[idx]}`;
}

function colorClassByExt(ext: string): string {
  const map: Record<string, string> = {
    RAW: "from-blue-500 to-blue-300",
    JPG: "from-emerald-500 to-emerald-300",
    JPEG: "from-cyan-500 to-cyan-300",
    PNG: "from-slate-500 to-slate-300",
    WEBP: "from-lime-500 to-lime-300",
    TIFF: "from-indigo-500 to-indigo-300",
    HEIC: "from-violet-500 to-violet-300",
    GIF: "from-teal-500 to-teal-300",
    BMP: "from-zinc-500 to-zinc-300",
  };
  return map[ext] ?? "from-orange-500 to-orange-300";
}

export default function App() {
  const SIDEBAR_MIN = 200;
  const SIDEBAR_MAX = 360;
  const SIDEBAR_COLLAPSED = 50;
  const [images] = useState<ImageEntry[]>([]);
  const [keyword, setKeyword] = useState("");
  const [currentDir, setCurrentDir] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(236);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState("网格视图");
  const [sortMode, setSortMode] = useState("修改时间");
  const [viewOpen, setViewOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const collapsedBtnClass = "mx-auto h-10 w-10 justify-center rounded-xl p-0";
  const iconSize = sidebarCollapsed ? 18 : 16;
  const iconStroke = sidebarCollapsed ? 2 : 1.8;

  const filteredImages = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return images;
    return images.filter((item) => item.name.toLowerCase().includes(kw));
  }, [images, keyword]);

  async function addDirectory() {
    setErrorMsg("");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "选择图片目录",
    });

    if (!selected || Array.isArray(selected)) return;
    setCurrentDir(selected);
  }

  function startResize(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (event: MouseEvent) => {
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth + event.clientX - startX));
      setSidebarWidth(next);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f7fb] text-slate-900">
      <aside
        className={`relative shrink-0 border-r border-black/5 bg-gradient-to-b from-[#f0f0ed] to-[#efefec] shadow-[inset_-1px_0_0_rgba(255,255,255,0.36)] ${
          sidebarCollapsed ? "p-1" : "p-3.5"
        }`}
        style={{
          width: sidebarCollapsed ? `${SIDEBAR_COLLAPSED}px` : `${sidebarWidth}px`,
          minWidth: sidebarCollapsed ? `${SIDEBAR_COLLAPSED}px` : `${SIDEBAR_MIN}px`,
          maxWidth: sidebarCollapsed ? `${SIDEBAR_COLLAPSED}px` : `${SIDEBAR_MAX}px`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-white/[0.03] to-white/10" />

        <nav
          className={`relative z-10 mt-1 flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden pb-16 ${
            sidebarCollapsed ? "items-center" : ""
          }`}
        >
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-1">
              <button
                onClick={addDirectory}
                className="flex flex-1 items-center gap-2 rounded-2xl px-3 py-2 text-left text-[14px] font-medium text-[#4d4d4a] transition hover:bg-[#e5e5e6]"
              >
                <FolderPlus size={16} strokeWidth={1.8} />
                <span>添加目录</span>
              </button>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#4d4d4a] transition hover:bg-[#e5e5e6]"
                aria-label="折叠侧栏"
              >
                <ChevronLeft size={18} strokeWidth={2.1} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className={`mb-1 flex items-center self-center text-[#4d4d4a] transition hover:bg-[#e5e5e6] ${collapsedBtnClass}`}
              aria-label="展开侧栏"
            >
              <ChevronRight size={18} strokeWidth={2.1} />
            </button>
          )}

          {[
            { key: "folders", label: "文件夹", icon: Folder, children: ["mint-viewer", "booklet", "thGovData"] },
            { key: "recent", label: "最近访问", icon: History, children: ["上次浏览目录", "下载截图", "收藏图片"] },
          ].map((item) => {
            const isExpanded = expandedMenu === item.key;
            const isHovered = hoveredMenu === item.key;
            const showChevron = isExpanded || isHovered;
            const Icon = item.icon;

            return (
              <div key={item.key} className="flex flex-col gap-1">
                <button
                  onMouseEnter={() => setHoveredMenu(item.key)}
                  onMouseLeave={() => setHoveredMenu((prev) => (prev === item.key ? null : prev))}
                  onClick={() => setExpandedMenu((prev) => (prev === item.key ? null : item.key))}
                  className={`flex items-center rounded-2xl px-3 py-2 text-left text-[14px] font-medium text-[#3f4043] transition hover:bg-[#e5e5e6] ${
                    sidebarCollapsed ? collapsedBtnClass : "gap-2"
                  }`}
                >
                  {!sidebarCollapsed && showChevron ? (
                    <ChevronRight
                      size={16}
                      strokeWidth={2}
                      className={`transition-transform ${isExpanded ? "rotate-90" : "rotate-0"}`}
                    />
                  ) : (
                    <Icon size={iconSize} strokeWidth={iconStroke} />
                  )}
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>

                {isExpanded && !sidebarCollapsed && (
                  <div className="ml-7 flex flex-col gap-1">
                    {item.children.map((child) => (
                      <button
                        key={child}
                        className="rounded-xl px-2.5 py-1.5 text-left text-[13px] text-[#595a5e] transition hover:bg-[#e5e5e6]"
                      >
                        {child}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div
          className={`absolute z-10 flex flex-col gap-2 ${
            sidebarCollapsed ? "bottom-1 left-1 right-1" : "bottom-2.5 left-3.5 right-3.5"
          }`}
        >
          <button
            className={`flex items-center rounded-xl px-3 py-2 text-left text-[14px] font-medium text-[#4d4d4a] transition hover:bg-[#e5e5e6] ${
              sidebarCollapsed ? collapsedBtnClass : "gap-2"
            }`}
          >
            <Settings size={iconSize} strokeWidth={iconStroke} />
            {!sidebarCollapsed && <span>设置</span>}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div
            className="absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize hover:bg-black/10"
            onMouseDown={startResize}
            role="separator"
            aria-label="调整侧栏宽度"
          />
        )}
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[52px] items-center justify-between gap-3 bg-[#f4f7fb] px-4">
          <div className="flex items-center gap-2">
            <FlatSelect
              prefix="视图："
              value={viewMode}
              options={["网格视图", "列表视图"]}
              open={viewOpen}
              onOpenChange={(open) => {
                setViewOpen(open);
                if (open) setSortOpen(false);
              }}
              onChange={setViewMode}
            />
            <FlatSelect
              prefix="排序："
              value={sortMode}
              options={["修改时间", "名称", "大小", "类型"]}
              open={sortOpen}
              onOpenChange={(open) => {
                setSortOpen(open);
                if (open) setViewOpen(false);
              }}
              onChange={setSortMode}
            />
            <div className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-[#e5e5e6]">
              <span className="shrink-0 whitespace-nowrap text-xs text-[#4d4d4a]">缩放</span>
              <input
                type="range"
                min={80}
                max={240}
                defaultValue={160}
                className="h-1.5 w-24 cursor-pointer appearance-none rounded-lg bg-[#d5d5d2] accent-[#727272]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索当前目录..."
              className="h-9 w-[260px] rounded-xl border-none bg-transparent text-[#4d4d4a] placeholder:text-[#8d8d88] shadow-none transition hover:bg-[#e5e5e6] focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-[#e5e5e6]"
            />
          </div>
        </header>

        {errorMsg && <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{errorMsg}</div>}

        <section className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-3 overflow-auto p-4 pb-12">
          {filteredImages.map((item) => (
            <article key={item.path} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className={`aspect-square bg-gradient-to-br ${colorClassByExt(item.ext)}`} />
              <div className="p-2.5">
                <div className="truncate text-xs font-semibold" title={item.name}>
                  {item.name}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{formatSize(item.size)}</span>
                  <span className="rounded-md border border-slate-300 px-1.5 text-slate-600">{item.ext}</span>
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="absolute bottom-0 left-0 right-0 flex justify-between gap-2 bg-slate-50 px-4 py-2 text-xs text-slate-500">
          <span>当前目录：{currentDir || "未选择"}</span>
          <span>图片数量：{filteredImages.length}</span>
        </div>
      </main>
    </div>
  );
}
