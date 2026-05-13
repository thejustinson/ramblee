/**
 * Avatar resolution: custom profile URL → Google OAuth picture → initial placeholder.
 */

export function normalizeAvatarUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  let url = trimmed;
  if (url.startsWith("//")) {
    url = `https:${url}`;
  }

  if (!/^https?:\/\//i.test(url)) {
    if (/^(www\.|lh3\.|googleusercontent\.|avatars\.|gravatar\.)/i.test(url)) {
      url = `https://${url}`;
    } else {
      return null;
    }
  }

  try {
    const normalized = new URL(url);
    if (!["http:", "https:"].includes(normalized.protocol)) return null;
    return normalized.toString();
  } catch {
    return null;
  }
}

export function getGooglePictureFromMetadata(
  meta: Record<string, unknown> | undefined | null
): string | null {
  if (!meta || typeof meta !== "object") return null;

  const possibleFields = [
    'avatar_url',      // Some providers
    'picture',         // Google, Facebook
    'photoURL',        // Firebase
    'profile_image',   // Some custom providers
    'image',           // Generic
  ];

  for (const field of possibleFields) {
    const value = meta[field];
    if (typeof value === "string") {
      const normalized = normalizeAvatarUrl(value);
      if (normalized) return normalized;
    }
  }

  return null;
}

export type ResolvedAvatar =
  | { kind: "image"; url: string }
  | { kind: "initial"; letter: string };

export function resolveProfileAvatar(input: {
  profileAvatarUrl: string | null | undefined;
  googlePictureUrl?: string | null | undefined;
  displayName: string;
  handle?: string | null | undefined;
}): ResolvedAvatar {
  const custom = normalizeAvatarUrl(input.profileAvatarUrl);
  if (custom) return { kind: "image", url: custom };

  const google = normalizeAvatarUrl(input.googlePictureUrl);
  if (google) return { kind: "image", url: google };

  const fromName = input.displayName?.trim()?.[0];
  const fromHandle = input.handle?.trim()?.[0];
  const letter = (fromName || fromHandle || "?").toUpperCase();
  return { kind: "initial", letter };
}
