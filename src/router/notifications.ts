import { Router } from 'express';

import * as notificationsController from '../controller/notifications';
import { requireAuth } from '../services/core/auth.service';

const router = Router();

// Save/update notification rules
router.post('/rules', requireAuth, notificationsController.saveRules);

// Fetch existing notification rules
router.get('/rules', requireAuth, notificationsController.getRules);

export default router;
