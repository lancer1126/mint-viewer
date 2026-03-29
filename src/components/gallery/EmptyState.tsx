export function EmptyState() {
  return (
    <section className="relative z-10 flex flex-1 items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/app-icon.png" alt="mint viewer" className="h-28 w-28 object-contain" />
        <span className="text-base text-slate-600">请选择目录后开始浏览图片。</span>
      </div>
    </section>
  );
}
