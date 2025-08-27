import { Router } from 'express';

import * as slackController from '../controller/slack';

import * as slackService from '../services/slack';

const router = Router();

router.get('/auth', slackController.auth.redirectToSlackAuth);
router.get('/callback', slackController.auth.handleSlackCallback);

router.get('/status', slackController.auth.getSlackStatus);

// ✅ Test route to send a message to Slack
router.post('/send-test', async (req, res) => {
  try {
    // TODO: extract portalId from session once ready
    const portalId = '144902582'; // temporary hardcode or from coreService.auth
    await slackService.notify.sendSlackMessage(
      portalId,
      '#general',
      '🚀 Test notification from HubSpot Notification MVP',
    );
    res.status(200).send({ message: 'Sent to Slack' });
  } catch (err: any) {
    res.status(500).send({ error: err.message });
  }
});

export default router;
