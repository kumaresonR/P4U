import { z } from 'zod';

const mediaItemSchema = z.object({
  type: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  mediumUrl: z.string().url().optional(),
  blurPlaceholder: z.string().optional(),
  order: z.number().optional(),
});

export const createPostSchema = z
  .object({
    caption: z.string().max(2200).optional(),
    media_urls: z.array(z.string().url()).optional(),
    media: z.array(mediaItemSchema).optional(),
    post_type: z.enum(['photo', 'video', 'reel', 'story', 'carousel']).default('photo'),
    location: z.string().optional(),
    location_name: z.string().optional(),
    tags: z.array(z.string()).default([]),
  })
  .refine((d) => (d.media && d.media.length > 0) || (d.media_urls && d.media_urls.length > 0), {
    message: 'Provide media or media_urls',
    path: ['media'],
  });

export const createStorySchema = z
  .object({
    media_urls: z.array(z.string().url()).optional(),
    media_url: z.string().url().optional(),
    media_type: z.enum(['image', 'video', 'audio']).optional(),
    duration: z.number().min(2).max(60).optional(),
    items: z
      .array(
        z.object({
          media_url: z.string().url(),
          media_type: z.enum(['image', 'video', 'audio']).optional(),
          duration: z.number().min(2).max(60).optional(),
        }),
      )
      .optional(),
  })
  .refine(
    (d) =>
      (d.items && d.items.length > 0) ||
      (d.media_urls && d.media_urls.length > 0) ||
      !!d.media_url,
    { message: 'Provide items, media_urls, or media_url', path: ['media_urls'] },
  );

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
