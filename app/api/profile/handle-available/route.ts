import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const handleRaw = req.nextUrl.searchParams.get("handle")?.trim().toLowerCase() ?? "";
    const currentHandle = req.nextUrl.searchParams.get("current")?.trim().toLowerCase() ?? "";

    if (!handleRaw) {
      return NextResponse.json({ available: false, error: "Handle required" }, { status: 400 });
    }

    if (handleRaw === currentHandle) {
      return NextResponse.json({ available: true, unchanged: true });
    }

    const { data: row } = await supabase.from("profiles").select("id").eq("handle", handleRaw).maybeSingle();

    const available = !row;
    return NextResponse.json({ available });
  } catch (err: unknown) {
    console.error("handle-available error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
