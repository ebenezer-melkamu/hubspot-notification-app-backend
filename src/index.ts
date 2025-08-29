import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import hubspotRouter from './router/hubspot';
import slackRouter from './router/slack';
import notificationRouter from './router/notifications';

dotenv.config();
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

app.use('/api/hubspot', hubspotRouter);
app.use('/api/slack', slackRouter);
app.use('/api/notifications', notificationRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));
