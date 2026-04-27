"use client";

import { useRef, useState, useCallback } from "react";
import { apiPost, readFileAsDataUrl } from "@/lib/client-api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUp, Loader2, Save, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function AdminSettings({ config, onMutated }: { config: { site_name: string; site_description: string; footer_text: string; background_image_url: string; background_blur: string; site_logo_url: string; auto_detect_network: string }; onMutated?: () => void | Promise<void> }) {
  const [form, setForm] = useState({
    site_name: config.site_name,
    site_description: config.site_description,
    footer_text: config.footer_text,
    background_image_url: config.background_image_url,
    background_blur: config.background_blur,
    site_logo_url: config.site_logo_url,
    auto_detect_network: config.auto_detect_network,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleUploadBackground = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("请选择图片文件"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("背景图片不能超过 8MB"); return; }
    setUploadingBackground(true);
    try {
      const result = await apiPost<{ data: string }>("/api/admin/config", { body: { action: "upload", kind: "background", dataUrl: await readFileAsDataUrl(file) } });
      if (!result.success) { toast.error(result.error); return; }
      setForm((p) => ({ ...p, background_image_url: result.data }));
      toast.success("背景图片已上传，记得保存配置");
    } finally {
      setUploadingBackground(false);
      if (backgroundInputRef.current) backgroundInputRef.current.value = "";
    }
  }, []);

  const handleUploadLogo = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("请选择图片文件"); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("主站图标不能超过 4MB"); return; }
    setUploadingLogo(true);
    try {
      const result = await apiPost<{ data: string }>("/api/admin/config", { body: { action: "upload", kind: "site-logo", dataUrl: await readFileAsDataUrl(file) } });
      if (!result.success) { toast.error(result.error); return; }
      setForm((p) => ({ ...p, site_logo_url: result.data }));
      toast.success("主站图标已上传，记得保存配置");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.site_name.trim()) { toast.error("站点名称不能为空"); return; }
    if (!form.site_description.trim()) { toast.error("站点描述不能为空"); return; }
    for (const [value, label] of [[form.background_image_url, "背景图片"], [form.site_logo_url, "主站图标"]] as const) {
      const imageUrl = value.trim();
      if (imageUrl && !imageUrl.startsWith("/api/icons/")) {
        try {
          const url = new URL(imageUrl);
          if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid protocol");
        } catch {
          toast.error(`${label}地址格式无效`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const result = await apiPost("/api/admin/config", { body: { action: "update", config: form } });
      if (!result.success) { toast.error(result.error); return; }
      toast.success("配置已保存");
      await onMutated?.();
    } finally { setSaving(false); }
  }, [form, onMutated]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 text-sm font-medium">基本设置</div>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="cfg_name">站点名称</Label>
            <Input
              id="cfg_name"
              value={form.site_name}
              onChange={(e) => setForm((p) => ({ ...p, site_name: e.target.value }))}
              required
            />
            <p className="text-[11px] text-muted-foreground">页面标题</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cfg_desc">站点描述</Label>
            <Input
              id="cfg_desc"
              value={form.site_description}
              onChange={(e) => setForm((p) => ({ ...p, site_description: e.target.value }))}
              required
            />
            <p className="text-[11px] text-muted-foreground">SEO描述</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cfg_footer">页脚文字</Label>
            <Input
              id="cfg_footer"
              value={form.footer_text}
              onChange={(e) => setForm((p) => ({ ...p, footer_text: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground">支持 HTML，留空则不显示</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
            <div className="grid gap-1">
              <Label htmlFor="cfg_auto_detect_network">自动探测网络</Label>
              <p className="text-[11px] text-muted-foreground">开启后首页会自动探测内网可达性；关闭时默认使用外网，仍可手动切换。</p>
            </div>
            <Switch
              id="cfg_auto_detect_network"
              checked={form.auto_detect_network === "true"}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, auto_detect_network: checked ? "true" : "false" }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cfg_logo">主站图标</Label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUploadLogo(file);
              }}
            />
            <div className="flex gap-2">
              <Input
                id="cfg_logo"
                value={form.site_logo_url}
                onChange={(e) => setForm((p) => ({ ...p, site_logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                {uploadingLogo ? <Loader2 className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
                上传
              </Button>
              {form.site_logo_url && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setForm((p) => ({ ...p, site_logo_url: "" }))}>
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">显示在首页标题左侧，支持 URL 或本地上传</p>
            {form.site_logo_url && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                <img src={form.site_logo_url} alt="主站图标预览" className="size-12 rounded-lg object-contain" />
                <span className="text-xs text-muted-foreground">主站图标预览</span>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cfg_background">背景图片</Label>
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUploadBackground(file);
              }}
            />
            <div className="flex gap-2">
              <Input
                id="cfg_background"
                value={form.background_image_url}
                onChange={(e) => setForm((p) => ({ ...p, background_image_url: e.target.value }))}
                placeholder="https://example.com/background.jpg"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => backgroundInputRef.current?.click()} disabled={uploadingBackground}>
                {uploadingBackground ? <Loader2 className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
                上传
              </Button>
              {form.background_image_url && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setForm((p) => ({ ...p, background_image_url: "" }))}>
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">支持 URL 或本地上传，留空则使用默认纯色背景</p>
            {form.background_image_url && (
              <div className="overflow-hidden rounded-lg border bg-muted/20">
                <img src={form.background_image_url} alt="背景预览" className="h-24 w-full object-cover" />
              </div>
            )}
          </div>
          <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfg_background_blur">背景模糊</Label>
                <span className="text-xs text-muted-foreground">{form.background_blur}px</span>
              </div>
              <Input
                id="cfg_background_blur"
                type="range"
                min="0"
                max="24"
                value={form.background_blur}
                onChange={(e) => setForm((p) => ({ ...p, background_blur: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          保存配置
        </Button>
      </div>
    </div>
  );
}
