# blobular

granular synthesis in blobs


Other top-level files include `vite.config.ts`, `tsconfig.json`, ESLint configuration, and CSS assets.

## Important Concepts

- **Audio context management** – `shared/utils/audio/audioCtx.ts` centralizes creation and reuse of a single `AudioContext` (48 kHz, suspended until user interaction).
- **Granular playback engine** – `useBlobularEngine` schedules “blobs” of audio with randomized timing, pan, and pitch, optionally driven by scales defined in `shared/constants/scales.ts`. Playback is triggered through `playBlobAtTime`.
- **Recording & S3 integration** – `audioMenu` uses an `AudioWorklet` (`public/worklets/recorder.js`) for microphone recording, converts chunks to WAV blobs, and uploads/loads audio from an S3 bucket using AWS SDK helpers (`shared/utils/aws`).
- **State and context** – `AudioBufferProvider` and `AudioSourceProvider` supply current buffers and audio source control across the app.
- **Styling** – Components frequently use vanilla‑extract (`*.css.ts` files) for type‑safe CSS, with traditional `.css` files where appropriate.
- **Testing** – Vitest with Testing Library (`src/test/setup.ts`) and component tests under feature folders.

## Next Steps for Deeper Understanding

1. **Run the app**  
   Install dependencies and start the Vite dev server (`npm install`, `npm run dev`) to see how the UI and audio engine behave together.

2. **Explore the blob engine**  
   Read through `useBlobularEngine` to understand scheduling, randomization, and audio-node graph setup. Experiment with parameters in `controlLimits.ts` to see how they influence playback.

3. **Learn Web Audio & worklets**  
   Review `playBlobAtTime`, `audioCtx.ts`, and the recording hook to gain familiarity with `AudioContext`, scheduling, and `AudioWorklet` patterns.

4. **Understand AWS workflow**  
   Examine `useAudioPond`, `AudioPondMenu`, and `shared/utils/aws` to see how audio files are listed, uploaded, and deleted from S3, and ensure credentials/permissions are configured for your environment.

5. **Check tests**  
   Look at component tests (e.g., `BlobCountDropDown.test.tsx`) for examples of Testing Library usage and consider adding tests for any new UI or audio logic.

6. **Expand documentation & comments**  
   As you work, consider annotating complex sections (e.g., scheduling logic or AWS interactions) and expanding the README to help future contributors.
