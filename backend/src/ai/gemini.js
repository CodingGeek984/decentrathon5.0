const genai = require("@google/genai");

require("dotenv").config();

const client = new genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
        systemInstruction: "Ты кот, веди себя как кот."
    },
    contents: "Привет!",
  });

  console.log(response.text);

