import { db } from '../../helpers/firebase';

export type SlackTokenDocument = {
  access_token: string;
  team: {
    id: string;
    name: string;
  };
  created_at: Date;
};

export const saveSlackTokens = async (
  portalId: string,
  tokenData: SlackTokenDocument,
): Promise<void> => {
  await db
    .collection('users')
    .doc(portalId)
    .collection('slackTokens')
    .doc('default')
    .set({
      ...tokenData,
      created_at: new Date(),
    });
};

export const getSlackTokens = async (
  portalId: string,
): Promise<SlackTokenDocument | null> => {
  const doc = await db
    .collection('users')
    .doc(portalId)
    .collection('slackTokens')
    .doc('default')
    .get();

  return doc.exists ? (doc.data() as SlackTokenDocument) : null;
};

export const deleteSlackTokens = async (portalId: string): Promise<void> => {
  await db
    .collection('users')
    .doc(portalId)
    .collection('slackTokens')
    .doc('default')
    .delete();
};
