# Blobular

A little browser experiment where I started playing with granular audio and blobs drifting around the screen. Nothing serious — mostly me testing ideas in React, Web Audio, and timing.

## What this repo is

It’s a small TypeScript + React project built on Vite. The app loads an audio file, chops it into tiny bits (“blobs”), and fires them off with random timing, pitch, and pan. You can also record your own sounds and toss them into the mix.

## Live demo
https://modelglue.com/blobular/?blobs=13&duration=2.53-5.58&sampleRate=0.90-1.40&scale=Blues&buffer=audio-pond%2FLongHorn.wav

## Deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` runs only when
manually dispatched. Merging a PR or pushing a branch does not trigger deployment. Database migrations
are never run by this workflow and must be reviewed and applied separately.

The host-owned `/blobular/api/config.php` is authoritative. Actions does not
create it or use database/AWS secrets. Build output excludes that file, its
backup copies, API documentation and config examples; FTP exclusions also keep
remote config copies out of both upload and deletion. Never enable a clean-slate
deploy. Configure the server privately using `public/api/config.example.php` and
`public/api/README.md` as references; neither reference is shipped.

The separate native app lives in `thinknoise/blobular-native`. Web `main` has no
Capacitor dependencies, mobile build scripts, or iOS wrapper project.

## Where the interesting parts live

src/
  features/
    audioBlobular/     <- the core engine + blob playback
      components/      <- the little UI bits
      engine/          <- BlobularAudioSource + scheduling logic
      hooks/           <- useBlobularEngine, useAudioSource
    audioMenu/         <- the recorder and S3 browser (“Audio Pond”)

  shared/
    utils/             <- audio utils, URL helpers, AWS upload code
    constants/         <- scales and limits
    context/           <- shared audio buffer/context providers
    styles/            <- vanilla-extract styles

There’s also a basic Vitest setup and a couple test files.

## How it works

- A single (<- the important part) `AudioContext` lives under `shared/utils/audio/audioCtx.ts`.  
- `useBlobularEngine` is what actually schedules the little audio blobs.  
- The recorder uses an AudioWorklet and saves snippets as WAV blobs.  
- Uploading/load-from-S3 is in `shared/utils/aws`.  


---
Blobular doesn’t solve anything other than my own aural curiosity.
