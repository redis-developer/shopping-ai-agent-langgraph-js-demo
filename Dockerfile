FROM node:24-alpine

# Create app directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# The AI providers are npm workspaces, so their folders must exist for npm to link them
COPY src/modules/ai/providers ./src/modules/ai/providers

# Install server dependencies
RUN npm install

# Copy all files
COPY . .

# Expose ports
EXPOSE 3000

# Start app
CMD ["npm", "run", "start"]
