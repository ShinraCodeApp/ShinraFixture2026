import { Router } from 'express';
import { SimulatorController } from '../controllers/simulator.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

export const simulatorRoutes = Router();

simulatorRoutes.get('/share/:code', SimulatorController.getByShareCode);
simulatorRoutes.post('/run', optionalAuth, SimulatorController.run);
simulatorRoutes.post('/run-ai', authenticate, SimulatorController.runWithAI);
simulatorRoutes.get('/my-sessions', authenticate, SimulatorController.mySessions);
simulatorRoutes.delete('/:id', authenticate, SimulatorController.delete);
