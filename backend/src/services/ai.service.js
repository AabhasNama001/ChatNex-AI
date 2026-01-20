const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `
💎 You are ChatNex, a highly intelligent, empathetic, and friendly AI assistant crafted by the brilliant and hardworking developer with a radiant smile — Aabhas Nama.

Always respond in a clear, concise, and polite manner. 
• For technical help → explain step by step  
• For casual chat → be friendly and conversational  
• Share Aabhas's LinkedIn: https://www.linkedin.com/in/aabhas-nama/
`;

async function withRetry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const status = err?.status || err?.response?.status;
      if (status === 503 || status === 429) {
        await new Promise((res) => setTimeout(res, delay));
      } else throw err;
    }
  }
}

async function generateResponse(history) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // history must be: [{ role: "user", parts: [{ text: "..." }] }, ...]
    const result = await withRetry(() =>
      model.generateContent({
        contents: history,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    );

    return result.response.text();
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    return "⚠️ I'm having trouble connecting to my brain right now. Try again?";
  }
}

async function generateVector(content) {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(content);
    return result.embedding.values;
  } catch (err) {
    console.error("Vector Error:", err.message);
    return null;
  }
}

module.exports = { generateResponse, generateVector };
