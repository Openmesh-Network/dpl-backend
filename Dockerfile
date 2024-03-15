FROM ubuntu:latest AS builder

# Installing python and nodejs
RUN apt-get update && \
    apt-get install -y curl make g++ python3 python3-pip && \
    curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Installing nodejs dep
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Installing python dep
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Second step - final image
FROM ubuntu:latest

WORKDIR /app

RUN apt-get update && \
    apt-get install -y curl make g++ python3 python3-pip && \
    curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy python dep installed
COPY --from=builder /app/requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

EXPOSE 3000

CMD [ "npm", "run", "start:prod" ]