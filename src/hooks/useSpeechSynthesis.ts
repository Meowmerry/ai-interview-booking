"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceGender = "female" | "male";

interface UseSpeechSynthesisOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  preferredGender?: VoiceGender;
}

// Helper function to find a natural-sounding voice based on gender preference
export function findVoiceByGender(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  // Known high-quality voices categorized by gender
  const femaleVoices = [
    "Google UK English Female",
    "Google US English Female",
    "Microsoft Zira",
    "Samantha",
    "Karen",
    "Moira",
    "Tessa",
    "Fiona",
    "Victoria",
    "Allison",
  ];

  const maleVoices = [
    "Google UK English Male",
    "Google US English Male",
    "Microsoft David",
    "Alex",
    "Daniel",
    "Tom",
    "Oliver",
    "Aaron",
    "Fred",
  ];

  const preferredList = gender === "female" ? femaleVoices : maleVoices;

  // Try to find a preferred voice
  for (const preferred of preferredList) {
    const found = voices.find((v) => v.name.includes(preferred));
    if (found) return found;
  }

  // Fallback: search by common gender indicators in voice names
  const genderKeywords =
    gender === "female"
      ? ["female", "woman", "girl", "zira", "samantha", "karen", "fiona"]
      : ["male", "man", "david", "daniel", "alex", "tom", "oliver"];

  const fallbackVoice = voices.find((v) => {
    const nameLower = v.name.toLowerCase();
    return (
      v.lang.startsWith("en") &&
      genderKeywords.some((keyword) => nameLower.includes(keyword))
    );
  });

  if (fallbackVoice) return fallbackVoice;

  // Last resort: return first English voice
  return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
}

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}) {
  const {
    onStart,
    onEnd,
    onError,
    rate = 1,
    pitch = 1,
    volume = 1,
    voiceName,
    preferredGender = "female",
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check for browser support and load voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();

      // Voices may load asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Get the best voice for the interviewer based on gender preference
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    // If a specific voice name is requested, use that
    if (voiceName) {
      const found = voices.find((v) => v.name.includes(voiceName));
      if (found) return found;
    }

    // Use the gender-based voice finder
    return findVoiceByGender(voices, preferredGender);
  }, [voices, voiceName, preferredGender]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Set voice
      const voice = getVoice();
      if (voice) {
        utterance.voice = voice;
      }

      // Set properties
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        onStart?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        onEnd?.();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        setIsPaused(false);
        onError?.(event.error);
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      // Speak
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, getVoice, rate, pitch, volume, onStart, onEnd, onError]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
  };
}
