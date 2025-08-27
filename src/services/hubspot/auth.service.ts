import dotenv from 'dotenv';
import { Client } from '@hubspot/api-client';

import { HubspotTokenResponse } from '../../types/hubspot';

dotenv.config();

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID!;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET!;
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI!;

const hubspotScopes = [
  'oauth',
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.companies.read',
  'crm.objects.companies.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'crm.objects.invoices.read',
  'crm.objects.invoices.write',
  'crm.objects.line_items.read',
  'crm.objects.line_items.write',
  'crm.dealsplits.read_write',
];

/**
 * Generates the HubSpot OAuth URL with required scopes.
 *
 * @returns The full OAuth URL to redirect the user to HubSpot
 */
export const getAuthUrl = (): string => {
  const scopes = hubspotScopes.join(' ');

  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${HUBSPOT_CLIENT_ID}&redirect_uri=${HUBSPOT_REDIRECT_URI}&scope=${encodeURIComponent(
    scopes,
  )}&response_type=code`;

  return authUrl;
};

/**
 * Exchanges the HubSpot authorization code for access and refresh tokens.
 *
 * @param code The authorization code returned by HubSpot
 * @returns A JSON object with token data (access_token, refresh_token, etc.)
 * @throws Error if the request fails or the response is invalid
 */
export const exchangeCodeForTokens = async (code: string) => {
  const tokenUrl = 'https://api.hubapi.com/oauth/v1/token';

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: HUBSPOT_REDIRECT_URI,
      code,
    }),
  });

  const data: HubspotTokenResponse = await response.json();

  if (!response.ok) {
    throw new Error(`HubSpot token exchange failed: ${JSON.stringify(data)}`);
  }

  return data;
};

export const createHubspotClient = (accessToken: string) => {
  //TODO: implement rate limit and retries in here
  return new Client({ accessToken });
};

/**
 * Refreshes a HubSpot access token using the given refresh token.
 *
 * @param refreshToken - The existing refresh token.
 * @returns New token response from HubSpot.
 * @throws If the token refresh fails.
 */
export const refreshHubspotToken = async (refreshToken: string) => {
  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: HUBSPOT_REDIRECT_URI,
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('HubSpot token refresh failed:', data);
    throw new Error('Failed to refresh HubSpot token');
  }

  return {
    ...data,
    created_at: new Date(),
  };
};
