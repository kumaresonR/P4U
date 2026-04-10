/**
 * Database-driven social interaction hooks
 * Handles likes, comments, follows, bookmarks via Express backend
 */
import { useCallback } from "react";
import { api as http } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── LIKES ───────────────────────────────────
export function usePostLike(postId: string) {
  const { customerUser } = useAuth();
  const userId = customerUser?.id;
  const qc = useQueryClient();

  const { data: isLiked = false } = useQuery({
    queryKey: ['social-like', postId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const res = await http.get<any>(`/social/posts/${postId}/liked`).catch(() => null);
      return !!(res?.liked);
    },
    enabled: !!userId && !!postId,
  });

  const { data: likeCount = 0 } = useQuery({
    queryKey: ['social-like-count', postId],
    queryFn: async () => {
      const res = await http.get<any>(`/social/posts/${postId}`).catch(() => null);
      return res?.likes_count ?? res?.like_count ?? 0;
    },
    enabled: !!postId,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!userId) { toast.error("Please login"); return; }
      if (isLiked) {
        await http.delete(`/social/posts/${postId}/like`);
      } else {
        await http.post(`/social/posts/${postId}/like`, {});
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-like', postId] });
      qc.invalidateQueries({ queryKey: ['social-like-count', postId] });
    },
  });

  return { isLiked, likeCount, toggleLike: toggleLike.mutate };
}

// ─── BOOKMARKS ───────────────────────────────
export function usePostBookmark(postId: string) {
  const { customerUser } = useAuth();
  const userId = customerUser?.id;
  const qc = useQueryClient();

  const { data: isSaved = false } = useQuery({
    queryKey: ['social-bookmark', postId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const res = await http.get<any>(`/social/posts/${postId}/bookmarked`).catch(() => null);
      return !!(res?.bookmarked);
    },
    enabled: !!userId && !!postId,
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (!userId) { toast.error("Please login"); return; }
      if (isSaved) {
        await http.delete(`/social/posts/${postId}/bookmark`);
        toast.success("Removed from saved");
      } else {
        await http.post(`/social/posts/${postId}/bookmark`, {});
        toast.success("Post saved");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-bookmark', postId] });
    },
  });

  return { isSaved, toggleBookmark: toggleBookmark.mutate };
}

// ─── COMMENTS ────────────────────────────────
export function usePostComments(postId: string) {
  const { customerUser } = useAuth();
  const userId = customerUser?.id;
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['social-comments', postId],
    queryFn: async () => {
      const res = await http.get<any>(`/social/posts/${postId}/comments`, { per_page: 50 } as any).catch(() => null);
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!postId,
  });

  const { data: commentCount = 0 } = useQuery({
    queryKey: ['social-comment-count', postId],
    queryFn: async () => {
      const res = await http.get<any>(`/social/posts/${postId}`).catch(() => null);
      return res?.comment_count || 0;
    },
    enabled: !!postId,
  });

  const addComment = useMutation({
    mutationFn: async ({ text, parentId }: { text: string; parentId?: string }) => {
      if (!userId) { toast.error("Please login"); return; }
      await http.post(`/social/posts/${postId}/comments`, { content: text, parent_id: parentId || null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-comments', postId] });
      qc.invalidateQueries({ queryKey: ['social-comment-count', postId] });
      toast.success("Comment posted");
    },
    onError: () => {
      toast.error("Failed to post comment");
    },
  });

  const toggleCommentLike = useMutation({
    mutationFn: async (commentId: string) => {
      if (!userId) return;
      await http.post(`/social/comments/${commentId}/like`, {}).catch(async () => {
        await http.delete(`/social/comments/${commentId}/like`);
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-comments', postId] });
    },
  });

  return { comments, commentCount, isLoading, addComment: addComment.mutate, toggleCommentLike: toggleCommentLike.mutate };
}

// ─── FOLLOWS ─────────────────────────────────
export function useFollow(targetUserId: string) {
  const { customerUser } = useAuth();
  const userId = customerUser?.id;
  const qc = useQueryClient();

  const { data: isFollowing = false } = useQuery({
    queryKey: ['social-follow', targetUserId, userId],
    queryFn: async () => {
      if (!userId || !targetUserId || userId === targetUserId) return false;
      const res = await http.get<any>(`/social/profiles/${targetUserId}/is-following`).catch(() => null);
      return !!(res?.following);
    },
    enabled: !!userId && !!targetUserId,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!userId) { toast.error("Please login"); return; }
      if (isFollowing) {
        await http.delete(`/social/profiles/${targetUserId}/follow`);
        toast.success("Unfollowed");
      } else {
        await http.post(`/social/profiles/${targetUserId}/follow`, {});
        toast.success("Following");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-follow', targetUserId] });
      qc.invalidateQueries({ queryKey: ['social-follower-count'] });
    },
  });

  return { isFollowing, toggleFollow: toggleFollow.mutate };
}

// ─── POSTS (feed) ────────────────────────────
function unwrapFeedPayload(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
}

export function useSocialFeed(mode: 'following' | 'for_you' = 'for_you') {
  return useQuery({
    queryKey: ['social-feed', mode],
    queryFn: async () => {
      const res = await http.get<any>('/social/feed', { mode, per_page: 20 } as any).catch(() => null);
      return unwrapFeedPayload(res);
    },
  });
}

// ─── SHARE ───────────────────────────────────
export function useSharePost() {
  return useCallback(async (postId: string, text?: string) => {
    const url = `${window.location.origin}/app/social/post/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check this out on P4U Social', text: text || '', url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  }, []);
}

// ─── REPOST ──────────────────────────────────
export function useRepost() {
  const { customerUser } = useAuth();
  const userId = customerUser?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) { toast.error("Please login"); return; }
      await http.post(`/social/posts/${postId}/repost`, {});
      toast.success("Reposted!");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-feed'] });
    },
  });
}
