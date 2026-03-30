import type { RefObject, UIEvent } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ImageEntry } from "@/types";
import { colorClassByExt, formatModifiedTime, formatSize } from "@/lib/image-format";

type ImageGridProps = {
  images: ImageEntry[];
  renderedImages: ImageEntry[];
  isLoadingImages: boolean;
  gridRef: RefObject<HTMLElement | null>;
  onScroll: (e: UIEvent<HTMLElement>) => void;
  onImageClick: (item: ImageEntry, index: number) => void;
  viewMode: string;
  zoomValue: number;
};

export function ImageGrid({
  images,
  renderedImages,
  isLoadingImages,
  gridRef,
  onScroll,
  onImageClick,
  viewMode,
  zoomValue,
}: ImageGridProps) {
  const isListView = viewMode === "列表";
  const gridMinWidth = Math.max(120, Math.min(262, Math.round((164 * zoomValue) / 100)));
  const cardHeight = Math.round(gridMinWidth * 1.35);
  const previewHeight = Math.max(112, Math.round(gridMinWidth * 0.92));

  return (
    <section
      ref={gridRef}
      onScroll={onScroll}
      className={`main-scrollbar relative z-10 flex-1 overflow-auto px-5 pb-4 pt-3 ${
        isListView
          ? "flex flex-col gap-2"
          : "grid gap-4"
      }`}
      style={
        isListView
          ? undefined
          : {
              gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}px, 1fr))`,
              gridAutoRows: `${cardHeight}px`,
            }
      }
    >
      {!isLoadingImages && images.length === 0 && (
        <div className={`${isListView ? "" : "col-span-full"} rounded-2xl bg-white/20 px-4 py-3 text-sm text-slate-600`}>
          当前目录下没有匹配的图片。
        </div>
      )}
      {renderedImages.map((item, index) =>
        isListView ? (
          <article
            key={item.path}
            onClick={() => onImageClick(item, index)}
            className="group flex min-h-[88px] items-center gap-4 overflow-hidden rounded-[20px] border border-black/6 bg-white/34 px-3 py-3 shadow-[0_10px_24px_rgba(100,116,139,0.09)] transition duration-200 hover:bg-white/50"
          >
            <div
              className={`h-[62px] w-[86px] shrink-0 overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br ${colorClassByExt(item.ext)} shadow-[0_8px_18px_rgba(148,163,184,0.12)]`}
            >
              <img
                src={convertFileSrc(item.path)}
                alt={item.name}
                loading="lazy"
                className="block h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.opacity = "0";
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-slate-900" title={item.name}>
                {item.name}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span>{formatModifiedTime(item.modifiedMs)}</span>
                <span>{formatSize(item.size)}</span>
                <span className="rounded-full bg-white/52 px-2 py-0.5 text-slate-700 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]">
                  {item.ext}
                </span>
              </div>
            </div>
          </article>
        ) : (
          <article
            key={item.path}
            className="flex flex-col overflow-hidden rounded-[22px] border border-black/8 bg-white/42 shadow-[0_10px_24px_rgba(100,116,139,0.12)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/50"
            style={{ height: `${cardHeight}px` }}
          >
            <div
              className={`w-full overflow-hidden bg-gradient-to-br ${colorClassByExt(item.ext)}`}
              style={{ height: `${previewHeight}px` }}
              onClick={() => onImageClick(item, index)}
            >
              <img
                src={convertFileSrc(item.path)}
                alt={item.name}
                loading="lazy"
                className="block h-full w-full cursor-pointer object-cover"
                onError={(e) => {
                  e.currentTarget.style.opacity = "0";
                }}
              />
            </div>
            <div className="p-3">
              <div className="truncate text-xs font-semibold text-slate-900" title={item.name}>
                {item.name}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-700">
                <span>{formatSize(item.size)}</span>
                <span className="rounded-full bg-white/55 px-2 py-0.5 text-slate-800 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]">{item.ext}</span>
              </div>
            </div>
          </article>
        ),
      )}
      {!isLoadingImages && renderedImages.length < images.length && (
        <div className={`${isListView ? "" : "col-span-full"} rounded-2xl bg-white/16 px-4 py-2 text-center text-xs text-slate-500`}>
          已加载 {renderedImages.length} / {images.length}，继续下滑加载更多...
        </div>
      )}
    </section>
  );
}
