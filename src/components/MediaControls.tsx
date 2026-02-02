"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { useMediaControls } from "@/hooks/useMediaControls";
import { useInterviewStore } from "@/store/useInterviewStore";

interface MediaControlsProps {
  className?: string;
  showPreview?: boolean;
}

export default function MediaControls({
  className = "",
  showPreview = true,
}: MediaControlsProps) {
  const { interviewTypes } = useInterviewStore();

  const {
    mediaStream,
    screenStream,
    cameraOn,
    micOn,
    isScreenSharing,
    isInitialized,
    isInitializing,
    error,
    initializeMedia,
    toggleVideo,
    toggleAudio,
    startScreenCapture,
    stopScreenCapture,
    stopAllMedia,
  } = useMediaControls({
    onError: (err) => console.error("Media error:", err),
  });

  // Local state
  const [isVoiceOnlyMode, setIsVoiceOnlyMode] = useState(false);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [isPreviewHidden, setIsPreviewHidden] = useState(false);

  // Video preview refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Check if coding interview type is selected
  const isCodingSelected = interviewTypes.includes("coding");

  // Update video preview when stream changes
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // Update screen preview when screen stream changes
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Handle voice-only mode toggle
  const handleVoiceOnlyToggle = useCallback(() => {
    if (!isInitialized) return;

    const newVoiceOnlyMode = !isVoiceOnlyMode;
    setIsVoiceOnlyMode(newVoiceOnlyMode);

    if (newVoiceOnlyMode) {
      // Turn off camera but keep mic on
      if (cameraOn) {
        toggleVideo();
      }
      if (!micOn) {
        toggleAudio();
      }
    }
  }, [isVoiceOnlyMode, isInitialized, cameraOn, micOn, toggleVideo, toggleAudio]);

  // Handle camera toggle (respects voice-only mode)
  const handleCameraToggle = useCallback(() => {
    if (!isInitialized) return;

    // If turning camera on while in voice-only mode, disable voice-only mode
    if (!cameraOn && isVoiceOnlyMode) {
      setIsVoiceOnlyMode(false);
    }
    toggleVideo();
  }, [isInitialized, cameraOn, isVoiceOnlyMode, toggleVideo]);

  // Handle screen capture toggle
  const handleScreenToggle = useCallback(() => {
    if (isScreenSharing) {
      stopScreenCapture();
    } else {
      startScreenCapture();
    }
  }, [isScreenSharing, startScreenCapture, stopScreenCapture]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Control Buttons Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Initialize / Stop Media Button */}
        {!isInitialized ? (
          <button
            onClick={initializeMedia}
            disabled={isInitializing}
            className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
          >
            <Video className="w-4 h-4" />
            {isInitializing ? "Starting..." : "Start Camera"}
          </button>
        ) : (
          <>
            {/* Camera Toggle */}
            <button
              onClick={handleCameraToggle}
              disabled={isVoiceOnlyMode}
              className={`p-2.5 rounded-lg transition-colors ${
                cameraOn
                  ? "bg-secondary hover:bg-secondary/80 text-foreground"
                  : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
              } ${isVoiceOnlyMode ? "opacity-50 cursor-not-allowed" : ""}`}
              title={cameraOn ? "Turn off camera" : "Turn on camera"}
            >
              {cameraOn ? (
                <Video className="w-4 h-4" />
              ) : (
                <VideoOff className="w-4 h-4" />
              )}
            </button>

            {/* Mic Toggle */}
            <button
              onClick={toggleAudio}
              className={`p-2.5 rounded-lg transition-colors ${
                micOn
                  ? "bg-secondary hover:bg-secondary/80 text-foreground"
                  : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
              }`}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              {micOn ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
            </button>

            {/* Voice-Only Mode Toggle */}
            <button
              onClick={handleVoiceOnlyToggle}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isVoiceOnlyMode
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              }`}
              title="Voice-only mode (hide video, keep audio)"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Voice Only</span>
            </button>

            {/* Screen Share Button - Only for Coding interviews */}
            {isCodingSelected && (
              <button
                onClick={handleScreenToggle}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isScreenSharing
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                }`}
                title={isScreenSharing ? "Stop sharing" : "Share screen for coding"}
              >
                {isScreenSharing ? (
                  <MonitorOff className="w-4 h-4" />
                ) : (
                  <Monitor className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isScreenSharing ? "Stop Share" : "Share Screen"}
                </span>
              </button>
            )}

            {/* Stop All Media */}
            <button
              onClick={stopAllMedia}
              className="p-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              title="Stop all media"
            >
              <VideoOff className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Preview Controls */}
        {showPreview && isInitialized && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setIsPreviewHidden(!isPreviewHidden)}
              className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title={isPreviewHidden ? "Show preview" : "Hide preview"}
            >
              {isPreviewHidden ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </button>
            {!isPreviewHidden && (
              <button
                onClick={() => setIsPreviewMinimized(!isPreviewMinimized)}
                className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title={isPreviewMinimized ? "Expand preview" : "Minimize preview"}
              >
                {isPreviewMinimized ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      )}

      {/* Live Preview Window */}
      {showPreview && isInitialized && !isPreviewHidden && (
        <div
          className={`relative overflow-hidden rounded-lg border border-border bg-black transition-all duration-300 ${
            isPreviewMinimized ? "h-16 w-24" : "h-32 w-44"
          }`}
        >
          {/* Camera Preview */}
          {cameraOn ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/50">
              <div className="text-center">
                <VideoOff className="w-6 h-6 text-muted-foreground mx-auto" />
                {!isPreviewMinimized && (
                  <span className="text-xs text-muted-foreground mt-1 block">
                    Camera Off
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Status indicators */}
          <div className="absolute bottom-1 left-1 flex items-center gap-1">
            {/* Mic indicator */}
            <div
              className={`p-1 rounded-full ${
                micOn ? "bg-green-500/80" : "bg-red-500/80"
              }`}
            >
              {micOn ? (
                <Mic className="w-2.5 h-2.5 text-white" />
              ) : (
                <MicOff className="w-2.5 h-2.5 text-white" />
              )}
            </div>
            {/* Voice-only indicator */}
            {isVoiceOnlyMode && (
              <div className="px-1.5 py-0.5 bg-primary/80 rounded text-[10px] text-white font-medium">
                Voice
              </div>
            )}
          </div>

          {/* Minimized label */}
          {isPreviewMinimized && (
            <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/60 rounded text-[10px] text-white">
              You
            </div>
          )}
        </div>
      )}

      {/* Screen Share Preview */}
      {isScreenSharing && screenStream && !isPreviewHidden && (
        <div
          className={`relative overflow-hidden rounded-lg border border-green-500/50 bg-black transition-all duration-300 ${
            isPreviewMinimized ? "h-12 w-20" : "h-24 w-40"
          }`}
        >
          <video
            ref={screenVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-green-500/80 rounded text-[10px] text-white font-medium flex items-center gap-1">
            <Monitor className="w-2.5 h-2.5" />
            {!isPreviewMinimized && <span>Screen</span>}
          </div>
        </div>
      )}

      {/* Status Text */}
      {isInitialized && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div
            className={`w-2 h-2 rounded-full ${
              cameraOn || micOn ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
            }`}
          />
          <span>
            {isVoiceOnlyMode
              ? "Voice-only mode"
              : cameraOn && micOn
              ? "Camera and mic active"
              : cameraOn
              ? "Camera only"
              : micOn
              ? "Mic only"
              : "Media paused"}
            {isScreenSharing && " • Sharing screen"}
          </span>
        </div>
      )}
    </div>
  );
}
