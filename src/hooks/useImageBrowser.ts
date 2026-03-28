import { useState } from "react";
import type { ImageEntry } from "@/types";
import { scanImages, showErrorPopup } from "@/services/tauriApi";

export function useImageBrowser() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [currentDir, setCurrentDir] = useState("");
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  async function loadImagesForDirectory(dirPath: string, onLoaded?: () => void) {
    setIsLoadingImages(true);
    setCurrentDir(dirPath);

    try {
      const result = await scanImages(dirPath);
      setImages(result);
      onLoaded?.();
    } catch (err) {
      setImages([]);
      const text = err instanceof Error ? err.message : "读取目录失败";
      await showErrorPopup(text);
    } finally {
      setIsLoadingImages(false);
    }
  }

  function clearCurrentDirectory() {
    setCurrentDir("");
    setImages([]);
  }

  return {
    images,
    currentDir,
    isLoadingImages,
    setImages,
    loadImagesForDirectory,
    clearCurrentDirectory,
  };
}
