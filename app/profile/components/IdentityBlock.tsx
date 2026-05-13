"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import AvatarDisplay from "@/app/components/AvatarDisplay";
import { resolveProfileAvatar } from "@/utils/avatar";

interface Profile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  email?: string;
}

export default function IdentityBlock({
  profile,
  isOwnProfile,
  googlePictureUrl,
}: {
  profile: Profile;
  isOwnProfile: boolean;
  /** OAuth picture from the signed-in session (only pass for the profile owner). */
  googlePictureUrl?: string | null;
}) {
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const resolved = resolveProfileAvatar({
    profileAvatarUrl: profile.avatar_url,
    googlePictureUrl: isOwnProfile ? googlePictureUrl : null,
    displayName: profile.display_name,
    handle: profile.handle,
  });

  return (
    <div id="profile-identity" className="w-full">
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 min-w-0 flex-1">
          <AvatarDisplay resolved={resolved} sizeClass="w-16 h-16" />

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-brand-white">{profile.display_name}</h1>
            <p className="font-mono text-sm text-brand-muted mt-1">@{profile.handle}</p>
            <p className="font-mono text-xs text-brand-muted mt-2">Member since {memberSince}</p>
          </div>
        </div>

        {isOwnProfile && profile.handle && (
          <Link
            href={`/profile/${profile.handle}/edit`}
            className="shrink-0 p-2 rounded-lg border border-brand-border text-brand-white hover:border-[#444444] transition-colors"
            aria-label="Edit profile"
          >
            <Pencil className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
