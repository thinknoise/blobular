// src/hooks/useRecording.ts

import { useRef, useState, useCallback } from "react";

export interface UseRecordingResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
}

export function useRecording(audioContext: AudioContext): UseRecordingResult {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) return resolve(null);

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(arrayBuffer);

        const wavBlob = audioBufferToWavBlob(decoded);
        resolve(wavBlob);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;

      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;

      setIsRecording(false);
    });
  }, [audioContext]);

  function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const length = buffer.length * numChannels * (bitDepth / 8);
    const wavBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(wavBuffer);

    /* RIFF chunk descriptor */
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, "WAVE");

    /* fmt subchunk */
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);

    /* data subchunk */
    writeString(view, 36, "data");
    view.setUint32(40, length, true);

    const offset = 44;
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let sampleIdx = 0;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset + sampleIdx, sample * 0x7fff, true);
        sampleIdx += 2;
      }
    }

    return new Blob([view], { type: "audio/wav" });
  }

  function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
