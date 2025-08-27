# Use official Node.js image
FROM node:23-slim

# Set working directory
WORKDIR /usr/src/app

# Install dependencies separately (for caching)
COPY package*.json ./
RUN npm install --production

# Copy the rest of your source code
COPY . .

# Expose port (Cloud Run expects your app to listen on $PORT)
EXPOSE 8080

# Start your server
CMD ["npm", "start"]
