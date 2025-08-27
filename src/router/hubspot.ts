import { Router } from 'express';

import * as hubspotController from '../controller/hubspot';

const router = Router();

router.get('/auth', hubspotController.auth.redirectToHubspotAuth);
router.get('/callback', hubspotController.auth.handleHubspotCallback);
router.get('/status', hubspotController.auth.getHubspotStatus);

export default router;
