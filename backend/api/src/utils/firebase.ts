import * as admin from 'firebase-admin';
import { config } from '../config';
import { logger } from './logger';

let initialized = false;

export function initFirebase(): void {
  if (initialized || !config.firebase.projectId) {
    if (!config.firebase.projectId) logger.warn('Firebase not configured — push notifications disabled');
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      }),
      databaseURL: config.firebase.databaseUrl,
    });
    initialized = true;
    logger.info('Firebase initialized');
  } catch (err) {
    logger.error('Firebase initialization failed:', err);
  }
}
