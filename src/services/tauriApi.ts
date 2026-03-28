import { invoke } from "@tauri-apps/api/core";
import { message, open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Window } from "@tauri-apps/api/window";
import type { ImageEntry, ViewerImage } from "@/types";

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

export function openImageDetailWindow(images: ViewerImage[], initialIndex: number): Promise<void> {
  const current = images[initialIndex];
  if (!current) {
    return Promise.reject(new Error("未找到要预览的图片"));
  }

  const sessionId = createImageViewerSession(images, initialIndex);
  const label = "image-viewer";
  const query = new URLSearchParams({
    viewer: "1",
    session: sessionId,
  }).toString();
  const url = `${window.location.pathname}?${query}`;
  return Window.getByLabel(label).then(async (existingWindow) => {
    if (existingWindow) {
      await existingWindow.emit("mint://viewer-session", { sessionId });
      await existingWindow.setFocus();
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const win = new WebviewWindow(label, {
        url,
        title: `mint - ${current.name}`,
        width: 980,
        height: 680,
        minWidth: 520,
        minHeight: 380,
        center: true,
        resizable: true,
        decorations: false,
        transparent: false,
        focus: true,
      });
      const unlistenError = win.once("tauri://error", (event) => {
        unlistenCreated.then((fn) => fn());
        reject(new Error(String(event.payload)));
      });
      const unlistenCreated = win.once("tauri://created", () => {
        unlistenError.then((fn) => fn());
        resolve();
      });
    });
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
