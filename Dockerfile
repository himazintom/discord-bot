# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies using npm ci
RUN npm ci

# Copy all other files into the working directory
COPY . .

# Build the TypeScript code
RUN npm run build

# Set the entrypoint to run the application
CMD ["node", "dist/index.js"]