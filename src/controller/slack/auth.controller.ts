import { Request, Response } from 'express';

import * as slackService from '../../services/slack';
import * as slackFirestore from '../../services/firestore/slack';
import * as coreService from '../../services/core';

import { logger, logError } from '../../helpers/logger';

/**
 * Redirects user to Slack OAuth screen
 *
 * Route: GET /slack/auth
 */
export const redirectToSlackAuth = (req: Request, res: Response): void => {
  logger.info('Redirecting to Slack OAuth');
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
    logger.warn('Slack callback missing code param');
    res.status(400).send({ message: 'Missing Slack authorization code' });
    return;
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await slackService.auth.exchangeCodeForTokens(code);
    logger.info('Slack token exchange successful', {
      team: tokenResponse.team,
    });

    // Get user session (to find portalId)
    const payload = coreService.auth.getAuthPayloadFromRequest(req);
    logger.debug('Auth payload retrieved', { payload });

    if (!payload?.hubspotPortalId) {
      logger.warn('Slack connect attempted without HubSpot portal linked');
      res.status(400).send({
        message: 'You must connect HubSpot before connecting Slack',
      });
      return;
    }

    // Save Slack tokens under HubSpot portalId
    await slackFirestore.saveSlackTokens(
      payload.hubspotPortalId,
      tokenResponse,
    );
    logger.info('Saved Slack tokens to Firestore', {
      portalId: payload.hubspotPortalId,
    });

    // Update session to include Slack teamId
    coreService.auth.setOrUpdateSessionToken(
      res,
      { slackTeamId: tokenResponse.team.id },
      payload,
    );
    logger.info('Updated session token with Slack teamId', {
      teamId: tokenResponse.team.id,
    });

    res.status(200).send({ message: 'Slack connected successfully' });
  } catch (err) {
    logError('Slack auth failed', err, { route: 'controller/slack/callback' });
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
    logger.debug('Checking Slack connection status', { payload });

    if (!payload?.hubspotPortalId) {
      logger.info('Slack status check: no HubSpot portal found');
      res.status(200).send({ connected: false });
      return;
    }

    const tokens = await slackFirestore.getSlackTokens(payload.hubspotPortalId);
    logger.info('Slack status check complete', {
      portalId: payload.hubspotPortalId,
      connected: !!tokens,
    });

    res.status(200).send({ connected: !!tokens });
  } catch (err) {
    logError('Error checking Slack status', err, {
      route: 'controller/slack/status',
    });
    res.status(500).send({ connected: false, error: 'STATUS_CHECK_FAILED' });
  }
};
