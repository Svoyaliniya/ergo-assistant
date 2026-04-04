# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim
WORKDIR /app

# Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Node
COPY package*.json ./
RUN npm ci

# Piper
RUN mkdir -p /opt/piper
RUN python3 -m venv /opt/piper/.venv
RUN /opt/piper/.venv/bin/pip install --upgrade pip
RUN /opt/piper/.venv/bin/pip install piper-tts
RUN mkdir -p /opt/piper/voices
WORKDIR /opt/piper/voices
RUN /opt/piper/.venv/bin/python -m piper.download_voices ru_RU-irina-medium
WORKDIR /app
COPY . .

# Code
COPY src ./src

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

#CMD ["node", "src/index.js"]
CMD ["npm", "run", "dev"]

EXPOSE 3000