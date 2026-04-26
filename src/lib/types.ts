export interface SiteData {
  id: string;
  name: string;
  desc: string;
  icon: string;
  icon_url: string;
  icon_custom_url?: string; // 自定义图片地址
  category: string;
  url: { internal: string; external: string };
  sort_order: number;
  created_at: string;
}

export interface ShortcutConfig {
  key: string;
  site_id: string;
}

export interface CategoryConfig {
  name: string;
  sort_order: number;
}
