import dotenv from 'dotenv';
dotenv.config();

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!;
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI!;

// For MVP just chat:write
const slackScopes = ['chat:write'];

export const getAuthUrl = (): string => {
  const scopes = slackScopes.join(',');
  return `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(
    SLACK_REDIRECT_URI,
  )}`;
};

export const exchangeCodeForTokens = async (code: string) => {
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      redirect_uri: SLACK_REDIRECT_URI,
      code,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(`Slack token exchange failed: ${JSON.stringify(data)}`);
  }

  return data; // contains access_token, team info, etc.
};
