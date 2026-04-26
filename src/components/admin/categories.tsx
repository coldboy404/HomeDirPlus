"use client";

import { useState, useCallback, useMemo } from "react";
import type { CategoryConfig, SiteData } from "@/lib/types";
import { getIcon, getSiteIconUrl } from "@/lib/icons";
import {
  renameCategoryAction,
  deleteCategoryAction,
  updateCategorySortAction,
} from "@/app/dash/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2, Save, AlertTriangle } from "lucide-react";

export function AdminCategories({ sites, categoryConfigs }: { sites: SiteData[]; categoryConfigs: CategoryConfig[] }) {
  const categoryStats = useMemo(() => {
    const countMap = new Map<string, number>();
    const sortMap = new Map(categoryConfigs.map((category) => [category.name, category.sort_order]));
    for (const s of sites) countMap.set(s.category, (countMap.get(s.category) || 0) + 1);
    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count, sort_order: sortMap.get(name) ?? 0 }))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }, [sites, categoryConfigs]);

  // 重命名
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sortValue, setSortValue] = useState(0);
  const [renaming, setRenaming] = useState(false);

  const openRename = (name: string, sortOrder: number) => {
    setRenameTarget(name);
    setRenameValue(name);
    setSortValue(sortOrder);
  };

  const handleRename = useCallback(async () => {
    if (!renameTarget) return;
    setRenaming(true);
    try {
      const name = renameValue.trim();
      const sortResult = await updateCategorySortAction(renameTarget, sortValue);
      if (!sortResult.success) { toast.error(sortResult.error); return; }
      const result = await renameCategoryAction(renameTarget, name);
      if (!result.success) { toast.error(result.error); return; }
      toast.success(`分类已保存`);
      setRenameTarget(null);
    } finally { setRenaming(false); }
  }, [renameTarget, renameValue, sortValue]);

  // 删除
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const handleDeleteItem = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletingItem(true);
    try {
      const result = await deleteCategoryAction(deleteTarget);
      if (!result.success) { toast.error(result.error); return; }
      toast.success("分类及其站点已删除");
      setDeleteTarget(null);
    } finally { setDeletingItem(false); }
  }, [deleteTarget]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {categoryStats.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
            暂无分类
          </div>
        ) : (
          categoryStats.map(({ name: cat, count, sort_order }) => {
            const catSites = sites.filter((s) => s.category === cat);
            return (
              <div
                key={cat}
                className="group rounded-lg border bg-card p-4 transition-colors hover:bg-accent/20"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{cat}</div>
                    <div className="text-xs text-muted-foreground">排序 {sort_order} · {count} 个站点</div>
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" onClick={() => openRename(cat, sort_order)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(cat)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {catSites.slice(0, 3).map((site) => {
                    const Icon = getIcon(site.icon);
                    return (
                      <div key={site.id} className="flex items-center gap-2">
                        {(site.icon_custom_url || site.icon_url) ? (
                          <img src={getSiteIconUrl(site.icon_url, site.icon_custom_url)} alt="" className="size-4 shrink-0 rounded object-contain" />
                        ) : (
                          <Icon className="size-3.5 text-muted-foreground/60" />
                        )}
                        <span className="truncate text-xs text-muted-foreground">{site.name}</span>
                      </div>
                    );
                  })}
                  {catSites.length > 3 && (
                    <div className="text-[10px] text-muted-foreground/50">
                      还有 {catSites.length - 3} 个…
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 重命名分类弹窗 */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑分类</DialogTitle>
            <DialogDescription>
              修改「{renameTarget}」的名称和排序，排序越小越靠前
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="输入新名称"
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
              />
            </div>
            <div className="grid gap-1.5">
              <Input
                type="number"
                value={sortValue}
                onChange={(e) => setSortValue(parseInt(e.target.value) || 0)}
                placeholder="排序数字"
              />
              <p className="text-[11px] text-muted-foreground">排序越小越靠前</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRenameTarget(null)}>
              取消
            </Button>
            <Button size="sm" onClick={handleRename} disabled={renaming || !renameValue.trim()}>
              {renaming ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              确认
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除分类确认弹窗 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              确认删除
            </DialogTitle>
            <DialogDescription>
              确定要删除分类「{deleteTarget}」吗？该分类下的所有站点也会被删除。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteItem}
              disabled={deletingItem}
            >
              {deletingItem ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
