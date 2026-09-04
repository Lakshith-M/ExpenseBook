import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text in request body' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
  }

  try {
    const prompt = `You are a personal-finance assistant. Return ONLY a short, single word expense category (e.g., Food, Transport, Utilities, Entertainment, Salary, Other) for the following transaction description:\n\n"${text}"`;
    
    const genAI = new GoogleGenerativeAI(apiKey);
    let model;
    let result;
    
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.0-pro"];
    let errors = [];
    
    for (const modelName of modelsToTry) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(prompt);
        break; // If successful, exit the loop
      } catch (e) {
        errors.push({ model: modelName, message: e.message });
      }
    }
    
    if (!result) {
      return res.status(500).json({ error: "API Failure: " + JSON.stringify(errors) });
    }
    
    const responseText = result.response.text();
    
    let category = responseText.trim();
    category = category.replace(/[^a-zA-Z]/g, '');
    
    return res.status(200).json({ category, confidence: 1 });
  } catch (error) {
    console.error("Vercel Backend Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
