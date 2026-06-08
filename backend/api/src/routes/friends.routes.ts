import { Router } from 'express';
import { FriendsController } from '../controllers/friends.controller';
import { authenticate } from '../middleware/auth';

export const friendRoutes = Router();

friendRoutes.use(authenticate);

friendRoutes.get('/',               FriendsController.listFriends);
friendRoutes.get('/requests',       FriendsController.listRequests);
friendRoutes.get('/search',         FriendsController.searchUsers);
friendRoutes.post('/request/:userId', FriendsController.sendRequest);
friendRoutes.post('/accept/:id',    FriendsController.acceptRequest);
friendRoutes.delete('/:id',         FriendsController.rejectOrRemove);
