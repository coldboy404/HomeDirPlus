"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "latest"; latest: string }
  | { status: "update"; latest: string; url: string }
  | { status: "error"; message: string };

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, "");
}

function compareVersion(a: string, b: string) {
  const pa = normalizeVersion(a).split(/[.-]/).map((part) => Number.parseInt(part, 10));
  const pb = normalizeVersion(b).split(/[.-]/).map((part) => Number.parseInt(part, 10));
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i += 1) {
    const na = Number.isFinite(pa[i]) ? pa[i] : 0;
    const nb = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }

  return 0;
}

async function getLatestVersion(): Promise<{ version: string; url: string }> {
  const releaseRes = await fetch("https://api.github.com/repos/coldboy404/HomeDirPlus/releases/latest", {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (releaseRes.ok) {
    const release = (await releaseRes.json()) as { tag_name?: string; html_url?: string };
    if (release.tag_name) {
      return {
        version: release.tag_name,
        url: release.html_url || `https://github.com/coldboy404/HomeDirPlus/releases/tag/${release.tag_name}`,
      };
    }
  }

  const tagsRes = await fetch("https://api.github.com/repos/coldboy404/HomeDirPlus/tags?per_page=1", {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!tagsRes.ok) throw new Error("无法获取最新版本信息");

  const tags = (await tagsRes.json()) as { name?: string; commit?: { sha?: string } }[];
  const latestTag = tags[0]?.name;
  if (!latestTag) throw new Error("仓库暂无可用版本标签");

  return {
    version: latestTag,
    url: `https://github.com/coldboy404/HomeDirPlus/releases/tag/${latestTag}`,
  };
}

export function UpdateChecker({ currentVersion }: { currentVersion: string }) {
  const [state, setState] = useState<CheckState>({ status: "idle" });

  const checkUpdate = useCallback(async () => {
    setState({ status: "checking" });
    try {
      const latest = await getLatestVersion();
      if (compareVersion(latest.version, currentVersion) > 0) {
        setState({ status: "update", latest: latest.version, url: latest.url });
      } else {
        setState({ status: "latest", latest: latest.version });
      }
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "检测更新失败" });
    }
  }, [currentVersion]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">检测更新</div>
          <div className="mt-1 text-xs text-muted-foreground">当前版本 v{currentVersion}</div>
        </div>
        <Button size="sm" variant="outline" onClick={checkUpdate} disabled={state.status === "checking"}>
          {state.status === "checking" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          检测
        </Button>
      </div>

      {state.status === "latest" && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-primary" />
          已是最新版本：{state.latest}
        </div>
      )}

      {state.status === "update" && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <AlertCircle className="size-3.5 text-primary" />
          发现新版本：{state.latest}
          <a href={state.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-foreground hover:underline">
            查看
            <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="size-3.5" />
          {state.message}
        </div>
      )}
    </div>
  );
}
