import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import JoinForm from "./JoinForm";

export default function JoinGamePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-lime border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinFormWrapper searchParams={searchParams} />
    </Suspense>
  );
}

async function JoinFormWrapper({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let defaultName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle, display_name")
      .eq("id", user.id)
      .single();
    defaultName = profile?.handle || profile?.display_name || "";
  }
  return <JoinForm initialCode={params.code?.toUpperCase() || ""} defaultName={defaultName} />;
}
