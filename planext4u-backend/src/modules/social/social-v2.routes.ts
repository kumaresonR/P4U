/**
 * Social routes remapped to the paths expected by the user-web frontend.
 * Mounted at /api/v1/social (alongside existing social.routes).
 * These are thin wrappers that reuse the same service functions.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { isCustomer } from '../../middleware/rbac';
import { AuthRequest } from '../../types';
import * as svc from './social.service';

const router = Router();

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

// ─── Posts ────────────────────────────────────────────────────────────────────

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

router.post('/stories', authenticate, isCustomer, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    const mediaUrls: string[] = req.body.media_urls || (req.body.media_url ? [req.body.media_url] : []);
    sendCreated(res, await svc.createStory(profile.id, mediaUrls));
  } catch (e) { next(e); }
});

router.post('/stories/:id/view', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await svc.getOrCreateProfile(req.user!.id);
    sendSuccess(res, await svc.viewStory(req.params.id, profile.id));
  } catch (e) { next(e); }
});

export default router;
