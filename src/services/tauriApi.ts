import { invoke } from "@tauri-apps/api/core";
import { message, open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { ImageEntry } from "@/types";

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
