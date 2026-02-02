import { useState, useCallback, useRef, useEffect } from "react";
import { useInterviewStore } from "@/store/useInterviewStore";

interface UseMediaControlsOptions {
  onError?: (error: Error) => void;
  onRecordingComplete?: (blob: Blob, url: string) => void;
  autoInitialize?: boolean;
}

interface UseMediaControlsReturn {
  // Stream references
  mediaStream: MediaStream | null;
  screenStream: MediaStream | null;

  // State
  cameraOn: boolean;
  micOn: boolean;
  isScreenSharing: boolean;
  isInitialized: boolean;
  isInitializing: boolean;
  isRecording: boolean;
  recordingDuration: number;
  recordingUrl: string | null;
  error: Error | null;

  // Actions
  initializeMedia: () => Promise<void>;
  toggleVideo: () => void;
  toggleAudio: () => void;
  startScreenCapture: () => Promise<void>;
  stopScreenCapture: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  downloadRecording: () => void;
  clearRecording: () => void;
  stopAllMedia: () => void;
}

export function useMediaControls(
  options: UseMediaControlsOptions = {}
): UseMediaControlsReturn {
  const { onError, onRecordingComplete, autoInitialize = false } = options;

  // Zustand store sync
  const {
    cameraOn,
    micOn,
    isScreenSharing,
    isRecording,
    setCameraOn,
    setMicOn,
    setIsScreenSharing,
    setIsRecording,
  } = useInterviewStore();

  // Local state
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs to track streams for cleanup
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Initialize media stream with video and audio
  const initializeMedia = useCallback(async () => {
    if (isInitializing || isInitialized) return;

    setIsInitializing(true);
    setError(null);

    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices are not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      mediaStreamRef.current = stream;
      setMediaStream(stream);
      setIsInitialized(true);

      // Set initial states - both tracks are enabled by default
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      setCameraOn(videoTrack?.enabled ?? false);
      setMicOn(audioTrack?.enabled ?? false);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to initialize media");
      setError(error);
      onError?.(error);

      // Reset states on error
      setCameraOn(false);
      setMicOn(false);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, isInitialized, setCameraOn, setMicOn, onError]);

  // Toggle video track
  const toggleVideo = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      console.warn("No media stream available. Call initializeMedia first.");
      return;
    }

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.warn("No video tracks found in stream");
      return;
    }

    const videoTrack = videoTracks[0];
    const newState = !videoTrack.enabled;
    videoTrack.enabled = newState;
    setCameraOn(newState);
  }, [setCameraOn]);

  // Toggle audio track
  const toggleAudio = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      console.warn("No media stream available. Call initializeMedia first.");
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn("No audio tracks found in stream");
      return;
    }

    const audioTrack = audioTracks[0];
    const newState = !audioTrack.enabled;
    audioTrack.enabled = newState;
    setMicOn(newState);
  }, [setMicOn]);

  // Start screen capture for coding sessions
  const startScreenCapture = useCallback(async () => {
    if (isScreenSharing) {
      console.warn("Screen sharing is already active");
      return;
    }

    try {
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen capture is not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: false, // Usually not needed for coding sessions
      });

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);

      // Listen for when user stops sharing via browser UI
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenCapture();
      });
    } catch (err) {
      // User cancelled or error occurred
      if (err instanceof Error && err.name === "NotAllowedError") {
        // User cancelled - not an error
        console.log("Screen sharing was cancelled by user");
      } else {
        const error =
          err instanceof Error ? err : new Error("Failed to start screen capture");
        setError(error);
        onError?.(error);
      }
      setIsScreenSharing(false);
    }
  }, [isScreenSharing, setIsScreenSharing, onError]);

  // Stop screen capture
  const stopScreenCapture = useCallback(() => {
    const stream = screenStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
    }
    setIsScreenSharing(false);
  }, [setIsScreenSharing]);

  // Start recording - combines screen video and mic audio
  const startRecording = useCallback(() => {
    const screen = screenStreamRef.current;
    const media = mediaStreamRef.current;

    if (!screen) {
      const error = new Error("Screen sharing must be active to start recording");
      setError(error);
      onError?.(error);
      return;
    }

    try {
      // Create a combined stream with screen video and mic audio
      const combinedStream = new MediaStream();

      // Add screen video track
      const screenVideoTrack = screen.getVideoTracks()[0];
      if (screenVideoTrack) {
        combinedStream.addTrack(screenVideoTrack);
      }

      // Add mic audio track if available and enabled
      if (media) {
        const audioTrack = media.getAudioTracks()[0];
        if (audioTrack && audioTrack.enabled) {
          combinedStream.addTrack(audioTrack);
        }
      }

      // Check for supported MIME types
      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];

      let selectedMimeType = "";
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error("No supported video MIME type found for recording");
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      // Clear previous chunks
      recordedChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Create blob from chunks
        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMimeType,
        });

        // Generate download URL
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);

        // Callback
        onRecordingComplete?.(blob, url);

        // Clear interval
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }

        setIsRecording(false);
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        const error = new Error("Recording error occurred");
        setError(error);
        onError?.(error);
        setIsRecording(false);
      };

      // Start recording (collect data every second)
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;

      // Track recording duration
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);

      setIsRecording(true);
      setError(null);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to start recording");
      setError(error);
      onError?.(error);
    }
  }, [setIsRecording, onError, onRecordingComplete]);

  // Stop recording
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      mediaRecorderRef.current = null;
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  // Download recorded video
  const downloadRecording = useCallback(() => {
    if (!recordingUrl) {
      console.warn("No recording available to download");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `interview-recording-${timestamp}.webm`;

    const link = document.createElement("a");
    link.href = recordingUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [recordingUrl]);

  // Clear recorded video and URL
  const clearRecording = useCallback(() => {
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(null);
    }
    recordedChunksRef.current = [];
    setRecordingDuration(0);
  }, [recordingUrl]);

  // Stop all media streams
  const stopAllMedia = useCallback(() => {
    // Stop recording first
    stopRecording();
    clearRecording();

    // Stop main media stream
    const mainStream = mediaStreamRef.current;
    if (mainStream) {
      mainStream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setMediaStream(null);
    }

    // Stop screen stream
    stopScreenCapture();

    // Reset all states
    setIsInitialized(false);
    setCameraOn(false);
    setMicOn(false);
    setError(null);
  }, [stopRecording, clearRecording, stopScreenCapture, setCameraOn, setMicOn]);

  // Auto-initialize if option is set
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isInitializing) {
      initializeMedia();
    }
  }, [autoInitialize, isInitialized, isInitializing, initializeMedia]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      // Revoke URL
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }

      // Stop all tracks when component unmounts
      const mainStream = mediaStreamRef.current;
      if (mainStream) {
        mainStream.getTracks().forEach((track) => track.stop());
      }

      const screen = screenStreamRef.current;
      if (screen) {
        screen.getTracks().forEach((track) => track.stop());
      }
    };
  }, [recordingUrl]);

  return {
    // Stream references
    mediaStream,
    screenStream,

    // State (synced with Zustand store)
    cameraOn,
    micOn,
    isScreenSharing,
    isInitialized,
    isInitializing,
    isRecording,
    recordingDuration,
    recordingUrl,
    error,

    // Actions
    initializeMedia,
    toggleVideo,
    toggleAudio,
    startScreenCapture,
    stopScreenCapture,
    startRecording,
    stopRecording,
    downloadRecording,
    clearRecording,
    stopAllMedia,
  };
}
