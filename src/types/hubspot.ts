export type HubSpotEntity = 'Invoices' | 'Contacts' | 'LineItems';

export type HubspotTokenResponse = {
  token_type: 'bearer';
  refresh_token: string;
  access_token: string;
  expires_in: number;
};
