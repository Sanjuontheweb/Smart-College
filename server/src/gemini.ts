import { GoogleGenAI } from '@google/genai';
import { CAMPUS_GROUNDED_FACTS, searchCampusKnowledge } from './knowledgeBase';

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface AskAssistantRequest {
  message: string;
  history?: ChatMessage[];
  userRole?: 'student' | 'faculty' | 'admin';
  userName?: string;
  department?: string;
}

export interface AskAssistantResponse {
  answer: string;
  isDemoMode: boolean;
  groundedFactsUsed: string[];
  suggestedFollowUps: string[];
}

const SYSTEM_INSTRUCTION = `You are "Survive College AI", the official academic and administrative assistant for Smart Campus University.
Your mission is to provide accurate, helpful, and concise assistance to students, faculty, and administrators.

CRITICAL SECURITY & INTEGRITY RULES:
1. ONLY provide official campus facts that exist in the provided GROUNDED KNOWLEDGE BASE.
2. NEVER invent, extrapolate, or hallucinate cabin numbers, mobile numbers, deadlines, or university policies.
3. If an asked question is NOT covered by the Grounded Knowledge Base, politely explain:
   "I do not have official verified records for this specific request. Please contact the Academic Affairs Office in the Administrative Central Block (Suite 101) or check with your Department HOD."
4. Be courteous, professional, and mobile-friendly with concise paragraphs and bullet points.
5. If the user asks about exams, attendance, or cabins, cite the verified details accurately.`;

export async function askCampusAssistant(req: AskAssistantRequest): Promise<AskAssistantResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const matchedFacts = searchCampusKnowledge(req.message);
  const groundedFactTitles = matchedFacts.map(f => f.topic);

  // If no Gemini API key is configured, use the high-fidelity Offline Grounded Engine
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    return generateOfflineGroundedResponse(req.message, matchedFacts);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Construct grounding context from verified facts
    const contextText = matchedFacts.length > 0
      ? matchedFacts.map(f => `[${f.category} - ${f.topic}]\n${f.answer}`).join('\n\n')
      : CAMPUS_GROUNDED_FACTS.map(f => `[${f.category} - ${f.topic}]\n${f.answer}`).join('\n\n');

    const promptWithGrounding = `VERIFIED CAMPUS KNOWLEDGE BASE:
${contextText}

USER INFORMATION:
Name: ${req.userName || 'Student'}
Role: ${req.userRole || 'student'}
Department: ${req.department || 'Computer Science & Engineering'}

USER QUESTION:
${req.message}

Please respond strictly in accordance with your official system instructions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptWithGrounding,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for factual fidelity
      }
    });

    const answer = response.text || "I apologize, but I could not formulate a response at this time.";

    return {
      answer,
      isDemoMode: false,
      groundedFactsUsed: groundedFactTitles,
      suggestedFollowUps: generateFollowUps(req.message)
    };
  } catch (error: any) {
    console.warn('[Gemini Server] API call failed or rate-limited, switching to offline grounding fallback:', error.message);
    const fallback = generateOfflineGroundedResponse(req.message, matchedFacts);
    fallback.answer = `*(Note: Using verified offline campus grounding)*\n\n${fallback.answer}`;
    return fallback;
  }
}

function generateOfflineGroundedResponse(query: string, matchedFacts: ReturnType<typeof searchCampusKnowledge>): AskAssistantResponse {
  const q = query.toLowerCase();

  if (matchedFacts.length > 0) {
    const primary = matchedFacts[0];
    const details = matchedFacts.map(f => `📌 **${f.topic}** (${f.category}):\n${f.answer}`).join('\n\n');
    return {
      answer: `${details}\n\n*Source: Official Smart Campus Handbook & Verified Academic Records.*`,
      isDemoMode: true,
      groundedFactsUsed: matchedFacts.map(f => f.topic),
      suggestedFollowUps: [
        "Where is Dr. Priya Raman's cabin?",
        "What is the shuttle bus schedule?",
        "What are the library hours during exams?",
        "What is the minimum attendance policy?"
      ]
    };
  }

  // Greeting checks
  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return {
      answer: "Hello! I am your Smart Campus AI Assistant. I can help you with faculty cabin locations, exam timetables, shuttle bus schedules, attendance condonation rules, cafeteria hours, and campus resources. How can I assist you today?",
      isDemoMode: true,
      groundedFactsUsed: [],
      suggestedFollowUps: [
        "What is the minimum attendance policy?",
        "Where is Dr. Priya Raman's cabin?",
        "What are the library hours during exams?"
      ]
    };
  }

  // Out of scope or ungrounded inquiry
  return {
    answer: "I do not have official verified records for this specific question in the university catalog. To ensure you receive accurate and authorized information, please visit the Academic Affairs Office in the Administrative Central Block (Suite 101, Ground Floor) during office hours (11:00 AM - 1:00 PM), or contact your Department HOD.",
    isDemoMode: true,
    groundedFactsUsed: [],
    suggestedFollowUps: [
      "Where is the Dean's office?",
      "What are the bus timings?",
      "Tell me about BCS401 course faculty"
    ]
  };
}

function generateFollowUps(query: string): string[] {
  const q = query.toLowerCase();
  if (q.includes('attendance')) {
    return ["What is medical condonation criteria?", "How can I check my current subject percentage?"];
  }
  if (q.includes('cabin') || q.includes('faculty') || q.includes('dr.')) {
    return ["What are Dr. Priya Raman's office hours?", "Where is the CSE Department located?"];
  }
  if (q.includes('bus') || q.includes('shuttle') || q.includes('metro')) {
    return ["When does the last shuttle leave?", "What is Route 2 schedule?"];
  }
  return [
    "What is the minimum attendance policy?",
    "Where is Dr. Priya Raman's cabin?",
    "What are the library hours during exams?"
  ];
}
