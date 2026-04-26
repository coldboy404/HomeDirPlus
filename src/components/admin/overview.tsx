"use client";

import { useMemo } from "react";
import type { SiteData } from "@/lib/types";
import { getIcon, getSiteIconUrl } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Layers } from "lucide-react";

export function AdminOverview({
  sites,
  categoryCount,
  onNavigate,
}: {
  sites: SiteData[];
  categoryCount: number;
  onNavigate: (tab: string) => void;
}) {
  const recentSites = useMemo(
    () => [...sites].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [sites]
  );

  return (
    <>
      {/* 统计卡片 */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3">
        {[
          { label: "站点", value: sites.length, icon: LayoutGrid, tab: "sites" },
          { label: "分类", value: categoryCount, icon: Layers, tab: "categories" },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => onNavigate(stat.tab)}
            className="group rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/30 sm:p-4"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <stat.icon className="size-3.5" />
              {stat.label}
            </div>
            <div className="mt-1.5 text-xl font-semibold sm:mt-2 sm:text-2xl">{stat.value}</div>
          </button>
        ))}
      </div>

      {/* 最近站点 */}
      <div className="mb-2 text-xs font-medium text-muted-foreground">最近添加</div>
      <div className="space-y-2">
        {recentSites.map((site) => {
          const Icon = getIcon(site.icon);
          return (
            <div
              key={site.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                {(site.icon_custom_url || site.icon_url) ? (
                  <img src={getSiteIconUrl(site.icon_url, site.icon_custom_url)} alt="" className="size-5 rounded-md object-contain" />
                ) : (
                  <Icon className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{site.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{site.category}</Badge>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{site.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
