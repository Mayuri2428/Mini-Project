# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    python3 \
    make \
    g++

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user early
RUN addgroup -g 1001 -S nodejs && \
    adduser -S attendancems -u 1001 -G nodejs

# Create necessary directories with proper permissions
RUN mkdir -p data logs && \
    chown -R attendancems:nodejs /app

# Copy application code
COPY --chown=attendancems:nodejs . .

# Switch to non-root user
USER attendancems

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application (database will initialize automatically)
CMD ["npm", "start"]