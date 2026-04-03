import Fastify from "fastify";
import { echo_response } from "./module/echo.js";

const app = Fastify({ logger: true });

const API_KEY = process.env.BRAIN_API_KEY || "";
if (!API_KEY) {
  app.log.warn("BRAIN_API_KEY is not set. Requests will be rejected.");
}

app.get('/health', (req, res) => res.send('ok'));

app.post("/v1/command", async (req, reply) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!API_KEY || token !== API_KEY) {
    return reply.code(401).send({ error: "unauthorized" });
  }

  const { text = "", source = "unknown" } = req.body ?? {};
  const clean = String(text).trim().toLowerCase();

  // MVP intent routing
  if (clean === "пинг") {
    return { reply: "Im here!", actions: [], needsConfirmation: false };
  }

  //echo
  return echo_response(clean);

  /*if (clean.includes("включи свет")) {
    return {
      reply: "Ок, включаю свет.",
      actions: [{ type: "homeassistant", name: "light_on", params: {} }],
      needsConfirmation: false
    };
  }*/

  return {
    reply: "Пока не понял команду. Скажи иначе 🙂",
    actions: [],
    needsConfirmation: false
  };
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});