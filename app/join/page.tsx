import { Suspense } from "react";
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
  return <JoinForm initialCode={params.code?.toUpperCase() || ""} />;
}
