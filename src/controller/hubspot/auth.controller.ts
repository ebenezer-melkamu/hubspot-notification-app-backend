import { Request, Response } from 'express';

import * as hubspotService from '../../services/hubspot';
import * as firestoreService from '../../services/firestore';
import * as coreService from '../../services/core';

import { logger, logError } from '../../helpers/logger';

/**
 * Redirects the user to HubSpot's OAuth authorization screen.
 *
 * Route: GET /hubspot/auth
 * Used when user clicks "Connect HubSpot" in the UI.
 */
export const redirectToHubspotAuth = (req: Request, res: Response): void => {
  logger.info('Redirecting to HubSpot OAuth');
  const url = hubspotService.auth.getAuthUrl();
  res.redirect(url);
};

/**
 * Handles the OAuth callback from HubSpot.
 *
 * Route: GET /hubspot/callback
 * This receives the authorization `code` from HubSpot,
 * exchanges it for tokens, and saves them.
 */
export const handleHubspotCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const code = req.query.code as string;

  if (!code) {
    logger.warn('HubSpot callback missing code param');
    res.status(400).send('Missing authorization code from HubSpot.');
    return;
  }

  try {
    const hubspotToken = await hubspotService.auth.exchangeCodeForTokens(code);
    logger.info('HubSpot token', { hubspotToken });

    const hubspotClient = hubspotService.auth.createHubspotClient(
      hubspotToken.access_token,
    );

    // Get the portalId of the HubSpot account
    const accountInfo = await hubspotService.account.fetchAccountInfo({
      hubspotClient,
    });
    logger.info('HubSpot Account Info', { accountInfo });

    const portalId = accountInfo.portalId.toString();
    logger.info('HubSpot account connected', { portalId });

    // Save the token in Firestore
    await firestoreService.hubspot.saveHubspotTokens(portalId, hubspotToken);
    logger.info('HubSpot tokens saved to Firestore', { portalId });

    // Generate a new JWT token or update an existing one for the user
    const existingPayload = coreService.auth.getAuthPayloadFromRequest(req);
    coreService.auth.setOrUpdateSessionToken(
      res,
      { hubspotPortalId: portalId },
      existingPayload,
    );
    logger.info('Session token updated with HubSpot portalId', { portalId });

    res.status(200).send({ message: 'HubSpot Connected Successfully' });
  } catch (err) {
    logError('HubSpot auth failed', err, {
      route: 'controller/hubspot/callback',
    });
    res.status(500).send({ message: 'HUBSPOT_AUTH_FAILED' });
  }
};

/**
 * Checks if a HubSpot connection exists for the current session.
 *
 * Route: GET /hubspot/status
 */
export const getHubspotStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const payload = coreService.auth.getAuthPayloadFromRequest(req);

    if (!payload?.hubspotPortalId) {
      logger.info('HubSpot status check: no portalId in session');
      res.status(200).send({ connected: false });
      return;
    }

    const tokens = await firestoreService.hubspot.getHubspotTokens(
      payload.hubspotPortalId,
    );
    logger.info('HubSpot status check complete', {
      portalId: payload.hubspotPortalId,
      connected: !!tokens,
    });

    res.status(200).send({ connected: !!tokens });
  } catch (err) {
    logError('Error checking HubSpot status', err, {
      route: 'controller/hubspot/getHubspotStatus',
    });
    res.status(500).send({ connected: false, error: 'STATUS_CHECK_FAILED' });
  }
};
