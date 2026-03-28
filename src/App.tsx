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
const FOLDER_DIRS_KEY = "mint-viewer:folder-directories";
const RECENT_VISITS_KEY = "mint-viewer:recent-visits";
const MAX_FOLDER_DIRS = 30;
const MAX_RECENT_VISITS = 10;

type PathTipState = {
  visible: boolean;
  text: string;
  x: number;
  y: number;
};
type FolderContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  path: string;
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
  const [folderDirs, setFolderDirs] = useState<RecentDirectory[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentDirectory[]>([]);
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
  const [dirsStorageReady, setDirsStorageReady] = useState(false);
  const [pathTip, setPathTip] = useState<PathTipState>({ visible: false, text: "", x: 0, y: 0 });
  const [folderMenu, setFolderMenu] = useState<FolderContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    path: "",
  });
  const folderSortRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLElement>(null);
  const collapsedBtnClass = "mx-auto h-10 w-10 justify-center rounded-xl p-0";
  const iconSize = sidebarCollapsed ? 18 : 16;
  const iconStroke = sidebarCollapsed ? 2 : 1.8;
  const sidebarVisualWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth;
  const recentItems = useMemo(() => recentVisits.slice(0, MAX_RECENT_VISITS), [recentVisits]);

  useEffect(() => {
    function sanitizeRecords(input: unknown): RecentDirectory[] {
      if (!Array.isArray(input)) return [];
      return input
        .filter((item) => Boolean((item as RecentDirectory)?.path))
        .map((item) => ({
          path: (item as RecentDirectory).path,
          name: (item as RecentDirectory).name || getDirName((item as RecentDirectory).path),
          lastOpenedAt: Number.isFinite((item as RecentDirectory).lastOpenedAt)
            ? (item as RecentDirectory).lastOpenedAt
            : Date.now(),
        }));
    }

    try {
      const rawFolders = localStorage.getItem(FOLDER_DIRS_KEY);
      const parsedFolders = rawFolders ? (JSON.parse(rawFolders) as unknown) : [];
      const sanitizedFolders = sanitizeRecords(parsedFolders).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
      setFolderDirs(sanitizedFolders.slice(0, MAX_FOLDER_DIRS));

      const rawRecent = localStorage.getItem(RECENT_VISITS_KEY);
      const parsedRecent = rawRecent ? (JSON.parse(rawRecent) as unknown) : [];
      const sanitizedRecent = sanitizeRecords(parsedRecent).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
      setRecentVisits(sanitizedRecent.slice(0, MAX_RECENT_VISITS));
    } catch {
      // Ignore invalid local cache.
    } finally {
      setDirsStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!dirsStorageReady) return;
    localStorage.setItem(FOLDER_DIRS_KEY, JSON.stringify(folderDirs));
  }, [folderDirs, dirsStorageReady]);

  useEffect(() => {
    if (!dirsStorageReady) return;
    localStorage.setItem(RECENT_VISITS_KEY, JSON.stringify(recentVisits));
  }, [recentVisits, dirsStorageReady]);

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
    const items = [...folderDirs];
    if (folderSortMode === "名称") {
      items.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
      return items;
    }
    items.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    return items;
  }, [folderDirs, folderSortMode]);

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

  useEffect(() => {
    if (!folderMenu.visible) return;
    function handleClickOutside(e: MouseEvent) {
      if (!folderMenuRef.current?.contains(e.target as Node)) {
        setFolderMenu((prev) => ({ ...prev, visible: false }));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [folderMenu.visible]);

  async function loadImagesForDirectory(dirPath: string) {
    setIsLoadingImages(true);
    setCurrentDir(dirPath);

    try {
      const result = await invoke<ImageEntry[]>("scan_images", { dir: dirPath });
      setImages(result);
      rememberRecentVisit(dirPath);
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

  function openFolderContextMenu(e: ReactMouseEvent<HTMLElement>, path: string) {
    e.preventDefault();
    setPathTip((prev) => ({ ...prev, visible: false }));
    const menuWidth = 112;
    const menuHeight = 78;
    const offsetX = 14;
    const offsetY = 14;
    const nextX = Math.min(e.clientX + offsetX, window.innerWidth - menuWidth - 8);
    const nextY = Math.min(e.clientY + offsetY, window.innerHeight - menuHeight - 8);
    setFolderMenu({
      visible: true,
      x: Math.max(8, nextX),
      y: Math.max(8, nextY),
      path,
    });
  }

  function rememberFolderDirectory(dirPath: string) {
    const now = Date.now();
    setFolderDirs((prev) => {
      const next: RecentDirectory = {
        path: dirPath,
        name: getDirName(dirPath),
        lastOpenedAt: now,
      };
      return [next, ...prev.filter((item) => item.path !== dirPath)].slice(0, MAX_FOLDER_DIRS);
    });
  }

  function rememberRecentVisit(dirPath: string) {
    const now = Date.now();
    setRecentVisits((prev) => {
      const next: RecentDirectory = {
        path: dirPath,
        name: getDirName(dirPath),
        lastOpenedAt: now,
      };
      return [next, ...prev.filter((item) => item.path !== dirPath)].slice(0, MAX_RECENT_VISITS);
    });
  }

  function removeDirectory(path: string) {
    setFolderDirs((prev) => prev.filter((item) => item.path !== path));
    if (currentDir === path) {
      setCurrentDir("");
      setImages([]);
    }
    setFolderMenu((prev) => ({ ...prev, visible: false }));
  }

  async function addDirectory() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "选择图片目录",
    });

    if (!selected || Array.isArray(selected)) return;
    rememberFolderDirectory(selected);
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
        className="pointer-events-none absolute inset-0 z-0 backdrop-blur-[10px]"
        style={{
          backgroundColor: uiConfig.opacity.sidebarBackground,
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
            const hasChildren = item.key === "folders" ? folderDirs.length > 0 : recentItems.length > 0;
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
                          onContextMenu={(e) => openFolderContextMenu(e, dir.path)}
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
        className="relative z-10 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-none backdrop-blur-[18px]"
        style={{ backgroundColor: `rgba(255,255,255,${uiConfig.opacity.mainPanel})` }}
      >
        {isLoadingImages && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(241,237,231,0.5)] backdrop-blur-[2px]">
            <div className="flex items-center justify-center">
              <div className="loading-11" />
            </div>
          </div>
        )}

        {!currentDir ? (
          <section className="relative z-10 flex flex-1 items-center justify-center px-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <img
                src="/app-icon.png"
                alt="mint viewer"
                className="h-20 w-20 object-contain"
              />
              <span className="text-base text-slate-600">请选择目录后开始浏览图片。</span>
            </div>
          </section>
        ) : (
          <>
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
                  当前目录下没有匹配的图片。
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
              <span>当前目录：{currentDir}</span>
              <span>文件数量：{displayedImages.length}</span>
            </footer>
          </>
        )}
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
      {folderMenu.visible && (
        <div
          ref={folderMenuRef}
          className="context-menu-enter fixed z-[1000] min-w-[96px] overflow-hidden rounded-lg bg-[rgba(241,237,231,0.96)] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.22),0_10px_26px_rgba(100,116,139,0.18)]"
          style={{ left: `${folderMenu.x}px`, top: `${folderMenu.y}px` }}
        >
          <button
            type="button"
            onClick={async () => {
              const path = folderMenu.path;
              setFolderMenu((prev) => ({ ...prev, visible: false }));
              await openDirectoryInExplorer(path);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-black/[0.05]"
          >
            打开目录
          </button>
          <button
            type="button"
            onClick={() => removeDirectory(folderMenu.path)}
            className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-500/10"
          >
            移除
          </button>
        </div>
      )}
    </div>
  );
}
