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

  const { text, categories, instructions } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text in request body' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server' });
  }

  try {
    const groq = new Groq({ apiKey });

    const availableCategoriesStr = Array.isArray(categories) && categories.length > 0 
        ? categories.join(', ') 
        : 'Food, Transport, Utilities, Entertainment, Salary, Undefined';

    const prompt = `You are a specialized bank statement parsing AI. 
Extract all transactions from the following raw text of a bank/credit card statement. 
Ignore all header, footer, balance summaries, and non-transaction text.

For each transaction, determine:
- date: YYYY-MM-DD format
- title: concise description
- amount: positive number
- type: "expense" (debit) or "income" (credit)
- method: "UPI", "Cash", or "Bank" (default to Bank if unknown)
- category: Pick EXACTLY ONE from this list: [${availableCategoriesStr}]. If unsure, use "Undefined".
${instructions ? `
Additional instructions from the user (STRICTLY follow these):
${instructions}
` : ''}
Respond ONLY with a valid JSON array of objects. Do not wrap in markdown or backticks. Just the raw JSON array. Example:
[
  {"date": "2023-10-15", "title": "AMAZON RETAIL", "amount": 1500, "type": "expense", "method": "UPI", "category": "Shopping"}
]

Raw Text:
"""
${text.substring(0, 10000)}
"""`;

    // Fetch available models dynamically from Groq
    let availableModelIds = [];
    try {
      const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const modelsData = await modelsRes.json();
      if (modelsData.data) {
        // Prefer instruct/chat models, exclude embedding/whisper
        availableModelIds = modelsData.data
          .map(m => m.id)
          .filter(id => !id.includes('whisper') && !id.includes('embed'));
      }
    } catch(e) {
      console.warn("Could not fetch model list:", e.message);
    }

    // Fallback order if dynamic fetch fails
    if (availableModelIds.length === 0) {
      availableModelIds = ['llama3-70b-8192', 'mixtral-8x7b-32768', 'llama3-8b-8192', 'gemma2-9b-it'];
    }

    const systemPrompt = `You are a bank statement transaction extractor. You ONLY output valid JSON arrays. Never output explanations, markdown, or any text outside the JSON array.`;

    let result;
    let errors = [];
    
    for (const modelName of availableModelIds) {
      try {
        result = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          model: modelName,
          temperature: 0,
          response_format: { type: 'json_object' }
        });
        // Validate we got something useful before breaking
        const testContent = result.choices[0]?.message?.content?.trim() || '';
        if (testContent.length > 5) break;
      } catch (e2) {
        // Some models don't support response_format — retry without it
        try {
          result = await groq.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            model: modelName,
            temperature: 0,
          });
          const testContent = result.choices[0]?.message?.content?.trim() || '';
          if (testContent.length > 5) break;
          result = null;
        } catch (e3) {
          errors.push({ model: modelName, message: e3.message });
        }
      }
    }
    
    if (!result) {
      return res.status(500).json({ error: "API Failure: " + JSON.stringify(errors) });
    }
    
    let rawContent = result.choices[0]?.message?.content?.trim() || '';
    console.log("Raw AI response (first 600 chars):", rawContent.substring(0, 600));

    // Strategy 1: Strip <think>...</think> blocks (reasoning models like qwen)
    rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Strategy 2: Strip markdown code fences (``` or ```json)
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    // Strategy 3: Try to parse directly
    let parsedTxs = [];
    const tryParse = (str) => {
      try {
        const p = JSON.parse(str);
        if (Array.isArray(p)) return p;
        for (const k in p) { if (Array.isArray(p[k])) return p[k]; }
        return null;
      } catch { return null; }
    };

    parsedTxs = tryParse(rawContent);

    // Strategy 4: Extract first [...] JSON array block
    if (!parsedTxs) {
      const arrMatch = rawContent.match(/\[[\s\S]*\]/);
      if (arrMatch) parsedTxs = tryParse(arrMatch[0]);
    }

    // Strategy 5: Extract first {...} JSON object block
    if (!parsedTxs) {
      const objMatch = rawContent.match(/\{[\s\S]*\}/);
      if (objMatch) parsedTxs = tryParse(objMatch[0]);
    }

    // Strategy 6: Extract all individual {...} objects from text and compose array
    if (!parsedTxs) {
      const singleObjects = [];
      const objRegex = /\{[^{}]*"date"[^{}]*"amount"[^{}]*\}/g;
      let m;
      while ((m = objRegex.exec(rawContent)) !== null) {
        try { singleObjects.push(JSON.parse(m[0])); } catch {}
      }
      if (singleObjects.length > 0) parsedTxs = singleObjects;
    }

    if (!parsedTxs || parsedTxs.length === 0) {
      console.error("All parse strategies failed. Raw content:", rawContent.substring(0, 800));
      return res.status(500).json({ error: "AI returned no parseable transactions. Try a different file or check your instructions." });
    }
    
    // Clean and validate categories against the allowed list
    const validCategoriesList = validCategories(categories);
    parsedTxs = parsedTxs.map(tx => {
      let finalCat = 'Undefined';
      if (tx.category) {
        const match = validCategoriesList.find(c => c.toLowerCase() === tx.category.toLowerCase());
        if (match) finalCat = match;
      }
      return {
        date: tx.date || new Date().toISOString().split('T')[0],
        title: tx.title || 'Unknown Transaction',
        amount: Math.abs(parseFloat(tx.amount)) || 0,
        type: (tx.type && tx.type.toLowerCase() === 'income') ? 'income' : 'expense',
        paymentMethod: (tx.method && ['UPI', 'Cash', 'Bank'].includes(tx.method)) ? tx.method : 'Bank',
        category: finalCat
      };
    }).filter(tx => tx.amount > 0);

    return res.status(200).json(parsedTxs);
  } catch (error) {
    console.error("Vercel Backend Error:", error);
    return res.status(500).json({ error: "API Failure: " + error.message });
  }
}

function validCategories(categories) {
    return (Array.isArray(categories) && categories.length > 0) 
        ? categories 
        : ['Food', 'Transport', 'Utilities', 'Entertainment', 'Salary', 'Undefined'];
}
