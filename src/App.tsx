import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { message, open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { ArrowUpDown, ChevronRight, Folder, FolderOpen, FolderPlus, History, Minus, PanelLeftClose, PanelLeftOpen, Settings, Square, X } from "lucide-react";
import { uiConfig } from "@/config";
import type { FlatSelectProps, ImageEntry, RecentDirectory } from "@/types";

import { Input } from "@/components/ui/input";

const appWindow = getCurrentWindow();
const RECENT_DIRS_KEY = "mint-viewer:recent-directories";
const MAX_RECENT_DIRS = 30;

type PathTipState = {
  visible: boolean;
  text: string;
  x: number;
  y: number;
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

function getDirName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

async function showErrorPopup(text: string) {
  try {
    await message(text, {
      title: "操作失败",
      kind: "error",
    });
  } catch {
    window.alert(text);
  }
}

const INITIAL_RENDER_COUNT = 180;
const RENDER_STEP = 180;

export default function App() {
  const SIDEBAR_MIN = uiConfig.layout.sidebar.minWidth;
  const SIDEBAR_MAX = uiConfig.layout.sidebar.maxWidth;
  const SIDEBAR_COLLAPSED = uiConfig.layout.sidebar.collapsedWidth;
  const TITLEBAR_HEIGHT = uiConfig.layout.titlebarHeight;
  const SIDEBAR_DEFAULT = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, uiConfig.layout.sidebar.defaultWidth));
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [recentDirs, setRecentDirs] = useState<RecentDirectory[]>([]);
  const [keyword, setKeyword] = useState("");
  const [currentDir, setCurrentDir] = useState("");
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState("网格视图");
  const [sortMode, setSortMode] = useState("修改时间");
  const [folderSortMode, setFolderSortMode] = useState<"添加时间" | "名称">("添加时间");
  const [folderSortOpen, setFolderSortOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);
  const [recentDirsReady, setRecentDirsReady] = useState(false);
  const [pathTip, setPathTip] = useState<PathTipState>({ visible: false, text: "", x: 0, y: 0 });
  const folderSortRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLElement>(null);
  const collapsedBtnClass = "mx-auto h-10 w-10 justify-center rounded-xl p-0";
  const iconSize = sidebarCollapsed ? 18 : 16;
  const iconStroke = sidebarCollapsed ? 2 : 1.8;
  const sidebarVisualWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth;
  const recentItems = useMemo(() => recentDirs.slice(0, 8), [recentDirs]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_DIRS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RecentDirectory[];
      if (!Array.isArray(parsed)) return;
      const sanitized = parsed
        .filter((item) => Boolean(item?.path))
        .map((item) => ({
          path: item.path,
          name: item.name || getDirName(item.path),
          lastOpenedAt: Number.isFinite(item.lastOpenedAt) ? item.lastOpenedAt : Date.now(),
        }))
        .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
      setRecentDirs(sanitized.slice(0, MAX_RECENT_DIRS));
    } catch {
      // Ignore invalid local cache.
    } finally {
      setRecentDirsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!recentDirsReady) return;
    localStorage.setItem(RECENT_DIRS_KEY, JSON.stringify(recentDirs));
  }, [recentDirs, recentDirsReady]);

  const displayedImages = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filtered = kw ? images.filter((item) => item.name.toLowerCase().includes(kw)) : images;
    const sorted = [...filtered];

    if (sortMode === "名称") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    } else if (sortMode === "大小") {
      sorted.sort((a, b) => b.size - a.size);
    } else if (sortMode === "类型") {
      sorted.sort((a, b) => a.ext.localeCompare(b.ext));
    } else {
      sorted.sort((a, b) => b.modifiedMs - a.modifiedMs);
    }

    return sorted;
  }, [images, keyword, sortMode]);
  const renderedImages = useMemo(() => displayedImages.slice(0, visibleCount), [displayedImages, visibleCount]);
  const sortedFolderDirs = useMemo(() => {
    const items = [...recentDirs];
    if (folderSortMode === "名称") {
      items.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
      return items;
    }
    items.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    return items;
  }, [recentDirs, folderSortMode]);

  useEffect(() => {
    setVisibleCount(INITIAL_RENDER_COUNT);
  }, [currentDir, keyword, sortMode]);

  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [currentDir]);

  useEffect(() => {
    if (!folderSortOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (!folderSortRef.current?.contains(e.target as Node)) {
        setFolderSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [folderSortOpen]);

  async function loadImagesForDirectory(dirPath: string) {
    setIsLoadingImages(true);
    setCurrentDir(dirPath);

    try {
      const result = await invoke<ImageEntry[]>("scan_images", { dir: dirPath });
      setImages(result);
    } catch (err) {
      setImages([]);
      const message = err instanceof Error ? err.message : "读取目录失败";
      await showErrorPopup(message);
    } finally {
      setIsLoadingImages(false);
    }
  }

  async function openDirectoryInExplorer(dirPath: string) {
    try {
      await revealItemInDir(dirPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await showErrorPopup(`打开目录失败：${msg}`);
    }
  }

  function showPathTip(path: string, event: ReactMouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const maxWidth = Math.floor(window.innerWidth * 0.8);
    const preferredX = rect.left + 24;
    const clampedX = Math.max(12, Math.min(preferredX, window.innerWidth - maxWidth - 12));
    const nextY = Math.min(rect.bottom + 6, window.innerHeight - 40);
    setPathTip({ visible: true, text: path, x: clampedX, y: nextY });
  }

  function hidePathTip() {
    setPathTip((prev) => ({ ...prev, visible: false }));
  }

  function rememberDirectory(dirPath: string) {
    const now = Date.now();
    setRecentDirs((prev) => {
      const next: RecentDirectory = {
        path: dirPath,
        name: getDirName(dirPath),
        lastOpenedAt: now,
      };
      return [next, ...prev.filter((item) => item.path !== dirPath)].slice(0, MAX_RECENT_DIRS);
    });
  }

  async function addDirectory() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "选择图片目录",
    });

    if (!selected || Array.isArray(selected)) return;
    rememberDirectory(selected);
    await loadImagesForDirectory(selected);
  }

  async function minimizeWindow() {
    await appWindow.minimize();
  }

  async function maximizeWindow() {
    await appWindow.toggleMaximize();
  }

  async function closeWindow() {
    await appWindow.close();
  }

  async function startWindowDrag() {
    await appWindow.startDragging();
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

  function handleGridScroll(e: React.UIEvent<HTMLElement>) {
    if (isLoadingImages) return;
    const target = e.currentTarget;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 320;
    if (nearBottom && visibleCount < displayedImages.length) {
      setVisibleCount((prev) => Math.min(prev + RENDER_STEP, displayedImages.length));
    }
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-transparent text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 z-0 backdrop-blur-[18px]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(247,244,239,${uiConfig.opacity.sidebarPanelTop}), rgba(241,237,231,${uiConfig.opacity.sidebarPanelBottom}))`,
          clipPath: `polygon(0 0, 100% 0, 100% ${TITLEBAR_HEIGHT}px, ${sidebarVisualWidth}px ${TITLEBAR_HEIGHT}px, ${sidebarVisualWidth}px 100%, 0 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,${uiConfig.opacity.sidebarOverlayTop}), rgba(255,255,255,${uiConfig.opacity.sidebarOverlayBottom}))`,
          clipPath: `polygon(0 0, 100% 0, 100% ${TITLEBAR_HEIGHT}px, ${sidebarVisualWidth}px ${TITLEBAR_HEIGHT}px, ${sidebarVisualWidth}px 100%, 0 100%)`,
        }}
      />

      <header className="relative z-20 h-7 shrink-0 bg-transparent">
        <div className="flex h-full items-center justify-between">
          <div
            className="flex min-w-0 flex-1 cursor-default items-center px-4 text-[13px] font-medium text-slate-700"
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              if (e.detail >= 2) return;
              void startWindowDrag();
            }}
            onDoubleClick={(e) => {
              if (e.button !== 0) return;
              void maximizeWindow();
            }}
          >
            <span className="truncate">
              app
            </span>
          </div>

          <div
            className="h-full flex-1"
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              if (e.detail >= 2) return;
              void startWindowDrag();
            }}
            onDoubleClick={(e) => {
              if (e.button !== 0) return;
              void maximizeWindow();
            }}
          />

          <div className="flex shrink-0 items-stretch">
            <button
              type="button"
              onClick={minimizeWindow}
              className="flex h-7 w-11 items-center justify-center text-slate-700 transition hover:bg-black/[0.04]"
              aria-label="最小化窗口"
            >
              <Minus size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={maximizeWindow}
              className="flex h-7 w-11 items-center justify-center text-slate-700 transition hover:bg-black/[0.04]"
              aria-label="最大化窗口"
            >
              <Square size={14} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={closeWindow}
              className="flex h-7 w-11 items-center justify-center text-slate-700 transition hover:bg-[#c42b1c] hover:text-white"
              aria-label="关闭窗口"
            >
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <aside
        className={`relative shrink-0 overflow-hidden bg-transparent ${
          sidebarCollapsed ? "p-1" : "p-2.5"
        }`}
        style={{
          width: sidebarCollapsed ? `${SIDEBAR_COLLAPSED}px` : `${sidebarWidth}px`,
          minWidth: sidebarCollapsed ? `${SIDEBAR_COLLAPSED}px` : `${SIDEBAR_MIN}px`,
          maxWidth: sidebarCollapsed ? `${SIDEBAR_COLLAPSED}px` : `${SIDEBAR_MAX}px`,
        }}
      >
        <nav
          className={`relative z-10 mt-1 flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden pb-16 ${
            sidebarCollapsed ? "items-center" : ""
          }`}
        >
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-1">
              <button
                onClick={addDirectory}
                className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left text-[14px] font-medium text-slate-700 transition hover:bg-black/[0.035]"
              >
                <FolderPlus size={16} strokeWidth={1.8} />
                <span>添加目录</span>
              </button>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-black/[0.035]"
                aria-label="折叠侧栏"
              >
                <PanelLeftClose size={17} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className={`mb-1 flex items-center self-center text-slate-700 transition hover:bg-black/[0.035] ${collapsedBtnClass}`}
              aria-label="展开侧栏"
            >
              <PanelLeftOpen size={17} strokeWidth={2} />
            </button>
          )}

          {[
            { key: "folders", label: "目录集", icon: Folder },
            { key: "recent", label: "最近访问", icon: History },
          ].map((item) => {
            const isExpanded = Boolean(expandedMenus[item.key]);
            const isHovered = hoveredMenu === item.key;
            const showChevron = isExpanded || isHovered;
            const hasChildren = item.key === "folders" ? recentDirs.length > 0 : recentItems.length > 0;
            const Icon = item.icon;

            return (
              <div
                key={item.key}
                className="flex flex-col gap-1"
                onMouseEnter={() => setHoveredMenu(item.key)}
                onMouseLeave={() => setHoveredMenu((prev) => (prev === item.key ? null : prev))}
              >
                <div ref={item.key === "folders" ? folderSortRef : null} className="group/folders relative">
                  <button
                    onClick={() =>
                      setExpandedMenus((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key],
                      }))
                    }
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-[14px] font-medium text-slate-700 transition hover:bg-black/[0.035] ${
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

                  {!sidebarCollapsed && item.key === "folders" && (
                    <span
                      role="button"
                      tabIndex={0}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderSortOpen((prev) => !prev);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setFolderSortOpen((prev) => !prev);
                        }
                      }}
                      className={`absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-500 transition hover:bg-black/[0.06] hover:text-slate-700 ${
                        folderSortOpen
                          ? "pointer-events-auto opacity-100"
                          : "pointer-events-none opacity-0 group-hover/folders:pointer-events-auto group-hover/folders:opacity-100"
                      }`}
                    >
                      <ArrowUpDown size={14} strokeWidth={2} />
                    </span>
                  )}

                  {!sidebarCollapsed && item.key === "folders" && folderSortOpen && (
                    <div className="absolute right-2 top-[calc(100%+2px)] z-40 w-[108px] overflow-hidden rounded-md bg-[rgba(241,237,231,0.9)] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12),0_8px_18px_rgba(148,163,184,0.12)] backdrop-blur-sm">
                      {(["添加时间", "名称"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setFolderSortMode(mode);
                            setFolderSortOpen(false);
                          }}
                          className={`block w-full px-3 py-1.5 text-left text-xs transition ${
                            folderSortMode === mode ? "bg-black/[0.06] text-slate-900" : "text-slate-700 hover:bg-black/[0.035]"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isExpanded && !sidebarCollapsed && hasChildren && (
                  <div className="ml-0 flex flex-col gap-1">
                    {item.key === "folders" &&
                      sortedFolderDirs.map((dir) => (
                        <div
                          key={dir.path}
                          onMouseEnter={(e) => showPathTip(dir.path, e)}
                          onMouseLeave={hidePathTip}
                          className={`group flex items-center gap-1 rounded-lg pr-1 transition hover:bg-black/[0.03] ${
                            currentDir === dir.path ? "bg-black/[0.04]" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={async () => {
                              await loadImagesForDirectory(dir.path);
                            }}
                            className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-[13px] ${
                              currentDir === dir.path ? "text-slate-800" : "text-slate-500"
                            }`}
                          >
                            <span aria-hidden className="h-4 w-4 shrink-0" />
                            <span className="block min-w-0 flex-1 truncate">{dir.name}</span>
                          </button>
                          <button
                            type="button"
                            title="在资源管理器中打开"
                            aria-label={`在资源管理器中打开 ${dir.name}`}
                            onClick={async () => {
                              await openDirectoryInExplorer(dir.path);
                            }}
                            className="ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition hover:bg-black/[0.06] hover:text-slate-700 group-hover:opacity-100"
                          >
                            <FolderOpen size={14} strokeWidth={2} />
                          </button>
                        </div>
                      ))}

                    {item.key === "recent" &&
                      recentItems.map((dir) => (
                        <div
                          key={`recent-${dir.path}`}
                          onMouseEnter={(e) => showPathTip(dir.path, e)}
                          onMouseLeave={hidePathTip}
                          className={`group flex items-center gap-1 rounded-lg pr-1 transition hover:bg-black/[0.03] ${
                            currentDir === dir.path ? "bg-black/[0.04]" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={async () => {
                              await loadImagesForDirectory(dir.path);
                            }}
                            className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-[13px] ${
                              currentDir === dir.path ? "text-slate-800" : "text-slate-500"
                            }`}
                          >
                            <span aria-hidden className="h-4 w-4 shrink-0" />
                            <span className="block min-w-0 flex-1 truncate">{dir.name}</span>
                          </button>
                          <button
                            type="button"
                            title="在资源管理器中打开"
                            aria-label={`在资源管理器中打开 ${dir.name}`}
                            onClick={async () => {
                              await openDirectoryInExplorer(dir.path);
                            }}
                            className="ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition hover:bg-black/[0.06] hover:text-slate-700 group-hover:opacity-100"
                          >
                            <FolderOpen size={14} strokeWidth={2} />
                          </button>
                        </div>
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
            className={`flex items-center rounded-xl px-3 py-2 text-left text-[14px] font-medium text-slate-700 transition hover:bg-black/[0.035] ${
              sidebarCollapsed ? collapsedBtnClass : "gap-2"
            }`}
          >
            <Settings size={iconSize} strokeWidth={iconStroke} />
            {!sidebarCollapsed && <span>设置</span>}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div
            className="absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize hover:bg-black/[0.04]"
            onMouseDown={startResize}
            role="separator"
            aria-label="调整侧栏宽度"
          />
        )}
      </aside>

      <main
        className="relative z-10 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-l-[28px] backdrop-blur-[18px]"
        style={{ backgroundColor: `rgba(255,255,255,${uiConfig.opacity.mainPanel})` }}
      >
        {isLoadingImages && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(241,237,231,0.5)] backdrop-blur-[2px]">
            <div className="flex items-center justify-center">
              <div className="loading-11" />
            </div>
          </div>
        )}

        <header className="relative z-40 flex min-h-[48px] items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-1">
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
            <div className="ml-0.5 flex shrink-0 items-center gap-1.5 rounded-xl bg-transparent px-2.5 py-1.5 transition hover:bg-black/[0.05]">
              <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">缩放</span>
              <input
                type="range"
                min={80}
                max={240}
                defaultValue={160}
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-slate-300/45 accent-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索当前目录..."
              className="h-8 w-[260px] rounded-xl border-0 border-transparent bg-transparent text-slate-700 shadow-none outline-none placeholder:text-slate-500 transition hover:bg-black/[0.05] focus:bg-black/[0.05] focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 focus-visible:shadow-none"
            />
          </div>
        </header>

        <section
          ref={gridRef}
          onScroll={handleGridScroll}
          className="main-scrollbar relative z-10 grid auto-rows-[240px] flex-1 grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-4 overflow-auto px-5 pb-4 pt-3"
        >
          {!isLoadingImages && displayedImages.length === 0 && (
            <div className="col-span-full rounded-2xl bg-white/20 px-4 py-3 text-sm text-slate-600">
              {currentDir ? "当前目录下没有匹配的图片。" : "请选择目录后开始浏览图片。"}
            </div>
          )}
          {renderedImages.map((item) => (
            <article
              key={item.path}
              className="flex h-[240px] flex-col overflow-hidden rounded-[22px] border border-black/8 bg-white/42 shadow-[0_10px_24px_rgba(100,116,139,0.12)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/50"
            >
              <div className={`h-[164px] w-full overflow-hidden bg-gradient-to-br ${colorClassByExt(item.ext)}`}>
                <img
                  src={convertFileSrc(item.path)}
                  alt={item.name}
                  loading="lazy"
                  className="block h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.opacity = "0";
                  }}
                />
              </div>
              <div className="p-3">
                <div className="truncate text-xs font-semibold text-slate-900" title={item.name}>
                  {item.name}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-700">
                  <span>{formatSize(item.size)}</span>
                  <span className="rounded-full bg-white/55 px-2 py-0.5 text-slate-800 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]">{item.ext}</span>
                </div>
              </div>
            </article>
          ))}
          {!isLoadingImages && renderedImages.length < displayedImages.length && (
            <div className="col-span-full rounded-2xl bg-white/16 px-4 py-2 text-center text-xs text-slate-500">
              已加载 {renderedImages.length} / {displayedImages.length}，继续下滑加载更多...
            </div>
          )}
        </section>

        <footer className="relative z-20 flex min-h-[30px] shrink-0 items-center justify-between gap-2 px-4 py-1 text-[11px] leading-none text-slate-600">
          <span>当前目录：{currentDir || "未选择"}</span>
          <span>文件数量：{displayedImages.length}</span>
        </footer>
      </main>
      </div>
      {pathTip.visible && (
        <div
          className="pointer-events-none fixed z-[999] max-w-[80vw] rounded-lg border border-slate-300/70 bg-[rgb(241,237,231)] px-2.5 py-1.5 text-[11px] leading-relaxed text-slate-700 shadow-[0_8px_20px_rgba(100,116,139,0.18)]"
          style={{ left: `${pathTip.x}px`, top: `${pathTip.y}px` }}
        >
          <span className={pathTip.text.length > 96 ? "break-all" : "whitespace-nowrap"}>{pathTip.text}</span>
        </div>
      )}
    </div>
  );
}
