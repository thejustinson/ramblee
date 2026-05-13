import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getGooglePictureFromMetadata } from "@/utils/avatar";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = getGooglePictureFromMetadata(user.user_metadata as Record<string, unknown>);
    if (!url) {
      return NextResponse.json({ error: "No Google profile picture on this account" }, { status: 400 });
    }

    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);

    if (error) {
      console.error("google-avatar update error:", error);
      return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
    }

    return NextResponse.json({ success: true, avatar_url: url });
  } catch (err: unknown) {
    console.error("google-avatar error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
