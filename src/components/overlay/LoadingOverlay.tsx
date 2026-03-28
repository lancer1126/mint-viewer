export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(241,237,231,0.5)] backdrop-blur-[2px]">
      <div className="flex items-center justify-center">
        <div className="loading-11" />
      </div>
    </div>
  );
}
