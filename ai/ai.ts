export const askAI = async (question: string) => {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct",
      messages: [
        {
          role: "system",
          content:
            "You are an Indian legal advisor. Explain clearly in simple Hindi and English.",
        },
        {
          role: "user",
          content: question,
        },
      ],
    }),
  });

  const data = await res.json();

  return data.choices[0].message.content;
};