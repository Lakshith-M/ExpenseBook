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

    // Try models in order — same list as categorise.js
    const modelsToTry = [
      'qwen/qwen3.6-27b',
      'openai/gpt-oss-20b',
      'allam-2-7b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-70b-8192',
      'mixtral-8x7b-32768'
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
      } catch (e2) {
        errors.push({ model: modelName, message: e2.message });
      }
    }
    
    if (!result) {
      return res.status(500).json({ error: "API Failure: " + JSON.stringify(errors) });
    }
    
    let rawContent = result.choices[0]?.message?.content?.trim() || '[]';
    
    // Strip <think>...</think> blocks from reasoning models (qwen, etc.)
    rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Strip markdown code block if model wrapped output
    if (rawContent.startsWith('```')) {
      rawContent = rawContent.replace(/^```(json)?/i, '').replace(/```[\s\S]*$/, '').trim();
    }

    // Find the first '[' and last ']' — extract raw JSON array even if there's preamble text
    const arrStart = rawContent.indexOf('[');
    const arrEnd = rawContent.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
      rawContent = rawContent.substring(arrStart, arrEnd + 1);
    }

    // Extract array if it was wrapped in an object like {"transactions": [...]}
    let parsedTxs = [];
    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed)) {
        parsedTxs = parsed;
      } else {
        for (const key in parsed) {
          if (Array.isArray(parsed[key])) {
            parsedTxs = parsed[key];
            break;
          }
        }
      }
    } catch (parseError) {
      console.error("Failed to parse Groq response:", rawContent.substring(0, 500));
      return res.status(500).json({ error: "Failed to parse AI output as JSON. The AI may have returned an unexpected format." });
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
