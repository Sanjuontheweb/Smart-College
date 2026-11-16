import * as FileSystem from 'expo-file-system/legacy';
import pako from 'pako';
import SecureStorage from './secureStorage';
import { FACULTY_DIRECTORY, CAMPUS_SERVICES, SAMPLE_TIMETABLE, SAMPLE_ATTENDANCE } from '@/constants/CampusData';

export interface ChatAttachment {
  uri: string;
  name: string;
  type: 'image' | 'document';
  mimeType?: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelUsed?: string;
  isRateLimited?: boolean;
  citations?: string[];
  attachments?: ChatAttachment[];
}

export interface AIModelOption {
  id: string;
  name: string;
  provider: string;
  tag: string;
  contextLength: string;
  description: string;
}

export const FREE_AI_MODELS: AIModelOption[] = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'OpenAI GPT-OSS (120B)',
    provider: 'OpenAI · Groq Cloud',
    tag: 'Recommended • Flagship',
    contextLength: '131k',
    description: 'Flagship open-weight 120B reasoning model with deep analysis and campus knowledge.',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI GPT-OSS (20B)',
    provider: 'OpenAI · Groq Cloud',
    tag: 'Ultra-Fast • ~1000 tps',
    contextLength: '131k',
    description: 'Blazing fast MoE model engineered for instant campus answers and coding tips.',
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 (27B)',
    provider: 'Alibaba · Groq Cloud',
    tag: 'Multimodal • Reasoning',
    contextLength: '131k',
    description: 'Active 27B vision and reasoning model with deep academic and instruction comprehension.',
  },
  {
    id: 'deepseek-r1-distill-qwen-32b',
    name: 'DeepSeek R1 (32B)',
    provider: 'DeepSeek · Groq Cloud',
    tag: 'Math & Logic • Specialist',
    contextLength: '131k',
    description: 'Distilled reasoning model engineered for engineering, mathematics, algorithms, and logic.',
  },
];

export class AIRateLimitError extends Error {
  isRateLimited = true;
  constructor(message = 'Rate limit reached on this model. Please switch to another model.') {
    super(message);
    this.name = 'AIRateLimitError';
  }
}

export class AIOfflineError extends Error {
  isOffline = true;
  constructor(message = 'Device is offline. Online AI requires an active internet connection.') {
    super(message);
    this.name = 'AIOfflineError';
  }
}

/**
 * Get the currently configured AI access token (Groq or Hugging Face).
 */
export async function getHuggingFaceToken(): Promise<string> {
  const groqStored = await SecureStorage.getItem('GROQ_TOKEN');
  if (groqStored && groqStored.trim().length > 0) return groqStored.trim();

  const hfStored = await SecureStorage.getItem('HF_TOKEN');
  if (hfStored && hfStored.trim().length > 0) return hfStored.trim();

  const envGroq = process.env.EXPO_PUBLIC_GROQ_TOKEN || '';
  if (envGroq.trim().length > 0) return envGroq.trim();

  const envHf = process.env.EXPO_PUBLIC_HF_TOKEN || '';
  return envHf.trim();
}

export function sanitizeApiKey(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip invisible zero-width chars
    .replace(/^["'`]|["'`]$/g, '') // strip wrapping quotes
    .replace(/[\r\n\t]/g, '') // strip line breaks
    .trim();
}

/**
 * Save user-entered AI token (supports Groq gsk_... or Hugging Face hf_...)
 */
export async function saveHuggingFaceToken(token: string): Promise<void> {
  const clean = sanitizeApiKey(token);
  await SecureStorage.setItem('GROQ_TOKEN', clean);
  await SecureStorage.setItem('HF_TOKEN', clean);
}

export async function getGroqToken(): Promise<string> {
  return getHuggingFaceToken();
}

export async function saveGroqToken(token: string): Promise<void> {
  return saveHuggingFaceToken(token);
}

/**
 * Assemble grounding system prompt for Survive College
 */
function buildCollegeSystemPrompt(userName: string, userRole: string): string {
  const facultySummary = FACULTY_DIRECTORY.map(
    (f) => `• ${f.name} (${f.designation}): Cabin ${f.cabin}, Hours: ${f.officeHours}, Subjects: ${f.subjects.join(', ')}`
  ).join('\n');

  const timetableSummary = SAMPLE_TIMETABLE.slice(0, 5)
    .map((t) => `• ${t.day} ${t.startTime}-${t.endTime}: ${t.courseCode} (${t.courseTitle}) in ${t.room}`)
    .join('\n');

  return `You are the official AI Academic Companion for "Survive College", a mobile application for students, faculty, and administration.
Active User: ${userName} (Role: ${userRole}).

CAMPUS GROUNDING KNOWLEDGE:
1. University Attendance Regulation: Mandatory 75% minimum attendance per course. 65%-74% condonable with medical certificate to HOD within 7 days. Below 65% is detained.
2. Faculty Directory:
${facultySummary}
3. Timetable Schedule:
${timetableSummary}
4. Campus Services:
• Shuttle buses: Route 1 (Metro to Main Gate, 15m freq), Route 2 (Hostels to Turing Block).
• Central Library: 8:00 AM - 9:30 PM (extended to 11:30 PM in exam weeks). 4 books limit for UG.
• Health Center: Ground Floor, Hostel Block A (24x7 doctor, emergency phone +91 98765 00108).
5. Examination Schedule: Mid-Sem exams start Nov 18, 2026. Hall tickets available on portal for students >=75% attendance.

ROLE & STYLE:
- Give thorough, accurate, and encouraging answers with a subtle gaming/survival aesthetic ("Survive & thrive in college!").
- You can answer ANYTHING: campus inquiries, engineering coursework, algorithms, DBMS, operating systems, coding questions, study schedules, exam preparation, or general life/technical topics.
- Keep formatting clean with bullet points and bold headers.`;
}

/**
 * Send query to AI Online Inference (Groq high-speed free API with HF fallback)
 */
export async function askSmartCampusAI(params: {
  message: string;
  history: ChatMessage[];
  userName: string;
  userRole: string;
  modelId?: string;
  attachments?: ChatAttachment[];
}): Promise<ChatMessage> {
  let model = params.modelId || FREE_AI_MODELS[0].id;
  const hasAttachments = params.attachments && params.attachments.length > 0;
  // If user attached an image or document, route to multimodal vision model
  if (hasAttachments) {
    model = 'qwen/qwen3.8-27b';
  }
  // Automatically remap deprecated/decommissioned models to active Groq models
  const legacyRemap: Record<string, string> = {
    'mixtral-8x7b-32768': 'openai/gpt-oss-120b',
    'gemma2-9b-it': 'openai/gpt-oss-20b',
    'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
  };
  if (legacyRemap[model]) {
    model = legacyRemap[model];
  }

  const rawToken = await getHuggingFaceToken();
  const token = sanitizeApiKey(rawToken);

  if (!token) {
    throw new Error('GROQ_AUTH_REQUIRED');
  }

  const systemPrompt = buildCollegeSystemPrompt(params.userName, params.userRole);

  // Build user message content, handling multiple multimodal attachments
  let userContent: any = params.message;
  if (hasAttachments && params.attachments) {
    const contentParts: any[] = [];
    let docTexts = '';

    for (const att of params.attachments) {
      const isImg = att.type === 'image' || att.mimeType?.startsWith('image/');
      if (isImg) {
        try {
          const base64Data = await readFileAsBase64Safe(att.uri);
          const mime = att.mimeType || 'image/jpeg';
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: `data:${mime};base64,${base64Data}`,
            },
          });
        } catch (err) {
          console.warn('[AI] Failed to read image attachment as base64:', err);
        }
      } else {
        // Document / PDF handling
        try {
          let textExtracted = '';
          const base64 = await readFileAsBase64Safe(att.uri).catch(() => '');

          if (base64) {
            textExtracted = extractTextFromPdfContent('', base64);
          }

          if (!textExtracted) {
            try {
              const rawContent = await FileSystem.readAsStringAsync(att.uri, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              textExtracted = extractTextFromPdfContent(rawContent, base64);
            } catch {
              // fallback handled above
            }
          }

          if (textExtracted && textExtracted.length > 20) {
            docTexts += `\n\n[DOCUMENT CONTENT FROM ATTACHED FILE "${att.name}"]:\n"""\n${textExtracted.slice(0, 7000)}\n"""\n(Note: The user explicitly provided the above text from ${att.name}. Analyze and evaluate it thoroughly according to the user prompt.)`;
          } else {
            docTexts += `\n\n[USER ATTACHED DOCUMENT: "${att.name}"]\n(The user attached this document file. If detailed content is unparsed due to binary compression, ask them to paste key excerpts if needed, but analyze any information available).`;
          }
        } catch {
          docTexts += `\n\n[Attached File: ${att.name} (Academic Document/CV attached by user)]`;
        }
      }
    }

    const promptText = `${params.message || 'Please review the attached files.'}${docTexts}`;
    if (contentParts.length > 0) {
      // Multimodal payload with text + image parts
      userContent = [{ type: 'text', text: promptText }, ...contentParts];
    } else {
      userContent = promptText;
    }
  }

  const conversationMessages = [
    { role: 'system', content: systemPrompt },
    ...params.history.slice(-6).map((h) => ({
      role: h.sender === 'user' ? 'user' : 'assistant',
      content: typeof h.text === 'string' ? h.text : '',
    })),
    { role: 'user', content: userContent },
  ];

  // 1. If Groq token (gsk_...) or recognized Groq model, call Groq Cloud directly
  const isGroq = token.startsWith('gsk_') || FREE_AI_MODELS.some((m) => m.id === model);

  if (isGroq) {
    let groqModel = FREE_AI_MODELS.some((m) => m.id === model) ? model : 'openai/gpt-oss-120b';

    const callGroq = async (targetModel: string) => {
      return fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: conversationMessages,
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });
    };

    try {
      let response = await callGroq(groqModel);

      // Auto-fallback if the requested model returns 404 or decommissioned error
      if (response.status === 404 || response.status === 400) {
        const errCopy = await response.clone().json().catch(() => null);
        const errMsg = errCopy?.error?.message || '';
        if (
          errMsg.includes('does not exist') ||
          errMsg.includes('decommissioned') ||
          errMsg.includes('not have access')
        ) {
          groqModel = 'openai/gpt-oss-120b';
          response = await callGroq(groqModel);
        }
      }

      if (response.status === 401 || response.status === 403) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || 'Invalid Groq API key';
        throw new Error(`GROQ_AUTH_REQUIRED: ${errMsg}`);
      }

      if (response.status === 429) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || 'Rate limit reached on Groq';
        throw new AIRateLimitError(`Rate limit reached on ${groqModel}. ${errMsg}`);
      }

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return {
            id: `msg_ai_${Date.now()}`,
            sender: 'assistant',
            text: content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            modelUsed: groqModel,
          };
        }
      } else {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || (await response.text().catch(() => ''));
        throw new Error(`Groq API Error (${response.status}): ${errMsg || 'Unexpected error'}`);
      }
    } catch (e: any) {
      if (
        e instanceof AIRateLimitError ||
        e.message?.startsWith('GROQ_AUTH_REQUIRED') ||
        e.message?.startsWith('Groq API Error')
      ) {
        throw e;
      }
      // If the user's token is a Groq key (gsk_...), do NOT fallback to Hugging Face
      if (token.startsWith('gsk_')) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 4000);
          await fetch('https://1.1.1.1', { method: 'HEAD', signal: ctrl.signal });
          clearTimeout(tid);
        } catch {
          throw new AIOfflineError();
        }
        throw new Error(`Unable to reach Groq Cloud: ${e.message || 'Network error'}. Please check your connection.`);
      }
    }
  }

  // 2. Fallback to Hugging Face Inference Endpoints ONLY if token is not a Groq key
  const endpoints = [
    `https://router.huggingface.co/hf-inference/models/${model}/v1/chat/completions`,
    `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`,
    `https://api-inference.huggingface.co/models/${model}`,
  ];

  let lastError: any = null;

  for (const url of endpoints) {
    try {
      const isChatCompletion = url.includes('/v1/chat/completions');
      const body = isChatCompletion
        ? JSON.stringify({
            model,
            messages: conversationMessages,
            max_tokens: 2048,
            temperature: 0.7,
          })
        : JSON.stringify({
            inputs: `${systemPrompt}\n\nUser: ${params.message}\nAssistant:`,
            parameters: { max_new_tokens: 2048, return_full_text: false },
          });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      if (response.status === 429) {
        throw new AIRateLimitError(
          `Free-tier token limit / rate limit reached on ${model}. Please switch models or wait a moment.`
        );
      }

      if (response.ok) {
        const data = await response.json();
        let answerText = '';

        if (isChatCompletion && data.choices && data.choices[0]?.message?.content) {
          answerText = data.choices[0].message.content.trim();
        } else if (Array.isArray(data) && data[0]?.generated_text) {
          answerText = data[0].generated_text.trim();
        } else if (data.generated_text) {
          answerText = data.generated_text.trim();
        }

        if (answerText) {
          return {
            id: `msg_ai_${Date.now()}`,
            sender: 'assistant',
            text: answerText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            modelUsed: model,
          };
        }
      } else {
        const errText = await response.text();
        if (response.status === 503 || response.status === 504) {
          continue;
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('HF_AUTH_REQUIRED');
        }
        if (response.status === 402 || response.status === 404) {
          continue;
        }
        if (errText.toLowerCase().includes('rate limit') || errText.toLowerCase().includes('quota')) {
          throw new AIRateLimitError(`Rate limit reached on ${model}. Switch model.`);
        }
        lastError = new Error(`API error ${response.status}: ${errText.slice(0, 120)}`);
        continue;
      }
    } catch (e: any) {
      if (e instanceof AIRateLimitError || e.message === 'HF_AUTH_REQUIRED') throw e;
      lastError = e;
      continue;
    }
  }

  // All endpoints failed — check if device actually has connectivity
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 4000);
    await fetch('https://1.1.1.1', { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(tid);
  } catch {
    throw new AIOfflineError();
  }

  // Device is online but servers unreachable
  const lastMsg = lastError?.message ?? 'All endpoints failed.';
  throw new Error(
    `Unable to reach AI servers (${lastMsg.slice(0, 80)}). Please use a free Groq API key from console.groq.com for instant responses without DNS blocks.`
  );
}

/**
 * Helper to extract plain text from simple PDF structures
 */
/**
 * Helper to decompress and extract readable text from PDF streams (including FlateDecode streams like WhatsApp / Canva CVs)
 */
function extractTextFromPdfContent(rawContent: string, base64Buffer?: string): string {
  let combinedText = '';

  // 1. Try decompressing internal FlateDecode streams using pako if binary/base64 is present
  try {
    let bytes: Uint8Array | null = null;
    if (base64Buffer) {
      const binaryStr = typeof atob === 'function' ? atob(base64Buffer) : Buffer.from(base64Buffer, 'base64').toString('binary');
      bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
    }

    if (bytes) {
      let pos = 0;
      const streamNeedleCrLf = [0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x0d, 0x0a]; // 'stream\r\n'
      const streamNeedleLf = [0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x0a]; // 'stream\n'
      const endstreamNeedle = [0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]; // 'endstream'

      const findSubarray = (arr: Uint8Array, needle: number[], startIdx: number) => {
        for (let i = startIdx; i <= arr.length - needle.length; i++) {
          let match = true;
          for (let j = 0; j < needle.length; j++) {
            if (arr[i + j] !== needle[j]) {
              match = false;
              break;
            }
          }
          if (match) return i;
        }
        return -1;
      };

      while (pos < bytes.length) {
        let sPos = findSubarray(bytes, streamNeedleCrLf, pos);
        let headerLen = 8;
        if (sPos === -1) {
          sPos = findSubarray(bytes, streamNeedleLf, pos);
          headerLen = 7;
        }
        if (sPos === -1) break;

        const start = sPos + headerLen;
        const ePos = findSubarray(bytes, endstreamNeedle, start);
        if (ePos === -1) break;

        let sliceEnd = ePos;
        while (sliceEnd > start && (bytes[sliceEnd - 1] === 0x0d || bytes[sliceEnd - 1] === 0x0a)) {
          sliceEnd--;
        }

        const streamSlice = bytes.subarray(start, sliceEnd);
        try {
          const decomp = pako.inflate(streamSlice);
          let decompStr = '';
          for (let k = 0; k < decomp.length; k++) {
            decompStr += String.fromCharCode(decomp[k]);
          }

          // 1. Parse TJ arrays: [(text1) -20 (text2)] TJ
          const tjMatches = decompStr.match(/\[(.*?)\]\s*TJ/gs);
          if (tjMatches) {
            for (const item of tjMatches) {
              const parts = item.match(/\((.*?)\)/g);
              if (parts) {
                combinedText += parts.map((p) => p.slice(1, -1)).join('') + ' ';
              }
            }
          }

          // 2. Parse simple Tj: (text) Tj
          const simpleTj = decompStr.match(/\((.*?)\)\s*Tj/gs);
          if (simpleTj) {
            for (const item of simpleTj) {
              const p = item.match(/\((.*?)\)/);
              if (p && p[1]) combinedText += p[1] + ' ';
            }
          }

          // 3. Fallback: parenthetical text if neither TJ nor Tj matched
          if (!tjMatches && !simpleTj) {
            const matches = decompStr.match(/\(([^)]+)\)/g);
            if (matches && matches.length > 0) {
              const streamWords = matches
                .map((s) => s.slice(1, -1))
                .filter((s) => !['en-US', 'Calibri-Bold', 'Calibri', 'Arial', 'TimesNewRoman'].includes(s));
              if (streamWords.length > 0) {
                combinedText += streamWords.join(' ') + ' ';
              }
            }
          }
        } catch {
          // Stream was uncompressed or font binary, skip
        }

        pos = ePos + 9;
      }
    }
  } catch (err) {
    console.warn('[PDF] Pako stream decompression error:', err);
  }

  if (combinedText.trim().length > 50) {
    return combinedText.replace(/\s+/g, ' ').trim();
  }

  // 2. Standard PDF Tj / TJ extraction on raw content
  const textMatches: string[] = [];
  const tjRegex = /\(([^)]+)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(rawContent)) !== null) {
    textMatches.push(match[1]);
  }
  
  const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(rawContent)) !== null) {
    const inner = match[1];
    const strRegex = /\(([^)]+)\)/g;
    let sMatch;
    while ((sMatch = strRegex.exec(inner)) !== null) {
      textMatches.push(sMatch[1]);
    }
  }

  return textMatches.join(' ').replace(/\\[nrtbf\\]/g, ' ').trim();
}

/**
 * Helper to safely read a file as Base64 across Android content:// and file:// schemes
 */
async function readFileAsBase64Safe(uri: string): Promise<string> {
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (fsErr) {
    // Attempt copying to internal cache directory first
    try {
      const safeTemp = `${FileSystem.cacheDirectory}temp_b64_${Date.now()}.bin`;
      await FileSystem.copyAsync({ from: uri, to: safeTemp });
      const b64 = await FileSystem.readAsStringAsync(safeTemp, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.deleteAsync(safeTemp, { idempotent: true });
      return b64;
    } catch {
      // Fallback to fetch/blob
      try {
        const res = await fetch(uri);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const resultStr = (reader.result as string) || '';
              const b64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
              resolve(b64);
            } catch (e) {
              reject(e);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (blobErr) {
        console.warn('[AI] All base64 read attempts failed for uri:', uri, blobErr);
        return '';
      }
    }
  }
}

/**
 * Requirement #7: Real AI Document Analysis for Timetable (PNG / PDF)
 * Uses Groq's multimodal vision model (qwen/qwen3.8-27b) or reasoning model
 * to verify if the uploaded document is a legitimate academic timetable,
 * extract actual lecture/lab slots, and generate realistic doubts.
 */
export async function analyzeTimetableDocument(
  fileUri: string,
  mimeType: string
): Promise<{
  classes: any[];
  doubts: string[];
  summary: string;
}> {
  const token = await getGroqToken();
  if (!token) {
    throw new Error(
      'Groq API key required for AI document analysis. Please save your free Groq key (gsk_...) in the AI Assistant tab first.'
    );
  }

  let base64Data = '';
  let extractedPdfText = '';
  const isPdf = mimeType.includes('pdf') || fileUri.toLowerCase().endsWith('.pdf');

  try {
    base64Data = await readFileAsBase64Safe(fileUri);
    if (isPdf) {
      try {
        const rawContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        extractedPdfText = extractTextFromPdfContent(rawContent, base64Data);
      } catch {
        extractedPdfText = extractTextFromPdfContent('', base64Data);
      }
    }
  } catch (e: any) {
    console.warn('[AI] Error reading file for OCR:', e);
    throw new Error('Unable to read the uploaded document file. Please upload a clear image or PDF.');
  }

  const promptText = `You are an expert college academic schedule analyzer.
TASK:
1. Examine this uploaded document (which claims to be a College Timetable).
2. Determine if it is a LEGITIMATE college / university timetable (showing days, times, courses/subjects, rooms, or faculty).
3. If it is NOT a legitimate timetable, set "isLegitimate": false and explain in "rejectionReason".
4. If it IS a legitimate timetable, set "isLegitimate": true, and EXTRACT EVERY SINGLE SCHEDULE SLOT across ALL days (Monday, Tuesday, Wednesday, Thursday, Friday, and Saturday if present).

CRITICAL EXTRACTION & OCR REFINEMENT RULES:
- BREAKS / RECESS HANDLING: Columns or rows indicating Tea Break (e.g. 10:45 - 11:00 AM), Short Break, Lunch Break (e.g. 13:00 - 13:45 / 1:00 - 1:45 PM), or Recess are NOT teaching subjects. Do NOT create classes for them. Instead, use them to accurately determine the exact start and end times of the periods before and after them (e.g. Period 2 ends at 10:45 AM, Period 3 starts at 11:00 AM; Period 4 ends at 1:00 PM, Period 5 starts at 1:45 PM)!
- FULL DAY COVERAGE & END-OF-DAY PERIODS: DO NOT STOP early! College timetables frequently run all 7 periods until late afternoon (e.g. Period 5: 01:45-02:45 PM, Period 6: 02:45-03:45 PM, Period 7: 03:45-04:45 PM). You MUST scan every column from the first morning period to the very last evening period across all days (Monday through Saturday).
- DUAL / MULTI-FACULTY MAPPING: Look at the Staff In-Charge / Course Details reference table at the bottom of the document to map faculty initials or abbreviations (e.g. VSR -> Ms. VAISHNAVI R, RKP -> Mrs. RAKSHITHA P, MRC -> Dr. MYLARA REDDY C, PPK -> Mr. PAVAN P KASHYAP, KNS -> Dr. KRISHNA NARAYANAN S). When a subject or lab is conducted jointly by multiple professors (e.g. "PPK / KNS" or "PPK/KNS"), record the combined full names cleanly (e.g. "Mr. PAVAN P KASHYAP / Dr. KRISHNA NARAYANAN S") on that single slot. Do NOT split it into two conflicting courses or treat them as an unknown faculty.
- SUBJECT CODES & NAMES: Cross-reference the subject codes table (e.g. BCS501: Software Engineering & Project Management, BCS502: Computer Networks, BCS503: Theory Of Computation, BCYL504: Applied Cryptography & Security Lab, BCY515C: Human Touch Interfaces, BCY586: Mini Project, BRMK557: Research Methodology, BCS508: Environmental Studies, BNSK559: NSS, ENG: English) to provide both full course code and full descriptive course title.
- LABS & PRACTICALS: If a lab slot spans multiple periods (e.g. Periods 5 to 7 or 13:45 to 16:45) or divides into batches (e.g. B1 - CNL / B2 - ACSL), record the start time, end time, and mark type as "Lab".
- COMPLETE DAYS: Examine every day row (Monday, Tuesday, Wednesday, Thursday, Friday, and Saturday) completely from left to right. Ensure course codes, subject titles, start/end times, and rooms are filled accurately.

JSON SCHEMA REQUIREMENT (Return strictly a JSON object):
{
  "isLegitimate": boolean,
  "rejectionReason": "string (only if isLegitimate is false)",
  "summary": "string summarizing the timetable (branch, semester, number of courses)",
  "doubts": [
    "string question about any ambiguity found (e.g. overlapping slots, alternate Saturdays, elective batch divisions)"
  ],
  "classes": [
    {
      "id": "tt_1",
      "courseCode": "BCS503",
      "courseTitle": "Theory Of Computation",
      "day": "Monday", // Must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
      "startTime": "09:00 AM", // e.g. 09:00 AM
      "endTime": "10:00 AM", // e.g. 10:00 AM
      "room": "LH-301",
      "facultyName": "Faculty Name",
      "type": "Theory" // Theory, Lab, or Tutorial
    }
  ]
}`;

  let messages: any[] = [];
  let modelToUse = 'qwen/qwen3.8-27b';

  if (!isPdf && base64Data) {
    const imgMime = mimeType.includes('png') ? 'image/png' : 'image/jpeg';
    messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          {
            type: 'image_url',
            image_url: {
              url: `data:${imgMime};base64,${base64Data}`,
            },
          },
        ],
      },
    ];
  } else {
    modelToUse = 'openai/gpt-oss-120b';
    messages = [
      {
        role: 'user',
        content: `${promptText}\n\nDocument Text Content Extracted from PDF:\n"""\n${
          extractedPdfText || base64Data.slice(0, 4000)
        }\n"""`,
      },
    ];
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: modelToUse,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 5000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const msg = errBody?.error?.message || `HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Groq API key. Please check your key in Assistant tab.');
    }
    if (response.status === 429) {
      throw new Error('Groq rate limit reached. Please wait a moment before analyzing again.');
    }
    throw new Error(`AI Analysis Failed (${msg})`);
  }

  const resJson = await response.json();
  const rawContent = resJson.choices?.[0]?.message?.content || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('AI returned an invalid response format. Please try analyzing again.');
  }

  if (parsed.isLegitimate === false) {
    throw new Error(
      parsed.rejectionReason ||
        'The uploaded document does not appear to be a legitimate academic timetable. Please upload an official timetable.'
    );
  }

  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const formattedClasses = Array.isArray(parsed.classes)
    ? parsed.classes.map((cls: any, i: number) => ({
        id: `tt_${Date.now()}_${i + 1}`,
        courseCode: cls.courseCode || 'ACAD101',
        courseTitle: cls.courseTitle || 'Academic Subject',
        day: validDays.includes(cls.day) ? cls.day : validDays[i % 5],
        startTime: cls.startTime || '09:00 AM',
        endTime: cls.endTime || '10:00 AM',
        room: cls.room || 'LH-301',
        facultyName: cls.facultyName || 'Department Faculty',
        type: cls.type === 'Lab' || cls.type === 'Tutorial' ? cls.type : 'Theory',
      }))
    : [];

  if (formattedClasses.length === 0) {
    throw new Error(
      'Could not extract any class timetable slots from this document. Please verify the document has clear text/table formatting.'
    );
  }

  return {
    classes: formattedClasses,
    doubts: Array.isArray(parsed.doubts) ? parsed.doubts : [],
    summary: parsed.summary || `Extracted ${formattedClasses.length} class slots from uploaded timetable.`,
  };
}

/**
 * Requirement #7: Real AI Document Analysis for Calendar of Events (PNG / PDF)
 * Extracts holidays, internal tests, last working day, exam dates, and semester schedule.
 */
export async function analyzeCalendarDocument(
  fileUri: string,
  mimeType: string
): Promise<{
  events: any[];
  doubts: string[];
  summary: string;
}> {
  const token = await getGroqToken();
  if (!token) {
    throw new Error(
      'Groq API key required for AI document analysis. Please save your free Groq key (gsk_...) in the AI Assistant tab first.'
    );
  }

  let base64Data = '';
  let extractedPdfText = '';
  const isPdf = mimeType.includes('pdf') || fileUri.toLowerCase().endsWith('.pdf');

  try {
    base64Data = await readFileAsBase64Safe(fileUri);
    if (isPdf) {
      try {
        const rawContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        extractedPdfText = extractTextFromPdfContent(rawContent, base64Data);
      } catch {
        extractedPdfText = extractTextFromPdfContent('', base64Data);
      }
    }
  } catch (e: any) {
    console.warn('[AI] Error reading calendar file:', e);
    throw new Error('Unable to read the calendar document file. Please upload a clear image or PDF.');
  }

  const promptText = `You are an expert college academic calendar analyzer.
TASK:
1. Examine this uploaded document (which claims to be an Academic Calendar of Events).
2. Determine if it is a LEGITIMATE college / university Calendar of Events (showing dates for semester commencement, internal exams, holidays, cultural events, or final exams).
3. If it is NOT a legitimate academic calendar, set "isLegitimate": false and explain in "rejectionReason".
4. If it IS a legitimate calendar, set "isLegitimate": true, and EXTRACT THE FULL CALENDAR ACROSS THE ENTIRE SEMESTER.
CRITICAL EXTRACTION RULES:
- DO NOT STOP after early months! You MUST extract all events until the very end of the semester (including CIE-1, CIE-2, CIE-3, lab exams, semester-end theory exams, practical exams, last working day, and vacation/recess).
- MULTI-DAY EVENT & HOLIDAY SPAN EXTRACTION:
  Many college events span across multiple days (e.g. Holidays like 'Naraka Chaturdashi, Balipadyami' spanning Nov 8 to Nov 10, exam blocks spanning multiple days, sports/cultural fests spanning 2-3 days).
  For ANY event spanning more than a single day:
  1. Set "startDate": "YYYY-MM-DD"
  2. Set "endDate": "YYYY-MM-DD"
  3. Set "dateSpan": "MM/DD - MM/DD" (e.g. "11/08 - 11/10")
  4. Set "date": "YYYY-MM-DD - YYYY-MM-DD"
  For single-day events, set "startDate" and "endDate" to the same date, "dateSpan": "MM/DD", and "date": "YYYY-MM-DD".
- Scan all pages/sections from beginning to end to ensure late-semester events are not truncated.

JSON SCHEMA REQUIREMENT (Return strictly a JSON object):
{
  "isLegitimate": boolean,
  "rejectionReason": "string (only if isLegitimate is false)",
  "summary": "string summarizing the academic calendar (term duration, exam schedule, holidays)",
  "doubts": [
    "string question regarding any tentative or ambiguous dates"
  ],
  "events": [
    {
      "id": "cal_1",
      "title": "Naraka Chaturdashi & Balipadyami Holidays",
      "startDate": "2026-11-08",
      "endDate": "2026-11-10",
      "dateSpan": "11/08 - 11/10",
      "date": "2026-11-08 - 2026-11-10",
      "type": "Holiday", // One of: "Holiday", "Exam", "Semester Milestones", "Classes Resume", "Cultural Fest"
      "description": "Festival holidays (3 days)",
      "isImportant": true
    }
  ]
}`;

  let messages: any[] = [];
  let modelToUse = 'qwen/qwen3.8-27b';

  if (!isPdf && base64Data) {
    const imgMime = mimeType.includes('png') ? 'image/png' : 'image/jpeg';
    messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          {
            type: 'image_url',
            image_url: {
              url: `data:${imgMime};base64,${base64Data}`,
            },
          },
        ],
      },
    ];
  } else {
    modelToUse = 'openai/gpt-oss-120b';
    messages = [
      {
        role: 'user',
        content: `${promptText}\n\nDocument Text Content Extracted from PDF:\n"""\n${
          extractedPdfText || base64Data.slice(0, 4000)
        }\n"""`,
      },
    ];
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: modelToUse,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 5000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const msg = errBody?.error?.message || `HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Groq API key. Please check your key in Assistant tab.');
    }
    if (response.status === 429) {
      throw new Error('Groq rate limit reached. Please wait a moment before analyzing again.');
    }
    throw new Error(`AI Analysis Failed (${msg})`);
  }

  const resJson = await response.json();
  const rawContent = resJson.choices?.[0]?.message?.content || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('AI returned an invalid response format. Please try analyzing again.');
  }

  if (parsed.isLegitimate === false) {
    throw new Error(
      parsed.rejectionReason ||
        'The uploaded document does not appear to be a legitimate academic calendar of events. Please upload an official calendar.'
    );
  }

  const validTypes = ['Holiday', 'Exam', 'Semester Milestones', 'Classes Resume', 'Cultural Fest'];
  const formattedEvents = Array.isArray(parsed.events)
    ? parsed.events.map((evt: any, i: number) => {
        let dateStr = evt.date || '2026-10-15';
        if (evt.startDate && evt.endDate && evt.startDate !== evt.endDate) {
          dateStr = `${evt.startDate} - ${evt.endDate}`;
        }
        return {
          id: `cal_${Date.now()}_${i + 1}`,
          title: evt.title || 'Academic Event',
          date: dateStr,
          startDate: evt.startDate || undefined,
          endDate: evt.endDate || undefined,
          dateSpan: evt.dateSpan || undefined,
          type: validTypes.includes(evt.type) ? evt.type : 'Semester Milestones',
          description: evt.description || '',
          isImportant: evt.isImportant ?? true,
        };
      })
    : [];

  if (formattedEvents.length === 0) {
    throw new Error(
      'Could not extract any academic calendar events from this document. Please check the document format.'
    );
  }

  return {
    events: formattedEvents,
    doubts: Array.isArray(parsed.doubts) ? parsed.doubts : [],
    summary: parsed.summary || `Extracted ${formattedEvents.length} calendar events from uploaded document.`,
  };
}

/**
 * Refine / Re-analyze Document with User Clarifications & Additional Notes
 */
export async function refineDocumentAnalysis(params: {
  type: 'timetable' | 'calendar';
  currentItems: any[];
  currentDoubts: string[];
  clarifications: Record<number, string>;
  additionalNotes?: string;
}): Promise<{
  items: any[];
  doubts: string[];
  summary: string;
}> {
  const token = await getGroqToken();
  if (!token) {
    throw new Error('Groq API key required. Please save your free Groq key in AI Assistant tab.');
  }

  const modelToUse = 'openai/gpt-oss-120b';

  const clarificationLines = Object.entries(params.clarifications)
    .filter(([_, ans]) => (ans || '').trim().length > 0)
    .map(([idx, ans]) => `Q: ${params.currentDoubts[Number(idx)] || 'Question ' + idx}\nUser Answer: ${ans}`)
    .join('\n\n');

  const promptText = `You are an expert college academic data refinement assistant.
TASK:
The user previously had their ${params.type === 'timetable' ? 'College Timetable' : 'Academic Calendar of Events'} scanned.
The AI had doubts or the user wants to clarify/correct/add missing details.

CURRENT EXTRACTED ITEMS:
${JSON.stringify(params.currentItems, null, 2)}

USER ANSWERS TO PREVIOUS DOUBTS:
${clarificationLines || 'None provided.'}

USER'S ADDITIONAL NOTES / MISSED ITEMS:
${params.additionalNotes || 'None provided.'}

INSTRUCTIONS:
1. Update, add, or correct the items array based on the user's answers and additional notes.
2. If the user answered the doubts satisfactorily, CLEAR those doubts.
3. If new ambiguities arise, specify them in "doubts". If all questions are resolved, return "doubts": [].
4. Provide an updated "summary".

JSON SCHEMA (Return strictly JSON):
${
  params.type === 'timetable'
    ? `{
  "summary": "string",
  "doubts": ["string"],
  "items": [
    {
      "id": "tt_1",
      "courseCode": "BCS401",
      "courseTitle": "Analysis & Design of Algorithms",
      "day": "Monday",
      "startTime": "09:00 AM",
      "endTime": "10:00 AM",
      "room": "LH-301",
      "facultyName": "Faculty Name",
      "type": "Theory"
    }
  ]
}`
    : `{
  "summary": "string",
  "doubts": ["string"],
  "items": [
    {
      "id": "cal_1",
      "title": "Continuous Internal Evaluation 1",
      "date": "2026-10-14",
      "type": "Exam",
      "description": "Details",
      "isImportant": true
    }
  ]
}`
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: [{ role: 'user', content: promptText }],
      response_format: { type: 'json_object' },
      max_tokens: 5000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(`Refinement error: ${errBody?.error?.message || response.status}`);
  }

  const resJson = await response.json();
  const rawContent = resJson.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawContent);

  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const formattedItems = Array.isArray(parsed.items)
    ? parsed.items.map((it: any, i: number) => {
        if (params.type === 'timetable') {
          return {
            id: it.id || `tt_${Date.now()}_${i + 1}`,
            courseCode: it.courseCode || 'BCS501',
            courseTitle: it.courseTitle || 'Academic Subject',
            day: validDays.includes(it.day) ? it.day : validDays[i % 5],
            startTime: it.startTime || '09:00 AM',
            endTime: it.endTime || '10:00 AM',
            room: it.room || 'LH-301',
            facultyName: it.facultyName || 'Department Faculty',
            type: it.type === 'Lab' || it.type === 'Tutorial' ? it.type : 'Theory',
          };
        } else {
          return {
            id: it.id || `cal_${Date.now()}_${i + 1}`,
            title: it.title || 'Academic Event',
            date: it.date && /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : '2026-10-15',
            type: it.type || 'Semester Milestones',
            description: it.description || '',
            isImportant: it.isImportant ?? true,
          };
        }
      })
    : params.currentItems;

  return {
    items: formattedItems,
    doubts: Array.isArray(parsed.doubts) ? parsed.doubts : [],
    summary: parsed.summary || 'Items updated based on your clarifications.',
  };
}

/** Legacy wrapper kept for any existing imports */
export const extractDocumentInfo = async (uri: string, mime: string) => {
  return analyzeTimetableDocument(uri, mime);
};
