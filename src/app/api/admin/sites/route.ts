import { NextResponse } from "next/server";
import {
  createSiteService,
  deleteSiteService,
  exportSitesService,
  fetchFaviconService,
  importSitesService,
  jsonResult,
  reorderSitesService,
  updateSiteService,
} from "@/lib/admin-service";

export const dynamic = "force-dynamic";

type Body = {
  action?: string;
  id?: string;
  data?: unknown;
  items?: unknown;
  jsonText?: string;
  mode?: "append" | "replace";
  url?: string;
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
      return jsonResult(await createSiteService(body.data as Parameters<typeof createSiteService>[0]));
    case "update":
      return jsonResult(await updateSiteService(body.id || "", body.data as Parameters<typeof updateSiteService>[1]));
    case "delete":
      return jsonResult(await deleteSiteService(body.id || ""));
    case "reorder":
      return jsonResult(await reorderSitesService((body.items || []) as Parameters<typeof reorderSitesService>[0]));
    case "import":
      return jsonResult(await importSitesService(body.jsonText || "", body.mode || "append"));
    case "export":
      return jsonResult(await exportSitesService());
    case "favicon":
      return jsonResult(await fetchFaviconService(body.url || ""));
    default:
      return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
  }
}
