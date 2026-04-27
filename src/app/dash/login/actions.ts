"use server";

import { redirect } from "next/navigation";
import { hasPassword, setPassword, login, logout } from "@/lib/auth";

type Result = { error?: string };

export async function setupAction(_: Result, formData: FormData): Promise<Result> {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 4) return { error: "密码至少 4 位" };
  if (password !== confirm) return { error: "两次密码不一致" };
  if (hasPassword()) return { error: "密码已设置" };

  setPassword(password);
  await login(password);
  redirect("/dash");
}

export async function loginAction(_: Result, formData: FormData): Promise<Result> {
  const password = formData.get("password") as string;
  if (!password) return { error: "请输入密码" };

  const ok = await login(password);
  if (!ok) return { error: "密码错误" };
  redirect("/dash");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/dash/login");
}
