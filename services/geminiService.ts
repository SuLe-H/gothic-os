import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, WorldEntry, AppSettings, Contact, ForumPost, ForumComment } from "../types";

// Helper to convert internal message format to GenAI Content format
const formatHistory = (messages: Message[]): Content[] => {
  return messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content } as Part]
  }));
};

const buildSystemInstruction = (
  aiPersona: string, 
  userPersona: string, 
  userName: string,
  worldEntries: WorldEntry[],
  isOfflineMode: boolean,
  targetWordCount: number,
  linkedLoreIds: string[] = []
): string => {
  // Logic: active is master switch.
  // If active is true:
  //    Include if isGlobal is true
  //    OR if ID is in linkedLoreIds
  const activeLore = worldEntries
    .filter(e => e.active && (e.isGlobal || linkedLoreIds.includes(e.id)))
    .map(e => `[${e.title}]: ${e.content}`)
    .join('\n\n');

  // Construct User Context
  let userContext = "";
  if (userName) {
    userContext += `User Name: ${userName}\n`;
  }
  userContext += `User Description: ${userPersona || "The user is a curious traveler."}`;

  const corePersona = aiPersona || "You are a helpful AI assistant.";

  let modeInstruction = "";
  if (isOfflineMode) {
      modeInstruction = `
MODE: NARRATIVE / OFFLINE REALITY (IMPORTANT)
1. You are NOT chatting. You are narrating a story.
2. Output a SINGLE, LONG, CONTINUOUS text block (paragraphs separated by double newlines).
3. Do not be brief. BE VERBOSE. Describe the environment, sensory details, body language, actions, and inner thoughts in great detail.
4. Format: 
   - Use *italics* for inner thoughts. DO NOT use parentheses ().
   - Use **bold** or regular text for actions (context dependent, usually just text).
   - Use "quotes" for dialogue.
   - Combine them fluidly in long paragraphs.
`;
  } else {
      modeInstruction = "Your responses should be conversational bubbles.";
  }

  let lengthInstruction = "";
  if (targetWordCount && targetWordCount > 0) {
      lengthInstruction = `STRICT LENGTH REQUIREMENT: You MUST generate content close to ${targetWordCount} words. Provide enough detail to reach this length.`;
  } else if (isOfflineMode) {
      lengthInstruction = "Write a substantial amount of text. At least 200-300 words unless context demands otherwise.";
  }

  return `
${corePersona}

USER CONTEXT:
${userContext}

WORLD KNOWLEDGE (GRIMOIRE):
${activeLore || "No specific lore active."}

INSTRUCTIONS:
${modeInstruction}
${lengthInstruction}

Strictly adhere to the role defined above. 
`;
};

const getClient = (settings: AppSettings) => {
    const apiKey = settings.apiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing.");

    const clientOptions: any = { apiKey };
    if (settings.baseUrl && settings.baseUrl.trim() !== '') {
        let cleanBaseUrl = settings.baseUrl.replace(/\/+$/, "");
        if (cleanBaseUrl.endsWith("/v1beta")) {
             cleanBaseUrl = cleanBaseUrl.substring(0, cleanBaseUrl.length - "/v1beta".length);
        }
        clientOptions.baseUrl = cleanBaseUrl;
    }
    return new GoogleGenAI(clientOptions);
};

export const sendMessageToGemini = async (
  currentMessage: string | null, 
  history: Message[],
  settings: AppSettings,
  worldEntries: WorldEntry[],
  aiPersona: string,
  userPersona: string,
  userName: string,
  isOfflineMode: boolean = false,
  targetWordCount: number = 0,
  linkedLoreIds: string[] = []
): Promise<string> => {
  try {
    const ai = getClient(settings);
    const systemInstruction = buildSystemInstruction(
        aiPersona, userPersona, userName, worldEntries, isOfflineMode, targetWordCount, linkedLoreIds
    );
    const modelId = settings.modelName || 'gemini-3-flash-preview';
    const pastContent = formatHistory(history);
    
    let contents = [...pastContent];
    if (currentMessage) {
        contents.push({ role: 'user', parts: [{ text: currentMessage }] });
    } else {
        if (contents.length === 0 || contents[contents.length - 1].role === 'model') {
             contents.push({ role: 'user', parts: [{ text: '...' }] });
        }
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      }
    });

    return response.text || "...";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `[Error: ${error.message || 'The spirits are silent.'}]`;
  }
};

export const fetchModels = async (settings: AppSettings): Promise<string[]> => {
    const apiKey = settings.apiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("API Key required to fetch models");

    let baseUrl = "https://generativelanguage.googleapis.com";
    if (settings.baseUrl && settings.baseUrl.trim() !== '') {
        baseUrl = settings.baseUrl.replace(/\/+$/, "");
        if (baseUrl.endsWith("/v1beta")) {
            baseUrl = baseUrl.substring(0, baseUrl.length - "/v1beta".length);
        }
        baseUrl = baseUrl.replace(/\/+$/, "");
    }
    const url = `${baseUrl}/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            throw new Error(`Fetch failed: ${response.status} ${errText}`);
        }
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
            return data.models.map((m: any) => m.name.replace(/^models\//, ''));
        }
        return [];
    } catch (e) {
        console.error("Fetch models error", e);
        throw e;
    }
};

// --- FORUM GENERATION ---

export const generateForumThread = async (
    userDirection: string,
    author: Contact,
    worldEntries: WorldEntry[],
    settings: AppSettings
): Promise<{ title: string; content: string; tags: string[] }> => {
    const ai = getClient(settings);
    
    const activeLore = worldEntries.filter(e => e.active && e.isGlobal).map(e => e.content).join('\n');
    
    const systemInstruction = `
    You are roleplaying as ${author.name}.
    Persona: ${author.aiPersona}
    World Context: ${activeLore}
    
    Task: Create a social media/forum thread.
    Direction from User: "${userDirection || "Something random and interesting about your day or the world."}"
    
    Output strictly valid JSON:
    {
      "title": "Thread Title",
      "content": "Body of the post",
      "tags": ["tag1", "tag2"]
    }
    `;

    const response = await ai.models.generateContent({
        model: settings.modelName || 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: "Generate thread JSON" }] }],
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json"
        }
    });

    return JSON.parse(response.text || "{}");
};

// New function for batch generation
export const generateBatchForumThreads = async (
    tag: string | null,
    availableContacts: Contact[],
    worldEntries: WorldEntry[],
    settings: AppSettings
): Promise<any[]> => {
    const ai = getClient(settings);
    const activeLore = worldEntries.filter(e => e.active && e.isGlobal).map(e => e.content).join('\n');
    
    // Create roster for potential authors
    const roster = availableContacts.map(c => `ID: ${c.id}, Name: ${c.name}, Persona: ${c.aiPersona}`).join('\n');
    
    let direction = "Generate 3 to 8 diverse forum threads.";
    if (tag) {
        direction = `Generate 3 to 8 forum threads specifically related to the topic/tag: "${tag}".`;
    }

    const systemInstruction = `
    You are the engine for a simulated gothic/cyberpunk forum.
    World Context: ${activeLore}

    Available Characters (Authors):
    ${roster || "No specific characters, invent fictional users."}

    Task: ${direction}
    
    Requirements:
    1. Generate between 3 and 8 threads.
    2. Each thread MUST have a title, content, tags.
    3. Each thread MUST have EXACTLY 5 initial comments. 
    4. Pick authors for threads and comments from the Available Characters list if possible, otherwise invent them.
    5. Output strictly a valid JSON Array.
    
    JSON Structure:
    [
      {
        "title": "Title",
        "content": "Content",
        "tags": ["tag1", "tag2"],
        "authorName": "Name",
        "comments": [
           { "authorName": "Commenter Name", "content": "Comment content" }, 
           ... (exactly 5 comments)
        ]
      }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: settings.modelName || 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: "Generate batch threads JSON" }] }],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json"
            }
        });
        const text = response.text || "[]";
        return JSON.parse(text);
    } catch (e) {
        console.error("Batch gen error", e);
        return [];
    }
};

export const generateForumReplies = async (
    threadContext: { title: string; content: string },
    existingComments: ForumComment[],
    userDirection: string,
    availableContacts: Contact[],
    worldEntries: WorldEntry[],
    settings: AppSettings
): Promise<Array<{ authorName: string; content: string; linkedContactId?: string }>> => {
    const ai = getClient(settings);
    const activeLore = worldEntries.filter(e => e.active && e.isGlobal).map(e => e.content).join('\n');
    
    // Create a roster of available personas
    const roster = availableContacts.map(c => `ID: ${c.id}, Name: ${c.name}, Persona: ${c.aiPersona}`).join('\n');
    
    const systemInstruction = `
    You are simulating a forum comment section.
    World Context: ${activeLore}
    
    Thread Title: ${threadContext.title}
    Thread Content: ${threadContext.content}
    
    Previous Comments:
    ${existingComments.map(c => `${c.authorName}: ${c.content}`).join('\n')}
    
    Available Characters:
    ${roster}
    
    Task: Generate 3 to 5 NEW replies/comments.
    
    Output strictly valid JSON array of objects:
    [
      { "authorName": "Name", "content": "The comment", "linkedContactId": "ID_FROM_ROSTER_IF_MATCH" }
    ]
    `;

    const response = await ai.models.generateContent({
        model: settings.modelName || 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: "Generate replies JSON" }] }],
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json"
        }
    });

    return JSON.parse(response.text || "[]");
};