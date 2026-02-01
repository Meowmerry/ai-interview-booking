import { create } from "zustand";
import type { ScorecardResponse } from "@/app/api/scorecard/route";

export type InterviewStep = "setup" | "interviewing" | "feedback";

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

  // Actions
  setCurrentStep: (step: InterviewStep) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setJobDescription: (description: string) => void;
  setIsSpeaking: (speaking: boolean) => void;
  setScorecard: (scorecard: ScorecardResponse | null) => void;
  setScorecardLoading: (loading: boolean) => void;
  setScorecardError: (error: string | null) => void;
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

  resetInterview: () =>
    set({
      currentStep: "setup",
      messages: [],
      jobDescription: "",
      isSpeaking: false,
      scorecard: null,
      isScorecardLoading: false,
      scorecardError: null,
    }),
}));
