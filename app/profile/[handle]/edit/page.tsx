import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getGooglePictureFromMetadata } from "@/utils/avatar";
import EditProfileClient from "../../components/EditProfileClient";

export default async function EditProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: handleParam } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/profile/${handleParam}/edit`)}`);
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("handle", handleParam).single();

  if (!profile) {
    redirect("/dashboard");
  }

  if (profile.id !== user.id) {
    redirect(`/profile/${handleParam}`);
  }

  const googlePictureUrl = getGooglePictureFromMetadata(user.user_metadata as Record<string, unknown>);

  return (
    <EditProfileClient
      profile={{
        id: profile.id,
        handle: profile.handle,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        wallet_address: profile.wallet_address,
        show_rewards_publicly: profile.show_rewards_publicly,
      }}
      email={user.email ?? ""}
      googlePictureUrl={googlePictureUrl}
      profileHandleSlug={handleParam}
    />
  );
}
