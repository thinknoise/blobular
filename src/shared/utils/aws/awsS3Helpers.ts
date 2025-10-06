import {
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { s3, BUCKET, REGION, IDENTITY_POOL_ID } from "./awsConfig";

// Only include these audio file extensions
const AUDIO_EXTENSIONS = /\.(wav|mp3|ogg|flac|aac)$/i;

/**
 * List all audio keys under the specified prefixes in your S3 bucket
 * @param prefixes Array of folder prefixes to list (defaults to both "audio/" and "audio-pond/")
 */
export async function listAudioKeys(
  prefixes: string[] = ["audio-pond/"]
): Promise<string[]> {
  console.log("🔄 listAudioKeys called with prefixes:", prefixes);
  console.log("🔄 AWS Config check:", {
    region: REGION,
    bucket: BUCKET,
    identityPoolId: IDENTITY_POOL_ID,
  });
  
  try {
    console.log("🔄 About to create S3 commands...");
    
    // Test basic S3 connectivity first
    console.log("🔄 Testing S3 client initialization...");
    console.log("🔄 S3 client config:", s3.config);
    
    // Log environment information
    console.log("🔄 Environment check:", {
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      location: window.location.href,
      baseUrl: import.meta.env.BASE_URL,
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
    });
    
    const results = await Promise.all(
      prefixes.map(async (prefix) => {
        console.log(`🔄 Listing objects with prefix: ${prefix}`);
        const command = new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: prefix,
        });
        console.log(`🔄 Created command for bucket: ${BUCKET}, prefix: ${prefix}`);
        console.log(`🔄 Command details:`, {
          input: command.input,
          bucketName: command.input.Bucket,
          prefixValue: command.input.Prefix
        });
        console.log(`🔄 About to send S3 command...`);
        
        const response = await s3.send(command);
        console.log(`🔄 S3 response for prefix ${prefix}:`, response);
        console.log(`🔄 Response Contents:`, response.Contents);
        console.log(`🔄 Response IsTruncated:`, response.IsTruncated);
        console.log(`🔄 Response KeyCount:`, response.KeyCount);
        
        const filtered = (response.Contents ?? [])
          .filter((item) => item.Key && AUDIO_EXTENSIONS.test(item.Key))
          .sort((a, b) => {
            // Sort by most recent first
            const aDate = new Date(a.LastModified || 0);
            const bDate = new Date(b.LastModified || 0);
            return bDate.getTime() - aDate.getTime();
          })
          .map((item) => item.Key!);
        console.log(`🔄 Filtered keys for prefix ${prefix}:`, filtered);
        return filtered;
      })
    );
    // Flatten the array of arrays into a single list of valid audio keys
    const flatResults = results.flat();
    console.log("🔄 Final flattened results:", flatResults);
    return flatResults;
  } catch (error) {
    console.error("❌ Error in listAudioKeys:", error);
    console.error("❌ Error type:", typeof error);
    console.error("❌ Error constructor:", error?.constructor?.name);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error("❌ Error instanceof Error:", true);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        cause: error.cause,
        stack: error.stack,
      });
      
      // Check for specific AWS error properties
      if ('$metadata' in error) {
        console.error("❌ AWS SDK Error metadata:", (error as any).$metadata);
      }
      if ('Code' in error) {
        console.error("❌ AWS Error Code:", (error as any).Code);
      }
      if ('statusCode' in error) {
        console.error("❌ Status Code:", (error as any).statusCode);
      }
    } else {
      console.error("❌ Non-Error object:", error);
    }
    
    // Log additional context that might help debug
    console.error("❌ Additional context:", {
      navigatorOnline: navigator.onLine,
      currentTime: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
    
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
  const stream = response.Body as ReadableStream<Uint8Array>;
  const arrayBuffer = await new Response(stream).arrayBuffer();

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
