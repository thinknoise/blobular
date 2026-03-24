import {
  deleteAudio,
  getAudioArrayBuffer,
  listAudioKeys,
  uploadAudio,
} from "@/shared/utils/aws/awsS3Helpers";
import type { AuthUser } from "@/features/auth/types";

import type { SoundLibraryClient } from "./soundLibraryClient";
import type { SoundRecord, SoundUploadInput } from "../types";
import {
  buildRecordingStorageKey,
  buildSoundStorageKey,
  createSoundRecordFromStorageKey,
  isVisibleSoundStorageKey,
  SOUND_ROOT_PREFIX,
} from "../utils/soundMetadata";

function sortSoundsNewestFirst(a: SoundRecord, b: SoundRecord): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

async function listVisibleSoundRecords(
  currentUser: AuthUser | null
): Promise<SoundRecord[]> {
  const keys = await listAudioKeys([SOUND_ROOT_PREFIX]);

  return keys
    .filter((key) => isVisibleSoundStorageKey(key, currentUser))
    .map((key) => createSoundRecordFromStorageKey(key, currentUser))
    .filter((sound): sound is SoundRecord => sound !== null)
    .sort(sortSoundsNewestFirst);
}

export const legacyS3SoundLibraryClient: SoundLibraryClient = {
  async listSounds({ user }) {
    return listVisibleSoundRecords(user);
  },

  async getSoundArrayBuffer(sound) {
    return getAudioArrayBuffer(sound.storageKey);
  },

  async uploadSound({ blob, filename, kind, owner, visibility }) {
    const storageKey =
      kind === "recording"
        ? buildRecordingStorageKey(owner)
        : buildSoundStorageKey({
            filename,
            owner,
            visibility,
          });

    await uploadAudio(storageKey, blob);

    const sound = createSoundRecordFromStorageKey(storageKey, owner);
    if (!sound) {
      throw new Error("Uploaded sound metadata could not be derived.");
    }

    return sound;
  },

  async deleteSound(sound, user) {
    if (!sound.ownerId || !user || sound.ownerId !== user.id) {
      throw new Error("Only your own uploaded sounds can be deleted right now.");
    }

    await deleteAudio(sound.storageKey);
  },
};
