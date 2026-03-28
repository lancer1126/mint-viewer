import type { AppConfig } from "@/types";

export const uiConfig: AppConfig = {
  layout: {
    // 原生顶部标题栏高度（像素）。
    titlebarHeight: 28,
    sidebar: {
      // 侧边栏在展开状态下的初始宽度。
      defaultWidth: 236,
      // 用户拖拽调整时允许的最小宽度。
      minWidth: 180,
      // 用户拖拽调整时允许的最大宽度。
      maxWidth: 360,
      // 侧边栏在折叠状态下的宽度。
      collapsedWidth: 48,
    },
  },
  opacity: {
    // 主内容面板白色叠加层透明度（0~1）。
    mainPanel: 0.08,
    // 左侧背景第一层渐变顶部透明度（0~1）。
    sidebarPanelTop: 0.76,
    // 左侧背景第一层渐变底部透明度（0~1）。
    sidebarPanelBottom: 0.88,
    // 左侧背景第二层渐变顶部透明度（0~1）。
    sidebarOverlayTop: 0.2,
    // 左侧背景第二层渐变底部透明度（0~1）。
    sidebarOverlayBottom: 0.07,
  },
};
