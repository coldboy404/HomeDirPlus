"use client";

import { useState, useCallback } from "react";
import type { SiteData } from "@/lib/types";
import { apiPost } from "@/lib/client-api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Keyboard } from "lucide-react";

const RESERVED_KEYS = ["K"];

export interface ShortcutData {
  id: string;
  key: string;
  site_id: string;
}

export function AdminShortcuts({
  shortcuts,
  sites,
  onMutated,
}: {
  shortcuts: ShortcutData[];
  sites: SiteData[];
  onMutated?: () => void | Promise<void>;
}) {
  const [key, setKey] = useState("");
  const [siteId, setSiteId] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (!key || !siteId) { toast.error("请填写热键和选择站点"); return; }
    const upperKey = key.toUpperCase();
    if (RESERVED_KEYS.includes(upperKey)) { toast.error(`⌘${upperKey} 为内置热键，已被占用`); return; }
    if (shortcuts.some((s) => s.key.toUpperCase() === upperKey)) { toast.error(`⌘${upperKey} 已被占用`); return; }
    setAdding(true);
    try {
      const result = await apiPost("/api/admin/shortcuts", { body: { action: "create", key, siteId } });
      if (!result.success) { toast.error(result.error); return; }
      toast.success("热键已添加");
      await onMutated?.();
      setKey("");
      setSiteId("");
    } finally { setAdding(false); }
  }, [key, siteId, shortcuts, onMutated]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const result = await apiPost("/api/admin/shortcuts", { body: { action: "delete", id } });
      if (!result.success) { toast.error(result.error); return; }
      toast.success("热键已删除");
      await onMutated?.();
    } finally { setDeletingId(null); }
  }, [onMutated]);

  const getSiteName = (id: string) => sites.find((s) => s.id === id)?.name || "未知站点";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Keyboard className="size-4" />
          热键管理
        </div>
        <p className="mb-4 text-[11px] text-muted-foreground">
          按住 ⌘/Ctrl 显示热键面板，按对应字母直接打开站点。
        </p>

        {/* 已有热键列表 */}
        {shortcuts.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            暂无自定义热键
          </div>
        ) : (
          <div className="mb-4 space-y-1.5">
            {shortcuts.map((s) => (
              <div
                key={s.id}
                className="group flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-accent/20"
              >
                <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border bg-background text-xs font-semibold shadow-sm">
                  {s.key}
                </kbd>
                <span className="flex-1 text-sm">{getSiteName(s.site_id)}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive/60 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                >
                  {deletingId === s.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 添加新热键（有可用站点时才显示） */}
        {sites.filter((site) => !shortcuts.some((s) => s.site_id === site.id)).length > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <Input
              value={key}
              onChange={(e) => {
                const v = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 1).toUpperCase();
                setKey(v);
              }}
              className="size-8 shrink-0 rounded-full text-center text-xs font-semibold uppercase px-0"
              maxLength={1}
            />
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
                <SelectValue placeholder="选择站点" />
              </SelectTrigger>
              <SelectContent>
                {sites.filter((site) => !shortcuts.some((s) => s.site_id === site.id)).map((site) => (
                  <SelectItem key={site.id} value={site.id} className="text-xs">
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 shrink-0" onClick={handleAdd} disabled={adding || !key || !siteId}>
              {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              添加
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
