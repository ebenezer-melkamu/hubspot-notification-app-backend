# Use Node.js LTS
FROM node:23-slim

# Set working directory
WORKDIR /usr/src/app

# Install dependencies first
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose Cloud Run port
ENV PORT=8080
EXPOSE 8080

# Start app
CMD ["npm", "start"]
