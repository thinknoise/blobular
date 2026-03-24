import { legacyS3SoundLibraryClient } from "./legacyS3SoundLibraryClient";

import type { AuthUser } from "@/features/auth/types";

import type { SoundRecord, SoundUploadInput } from "../types";

export type SoundLibraryListInput = {
  user: AuthUser | null;
};

export interface SoundLibraryClient {
  listSounds(input: SoundLibraryListInput): Promise<SoundRecord[]>;
  getSoundArrayBuffer(sound: SoundRecord): Promise<ArrayBuffer>;
  uploadSound(input: SoundUploadInput): Promise<SoundRecord>;
  deleteSound(sound: SoundRecord, user: AuthUser | null): Promise<void>;
}

export const soundLibraryClient: SoundLibraryClient = legacyS3SoundLibraryClient;
