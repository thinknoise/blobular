# blobular

granular synthesis in blobs

# Repository Overview

The repository is a TypeScript/React project built with Vite. It implements an audio “blob” player and recorder that let users explore granular synthesis, record live audio, and manage audio files in S3.

Key entry points:

- `src/main.tsx` bootstraps React’s root.
- `src/App.tsx` handles the welcome screen and, once the user proceeds, wires up the main providers and feature components.

## Source Layout

```
src/
├─ features/
│ ├─ audioBlobular/ // core blob player
│ │ ├─ components/ // UI pieces (controls, display, waveform)
│ │ ├─ engine/ // audio source context and BlobularAudioSource class
│ │ ├─ hooks/ // hooks such as useBlobularEngine, useAudioSource
│ │ └─ types/
│ └─ audioMenu/ // “Audio Pond” recorder & S3 browser
│ ├─ components/ // menu UI and recording/upload widgets
│ └─ hooks/ // recording and S3‑loading helpers
├─ hooks/ // project‑wide hooks (e.g., useAudioBuffer)
├─ shared/
│ ├─ constants/ // scales, control limits, URLs
│ ├─ context/ // audio buffer context/provider
│ ├─ styles/ // shared style helpers (vanilla‑extract)
│ ├─ types/ // common TypeScript types
│ └─ utils/ // audio utilities, AWS helpers, URL helpers
└─ test/ // Vitest setup and sample tests
```
Other top-level files include `vite.config.ts`, `tsconfig.json`, ESLint configuration, and CSS assets.

## Basis of Blobular

- **Audio context management** – `shared/utils/audio/audioCtx.ts` centralizes creation and reuse of a single `AudioContext` (48 kHz, suspended until user interaction).
- **Granular playback engine** – `useBlobularEngine` schedules “blobs” of audio with randomized timing, pan, and pitch, optionally driven by scales defined in `shared/constants/scales.ts`. Playback is triggered through `playBlobAtTime`.
- **Recording & S3 integration** – `audioMenu` uses an `AudioWorklet` (`public/worklets/recorder.js`) for microphone recording, converts chunks to WAV blobs, and uploads/loads audio from an S3 bucket using AWS SDK helpers (`shared/utils/aws`).
- **State and context** – `AudioBufferProvider` and `AudioSourceProvider` supply current buffers and audio source control across the app.
- **Styling** – Components frequently use vanilla‑extract (`*.css.ts` files) for type‑safe CSS, with traditional `.css` files where appropriate.
- **Testing** – Vitest with Testing Library (`src/test/setup.ts`) and component tests under feature folders.
