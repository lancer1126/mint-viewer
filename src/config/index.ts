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
    mainPanel: 0.58,
    // 侧边栏背景色：进一步减弱白色蒙版，让系统 Mica 的染色更明显。
    sidebarBackground: "rgba(248,245,240,0.18)",
  },
};
