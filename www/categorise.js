// categorise.js – AI category suggestion via OpenAI
/**
 * Calls OpenAI Chat Completion to get a category suggestion.
 * @param {string} text – transaction title/description
 * @returns {Promise<{category:string, confidence:number}>}
 */
export async function getCategory(text) {
  const apiKey = 'YOUR_OPENAI_API_KEY'; // <-- replace with your key
  const prompt = `You are a personal-finance assistant. Return ONLY a short, single word expense category (e.g., Food, Transport, Utilities, Entertainment, Salary, Other) for the following transaction description:\n\n"${text}"`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  });
  if (!response.ok) throw new Error('OpenAI request failed');
  const data = await response.json();
  const category = data.choices[0].message.content.trim();
  return { category, confidence: 1 };
}
