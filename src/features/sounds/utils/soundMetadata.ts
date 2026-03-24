import type { AuthUser } from "@/features/auth/types";

import type {
  SoundKind,
  SoundRecord,
  SoundVisibility,
} from "../types";

export const SOUND_ROOT_PREFIX = "audio-pond/";
export const SOUND_PUBLIC_PREFIX = `${SOUND_ROOT_PREFIX}public/`;
export const SOUND_USERS_PREFIX = `${SOUND_ROOT_PREFIX}users/`;

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function normalizeWords(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTitleCase(value: string): string {
  if (!value) {
    return "untitled";
  }

  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeIsoDate(timestamp: number | null): string {
  return Number.isFinite(timestamp) && timestamp !== null
    ? new Date(timestamp).toISOString()
    : new Date().toISOString();
}

function extractTimestamp(filename: string): number | null {
  const recordingMatch = filename.match(/^recording-(\d+)/);
  if (recordingMatch) {
    return Number(recordingMatch[1]);
  }

  const uploadMatch = filename.match(/^(\d+)-/);
  if (uploadMatch) {
    return Number(uploadMatch[1]);
  }

  return null;
}

function deriveSoundTitle(filename: string): string {
  const withoutExtension = stripExtension(filename);
  const recordingMatch = withoutExtension.match(/^recording-(\d+)/);
  if (recordingMatch) {
    return "Recording";
  }

  const uploadMatch = withoutExtension.match(/^(\d+)-(.*)/);
  if (uploadMatch) {
    return formatTitleCase(normalizeWords(uploadMatch[2]));
  }

  return formatTitleCase(normalizeWords(withoutExtension));
}

function deriveSoundKind(filename: string): SoundKind {
  return filename.startsWith("recording-") ? "recording" : "upload";
}

function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim();
  const [base, extension = "wav"] = trimmed.split(/\.(?=[^.]+$)/);
  const safeBase = normalizeWords(base || "sound").replace(/\s+/g, "-");
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, "") || "wav";

  return `${safeBase.toLowerCase()}.${safeExtension.toLowerCase()}`;
}

export function buildSoundStorageKey({
  filename,
  owner,
  visibility = owner ? "private" : "public",
}: {
  filename: string;
  owner: AuthUser | null;
  visibility?: SoundVisibility;
}): string {
  const timestamp = Date.now();
  const safeFilename = sanitizeFilename(filename);

  if (owner) {
    return `${SOUND_USERS_PREFIX}${owner.id}/${visibility}/${timestamp}-${safeFilename}`;
  }

  return `${SOUND_PUBLIC_PREFIX}${timestamp}-${safeFilename}`;
}

export function buildRecordingStorageKey(owner: AuthUser | null): string {
  const timestamp = Date.now();

  if (owner) {
    return `${SOUND_USERS_PREFIX}${owner.id}/private/recording-${timestamp}.wav`;
  }

  return `${SOUND_PUBLIC_PREFIX}recording-${timestamp}.wav`;
}

export function isLegacySharedStorageKey(key: string): boolean {
  if (!key.startsWith(SOUND_ROOT_PREFIX)) {
    return false;
  }

  if (key.startsWith(SOUND_PUBLIC_PREFIX) || key.startsWith(SOUND_USERS_PREFIX)) {
    return false;
  }

  const relative = key.slice(SOUND_ROOT_PREFIX.length);
  return !!relative && !relative.includes("/");
}

export function isVisibleSoundStorageKey(
  key: string,
  currentUser: AuthUser | null
): boolean {
  if (isLegacySharedStorageKey(key) || key.startsWith(SOUND_PUBLIC_PREFIX)) {
    return true;
  }

  if (!currentUser || !key.startsWith(SOUND_USERS_PREFIX)) {
    return false;
  }

  return key.startsWith(`${SOUND_USERS_PREFIX}${currentUser.id}/`);
}

export function createSoundRecordFromStorageKey(
  key: string,
  currentUser: AuthUser | null
): SoundRecord | null {
  if (key.startsWith(SOUND_USERS_PREFIX)) {
    const relative = key.slice(SOUND_USERS_PREFIX.length);
    const [ownerId, visibility, ...filenameParts] = relative.split("/");
    const filename = filenameParts.join("/");

    if (
      !ownerId ||
      (visibility !== "private" && visibility !== "public") ||
      !filename
    ) {
      return null;
    }

    const timestamp = extractTimestamp(filename);

    return {
      id: key,
      title: deriveSoundTitle(filename),
      createdAt: safeIsoDate(timestamp),
      storageKey: key,
      visibility,
      kind: deriveSoundKind(filename),
      source: "user-scoped-s3",
      ownerId,
      ownerEmail: currentUser?.id === ownerId ? currentUser.email : null,
      mimeType: "audio/wav",
    };
  }

  if (key.startsWith(SOUND_PUBLIC_PREFIX)) {
    const filename = key.slice(SOUND_PUBLIC_PREFIX.length);
    if (!filename) {
      return null;
    }

    const timestamp = extractTimestamp(filename);

    return {
      id: key,
      title: deriveSoundTitle(filename),
      createdAt: safeIsoDate(timestamp),
      storageKey: key,
      visibility: "public",
      kind: deriveSoundKind(filename),
      source: "user-scoped-s3",
      ownerId: null,
      ownerEmail: null,
      mimeType: "audio/wav",
    };
  }

  if (!isLegacySharedStorageKey(key)) {
    return null;
  }

  const filename = key.slice(SOUND_ROOT_PREFIX.length);
  const timestamp = extractTimestamp(filename);

  return {
    id: key,
    title: deriveSoundTitle(filename),
    createdAt: safeIsoDate(timestamp),
    storageKey: key,
    visibility: "public",
    kind: deriveSoundKind(filename),
    source: "legacy-shared-s3",
    ownerId: null,
    ownerEmail: null,
    mimeType: "audio/wav",
  };
}

export function getSoundDisplayTitle(sound: Pick<SoundRecord, "title">): string {
  return sound.title;
}

export function getSoundListLabel(
  sound: Pick<SoundRecord, "createdAt" | "title" | "visibility">
): string {
  const formattedDate = new Date(sound.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return `${sound.title} · ${formattedDate} · ${sound.visibility}`;
}
