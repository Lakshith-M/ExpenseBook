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
    return 'Undefined';
  };

  try {
    // Fetch active categories from local storage to guide the AI
    let activeCategories = [];
    try {
        const stored = localStorage.getItem('expensebook_categories');
        if (stored) activeCategories = JSON.parse(stored);
    } catch(e) {}
    if (activeCategories.length === 0) {
        // Default categories without 'Personal' to avoid fallback dominance
        activeCategories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Salary', 'Undefined'];
    }

    // Send request to our own Vercel backend
    const baseUrl = window.location.hostname === 'localhost' && window.location.protocol === 'http:' 
        ? 'https://expense-book-gamma.vercel.app' // Fallback for capacitor
        : window.location.origin;

    const response = await fetch(`${baseUrl}/api/categorise`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, categories: activeCategories }),
    });
    
    if (!response.ok) {
        let errStr = 'Backend request failed';
        try {
            const errData = await response.json();
            if (errData.error) errStr = errData.error;
        } catch(e) {}
        throw new Error(errStr);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    return { category: data.category, confidence: data.confidence || 1 };
  } catch (err) {
    console.warn("Backend API failed, using local fallback categorizer. Error:", err);
    return { category: localFallback(), confidence: 0.5 };
  }
}
