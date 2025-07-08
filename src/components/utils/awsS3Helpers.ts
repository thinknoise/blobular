import {
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { s3, BUCKET } from "./awsConfig";

/**
 * List all keys under the "audio-pond/" prefix in your S3 bucket
 */
export async function listAudioKeys(): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: "audio-pond/",
  });
  const response = await s3.send(command);
  return (response.Contents ?? [])
    .map((item) => item.Key!)
    .filter((key) => !!key);
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
