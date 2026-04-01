export type FlatSelectProps = {
  prefix: string;
  value: string;
  options: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
};

export type PathTipState = {
  visible: boolean;
  text: string;
  x: number;
  y: number;
};

export type FolderContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  path: string;
  source: "folders" | "recent";
};

export type ImageContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  path: string;
};
