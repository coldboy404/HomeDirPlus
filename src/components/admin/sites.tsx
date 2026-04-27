"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import type { SiteData } from "@/lib/types";
import { getIcon, getSiteIconUrl, commonIcons } from "@/lib/icons";
import { apiPost, readFileAsDataUrl } from "@/lib/client-api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, ChevronRight, Download, GripVertical, ImageDown, Loader2, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";

interface SiteFormData {
  name: string;
  desc: string;
  icon: string;
  icon_url: string;
  icon_custom_url: string;
  category: string;
  url_internal: string;
  url_external: string;
  sort_order: number;
}

const emptyForm: SiteFormData = {
  name: "",
  desc: "",
  icon: "Globe",
  icon_url: "",
  icon_custom_url: "",
  category: "",
  url_internal: "",
  url_external: "",
  sort_order: 0,
};

type DragState = { id: string; category: string } | null;

function groupSites(sites: SiteData[]) {
  return sites.reduce<Record<string, SiteData[]>>((acc, site) => {
    (acc[site.category] ??= []).push(site);
    return acc;
  }, {});
}

export function AdminSites({
  sites,
  categories,
  onMutated,
}: {
  sites: SiteData[];
  categories: string[];
  onMutated?: () => void | Promise<void>;
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<string | null>(null);
  const [form, setForm] = useState<SiteFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchingIcon, setFetchingIcon] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [orderedSites, setOrderedSites] = useState<SiteData[]>(sites);
  const [dragging, setDragging] = useState<DragState>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  const groupedSites = useMemo(() => groupSites(orderedSites), [orderedSites]);

  if (orderedSites !== sites && orderedSites.length !== sites.length) {
    setOrderedSites(sites);
  }

  const toggleGroup = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const openCreate = () => {
    setEditingSite(null);
    setForm({ ...emptyForm, category: categories[0] || "" });
    setEditDialogOpen(true);
  };

  const openEdit = (site: SiteData) => {
    setEditingSite(site.id);
    setForm({
      name: site.name,
      desc: site.desc,
      icon: site.icon,
      icon_url: site.icon_url,
      icon_custom_url: site.icon_custom_url || "",
      category: site.category,
      url_internal: site.url.internal,
      url_external: site.url.external,
      sort_order: site.sort_order,
    });
    setEditDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const data = {
        name: form.name,
        desc: form.desc,
        icon: form.icon,
        icon_url: form.icon_url,
        icon_custom_url: form.icon_custom_url,
        category: form.category,
        url_internal: form.url_internal,
        url_external: form.url_external,
        sort_order: form.sort_order,
      };

      const result = editingSite
        ? await apiPost("/api/admin/sites", { body: { action: "update", id: editingSite, data } })
        : await apiPost("/api/admin/sites", { body: { action: "create", data } });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(editingSite ? "站点已更新" : "站点已创建");
      await onMutated?.();
      setEditDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }, [form, editingSite, setEditDialogOpen, onMutated]);

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const result = await apiPost("/api/admin/sites", { body: { action: "delete", id: deletingId } });
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("站点已删除");
        await onMutated?.();
      }
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  }, [deletingId, onMutated]);

  const updateField = (field: keyof SiteFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const deletingSiteName = orderedSites.find((s) => s.id === deletingId)?.name;

  const persistOrder = useCallback(async (nextSites: SiteData[]) => {
    setSavingOrder(true);
    try {
      const payload = Object.values(groupSites(nextSites)).flatMap((group) =>
        group.map((site, index) => ({ id: site.id, category: site.category, sort_order: index + 1 }))
      );
      const result = await apiPost("/api/admin/sites", { body: { action: "reorder", items: payload } });
      if (!result.success) {
        toast.error(result.error);
        setOrderedSites(sites);
        return;
      }
      toast.success("排序已保存");
      await onMutated?.();
    } finally {
      setSavingOrder(false);
    }
  }, [sites, onMutated]);

  const moveSite = useCallback((fromId: string, toId: string, targetCategory: string) => {
    if (fromId === toId) return;
    setOrderedSites((prev) => {
      const moving = prev.find((site) => site.id === fromId);
      const target = prev.find((site) => site.id === toId);
      if (!moving || !target) return prev;
      const next = prev.filter((site) => site.id !== fromId);
      const targetIndex = next.findIndex((site) => site.id === toId);
      const moved = { ...moving, category: targetCategory };
      next.splice(targetIndex, 0, moved);
      void persistOrder(next);
      return next;
    });
  }, [persistOrder]);

  const importFile = useCallback(async (file: File, mode: "append" | "replace") => {
    setImporting(true);
    try {
      const text = await file.text();
      const result = await apiPost<{ count: number; format: "homedirplus" | "sunpanel" }>("/api/admin/sites", { body: { action: "import", jsonText: text, mode } });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`已导入 ${result.count} 个站点（${result.format === "sunpanel" ? "SunPanel" : "HomeDirPlus"}）`);
      await onMutated?.();
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [onMutated]);

  const uploadIconFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("请选择图片文件"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("站点图标不能超过 2MB"); return; }
    setUploadingIcon(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await apiPost<{ data: string }>("/api/admin/config", { body: { action: "upload", kind: "site-icon", dataUrl } });
      if (!result.success) { toast.error(result.error); return; }
      updateField("icon_custom_url", result.data);
      updateField("icon_url", "");
      toast.success("本地图标已上传");
    } finally {
      setUploadingIcon(false);
      if (iconFileInputRef.current) iconFileInputRef.current.value = "";
    }
  }, []);

  const handleExport = useCallback(async () => {
      const result = await apiPost<{ data: string }>("/api/admin/sites", { body: { action: "export" } });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([result.data], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HomeDirPlus-Data-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("导出完成");
  }, []);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{orderedSites.length} 个站点{savingOrder ? " · 正在保存排序…" : ""}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json,.sun-panel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const replace = window.confirm("是否清空当前站点后导入？\n\n确定：清空后导入\n取消：追加导入");
              void importFile(file, replace ? "replace" : "append");
            }}
          />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={importing}>
            <Download className="size-4" />
            导出 JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            导入 JSON
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            添加站点
          </Button>
        </div>
      </div>

      {orderedSites.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          暂无站点，点击上方按钮添加
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedSites).map(([category, group]) => {
            const isOpen = !collapsed.has(category);
            return (
              <div key={category} className="overflow-hidden rounded-lg border">
                <button
                  type="button"
                  onClick={() => toggleGroup(category)}
                  className="flex w-full items-center gap-2 bg-muted/30 px-3.5 py-2 text-left transition-colors hover:bg-muted/60"
                >
                  <ChevronRight className={`size-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  <span className="text-xs font-medium">{category}</span>
                  <span className="text-[10px] text-muted-foreground/50">{group.length}</span>
                </button>
                {isOpen && (
                  <div>
                    {group.map((site, i) => {
                      const Icon = getIcon(site.icon);
                      return (
                        <div
                          key={site.id}
                          draggable
                          onDragStart={() => setDragging({ id: site.id, category })}
                          onDragEnd={() => setDragging(null)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (dragging) moveSite(dragging.id, site.id, category);
                          }}
                          className={`group flex cursor-grab items-center gap-3 px-3.5 py-2 transition-colors hover:bg-accent/20 active:cursor-grabbing ${
                            i !== group.length - 1 ? "border-b" : ""
                          }`}
                        >
                          <GripVertical className="size-3.5 shrink-0 text-muted-foreground/35" />
                          {(site.icon_custom_url || site.icon_url) ? (
                            <img src={getSiteIconUrl(site.icon_url, site.icon_custom_url)} alt="" className="size-4 shrink-0 rounded object-contain" />
                          ) : (
                            <Icon className="size-3.5 shrink-0 text-muted-foreground/60" />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-sm">{site.name}</span>
                            {site.desc && (
                              <span className="ml-2 text-[11px] text-muted-foreground/50">{site.desc}</span>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(site)}>
                              <Pencil className="size-3" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" className="text-destructive/60 hover:text-destructive" onClick={() => confirmDelete(site.id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 编辑/创建站点弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSite ? "编辑站点" : "添加站点"}</DialogTitle>
            <DialogDescription>
              {editingSite ? "修改站点信息" : "填写站点信息以添加到导航"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 名称 + 图标 */}
            <div className="flex items-center gap-2">
              {(form.icon_custom_url || form.icon_url) ? (
                <button
                  type="button"
                  onClick={() => { updateField("icon_url", ""); updateField("icon_custom_url", ""); }}
                  className="group relative size-8 shrink-0 overflow-hidden rounded-lg border"
                  title="点击移除当前图标"
                >
                  <img src={getSiteIconUrl(form.icon_url, form.icon_custom_url)} alt="" className="size-full object-contain p-1" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <X className="size-3 text-white" />
                  </div>
                </button>
              ) : (
              <Select value={form.icon} onValueChange={(v) => updateField("icon", v)}>
                <SelectTrigger className="size-8 shrink-0 items-center justify-center gap-0 p-0 [&>svg:last-child]:hidden">
                  {(() => { const Ic = getIcon(form.icon); return <Ic className="size-4" />; })()}
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="max-h-52 w-auto min-w-0">
                  <div className="grid grid-cols-6 gap-0.5 p-1">
                    {commonIcons.map((name) => {
                      const Ic = getIcon(name);
                      return (
                        <SelectItem key={name} value={name} className="flex size-8 items-center justify-center rounded-md p-0 pr-0 pl-0 data-[state=checked]:bg-accent [&>span:first-child]:hidden">
                          <Ic className="size-4" />
                        </SelectItem>
                      );
                    })}
                  </div>
                </SelectContent>
              </Select>
              )}
              <Input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="站点名称"
                className="h-8 flex-1"
              />
            </div>

            {/* 自定义图标地址 */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <input
                ref={iconFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadIconFile(file);
                }}
              />
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] font-medium text-muted-foreground">自定义图标 <span className="text-muted-foreground/40">本地上传或图片地址优先显示</span></div>
                {form.icon_custom_url && (
                  <button
                    type="button"
                    onClick={() => updateField("icon_custom_url", "")}
                    className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    清除
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 text-center text-[10px] text-muted-foreground">图</span>
                <Input
                  value={form.icon_custom_url}
                  onChange={(e) => {
                    updateField("icon_custom_url", e.target.value);
                    if (e.target.value.trim()) updateField("icon_url", "");
                  }}
                  placeholder="https://example.com/icon.png"
                  className="h-7 flex-1 text-xs"
                />
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => iconFileInputRef.current?.click()} disabled={uploadingIcon}>
                  {uploadingIcon ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                  上传
                </Button>
              </div>
              <p className="mt-1.5 pl-8 text-[10px] text-muted-foreground/50">支持本地上传或 http/https 图片地址；留空时使用获取图标或 Lucide 图标。</p>
            </div>

            {/* 分类 */}
            <div className="flex items-start gap-2">
              <Label className="mt-1.5 w-8 shrink-0 text-center text-xs text-muted-foreground">分类</Label>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => updateField("category", cat)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                        form.category === cat
                          ? "border-foreground/20 bg-foreground text-background"
                          : "border-border bg-transparent text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateField("category", "")}
                    className={`rounded-md border border-dashed px-2.5 py-1 text-xs transition-colors ${
                      !categories.includes(form.category)
                        ? "border-foreground/20 bg-foreground text-background"
                        : "border-border text-muted-foreground/50 hover:border-foreground/20 hover:text-foreground"
                    }`}
                  >
                    +自定义
                  </button>
                </div>
                {!categories.includes(form.category) && (
                  <Input
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    placeholder="输入新分类名"
                    className="mt-2 h-7 text-xs"
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* 描述 */}
            <div className="flex items-center gap-2">
              <Label className="w-8 shrink-0 text-center text-xs text-muted-foreground">描述</Label>
              <Input
                value={form.desc}
                onChange={(e) => updateField("desc", e.target.value)}
                placeholder="可选，简短描述"
                className="h-8 flex-1"
              />
            </div>

            {/* 地址 */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] font-medium text-muted-foreground">访问地址 <span className="text-muted-foreground/40">至少填一个</span></div>
                <button
                  type="button"
                  disabled={fetchingIcon || (!form.url_internal && !form.url_external)}
                  onClick={async () => {
                    const url = form.url_external || form.url_internal;
                    if (!url) return;
                    setFetchingIcon(true);
                    try {
                      const result = await apiPost<{ data: string }>("/api/admin/sites", { body: { action: "favicon", url } });
                      if (result.success) {
                        updateField("icon_url", result.data);
                        updateField("icon_custom_url", "");
                        toast.success("图标获取成功");
                      } else {
                        toast.error(result.error);
                      }
                    } finally {
                      setFetchingIcon(false);
                    }
                  }}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                >
                  {fetchingIcon ? <Loader2 className="size-3 animate-spin" /> : <ImageDown className="size-3" />}
                  获取图标
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-[10px] text-muted-foreground">内</span>
                  <Input
                    value={form.url_internal}
                    onChange={(e) => updateField("url_internal", e.target.value)}
                    placeholder="http://192.168.1.x:port"
                    className="h-7 flex-1 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-[10px] text-muted-foreground">外</span>
                  <Input
                    value={form.url_external}
                    onChange={(e) => updateField("url_external", e.target.value)}
                    placeholder="https://service.example.com"
                    className="h-7 flex-1 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 排序 */}
            <div className="flex items-center gap-2">
              <Label className="w-8 shrink-0 text-center text-xs text-muted-foreground">排序</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => updateField("sort_order", parseInt(e.target.value) || 0)}
                className="h-8 w-20"
              />
              <span className="text-[10px] text-muted-foreground/50">越小越靠前</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !form.name || !form.category}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {editingSite ? "保存" : "创建"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除站点确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              确认删除
            </DialogTitle>
            <DialogDescription>
              确定要删除「{deletingSiteName}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
