import {
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { s3, BUCKET } from "./awsConfig";

// Only include these audio file extensions
const AUDIO_EXTENSIONS = /\.(wav|mp3|ogg|flac|aac)$/i;

function hasTransformToByteArray(
  value: unknown
): value is { transformToByteArray: () => Promise<Uint8Array> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "transformToByteArray" in value &&
    typeof value.transformToByteArray === "function"
  );
}

function hasArrayBufferMethod(
  value: unknown
): value is { arrayBuffer: () => Promise<ArrayBuffer> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function"
  );
}

function isReadableStreamBody(
  value: unknown
): value is ReadableStream<Uint8Array> {
  return (
    typeof value === "object" &&
    value !== null &&
    "getReader" in value &&
    typeof value.getReader === "function"
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );
}

async function readBodyAsArrayBuffer(body: unknown): Promise<ArrayBuffer> {
  if (!body) {
    throw new Error("S3 object body is missing.");
  }

  if (hasTransformToByteArray(body)) {
    const bytes = await body.transformToByteArray();
    return toArrayBuffer(bytes);
  }

  if (body instanceof ArrayBuffer) {
    return body.slice(0);
  }

  if (ArrayBuffer.isView(body)) {
    return toArrayBuffer(
      new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
    );
  }

  if (hasArrayBufferMethod(body)) {
    return body.arrayBuffer();
  }

  if (isReadableStreamBody(body)) {
    return new Response(body).arrayBuffer();
  }

  try {
    return await new Response(body as BodyInit).arrayBuffer();
  } catch {
    // Fall through to a stable app-level error below.
  }

  throw new Error("Unsupported S3 object body type.");
}

/**
 * List all audio keys under the specified prefixes in your S3 bucket
 * @param prefixes Array of folder prefixes to list (defaults to "audio-pond/")
 * @returns Promise resolving to array of audio file keys, sorted by most recent first
 */
export async function listAudioKeys(
  prefixes: string[] = ["audio-pond/"]
): Promise<string[]> {
  try {
    // Fetch objects from all specified prefixes in parallel
    const results = await Promise.all(
      prefixes.map(async (prefix) => {
        const command = new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: prefix,
        });

        const response = await s3.send(command);

        // Filter for audio files only and sort by most recent first
        return (response.Contents ?? [])
          .filter((item) => item.Key && AUDIO_EXTENSIONS.test(item.Key))
          .sort((a, b) => {
            const aDate = new Date(a.LastModified || 0);
            const bDate = new Date(b.LastModified || 0);
            return bDate.getTime() - aDate.getTime();
          })
          .map((item) => item.Key!);
      })
    );

    // Flatten results from all prefixes into single array
    return results.flat();
  } catch (error) {
    console.error("Failed to list S3 audio keys:", error);
    throw error;
  }
}

/**
 * Fetch an object as an ArrayBuffer (browser)
 */
// utils/awsS3Helpers.ts
const audioArrayBufferCache = new Map<string, ArrayBuffer>();

export async function getAudioArrayBuffer(key: string): Promise<ArrayBuffer> {
  if (audioArrayBufferCache.has(key)) {
    console.log(`Cache hit for ${key}`);
    return audioArrayBufferCache.get(key)!;
  }

  // console.log(`Fetching from S3: ${key}`);
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  const arrayBuffer = await readBodyAsArrayBuffer(response.Body);

  audioArrayBufferCache.set(key, arrayBuffer);
  return arrayBuffer;
}

/**
 * Upload a Blob or File to S3 at the given key
 */
export async function uploadAudio(key: string, blob: Blob): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: blob,
    ContentType: blob.type,
  });
  await s3.send(command);
}

/**
 * Delete an audio file from S3 at the given key
 */
export async function deleteAudio(key: string): Promise<void> {
  console.log(`Deleting from S3: ${key}`);
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3.send(command);
  audioArrayBufferCache.delete(key); //  remove from local cache if it exists
}
