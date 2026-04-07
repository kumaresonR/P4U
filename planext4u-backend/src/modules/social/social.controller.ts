import { Request, Response, NextFunction } from 'express';
import * as svc from './social.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthRequest } from '../../types';

export const getProfile      = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getProfile(req.params.id)); } catch (e) { next(e); } };
export const updateProfile   = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendSuccess(res, await svc.updateProfile(p.id, req.body)); } catch (e) { next(e); } };
export const myProfile       = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getOrCreateProfile(req.user!.id)); } catch (e) { next(e); } };

export const feed            = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); const r = await svc.getFeed(p.id, req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const explore         = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.getExploreFeed(req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };
export const getPost         = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getPost(req.params.id)); } catch (e) { next(e); } };
export const createPost      = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendCreated(res, await svc.createPost(p.id, req.body)); } catch (e) { next(e); } };
export const deletePost      = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deletePost(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

export const likePost        = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendSuccess(res, await svc.likePost(req.params.id, p.id)); } catch (e) { next(e); } };
export const getComments     = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getComments(req.params.id)); } catch (e) { next(e); } };
export const addComment      = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendCreated(res, await svc.addComment(req.params.id, p.id, req.body.content, req.body.parent_id)); } catch (e) { next(e); } };
export const deleteComment   = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteComment(req.params.commentId); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

export const followUser      = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendSuccess(res, await svc.followUser(p.id, req.params.id)); } catch (e) { next(e); } };
export const getFollowers    = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getFollowers(req.params.id)); } catch (e) { next(e); } };
export const getFollowing    = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getFollowing(req.params.id)); } catch (e) { next(e); } };

export const getStories      = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendSuccess(res, await svc.getActiveStories(p.id)); } catch (e) { next(e); } };
export const createStory     = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendCreated(res, await svc.createStory(p.id, req.body.media_urls)); } catch (e) { next(e); } };

export const getConversations = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendSuccess(res, await svc.getConversations(p.id)); } catch (e) { next(e); } };
export const getDMs           = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendSuccess(res, await svc.getMessages(p.id, req.params.profileId, req)); } catch (e) { next(e); } };
export const sendDM           = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendCreated(res, await svc.sendDM(p.id, req.params.profileId, req.body.message, req.body.media_url)); } catch (e) { next(e); } };

// Stories extras
export const viewStory       = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); await svc.viewStory(req.params.storyId, p.id); sendSuccess(res, null, 'Viewed'); } catch (e) { next(e); } };
export const deleteStory     = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteStory(req.params.storyId); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

// Bookmarks
export const toggleBookmark  = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendSuccess(res, await svc.toggleBookmark(req.params.id, p.id)); } catch (e) { next(e); } };
export const myBookmarks     = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendSuccess(res, await svc.getBookmarkedPosts(p.id)); } catch (e) { next(e); } };

// Comment likes
export const likeComment     = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendSuccess(res, await svc.toggleCommentLike(req.params.commentId, p.id)); } catch (e) { next(e); } };

// Hashtags
export const searchHashtags  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.searchHashtags(req.query.q as string || '')); } catch (e) { next(e); } };
export const hashtagPosts    = async (req: Request, res: Response, next: NextFunction) => { try { const r = await svc.getHashtagPosts(req.params.tag, req); sendPaginated(res, r.data, r.total, r.page, r.limit); } catch (e) { next(e); } };

// Highlights
export const getHighlights   = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getHighlights(req.params.id)); } catch (e) { next(e); } };
export const createHighlight = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendCreated(res, await svc.createHighlight(p.id, req.body.title, req.body.cover_image, req.body.story_ids)); } catch (e) { next(e); } };
export const updateHighlight = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.updateHighlight(req.params.id, req.body)); } catch (e) { next(e); } };
export const deleteHighlight = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteHighlight(req.params.id); sendSuccess(res, null, 'Deleted'); } catch (e) { next(e); } };

// Reports
export const reportContent   = async (req: AuthRequest, res: Response, next: NextFunction) => { try { const p = await svc.getOrCreateProfile(req.user!.id); sendCreated(res, await svc.reportContent(req.body.post_id, req.body.profile_id, p.id, req.body.reason, req.body.description)); } catch (e) { next(e); } };
