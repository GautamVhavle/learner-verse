/**
 * Zustand store for LiVi chat panel UI state.
 */
import { create } from "zustand";

interface ChatState {
  isOpen: boolean;
  activeThreadId: string | null;
  isThreadListOpen: boolean;

  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setActiveThread: (id: string | null) => void;
  startNewChat: () => void;
  toggleThreadList: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  isOpen: false,
  activeThreadId: null,
  isThreadListOpen: false,

  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),
  setActiveThread: (id) => set({ activeThreadId: id }),
  startNewChat: () => set({ activeThreadId: null, isThreadListOpen: false }),
  toggleThreadList: () => set((s) => ({ isThreadListOpen: !s.isThreadListOpen })),
}));
