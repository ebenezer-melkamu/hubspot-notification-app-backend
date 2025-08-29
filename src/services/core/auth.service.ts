import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { Timestamp } from 'firebase-admin/firestore';

import * as firestoreService from '../firestore';
import * as hubspotService from '../../services/hubspot';

import { HubspotTokenDocument } from '../firestore/hubspot';
import { logger } from '../../helpers/logger';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '30d';

/**
 * AuthPayload represents the session data stored in the JWT.
 * It holds identifiers for HubSpot and Xero accounts.
 *
 * - `hubspotPortalId` – unique ID for the connected HubSpot account (portal).
 * - `slackTeamId` – unique ID for the connected slack.
 */
export type AuthPayload = {
  hubspotPortalId?: string;
  slackTeamId?: string;
};

/**
 * Creates a signed JWT from the provided AuthPayload.
 * This token will be stored in a cookie and used for session validation.
 *
 * @param payload - AuthPayload containing hubspotPortalId and/or xeroTenantId.
 * @returns Signed JWT string.
 */
export const generateToken = (payload: AuthPayload): string => {
  const cleanPayload = { ...payload };

  // Remove any `exp` and `iat` values to avoid errors
  delete (cleanPayload as any).exp;
  delete (cleanPayload as any).iat;

  return jwt.sign(cleanPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifies and decodes a JWT.
 *
 * @param token - The signed JWT string from the session cookie.
 * @returns The decoded AuthPayload if token is valid.
 * @throws Will throw if the token is expired, invalid, or tampered with.
 */
export const verifyToken = (token: string): AuthPayload => {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
};

/**
 * Attempts to read and decode the session token from the request cookies.
 * Returns `null` if no valid token is found.
 *
 * @param req - Express request object with cookies.
 * @returns Decoded AuthPayload or null if missing/invalid.
 */
export const getAuthPayloadFromRequest = (req: Request): AuthPayload | null => {
  const token = req.cookies['session_token'];
  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
};

/**
 * Merges new auth identifiers into the current session and updates the session cookie.
 * This is called every time the user connects either HubSpot or Xero.
 *
 * If the user previously had only one platform connected, this function upgrades
 * the session token to include both identifiers without resetting the session.
 *
 * @param res - Express response object used to set the cookie.
 * @param updates - Partial AuthPayload containing new identifiers to store.
 * @param existingPayload - The current AuthPayload (if any), to be merged with.
 */
export const setOrUpdateSessionToken = (
  res: Response,
  updates: Partial<AuthPayload>,
  existingPayload?: AuthPayload | null,
): void => {
  const merged: AuthPayload = { ...(existingPayload || {}), ...updates };

  const newToken = generateToken(merged);

  /**
   * TODO:
   * When deploying frontend + backend on the same domain (e.g. app.example.com + api.example.com),
   * switch back to sameSite='strict' (or at least 'lax') for stronger CSRF protection.
   */
  res.cookie('session_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // only send cookie over HTTPS in production; must be false for local http://localhost dev
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  });
};

/**
 * Middleware that checks for a valid session token in cookies.
 * Adds `req.auth` (AuthPayload) if token is valid.
 * Responds with 401 Unauthorized if missing or invalid.
 */
export const requireAuth: RequestHandler = (
  req: Request & { auth?: AuthPayload },
  res: Response,
  next: NextFunction,
): void => {
  const token = req.cookies?.['session_token'];

  if (!token) {
    logger.warn('Unauthorized request — missing session_token cookie', {
      route: req.originalUrl,
      ip: req.ip,
    });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.auth = payload;
    next();
  } catch (err) {
    logger.warn('Unauthorized request — invalid or expired token', {
      route: req.originalUrl,
      ip: req.ip,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Checks whether a token is near expiry and should be refreshed.
 *
 * @param createdAt - The token creation timestamp.
 * @param expiresIn - The token expiration duration (in seconds).
 * @param thresholdSeconds - How close to expiry (in seconds) to trigger refresh. Default is 60.
 * @returns `true` if the token should be refreshed, `false` otherwise.
 */
export const shouldRefreshToken = (
  createdAt: Date,
  expiresIn: number,
  thresholdSeconds = 60,
): boolean => {
  const expiresAt = createdAt.getTime() + expiresIn * 1000;
  const now = Date.now();
  return expiresAt - now <= thresholdSeconds * 1000;
};

//TODOM: fix tsdocs (remove xero)
/**
 * Retrieves access tokens for both HubSpot and Xero from Firestore,
 * using the provided portal and tenant IDs from the session.
 * Automatically refreshes them if they are near expiry.
 *
 * @param params - Object containing optional `hubspotPortalId` and `xeroTenantId`.
 * @returns An object with `hubspotAccessToken` and `xeroAccessToken`.
 * @throws If either ID is missing or token lookup fails.
 */
export const getConnectedTokens = async ({
  hubspotPortalId,
  xeroTenantId,
}: {
  hubspotPortalId?: string;
  xeroTenantId?: string;
}) => {
  if (!hubspotPortalId || !xeroTenantId) {
    throw new Error('Missing HubSpot or Xero ID in session');
  }

  const hsToken = await firestoreService.hubspot.getHubspotTokens(
    hubspotPortalId,
  );
  if (!hsToken) throw new Error('HubSpot token not found');

  //TODO: Change this to Slack
  // const xeroToken = await xeroFirestore.auth.getXeroTokens(xeroTenantId);
  // if (!xeroToken) throw new Error('Xero token not found');

  const hubspotAccessToken = await refreshHubspotTokenIfNeeded(
    hubspotPortalId,
    hsToken,
  );

  // const xeroAccessToken = await refreshXeroTokenIfNeeded(
  //   xeroTenantId,
  //   //xeroToken,
  // );

  return {
    hubspotAccessToken,
    //xeroAccessToken,
  };
};

/**
 * Returns a valid HubSpot access token, refreshing it if near expiry.
 *
 * @param portalId - HubSpot portal ID.
 * @param tokenData - Existing token data from Firestore.
 * @returns A valid access token (possibly refreshed).
 */
export const refreshHubspotTokenIfNeeded = async (
  portalId: string,
  tokenData: HubspotTokenDocument,
): Promise<string> => {
  const createdAt =
    tokenData.created_at instanceof Timestamp
      ? tokenData.created_at.toDate()
      : new Date(tokenData.created_at);

  if (shouldRefreshToken(createdAt, tokenData.expires_in)) {
    console.log('Refreshing HubSpot token...');

    const refreshed = await hubspotService.auth.refreshHubspotToken(
      tokenData.refresh_token,
    );

    await firestoreService.hubspot.saveHubspotTokens(portalId, refreshed);

    return refreshed.access_token;
  }

  return tokenData.access_token;
};

/**
 * Returns a valid Xero access token, refreshing it if near expiry.
 *
 * @param tenantId - Xero tenant ID.
 * @param tokenData - Existing token data from Firestore.
 * @returns A valid access token (possibly refreshed).
 */
// export const refreshXeroTokenIfNeeded = async (
//   tenantId: string,
//   tokenData: XeroTokenDocument,
// ): Promise<string> => {
//   const createdAt =
//     tokenData.created_at instanceof Timestamp
//       ? tokenData.created_at.toDate()
//       : new Date(tokenData.created_at);

//   if (shouldRefreshToken(createdAt, tokenData.expires_in)) {
//     console.log('Refreshing Xero token...');

//     const refreshed = await xeroService.auth.refreshXeroToken(
//       tokenData.refresh_token,
//     );

//     await xeroFirestore.auth.saveXeroTokens(tenantId, refreshed);

//     return refreshed.access_token;
//   }

//   return tokenData.access_token;
// };
