// Quick test to check if S3 is working
import { listAudioKeys } from './src/shared/utils/aws/awsS3Helpers.js';

async function testS3() {
  try {
    console.log('Testing S3 connection...');
    const keys = await listAudioKeys();
    console.log('✅ S3 keys found:', keys);
    console.log('Number of keys:', keys.length);
  } catch (error) {
    console.error('❌ S3 test failed:', error);
  }
}

testS3();
