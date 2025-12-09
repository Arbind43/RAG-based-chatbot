export async function askGemini(
  apiKey: string,
  documentText: string,
  question: string
): Promise<string> {
  const prompt = `You are a helpful assistant. Answer the following question strictly using the given document. 
If the answer cannot be found, say "I couldn't find relevant information in the provided document."

Document:
${documentText}

Question:
${question}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to get response from Gemini");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to communicate with Gemini API"
    );
  }
}
