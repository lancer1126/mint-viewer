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
    sidebarPanelTop: number;
    sidebarPanelBottom: number;
    sidebarOverlayTop: number;
    sidebarOverlayBottom: number;
  };
};

export type ImageEntry = {
  name: string;
  path: string;
  ext: string;
  size: number;
  modifiedMs: number;
};

export type RecentDirectory = {
  path: string;
  name: string;
  lastOpenedAt: number;
};

export type FlatSelectProps = {
  prefix: string;
  value: string;
  options: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
};
