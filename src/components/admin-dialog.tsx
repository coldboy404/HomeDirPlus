"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPanel } from "@/components/admin-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Settings, Terminal } from "lucide-react";
import { toast } from "sonner";
import type { AdminPayload } from "@/lib/admin-data";
import { authHeaders, setStoredSessionToken } from "@/lib/client-api";

type AdminDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayloadChange?: (payload: AdminPayload) => void;
  authenticated: boolean;
};

type LoginResponse = { success: true; token: string } | { success: false; error?: string };

export function AdminDialog({ open, onOpenChange, onPayloadChange, authenticated }: AdminDialogProps) {
  const [password, setPassword] = useState("");
  const [payload, setPayload] = useState<AdminPayload | null>(null);
  const [hasSession, setHasSession] = useState(authenticated);
  const [loading, setLoading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const loadPayload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payload", { cache: "no-store", headers: authHeaders() });
      if (res.status === 401) {
        setPayload(null);
        setHasSession(false);
        return false;
      }
      if (!res.ok) throw new Error("payload");
      const nextPayload = (await res.json()) as AdminPayload;
      setPayload(nextPayload);
      setHasSession(true);
      onPayloadChange?.(nextPayload);
      return true;
    } catch {
      toast.error("加载后台数据失败");
      return false;
    } finally {
      setLoading(false);
    }
  }, [onPayloadChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (nextOpen) void loadPayload();
    },
    [loadPayload, onOpenChange]
  );

  const handleLogin = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!password) {
        toast.error("请输入密码");
        return;
      }

      setLoggingIn(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const data = (await res.json().catch(() => ({}))) as LoginResponse;
        if (!res.ok || !data.success) {
          toast.error(data.success === false && data.error ? data.error : "登录失败");
          return;
        }
        setStoredSessionToken(data.token);
        setHasSession(true);
        setPassword("");
        toast.success("登录成功");
        await loadPayload();
      } catch {
        toast.error("登录请求失败");
      } finally {
        setLoggingIn(false);
      }
    },
    [loadPayload, password]
  );

  useEffect(() => {
    if (open && hasSession && !payload && !loading) void loadPayload();
  }, [open, hasSession, payload, loading, loadPayload]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-4" />
            站点管理
          </DialogTitle>
          <DialogDescription>
            在当前页面完成登录和配置，避免复杂反代链路影响 /dash 登录提交。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            正在加载后台...
          </div>
        ) : payload ? (
          <AdminPanel {...payload} onMutated={async () => { await loadPayload(); }} />
        ) : !hasSession ? (
          <form onSubmit={handleLogin} className="mx-auto w-full max-w-xs space-y-4 py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-foreground">
                <Terminal className="size-6 text-background" />
              </div>
              <div>
                <h3 className="text-base font-semibold">管理员登录</h3>
                <p className="mt-1.5 text-xs text-muted-foreground">输入密码以打开后台</p>
              </div>
            </div>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="输入密码"
              autoFocus
              required
              className="h-9"
            />
            <Button type="submit" className="w-full bg-[oklch(0.65_0.10_155)] text-white hover:bg-[oklch(0.60_0.10_155)]" disabled={loggingIn}>
              {loggingIn && <Loader2 className="mr-1.5 size-3 animate-spin" />}
              登录
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            正在恢复登录状态...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
