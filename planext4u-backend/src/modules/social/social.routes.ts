import { Router } from 'express';
import * as ctrl from './social.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createPostSchema, createStorySchema, addCommentSchema,
  sendDMSchema, updateProfileSchema, reportSchema, createHighlightSchema,
} from './social.schema';

const router = Router();

// Profile
router.get('/profiles/me',            authenticate, ctrl.myProfile);
router.put('/profiles/me',            authenticate, validate(updateProfileSchema), ctrl.updateProfile);
router.get('/profiles/:id',           optionalAuth, ctrl.getProfile);
router.post('/profiles/:id/follow',   authenticate, ctrl.followUser);
router.get('/profiles/:id/followers', ctrl.getFollowers);
router.get('/profiles/:id/following', ctrl.getFollowing);
router.get('/profiles/:id/highlights', ctrl.getHighlights);

// Feed & posts
router.get('/feed',            authenticate, ctrl.feed);
router.get('/explore',         optionalAuth,  ctrl.explore);
router.get('/posts/:id',       optionalAuth,  ctrl.getPost);
router.post('/posts',          authenticate, validate(createPostSchema), ctrl.createPost);
router.delete('/posts/:id',    authenticate, ctrl.deletePost);

// Post interactions
router.post('/posts/:id/like',                    authenticate, ctrl.likePost);
router.post('/posts/:id/bookmark',                authenticate, ctrl.toggleBookmark);
router.get('/posts/:id/comments',                 optionalAuth, ctrl.getComments);
router.post('/posts/:id/comments',                authenticate, validate(addCommentSchema), ctrl.addComment);
router.delete('/posts/:id/comments/:commentId',   authenticate, ctrl.deleteComment);
router.post('/posts/:id/comments/:commentId/like', authenticate, ctrl.likeComment);

// Bookmarks
router.get('/bookmarks', authenticate, ctrl.myBookmarks);

// Stories
router.get('/stories',                      authenticate, ctrl.getStories);
router.post('/stories',                     authenticate, validate(createStorySchema), ctrl.createStory);
router.post('/stories/:storyId/view',       authenticate, ctrl.viewStory);
router.delete('/stories/:storyId',          authenticate, ctrl.deleteStory);

// Highlights
router.post('/highlights',     authenticate, validate(createHighlightSchema), ctrl.createHighlight);
router.put('/highlights/:id',  authenticate, ctrl.updateHighlight);
router.delete('/highlights/:id', authenticate, ctrl.deleteHighlight);

// Hashtags
router.get('/hashtags/search', ctrl.searchHashtags);
router.get('/hashtags/:tag',   ctrl.hashtagPosts);

// Reports
router.post('/report', authenticate, validate(reportSchema), ctrl.reportContent);

// DMs
router.get('/dm',              authenticate, ctrl.getConversations);
router.get('/dm/:profileId',   authenticate, ctrl.getDMs);
router.post('/dm/:profileId',  authenticate, validate(sendDMSchema), ctrl.sendDM);

export default router;
