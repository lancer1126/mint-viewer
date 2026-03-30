import { useEffect, useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, RotateCw, X } from "lucide-react";
import type { ViewerImage } from "@/types";

type ViewerSession = {
  images: ViewerImage[];
  initialIndex: number;
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.12;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function readSession(): ViewerSession | null {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session");
  if (!sessionId) return null;
  const raw = localStorage.getItem(`mint-viewer:image-session:${sessionId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ViewerSession;
    if (!Array.isArray(parsed.images) || parsed.images.length === 0) return null;
    const initialIndex = Math.min(parsed.images.length - 1, Math.max(0, parsed.initialIndex ?? 0));
    return {
      images: parsed.images,
      initialIndex,
    };
  } catch {
    return null;
  }
}

function readSessionById(sessionId: string): ViewerSession | null {
  const raw = localStorage.getItem(`mint-viewer:image-session:${sessionId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ViewerSession;
    if (!Array.isArray(parsed.images) || parsed.images.length === 0) return null;
    const initialIndex = Math.min(parsed.images.length - 1, Math.max(0, parsed.initialIndex ?? 0));
    return {
      images: parsed.images,
      initialIndex,
    };
  } catch {
    return null;
  }
}

export function ImageViewerPage() {
  const viewerWindow = getCurrentWindow();
  const initialSession = useMemo(() => readSession(), []);
  const [session, setSession] = useState<ViewerSession | null>(initialSession);
  const [index, setIndex] = useState(initialSession?.initialIndex ?? 0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(false);

  const images = session?.images ?? [];
  const current = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  async function startWindowDrag() {
    try {
      await viewerWindow.startDragging();
    } catch {
      // Ignore drag failures.
    }
  }

  async function closeViewerWindow() {
    try {
      await viewerWindow.hide();
      const mainWindow = await Window.getByLabel("main");
      if (mainWindow) {
        await mainWindow.setFocus();
      }
    } catch {
      try {
        await viewerWindow.hide();
      } catch {
        // Ignore hard-close fallback errors.
      }
    }
  }

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void viewerWindow.listen<{ sessionId: string }>("mint://viewer-session", (event) => {
      const nextSession = readSessionById(event.payload.sessionId);
      if (!nextSession) return;
      setSession(nextSession);
      setIndex(nextSession.initialIndex);
      setZoom(1);
      setRotation(0);
    }).then((fn) => {
      unlisten = fn;
    });
    void Window.getByLabel("main").then((mainWindow) => mainWindow?.emit("mint://viewer-ready"));

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && hasPrev) {
        setIndex((prev) => Math.max(0, prev - 1));
        setZoom(1);
        setRotation(0);
      } else if (e.key === "ArrowRight" && hasNext) {
        setIndex((prev) => Math.min(images.length - 1, prev + 1));
        setZoom(1);
        setRotation(0);
      } else if (e.key === "Escape") {
        void closeViewerWindow();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      if (unlisten) unlisten();
    };
  }, [hasNext, hasPrev, images.length, viewerWindow]);

  if (!current) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[rgba(246,246,243,0.72)] text-slate-600 backdrop-blur-[36px]">
        未找到图片会话，请从主页面重新打开。
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[rgba(243,243,239,0.22)] text-slate-100"
      onMouseEnter={() => setChromeVisible(true)}
      onMouseLeave={() => setChromeVisible(false)}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-[-16%] bg-[radial-gradient(circle_at_10%_18%,rgba(171,216,238,0.28),transparent_30%),radial-gradient(circle_at_34%_78%,rgba(210,229,244,0.14),transparent_28%),radial-gradient(circle_at_58%_50%,rgba(245,220,201,0.2),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(205,197,243,0.18),transparent_26%),radial-gradient(circle_at_82%_84%,rgba(255,216,196,0.12),transparent_24%),linear-gradient(180deg,rgba(248,248,244,0.44),rgba(235,233,229,0.36))]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] backdrop-blur-[72px]" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_50%,rgba(148,163,184,0.06)_100%)]" />

      <div
        className="absolute left-0 top-0 z-10 h-14 w-full"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if (e.detail >= 2) return;
          void startWindowDrag();
        }}
      />

      <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-[min(82vw,760px)] -translate-x-1/2 text-center">
        <span className="block truncate text-sm text-slate-700/90">{current.name}</span>
      </div>

      <button
        type="button"
        onClick={() => void closeViewerWindow()}
        className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center text-slate-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.08] hover:text-slate-950"
        aria-label="关闭窗口"
      >
        <X size={18} />
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={() => {
            setIndex((prev) => Math.max(0, prev - 1));
            setZoom(1);
            setRotation(0);
          }}
          className={`absolute left-4 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/18 text-slate-700 shadow-[0_10px_30px_rgba(148,163,184,0.12)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1/2 hover:scale-[1.08] hover:bg-white/66 hover:text-slate-950 hover:shadow-[0_18px_38px_rgba(148,163,184,0.24)] ${
            chromeVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-label="上一张"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={() => {
            setIndex((prev) => Math.min(images.length - 1, prev + 1));
            setZoom(1);
            setRotation(0);
          }}
          className={`absolute right-4 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/18 text-slate-700 shadow-[0_10px_30px_rgba(148,163,184,0.12)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1/2 hover:scale-[1.08] hover:bg-white/66 hover:text-slate-950 hover:shadow-[0_18px_38px_rgba(148,163,184,0.24)] ${
            chromeVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-label="下一张"
        >
          <ChevronRight size={24} />
        </button>
      )}

      <div
        className="flex h-full w-full items-center justify-center p-14"
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
          setZoom((prev) => clampZoom(prev + delta));
        }}
      >
        <img
          src={convertFileSrc(current.path)}
          alt={current.name}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-75"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          draggable={false}
        />
      </div>

      <div className="absolute bottom-5 left-1/2 z-20 h-12 w-[min(92vw,960px)] -translate-x-1/2 px-2 py-2 text-xs text-slate-700">
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5">
          <span className="w-14 text-center tabular-nums text-slate-600">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((prev) => clampZoom(prev - ZOOM_STEP))}
            className="group relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/38 bg-white/26 text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.1)] backdrop-blur-lg transition duration-150 hover:bg-white/50 hover:text-slate-900"
            aria-label="缩小"
          >
            <Minus size={15} />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900/78 px-1.5 py-0.5 text-[10px] text-slate-100 group-hover:block">
              缩小
            </span>
          </button>
          <button
            type="button"
            onClick={() => setZoom((prev) => clampZoom(prev + ZOOM_STEP))}
            className="group relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/38 bg-white/26 text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.1)] backdrop-blur-lg transition duration-150 hover:bg-white/50 hover:text-slate-900"
            aria-label="放大"
          >
            <Plus size={15} />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900/78 px-1.5 py-0.5 text-[10px] text-slate-100 group-hover:block">
              放大
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRotation((prev) => prev - 90)}
            className="group relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/38 bg-white/26 text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.1)] backdrop-blur-lg transition duration-150 hover:bg-white/50 hover:text-slate-900"
            aria-label="左转"
          >
            <RotateCcw size={14} />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900/78 px-1.5 py-0.5 text-[10px] text-slate-100 group-hover:block">
              左转
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRotation((prev) => prev + 90)}
            className="group relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/38 bg-white/26 text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.1)] backdrop-blur-lg transition duration-150 hover:bg-white/50 hover:text-slate-900"
            aria-label="右转"
          >
            <RotateCw size={14} />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900/78 px-1.5 py-0.5 text-[10px] text-slate-100 group-hover:block">
              右转
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setRotation(0);
            }}
            className="group relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/38 bg-white/26 text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.1)] backdrop-blur-lg transition duration-150 hover:bg-white/50 hover:text-slate-900"
            aria-label="重置"
          >
            <RotateCcw size={15} className="rotate-[-45deg]" />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900/78 px-1.5 py-0.5 text-[10px] text-slate-100 group-hover:block">
              重置
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
