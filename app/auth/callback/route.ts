import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getGooglePictureFromMetadata } from "@/utils/avatar";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData?.session) {
      const user = sessionData.session.user;
      console.log('Auth callback user metadata:', JSON.stringify(user.user_metadata, null, 2));
      const googlePic = getGooglePictureFromMetadata(user.user_metadata as Record<string, unknown>);
      console.log('Extracted Google picture:', googlePic);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          display_name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Player",
          avatar_url: googlePic ?? null,
        });
      } else if (!profile.avatar_url?.trim() && googlePic) {
        await supabase.from("profiles").update({ avatar_url: googlePic }).eq("id", user.id);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
