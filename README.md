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
