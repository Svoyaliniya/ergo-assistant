import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";

import { echo_response } from "./module/echo.js";
import { ai_say } from "./module/ai_request.js";
import { playTts } from "./module/tts.js";

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