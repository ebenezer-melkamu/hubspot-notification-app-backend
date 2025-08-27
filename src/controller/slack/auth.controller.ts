import { Request, Response } from 'express';

import * as slackService from '../../services/slack';

import * as slackFirestore from '../../services/firestore/slack';
import * as coreService from '../../services/core';

/**
 * Redirects user to Slack OAuth screen
 *
 * Route: GET /slack/auth
 */
export const redirectToSlackAuth = (req: Request, res: Response): void => {
  const url = slackService.auth.getAuthUrl();
  res.redirect(url);
};

/**
 * Handles the OAuth callback from Slack.
 *
 * Route: GET /slack/callback
 */
export const handleSlackCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const code = req.query.code as string;

  if (!code) {
    res.status(400).send({ message: 'Missing Slack authorization code' });
    return;
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await slackService.auth.exchangeCodeForTokens(code);

    console.log('TOKEN RESPONSE ', tokenResponse);

    // Get user session (to find portalId)
    const payload = coreService.auth.getAuthPayloadFromRequest(req);

    if (!payload?.hubspotPortalId) {
      res.status(400).send({
        message: 'You must connect HubSpot before connecting Slack',
      });
      return;
    }

    console.log('PAYLOAD ', payload);

    // Save Slack tokens under HubSpot portalId
    await slackFirestore.saveSlackTokens(
      payload.hubspotPortalId,
      tokenResponse,
    );

    // Update session to include Slack teamId
    coreService.auth.setOrUpdateSessionToken(
      res,
      { slackTeamId: tokenResponse.team.id },
      payload,
    );

    res.status(200).send({ message: 'Slack connected successfully' });
  } catch (err: any) {
    console.error('Slack auth failed:', err);
    res.status(500).send({ message: 'SLACK_AUTH_FAILED' });
  }
};

/**
 * Checks if a Slack connection exists for the current HubSpot portal.
 *
 * Route: GET /slack/status
 */
export const getSlackStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const payload = coreService.auth.getAuthPayloadFromRequest(req);

    if (!payload?.hubspotPortalId) {
      res.status(200).send({ connected: false });
      return;
    }

    const tokens = await slackFirestore.getSlackTokens(payload.hubspotPortalId);

    res.status(200).send({ connected: !!tokens });
  } catch (err) {
    console.error('Error checking Slack status:', err);
    res.status(500).send({ connected: false, error: 'STATUS_CHECK_FAILED' });
  }
};
