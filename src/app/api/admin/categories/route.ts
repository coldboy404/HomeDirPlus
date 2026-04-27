import { NextResponse } from "next/server";
import {
  deleteCategoryService,
  jsonResult,
  renameCategoryService,
  updateCategorySortService,
} from "@/lib/admin-service";

export const dynamic = "force-dynamic";

type Body = {
  action?: string;
  oldName?: string;
  newName?: string;
  name?: string;
  sortOrder?: number;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "请求格式错误" }, { status: 400 });
  }

  switch (body.action) {
    case "rename":
      return jsonResult(await renameCategoryService(body.oldName || "", body.newName || ""));
    case "sort":
      return jsonResult(await updateCategorySortService(body.name || "", Number(body.sortOrder)));
    case "delete":
      return jsonResult(await deleteCategoryService(body.name || ""));
    default:
      return NextResponse.json({ success: false, error: "未知操作" }, { status: 400 });
  }
}
