/**
 * Social routes remapped to the paths expected by the user-web frontend.
 * Mounted at /api/v1/social (alongside existing social.routes).
 * These are thin wrappers that reuse the same service functions.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { isAdmin, isCustomer } from '../../middleware/rbac';
import { AuthRequest } from '../../types';
import { AppError } from '../../middleware/errorHandler';
import * as svc from './social.service';

const router = Router();

// ─── Admin (before /posts/:id etc.) ──────────────────────────────────────────

router.get('/admin/profiles', authenticate, isAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.adminListSocialProfilesForDashboard()); } catch (e) { next(e); }
});

router.patch('/admin/profiles/:id/verified', authenticate, isAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.adminToggleSocialProfileVerified(req.params.id)); } catch (e) { next(e); }
});

router.get('/admin/posts', authenticate, isAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.adminListSocialPostsForDashboard()); } catch (e) { next(e); }
});

router.patch('/admin/posts/:id/status', authenticate, isAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.adminSetSocialPostStatus(req.params.id, req.body.status)); } catch (e) { next(e); }
});

router.get('/admin/hashtags', authenticate, isAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.adminListSocialHashtagsForDashboard()); } catch (e) { next(e); }
});

router.get('/admin/audio', authenticate, isAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.adminListSocialAudioForDashboard()); } catch (e) { next(e); }
});

// ─── Feed ─────────────────────────────────────────────────────────────────────

router.get('/feed', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.getFeed(profile.id, req));
  } catch (e) { next(e); }
});

router.get('/feed/public', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getExploreFeed(req)); } catch (e) { next(e); }
});

// ─── Search & recent (web UI) ────────────────────────────────────────────────

router.get('/search/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(20, parseInt(String(req.query.limit), 10) || 10);
    if (!q) return sendSuccess(res, []);
    sendSuccess(res, await svc.searchSocialUsers(q, limit));
  } catch (e) { next(e); }
});

router.get('/search/hashtags', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.searchHashtags(req.query.q as string || '')); } catch (e) { next(e); }
});

router.get('/recent-searches', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, []); } catch (e) { next(e); }
});

router.post('/recent-searches', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, null, 'OK'); } catch (e) { next(e); }
});

router.delete('/recent-searches', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, null, 'OK'); } catch (e) { next(e); }
});

router.delete('/recent-searches/:id', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, null, 'OK'); } catch (e) { next(e); }
});

// ─── DM conversations (web Socio chat) — static paths before /conversations/:id ─

router.post('/conversations/find-or-create', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    const recipientId = String(req.body?.recipient_id || '').trim();
    if (!recipientId) throw new AppError('recipient_id required', 400);
    sendSuccess(res, await svc.findOrCreateConversationForUser(profile.id, recipientId));
  } catch (e) { next(e); }
});

router.get('/conversations/:id/messages', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    const r = await svc.listConversationMessages(req.params.id, profile.id, req);
    sendSuccess(res, r.data);
  } catch (e) { next(e); }
});

router.patch('/conversations/:id/messages/read', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.markConversationMessagesRead(req.params.id, profile.id));
  } catch (e) { next(e); }
});

router.post('/conversations/:id/messages', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendCreated(res, await svc.sendConversationMessage(req.params.id, profile.id, req.body));
  } catch (e) { next(e); }
});

// ─── Posts ────────────────────────────────────────────────────────────────────

router.get('/posts/:id/liked', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const p = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.isPostLikedByProfile(req.params.id, p.id));
  } catch (e) { next(e); }
});

router.get('/posts/:id/bookmarked', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const p = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.isPostBookmarkedByProfile(req.params.id, p.id));
  } catch (e) { next(e); }
});

router.delete('/posts/:id/bookmark', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const p = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.removeBookmark(req.params.id, p.id));
  } catch (e) { next(e); }
});

router.get('/posts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getPost(req.params.id)); } catch (e) { next(e); }
});

router.post('/posts', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendCreated(res, await svc.createPost(profile.id, req.body));
  } catch (e) { next(e); }
});

router.delete('/posts/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await svc.deletePost(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); }
});

// POST = like, DELETE = unlike (toggle)
router.post('/posts/:id/like', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.likePost(req.params.id, profile.id));
  } catch (e) { next(e); }
});

router.delete('/posts/:id/like', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.likePost(req.params.id, profile.id)); // toggle
  } catch (e) { next(e); }
});

router.post('/posts/:id/repost', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.repostPost(req.params.id)); } catch (e) { next(e); }
});

// ─── Comments ─────────────────────────────────────────────────────────────────

router.get('/posts/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getComments(req.params.id)); } catch (e) { next(e); }
});

router.post('/posts/:id/comments', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendCreated(res, await svc.addComment(req.params.id, profile.id, req.body.content, req.body.parent_id));
  } catch (e) { next(e); }
});

// ─── Profiles (follow helpers for web — same paths as legacy) ────────────────

router.get('/profiles/:id/is-following', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const p = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.isFollowingProfile(p.id, req.params.id));
  } catch (e) { next(e); }
});

router.delete('/profiles/:id/follow', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const p = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.removeFollow(p.id, req.params.id));
  } catch (e) { next(e); }
});

// ─── Follows ──────────────────────────────────────────────────────────────────

router.post('/users/:id/follow', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.followUser(profile.id, req.params.id));
  } catch (e) { next(e); }
});

router.delete('/users/:id/follow', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.followUser(profile.id, req.params.id)); // toggle
  } catch (e) { next(e); }
});

router.get('/users/:id/followers', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getFollowers(req.params.id)); } catch (e) { next(e); }
});

router.get('/users/:id/following', async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await svc.getFollowing(req.params.id)); } catch (e) { next(e); }
});

router.get('/users/suggestions', async (_req: Request, res: Response) => {
  sendSuccess(res, []);
});

// ─── Stories ──────────────────────────────────────────────────────────────────

router.get('/stories/feed', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.getActiveStories(profile.id));
  } catch (e) { next(e); }
});

router.get('/stories/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.getActiveStories(profile.id));
  } catch (e) { next(e); }
});

router.get('/stories/mine', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.getActiveStories(profile.id));
  } catch (e) { next(e); }
});

router.post('/stories', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendCreated(res, await svc.createStoryFromBody(profile.id, req.body as Record<string, unknown>));
  } catch (e) { next(e); }
});

router.post('/stories/:id/view', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.viewStory(req.params.id, profile.id));
  } catch (e) { next(e); }
});

export default router;
