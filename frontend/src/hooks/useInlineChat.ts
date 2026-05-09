/**
 * useInlineChat — stateless streaming chat for inline lesson help.
 *
 * Unlike useLiviChat (which uses threads and persistence), this hook
 * manages a local in-memory conversation and streams responses from
 * the inline chat endpoint. Context is provided upfront.
 */
import { useState, useCallback, useRef } from "react";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";

export type InlineChatStatus = "idle" | "ready" | "streaming" | "error";

export type InlineContextType = "video" | "reading" | "quiz";

export interface InlineMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let _counter = 0;
function genId() {
  return `inline-${Date.now()}-${++_counter}`;
}

interface UseInlineChatOptions {
  contextType: InlineContextType;
  contextData: Record<string, unknown>;
}

export function useInlineChat({ contextType, contextData }: UseInlineChatOptions) {
  const [messages, setMessages] = useState<InlineMessage[]>([]);
  const [status, setStatus] = useState<InlineChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status === "streaming") return;

      setError(null);

      const userMsg: InlineMessage = {
        id: genId(),
        role: "user",
        content: trimmed,
      };

      // Build history from existing messages (exclude the new one)
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const assistantMsg: InlineMessage = {
        id: genId(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStatus("streaming");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/chat/inline/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            message: trimmed,
            history,
            context_type: contextType,
            context_data: contextData,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error("Too many messages. Please wait a moment.");
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
          accumulated += decoder.decode(value, { stream: true });
          const current = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: current } : m)),
          );
        }

        setStatus("ready");
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("ready");
          return;
        }
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        setStatus("error");
        // Remove empty assistant message
        setMessages((prev) => prev.filter((m) => !(m.id === assistantMsg.id && !m.content.trim())));
      } finally {
        abortRef.current = null;
      }
    },
    [status, messages, contextType, contextData],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("ready");
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setStatus("idle");
    setError(null);
  }, []);

  return { messages, status, error, sendMessage, stop, clear };
}
