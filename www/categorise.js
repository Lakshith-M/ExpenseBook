// categorise.js – AI category suggestion via OpenAI
/**
 * Calls OpenAI Chat Completion to get a category suggestion.
 * @param {string} text – transaction title/description
 * @returns {Promise<{category:string, confidence:number}>}
 */
export async function getCategory(text) {
  const localFallback = () => {
    const t = text.toLowerCase();
    if (t.includes('zomato') || t.includes('swiggy') || t.includes('food') || t.includes('lunch') || t.includes('coffee') || t.includes('tea') || t.includes('dinner') || t.includes('restaurant') || t.includes('pizza') || t.includes('burger')) return 'Food';
    if (t.includes('uber') || t.includes('ola') || t.includes('petrol') || t.includes('fuel') || t.includes('ticket') || t.includes('train') || t.includes('flight') || t.includes('bus') || t.includes('transport') || t.includes('auto') || t.includes('cab')) return 'Transport';
    if (t.includes('bill') || t.includes('electricity') || t.includes('water') || t.includes('internet') || t.includes('wifi') || t.includes('recharge') || t.includes('utilities') || t.includes('phone') || t.includes('mobile')) return 'Utilities';
    if (t.includes('movie') || t.includes('netflix') || t.includes('amazon') || t.includes('prime') || t.includes('spotify') || t.includes('game') || t.includes('entertainment') || t.includes('cinema') || t.includes('music')) return 'Entertainment';
    if (t.includes('salary') || t.includes('bonus') || t.includes('freelance') || t.includes('wage') || t.includes('income') || t.includes('pay')) return 'Salary';
    return 'Personal';
  };

  const apiKey = localStorage.getItem('expensebook_gemini_key');
  if (!apiKey) {
    return { category: localFallback(), confidence: 0.8 };
  }

  try {
    const prompt = `You are a personal-finance assistant. Return ONLY a short, single word expense category (e.g., Food, Transport, Utilities, Entertainment, Salary, Other) for the following transaction description:\n\n"${text}"`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0 },
      }),
    });
    
    if (!response.ok) throw new Error('Gemini request failed');
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    let category = data.candidates[0].content.parts[0].text.trim();
    // Sometimes Gemini adds periods or newlines, so we clean it up
    category = category.replace(/[^a-zA-Z]/g, '');
    return { category, confidence: 1 };
  } catch (err) {
    console.warn("Gemini API failed, using local fallback categorizer. Error:", err);
    return { category: localFallback(), confidence: 0.5 };
  }
}
