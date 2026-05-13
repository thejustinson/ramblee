"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  Pencil,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { PublicKey } from "@solana/web3.js";
import AvatarDisplay from "@/app/components/AvatarDisplay";
import { resolveProfileAvatar } from "@/utils/avatar";

type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  wallet_address: string | null;
  show_rewards_publicly: boolean | null;
};

function isValidSolanaAddress(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (t.length < 32 || t.length > 44) return false;
  try {
    new PublicKey(t);
    return true;
  } catch {
    return false;
  }
}

export default function EditProfileClient({
  profile,
  email,
  googlePictureUrl,
  profileHandleSlug,
}: {
  profile: ProfileRow;
  email: string;
  googlePictureUrl: string | null;
  profileHandleSlug: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const initialShowRewards = profile.show_rewards_publicly ?? false;

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [handle, setHandle] = useState(profile.handle);
  const [wallet, setWallet] = useState(profile.wallet_address ?? "");
  const [showRewards, setShowRewards] = useState(initialShowRewards);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);

  const [walletHelpOpen, setWalletHelpOpen] = useState(false);
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken" | "unchanged">("idle");
  const [walletValid, setWalletValid] = useState<"idle" | "valid" | "invalid">("idle");

  const [saving, setSaving] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ displayName?: string; handle?: string; wallet?: string }>({});

  const baseline = useMemo(
    () =>
      JSON.stringify({
        displayName: profile.display_name,
        handle: profile.handle,
        wallet: profile.wallet_address ?? "",
        showRewards: initialShowRewards,
        avatarUrl: profile.avatar_url,
      }),
    [profile, initialShowRewards]
  );

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        displayName,
        handle,
        wallet,
        showRewards,
        avatarUrl,
      }),
    [displayName, handle, wallet, showRewards, avatarUrl]
  );

  const dirty = currentSnapshot !== baseline;

  const resolvedPreview = resolveProfileAvatar({
    profileAvatarUrl: avatarUrl,
    googlePictureUrl,
    displayName,
    handle,
  });

  const charCounterVisible = displayName.length >= 30;

  const checkHandle = useCallback(async () => {
    const h = handle.trim().toLowerCase();
    if (h === profile.handle) {
      setHandleStatus("unchanged");
      return;
    }
    if (h.length < 3) {
      setHandleStatus("idle");
      return;
    }
    setHandleStatus("checking");
    try {
      const q = new URLSearchParams({ handle: h, current: profile.handle });
      const res = await fetch(`/api/profile/handle-available?${q}`);
      const data = await res.json();
      if (!res.ok) {
        setHandleStatus("idle");
        return;
      }
      if (data.unchanged) setHandleStatus("unchanged");
      else setHandleStatus(data.available ? "available" : "taken");
    } catch {
      setHandleStatus("idle");
    }
  }, [handle, profile.handle]);

  const onWalletBlur = () => {
    const w = wallet.trim();
    if (!w) {
      setWalletValid("idle");
      return;
    }
    setWalletValid(isValidSolanaAddress(w) ? "valid" : "invalid");
  };

  useEffect(() => {
    const w = (profile.wallet_address ?? "").trim();
    if (!w) setWalletValid("idle");
    else setWalletValid(isValidSolanaAddress(w) ? "valid" : "invalid");
  }, [profile.wallet_address]);

  const onHandleChange = (raw: string) => {
    const lower = raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setHandle(lower.slice(0, 20));
    setHandleStatus("idle");
  };

  const onDisplayNameChange = (v: string) => {
    setDisplayName(v.slice(0, 40));
  };

  const useGooglePhoto = async () => {
    if (!googlePictureUrl) return;
    setGoogleLoading(true);
    setFormError(null);
    try {
      const res = await fetch("/api/profile/google-avatar", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to use Google photo");
      setAvatarUrl(data.avatar_url);
      router.refresh();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Could not apply Google photo");
    } finally {
      setGoogleLoading(false);
    }
  };

  const save = async () => {
    setFormError(null);
    setFieldErrors({});

    if (displayName.trim().length < 1 || displayName.length > 40) {
      setFieldErrors((f) => ({ ...f, displayName: "1–40 characters required" }));
      return;
    }

    const h = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(h)) {
      setFieldErrors((f) => ({
        ...f,
        handle: "3–20 characters: lowercase letters, numbers, underscores only",
      }));
      return;
    }

    if (h !== profile.handle && handleStatus === "taken") {
      setFieldErrors((f) => ({ ...f, handle: "Handle is already taken" }));
      return;
    }

    const w = wallet.trim();
    if (w && !isValidSolanaAddress(w)) {
      setFieldErrors((f) => ({ ...f, wallet: "Invalid Solana public key" }));
      setWalletValid("invalid");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          handle: h,
          wallet_address: w || null,
          show_rewards_publicly: showRewards,
          avatar_url: avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Save failed");
      }
      const newHandle = data.handle as string;
      if (typeof window !== "undefined") {
        sessionStorage.setItem("profile_updated_toast", "1");
      }
      router.push(`/profile/${newHandle}`);
      router.refresh();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const signOutAll = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut({ scope: "global" });
      router.push("/login");
    } catch (err) {
      console.error(err);
      setFormError("Sign out failed");
    } finally {
      setSigningOut(false);
    }
  };

  const sectionLabel = (text: string) => (
    <p className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-brand-muted mb-4">{text}</p>
  );

  return (
    <div className="w-full max-w-xl mx-auto pb-28 md:pb-12">
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => router.push(`/profile/${profileHandleSlug}`)}
          className="p-2 rounded-lg border border-brand-border text-brand-white hover:border-[#444444] transition-colors"
          aria-label="Back to profile"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-brand-white">Edit Profile</h1>
      </div>

      {formError && (
        <div className="mb-6 text-sm text-status-wrong border border-status-wrong/50 rounded-lg px-4 py-3">{formError}</div>
      )}

      <hr className="border-brand-border mb-10" />

      <section className="mb-10">
        {sectionLabel("Identity")}
        <div className="flex flex-col gap-4">
          <AvatarDisplay resolved={resolvedPreview} sizeClass="w-20 h-20" />
          <div className="flex flex-wrap gap-4 items-center">
            {googlePictureUrl ? (
              <button
                type="button"
                onClick={useGooglePhoto}
                disabled={googleLoading}
                className="font-sans text-sm text-brand-lime hover:underline disabled:opacity-50 inline-flex items-center gap-2"
              >
                {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Update Google photo
              </button>
            ) : (
              <span className="font-sans text-xs text-brand-muted">No Google photo linked</span>
            )}
          </div>

          <div>
            <label className="block font-sans text-sm text-brand-white mb-1.5">Display name</label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                className="w-full bg-brand-black border border-brand-border rounded-lg px-3 py-2.5 font-sans text-brand-white focus:outline-none focus:border-brand-white pr-16"
                maxLength={40}
              />
              {charCounterVisible && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-brand-muted">
                  {displayName.length}/40
                </span>
              )}
            </div>
            {fieldErrors.displayName && <p className="text-xs text-status-wrong mt-1">{fieldErrors.displayName}</p>}
          </div>

          <div>
            <label className="block font-sans text-sm text-brand-white mb-1.5">Handle</label>
            <div className="flex items-stretch rounded-lg border border-brand-border overflow-hidden focus-within:border-brand-white">
              <span className="flex items-center px-3 bg-brand-surface font-mono text-sm text-brand-muted select-none">
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => onHandleChange(e.target.value)}
                onBlur={checkHandle}
                className="flex-1 min-w-0 bg-brand-black px-3 py-2.5 font-mono text-sm text-brand-white focus:outline-none"
                maxLength={20}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="flex items-center px-2 border-l border-brand-border bg-brand-black">
                {handleStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-brand-muted" />}
                {handleStatus === "available" && <Check className="w-4 h-4 text-status-correct" aria-label="Available" />}
                {handleStatus === "taken" && <X className="w-4 h-4 text-status-wrong" aria-label="Taken" />}
              </span>
            </div>
            {fieldErrors.handle && <p className="text-xs text-status-wrong mt-1">{fieldErrors.handle}</p>}
          </div>
        </div>
      </section>

      <hr className="border-brand-border mb-10" />

      <section className="mb-10" id="wallet-section">
        {sectionLabel("Wallet")}
        <label className="block font-sans text-sm text-brand-white mb-1.5">External wallet address</label>
        <div className="relative">
          <input
            type="text"
            value={wallet}
            onChange={(e) => {
              setWallet(e.target.value);
              setWalletValid("idle");
            }}
            onBlur={onWalletBlur}
            placeholder="Your Solana wallet address"
            className="w-full bg-brand-black border border-brand-border rounded-lg px-3 py-2.5 font-mono text-sm text-brand-white placeholder:text-brand-muted focus:outline-none focus:border-brand-white pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {walletValid === "valid" && <Check className="w-4 h-4 text-status-correct" />}
            {walletValid === "invalid" && <X className="w-4 h-4 text-status-wrong" />}
          </span>
        </div>
        <p className="mt-2 font-sans text-sm text-brand-muted">
          This is where your rewards will be sent. Phantom, Backpack, or any Solana wallet.
        </p>
        {fieldErrors.wallet && <p className="text-xs text-status-wrong mt-1">{fieldErrors.wallet}</p>}
        <button
          type="button"
          onClick={() => setWalletHelpOpen((o) => !o)}
          className="mt-3 font-sans text-sm text-brand-lime hover:underline"
        >
          How to get a Solana wallet
        </button>
        {walletHelpOpen && (
          <div className="mt-4 border border-brand-border rounded-lg p-4 bg-brand-surface font-sans text-sm text-brand-muted space-y-2">
            <p>1. Download Phantom or Backpack from the app store or browser extension store.</p>
            <p>2. Create a new wallet and securely store your recovery phrase.</p>
            <p>3. Open your wallet and copy your public address — paste it here.</p>
          </div>
        )}
      </section>

      <hr className="border-brand-border mb-10" />

      <section className="mb-10">
        {sectionLabel("Privacy")}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-sans text-sm text-brand-white">Show reward amounts on my profile</p>
            <p className="font-sans text-xs text-brand-muted mt-1 max-w-md">
              When off, people visiting your profile won&apos;t see how much you&apos;ve won — only that you won.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showRewards}
            onClick={() => setShowRewards((v) => !v)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              showRewards ? "bg-brand-lime" : "bg-brand-border"
            }`}
          >
            <span
              className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-brand-black transition-transform ${
                showRewards ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      <hr className="border-brand-border mb-10" />

      <section className="mb-10">
        {sectionLabel("Account")}
        <div className="mb-8">
          <label className="block font-sans text-sm text-brand-muted mb-1.5">Linked Google account</label>
          <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-black/50 px-3 py-2.5 font-mono text-sm text-brand-muted">
            <Lock className="w-4 h-4 shrink-0" />
            <span className="truncate">{email || "—"}</span>
          </div>
        </div>

        <div className="border border-brand-border rounded-lg p-5 bg-brand-black/30">
          <p className="font-mono text-[10px] uppercase tracking-widest text-brand-muted mb-3">Danger zone</p>
          <button
            type="button"
            onClick={signOutAll}
            disabled={signingOut}
            className="font-sans text-xs px-4 py-2 border border-status-wrong text-status-wrong rounded-lg hover:bg-status-wrong/10 disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out of all devices"}
          </button>
        </div>
      </section>

      <div className="hidden md:block pt-4">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="w-full font-sans font-semibold py-3 rounded-lg bg-brand-lime text-brand-black disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-[filter]"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-brand-black border-t border-brand-border md:hidden z-40">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="w-full font-sans font-semibold py-3.5 rounded-lg bg-brand-lime text-brand-black disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-[filter]"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
