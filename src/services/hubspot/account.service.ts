import { Client } from '@hubspot/api-client';

type FetchAccountInfoParams = {
  hubspotClient: Client;
};

type AccountInfo = {
  portalId: number;
  timeZone: string;
  currency: string;
  hubDomain: string;
  [key: string]: any; // for safety if HubSpot adds fields
};

/**
 * Fetches basic account info (e.g., portal ID) for the connected HubSpot account.
 */
export const fetchAccountInfo = async ({
  hubspotClient,
}: FetchAccountInfoParams): Promise<AccountInfo> => {
  const response = await hubspotClient.apiRequest({
    method: 'GET',
    path: '/account-info/v3/details',
  });

  const accountInfo = await response.json();

  return accountInfo;
};
