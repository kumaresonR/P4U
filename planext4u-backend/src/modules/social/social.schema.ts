import { z } from 'zod';

export const createPostSchema = z.object({
  caption: z.string().max(2200).optional(),
  media_urls: z.array(z.string().url()).min(1),
  post_type: z.enum(['photo', 'video', 'reel', 'story']).default('photo'),
  location: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const createStorySchema = z.object({
  media_urls: z.array(z.string().url()).min(1),
});

export const addCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parent_id: z.string().uuid().optional(),
});

export const sendDMSchema = z.object({
  message: z.string().min(1).max(2000),
  media_url: z.string().url().optional(),
});

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/).optional(),
  bio: z.string().max(150).optional(),
  website: z.string().url().optional(),
  avatar: z.string().url().optional(),
  cover_image: z.string().url().optional(),
});

export const reportSchema = z.object({
  post_id: z.string().uuid().optional(),
  profile_id: z.string().uuid().optional(),
  reason: z.string().min(2).max(200),
  description: z.string().optional(),
});

export const createHighlightSchema = z.object({
  title: z.string().min(1).max(100),
  cover_image: z.string().url().optional(),
  story_ids: z.array(z.string().uuid()).default([]),
});
