import type { RecentDirectory } from "@/types";

const FOLDER_DIRS_KEY = "mint-viewer:folder-directories";
const RECENT_VISITS_KEY = "mint-viewer:recent-visits";

function getDirName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function sanitizeRecords(input: unknown): RecentDirectory[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => Boolean((item as RecentDirectory)?.path))
    .map((item) => ({
      path: (item as RecentDirectory).path,
      actualName: (item as RecentDirectory).actualName || getDirName((item as RecentDirectory).path),
      name:
        (item as RecentDirectory).name ||
        (item as RecentDirectory).actualName ||
        getDirName((item as RecentDirectory).path),
      lastOpenedAt: Number.isFinite((item as RecentDirectory).lastOpenedAt)
        ? (item as RecentDirectory).lastOpenedAt
        : Date.now(),
    }));
}

export function loadFolderDirectories(max: number): RecentDirectory[] {
  const raw = localStorage.getItem(FOLDER_DIRS_KEY);
  const parsed = raw ? (JSON.parse(raw) as unknown) : [];
  return sanitizeRecords(parsed)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, max);
}

export function loadRecentVisits(max: number): RecentDirectory[] {
  const raw = localStorage.getItem(RECENT_VISITS_KEY);
  const parsed = raw ? (JSON.parse(raw) as unknown) : [];
  return sanitizeRecords(parsed)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, max);
}

export function saveFolderDirectories(items: RecentDirectory[]) {
  localStorage.setItem(FOLDER_DIRS_KEY, JSON.stringify(items));
}

export function saveRecentVisits(items: RecentDirectory[]) {
  localStorage.setItem(RECENT_VISITS_KEY, JSON.stringify(items));
}

export function toRecentDirectory(path: string): RecentDirectory {
  const actualName = getDirName(path);
  return {
    path,
    name: actualName,
    actualName,
    lastOpenedAt: Date.now(),
  };
}
