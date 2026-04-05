import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer } from "ws";

import { echo_response } from "./module/echo.js";
import { ai_say } from "./module/ai_request.js";
import { playTts } from "./module/tts.js";
import { handleUserText } from './module/stt.js'

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  preflight: true,
  strictPreflight: true,
})

const API_KEY = process.env.BRAIN_API_KEY || "";
const PORT = Number(process.env.PORT || 3000);

if (!API_KEY) {
  app.log.warn("BRAIN_API_KEY is not set. Requests will be rejected.");
}

app.get("/health", async () => {
  return { ok: true };
});

const sessions = new Map();

function createSession() {
  const sessionId = crypto.randomUUID();

  const session = {
    id: sessionId,
    createdAt: Date.now(),
    status: "active",
    audioChunks: [],
    history: [],
    lastUserText: "",
  };

  sessions.set(sessionId, session);
  return session;
}

function getSession(sessionId) {
  return sessions.get(sessionId)
}

function endSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return

  session.status = 'ended'
  sessions.delete(sessionId)
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload))
  }
}

app.post("/v1/command", async (req, reply) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!API_KEY || token !== API_KEY) {
    return reply.code(401).send({ error: "unauthorized" });
  }

  const { text = "", source = "unknown" } = req.body ?? {};
  const clean = String(text).trim().toLowerCase();

  return await ai_say(req, reply, clean, source);
});

app.post("/v1/tts", async (req, reply) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!API_KEY || token !== API_KEY) {
    return reply.code(401).send({ error: "unauthorized" });
  }
  const { text = "", source = "unknown" } = req.body ?? {};
  
  return await playTts(req, reply, text);
});

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });

    const wss = new WebSocketServer({ server: app.server });

    wss.on("connection", (ws) => {
      app.log.info("WebSocket client connected");

      ws.on("message", async (raw) => {
        try {
          const message = JSON.parse(raw.toString());

          switch (message.type) {
            case "session.start": {
              const session = createSession();

              send(ws, {
                type: "session.started",
                sessionId: session.id,
              });

              break;
            }

            case "audio.chunk": {
              const { sessionId, mimeType, data } = message;
              const session = getSession(sessionId);

              if (!session) {
                send(ws, {
                  type: "error",
                  message: "Session not found for audio.chunk",
                });
                return;
              }

              session.audioChunks.push({
                mimeType,
                data,
                receivedAt: Date.now(),
              });

              send(ws, {
                type: "audio.chunk.received",
                sessionId,
                size: data?.length || 0,
              });

              break;
            }

            case "text.input": {
              const { sessionId, text } = message;
              const session = getSession(sessionId);

              if (!session) {
                send(ws, {
                  type: "error",
                  message: "Session not found for text.input",
                });
                return;
              }

              send(ws, {
                type: "transcript.final",
                sessionId,
                text,
              });

              const result = await handleUserText(session, text);

              send(ws, {
                type: "assistant.text",
                sessionId,
                text: result.reply,
              });

              if (result.shouldEndSession) {
                send(ws, {
                  type: "session.ended",
                  sessionId,
                });

                endSession(sessionId);
              }

              break;
            }
            case "session.stop": {
              const { sessionId } = message;
              endSession(sessionId);

              send(ws, {
                type: "session.ended",
                sessionId,
              });

              break;
            }

            default: {
              send(ws, {
                type: "error",
                message: `Unknown message type: ${message.type}`,
              });
            }
          }

          
        } catch(error) {
          app.log.error(error);

          send(ws, {
            type: "error",
            message: "Invalid WS message",
          });
        }
      })
      ws.on("close", () => {
        app.log.info("WebSocket client disconnected");
      });
    })

    app.log.info(`Brain server running on http://0.0.0.0:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();



//
//echo
//return echo_response(clean);

/*if (clean.includes("включи свет")) {
  return {
    reply: "Ок, включаю свет.",
    actions: [{ type: "homeassistant", name: "light_on", params: {} }],
    needsConfirmation: false
  };
}*/