import "dotenv/config";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "ergo-brain";

export async function ai_say(req, reply, clean, source) {
    try {
        const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages: [
            {
                role: "user",
                content: clean,
            },
            ],
            stream: false,
        }),
        });

        if (!ollamaResponse.ok) {
        const errorText = await ollamaResponse.text();
        req.log.error({ errorText }, "Ollama request failed");

        return reply.code(500).send({
            error: "ollama_request_failed",
            details: errorText,
        });
        }

        const data = await ollamaResponse.json();
        const assistantReply = data?.message?.content?.trim() || "";

        return {
        reply: assistantReply,
        actions: [],
        needsConfirmation: false,
        source,
        model: OLLAMA_MODEL,
        };
    } catch (error) {
        req.log.error({
        message: error.message,
        cause: error.cause,
        stack: error.stack,
        ollamaUrl: OLLAMA_URL,
        ollamaModel: OLLAMA_MODEL,
        }, "Failed to call Ollama");

        return reply.code(500).send({
        error: "internal_error",
        details: error.message,
        ollamaUrl: OLLAMA_URL,
        ollamaModel: OLLAMA_MODEL,
        });
    }
}