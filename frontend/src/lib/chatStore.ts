// Local chat history store. Replace with a Supabase `chats` + `messages` table later.
export type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: number };
export type Chat = { id: string; title: string; messages: Message[]; createdAt: number; updatedAt: number };

const KEY = (userId: string) => `nyaya-chats:${userId}`;

export function loadChats(userId: string): Chat[] {
  try {
    const raw = localStorage.getItem(KEY(userId));
    return raw ? (JSON.parse(raw) as Chat[]) : [];
  } catch {
    return [];
  }
}

export function saveChats(userId: string, chats: Chat[]) {
  localStorage.setItem(KEY(userId), JSON.stringify(chats));
}

export function newChat(): Chat {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: "New conversation", messages: [], createdAt: now, updatedAt: now };
}

// Mock assistant. Swap with a backend call to your AI API later.
export async function mockAssistantReply(userText: string, language: "en" | "hi"): Promise<string> {
  await new Promise((r) => setTimeout(r, 700));
  const disclaimer =
    language === "hi"
      ? "\n\n_नोट: मैं एक AI सहायक हूँ, वकील का विकल्प नहीं। महत्वपूर्ण मामलों में अधिवक्ता से परामर्श करें।_"
      : "\n\n_Note: I am an AI assistant, not a substitute for a lawyer. Please consult an advocate for important matters._";

  const intro =
    language === "hi"
      ? `आपके प्रश्न "${userText.slice(0, 80)}" के संदर्भ में, संभावित रूप से लागू कानून:`
      : `Regarding your question "${userText.slice(0, 80)}", potentially relevant Indian laws:`;

  const body =
    language === "hi"
      ? "\n• भारतीय न्याय संहिता, 2023 / IPC के संबंधित प्रावधान\n• उपभोक्ता संरक्षण अधिनियम, 2019\n• सूचना का अधिकार अधिनियम, 2005\n\nसुझाए गए कदम:\n1. संबंधित दस्तावेज़ एकत्र करें\n2. निकटतम पुलिस स्टेशन या उपभोक्ता फोरम में शिकायत दर्ज करें\n3. कानूनी सलाह के लिए स्थानीय अधिवक्ता से संपर्क करें"
      : "\n• Bharatiya Nyaya Sanhita, 2023 / relevant IPC sections\n• Consumer Protection Act, 2019\n• Right to Information Act, 2005\n\nSuggested steps:\n1. Gather all relevant documents and evidence\n2. File a written complaint at the appropriate forum (police station, consumer court, etc.)\n3. Consult a local advocate for personalized legal advice";

  return intro + body + disclaimer;
}
