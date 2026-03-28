import type { RefObject, UIEvent } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ImageEntry } from "@/types";
import { colorClassByExt, formatSize } from "@/lib/image-format";

type ImageGridProps = {
  images: ImageEntry[];
  renderedImages: ImageEntry[];
  isLoadingImages: boolean;
  gridRef: RefObject<HTMLElement | null>;
  onScroll: (e: UIEvent<HTMLElement>) => void;
  onImageClick: (item: ImageEntry, index: number) => void;
};

export function ImageGrid({ images, renderedImages, isLoadingImages, gridRef, onScroll, onImageClick }: ImageGridProps) {
  return (
    <section
      ref={gridRef}
      onScroll={onScroll}
      className="main-scrollbar relative z-10 grid auto-rows-[240px] flex-1 grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-4 overflow-auto px-5 pb-4 pt-3"
    >
      {!isLoadingImages && images.length === 0 && (
        <div className="col-span-full rounded-2xl bg-white/20 px-4 py-3 text-sm text-slate-600">当前目录下没有匹配的图片。</div>
      )}
      {renderedImages.map((item, index) => (
        <article
          key={item.path}
          onClick={() => onImageClick(item, index)}
          className="flex h-[240px] flex-col overflow-hidden rounded-[22px] border border-black/8 bg-white/42 shadow-[0_10px_24px_rgba(100,116,139,0.12)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/50"
        >
          <div className={`h-[164px] w-full overflow-hidden bg-gradient-to-br ${colorClassByExt(item.ext)}`}>
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
      ))}
      {!isLoadingImages && renderedImages.length < images.length && (
        <div className="col-span-full rounded-2xl bg-white/16 px-4 py-2 text-center text-xs text-slate-500">
          已加载 {renderedImages.length} / {images.length}，继续下滑加载更多...
        </div>
      )}
    </section>
  );
}
