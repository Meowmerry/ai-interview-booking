import { create } from "zustand";
import type { ScorecardResponse } from "@/app/api/scorecard/route";

export type InterviewStep = "setup" | "interviewing" | "feedback";
export type VoicePreference = "female" | "male";
export type InterviewType = "coding" | "multiple-choice" | "behavioral" | "technical" | "hr" | "hiring-manager";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type InterviewDuration = 15 | 30 | 60;

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface InterviewState {
  currentStep: InterviewStep;
  messages: Message[];
  jobDescription: string;
  isSpeaking: boolean;
  scorecard: ScorecardResponse | null;
  isScorecardLoading: boolean;
  scorecardError: string | null;
  preferredVoice: VoicePreference;
  interviewTypes: InterviewType[];
  difficulty: DifficultyLevel;
  duration: InterviewDuration;

  // Actions
  setCurrentStep: (step: InterviewStep) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setJobDescription: (description: string) => void;
  setIsSpeaking: (speaking: boolean) => void;
  setScorecard: (scorecard: ScorecardResponse | null) => void;
  setScorecardLoading: (loading: boolean) => void;
  setScorecardError: (error: string | null) => void;
  setPreferredVoice: (voice: VoicePreference) => void;
  setInterviewTypes: (types: InterviewType[]) => void;
  toggleInterviewType: (type: InterviewType) => void;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  setDuration: (duration: InterviewDuration) => void;
  resetInterview: () => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  currentStep: "setup",
  messages: [],
  jobDescription: "",
  isSpeaking: false,
  scorecard: null,
  isScorecardLoading: false,
  scorecardError: null,
  preferredVoice: "female",
  interviewTypes: [],
  difficulty: "intermediate",
  duration: 30,

  setCurrentStep: (step) => set({ currentStep: step }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  clearMessages: () => set({ messages: [] }),

  setJobDescription: (description) => set({ jobDescription: description }),

  setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),

  setScorecard: (scorecard) => set({ scorecard }),

  setScorecardLoading: (loading) => set({ isScorecardLoading: loading }),

  setScorecardError: (error) => set({ scorecardError: error }),

  setPreferredVoice: (voice) => set({ preferredVoice: voice }),

  setInterviewTypes: (types) => set({ interviewTypes: types }),

  toggleInterviewType: (type) =>
    set((state) => ({
      interviewTypes: state.interviewTypes.includes(type)
        ? state.interviewTypes.filter((t) => t !== type)
        : [...state.interviewTypes, type],
    })),

  setDifficulty: (difficulty) => set({ difficulty }),

  setDuration: (duration) => set({ duration }),

  resetInterview: () =>
    set({
      currentStep: "setup",
      messages: [],
      jobDescription: "",
      isSpeaking: false,
      scorecard: null,
      isScorecardLoading: false,
      scorecardError: null,
      interviewTypes: [],
      difficulty: "intermediate",
      duration: 30,
    }),
}));
