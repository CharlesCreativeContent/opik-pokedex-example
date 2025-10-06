// runware.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";
import { trackOpenAI } from "opik-openai";
import { Opik } from "opik";
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// Make an explicit Opik client so we control URL/batching.
const opik = new Opik({
  apiUrl: process.env.OPIK_URL_OVERRIDE || "http://127.0.0.1:5173/api",
  projectName: process.env.OPIK_PROJECT_NAME || "Default Project",
  workspaceName: process.env.OPIK_WORKSPACE || "default",
  // Smooth over brief backend warm-ups:
  batchDelayMs: 1000,
  holdUntilFlush: true,
});
// Trace generation endpoint
const trackedOpenAI = trackOpenAI(openai, { client: opik });

const opikRoutes = express.Router();

opikRoutes.post("/generate-text", async (req, res) => {
  try {
    const { prompt } = req.body;
let userInput = `You are a pokedex JSON creater. you ONLY return JSON. given a user input you try your best to always return an existing pokemon information. for instance given 1, bulbasaur, etc. you should return with the JSON for bulbasuar and a less than 40 character description. include for example {name, id, type, description, image="https://img.pokemondb.net/sprites/black-white/anim/normal/bulbasuar.gif"}. heres the user input: ${prompt} - pokemon JSON: `

const completion = await trackedOpenAI.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: userInput }],
});

let data = JSON.parse(completion.choices[0].message.content)
// Ensure all traces are sent before your app terminates

opik.trace(data)

    res.json({
      ...data
    });

await opik.flush()
  } catch (error) {
    console.error("openai generation failed:", error);
    res.status(500).json({ error: "openai generation failed" });
  }
});

export default opikRoutes;