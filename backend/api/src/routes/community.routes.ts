import { Router } from 'express';
import { CommunityController } from '../controllers/community.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

export const communityRoutes = Router();

// Forum
communityRoutes.get('/forum', optionalAuth, CommunityController.listPosts);
communityRoutes.post('/forum', authenticate, CommunityController.createPost);
communityRoutes.get('/forum/:id', optionalAuth, CommunityController.getPost);
communityRoutes.post('/forum/:id/replies', authenticate, CommunityController.addReply);
communityRoutes.delete('/forum/:id', authenticate, CommunityController.deletePost);

// Polls
communityRoutes.get('/polls', optionalAuth, CommunityController.listPolls);
communityRoutes.get('/polls/:id', optionalAuth, CommunityController.getPoll);
communityRoutes.post('/polls/:id/vote', authenticate, CommunityController.vote);

// Comments
communityRoutes.delete('/comments/:id', authenticate, CommunityController.deleteComment);
communityRoutes.post('/comments/:id/react', authenticate, CommunityController.reactToComment);
communityRoutes.post('/comments/:id/report', authenticate, CommunityController.reportComment);
