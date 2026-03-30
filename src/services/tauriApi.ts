import { invoke } from "@tauri-apps/api/core";
import { message, open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import type { ImageEntry, ViewerImage } from "@/types";

const IMAGE_VIEWER_LABEL = "image-viewer";
const IMAGE_VIEWER_BASE_QUERY = new URLSearchParams({
  viewer: "1",
  preload: "1",
}).toString();

let viewerWindowPromise: Promise<Window> | null = null;
let viewerReadyPromise: Promise<void> | null = null;
let viewerReady = false;
let viewerMicaPromise: Promise<void> | null = null;

export async function pickDirectory() {
  return open({
    directory: true,
    multiple: false,
    title: "选择图片目录",
  });
}

export async function scanImages(dirPath: string) {
  return invoke<ImageEntry[]>("scan_images", { dir: dirPath });
}

export async function revealDirectory(dirPath: string) {
  return revealItemInDir(dirPath);
}

function createImageViewerSession(images: ViewerImage[], initialIndex: number): string {
  const prefix = "mint-viewer:image-session:";
  const sessionKeys = Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .sort();
  const overflow = sessionKeys.length - 20;
  if (overflow > 0) {
    for (let i = 0; i < overflow; i += 1) {
      localStorage.removeItem(sessionKeys[i]);
    }
  }

  const sessionId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const payload = {
    images,
    initialIndex,
  };
  localStorage.setItem(`${prefix}${sessionId}`, JSON.stringify(payload));
  return sessionId;
}

function getImageViewerUrl(sessionId?: string): string {
  const params = new URLSearchParams(IMAGE_VIEWER_BASE_QUERY);
  if (sessionId) {
    params.set("session", sessionId);
  }
  return `${window.location.pathname}?${params.toString()}`;
}

async function ensureImageViewerMica() {
  if (!viewerMicaPromise) {
    viewerMicaPromise = invoke("apply_mica_to_window", { label: IMAGE_VIEWER_LABEL })
      .then(() => undefined)
      .catch((error) => {
        viewerMicaPromise = null;
        throw error;
      });
  }
  await viewerMicaPromise;
}

async function ensureImageViewerWindow(): Promise<Window> {
  if (viewerWindowPromise) {
    return viewerWindowPromise;
  }

  viewerWindowPromise = Window.getByLabel(IMAGE_VIEWER_LABEL).then((existingWindow) => {
    if (existingWindow) {
      return existingWindow;
    }

    return new Promise<Window>((resolve, reject) => {
      const win = new WebviewWindow(IMAGE_VIEWER_LABEL, {
        url: getImageViewerUrl(),
        title: "mint",
        width: 980,
        height: 680,
        minWidth: 520,
        minHeight: 380,
        center: true,
        resizable: true,
        decorations: false,
        transparent: true,
        visible: false,
        focus: false,
      });
      const unlistenError = win.once("tauri://error", (event) => {
        viewerWindowPromise = null;
        viewerReadyPromise = null;
        viewerReady = false;
        unlistenCreated.then((fn) => fn());
        reject(new Error(String(event.payload)));
      });
      const unlistenCreated = win.once("tauri://created", () => {
        unlistenError.then((fn) => fn());
        resolve(win);
      });
    });
  });

  return viewerWindowPromise;
}

async function waitForImageViewerReady(): Promise<void> {
  if (viewerReady) {
    return;
  }
  if (!viewerReadyPromise) {
    viewerReadyPromise = new Promise<void>((resolve) => {
      const mainWindow = getCurrentWindow();
      const timeoutId = window.setTimeout(() => {
        viewerReady = true;
        resolve();
      }, 1200);

      void mainWindow.once("mint://viewer-ready", () => {
        window.clearTimeout(timeoutId);
        viewerReady = true;
        resolve();
      });
    });
  }

  await viewerReadyPromise;
}

export async function warmUpImageDetailWindow() {
  await ensureImageViewerWindow();
  await waitForImageViewerReady();
}

export function openImageDetailWindow(images: ViewerImage[], initialIndex: number): Promise<void> {
  const current = images[initialIndex];
  if (!current) {
    return Promise.reject(new Error("未找到要预览的图片"));
  }

  const sessionId = createImageViewerSession(images, initialIndex);
  return ensureImageViewerWindow().then(async (viewerWindow) => {
    await waitForImageViewerReady();
    await viewerWindow.setTitle(`mint - ${current.name}`);
    await viewerWindow.emit("mint://viewer-session", { sessionId });
    await viewerWindow.show();
    try {
      await ensureImageViewerMica();
    } catch {
      // Mica is a visual enhancement only; opening the image should still succeed.
    }
    await viewerWindow.setFocus();
  });
}

export async function showErrorPopup(text: string) {
  try {
    await message(text, {
      title: "操作失败",
      kind: "error",
    });
  } catch {
    window.alert(text);
  }
}
