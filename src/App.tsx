import { MainPage } from "@/pages/MainPage";
import { ImageViewerPage } from "@/pages/ImageViewerPage";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isViewer = params.get("viewer") === "1";
  return isViewer ? <ImageViewerPage /> : <MainPage />;
}
