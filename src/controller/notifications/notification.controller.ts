import { Request, Response } from 'express';

import * as firestoreService from '../../services/firestore';
import * as coreService from '../../services/core';
import { logError, logger } from '../../helpers/logger';

/**
 * Save notification rules for a HubSpot portal.
 * Route: POST /api/notifications/rules
 */
export const saveRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = coreService.auth.getAuthPayloadFromRequest(req);

    if (!payload?.hubspotPortalId) {
      logger.warn('Attempted to save rules without hubspotPortalId', {
        route: 'controller/notifications/saveRules',
      });
      res.status(400).send({ message: 'No HubSpot portal context found' });
      return;
    }

    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      logger.warn('Invalid rules format submitted', {
        route: 'controller/notifications/saveRules',
        portalId: payload.hubspotPortalId,
        body: req.body,
      });
      res.status(400).send({ message: 'Invalid rules format' });
      return;
    }

    await firestoreService.notification.saveNotificationRules(
      payload.hubspotPortalId,
      rules,
    );

    logger.info('Notification rules saved successfully', {
      portalId: payload.hubspotPortalId,
      count: rules.length,
    });

    res.status(200).send({ message: 'Rules saved successfully' });
  } catch (err) {
    logError('Failed to save notification rules', err, {
      route: 'controller/notifications/saveRules',
    });
    res.status(500).send({ message: 'RULE_SAVE_FAILED' });
  }
};

/**
 * Get notification rules for a HubSpot portal.
 * Route: GET /api/notifications/rules
 */
export const getRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = coreService.auth.getAuthPayloadFromRequest(req);

    if (!payload?.hubspotPortalId) {
      logger.info(
        'No hubspotPortalId found in session — returning empty rules',
        {
          route: 'controller/notifications/getRules',
        },
      );
      res.status(200).send({ rules: [] });
      return;
    }

    const rules = await firestoreService.notification.getNotificationRules(
      payload.hubspotPortalId,
    );

    logger.info('Fetched notification rules', {
      portalId: payload.hubspotPortalId,
      count: rules.length,
    });

    res.status(200).send({ rules });
  } catch (err) {
    logError('Failed to fetch notification rules', err, {
      route: 'controller/notifications/getRules',
    });
    res.status(500).send({ rules: [], error: 'RULE_FETCH_FAILED' });
  }
};
