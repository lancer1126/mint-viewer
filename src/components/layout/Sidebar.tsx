import { ArrowUpDown, ChevronRight, Folder, FolderOpen, FolderPlus, History, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import type { RecentDirectory } from "@/types";

type SidebarProps = {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  sidebarMinWidth: number;
  sidebarMaxWidth: number;
  sidebarCollapsedWidth: number;
  expandedMenus: Record<string, boolean>;
  hoveredMenu: string | null;
  currentDir: string;
  folderSortMode: "添加时间" | "名称";
  folderSortOpen: boolean;
  sortedFolderDirs: RecentDirectory[];
  recentItems: RecentDirectory[];
  folderSortRef: RefObject<HTMLDivElement | null>;
  onAddDirectory: () => Promise<void>;
  onSetHoveredMenu: (key: string | null) => void;
  onToggleMenu: (key: string) => void;
  onToggleSidebarCollapsed: (collapsed: boolean) => void;
  onStartResize: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onSetFolderSortOpen: (open: boolean) => void;
  onSetFolderSortMode: (mode: "添加时间" | "名称") => void;
  onShowPathTip: (path: string, event: ReactMouseEvent<HTMLElement>) => void;
  onHidePathTip: () => void;
  onOpenFolderContextMenu: (e: ReactMouseEvent<HTMLElement>, path: string) => void;
  onOpenDirectoryInExplorer: (dirPath: string) => Promise<void>;
  onSelectDirectory: (dirPath: string) => Promise<void>;
};

export function Sidebar({
  sidebarCollapsed,
  sidebarWidth,
  sidebarMinWidth,
  sidebarMaxWidth,
  sidebarCollapsedWidth,
  expandedMenus,
  hoveredMenu,
  currentDir,
  folderSortMode,
  folderSortOpen,
  sortedFolderDirs,
  recentItems,
  folderSortRef,
  onAddDirectory,
  onSetHoveredMenu,
  onToggleMenu,
  onToggleSidebarCollapsed,
  onStartResize,
  onSetFolderSortOpen,
  onSetFolderSortMode,
  onShowPathTip,
  onHidePathTip,
  onOpenFolderContextMenu,
  onOpenDirectoryInExplorer,
  onSelectDirectory,
}: SidebarProps) {
  const collapsedBtnClass = "mx-auto h-10 w-10 justify-center rounded-xl p-0";
  const iconSize = sidebarCollapsed ? 18 : 16;
  const iconStroke = sidebarCollapsed ? 2 : 1.8;

  return (
    <aside
      className={`relative shrink-0 overflow-hidden bg-transparent ${sidebarCollapsed ? "p-1" : "p-2.5"}`}
      style={{
        width: sidebarCollapsed ? `${sidebarCollapsedWidth}px` : `${sidebarWidth}px`,
        minWidth: sidebarCollapsed ? `${sidebarCollapsedWidth}px` : `${sidebarMinWidth}px`,
        maxWidth: sidebarCollapsed ? `${sidebarCollapsedWidth}px` : `${sidebarMaxWidth}px`,
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
              onClick={onAddDirectory}
              className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left text-[14px] font-medium text-slate-700 transition hover:bg-black/[0.035]"
            >
              <FolderPlus size={16} strokeWidth={1.8} />
              <span>添加目录</span>
            </button>
            <button
              onClick={() => onToggleSidebarCollapsed(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-black/[0.035]"
              aria-label="折叠侧栏"
            >
              <PanelLeftClose size={17} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onToggleSidebarCollapsed(false)}
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
          const hasChildren = item.key === "folders" ? sortedFolderDirs.length > 0 : recentItems.length > 0;
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="flex flex-col gap-1"
              onMouseEnter={() => onSetHoveredMenu(item.key)}
              onMouseLeave={() => onSetHoveredMenu(hoveredMenu === item.key ? null : hoveredMenu)}
            >
              <div ref={item.key === "folders" ? folderSortRef : null} className="group/folders relative">
                <button
                  onClick={() => onToggleMenu(item.key)}
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
                      onSetFolderSortOpen(!folderSortOpen);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onSetFolderSortOpen(!folderSortOpen);
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
                          onSetFolderSortMode(mode);
                          onSetFolderSortOpen(false);
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
                        onMouseEnter={(e) => onShowPathTip(dir.path, e)}
                        onMouseLeave={onHidePathTip}
                        onContextMenu={(e) => onOpenFolderContextMenu(e, dir.path)}
                        className={`group flex items-center gap-1 rounded-lg pr-1 transition hover:bg-black/[0.03] ${
                          currentDir === dir.path ? "bg-black/[0.04]" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            await onSelectDirectory(dir.path);
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
                            await onOpenDirectoryInExplorer(dir.path);
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
                        onMouseEnter={(e) => onShowPathTip(dir.path, e)}
                        onMouseLeave={onHidePathTip}
                        className={`group flex items-center gap-1 rounded-lg pr-1 transition hover:bg-black/[0.03] ${
                          currentDir === dir.path ? "bg-black/[0.04]" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            await onSelectDirectory(dir.path);
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
                            await onOpenDirectoryInExplorer(dir.path);
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
          onMouseDown={onStartResize}
          role="separator"
          aria-label="调整侧栏宽度"
        />
      )}
    </aside>
  );
}
