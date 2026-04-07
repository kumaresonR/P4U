import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { getPagination } from '../../utils/pagination';
import { Request } from 'express';

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
  const p = await prisma.socialProfile.findFirst({
    where: { OR: [{ id: identifier }, { username: identifier }] },
    include: { customer: { select: { name: true, avatar: true } } },
  });
  if (!p) throw new AppError('Profile not found', 404);
  return p;
};

export const updateProfile = (id: string, data: object) =>
  prisma.socialProfile.update({ where: { id }, data });

// ─── Posts ───────────────────────────────────────────────────────────────────

export const getFeed = async (profileId: string, req: Request) => {
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

export const getExploreFeed = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const [data, total] = await Promise.all([
    prisma.socialPost.findMany({
      where: { status: 'active' },
      skip, take: limit,
      include: { profile: { select: { username: true, avatar: true, is_verified: true } } },
      orderBy: { likes_count: 'desc' },
    }),
    prisma.socialPost.count({ where: { status: 'active' } }),
  ]);
  return { data, total, page, limit };
};

export const getPost = async (id: string) => {
  const p = await prisma.socialPost.findUnique({
    where: { id },
    include: { profile: { select: { username: true, avatar: true, is_verified: true } } },
  });
  if (!p) throw new AppError('Post not found', 404);
  await prisma.socialPost.update({ where: { id }, data: { views_count: { increment: 1 } } });
  return p;
};

export const createPost = (profileId: string, data: object) =>
  prisma.$transaction(async (tx) => {
    const post = await tx.socialPost.create({
      data: { profile_id: profileId, ...(data as object) } as Parameters<typeof prisma.socialPost.create>[0]['data'],
    });
    await tx.socialProfile.update({ where: { id: profileId }, data: { posts_count: { increment: 1 } } });
    return post;
  });

export const deletePost = (id: string) => prisma.socialPost.delete({ where: { id } });

// ─── Interactions ─────────────────────────────────────────────────────────────

export const likePost = async (postId: string, profileId: string) => {
  const existing = await prisma.socialLike.findUnique({
    where: { post_id_profile_id: { post_id: postId, profile_id: profileId } },
  });
  if (existing) {
    await prisma.$transaction([
      prisma.socialLike.delete({ where: { post_id_profile_id: { post_id: postId, profile_id: profileId } } }),
      prisma.socialPost.update({ where: { id: postId }, data: { likes_count: { decrement: 1 } } }),
    ]);
    return { liked: false };
  }
  await prisma.$transaction([
    prisma.socialLike.create({ data: { post_id: postId, profile_id: profileId } }),
    prisma.socialPost.update({ where: { id: postId }, data: { likes_count: { increment: 1 } } }),
  ]);
  return { liked: true };
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

export const createStory = (profileId: string, mediaUrls: string[]) => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // Create one story per media URL
  return prisma.$transaction(
    mediaUrls.map((url) =>
      prisma.socialStory.create({
        data: {
          profile_id: profileId,
          media_url: url,
          expires_at: expiresAt,
        },
      }),
    ),
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
  await prisma.socialStoryView.upsert({
    where: { story_id_viewer_id: { story_id: storyId, viewer_id: viewerId } },
    update: {},
    create: { story_id: storyId, viewer_id: viewerId },
  });
  await prisma.socialStory.update({ where: { id: storyId }, data: { views_count: { increment: 1 } } });
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
