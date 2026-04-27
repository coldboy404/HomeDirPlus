import "server-only";
import { getSites } from "@/lib/sites";
import { getAllShortcuts } from "@/lib/db";
import type { CategoryConfig, SiteData } from "@/lib/types";
import type { SiteConfig } from "@/lib/db";
import type { ShortcutData } from "@/components/admin/shortcuts";

export type SafeConfig = {
  site_name: string;
  site_description: string;
  footer_text: string;
  background_image_url: string;
  background_blur: string;
  site_logo_url: string;
  auto_detect_network: string;
};

export type AdminPayload = {
  sites: SiteData[];
  categories: string[];
  categoryConfigs: CategoryConfig[];
  config: SafeConfig;
  shortcuts: ShortcutData[];
};

export function toSafeConfig(config: SiteConfig): SafeConfig {
  return {
    site_name: config.site_name,
    site_description: config.site_description,
    footer_text: config.footer_text,
    background_image_url: config.background_image_url,
    background_blur: config.background_blur,
    site_logo_url: config.site_logo_url,
    auto_detect_network: config.auto_detect_network,
  };
}

export function getAdminPayload(): AdminPayload {
  const { sites, categories, categoryConfigs, config } = getSites();
  const shortcuts = getAllShortcuts().map((s) => ({ id: s.id, key: s.key, site_id: s.site_id }));

  return {
    sites,
    categories,
    categoryConfigs,
    config: toSafeConfig(config),
    shortcuts,
  };
}
