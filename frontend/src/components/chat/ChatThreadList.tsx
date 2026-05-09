/**
 * ChatThreadList — history sidebar with depth/inset styling.
 */
import { formatDistanceToNow } from "date-fns";
import { Clock, MessageSquare, Trash2 } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useChatThreadsQuery, useDeleteThreadMutation } from "@/hooks/useChatThreads";

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
    <div className="bg-bg-secondary flex h-full flex-col">
      {/* Header */}
      <div className="border-border-primary/60 flex h-10 shrink-0 items-center gap-1.5 border-b px-3">
        <Clock className="text-text-tertiary size-3" />
        <span className="text-text-tertiary text-[10px] font-semibold tracking-widest uppercase">
          History
        </span>
      </div>

      {/* List */}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="border-text-tertiary size-4 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-3 py-10">
            <MessageSquare className="text-text-tertiary/40 size-5" />
            <p className="text-text-tertiary text-[11px]">No conversations yet</p>
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
                      ? "bg-accent-purple/8 ring-accent-purple/15 shadow-sm ring-1"
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
                      className={`truncate text-[11px] leading-tight font-medium ${
                        isActive ? "text-text-primary" : "text-text-secondary"
                      }`}
                    >
                      {thread.title}
                    </p>
                    <p className="text-text-tertiary mt-0.5 text-[10px] leading-tight">
                      {formatDistanceToNow(new Date(thread.updated_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, thread.id)}
                    className="hover:bg-accent-red/10 flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="text-text-tertiary group-hover:text-accent-red/70 size-3" />
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
