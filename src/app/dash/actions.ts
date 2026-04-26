"use server";

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import {
  createSite,
  updateSite,
  deleteSite,
  renameCategory,
  deleteCategory,
  updateConfig,
  createShortcut,
  deleteShortcut,
  getAllShortcuts,
  getAllSites,
  importSites,
  reorderSites,
} from "@/lib/db";
import type { SiteConfig } from "@/lib/db";
import { createExportJson, parseImportJson } from "@/lib/import-export";
import { saveIcon } from "@/lib/icons-fs";

interface SiteFormInput {
  name: string;
  desc: string;
  icon: string;
  icon_url?: string;
  icon_custom_url?: string;
  category: string;
  url_internal: string;
  url_external: string;
  sort_order: number;
}

type ActionResult = { success: true } | { success: false; error: string };
type ImportMode = "append" | "replace";

type ImportResult =
  | { success: true; count: number; format: "homedirplus" | "sunpanel" }
  | { success: false; error: string };

type ExportResult = { success: true; data: string } | { success: false; error: string };

type ReorderInput = { id: string; category: string; sort_order: number };

function validate(data: SiteFormInput): string | null {
  if (!data.name || data.name.trim().length === 0) return "名称不能为空";
  if (data.name.length > 100) return "名称不能超过 100 个字符";
  if (!data.category || data.category.trim().length === 0) return "分类不能为空";
  if (!data.url_internal && !data.url_external) return "至少填写一个地址";
  const customIcon = data.icon_custom_url?.trim();
  if (customIcon) {
    try {
      const url = new URL(customIcon);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "自定义图标地址仅支持 http/https";
    } catch {
      return "自定义图标地址格式无效";
    }
  }
  return null;
}

async function requireAuth(): Promise<{ success: false; error: string } | null> {
  if (!(await isAuthenticated())) return { success: false, error: "未登录" };
  return null;
}

export async function createSiteAction(formData: SiteFormInput): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  const error = validate(formData);
  if (error) return { success: false, error };

  try {
    createSite(formData);
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("创建站点失败:", e);
    return { success: false, error: "创建站点失败" };
  }
}

export async function updateSiteAction(id: string, formData: SiteFormInput): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (!id) return { success: false, error: "站点 ID 不能为空" };

  const error = validate(formData);
  if (error) return { success: false, error };

  try {
    const result = updateSite(id, formData);
    if (!result) return { success: false, error: "站点不存在" };
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("更新站点失败:", e);
    return { success: false, error: "更新站点失败" };
  }
}

export async function deleteSiteAction(id: string): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (!id) return { success: false, error: "站点 ID 不能为空" };

  try {
    const ok = deleteSite(id);
    if (!ok) return { success: false, error: "站点不存在" };
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("删除站点失败:", e);
    return { success: false, error: "删除站点失败" };
  }
}

export async function reorderSitesAction(items: ReorderInput[]): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (!Array.isArray(items) || items.length === 0) return { success: false, error: "排序数据不能为空" };
  if (items.some((item) => !item.id || !item.category)) return { success: false, error: "排序数据无效" };

  try {
    reorderSites(items.map((item) => ({
      id: item.id,
      category: item.category.trim(),
      sort_order: Number.isFinite(item.sort_order) ? item.sort_order : 0,
    })));
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("保存排序失败:", e);
    return { success: false, error: "保存排序失败" };
  }
}

export async function importSitesAction(jsonText: string, mode: ImportMode): Promise<ImportResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (!jsonText.trim()) return { success: false, error: "请选择 JSON 文件" };
  if (mode !== "append" && mode !== "replace") return { success: false, error: "导入模式无效" };

  try {
    const parsed = parseImportJson(jsonText);
    const count = importSites(parsed.sites.map((site) => ({ ...site, icon: site.icon || "Globe" })), mode);
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true, count, format: parsed.format };
  } catch (e) {
    console.error("导入站点失败:", e);
    return { success: false, error: e instanceof Error ? e.message : "导入站点失败" };
  }
}

export async function exportSitesAction(): Promise<ExportResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;

  try {
    const rows = getAllSites().map((r) => ({
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
    return { success: true, data: JSON.stringify(createExportJson(rows), null, 2) };
  } catch (e) {
    console.error("导出站点失败:", e);
    return { success: false, error: "导出站点失败" };
  }
}

// 分类操作
export async function renameCategoryAction(oldName: string, newName: string): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (!oldName || !newName.trim()) return { success: false, error: "分类名称不能为空" };
  if (oldName === newName) return { success: true };

  try {
    renameCategory(oldName, newName.trim());
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("重命名分类失败:", e);
    return { success: false, error: "重命名分类失败" };
  }
}

export async function deleteCategoryAction(name: string): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (!name) return { success: false, error: "分类名称不能为空" };

  try {
    deleteCategory(name);
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("删除分类失败:", e);
    return { success: false, error: "删除分类失败" };
  }
}

// 抓取 favicon 并保存到本地文件
export async function fetchFaviconAction(url: string): Promise<{ success: true; data: string } | { success: false; error: string }> {
  if (!(await isAuthenticated())) return { success: false, error: "未登录" };
  try {
    const { origin, hostname, protocol } = new URL(url);
    const tryFetch = async (u: string): Promise<Buffer | null> => {
      try {
        const res = await fetch(u, { signal: AbortSignal.timeout(5000), redirect: "follow" });
        if (!res.ok) return null;
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("image") && !ct.includes("icon") && !ct.includes("octet-stream")) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 10) return null;
        return buf;
      } catch { return null; }
    };

    let iconBuf: Buffer | null = null;

    // 1) 从 HTML 解析 <link rel="icon"> href
    try {
      const html = await fetch(origin, { signal: AbortSignal.timeout(5000), redirect: "follow" }).then(r => r.text());
      const m = html.match(/<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i)
        || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*icon[^"']*["']/i);
      if (m) {
        let href = m[1];
        if (href.startsWith("//")) href = `${protocol}${href}`;
        else if (href.startsWith("/")) href = `${origin}${href}`;
        else if (!href.startsWith("http")) href = `${origin}/${href}`;
        iconBuf = await tryFetch(href);
      }
    } catch {}

    // 2) 常见路径
    if (!iconBuf) {
      for (const p of ["/favicon.ico", "/apple-touch-icon.png"]) {
        iconBuf = await tryFetch(`${origin}${p}`);
        if (iconBuf) break;
      }
    }

    // 3) Google API 兜底（外网）
    if (!iconBuf && !/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|localhost|127\.)/.test(hostname)) {
      iconBuf = await tryFetch(`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`);
    }

    if (!iconBuf) return { success: false, error: "未找到图标" };

    // 保存到 data/icons/
    const filename = saveIcon(iconBuf);
    return { success: true, data: filename };
  } catch {
    return { success: false, error: "URL 格式无效" };
  }
}

// 热键操作
export async function createShortcutAction(key: string, siteId: string): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (!key.trim() || key.trim().length !== 1) return { success: false, error: "热键必须是单个字母" };
  if (!/^[a-zA-Z0-9]$/.test(key.trim())) return { success: false, error: "热键必须是字母或数字" };
  if (key.trim().toUpperCase() === "K") return { success: false, error: "⌘K 为内置搜索热键，不可使用" };
  if (!siteId) return { success: false, error: "请选择站点" };
  // 检查重复
  if (getAllShortcuts().some((s) => s.key.toUpperCase() === key.trim().toUpperCase())) return { success: false, error: "该热键已被占用" };
  try {
    createShortcut(key.trim(), siteId);
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("创建热键失败:", e);
    return { success: false, error: "创建热键失败" };
  }
}

export async function deleteShortcutAction(id: string): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (!id) return { success: false, error: "ID 不能为空" };
  try {
    deleteShortcut(id);
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("删除热键失败:", e);
    return { success: false, error: "删除热键失败" };
  }
}

// 配置操作
export async function updateConfigAction(config: Partial<SiteConfig>): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (config.site_name !== undefined && !config.site_name.trim()) return { success: false, error: "站点名称不能为空" };
  if (config.site_description !== undefined && !config.site_description.trim()) return { success: false, error: "站点描述不能为空" };
  try {
    updateConfig(config);
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("保存配置失败:", e);
    return { success: false, error: "保存配置失败" };
  }
}
