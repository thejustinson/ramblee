import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// /profile/me is a convenience shortcut — redirect to the user's actual handle URL
export default async function MeRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", user.id)
    .single();

  if (!profile?.handle) redirect("/onboarding");

  redirect(`/profile/${profile.handle}`);
}
