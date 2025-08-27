FROM node:23-slim
WORKDIR /usr/src/app

# Install everything (prod + dev) for build
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build TS → dist/
RUN npm run build

# Reinstall only prod deps for smaller image
RUN npm prune --production

ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
