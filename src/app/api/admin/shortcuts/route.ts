import { NextResponse } from "next/server";
import { createShortcutService, deleteShortcutService, jsonResult } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

type Body = {
  action?: string;
  id?: string;
  key?: string;
  siteId?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "请求格式错误" }, { status: 400 });
  }

  switch (body.action) {
    case "create":
      return jsonResult(await createShortcutService(body.key || "", body.siteId || ""));
    case "delete":
      return jsonResult(await deleteShortcutService(body.id || ""));
    default:
      return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
  }
}
