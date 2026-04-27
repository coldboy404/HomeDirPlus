import { NextResponse } from "next/server";
import { isAuthenticated, login } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LoginBody = {
  password?: unknown;
};

export async function GET() {
  return NextResponse.json({ authenticated: await isAuthenticated() });
}

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "请求格式错误" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) return NextResponse.json({ success: false, error: "请输入密码" }, { status: 400 });

  const ok = await login(password);
  if (!ok) return NextResponse.json({ success: false, error: "密码错误" }, { status: 401 });

  return NextResponse.json({ success: true });
}
