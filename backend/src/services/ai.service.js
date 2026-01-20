const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the API with your key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System instruction for ChatNex
const SYSTEM_INSTRUCTION = `
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
`;

/**
 * Helper: retry wrapper for handling rate limits (429) or server issues (503)
 */
async function withRetry(fn, retries = 4, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;

      const status = err?.status || err?.response?.status;
      if (status === 503 || status === 429) {
        console.warn(
          `AI service busy (status ${status}). Retrying in ${delay}ms...`,
        );
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Generates a text response using Gemini 1.5 Flash
 */
async function generateResponse(content) {
  try {
    // Initialize model with system instruction
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await withRetry(() =>
      model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: content }], // Must be an object with 'text' key
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    );

    // .text() is a function that returns the generated string
    return result.response.text();
  } catch (err) {
    console.error("AI Response Error:", err.message);
    return "⚠️ Sorry, I’m a bit overloaded right now. Please try again in a moment!";
  }
}

/**
 * Generates a vector embedding for the given content
 */
async function generateVector(content) {
  try {
    // text-embedding-004 is the current standard for high-quality vectors
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const result = await withRetry(() =>
      model.embedContent({
        content: { parts: [{ text: content }] },
        outputDimensionality: 768,
      }),
    );

    return result.embedding.values;
  } catch (err) {
    console.error("Vector generation failed:", err.message);
    return null;
  }
}

module.exports = { generateResponse, generateVector };
