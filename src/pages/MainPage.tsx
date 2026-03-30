import { type MouseEvent as ReactMouseEvent, type UIEvent, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { uiConfig } from "@/config";
import { useDirectoryStore } from "@/hooks/useDirectoryStore";
import { useImageBrowser } from "@/hooks/useImageBrowser";
import { openImageDetailWindow, pickDirectory, revealDirectory, showErrorPopup, warmUpImageDetailWindow } from "@/services/tauriApi";
import type { FolderContextMenuState, PathTipState, ViewerImage } from "@/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { TitleBar } from "@/components/layout/TitleBar";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { BottomStatusBar } from "@/components/layout/BottomStatusBar";
import { ImageGrid } from "@/components/gallery/ImageGrid";
import { EmptyState } from "@/components/gallery/EmptyState";
import { LoadingOverlay } from "@/components/overlay/LoadingOverlay";
import { PathTooltip } from "@/components/overlay/PathTooltip";
import { FolderContextMenu } from "@/components/overlay/FolderContextMenu";

const appWindow = getCurrentWindow();
const INITIAL_RENDER_COUNT = 180;
const RENDER_STEP = 180;

export function MainPage() {
  const SIDEBAR_MIN = uiConfig.layout.sidebar.minWidth;
  const SIDEBAR_MAX = uiConfig.layout.sidebar.maxWidth;
  const SIDEBAR_COLLAPSED = uiConfig.layout.sidebar.collapsedWidth;
  const TITLEBAR_HEIGHT = uiConfig.layout.titlebarHeight;
  const SIDEBAR_DEFAULT = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, uiConfig.layout.sidebar.defaultWidth));

  const [keyword, setKeyword] = useState("");
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

  const { images, currentDir, isLoadingImages, loadImagesForDirectory, clearCurrentDirectory } = useImageBrowser();
  const { recentItems, sortedFolderDirs, rememberFolderDirectory, rememberRecentVisit, removeFolderDirectory } =
    useDirectoryStore(folderSortMode);

  const sidebarVisualWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth;

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

  useEffect(() => {
    setVisibleCount(INITIAL_RENDER_COUNT);
  }, [currentDir, keyword, sortMode]);

  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [currentDir]);

  useEffect(() => {
    void warmUpImageDetailWindow().catch(() => {
      // Warm-up failure should not block the main page.
    });
  }, []);

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

  async function addDirectory() {
    const selected = await pickDirectory();
    if (!selected || Array.isArray(selected)) return;
    rememberFolderDirectory(selected);
    await loadImagesForDirectory(selected, () => rememberRecentVisit(selected));
  }

  async function openDirectoryInExplorer(dirPath: string) {
    try {
      await revealDirectory(dirPath);
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

  function removeDirectory(path: string) {
    removeFolderDirectory(path);
    if (currentDir === path) {
      clearCurrentDirectory();
    }
    setFolderMenu((prev) => ({ ...prev, visible: false }));
  }

  async function selectDirectory(dirPath: string) {
    await loadImagesForDirectory(dirPath, () => rememberRecentVisit(dirPath));
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

  function handleGridScroll(e: UIEvent<HTMLElement>) {
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

      <TitleBar
        onMinimize={minimizeWindow}
        onMaximize={maximizeWindow}
        onClose={closeWindow}
        onStartDrag={startWindowDrag}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          sidebarCollapsed={sidebarCollapsed}
          sidebarWidth={sidebarWidth}
          sidebarMinWidth={SIDEBAR_MIN}
          sidebarMaxWidth={SIDEBAR_MAX}
          sidebarCollapsedWidth={SIDEBAR_COLLAPSED}
          expandedMenus={expandedMenus}
          hoveredMenu={hoveredMenu}
          currentDir={currentDir}
          folderSortMode={folderSortMode}
          folderSortOpen={folderSortOpen}
          sortedFolderDirs={sortedFolderDirs}
          recentItems={recentItems}
          folderSortRef={folderSortRef}
          onAddDirectory={addDirectory}
          onSetHoveredMenu={setHoveredMenu}
          onToggleMenu={(key) =>
            setExpandedMenus((prev) => ({
              ...prev,
              [key]: !prev[key],
            }))
          }
          onToggleSidebarCollapsed={setSidebarCollapsed}
          onStartResize={startResize}
          onSetFolderSortOpen={setFolderSortOpen}
          onSetFolderSortMode={setFolderSortMode}
          onShowPathTip={showPathTip}
          onHidePathTip={hidePathTip}
          onOpenFolderContextMenu={openFolderContextMenu}
          onOpenDirectoryInExplorer={openDirectoryInExplorer}
          onSelectDirectory={selectDirectory}
        />

        <main
          className="relative z-10 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-none backdrop-blur-[18px]"
          style={{ backgroundColor: `rgba(255,255,255,${uiConfig.opacity.mainPanel})` }}
        >
          {isLoadingImages && <LoadingOverlay />}

          {!currentDir ? (
            <EmptyState />
          ) : (
            <>
              <TopToolbar
                viewMode={viewMode}
                sortMode={sortMode}
                viewOpen={viewOpen}
                sortOpen={sortOpen}
                keyword={keyword}
                onViewModeChange={setViewMode}
                onSortModeChange={setSortMode}
                onViewOpenChange={(open) => {
                  setViewOpen(open);
                  if (open) setSortOpen(false);
                }}
                onSortOpenChange={(open) => {
                  setSortOpen(open);
                  if (open) setViewOpen(false);
                }}
                onKeywordChange={setKeyword}
              />

              <ImageGrid
                images={displayedImages}
                renderedImages={renderedImages}
                isLoadingImages={isLoadingImages}
                gridRef={gridRef}
                onScroll={handleGridScroll}
                onImageClick={async (_item, index) => {
                  try {
                    const viewerImages: ViewerImage[] = displayedImages.map((img) => ({
                      path: img.path,
                      name: img.name,
                    }));
                    await openImageDetailWindow(viewerImages, index);
                  } catch (err) {
                    const text = err instanceof Error ? err.message : String(err);
                    await showErrorPopup(`打开图片详情失败：${text}`);
                  }
                }}
              />

              <BottomStatusBar currentDir={currentDir} count={displayedImages.length} />
            </>
          )}
        </main>
      </div>

      <PathTooltip visible={pathTip.visible} text={pathTip.text} x={pathTip.x} y={pathTip.y} />

      <FolderContextMenu
        visible={folderMenu.visible}
        x={folderMenu.x}
        y={folderMenu.y}
        menuRef={folderMenuRef}
        onOpenDirectory={async () => {
          const path = folderMenu.path;
          setFolderMenu((prev) => ({ ...prev, visible: false }));
          await openDirectoryInExplorer(path);
        }}
        onRemove={() => removeDirectory(folderMenu.path)}
      />
    </div>
  );
}
