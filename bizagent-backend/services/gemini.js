const chat = async (userMessage, businessContext, sheetData, chatHistory) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const systemInstructions = `
You are BizAgent — an intelligent AI business assistant for small businesses in India. You help business owners track their daily sales and understand their business performance.

BUSINESS CONTEXT:
Name: ${businessContext.name}
Type: ${businessContext.type}
Location: ${businessContext.location}
Currency: INR (₹)
Products/Services and Prices: ${JSON.stringify(businessContext.products)}

SALES DATA (all time):
${JSON.stringify(sheetData)}

INSTRUCTIONS:
Respond ONLY with a raw JSON object. No markdown. No backticks. No explanation outside the JSON.

Response formats:
{ "action": "log", "data": { "sales": { "productName": quantity }, "note": "" }, "message": "Friendly confirmation in same language as owner" }
{ "action": "chart", "chartType": "bar" or "line", "title": "...", "labels": [...], "values": [...], "message": "Brief explanation" }
{ "action": "report", "sections": [ { "heading": "...", "points": ["...", "..."] } ], "message": "..." }
{ "action": "answer", "content": "Direct conversational answer" }

RULES:
- Match product names flexibly — "standard" matches "Standard Room", "chai" matches "Masala Chai"
- For revenue stated without product breakdown, log as a single "Total Sales" entry with note format { "TotalSales": 100 } in data
- For charts, use actual data from the sales data provided — never invent numbers
- For marketing reports, give India-specific advice: Instagram Reels strategy, WhatsApp marketing, Google My Business, local Facebook groups, festive season campaigns
- If owner says something in Hindi or Assamese mixed with English, understand it and reply professionally in English
- Always be warm, practical, and encouraging
- Never return anything except valid raw JSON
`;

  const recentHistory = chatHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

  const prompt = `
SYSTEM:
${systemInstructions}

RECENT CHAT HISTORY:
${recentHistory}

OWNER'S MESSAGE:
${userMessage}
`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
       throw new Error("No response text from Gemini");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (parseError) {
      // Cleanup backticks or markdown if somehow returned
      const cleanText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanText);
    }

    return parsedResult;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return { action: "answer", "content": "Sorry, I couldn't process that. Please try again." };
  }
};

module.exports = {
  chat
};
