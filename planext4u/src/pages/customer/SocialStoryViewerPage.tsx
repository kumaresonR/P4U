import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Heart, Send, MoreHorizontal, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api as http } from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

/** Route param is the author's social profile id (same as story.profile_id). */
export default function SocialStoryViewerPage() {
  const navigate = useNavigate();
  const { userId: profileIdParam } = useParams();
  const { customerUser } = useAuth();
  const [currentUserIdx, setCurrentUserIdx] = useState(0);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState("");

  const { data: storyGroups = [], isLoading, isFetched } = useQuery({
    queryKey: ['social-stories-viewer'],
    queryFn: async () => {
      const res = await http.get<any>('/social/stories').catch(() => null);
      const data: any[] = Array.isArray(res) ? res : (res?.data || []);
      if (!data.length) return [];

      const grouped: Record<string, { user: { id: string; username: string; displayName: string; avatarUrl: string }; stories: any[] }> = {};
      for (const s of data) {
        const pid = s.profile_id || s.profile?.id;
        if (!pid) continue;
        if (!grouped[pid]) {
          const profile = s.profile || s.social_profiles || {};
          grouped[pid] = {
            user: {
              id: pid,
              username: profile?.username || 'user',
              displayName: profile?.display_name || profile?.username || '',
              avatarUrl: profile?.avatar_url || profile?.avatar || '',
            },
            stories: [],
          };
        }
        grouped[pid].stories.push(s);
      }
      const groups = Object.values(grouped);
      for (const g of groups) {
        g.stories.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      }
      return groups;
    },
  });

  useEffect(() => {
    if (isFetched && !isLoading && storyGroups.length === 0) {
      navigate('/app/social', { replace: true });
    }
  }, [isFetched, isLoading, storyGroups.length, navigate]);

  useEffect(() => {
    if (profileIdParam && storyGroups.length > 0) {
      const idx = storyGroups.findIndex((g: { user: { id: string } }) => g.user.id === profileIdParam);
      if (idx >= 0) setCurrentUserIdx(idx);
    }
  }, [profileIdParam, storyGroups]);

  const group = storyGroups[currentUserIdx] as { user: { id: string; username: string; avatarUrl: string }; stories: any[] } | undefined;
  const story = group?.stories?.[currentStoryIdx];
  const durationMs = useMemo(() => {
    const sec = typeof story?.duration === 'number' && story.duration > 0 ? story.duration : 5;
    return Math.min(60, Math.max(2, sec)) * 1000;
  }, [story?.duration]);

  const goNext = useCallback(() => {
    if (!group) return;
    if (currentStoryIdx < group.stories.length - 1) {
      setCurrentStoryIdx((i) => i + 1);
      setProgress(0);
    } else if (currentUserIdx < storyGroups.length - 1) {
      setCurrentUserIdx((i) => i + 1);
      setCurrentStoryIdx(0);
      setProgress(0);
    } else {
      navigate(-1);
    }
  }, [currentStoryIdx, currentUserIdx, group, storyGroups.length, navigate]);

  const goPrev = useCallback(() => {
    if (currentStoryIdx > 0) {
      setCurrentStoryIdx((i) => i - 1);
      setProgress(0);
    } else if (currentUserIdx > 0) {
      const prevGroup = storyGroups[currentUserIdx - 1] as { stories: any[] };
      setCurrentUserIdx((i) => i - 1);
      setCurrentStoryIdx(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [currentStoryIdx, currentUserIdx, storyGroups]);

  useEffect(() => {
    if (isPaused || !story) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 100 / (durationMs / 50);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPaused, currentStoryIdx, currentUserIdx, goNext, story, durationMs]);

  useEffect(() => {
    setProgress(0);
  }, [story?.id]);

  useEffect(() => {
    if (!story?.id || !customerUser?.id) return;
    http.post(`/social/stories/${story.id}/view`, {}).catch(() => {});
  }, [story?.id, customerUser?.id]);

  const handleReply = () => {
    if (replyText.trim()) {
      toast.success("Reply sent!");
      setReplyText("");
    }
  };

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  };

  const viewCount = story?.views_count ?? story?.view_count ?? 0;

  if (isLoading || !isFetched) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center text-white text-sm">
        Loading stories…
      </div>
    );
  }

  if (!story || !group) return null;

  const isVideo =
    story.media_type === 'video' ||
    (typeof story.media_url === 'string' && /\.(mp4|webm|mov)(\?|$)/i.test(story.media_url));
  const isAudio =
    story.media_type === 'audio' ||
    (typeof story.media_url === 'string' && /\.(mp3|wav|m4a|aac|ogg|opus|flac)(\?|$)/i.test(story.media_url));

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="relative w-full max-w-md h-full">
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {group.stories.map((s: { id: string }, i: number) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-75"
                style={{
                  width: i < currentStoryIdx ? '100%' : i === currentStoryIdx ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-6 left-3 right-3 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-8 w-8 border-2 border-white shrink-0">
              {group.user.avatarUrl ? (
                <AvatarImage src={group.user.avatarUrl} alt="" className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {group.user.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-white text-sm font-semibold truncate">{group.user.username}</span>
            <span className="text-white/60 text-xs shrink-0">{timeAgo(story.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => toast.info("More options")} className="p-1">
              <MoreHorizontal className="h-5 w-5 text-white" />
            </button>
            <button type="button" onClick={() => navigate(-1)} className="p-1">
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>

        {story.media_url ? (
          isAudio ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 pt-20 px-6">
              <audio
                src={story.media_url}
                className="w-full max-w-sm"
                controls
                autoPlay
                onPlay={() => setIsPaused(false)}
                onPause={() => setIsPaused(true)}
              />
              <p className="text-white/70 text-sm mt-4 text-center">Audio story</p>
            </div>
          ) : isVideo ? (
            <video
              src={story.media_url}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              onEnded={goNext}
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            />
          ) : (
            <img
              src={story.media_url}
              alt=""
              className="w-full h-full object-cover"
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            />
          )
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${story.background_color || 'bg-gradient-to-br from-purple-600 to-pink-500'}`}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            <p className="text-white text-2xl font-bold text-center px-8">{story.text_content}</p>
          </div>
        )}

        <button type="button" className="absolute left-0 top-0 w-1/3 h-full z-10" aria-label="Previous" onClick={goPrev} />
        <button type="button" className="absolute right-0 top-0 w-1/3 h-full z-10" aria-label="Next" onClick={goNext} />

        {story.text_content && story.media_url && !isAudio && (
          <div className="absolute bottom-20 left-4 right-4 z-20">
            <p className="text-white text-sm drop-shadow-lg">{story.text_content}</p>
          </div>
        )}

        <div className="absolute bottom-4 left-3 right-3 z-20 flex items-center gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply to story..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm h-9 rounded-full"
            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
          />
          <button type="button" onClick={() => toast.success("❤️")}>
            <Heart className="h-6 w-6 text-white" />
          </button>
          <button type="button" onClick={handleReply}>
            <Send className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="absolute bottom-20 right-4 z-20">
          <div className="flex items-center gap-1 text-white/60 text-xs">
            <Eye className="h-3.5 w-3.5" />
            <span>{viewCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
