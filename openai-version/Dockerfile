FROM node:18

# Create app directory
WORKDIR /app

# Copy all files
COPY . .

# Install server dependencies
RUN npm install

# Expose ports
EXPOSE 3000

# Start app
CMD ["npm", "run", "start"]
