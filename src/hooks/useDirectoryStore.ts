import { useEffect, useMemo, useState } from "react";
import type { RecentDirectory } from "@/types";
import {
  loadFolderDirectories,
  loadRecentVisits,
  saveFolderDirectories,
  saveRecentVisits,
  toRecentDirectory,
} from "@/services/storage";

const MAX_FOLDER_DIRS = 30;
const MAX_RECENT_VISITS = 10;

export function useDirectoryStore(folderSortMode: "添加时间" | "名称") {
  const [folderDirs, setFolderDirs] = useState<RecentDirectory[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentDirectory[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      setFolderDirs(loadFolderDirectories(MAX_FOLDER_DIRS));
      setRecentVisits(loadRecentVisits(MAX_RECENT_VISITS));
    } catch {
      setFolderDirs([]);
      setRecentVisits([]);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    saveFolderDirectories(folderDirs);
  }, [folderDirs, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    saveRecentVisits(recentVisits);
  }, [recentVisits, storageReady]);

  const sortedFolderDirs = useMemo(() => {
    const items = [...folderDirs];
    if (folderSortMode === "名称") {
      items.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
      return items;
    }
    items.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    return items;
  }, [folderDirs, folderSortMode]);

  const recentItems = useMemo(() => recentVisits.slice(0, MAX_RECENT_VISITS), [recentVisits]);

  function rememberFolderDirectory(path: string) {
    setFolderDirs((prev) => {
      const next = toRecentDirectory(path);
      return [next, ...prev.filter((item) => item.path !== path)].slice(0, MAX_FOLDER_DIRS);
    });
  }

  function rememberRecentVisit(path: string) {
    setRecentVisits((prev) => {
      const next = toRecentDirectory(path);
      return [next, ...prev.filter((item) => item.path !== path)].slice(0, MAX_RECENT_VISITS);
    });
  }

  function removeFolderDirectory(path: string) {
    setFolderDirs((prev) => prev.filter((item) => item.path !== path));
  }

  return {
    folderDirs,
    recentItems,
    sortedFolderDirs,
    rememberFolderDirectory,
    rememberRecentVisit,
    removeFolderDirectory,
  };
}
