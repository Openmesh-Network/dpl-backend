# First stage - builder
FROM ubuntu:latest AS builder

# Installing dependencies for Node.js and Python
RUN apt-get update && \
    apt-get install -y curl make g++ python3 python3-pip && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install Vonage CLI
RUN npm install -g @vonage/cli

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy all necessary application files
COPY . .

# Build the Node.js application
RUN npm run build

# Copy Python requirements and install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Create Vonage application (replace placeholders with actual values)
RUN vonage config:set --apiKey="b6c73620" --apiSecret="YYepZnUzr2dGDdZe" && \
    vonage apps:create "My Vonage App" --capabilities=voice --voice_answer_url=http://example.com/answer --voice_event_url=http://example.com/event

# Second stage - final image
FROM ubuntu:latest

WORKDIR /app

# Install runtime dependencies for Node.js and Python
RUN apt-get update && \
    apt-get install -y curl make g++ python3 python3-pip && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Copy built Node.js application and node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy Python dependencies from the builder stage
COPY --from=builder /app/requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Expose the application port
EXPOSE 3000

# Command to start the application
CMD [ "npm", "run", "start:prod" ]
