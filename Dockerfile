# Stage 1: Build
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock to the container
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application code to the container
COPY . .

# Build the application
RUN yarn build

# Stage 2: Runtime
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy only the built application and necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Expose the port the app runs on
EXPOSE 3000

# Set the environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["yarn", "start"]