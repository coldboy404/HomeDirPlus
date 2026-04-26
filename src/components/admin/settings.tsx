"use client";

import { useState, useCallback } from "react";
import { updateConfigAction } from "@/app/dash/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";

export function AdminSettings({ config }: { config: { site_name: string; site_description: string; footer_text: string; background_image_url: string } }) {
  const [form, setForm] = useState({
    site_name: config.site_name,
    site_description: config.site_description,
    footer_text: config.footer_text,
    background_image_url: config.background_image_url,
  });
  const [saving, setSaving] = useState(false);

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
          <div className="grid gap-1.5">
            <Label htmlFor="cfg_background">背景图片</Label>
            <Input
              id="cfg_background"
              value={form.background_image_url}
              onChange={(e) => setForm((p) => ({ ...p, background_image_url: e.target.value }))}
              placeholder="https://example.com/background.jpg"
            />
            <p className="text-[11px] text-muted-foreground">首页背景图片地址，留空则使用默认纯色背景</p>
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
