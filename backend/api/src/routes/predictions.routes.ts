import { Router } from 'express';
import { PredictionController } from '../controllers/predictions.controller';
import { authenticate } from '../middleware/auth';

export const predictionRoutes = Router();

predictionRoutes.use(authenticate);

predictionRoutes.get('/', PredictionController.getUserPredictions);
predictionRoutes.get('/ranking', PredictionController.getGlobalRanking);
predictionRoutes.get('/my-ranking', PredictionController.getMyRanking);
predictionRoutes.post('/', PredictionController.createOrUpdate);
predictionRoutes.post('/batch', PredictionController.batchCreate);
predictionRoutes.get('/:matchId', PredictionController.getForMatch);
predictionRoutes.delete('/:matchId', PredictionController.delete);
