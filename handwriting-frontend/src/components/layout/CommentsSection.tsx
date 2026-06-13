import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface CommentsSectionProps {
  itemId: string | null;
}

export function CommentsSection({ itemId }: CommentsSectionProps) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useComments(itemId);
  const createComment = useCreateComment(itemId);
  const deleteComment = useDeleteComment(itemId);
  const [newComment, setNewComment] = useState("");

  const handleSubmit = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    createComment.mutate(trimmed, {
      onSuccess: () => setNewComment(""),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!itemId) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-display text-xs text-muted-foreground uppercase tracking-wider">
        Comments
      </h3>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-3 max-h-[240px] overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2 group">
              <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                <AvatarImage src={comment.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                  {(comment.display_name ?? "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xs font-medium text-foreground truncate">
                    {comment.display_name ?? "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {user?.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => deleteComment.mutate(comment.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <Textarea
          placeholder="Add a comment... (⌘+Enter to send)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          className="font-body text-xs min-h-[60px] resize-none border-border bg-background"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 self-end"
          onClick={handleSubmit}
          disabled={!newComment.trim() || createComment.isPending}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
