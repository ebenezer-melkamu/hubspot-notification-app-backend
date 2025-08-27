import { db } from '../../helpers/firebase';

import { HubspotTokenResponse } from '../../types/hubspot';

export type HubspotTokenDocument = HubspotTokenResponse & {
  created_at: Date;
};

export const saveHubspotTokens = async (
  portalId: string,
  tokenData: HubspotTokenResponse,
): Promise<void> => {
  await db
    .collection('users')
    .doc(portalId)
    .collection('hubspotTokens')
    .doc('default')
    .set({
      ...tokenData,
      created_at: new Date(),
    });
};

export const getHubspotTokens = async (
  portalId: string,
): Promise<HubspotTokenDocument | null> => {
  const doc = await db
    .collection('users')
    .doc(portalId)
    .collection('hubspotTokens')
    .doc('default')
    .get();

  return doc.exists ? (doc.data() as HubspotTokenDocument) : null;
};
