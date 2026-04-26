import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

// 从字符串名称获取 lucide 图标组件
export function getIcon(name: string): LucideIcon {
  const icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return icon || LucideIcons.Globe;
}

/** 获取本地缓存图标的显示 URL */
export function getIconUrl(iconUrl: string): string {
  if (!iconUrl) return "";
  return `/api/icons/${iconUrl}`;
}

/** 自定义图片地址优先，其次使用本地缓存图标 */
export function getSiteIconUrl(iconUrl?: string, iconCustomUrl?: string): string {
  const custom = iconCustomUrl?.trim();
  if (custom) return custom;
  return getIconUrl(iconUrl || "");
}

// 常用图标列表，用于后台选择
export const commonIcons = [
  "Globe", "HardDrive", "Server", "Database", "Film", "Music",
  "FileText", "Settings", "Shield", "Cloud", "Monitor", "Cpu",
  "Wifi", "Router", "Lock", "Key", "Mail", "MessageSquare",
  "Camera", "Image", "Video", "Folder", "Archive", "Download",
  "Upload", "Terminal", "Code", "GitBranch", "Box", "Package",
  "Zap", "Activity", "BarChart", "PieChart", "Layers", "Layout",
  "Home", "Bookmark", "Star", "Heart", "Search", "Eye",
] as const;
