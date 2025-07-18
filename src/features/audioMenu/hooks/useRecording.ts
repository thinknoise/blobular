// src/hooks/useRecording.ts

import { useRef, useState, useCallback } from "react";
import { audioBufferToWavBlob } from "@/shared/utils/audio/audioBufferToWavBlob";

export interface UseRecordingResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  updateWavBlob: () => Promise<Blob | null>;
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

  function updateWavBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== "recording") return resolve(null);

      recorder.ondataavailable = async (e: BlobEvent) => {
        if (e.data.size > 0) {
          const blob = new Blob([e.data], { type: "audio/webm" });
          const arrayBuffer = await blob.arrayBuffer();
          const decoded = await audioContext.decodeAudioData(arrayBuffer);

          const wavBlob = audioBufferToWavBlob(decoded);
          resolve(wavBlob);
        } else {
          resolve(null);
        }
      };

      recorder.requestData(); // ✅ Triggers a `dataavailable` event without stopping
    });
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
    updateWavBlob,
  };
}
