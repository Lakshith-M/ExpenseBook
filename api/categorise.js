import Groq from 'groq-sdk';

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

  const { text, categories } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text in request body' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server' });
  }

  try {
    const groq = new Groq({ apiKey });

    // Backdoor to fetch all active models for this specific API key
    if (text === "FETCH_MODELS") {
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    const availableCategoriesStr = Array.isArray(categories) && categories.length > 0 
        ? categories.join(', ') 
        : 'Food, Transport, Utilities, Entertainment, Salary, Undefined';

    const prompt = `You are a personal-finance assistant. Return ONLY a short, single word expense category for the following transaction description:\n\n"${text}"\n\nYou MUST choose exactly one category from this exact list: ${availableCategoriesStr}\n\nIf the transaction is random, unclear, or you are unsure, return exactly the word "Undefined".`;
    
    const modelsToTry = [
      'qwen/qwen3.6-27b',
      'openai/gpt-oss-20b',
      'allam-2-7b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];
    
    let result;
    let errors = [];
    
    for (const modelName of modelsToTry) {
      try {
        result = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: modelName,
          temperature: 0,
        });
        break;
      } catch (e) {
        errors.push({ model: modelName, message: e.message });
      }
    }
    
    if (!result) {
      return res.status(500).json({ error: "API Failure: " + JSON.stringify(errors) });
    }
    
    let category = result.choices[0]?.message?.content?.trim() || 'Undefined';
    // Reasoning models output <think>...</think> blocks, we must strip them!
    category = category.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Also remove any generic preamble if present
    category = category.replace(/^.*category is:?\s*/i, '').trim();
    // Remove punctuation
    category = category.replace(/[^a-zA-Z ]/g, '').trim();

    // Enforce selection from available categories
    let finalCategory = 'Undefined';
    const validCategories = (Array.isArray(categories) && categories.length > 0) 
        ? categories 
        : ['Food', 'Transport', 'Utilities', 'Entertainment', 'Salary', 'Undefined'];
        
    const match = validCategories.find(c => c.toLowerCase() === category.toLowerCase());
    if (match) {
        finalCategory = match;
    }
    
    return res.status(200).json({ category: finalCategory, confidence: 1 });
  } catch (error) {
    console.error("Vercel Backend Error:", error);
    return res.status(500).json({ error: "API Failure: " + error.message });
  }
}
