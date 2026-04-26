import "server-only";
import { getAllSites, getConfig, getAllShortcuts } from "@/lib/db";
import type { SiteData, ShortcutConfig } from "@/lib/types";
import type { SiteConfig } from "@/lib/db";

export function getSites(): { sites: SiteData[]; categories: string[]; config: SiteConfig; shortcuts: ShortcutConfig[] } {
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

  const categories = Array.from(new Set(sites.map((s) => s.category))).sort();
  const shortcuts = getAllShortcuts().map((s) => ({ key: s.key, site_id: s.site_id }));

  return { sites, categories, config, shortcuts };
}
