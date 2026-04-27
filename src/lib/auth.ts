import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { getConfig, updateConfig } from "@/lib/db";

const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天
const SESSION_HEADER = "x-admin-session";

function hash(str: string): string {
  return createHash("sha256").update(str).digest("hex");
}

/** 是否已设置密码 */
export function hasPassword(): boolean {
  return !!getConfig().admin_password;
}

/** 设置密码（首次） */
export function setPassword(password: string): void {
  updateConfig({ admin_password: hash(password) });
}

function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return token === getConfig().admin_session;
}

async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/** 验证密码并创建 session，返回 token */
export async function createSession(password: string): Promise<string | null> {
  const stored = getConfig().admin_password;
  if (!stored || hash(password) !== stored) return null;

  const token = randomBytes(32).toString("hex");
  updateConfig({ admin_session: token });
  await setSessionCookie(token);
  return token;
}

/** 验证密码并设置 session cookie */
export async function login(password: string): Promise<boolean> {
  return !!(await createSession(password));
}

/** 检查当前请求是否已登录 */
export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return isValidSessionToken(jar.get(COOKIE_NAME)?.value);
}

/** 检查 API 请求是否已登录，支持 cookie + header 双通道 */
export async function isAuthenticatedRequest(request: Request): Promise<boolean> {
  if (isValidSessionToken(request.headers.get(SESSION_HEADER))) return true;
  return isAuthenticated();
}

/** 登出 */
export async function logout(): Promise<void> {
  updateConfig({ admin_session: "" });
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
