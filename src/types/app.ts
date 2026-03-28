export type AppConfig = {
  layout: {
    titlebarHeight: number;
    sidebar: {
      defaultWidth: number;
      minWidth: number;
      maxWidth: number;
      collapsedWidth: number;
    };
  };
  opacity: {
    mainPanel: number;
    sidebarBackground: string;
  };
};
