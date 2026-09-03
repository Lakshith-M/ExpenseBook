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

  const apiKey = localStorage.getItem('expensebook_openai_key');
  if (!apiKey) {
    return { category: localFallback(), confidence: 0.8 };
  }

  try {
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
    if (data.error) throw new Error(data.error.message);
    
    const category = data.choices[0].message.content.trim();
    return { category, confidence: 1 };
  } catch (err) {
    console.warn("OpenAI API failed, using local fallback categorizer. Error:", err);
    return { category: localFallback(), confidence: 0.5 };
  }
}
