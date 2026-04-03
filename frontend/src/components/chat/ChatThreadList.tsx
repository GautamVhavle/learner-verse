/**
 * ChatThreadList — sidebar thread list with clean styling.
 */
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Trash2 } from "lucide-react";
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
    <div className="flex h-full flex-col border-r border-border-primary bg-bg-secondary">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center border-b border-border-primary px-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          History
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-4 animate-spin rounded-full border-2 border-text-tertiary border-t-transparent" />
          </div>
        ) : threads.length === 0 ? (
          <div className="px-3 py-8 text-center text-[11px] text-text-tertiary">
            No conversations yet
          </div>
        ) : (
          <div className="p-1.5">
            {threads.map((thread) => (
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
                className={`group relative flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-bg-tertiary ${
                  activeThreadId === thread.id
                    ? "bg-bg-tertiary"
                    : ""
                }`}
              >
                <MessageSquare className="mt-0.5 size-3 shrink-0 text-text-tertiary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-text-primary">
                    {thread.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-text-tertiary">
                    {formatDistanceToNow(new Date(thread.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, thread.id)}
                  className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-md opacity-0 transition-all hover:bg-accent-red/10 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="size-3 text-text-tertiary hover:text-accent-red" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
