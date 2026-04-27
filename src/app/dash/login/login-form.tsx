"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setupAction, loginAction } from "./actions";

export function LoginForm({ needSetup }: { needSetup: boolean }) {
  const [state, formAction, pending] = useActionState(
    needSetup ? setupAction : loginAction,
    {}
  );
  const prevError = useRef(state.error);

  useEffect(() => {
    if (state.error && state.error !== prevError.current) {
      toast.error(state.error);
    }
    prevError.current = state.error;
  }, [state.error]);

  return (
    <form action={formAction} className="space-y-3">
      <Input
        name="password"
        type="password"
        placeholder="输入密码"
        autoFocus
        required
        className="h-9"
      />
      {needSetup && (
        <Input
          name="confirm"
          type="password"
          placeholder="确认密码"
          required
          className="h-9"
        />
      )}
      <Button type="submit" className="w-full bg-[oklch(0.65_0.10_155)] text-white hover:bg-[oklch(0.60_0.10_155)]" disabled={pending}>
        {pending && <Loader2 className="mr-1.5 size-3 animate-spin" />}
        {needSetup ? "设置密码" : "登录"}
      </Button>
    </form>
  );
}
