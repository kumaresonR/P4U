import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { getPagination } from '../../utils/pagination';
import { Prisma } from '@prisma/client';
import { Request } from 'express';

// ─── Feed helpers: media_urls (DB) → media[] for clients ─────────────────────

function parseMediaFromDb(media_urls: unknown): Record<string, unknown>[] {
  if (media_urls == null) return [];
  let arr: unknown[] = [];
  if (Array.isArray(media_urls)) arr = media_urls;
  else if (typeof media_urls === 'string') {
    try {
      arr = JSON.parse(media_urls);
    } catch {
      return [];
    }
  } else return [];
  return arr.map((item: unknown, i: number) => {
    if (typeof item === 'string') {
      const u = item.toLowerCase();
      const type = /\.(mp4|webm|mov)(\?|$)/i.test(u) ? 'video' : 'image';
      return { type, url: item, order: i };
    }
    const o = item as Record<string, unknown>;
    const rawType = String(o.type || 'image');
    const type =
      rawType === 'photo'
        ? 'image'
        : rawType === 'carousel'
          ? 'image'
          : rawType === 'reel'
            ? 'video'
            : rawType;
    return {
      type,
      url: String(o.url ?? ''),
      thumbnailUrl: o.thumbnailUrl != null ? String(o.thumbnailUrl) : undefined,
      mediumUrl: o.mediumUrl != null ? String(o.mediumUrl) : undefined,
      order: o.order ?? i,
    };
  });
}

function enrichPost<T extends { media_urls?: unknown; profile?: { username?: string; avatar?: string | null } | null }>(p: T) {
  const media = parseMediaFromDb(p.media_urls);
  const prof = p.profile;
  return {
    ...p,
    media,
    profile: prof
      ? {
          ...prof,
          display_name: prof.username,
          avatar_url: prof.avatar,
        }
      : p.profile,
  };
}

async function attachViewerPostFlags<T extends { id: string }>(profileId: string, posts: T[]) {
  if (!posts.length) return posts;
  const ids = posts.map((p) => p.id);
  const [likes, bookmarks] = await Promise.all([
    prisma.socialLike.findMany({ where: { profile_id: profileId, post_id: { in: ids } }, select: { post_id: true } }),
    prisma.socialBookmark.findMany({ where: { profile_id: profileId, post_id: { in: ids } }, select: { post_id: true } }),
  ]);
  const liked = new Set(likes.map((l) => l.post_id));
  const bookmarked = new Set(bookmarks.map((b) => b.post_id));
  return posts.map((p) => ({
    ...p,
    is_liked_by_me: liked.has(p.id),
    is_bookmarked_by_me: bookmarked.has(p.id),
  }));
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export const getOrCreateProfile = async (customerId: string, username?: string) => {
  let profile = await prisma.socialProfile.findUnique({ where: { customer_id: customerId } });
  if (!profile) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { avatar: true, name: true } });
    const uname = username || `user_${customerId.slice(0, 8)}`;
    profile = await prisma.socialProfile.create({
      data: { customer_id: customerId, username: uname, avatar: customer?.avatar },
    });
  }
  return profile;
};

export const getProfile = async (identifier: string) => {
  const include = { customer: { select: { name: true, avatar: true } } } as const;
  let p = await prisma.socialProfile.findFirst({
    where: { OR: [{ id: identifier }, { username: identifier }] },
    include,
  });
  // Some clients pass customer user id — resolve to the linked social profile
  if (!p) {
    p = await prisma.socialProfile.findFirst({
      where: { customer_id: identifier },
      include,
    });
  }
  if (!p) throw new AppError('Profile not found', 404);
  return p;
};

export const updateProfile = (id: string, data: object) =>
  prisma.socialProfile.update({ where: { id }, data });

// ─── Posts ───────────────────────────────────────────────────────────────────

const getFollowingFeedPage = async (profileId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);

  const following = await prisma.socialFollow.findMany({
    where: { follower_id: profileId },
    select: { following_id: true },
  });
  const followingIds = following.map((f) => f.following_id);

  const [data, total] = await Promise.all([
    prisma.socialPost.findMany({
      where: { profile_id: { in: [...followingIds, profileId] }, status: 'active' },
      skip, take: limit,
      include: { profile: { select: { id: true, username: true, avatar: true, is_verified: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.socialPost.count({ where: { profile_id: { in: [...followingIds, profileId] }, status: 'active' } }),
  ]);
  return { data, total, page, limit };
};

/** `mode=following` = people you follow; `mode=for_you` = explore (public discovery). */
export const getFeed = async (profileId: string, req: Request) => {
  const mode = String((req.query as Record<string, string>).mode || 'following');
  if (mode === 'for_you') {
    const r = await getExploreFeed(req);
    return { ...r, data: await attachViewerPostFlags(profileId, r.data as { id: string }[]) };
  }
  const raw = await getFollowingFeedPage(profileId, req);
  const enriched = raw.data.map((p) => enrichPost(p));
  return { ...raw, data: await attachViewerPostFlags(profileId, enriched as { id: string }[]) };
};

export const getExploreFeed = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [rows, total] = await Promise.all([
    prisma.socialPost.findMany({
      where: { status: 'active' },
      skip, take: limit,
      include: { profile: { select: { id: true, username: true, avatar: true, is_verified: true } } },
      orderBy: { likes_count: 'desc' },
    }),
    prisma.socialPost.count({ where: { status: 'active' } }),
  ]);
  const data = rows.map((p) => enrichPost(p));
  return { data, total, page, limit };
};

export const getPost = async (id: string) => {
  const p = await prisma.socialPost.findUnique({
    where: { id },
    include: { profile: { select: { id: true, username: true, avatar: true, is_verified: true } } },
  });
  if (!p) throw new AppError('Post not found', 404);
  await prisma.socialPost.update({ where: { id }, data: { views_count: { increment: 1 } } });
  return enrichPost(p);
};

function normalizePostCreateBody(body: Record<string, unknown>) {
  let media_urls: Prisma.InputJsonValue = [];
  if (Array.isArray(body.media) && body.media.length) {
    const mediaArr = body.media as Record<string, unknown>[];
    media_urls = mediaArr.map((m, i) => ({
      type: m.type === 'photo' ? 'image' : m.type,
      url: m.url != null && m.url !== '' ? String(m.url) : undefined,
      thumbnailUrl: m.thumbnailUrl != null && m.thumbnailUrl !== '' ? String(m.thumbnailUrl) : undefined,
      mediumUrl: m.mediumUrl != null && m.mediumUrl !== '' ? String(m.mediumUrl) : undefined,
      order: m.order ?? i,
    })) as Prisma.InputJsonValue;
  } else if (Array.isArray(body.media_urls) && body.media_urls.length) {
    media_urls = body.media_urls as Prisma.InputJsonValue;
  }
  if (!Array.isArray(media_urls) || media_urls.length === 0) {
    throw new AppError('At least one image or video is required', 400);
  }
  let post_type = String(body.post_type || 'photo');
  if (post_type === 'carousel') post_type = 'photo';
  if (!['photo', 'video', 'reel', 'story'].includes(post_type)) post_type = 'photo';
  const caption = body.caption != null ? String(body.caption).slice(0, 2200) : '';
  const location = (body.location_name || body.location) as string | undefined;
  return {
    caption,
    media_urls,
    post_type,
    location: location || null,
    status: 'active',
  };
}

export const createPost = (profileId: string, body: Record<string, unknown>) =>
  prisma.$transaction(async (tx) => {
    const clean = normalizePostCreateBody(body);
    const post = await tx.socialPost.create({
      data: {
        profile_id: profileId,
        caption: clean.caption,
        media_urls: clean.media_urls,
        post_type: clean.post_type,
        location: clean.location,
        status: clean.status,
      },
    });
    await tx.socialProfile.update({ where: { id: profileId }, data: { posts_count: { increment: 1 } } });
    return post;
  });

export const deletePost = (id: string) => prisma.socialPost.delete({ where: { id } });

// ─── Interactions ─────────────────────────────────────────────────────────────

const SOCIAL_LIKE_POINTS_TYPE = 'social_post_like_received';

export const likePost = async (postId: string, likerProfileId: string) => {
  const pointsPerLike = env.SOCIAL_LIKE_RECEIVER_POINTS;

  const existing = await prisma.socialLike.findUnique({
    where: { post_id_profile_id: { post_id: postId, profile_id: likerProfileId } },
  });

  const postWithOwner = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: { profile: { select: { customer_id: true } } },
  });
  if (!postWithOwner) throw new AppError('Post not found', 404);
  const ownerCustomerId = postWithOwner.profile.customer_id;

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.socialLike.delete({ where: { post_id_profile_id: { post_id: postId, profile_id: likerProfileId } } });
      await tx.socialPost.update({ where: { id: postId }, data: { likes_count: { decrement: 1 } } });

      const rewardTx = await tx.pointsTransaction.findFirst({
        where: {
          user_id: ownerCustomerId,
          type: SOCIAL_LIKE_POINTS_TYPE,
          social_post_id: postId,
          social_liker_profile_id: likerProfileId,
        },
      });
      if (rewardTx && rewardTx.points > 0) {
        const owner = await tx.customer.findUnique({
          where: { id: ownerCustomerId },
          select: { wallet_points: true },
        });
        const dec = Math.min(rewardTx.points, owner?.wallet_points ?? 0);
        if (dec > 0) {
          await tx.customer.update({
            where: { id: ownerCustomerId },
            data: { wallet_points: { decrement: dec } },
          });
        }
        await tx.pointsTransaction.delete({ where: { id: rewardTx.id } });
      }
    });
    return { liked: false };
  }

  const liker = await prisma.socialProfile.findUnique({
    where: { id: likerProfileId },
    select: { customer_id: true },
  });
  if (!liker) throw new AppError('Profile not found', 404);

  const isSelfLike = liker.customer_id === ownerCustomerId;

  await prisma.$transaction(async (tx) => {
    await tx.socialLike.create({ data: { post_id: postId, profile_id: likerProfileId } });
    await tx.socialPost.update({ where: { id: postId }, data: { likes_count: { increment: 1 } } });

    if (!isSelfLike && pointsPerLike > 0) {
      await tx.customer.update({
        where: { id: ownerCustomerId },
        data: { wallet_points: { increment: pointsPerLike } },
      });
      await tx.pointsTransaction.create({
        data: {
          user_id: ownerCustomerId,
          type: SOCIAL_LIKE_POINTS_TYPE,
          points: pointsPerLike,
          description: 'Someone liked your post',
          social_post_id: postId,
          social_liker_profile_id: likerProfileId,
        },
      });
    }
  });

  return { liked: true, points_awarded_to_owner: !isSelfLike && pointsPerLike > 0 ? pointsPerLike : 0 };
};

export const getComments = (postId: string) =>
  prisma.socialComment.findMany({
    where: { post_id: postId, parent_id: null },
    include: { replies: true },
    orderBy: { created_at: 'asc' },
  });

export const addComment = async (postId: string, profileId: string, content: string, parentId?: string) => {
  const comment = await prisma.socialComment.create({
    data: { post_id: postId, profile_id: profileId, content, parent_id: parentId },
  });
  await prisma.socialPost.update({ where: { id: postId }, data: { comments_count: { increment: 1 } } });
  return comment;
};

export const deleteComment = (id: string) => prisma.socialComment.delete({ where: { id } });

// ─── Follows ─────────────────────────────────────────────────────────────────

export const followUser = async (followerId: string, followingId: string) => {
  if (followerId === followingId) throw new AppError('Cannot follow yourself', 400);
  const existing = await prisma.socialFollow.findUnique({
    where: { follower_id_following_id: { follower_id: followerId, following_id: followingId } },
  });
  if (existing) {
    await prisma.$transaction([
      prisma.socialFollow.delete({ where: { follower_id_following_id: { follower_id: followerId, following_id: followingId } } }),
      prisma.socialProfile.update({ where: { id: followerId }, data: { following_count: { decrement: 1 } } }),
      prisma.socialProfile.update({ where: { id: followingId }, data: { followers_count: { decrement: 1 } } }),
    ]);
    return { following: false };
  }
  await prisma.$transaction([
    prisma.socialFollow.create({ data: { follower_id: followerId, following_id: followingId } }),
    prisma.socialProfile.update({ where: { id: followerId }, data: { following_count: { increment: 1 } } }),
    prisma.socialProfile.update({ where: { id: followingId }, data: { followers_count: { increment: 1 } } }),
  ]);
  return { following: true };
};

export const getFollowers = (profileId: string) =>
  prisma.socialFollow.findMany({
    where: { following_id: profileId },
    include: { follower: { select: { username: true, avatar: true, is_verified: true } } },
  });

export const getFollowing = (profileId: string) =>
  prisma.socialFollow.findMany({
    where: { follower_id: profileId },
    include: { following: { select: { username: true, avatar: true, is_verified: true } } },
  });

// ─── Stories ─────────────────────────────────────────────────────────────────

export const getActiveStories = async (profileId: string) => {
  const following = await prisma.socialFollow.findMany({
    where: { follower_id: profileId },
    select: { following_id: true },
  });
  const ids = following.map((f) => f.following_id);
  const now = new Date();
  return prisma.socialStory.findMany({
    where: { profile_id: { in: [...ids, profileId] }, expires_at: { gt: now } },
    include: { profile: { select: { username: true, avatar: true } } },
    orderBy: { created_at: 'desc' },
  });
};

export type StoryItemInput = { media_url: string; media_type?: string; duration?: number };

function inferStoryMediaType(mediaType: string | undefined, url: string): string {
  const mt = (mediaType || '').toLowerCase();
  if (mt === 'video' || mt === 'audio' || mt === 'image') return mt;
  const u = url.toLowerCase();
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return 'video';
  if (/\.(mp3|wav|m4a|aac|ogg|opus|flac)(\?|$)/i.test(u)) return 'audio';
  return 'image';
}

function storyDurationSeconds(mediaType: string, duration?: number): number {
  const d = duration && duration > 0 ? Math.round(duration) : 0;
  if (d >= 2 && d <= 60) return d;
  if (mediaType === 'video') return 15;
  if (mediaType === 'audio') return 30;
  return 5;
}

export function parseStoryItemsFromBody(body: Record<string, unknown>): StoryItemInput[] {
  if (Array.isArray(body.items) && body.items.length) {
    return (body.items as Record<string, unknown>[])
      .map((it) => ({
        media_url: String(it.media_url || ''),
        media_type: it.media_type != null ? String(it.media_type) : undefined,
        duration: typeof it.duration === 'number' ? it.duration : it.duration != null ? Number(it.duration) : undefined,
      }))
      .filter((x) => x.media_url.length > 0);
  }
  const urls = (Array.isArray(body.media_urls) ? body.media_urls : body.media_url ? [body.media_url] : []) as string[];
  const mt = body.media_type != null ? String(body.media_type) : undefined;
  const dur = typeof body.duration === 'number' ? body.duration : body.duration != null ? Number(body.duration) : undefined;
  return urls.map((url) => ({ media_url: String(url), media_type: mt, duration: dur }));
}

export const createStoryFromBody = (profileId: string, body: Record<string, unknown>) =>
  createStory(profileId, parseStoryItemsFromBody(body));

/** Each item becomes one 24h story (Instagram-style). Server sets expires_at. */
export const createStory = (profileId: string, items: StoryItemInput[]) => {
  if (!items.length) throw new AppError('Story media required', 400);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return prisma.$transaction(
    items.map((item) => {
      const media_type = inferStoryMediaType(item.media_type, item.media_url);
      const duration = storyDurationSeconds(media_type, item.duration);
      return prisma.socialStory.create({
        data: {
          profile_id: profileId,
          media_url: item.media_url,
          media_type,
          duration,
          expires_at: expiresAt,
        },
      });
    }),
  );
};

// ─── DMs (Conversations + Messages) ─────────────────────────────────────────

export const getConversations = async (profileId: string) => {
  return prisma.socialConversation.findMany({
    where: { OR: [{ participant1: profileId }, { participant2: profileId }] },
    include: {
      messages: {
        take: 1,
        orderBy: { created_at: 'desc' },
        include: { sender: { select: { username: true, avatar: true } } },
      },
    },
    orderBy: { last_msg_at: 'desc' },
  });
};

export const getMessages = async (profileId: string, otherProfileId: string, req: Request) => {
  const { skip, limit } = getPagination(req);
  const conv = await prisma.socialConversation.findFirst({
    where: {
      OR: [
        { participant1: profileId, participant2: otherProfileId },
        { participant1: otherProfileId, participant2: profileId },
      ],
    },
  });
  if (!conv) return { data: [], total: 0 };

  const [data, total] = await Promise.all([
    prisma.socialMessage.findMany({
      where: { conversation_id: conv.id },
      skip, take: limit,
      include: { sender: { select: { username: true, avatar: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.socialMessage.count({ where: { conversation_id: conv.id } }),
  ]);
  return { data, total };
};

// ─── Story Views ──────────────────────────────────────────────────────────────

export const viewStory = async (storyId: string, viewerId: string) => {
  try {
    await prisma.socialStoryView.create({
      data: { story_id: storyId, viewer_id: viewerId },
    });
    await prisma.socialStory.update({ where: { id: storyId }, data: { views_count: { increment: 1 } } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: true, already_viewed: true };
    }
    throw e;
  }
  return { ok: true, already_viewed: false };
};

export const deleteStory = (storyId: string) =>
  prisma.socialStory.delete({ where: { id: storyId } });

// ─── Post Bookmarks ───────────────────────────────────────────────────────────

export const toggleBookmark = async (postId: string, profileId: string) => {
  const existing = await prisma.socialBookmark.findUnique({
    where: { profile_id_post_id: { profile_id: profileId, post_id: postId } },
  });
  if (existing) {
    await prisma.socialBookmark.delete({ where: { profile_id_post_id: { profile_id: profileId, post_id: postId } } });
    return { bookmarked: false };
  }
  await prisma.socialBookmark.create({ data: { profile_id: profileId, post_id: postId } });
  return { bookmarked: true };
};

export const getBookmarkedPosts = (profileId: string) =>
  prisma.socialBookmark.findMany({
    where: { profile_id: profileId },
    include: { post: { include: { profile: { select: { username: true, avatar: true } } } } },
    orderBy: { created_at: 'desc' },
  });

// ─── Comment Likes ────────────────────────────────────────────────────────────

export const toggleCommentLike = async (commentId: string, profileId: string) => {
  const existing = await prisma.socialCommentLike.findUnique({
    where: { comment_id_profile_id: { comment_id: commentId, profile_id: profileId } },
  });
  if (existing) {
    await prisma.$transaction([
      prisma.socialCommentLike.delete({ where: { comment_id_profile_id: { comment_id: commentId, profile_id: profileId } } }),
      prisma.socialComment.update({ where: { id: commentId }, data: { likes_count: { decrement: 1 } } }),
    ]);
    return { liked: false };
  }
  await prisma.$transaction([
    prisma.socialCommentLike.create({ data: { comment_id: commentId, profile_id: profileId } }),
    prisma.socialComment.update({ where: { id: commentId }, data: { likes_count: { increment: 1 } } }),
  ]);
  return { liked: true };
};

// ─── Hashtags ─────────────────────────────────────────────────────────────────

export const searchHashtags = (query: string) =>
  prisma.socialHashtag.findMany({
    where: { tag: { contains: query, mode: 'insensitive' } },
    orderBy: { posts_count: 'desc' },
    take: 20,
  });

export const getHashtagPosts = async (tag: string, req: Request) => {
  const { skip, limit, page } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.socialPost.findMany({
      where: { hashtags: { array_contains: tag }, status: 'active' },
      skip, take: limit,
      include: { profile: { select: { username: true, avatar: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.socialPost.count({ where: { hashtags: { array_contains: tag }, status: 'active' } }),
  ]);
  return { data, total, page, limit };
};

// ─── Highlights ───────────────────────────────────────────────────────────────

export const getHighlights = (profileId: string) =>
  prisma.socialHighlight.findMany({
    where: { profile_id: profileId },
    orderBy: { created_at: 'desc' },
  });

export const createHighlight = (profileId: string, title: string, coverImage?: string, storyIds?: string[]) =>
  prisma.socialHighlight.create({
    data: { profile_id: profileId, title, cover_image: coverImage, story_ids: storyIds || [] },
  });

export const updateHighlight = (id: string, data: object) =>
  prisma.socialHighlight.update({ where: { id }, data });

export const deleteHighlight = (id: string) =>
  prisma.socialHighlight.delete({ where: { id } });

// ─── Reports ─────────────────────────────────────────────────────────────────

export const reportContent = (postId: string | undefined, profileId: string | undefined, reporterId: string, reason: string, description?: string) =>
  prisma.socialReport.create({
    data: { post_id: postId, profile_id: profileId, reporter_id: reporterId, reason, description },
  });

// ─── Web client helpers (liked / bookmark / follow checks) ───────────────────

export const isPostLikedByProfile = async (postId: string, profileId: string) => {
  const row = await prisma.socialLike.findUnique({
    where: { post_id_profile_id: { post_id: postId, profile_id: profileId } },
  });
  return { liked: !!row };
};

export const isPostBookmarkedByProfile = async (postId: string, profileId: string) => {
  const row = await prisma.socialBookmark.findUnique({
    where: { profile_id_post_id: { profile_id: profileId, post_id: postId } },
  });
  return { bookmarked: !!row };
};

export const removeBookmark = async (postId: string, profileId: string) => {
  const existing = await prisma.socialBookmark.findUnique({
    where: { profile_id_post_id: { profile_id: profileId, post_id: postId } },
  });
  if (!existing) return { bookmarked: false };
  await prisma.socialBookmark.delete({
    where: { profile_id_post_id: { profile_id: profileId, post_id: postId } },
  });
  return { bookmarked: false };
};

export const resolveProfileId = async (identifier: string) => {
  const p = await prisma.socialProfile.findFirst({
    where: { OR: [{ id: identifier }, { username: identifier }, { customer_id: identifier }] },
    select: { id: true },
  });
  return p?.id ?? null;
};

export const isFollowingProfile = async (followerProfileId: string, targetIdentifier: string) => {
  const targetId = await resolveProfileId(targetIdentifier);
  if (!targetId) return { following: false };
  const row = await prisma.socialFollow.findUnique({
    where: { follower_id_following_id: { follower_id: followerProfileId, following_id: targetId } },
  });
  return { following: !!row };
};

export const removeFollow = async (followerProfileId: string, targetIdentifier: string) => {
  const targetId = await resolveProfileId(targetIdentifier);
  if (!targetId) return { following: false };
  const existing = await prisma.socialFollow.findUnique({
    where: { follower_id_following_id: { follower_id: followerProfileId, following_id: targetId } },
  });
  if (!existing) return { following: false };
  await prisma.$transaction([
    prisma.socialFollow.delete({
      where: { follower_id_following_id: { follower_id: followerProfileId, following_id: targetId } },
    }),
    prisma.socialProfile.update({ where: { id: followerProfileId }, data: { following_count: { decrement: 1 } } }),
    prisma.socialProfile.update({ where: { id: targetId }, data: { followers_count: { decrement: 1 } } }),
  ]);
  return { following: false };
};

export const searchSocialUsers = (query: string, limit = 10) =>
  prisma.socialProfile.findMany({
    where: { username: { contains: query, mode: 'insensitive' } },
    take: Math.min(20, limit),
    select: { id: true, username: true, avatar: true, is_verified: true },
  });

// ─── DMs (Conversations + Messages) ─────────────────────────────────────────

export const sendDM = async (senderId: string, receiverId: string, message: string, mediaUrl?: string) => {
  // Find or create conversation
  let conv = await prisma.socialConversation.findFirst({
    where: {
      OR: [
        { participant1: senderId, participant2: receiverId },
        { participant1: receiverId, participant2: senderId },
      ],
    },
  });

  if (!conv) {
    conv = await prisma.socialConversation.create({
      data: { participant1: senderId, participant2: receiverId },
    });
  }

  const [msg] = await prisma.$transaction([
    prisma.socialMessage.create({
      data: {
        conversation_id: conv.id,
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        media_url: mediaUrl,
      },
    }),
    prisma.socialConversation.update({
      where: { id: conv.id },
      data: { last_message: message, last_msg_at: new Date() },
    }),
  ]);

  return msg;
};

/** Web client: resolve recipient (profile id / username / customer id) and ensure a conversation row exists. */
export const findOrCreateConversationForUser = async (myProfileId: string, recipientIdentifier: string) => {
  const otherId = await resolveProfileId(recipientIdentifier);
  if (!otherId) throw new AppError('Recipient not found', 404);
  if (myProfileId === otherId) throw new AppError('Cannot message yourself', 400);
  let conv = await prisma.socialConversation.findFirst({
    where: {
      OR: [
        { participant1: myProfileId, participant2: otherId },
        { participant1: otherId, participant2: myProfileId },
      ],
    },
  });
  if (!conv) {
    conv = await prisma.socialConversation.create({
      data: { participant1: myProfileId, participant2: otherId },
    });
  }
  return { id: conv.id, conversation_id: conv.id };
};

export const listConversationMessages = async (conversationId: string, myProfileId: string, req: Request) => {
  const conv = await prisma.socialConversation.findUnique({ where: { id: conversationId } });
  if (!conv) throw new AppError('Conversation not found', 404);
  if (conv.participant1 !== myProfileId && conv.participant2 !== myProfileId) {
    throw new AppError('Forbidden', 403);
  }
  const { skip, limit } = getPagination(req);
  const [rows, total] = await Promise.all([
    prisma.socialMessage.findMany({
      where: { conversation_id: conversationId },
      skip,
      take: limit,
      orderBy: { created_at: 'asc' },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    }),
    prisma.socialMessage.count({ where: { conversation_id: conversationId } }),
  ]);
  const data = rows.map((m) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    content: m.message,
    message_type: 'text',
    media_url: m.media_url,
    is_read: m.is_read,
    created_at: m.created_at,
  }));
  return { data, total };
};

export const markConversationMessagesRead = async (conversationId: string, readerProfileId: string) => {
  const conv = await prisma.socialConversation.findUnique({ where: { id: conversationId } });
  if (!conv) throw new AppError('Conversation not found', 404);
  if (conv.participant1 !== readerProfileId && conv.participant2 !== readerProfileId) {
    throw new AppError('Forbidden', 403);
  }
  await prisma.socialMessage.updateMany({
    where: {
      conversation_id: conversationId,
      receiver_id: readerProfileId,
      is_read: false,
    },
    data: { is_read: true },
  });
  return { ok: true };
};

export const sendConversationMessage = async (
  conversationId: string,
  senderProfileId: string,
  body: { content?: string; message_type?: string; media_url?: string | null },
) => {
  const text = (body.content ?? '').trim();
  if (!text && !body.media_url) throw new AppError('Message is empty', 400);
  const conv = await prisma.socialConversation.findUnique({ where: { id: conversationId } });
  if (!conv) throw new AppError('Conversation not found', 404);
  const isP1 = conv.participant1 === senderProfileId;
  const isP2 = conv.participant2 === senderProfileId;
  if (!isP1 && !isP2) throw new AppError('Forbidden', 403);
  const receiverId = isP1 ? conv.participant2 : conv.participant1;
  const message = text || (body.media_url ? '[media]' : '');

  const [msg] = await prisma.$transaction([
    prisma.socialMessage.create({
      data: {
        conversation_id: conv.id,
        sender_id: senderProfileId,
        receiver_id: receiverId,
        message,
        media_url: body.media_url || undefined,
      },
    }),
    prisma.socialConversation.update({
      where: { id: conv.id },
      data: { last_message: message, last_msg_at: new Date() },
    }),
  ]);
  return {
    id: msg.id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    content: msg.message,
    message_type: body.message_type || 'text',
    media_url: msg.media_url,
    is_read: msg.is_read,
    created_at: msg.created_at,
  };
};

export const repostPost = async (postId: string) => {
  try {
    const updated = await prisma.socialPost.update({
      where: { id: postId },
      data: { shares_count: { increment: 1 } },
    });
    return { ok: true, shares_count: updated.shares_count };
  } catch {
    throw new AppError('Post not found', 404);
  }
};

// ─── Admin dashboard ─────────────────────────────────────────────────────────

export const adminListSocialProfilesForDashboard = () =>
  prisma.socialProfile.findMany({
    orderBy: { created_at: 'desc' },
    take: 100,
    include: { customer: { select: { name: true } } },
  });

export const adminToggleSocialProfileVerified = async (id: string) => {
  const p = await prisma.socialProfile.findUnique({ where: { id } });
  if (!p) throw new AppError('Not found', 404);
  return prisma.socialProfile.update({ where: { id }, data: { is_verified: !p.is_verified } });
};

export const adminListSocialPostsForDashboard = () =>
  prisma.socialPost.findMany({
    orderBy: { created_at: 'desc' },
    take: 100,
    include: { profile: { select: { username: true } } },
  });

export const adminSetSocialPostStatus = (id: string, status: string) =>
  prisma.socialPost.update({ where: { id }, data: { status } });

export const adminListSocialHashtagsForDashboard = () =>
  prisma.socialHashtag.findMany({ orderBy: { posts_count: 'desc' }, take: 50 });

export const adminListSocialAudioForDashboard = () =>
  prisma.socialAudio.findMany({ orderBy: { uses_count: 'desc' }, take: 50 });
