/**
 * useLiviChat — custom hook for streaming chat with the FastAPI backend.
 *
 * Manages message state, streaming via fetch ReadableStream, and
 * auto-scroll. Works with any thread ID and handles thread creation
 * on first message.
 */
import { useState, useCallback, useRef } from "react";
import { useLocation } from "react-router";
import { API_BASE_URL, api, getAuthHeaders } from "@/lib/api";
import { useChatStore } from "@/stores/chatStore";
import {
  useCreateThreadMutation,
  useChatInvalidation,
  type ChatMessage,
} from "@/hooks/useChatThreads";

export type ChatStatus = "ready" | "streaming" | "error";

export interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  files?: { name: string; type: string; size: number }[];
}

let _msgCounter = 0;
function genId() {
  return `msg-${Date.now()}-${++_msgCounter}`;
}

export function useLiviChat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const location = useLocation();

  const { activeThreadId, setActiveThread } = useChatStore();
  const createThread = useCreateThreadMutation();
  const { invalidateThreads, invalidateMessages } = useChatInvalidation();

  /** Derive page context from the current route. */
  const getPageContext = useCallback(() => {
    const path = location.pathname;
    const parts = path.split("/").filter(Boolean);
    const mode = parts[0]; // "creator" or "learner"
    const page = parts[1] || "dashboard";

    const labels: Record<string, string> = {
      dashboard: "Dashboard",
      courses: "My Courses",
      browse: "Browse Courses",
      hub: "Course Hub",
      study: "Studying a Course",
      certificates: "Certificates",
      goals: "Goals",
      stats: "Statistics",
      analytics: "Analytics",
      settings: "Settings",
      profile: "Profile",
      inbox: "Inbox",
      edit: "Course Builder",
    };

    const label = labels[page] || page;
    const modeLabel = mode === "creator" ? "Creator" : "Learner";

    // Include course/lesson IDs for deeper context
    if (parts.length >= 3) {
      return `${modeLabel} mode → ${label} (ID: ${parts[2]})`;
    }
    return `${modeLabel} mode → ${label}`;
  }, [location.pathname]);

  /** Load an existing thread's messages from the server. */
  const loadThread = useCallback(
    async (threadId: string) => {
      setActiveThread(threadId);
      setThreadLoading(true);
      setError(null);
      try {
        const data = await api.get<{ messages: ChatMessage[] }>(`/chat/threads/${threadId}`);
        setMessages(
          data.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            createdAt: new Date(m.created_at),
          })),
        );
      } catch {
        setError("Failed to load messages.");
      } finally {
        setThreadLoading(false);
      }
    },
    [setActiveThread],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStatus("ready");
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string, files?: File[]) => {
      if (!text.trim() || status === "streaming") return;

      setError(null);
      const fileMeta = files?.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      }));
      const userMsg: UIMessage = {
        id: genId(),
        role: "user",
        content: text.trim(),
        createdAt: new Date(),
        files: fileMeta,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Ensure we have a thread
      let threadId = activeThreadId;
      if (!threadId) {
        try {
          const thread = await createThread.mutateAsync("New Chat");
          threadId = thread.id;
          setActiveThread(threadId);
        } catch {
          setError("Failed to create chat thread.");
          setStatus("error");
          return;
        }
      }

      // Stream the response
      setStatus("streaming");
      const assistantMsg: UIMessage = {
        id: genId(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const headers = await getAuthHeaders();
        const pageCtx = getPageContext();
        // Build message with file context
        let messageText = text.trim();
        if (fileMeta && fileMeta.length > 0) {
          const fileList = fileMeta.map((f) => f.name).join(", ");
          messageText += `\n\n[Attached files: ${fileList}]`;
        }
        const res = await fetch(`${API_BASE_URL}/chat/threads/${threadId}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ message: messageText, context: pageCtx }),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error("You're sending messages too quickly. Please wait a moment.");
          }
          if (res.status === 400) {
            const body = await res.json().catch(() => null);
            throw new Error(body?.detail ?? "Invalid request.");
          }
          throw new Error(`Server error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          // Update assistant message content
          const current = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: current } : m)),
          );
        }

        setStatus("ready");
        invalidateThreads();
        invalidateMessages(threadId);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("ready");
          return;
        }
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Something went wrong. Please try again.";
        setError(message);
        setStatus("error");
        // Remove empty assistant message on error
        setMessages((prev) => prev.filter((m) => !(m.id === assistantMsg.id && !m.content.trim())));
      } finally {
        abortRef.current = null;
      }
    },
    [
      status,
      activeThreadId,
      setActiveThread,
      createThread,
      invalidateThreads,
      invalidateMessages,
      getPageContext,
    ],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("ready");
  }, []);

  return {
    messages,
    status,
    error,
    threadLoading,
    sendMessage,
    stop,
    loadThread,
    clearMessages,
    setMessages,
  };
}
