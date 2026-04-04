import "dotenv/config";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const PIPER_BIN = process.env.PIPER_BIN || "";
const PIPER_MODEL = process.env.PIPER_MODEL || "";

export async function playTts(req, reply, clean) {
  if (!clean) {
    return reply.code(400).send({ error: "text is required" });
  }

  const tempFile = path.join(os.tmpdir(), `piper-${crypto.randomUUID()}.wav`);

  try {
    await new Promise((resolve, reject) => {
      const piper = spawn(PIPER_BIN, [
        "-m",
        "piper",
        "--model",
        PIPER_MODEL,
        "--output_file",
        tempFile,
      ]);

      let stderr = "";

      piper.stdin.write(clean);
      piper.stdin.end();

      piper.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      piper.on("error", reject);

      piper.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Piper exited with code ${code}: ${stderr}`));
        }
      });
    });

    const buffer = await fs.readFile(tempFile);

    return reply
      .header("Content-Type", "audio/wav")
      .header("Cache-Control", "no-store")
      .send(buffer);
  } catch (error) {
    req.log.error(error);
    return reply.code(500).send({
      error: "tts_failed",
      message: error.message,
    });
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}