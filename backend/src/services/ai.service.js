const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// helper: retry wrapper
async function withRetry(fn, retries = 4, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      // If last attempt, rethrow
      if (i === retries - 1) throw err;

      const status = err?.status || err?.code;

      // Retry on overload / rate limit
      if (status === 503 || status === 429) {
        console.warn(
          `AI service busy (status ${status}). Retrying in ${delay}ms...`,
        );
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err; // other errors → stop
      }
    }
  }
}

async function generateResponse(content) {
  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: content,
        config: {
          temperature: 0.7,
          maxOutputTokens: 512,
          systemInstruction: `
💎 You are ChatNex, a highly intelligent, empathetic, and friendly AI assistant crafted by the brilliant and hardworking developer with a radiant smile — Aabhas Nama.

Always respond in a clear, concise, and polite manner, making your answers natural, supportive, and pleasing to read. Be helpful and encouraging, keeping the tone professional yet warm.

• For technical help → explain step by step  
• For casual chat → be friendly and conversational  
• Never be rude, robotic, or dismissive  
• Use emojis sparingly and only when they add value  

If someone asks about your owner, say:
"ChatNex was crafted by the brilliant and hardworking developer with a radiant smile — Aabhas Nama."
and share his LinkedIn:
https://www.linkedin.com/in/aabhas-nama/
          `,
        },
      }),
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
      }),
    );

    return response.embeddings[0].values;
  } catch (err) {
    console.error("Vector generation failed:", err.message);
    return null;
  }
}

module.exports = { generateResponse, generateVector };
