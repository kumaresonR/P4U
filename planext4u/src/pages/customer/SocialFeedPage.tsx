import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Plus, ChevronDown, Repeat2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { useSocialFeed, useSharePost, useRepost } from "@/hooks/use-social-interactions";
import { api as http, tokenStore } from "@/lib/apiClient";
import { uploadCustomerStoryFile } from "@/lib/customer-media-upload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// "Your Story" is always first; ring list uses real profile ids from the API (see story strip query).
const OWN_STORY = { id: 'own', username: 'Your Story', avatar: '', isOwn: true, seen: false };

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

/** Prefer full-size URL; fall back to compressed variants (matches API `media` items). */
function pickPostMediaSrc(item: { url?: string; mediumUrl?: string; thumbnailUrl?: string } | undefined): string {
  if (!item) return '';
  const u = item.url || item.mediumUrl || item.thumbnailUrl;
  return typeof u === 'string' && u.trim() ? u.trim() : '';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CommentItem({ comment }: { comment: any }) {
  const profileId = comment.profile_id || comment.user_id;
  const { data: profile } = useQuery({
    queryKey: ['social-comment-profile', profileId],
    queryFn: async () => {
      const res = await http.get<any>(`/social/profiles/${profileId}`).catch(() => null);
      return res;
    },
    enabled: !!profileId,
  });
  const name = comment.profile?.username || profile?.username || profile?.display_name || 'user';
  const avatar = comment.profile?.avatar || profile?.avatar_url || profile?.avatar || '';
  return (
    <div className="flex items-start gap-2 py-1">
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px] font-bold">{name.charAt(0).toUpperCase()}</span>}
      </div>
      <p className="text-sm flex-1">
        <span className="font-semibold mr-1">{name}</span>
        <span className="text-muted-foreground">{comment.content}</span>
      </p>
    </div>
  );
}

function PostCard({ post }: { post: any }) {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const sharePost = useSharePost();
  const repost = useRepost();
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [mockComments, setMockComments] = useState<any[]>([]);

  const isMock = !!post.isMock;
  const userId = customerUser?.id;
  const postId = post.id;
  const mediaItems = Array.isArray(post.media) ? post.media : [];
  const isCarousel = mediaItems.length > 1;

  const EMOJI_PALETTE = ["😀","😂","😍","🥰","😎","🤩","😢","😡","👍","👏","🔥","❤️","💯","🎉","🙌","💪","🤔","😅","🥺","✨","💕","🎊","👀","🤗","😤","💀","🫡","🤝"];
  const GIF_STICKERS = ["😊","🎉","🔥","💯","👏","❤️‍🔥","🥳","🫶","💐","🌟"];

  // Backend should include is_liked_by_me / is_bookmarked_by_me on the post object.
  // Falls back to post values for optimistic UI.
  const isLiked = !!post.is_liked_by_me;
  const isSaved = !!post.is_bookmarked_by_me;
  const likeCount = post.likes_count ?? post.like_count ?? 0;
  const commentCount = post.comments_count ?? post.comment_count ?? 0;

  const postProfile = post.profile || null;

  // Fetch comments inline (only when expanded for performance)
  const { data: allComments = [] } = useQuery({
    queryKey: ['social-all-comments', postId],
    queryFn: async () => {
      const res = await http.get<any>(`/social/posts/${postId}/comments`).catch(() => null);
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: showAllComments && !!postId,
  });

  const { data: recentComments = [] } = useQuery({
    queryKey: ['social-recent-comments', postId],
    queryFn: async () => {
      const res = await http.get<any>(`/social/posts/${postId}/comments`).catch(() => null);
      const list = Array.isArray(res) ? res : (res?.data || []);
      return list.slice(0, 2);
    },
    enabled: !!postId,
  });

  // Optimistic local state for like/save toggles
  const [localLiked, setLocalLiked] = useState<boolean | null>(null);
  const [localSaved, setLocalSaved] = useState<boolean | null>(null);
  const [localLikeDelta, setLocalLikeDelta] = useState(0);

  const liked = localLiked ?? isLiked;
  const saved = localSaved ?? isSaved;
  const likes = likeCount + localLikeDelta;
  const comments = commentCount;
  const shareCount = post.shares_count ?? post.share_count ?? 0;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (isMock) {
        const was = localLiked ?? isLiked;
        setLocalLiked(!was);
        setLocalLikeDelta((d) => d + (was ? -1 : 1));
        return;
      }
      if (!userId) { toast.error("Please login to like"); return; }
      if (isLiked) {
        await http.delete(`/social/posts/${postId}/like`);
      } else {
        await http.post(`/social/posts/${postId}/like`, {});
      }
    },
    onSuccess: () => {
      if (!isMock) {
        qc.invalidateQueries({ queryKey: ['social-like', postId] });
        qc.invalidateQueries({ queryKey: ['social-like-count', postId] });
      }
    },
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (isMock) { setLocalSaved(v => !v); toast.success(localSaved ? "Removed from saved" : "Post saved"); return; }
      if (!userId) { toast.error("Please login"); return; }
      if (isSaved) {
        await http.delete(`/social/posts/${postId}/bookmark`);
        toast.success("Removed from saved");
      } else {
        await http.post(`/social/posts/${postId}/bookmark`, {});
        toast.success("Post saved");
      }
    },
    onSuccess: () => { if (!isMock) qc.invalidateQueries({ queryKey: ['social-bookmark', postId] }); },
  });

  const submitComment = useMutation({
    mutationFn: async () => {
      if (!commentText.trim()) return;
      if (isMock) {
        setMockComments(prev => [{ id: `mc${Date.now()}`, user_id: userId || 'you', content: commentText.trim(), created_at: new Date().toISOString() }, ...prev]);
        toast.success("Comment posted");
        setCommentText("");
        return;
      }
      if (!userId) { toast.error("Please login"); return; }
      await http.post(`/social/posts/${postId}/comments`, { content: commentText.trim() });
      setCommentText("");
      toast.success("Comment posted");
    },
    onSuccess: () => {
      if (!isMock) {
        qc.invalidateQueries({ queryKey: ['social-comment-count', postId] });
        qc.invalidateQueries({ queryKey: ['social-recent-comments', postId] });
        qc.invalidateQueries({ queryKey: ['social-all-comments', postId] });
      }
    },
  });

  const username = isMock ? post.username : (postProfile?.display_name || postProfile?.username || 'user');
  const isVerified = isMock ? post.isVerified : (postProfile?.is_verified || false);
  const avatarUrl = isMock ? '' : (postProfile?.avatar_url || postProfile?.avatar || '');

  const displayComments = isMock ? mockComments : (showAllComments ? allComments : recentComments);

  return (
    <article className="border-b border-border/20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to={`/app/social/@${username}`}>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-[1.5px]">
            <div className="h-full w-full rounded-full bg-card flex items-center justify-center overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> :
                <span className="text-xs font-bold">{username.charAt(0).toUpperCase()}</span>}
            </div>
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Link to={`/app/social/@${username}`} className="text-sm font-semibold">{username}</Link>
            {isVerified && <svg className="h-3.5 w-3.5 text-primary fill-current shrink-0" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
            {post.collabUser && <span className="text-sm text-muted-foreground"> and <span className="font-semibold text-foreground">{post.collabUser}</span></span>}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {post.location_name ? `${post.location_name} · ` : ''}{timeAgo(post.created_at)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="p-1"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Not Interested</DropdownMenuItem>
            <DropdownMenuItem>Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => sharePost(postId, post.caption)}>Copy Link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {mediaItems.length > 0 ? (
          mediaItems[carouselIdx]?.type === 'video' ? (
            <video 
              src={pickPostMediaSrc(mediaItems[carouselIdx])} 
              className="w-full h-full object-cover cursor-pointer"
              controls muted playsInline
              onClick={() => setFullscreenImg(pickPostMediaSrc(mediaItems[carouselIdx]))}
            />
          ) : (
            <img 
              src={pickPostMediaSrc(mediaItems[carouselIdx])} 
              alt="" 
              className="w-full h-full object-cover cursor-pointer" 
              loading="lazy"
              onClick={() => setFullscreenImg(pickPostMediaSrc(mediaItems[carouselIdx]))}
              onDoubleClick={(e) => { e.stopPropagation(); toggleLike.mutate(); }}
              onError={(e) => {
                const el = e.currentTarget;
                const item = mediaItems[carouselIdx];
                if (!item) return;
                const chain = [item.url, item.mediumUrl, item.thumbnailUrl]
                  .filter((u): u is string => typeof u === 'string' && u.length > 0);
                const uniq = [...new Set(chain)];
                const i = Number(el.dataset.fallbackIdx || '0');
                if (i + 1 < uniq.length) {
                  el.dataset.fallbackIdx = String(i + 1);
                  el.src = uniq[i + 1];
                }
              }}
            />
          )
        ) : (
          <div className="w-full h-full bg-accent/30 flex items-center justify-center"><span className="text-muted-foreground text-sm">No media</span></div>
        )}
        {isCarousel && (
          <>
            {carouselIdx > 0 && <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-1" onClick={() => setCarouselIdx(i => i - 1)}><ChevronDown className="h-4 w-4 -rotate-90" /></button>}
            {carouselIdx < mediaItems.length - 1 && <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-1" onClick={() => setCarouselIdx(i => i + 1)}><ChevronDown className="h-4 w-4 rotate-90" /></button>}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {mediaItems.map((_: any, i: number) => <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === carouselIdx ? 'bg-primary' : 'bg-white/50'}`} />)}
            </div>
          </>
        )}
      </div>

      {/* Fullscreen Image Viewer */}
      <Dialog open={!!fullscreenImg} onOpenChange={() => setFullscreenImg(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-0 overflow-hidden">
          <button onClick={() => setFullscreenImg(null)} className="absolute top-3 right-3 z-50 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center">
            <X className="h-5 w-5 text-white" />
          </button>
          {fullscreenImg && (
            fullscreenImg.includes('video') || fullscreenImg.endsWith('.mp4') ? (
              <video src={fullscreenImg} className="w-full h-full object-contain max-h-[90vh]" controls autoPlay />
            ) : (
              <img src={fullscreenImg} alt="" className="w-full h-full object-contain max-h-[90vh]" />
            )
          )}
          {isCarousel && fullscreenImg && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {mediaItems.map((_: any, i: number) => (
                <button key={i} onClick={() => setFullscreenImg(pickPostMediaSrc(mediaItems[i]))}
                  className={`h-2 w-2 rounded-full ${pickPostMediaSrc(mediaItems[i]) === fullscreenImg ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-5">
          <button className="flex items-center gap-1.5" onClick={() => toggleLike.mutate()}>
            <AnimatePresence mode="wait">
              {liked ? (
                <motion.div key="liked" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}><Heart className="h-6 w-6 fill-red-500 text-red-500" /></motion.div>
              ) : (
                <motion.div key="unliked"><Heart className="h-6 w-6" /></motion.div>
              )}
            </AnimatePresence>
            <span className="text-sm font-semibold">{formatCount(likes)}</span>
          </button>
          <button className="flex items-center gap-1.5" onClick={() => { if (!userId) { toast.error("Please login to comment"); navigate("/app/login"); return; } setShowCommentInput(v => !v); }}>
            <MessageCircle className="h-6 w-6" />
            <span className="text-sm">{formatCount(comments)}</span>
          </button>
          <button className="flex items-center gap-1.5" onClick={() => repost.mutate(postId)}>
            <Repeat2 className="h-6 w-6" />
          </button>
          <button className="flex items-center gap-1.5" onClick={() => sharePost(postId, post.caption)}>
            <Send className="h-6 w-6" />
            <span className="text-sm">{formatCount(shareCount)}</span>
          </button>
        </div>
        <button onClick={() => toggleBookmark.mutate()}><Bookmark className={`h-6 w-6 ${saved ? 'fill-foreground' : ''}`} /></button>
      </div>

      {/* Caption */}
      <div className="px-4 py-1">
        <p className="text-sm">
          <Link to={`/app/social/@${username}`} className="font-semibold mr-1">{username}</Link>
          {post.caption}
          <span className="text-primary ml-1 cursor-pointer">more</span>
        </p>
        {post.hashtags && Array.isArray(post.hashtags) && <p className="text-sm text-primary mt-0.5">{post.hashtags.join(' ')}</p>}
      </div>

      {/* View all comments - inline expand */}
      {comments > 0 && !showAllComments && (
        <button className="px-4 py-1" onClick={() => setShowAllComments(true)}>
          <p className="text-sm text-muted-foreground">View all {formatCount(comments)} comments</p>
        </button>
      )}

      {/* Inline comments with accordion */}
      <AnimatePresence>
        {(showAllComments || recentComments.length > 0 || (isMock && mockComments.length > 0)) && (
          <motion.div
            initial={showAllComments ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 space-y-1 max-h-60 overflow-y-auto">
              {(!showAllComments && !isMock ? recentComments : displayComments).map((c: any) => (
                <CommentItem key={c.id} comment={c} />
              ))}
            </div>
            {showAllComments && (
              <button className="px-4 py-1" onClick={() => setShowAllComments(false)}>
                <p className="text-xs text-primary font-medium">Hide comments</p>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline comment input with accordion expand + emoji/GIF */}
      <div className="px-4 pb-3 pt-1">
        <AnimatePresence>
          {showCommentInput ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full text-sm bg-muted/50 rounded-lg p-3 resize-none min-h-[60px] max-h-[140px] border border-border/30 outline-none focus:ring-1 focus:ring-primary/30"
                  rows={3}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment.mutate(); } }}
                />
                {/* Emoji quick bar */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                  {GIF_STICKERS.map(e => (
                    <button key={e} className="text-lg shrink-0 hover:scale-125 transition-transform" onClick={() => setCommentText(prev => prev + e)}>{e}</button>
                  ))}
                  <button className="shrink-0 text-xs font-medium text-primary px-2 py-1 rounded-full border border-primary/30 ml-1"
                    onClick={() => setShowEmojiPicker(v => !v)}>
                    😊 More
                  </button>
                </div>
                {/* Full emoji picker */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="grid grid-cols-7 gap-1 p-2 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
                        {EMOJI_PALETTE.map(e => (
                          <button key={e} className="text-xl p-1 hover:bg-primary/10 rounded transition-colors" onClick={() => setCommentText(prev => prev + e)}>{e}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Rich text hint + actions */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">**bold** _italic_ ~strike~</p>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setShowCommentInput(false)} className="text-xs text-muted-foreground">Cancel</button>
                    <button onClick={() => submitComment.mutate()} disabled={!commentText.trim()} className="text-sm font-semibold text-primary disabled:opacity-40">Post</button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer" onClick={() => { if (!userId) { toast.error("Please login to comment"); navigate("/app/login"); return; } setShowCommentInput(true); }}>
              <span>Add a comment...</span>
              <span className="ml-auto">😊</span>
            </div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}

function StoryBubble({ story, navigate, customerUser, mySocialProfileId }: { story: any; navigate: any; customerUser: any; mySocialProfileId: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // Check if current user has active stories (same feed as /social/stories; server enforces 24h expiry).
  const { data: hasOwnStories = false } = useQuery({
    queryKey: ['own-stories-exist', mySocialProfileId],
    queryFn: async () => {
      if (!mySocialProfileId) return false;
      const res = await http.get<any>('/social/stories/mine').catch(() => null);
      const stories = Array.isArray(res) ? res : (res?.data || []);
      return stories.length > 0;
    },
    enabled: story.isOwn && !!mySocialProfileId,
  });

  const handleYourStoryClick = () => {
    if (!story.isOwn) {
      navigate(`/app/social/stories/${story.id}`);
      return;
    }
    if (!customerUser?.id) { toast.error("Please login"); navigate("/app/login"); return; }
    if (!mySocialProfileId) { toast.error("Could not load your profile"); return; }
    if (hasOwnStories) {
      navigate(`/app/social/stories/${mySocialProfileId}`);
    } else {
      fileRef.current?.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (!customerUser?.id) return;

    toast.info(`Uploading ${files.length} story item(s)...`);
    const token = tokenStore.getAccess();
    const items: { media_url: string; media_type: 'image' | 'video' | 'audio' }[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : isAudio ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max ${isVideo ? '50MB' : isAudio ? '20MB' : '10MB'}.`);
        continue;
      }

      const uploaded = await uploadCustomerStoryFile(file, token);
      if (!uploaded.ok || !uploaded.url) {
        const hint =
          uploaded.status === 403
            ? ' (not allowed)'
            : uploaded.status === 413
              ? ' (file too large)'
              : '';
        toast.error(`Upload failed for ${file.name}${hint}`);
        continue;
      }
      const url = uploaded.url;

      const media_type = isVideo ? 'video' : isAudio ? 'audio' : 'image';
      items.push({ media_url: url, media_type });
    }

    if (items.length) {
      try {
        await http.post('/social/stories', { items });
        toast.success("Story posted! 🎉");
      } catch {
        toast.error("Could not publish story");
      }
    }

    qc.invalidateQueries({ queryKey: ['social-feed-stories'] });
    qc.invalidateQueries({ queryKey: ['own-stories-exist'] });
    e.target.value = '';
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" multiple className="hidden" onChange={handleFileSelect} />
      <button className="flex flex-col items-center gap-1 shrink-0 w-[68px]" onClick={handleYourStoryClick}>
        <div className={`relative p-[2px] rounded-full ${story.isOwn ? (hasOwnStories ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600' : '') : story.seen ? 'bg-muted' : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600'}`}>
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-card p-[2px]">
            <div className="h-full w-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {story.isOwn ? (
                <div className="relative h-full w-full bg-accent flex items-center justify-center"><Plus className="h-5 w-5 text-muted-foreground" /></div>
              ) : story.avatar ? (
                <img src={story.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-muted-foreground">{story.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
        </div>
        <span className="text-[10px] max-w-[56px] truncate text-center">
          {story.isOwn ? "Your Story" : story.username.split('_')[0]}
        </span>
      </button>
    </>
  );
}

export default function SocialFeedPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [feedMode, setFeedMode] = useState<'following' | 'for_you'>('for_you');

  const { data: dbPosts = [], isLoading: feedLoading } = useSocialFeed(feedMode);

  const { data: mySocialProfileId = null } = useQuery({
    queryKey: ['social-profile-me-id', customerUser?.id],
    queryFn: async () => {
      const res = await http.get<any>('/social/profiles/me').catch(() => null);
      return res?.id || null;
    },
    enabled: !!customerUser?.id,
  });

  // One ring per author (social profile_id), not customer user id.
  const { data: storyUsers = [] } = useQuery({
    queryKey: ['social-feed-stories'],
    queryFn: async () => {
      const res = await http.get<any>('/social/stories').catch(() => null);
      const data: any[] = Array.isArray(res) ? res : (res?.data || []);
      if (!data.length) return [];
      const seen = new Set<string>();
      return data
        .filter((s: any) => {
          const pid = s.profile_id || s.profile?.id;
          if (!pid || seen.has(pid)) return false;
          seen.add(pid);
          return true;
        })
        .map((s: any) => {
          const prof = s.profile || s.social_profiles || {};
          const pid = s.profile_id || prof?.id;
          return {
            id: pid,
            username: prof?.display_name || prof?.username || 'user',
            avatar: prof?.avatar_url || prof?.avatar || '',
            seen: false,
          };
        });
    },
  });

  const stories = [OWN_STORY, ...storyUsers];

  const posts = dbPosts.map((p: any) => ({
    ...p,
    media: Array.isArray(p.media) ? p.media : [],
  }));

  const content = (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border/30 md:hidden">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Socio</span>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app/social/create")} className="p-1.5"><Plus className="h-6 w-6" /></button>
            <button onClick={() => navigate("/app/social/notifications")} className="p-1.5 relative">
              <Heart className="h-6 w-6" />
              <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-destructive rounded-full" />
            </button>
            <button onClick={() => navigate("/app/social/messages")} className="p-1.5"><Send className="h-6 w-6" /></button>
          </div>
        </div>
      </header>

      {/* Desktop stories header */}
      <div className="hidden md:block px-4 pt-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stories</span>
      </div>

      {/* Stories - horizontally scrollable (touch / trackpad / scrollbar — no side arrows) */}
      <div className="border-b border-border/20">
        <div
          className="flex gap-3 px-4 py-3 overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
        >
          {stories.map((story: any) => (
            <StoryBubble key={story.id} story={story} navigate={navigate} customerUser={customerUser} mySocialProfileId={mySocialProfileId} />
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="pb-20 md:pb-8">
        {feedLoading && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading feed…</div>
        )}
        {!feedLoading && posts.length === 0 && (
          <div className="px-4 py-12 text-center space-y-2">
            <p className="text-sm font-semibold">No posts yet</p>
            <p className="text-xs text-muted-foreground">Follow people or switch to For you to discover posts. Create your first post from the + button.</p>
          </div>
        )}
        {posts.map((post: any) => <PostCard key={post.id} post={post} />)}
        {!feedLoading && posts.length > 0 && (
          <div className="py-6 px-4 text-center">
            <p className="text-sm font-semibold mb-1">You're All Caught Up</p>
            <p className="text-xs text-muted-foreground">You've seen all new posts from the last 3 days.</p>
          </div>
        )}
      </div>
    </>
  );

  return <SocialLayout>{content}</SocialLayout>;
}
