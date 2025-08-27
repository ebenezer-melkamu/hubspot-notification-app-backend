import axios from 'axios';

import * as slackFirestore from '../firestore/slack';

export const sendSlackMessage = async (
  portalId: string,
  channel: string,
  message: string,
): Promise<void> => {
  const tokens = await slackFirestore.getSlackTokens(portalId);

  if (!tokens) {
    console.error('No Slack tokens found for portal:', portalId);
    throw new Error('No Slack connection found for this portal');
  }
  console.log('TOKENS ', tokens);
  try {
    const response = await axios.post(
      'https://slack.com/api/chat.postMessage',
      {
        channel,
        text: message,
      },
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
      },
    );

    if (!response.data.ok) {
      console.error('Slack API error:', response);
      throw new Error(`Slack message failed: ${response.data.error}`);
    }
  } catch (err) {
    console.error('Slack message send failed:', err);
    throw err;
  }
};
