export function formatSize(size: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[idx]}`;
}

export function colorClassByExt(ext: string): string {
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
