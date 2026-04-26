"use server";

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import {
  createSite,
  updateSite,
  deleteSite,
  renameCategory,
  deleteCategory,
  updateCategorySort,
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

function isAllowedImageUrl(value: string): boolean {
  if (value.startsWith("/api/icons/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(data: SiteFormInput): string | null {
  if (!data.name || data.name.trim().length === 0) return "名称不能为空";
  if (data.name.length > 100) return "名称不能超过 100 个字符";
  if (!data.category || data.category.trim().length === 0) return "分类不能为空";
  if (!data.url_internal && !data.url_external) return "至少填写一个地址";
  const customIcon = data.icon_custom_url?.trim();
  if (customIcon && !isAllowedImageUrl(customIcon)) return "自定义图标地址格式无效";
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
    const data = await autoFillFavicon(formData);
    createSite(data);
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
    const sites = await Promise.all(parsed.sites.map((site) => autoFillFavicon({ ...site, icon: site.icon || "Globe" })));
    const count = importSites(sites, mode);
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

export async function updateCategorySortAction(name: string, sortOrder: number): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (!name) return { success: false, error: "分类名称不能为空" };
  if (!Number.isFinite(sortOrder)) return { success: false, error: "排序数字无效" };

  try {
    updateCategorySort(name, Math.trunc(sortOrder));
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("保存分类排序失败:", e);
    return { success: false, error: "保存分类排序失败" };
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

function normalizeIconHref(href: string, baseUrl: string): string | null {
  if (!href || href.startsWith("data:")) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function isPrivateHost(hostname: string): boolean {
  return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|localhost$|127\.|0\.)/.test(hostname) || hostname.endsWith(".local");
}

async function fetchImageBuffer(url: string, timeout = 3500): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 HomeDirPlus favicon fetcher" },
    });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10 || buf.length > 2 * 1024 * 1024) return null;
    if (!ct || ct.includes("image") || ct.includes("icon") || ct.includes("octet-stream")) return buf;
    const head = buf.subarray(0, 16).toString("utf8").trimStart();
    if (buf[0] === 0x00 || buf[0] === 0x89 || buf[0] === 0xff || buf[0] === 0x47 || buf[0] === 0x52 || head.startsWith("<svg")) return buf;
    return null;
  } catch {
    return null;
  }
}

async function fetchFavicon(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const { origin, hostname } = parsed;
  const candidates: string[] = [];

  try {
    const htmlRes = await fetch(origin, {
      signal: AbortSignal.timeout(3500),
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 HomeDirPlus favicon fetcher" },
    });
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const links = [...html.matchAll(/<link\s+[^>]*>/gi)].map((m) => m[0]);
      const preferredRels = ["apple-touch-icon", "mask-icon", "shortcut icon", "icon"];
      for (const rel of preferredRels) {
        for (const tag of links) {
          const relMatch = tag.match(/\brel=["']([^"']+)["']/i);
          if (!relMatch || !relMatch[1].toLowerCase().includes(rel)) continue;
          const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
          const normalized = href ? normalizeIconHref(href, htmlRes.url || origin) : null;
          if (normalized && !candidates.includes(normalized)) candidates.push(normalized);
        }
      }
    }
  } catch {}

  for (const p of ["/apple-touch-icon.png", "/apple-touch-icon-precomposed.png", "/favicon.svg", "/favicon.png", "/favicon.ico", "/assets/favicon.ico"]) {
    candidates.push(`${origin}${p}`);
  }

  if (!isPrivateHost(hostname)) {
    candidates.push(`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`);
    candidates.push(`https://icons.duckduckgo.com/ip3/${hostname}.ico`);
  }

  for (const candidate of [...new Set(candidates)]) {
    const iconBuf = await fetchImageBuffer(candidate);
    if (iconBuf) return saveIcon(iconBuf);
  }
  return null;
}

async function autoFillFavicon<T extends { icon_url?: string; icon_custom_url?: string; url_external?: string; url_internal?: string }>(site: T): Promise<T> {
  if (site.icon_url || site.icon_custom_url) return site;
  const url = site.url_external || site.url_internal;
  if (!url) return site;
  const icon = await fetchFavicon(url);
  return icon ? { ...site, icon_url: icon } : site;
}

// 抓取 favicon 并保存到本地文件
export async function fetchFaviconAction(url: string): Promise<{ success: true; data: string } | { success: false; error: string }> {
  if (!(await isAuthenticated())) return { success: false, error: "未登录" };
  const filename = await fetchFavicon(url);
  return filename ? { success: true, data: filename } : { success: false, error: "未找到图标" };
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

function saveImageDataUrl(dataUrl: string, maxMb: number, label: string): { success: true; data: string } | { success: false; error: string } {
  const match = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp|gif|svg\+xml));base64,(.+)$/i);
  if (!match) return { success: false, error: "仅支持 png/jpg/webp/gif/svg 图片" };

  try {
    const buf = Buffer.from(match[2], "base64");
    if (buf.length < 10) return { success: false, error: "图片文件为空" };
    if (buf.length > maxMb * 1024 * 1024) return { success: false, error: `${label}不能超过 ${maxMb}MB` };
    const filename = saveIcon(buf);
    return { success: true, data: `/api/icons/${filename}` };
  } catch (e) {
    console.error(`${label}上传失败:`, e);
    return { success: false, error: `${label}上传失败` };
  }
}

export async function uploadBackgroundAction(dataUrl: string): Promise<{ success: true; data: string } | { success: false; error: string }> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  return saveImageDataUrl(dataUrl, 8, "背景图片");
}

export async function uploadSiteIconAction(dataUrl: string): Promise<{ success: true; data: string } | { success: false; error: string }> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  return saveImageDataUrl(dataUrl, 2, "站点图标");
}

export async function uploadSiteLogoAction(dataUrl: string): Promise<{ success: true; data: string } | { success: false; error: string }> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  return saveImageDataUrl(dataUrl, 4, "主站图标");
}

function clampPercent(value: string | undefined, fallback: string): string {
  const number = Number(value ?? fallback);
  return String(Math.min(100, Math.max(0, Number.isFinite(number) ? Math.round(number) : Number(fallback))));
}

// 配置操作
export async function updateConfigAction(config: Partial<SiteConfig>): Promise<ActionResult> {
  const authErr = await requireAuth();
  if (authErr) return authErr;
  if (config.site_name !== undefined && !config.site_name.trim()) return { success: false, error: "站点名称不能为空" };
  if (config.site_description !== undefined && !config.site_description.trim()) return { success: false, error: "站点描述不能为空" };
  const imageFields: [keyof SiteConfig, string][] = [["background_image_url", "背景图片"], ["site_logo_url", "主站图标"]];
  for (const [key, label] of imageFields) {
    const imageUrl = config[key]?.trim();
    if (imageUrl && !isAllowedImageUrl(imageUrl)) return { success: false, error: `${label}地址格式无效` };
  }
  const updates = {
    ...config,
    background_blur: clampPercent(config.background_blur, "1"),
  };
  try {
    updateConfig(updates);
    revalidatePath("/");
    revalidatePath("/dash");
    return { success: true };
  } catch (e) {
    console.error("保存配置失败:", e);
    return { success: false, error: "保存配置失败" };
  }
}
