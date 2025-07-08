import {
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { s3, BUCKET } from "./awsConfig";

// Only include these audio file extensions
const AUDIO_EXTENSIONS = /\.(wav|mp3|ogg|flac|aac)$/i;

/**
 * List all audio keys under the specified prefixes in your S3 bucket
 * @param prefixes Array of folder prefixes to list (defaults to both "audio/" and "audio-pond/")
 */
export async function listAudioKeys(
  prefixes: string[] = ["audio-pond/"]
): Promise<string[]> {
  const results = await Promise.all(
    prefixes.map(async (prefix) => {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
      });
      const response = await s3.send(command);
      return (response.Contents ?? [])
        .map((item) => item.Key!)
        .filter((key) => AUDIO_EXTENSIONS.test(key));
    })
  );
  // Flatten the array of arrays into a single list of valid audio keys
  return results.flat();
}

/**
 * Fetch an object as an ArrayBuffer (browser)
 */
export async function getAudioArrayBuffer(key: string): Promise<ArrayBuffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  // In browser, Body is a ReadableStream<Uint8Array>
  const stream = response.Body as ReadableStream<Uint8Array>;
  return await new Response(stream).arrayBuffer();
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
