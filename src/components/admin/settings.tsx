"use client";

import { useRef, useState, useCallback } from "react";
import { updateConfigAction, uploadBackgroundAction } from "@/app/dash/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUp, Loader2, Save, X } from "lucide-react";

export function AdminSettings({ config }: { config: { site_name: string; site_description: string; footer_text: string; background_image_url: string; background_blur: string; background_overlay: string } }) {
  const [form, setForm] = useState({
    site_name: config.site_name,
    site_description: config.site_description,
    footer_text: config.footer_text,
    background_image_url: config.background_image_url,
    background_blur: config.background_blur,
    background_overlay: config.background_overlay,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadBackground = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("请选择图片文件"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("背景图片不能超过 8MB"); return; }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const result = await uploadBackgroundAction(dataUrl);
      if (!result.success) { toast.error(result.error); return; }
      setForm((p) => ({ ...p, background_image_url: result.data }));
      toast.success("背景图片已上传，记得保存配置");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.site_name.trim()) { toast.error("站点名称不能为空"); return; }
    if (!form.site_description.trim()) { toast.error("站点描述不能为空"); return; }
    const backgroundImage = form.background_image_url.trim();
    if (backgroundImage) {
      try {
        const url = new URL(backgroundImage);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid protocol");
      } catch {
        toast.error("背景图片地址格式无效，仅支持 http/https");
        return;
      }
    }
    setSaving(true);
    try {
      const result = await updateConfigAction(form);
      if (!result.success) { toast.error(result.error); return; }
      toast.success("配置已保存");
    } finally { setSaving(false); }
  }, [form]);

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
          <div className="grid gap-2">
            <Label htmlFor="cfg_background">背景图片</Label>
            <input
              ref={fileInputRef}
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
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
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
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfg_background_overlay">背景遮罩</Label>
                <span className="text-xs text-muted-foreground">{form.background_overlay}%</span>
              </div>
              <Input
                id="cfg_background_overlay"
                type="range"
                min="0"
                max="100"
                value={form.background_overlay}
                onChange={(e) => setForm((p) => ({ ...p, background_overlay: e.target.value }))}
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
