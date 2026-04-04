/**
 * ChatThreadList — history sidebar with depth/inset styling.
 */
import { formatDistanceToNow } from "date-fns";
import { Clock, MessageSquare, Trash2 } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import {
  useChatThreadsQuery,
  useDeleteThreadMutation,
} from "@/hooks/useChatThreads";

interface ChatThreadListProps {
  onSelectThread: (threadId: string) => void;
}

export function ChatThreadList({ onSelectThread }: ChatThreadListProps) {
  const { activeThreadId, startNewChat } = useChatStore();
  const { data, isLoading } = useChatThreadsQuery();
  const deleteMutation = useDeleteThreadMutation();

  const threads = data?.items ?? [];

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
    if (activeThreadId === id) {
      startNewChat();
    }
  };

  return (
    <div className="flex h-full flex-col bg-bg-secondary">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-border-primary/60 px-3">
        <Clock className="size-3 text-text-tertiary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
          History
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="size-4 animate-spin rounded-full border-2 border-text-tertiary border-t-transparent" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-3 py-10">
            <MessageSquare className="size-5 text-text-tertiary/40" />
            <p className="text-[11px] text-text-tertiary">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-0.5 p-1.5">
            {threads.map((thread) => {
              const isActive = activeThreadId === thread.id;
              return (
                <div
                  key={thread.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectThread(thread.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectThread(thread.id);
                    }
                  }}
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-all ${
                    isActive
                      ? "bg-accent-purple/8 shadow-sm ring-1 ring-accent-purple/15"
                      : "hover:bg-bg-secondary"
                  }`}
                >
                  <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded-md ${
                      isActive
                        ? "bg-accent-purple/10 text-accent-purple"
                        : "bg-bg-tertiary text-text-tertiary"
                    }`}
                  >
                    <MessageSquare className="size-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[11px] font-medium leading-tight ${
                        isActive ? "text-text-primary" : "text-text-secondary"
                      }`}
                    >
                      {thread.title}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-tight text-text-tertiary">
                      {formatDistanceToNow(new Date(thread.updated_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, thread.id)}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-all hover:bg-accent-red/10 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="size-3 text-text-tertiary group-hover:text-accent-red/70" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
