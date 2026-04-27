import { NextResponse } from "next/server";
import { jsonResult, updateConfigService, uploadImageService } from "@/lib/admin-service";
import type { SiteConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

type Body = {
  action?: string;
  config?: Partial<SiteConfig>;
  dataUrl?: string;
  kind?: "background" | "site-icon" | "site-logo";
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "请求格式错误" }, { status: 400 });
  }

  switch (body.action) {
    case "update":
      return jsonResult(await updateConfigService(body.config || {}));
    case "upload":
      return jsonResult(await uploadImageService(body.dataUrl || "", body.kind || "site-icon"));
    default:
      return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
  }
}
