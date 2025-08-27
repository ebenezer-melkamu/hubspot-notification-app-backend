import { Request, Response } from 'express';

import * as hubspotService from '../../services/hubspot';
import * as firestoreService from '../../services/firestore';
import * as coreService from '../../services/core';

/**
 * Redirects the user to HubSpot's OAuth authorization screen.
 *
 * Route: GET /hubspot/auth
 * Used when user clicks "Connect HubSpot" in the UI.
 *
 * @param req Express request object
 * @param res Express response object
 */
export const redirectToHubspotAuth = (req: Request, res: Response): void => {
  const url = hubspotService.auth.getAuthUrl();
  res.redirect(url);
};

/**
 * Handles the OAuth callback from HubSpot.
 *
 * Route: GET /hubspot/callback
 * This receives the authorization `code` from HubSpot,
 * exchanges it for tokens, and logs them (or saves them).
 *
 * @param req Express request object
 * @param res Express response object
 */
export const handleHubspotCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const code = req.query.code as string;

  if (!code) {
    res.status(400).send('Missing authorization code from HubSpot.');
    return;
  }

  try {
    const hubspotToken = await hubspotService.auth.exchangeCodeForTokens(code);

    const hubspotClient = hubspotService.auth.createHubspotClient(
      hubspotToken.access_token,
    );

    // Get the portalId of the hubspot account from the HubSpot API
    const accountInfo = await hubspotService.account.fetchAccountInfo({
      hubspotClient,
    });

    const portalId = accountInfo.portalId.toString();

    // Save the token in firestore
    await firestoreService.hubspot.saveHubspotTokens(portalId, hubspotToken);

    // Generate a new JWT token or update an existing one for the user
    const existingPayload = coreService.auth.getAuthPayloadFromRequest(req);

    coreService.auth.setOrUpdateSessionToken(
      res,
      { hubspotPortalId: portalId },
      existingPayload,
    );

    res.status(200).send({ message: 'HubSpot Connected Successfully' });
  } catch (err: any) {
    console.error('HubSpot auth failed:', err);
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
    // get auth payload from request (JWT/session)
    const payload = coreService.auth.getAuthPayloadFromRequest(req);

    if (!payload?.hubspotPortalId) {
      res.status(200).send({ connected: false });
      return;
    }

    const tokens = await firestoreService.hubspot.getHubspotTokens(
      payload.hubspotPortalId,
    );

    res.status(200).send({ connected: !!tokens });
  } catch (err) {
    console.error('Error checking HubSpot status:', err);
    res.status(500).send({ connected: false, error: 'STATUS_CHECK_FAILED' });
  }
};
