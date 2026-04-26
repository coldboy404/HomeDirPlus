import "server-only";

import type { SiteData } from "@/lib/types";

interface ImportSiteInput {
  id?: string;
  name: string;
  desc: string;
  icon?: string;
  icon_url?: string;
  icon_custom_url?: string;
  category: string;
  url_internal: string;
  url_external: string;
  sort_order: number;
}

type ParsedImport = {
  format: "homedirplus" | "sunpanel";
  sites: ImportSiteInput[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeIconUrl(value: string): string {
  if (!value) return "";
  // SunPanel 的 /uploads/... 需要原站静态文件配合；没有 baseUrl 时先不导入，避免页面出现坏图。
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/")) return value;
  return "";
}

function parseHomeDirPlus(root: Record<string, unknown>): ParsedImport | null {
  const rawSites = Array.isArray(root.sites) ? root.sites : null;
  if (!rawSites) return null;

  const sites = rawSites.flatMap((item, index): ImportSiteInput[] => {
    const row = asRecord(item);
    if (!row) return [];
    const url = asRecord(row.url);
    const name = asString(row.name);
    const category = asString(row.category) || "未分类";
    const urlInternal = asString(row.url_internal) || asString(url?.internal);
    const urlExternal = asString(row.url_external) || asString(url?.external);
    if (!name || (!urlInternal && !urlExternal)) return [];
    return [{
      id: asString(row.id) || undefined,
      name,
      desc: asString(row.desc),
      icon: asString(row.icon) || "Globe",
      icon_url: asString(row.icon_url),
      icon_custom_url: normalizeIconUrl(asString(row.icon_custom_url)),
      category,
      url_internal: urlInternal,
      url_external: urlExternal,
      sort_order: asNumber(row.sort_order, index + 1),
    }];
  });

  return { format: "homedirplus", sites };
}

function parseSunPanel(root: Record<string, unknown>): ParsedImport | null {
  const groups = Array.isArray(root.icons) ? root.icons : null;
  if (!groups) return null;

  const sites: ImportSiteInput[] = [];
  for (const groupRaw of groups) {
    const group = asRecord(groupRaw);
    if (!group) continue;
    const category = asString(group.title) || "未分类";
    const categorySort = asNumber(group.sort, sites.length + 1);
    const children = Array.isArray(group.children) ? group.children : [];

    for (const childRaw of children) {
      const child = asRecord(childRaw);
      if (!child) continue;
      const name = asString(child.title);
      const urlExternal = asString(child.url);
      const urlInternal = asString(child.lanUrl);
      if (!name || (!urlInternal && !urlExternal)) continue;

      const icon = asRecord(child.icon);
      const iconUrl = normalizeIconUrl(asString(icon?.src));
      const itemSort = asNumber(child.sort, sites.length + 1);

      sites.push({
        name,
        desc: asString(child.description),
        icon: "Globe",
        icon_url: "",
        icon_custom_url: iconUrl,
        category,
        url_internal: urlInternal,
        url_external: urlExternal,
        // 保留 SunPanel 分类顺序 + 分类内顺序。
        sort_order: categorySort * 10000 + itemSort,
      });
    }
  }

  return { format: "sunpanel", sites };
}

export function parseImportJson(jsonText: string): ParsedImport {
  let root: unknown;
  try {
    root = JSON.parse(jsonText);
  } catch {
    throw new Error("JSON 格式无效");
  }

  const record = asRecord(root);
  if (!record) throw new Error("导入文件必须是 JSON 对象");

  const parsed = parseSunPanel(record) || parseHomeDirPlus(record);
  if (!parsed || parsed.sites.length === 0) {
    throw new Error("未识别到可导入的站点数据");
  }

  return parsed;
}

export function createExportJson(sites: SiteData[]) {
  return {
    version: 1,
    appName: "HomeDirPlus",
    exportTime: new Date().toISOString(),
    sites: sites.map((site) => ({
      id: site.id,
      name: site.name,
      desc: site.desc,
      icon: site.icon,
      icon_url: site.icon_url,
      icon_custom_url: site.icon_custom_url || "",
      category: site.category,
      url_internal: site.url.internal,
      url_external: site.url.external,
      sort_order: site.sort_order,
      created_at: site.created_at,
    })),
  };
}
