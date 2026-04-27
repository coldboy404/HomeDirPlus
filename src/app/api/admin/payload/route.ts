import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { getAdminPayload } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticatedRequest(request))) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json(getAdminPayload());
}
