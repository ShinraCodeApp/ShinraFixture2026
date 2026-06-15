import { Router } from 'express';
import { PredictionController } from '../controllers/predictions.controller';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';

export const predictionRoutes = Router();

predictionRoutes.use(authenticate);

predictionRoutes.get('/', PredictionController.getUserPredictions);
predictionRoutes.get('/ranking', PredictionController.getGlobalRanking);
predictionRoutes.get('/my-ranking', PredictionController.getMyRanking);
predictionRoutes.post('/', PredictionController.createOrUpdate);
predictionRoutes.post('/batch', PredictionController.batchCreate);
// GET alias for LTE networks that block POST
predictionRoutes.get('/g-save', (req: any, _res: any, next: any) => { req.body = req.query; next(); }, PredictionController.createOrUpdate);

// ── Bracket Predictor ─────────────────────────────────────────────────
predictionRoutes.get('/bracket', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { tournamentId } = req.query;
    if (!tournamentId) return res.status(400).json({ success: false, error: 'tournamentId required' });
    const pick = await prisma.bracketPick.findUnique({
      where: { userId_tournamentId: { userId, tournamentId: String(tournamentId) } },
    });
    res.json({ success: true, data: pick ?? null });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

predictionRoutes.post('/bracket', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { tournamentId, picks } = req.body;
    if (!tournamentId || !picks) return res.status(400).json({ success: false, error: 'tournamentId and picks required' });
    const pick = await prisma.bracketPick.upsert({
      where: { userId_tournamentId: { userId, tournamentId } },
      create: { userId, tournamentId, picks },
      update: { picks },
    });
    res.json({ success: true, data: pick });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET alias for LTE networks
predictionRoutes.get('/g-bracket', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { tournamentId, picks: picksStr } = req.query;
    if (!tournamentId || !picksStr) return res.status(400).json({ success: false, error: 'tournamentId and picks required' });
    const picks = JSON.parse(String(picksStr));
    const pick = await prisma.bracketPick.upsert({
      where: { userId_tournamentId: { userId, tournamentId: String(tournamentId) } },
      create: { userId, tournamentId: String(tournamentId), picks },
      update: { picks },
    });
    res.json({ success: true, data: pick });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

predictionRoutes.get('/:matchId', PredictionController.getForMatch);
predictionRoutes.delete('/:matchId', PredictionController.delete);
