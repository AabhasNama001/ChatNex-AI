const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({});

// helper: retry wrapper
async function withRetry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      // If last attempt, rethrow
      if (i === retries - 1) throw err;

      // Only retry on 503 or network issues
      if (err?.status === 503 || err?.code === 503) {
        console.warn(`AI service overloaded. Retrying in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err; // other errors, break early
      }
    }
  }
}

async function generateResponse(content) {
  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: content,
        config: {
          temperature: 0.7,
          systemInstruction: `
            You are a highly intelligent, empathetic, and friendly AI assistant.
            Always respond in a clear, concise, and polite manner.
            Make your responses sound natural and pleasing to read.
            Be helpful, supportive, and encouraging, while keeping the tone professional yet warm.
            If the user asks for technical help, explain step by step.
            If the user chats casually, respond in a friendly conversational tone.
            Never be rude, overly robotic, or dismissive.
            Use emojis as per the word, not more emojis but suitable and good looking response.
          `,
        },
      })
    );

    return response.text;
  } catch (err) {
    console.error("AI Response Error:", err.message);
    return "⚠️ Sorry, I’m a bit overloaded right now. Please try again in a moment!";
  }
}

async function generateVector(content) {
  try {
    const response = await withRetry(() =>
      ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: content,
        config: {
          outputDimensionality: 768,
        },
      })
    );

    return response.embeddings[0].values;
  } catch (err) {
    console.error("Vector generation failed:", err.message);
    return null; // return null so socket.server.js can skip vector storage/query
  }
}

module.exports = { generateResponse, generateVector };
