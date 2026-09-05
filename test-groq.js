const Groq = require('groq-sdk');
require('dotenv').config();

async function run() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("No API key");
    return;
  }
  
  const groq = new Groq({ apiKey });
  
  try {
    const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const modelsData = await modelsRes.json();
    let availableModelIds = [];
    if (modelsData.data) {
      availableModelIds = modelsData.data
        .map(m => m.id)
        .filter(id => !id.includes('whisper') && !id.includes('embed') && !id.includes('vision'));
    }
    console.log("Models:", availableModelIds);
    
    if (availableModelIds.length === 0) {
      availableModelIds = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    }

    const systemPrompt = `You are a bank statement transaction extractor. You ONLY output valid JSON arrays. Never output explanations, markdown, or any text outside the JSON array.`;
    const prompt = `Test prompt`;
    
    const modelsToTry = availableModelIds.slice(0, 2);
    console.log("Trying:", modelsToTry);
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying ${modelName}...`);
        const result = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          model: modelName,
          temperature: 0,
        });
        
        const testContent = result.choices[0]?.message?.content?.trim() || '';
        console.log(`Success with ${modelName}:`, testContent.substring(0, 100));
        break;
      } catch (e2) {
        console.error(`Failed ${modelName}:`, e2.message);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

run();
