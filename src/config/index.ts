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
    mainPanel: 0.65,
    // 侧边栏背景色（建议使用 rgba/rgb 便于快速调色）。
    sidebarBackground: "rgba(242,238,231,0.75)",
  },
};
