import { redirect } from "next/navigation";
import { Terminal } from "lucide-react";
import { hasPassword, isAuthenticated } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params?.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";

  // 已登录则跳转
  if (await isAuthenticated()) redirect(next);

  const needSetup = !hasPassword();

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-foreground">
            <Terminal className="size-6 text-background" />
          </div>
          <div className="text-center">
            <h1 className="text-base font-semibold">{needSetup ? "设置管理密码" : "管理员登录"}</h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {needSetup ? "首次使用，请设置一个密码" : "输入密码以访问后台"}
            </p>
          </div>
        </div>
        <LoginForm needSetup={needSetup} next={next} />
        <p className="mt-6 text-center text-[10px] text-muted-foreground/40">HomeDirPlus</p>
      </div>
    </div>
  );
}
