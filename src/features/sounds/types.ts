import type { AuthUser } from "@/features/auth/types";

export type SoundVisibility = "private" | "public";
export type SoundKind = "recording" | "upload";
export type SoundSource = "legacy-shared-s3" | "user-scoped-s3";

export type SoundRecord = {
  id: string;
  title: string;
  createdAt: string;
  storageKey: string;
  visibility: SoundVisibility;
  kind: SoundKind;
  source: SoundSource;
  ownerId: string | null;
  ownerEmail: string | null;
  mimeType: string;
};

export type SoundUploadInput = {
  blob: Blob | File;
  filename: string;
  kind: SoundKind;
  owner: AuthUser | null;
  visibility?: SoundVisibility;
};
