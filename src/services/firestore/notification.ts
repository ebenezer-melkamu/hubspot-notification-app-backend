import { db } from '../../helpers/firebase';
import { logger } from '../../helpers/logger';

const COLLECTION_NAME = 'notificationRules';

/**
 * Save rules for a given HubSpot portal.
 */
export const saveNotificationRules = async (
  portalId: string,
  rules: string[],
): Promise<void> => {
  await db
    .collection('users')
    .doc(portalId)
    .collection(COLLECTION_NAME)
    .doc('default')
    .set({ rules, updated_at: new Date() });

  logger.info('Notification rules written to Firestore', { portalId, rules });
};

/**
 * Get rules for a given HubSpot portal.
 */
export const getNotificationRules = async (
  portalId: string,
): Promise<string[]> => {
  const doc = await db
    .collection('users')
    .doc(portalId)
    .collection(COLLECTION_NAME)
    .doc('default')
    .get();

  if (!doc.exists) {
    return [];
  }

  const data = doc.data() as { rules: string[] };
  return data.rules || [];
};
