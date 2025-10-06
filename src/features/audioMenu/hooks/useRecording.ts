import { useCallback, useEffect, useRef, useState } from "react";

// Chrome microphone notification delay
// Chrome plays a system notification sound when microphone access is granted.
// This delay ensures the notification finishes before recording starts.
const CHROME_MIC_NOTIFICATION_DELAY = 500;

type UseRecording = {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  updateWavBlob: () => Promise<Blob | null>;
  setInputGain: (gain: number) => void;
  inputGain: number;
};

async function ensureRecorderWorklet(ctx: AudioContext) {
  // Put the file at: public/worklets/recorder.js
  await ctx.audioWorklet.addModule(
    `${import.meta.env.BASE_URL}worklets/recorder.js`
  );
}

// Simple mono, 16‑bit PCM WAV encoder
function encodeWavMono16(chunks: Float32Array[], sampleRate: number): Blob {
  if (!chunks.length) return new Blob([], { type: "audio/wav" });

  const totalLen = chunks.reduce((n, c) => n + c.length, 0);
  const interleaved = new Float32Array(totalLen);
  let off = 0;
  for (const c of chunks) {
    interleaved.set(c, off);
    off += c.length;
  }

  // float32 -> int16
  const pcm16 = new Int16Array(interleaved.length);
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // WAV header
  const bytesPerSample = 2;
  const numChannels = 1;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  const buffer = new ArrayBuffer(44 + pcm16.byteLength);
  const dv = new DataView(buffer);
  let p = 0;
  const w8 = (v: number) => dv.setUint8(p++, v);
  const w16 = (v: number) => {
    dv.setUint16(p, v, true);
    p += 2;
  };
  const w32 = (v: number) => {
    dv.setUint32(p, v, true);
    p += 4;
  };
  const wStr = (s: string) => {
    for (let i = 0; i < s.length; i++) w8(s.charCodeAt(i));
  };

  wStr("RIFF");
  w32(36 + pcm16.byteLength);
  wStr("WAVE");
  wStr("fmt ");
  w32(16); // PCM chunk size
  w16(1); // PCM
  w16(numChannels); // mono
  w32(sampleRate);
  w32(byteRate);
  w16(blockAlign);
  w16(16); // bits per sample
  wStr("data");
  w32(pcm16.byteLength);
  new Int16Array(buffer, 44).set(pcm16);

  return new Blob([buffer], { type: "audio/wav" });
}

export function useRecording(audioContext: AudioContext): UseRecording {
  const [isRecording, setIsRecording] = useState(false);
  const [inputGain, setInputGainState] = useState(2.0); // Default 2x gain

  const micStreamRef = useRef<MediaStream | null>(null);
  const micNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null); // NEW: Input gain control
  const micMonitorRef = useRef<GainNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  const chunksRef = useRef<Float32Array[]>([]); // accumulates mic chunks

  // Clean up graph/stream
  const teardown = useCallback(() => {
    try {
      if (micGainRef.current && workletRef.current) {
        try {
          micGainRef.current.disconnect(workletRef.current);
        } catch {
          // ignore if already disconnected
        }
      }
      if (micNodeRef.current && micGainRef.current) {
        try {
          micNodeRef.current.disconnect(micGainRef.current);
        } catch {
          // ignore if already disconnected
        }
      }
      if (micMonitorRef.current) {
        try {
          micGainRef.current?.disconnect(micMonitorRef.current);
        } catch {
          // ignore if already disconnected
        }
        try {
          micMonitorRef.current.disconnect();
        } catch {
          // ignore if already disconnected
        }
      }
      workletRef.current?.port?.close?.();
      try {
        workletRef.current?.disconnect();
      } catch {
        // ignore if already disconnected
      }
      workletRef.current = null;
      micGainRef.current = null;
      micMonitorRef.current = null;
      micNodeRef.current = null;

      if (micStreamRef.current) {
        for (const t of micStreamRef.current.getTracks()) t.stop();
        micStreamRef.current = null;
      }
    } catch {
      // ignore if already disconnected
    }
  }, []);

  useEffect(() => teardown, [teardown]); // on unmount

  const startRecording = useCallback(async () => {
    // Recorder worklet
    await ensureRecorderWorklet(audioContext);

    // Mic stream (AEC/NS/AGC OFF to prevent the fade/ducking you saw)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    micStreamRef.current = stream;

    // ========================================================================
    // INTENTIONAL DELAY: Wait for Chrome's microphone notification bell
    // ========================================================================
    // Chrome plays a system notification "ping/bell" sound when microphone
    // access is granted via getUserMedia(). This delay ensures that system
    // sound finishes playing before we start our recording, preventing the
    // notification bell from being captured in the recording audio.
    //
    // This delay is intentional and necessary to overcome Chrome's
    // mic access notification sound interference.
    await new Promise((resolve) => setTimeout(resolve, CHROME_MIC_NOTIFICATION_DELAY));
    // ========================================================================

    // Mic node
    const mic = new MediaStreamAudioSourceNode(audioContext, {
      mediaStream: stream,
    });
    micNodeRef.current = mic;

    // Input gain control (THIS IS WHERE YOU CAN BOOST THE SIGNAL!)
    const inputGainNode = audioContext.createGain();
    inputGainNode.gain.value = inputGain; // Use current gain setting
    micGainRef.current = inputGainNode;

    // Optional self-monitor (muted to avoid feedback/echo cancellation)
    const mon = audioContext.createGain();
    mon.gain.value = 0.0;
    micMonitorRef.current = mon;

    // AudioWorkletNode to pull mic samples
    const rec = new AudioWorkletNode(audioContext, "recorder", {
      numberOfInputs: 1,
      numberOfOutputs: 0,
    });
    workletRef.current = rec;

    chunksRef.current = [];
    rec.port.onmessage = (e) => {
      const chunk = e.data as Float32Array;
      chunksRef.current.push(chunk);
    };

    // IMPORTANT: New signal chain: mic -> inputGain -> worklet
    // Also connect to monitor for potential self-monitoring
    mic.connect(inputGainNode);
    inputGainNode.connect(rec);
    inputGainNode.connect(mon).connect(audioContext.destination); // monitor at 0.0 gain

    setIsRecording(true);
  }, [audioContext, inputGain]);

  // Function to update input gain in real-time
  const setInputGain = useCallback((gain: number) => {
    setInputGainState(gain);
    if (micGainRef.current) {
      micGainRef.current.gain.value = gain;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!isRecording) return null;

    // Detach first so no new chunks arrive
    try {
      micGainRef.current?.disconnect(workletRef.current!);
    } catch {
      // ignore if already disconnected
    }

    // Build final WAV from accumulated chunks
    const blob = encodeWavMono16(chunksRef.current, audioContext.sampleRate);

    // Teardown stream & nodes
    teardown();
    setIsRecording(false);
    chunksRef.current = [];

    return blob;
  }, [audioContext.sampleRate, isRecording, teardown]);

  // Produce a WAV from the chunks so far (doesn't stop recording)
  const updateWavBlob = useCallback(async (): Promise<Blob | null> => {
    if (!isRecording || chunksRef.current.length === 0) return null;
    return encodeWavMono16(chunksRef.current, audioContext.sampleRate);
  }, [audioContext.sampleRate, isRecording]);

  return { 
    isRecording, 
    startRecording, 
    stopRecording, 
    updateWavBlob, 
    setInputGain, 
    inputGain 
  };
}
