import "server-only";
import { getAllSites, getConfig, getAllShortcuts, getAllCategories } from "@/lib/db";
import type { SiteData, ShortcutConfig, CategoryConfig } from "@/lib/types";
import type { SiteConfig } from "@/lib/db";

export function getSites(): { sites: SiteData[]; categories: string[]; categoryConfigs: CategoryConfig[]; config: SiteConfig; shortcuts: ShortcutConfig[] } {
  const rows = getAllSites();
  const config = getConfig();

  const sites: SiteData[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    desc: r.desc,
    icon: r.icon,
    icon_url: r.icon_url,
    icon_custom_url: r.icon_custom_url,
    category: r.category,
    url: { internal: r.url_internal, external: r.url_external },
    sort_order: r.sort_order,
    created_at: r.created_at,
  }));

  const categoryConfigs = getAllCategories();
  const categories = categoryConfigs.map((category) => category.name);
  const shortcuts = getAllShortcuts().map((s) => ({ key: s.key, site_id: s.site_id }));

  return { sites, categories, categoryConfigs, config, shortcuts };
}
