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
function extractTextFromPdfContent(
  rawContent: string,
  base64Buffer?: string,
  preserveLines = false
): string {
  let combinedText = '';
  const runSep = preserveLines ? '\n' : ' ';

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
                combinedText += parts.map((p) => p.slice(1, -1)).join('') + runSep;
              }
            }
          }

          // 2. Parse simple Tj: (text) Tj
          const simpleTj = decompStr.match(/\((.*?)\)\s*Tj/gs);
          if (simpleTj) {
            for (const item of simpleTj) {
              const p = item.match(/\((.*?)\)/);
              if (p && p[1]) combinedText += p[1] + runSep;
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
                combinedText += streamWords.join(runSep) + runSep;
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
    return preserveLines
      ? combinedText
          .split('\n')
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join('\n')
      : combinedText.replace(/\s+/g, ' ').trim();
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

  return preserveLines
    ? textMatches.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
    : textMatches.join(' ').replace(/\\[nrtbf\\]/g, ' ').trim();
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
/**
 * Recovers class slots from a JSON response that got cut off mid-way
 * (token limit). Keeps every fully-closed slot object.
 */
function salvageTimetableJson(raw: string): any | null {
  const start = raw.indexOf('{');
  if (start === -1) return null;
  const body = raw.slice(start);
  const classesIdx = body.indexOf('"classes"');
  const segment = classesIdx === -1 ? body : body.slice(classesIdx);
  const objRegex = /\{[^{}]*\}/g;
  const slotObjects: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = objRegex.exec(segment)) !== null) {
    if (match[0].includes('"courseCode"') && match[0].includes('"day"')) {
      slotObjects.push(match[0]);
    }
  }
  if (slotObjects.length === 0) return null;
  try {
    return {
      isLegitimate: true,
      summary: 'Recovered timetable slots from a truncated AI response.',
      doubts: ['The AI response was cut short, so the last slots may be missing. Review the preview.'],
      classes: JSON.parse(`[${slotObjects.join(',')}]`),
    };
  } catch {
    return null;
  }
}

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
        extractedPdfText = extractTextFromPdfContent(rawContent, base64Data, true);
      } catch {
        extractedPdfText = extractTextFromPdfContent('', base64Data, true);
      }
    }
  } catch (e: any) {
    console.warn('[AI] Error reading file for OCR:', e);
    throw new Error('Unable to read the uploaded document file. Please upload a clear image or PDF.');
  }

  if (isPdf && extractedPdfText.replace(/\s/g, '').length < 120) {
    throw new Error(
      'This PDF has no selectable text (it looks like a scanned/flattened image), so the timetable grid cannot be read reliably. Please upload a screenshot or photo of the timetable instead (PNG/JPG).'
    );
  }

  const promptText = `You are an expert college TIMETABLE GRID analyst (OCR + table reconstruction).
GOAL: rebuild the uploaded timetable exactly as structured data, cell by cell.
Work through the pipeline below IN ORDER. Fill the "structure" block from the analysis BEFORE writing any class. Return JSON only, no commentary.

STEP 0 - VALIDITY GATE
Decide whether this is a real college/university timetable: an academic header (college, branch, semester/section) plus a grid of days vs periods holding subject codes/titles, rooms or faculty.
If it is NOT (marks card, fee receipt, resume, circular, poster, single subject list), set "isLegitimate": false and give "rejectionReason". Never fabricate a timetable.

STEP 1 - HEADER / TITLE BLOCK (read this before the grid)
Capture what is printed above the grid: institution, department/branch, semester, section/class, room/hall, academic year, and any "with effect from" date. Put it in "structure.header" and reuse it in "summary".

STEP 2 - FIND THE GRID AREA
Identify the table region that actually contains day labels and time/period labels. Ignore logos, instructions, footers, and the subject/staff reference tables at the bottom (those are legends, not slots). Record the region in "structure.gridRegion".

STEP 3 - AXIS DETECTION (most important)
Determine on which axis the DAYS run:
- vertical: Monday..Saturday run down the left (or right) side, and time advances left-to-right along each row.
- horizontal: days run across the top (or bottom), and time advances top-to-bottom down each column.
Set "structure.daysAxis" and "structure.timeAxis" to the opposite axis.
Days may be full words, abbreviations (MON, TUE/TUES, WED, THU/THUR/THURS, FRI, SAT, SUN) or single letters (M T W Th F S) or 1-6. Disambiguate by ORDER, never by a single ambiguous letter: the day after Tuesday is Wednesday, Thursday comes after Wednesday, Saturday is the last working day. Never map T to both Tuesday and Thursday for different rows/columns.
If days are vertical, the classes held on a day are that ROW. If days are horizontal, the classes held on a day are that COLUMN. Clock times are always on the perpendicular axis.

STEP 4 - PERIOD & BREAK TIMING GRID
1) List every period slot in order with its label (P1, I, 1st hour, etc.) and printed clock time.
2) Locate the FIXED BREAKS: assembly/prayer, tea/short break, lunch/recess. Breaks are the same for every day, they are NOT classes, and they are NOT empty periods.
3) Use the breaks as boundaries: the period before a break ends exactly when the break starts; the period after a break starts exactly when the break ends. Example: period 2 ends 10:45 AM, tea break 10:45-11:00 AM, period 3 starts 11:00 AM; period 4 ends 01:00 PM, lunch 01:00-01:45 PM, period 5 starts 01:45 PM.
4) Derive start/end for EVERY period, including the periods after lunch and the last period of the day. If only the first period time and the period duration are printed, derive the rest while preserving break gaps.
Put the result in "structure.periods" and "structure.breaks".

STEP 5 - CLASS COUNT PER DAY
Count the teaching periods per day. The number is normally identical for every day (a lab spanning 2-3 consecutive periods is still ONE cell = one class). Set "structure.classesPerDay". If one day genuinely differs, keep the real counts and mention it in doubts.

STEP 6 - ENUMERATE EVERY CELL
Walk each day in time order and emit exactly one class per filled cell:
- A cell spanning several consecutive periods (lab/practical/workshop) is ONE class from the first period's start to the last period's end, type "Lab".
- A cell splitting batches (e.g. "B1 - CNL / B2 - ACSL") is still one slot for that day; mildly combine the batch content in the title and mark type "Lab".
- Blank cell = free period: emit nothing (only note it in doubts if an entire day is empty).
- Never merge two different subjects into one slot, never duplicate a cell, never emit the same cell twice for two days.
- Do not stop early: read the LAST period of every day (timetables often run until 04:45 PM).

STEP 7 - SUBJECT DICTIONARY
Collect every subject code/title used in the grid and read the course legend. Resolve abbreviations and short forms to the full title (SE = Software Engineering). Use the SAME code and title on every slot of that subject. Keep codes upper-case without spaces. Record the dictionary in "courses".

STEP 8 - FACULTY DICTIONARY & MAPPING
Read the staff/faculty legend and expand initials to full names (VSR -> Ms. Vaishnavi R, RKP -> Mrs. Rakshitha P).
IMPORTANT: a subject may be handled jointly by two or more faculty. The cell or legend then shows two names/initials, e.g. "PPK / KNS", "Mr. X & Dr. Y", "PPK,KNS". In that case the subject is assigned to ALL those faculty and you must keep them together, joined by " / ", on that single slot (e.g. "Mr. Pavan P Kashyap / Dr. Krishna Narayanan S"). Do NOT split it into two subjects, do NOT pick only the first name, do NOT mark it unknown.
Also handle: one faculty teaching several subjects, and the same subject taught by different faculty in different slots - always follow the legend/printed cell, never guess.

STEP 9 - ASSEMBLE AND PUZZLE-CHECK
- Every class needs: day, startTime, endTime, courseCode, courseTitle, facultyName, room, type.
- Times must be "hh:mm AM/PM" (e.g. "09:00 AM") and must match the correct period from Step 4.
- No two classes on the same day may overlap.
- No class before period 1 or after the last period.
- If a cell's time is unreadable but the subject is clear, place it using the period grid position instead of guessing a time.
- Cross-check the totals: slots found should equal days x classesPerDay (minus free periods). If your count is off, re-read the grid before answering.

STEP 10 - DOUBTS
Ask at most 5 genuinely unclear things (overlapping slots, unreadable break duration, alternate Saturdays, elective/batch split). No generic filler.

PRIORITY ORDER: (1) correct period/break timing alignment, (2) correct day axis and cell placement, (3) correct subject<->faculty mapping including multi-faculty subjects. Never invent subjects, never drop a whole day, never output a partial week.

JSON SCHEMA (return strictly this object):
{
  "isLegitimate": boolean,
  "rejectionReason": "string (only when isLegitimate is false)",
  "summary": "branch, semester, section, periods per day, number of subjects",
  "structure": {
    "header": "string",
    "gridRegion": "string",
    "daysAxis": "vertical" | "horizontal",
    "timeAxis": "vertical" | "horizontal",
    "classesPerDay": number,
    "periods": [{ "label": "P1", "startTime": "09:00 AM", "endTime": "09:55 AM" }],
    "breaks": [{ "label": "Tea Break", "startTime": "10:45 AM", "endTime": "11:00 AM" }]
  },
  "courses": [
    { "courseCode": "BCS501", "courseTitle": "Software Engineering & Project Management", "facultyNames": ["Ms. Vaishnavi R"] }
  ],
  "doubts": ["string"],
  "classes": [
    {
      "id": "tt_1",
      "courseCode": "BCS503",
      "courseTitle": "Theory Of Computation",
      "day": "Monday",
      "startTime": "09:00 AM",
      "endTime": "10:00 AM",
      "room": "LH-301",
      "facultyName": "Faculty Name / Second Faculty Name",
      "type": "Theory"
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
        content: `${promptText}\n\nRaw grid text extracted from the PDF. Each line break separates a text run / table cell, so use the ordering and grouping to rebuild rows and columns:\n"""\n${extractedPdfText.slice(0, 12000)}\n"""`,
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
      // Full weeks (6 days x 7-8 periods) plus the structure/courses blocks need headroom
      max_tokens: 7000,
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
  let parsed: any = null;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    parsed = salvageTimetableJson(rawContent);
  }
  if (!parsed) {
    throw new Error('AI returned an invalid response format. Please try analyzing again.');
  }

  if (parsed.isLegitimate === false) {
    throw new Error(
      parsed.rejectionReason ||
        'The uploaded document does not appear to be a legitimate academic timetable. Please upload an official timetable.'
    );
  }

  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const seenSlots = new Set<string>();
  const formattedClasses = (Array.isArray(parsed.classes) ? parsed.classes : [])
    .map((cls: any, i: number) => ({
      id: `tt_${Date.now()}_${i + 1}`,
      courseCode: (cls.courseCode || 'ACAD101').trim().toUpperCase(),
      courseTitle: cls.courseTitle || 'Academic Subject',
      day: validDays.includes(cls.day) ? cls.day : null,
      startTime: cls.startTime || '09:00 AM',
      endTime: cls.endTime || '10:00 AM',
      room: cls.room || 'LH-301',
      facultyName: cls.facultyName || 'Department Faculty',
      type: cls.type === 'Lab' || cls.type === 'Tutorial' ? cls.type : 'Theory',
    }))
    .filter((cls: any) => {
      if (!cls.day) return false;
      const key = `${cls.day}|${cls.startTime}|${cls.courseCode}`;
      if (seenSlots.has(key)) return false;
      seenSlots.add(key);
      return true;
    });

  if (formattedClasses.length === 0) {
    throw new Error(
      'Could not extract any class timetable slots from this document. Please verify the document has clear text/table formatting.'
    );
  }

  const doubts: string[] = Array.isArray(parsed.doubts) ? parsed.doubts : [];
  const expectedPerDay = Number(parsed.structure?.classesPerDay);
  const daysCovered = new Set(formattedClasses.map((c: any) => c.day));
  if (expectedPerDay > 0 && daysCovered.size > 0) {
    const avg = formattedClasses.length / daysCovered.size;
    if (avg < expectedPerDay * 0.6) {
      doubts.push(
        `Only ${formattedClasses.length} slots were recovered across ${daysCovered.size} days (expected about ${expectedPerDay} per day). Check the preview and add anything missing.`
      );
    }
  }

  return {
    classes: formattedClasses,
    doubts,
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
 * Campus layout verification: accepts only a top-view college aerial photo
 * or a campus layout/map photo (image or PDF). Returns a summary + doubts.
 */
export async function analyzeCollegeLayoutDocument(
  fileUri: string,
  mimeType: string
): Promise<{
  summary: string;
  doubts: string[];
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
    console.warn('[AI] Error reading layout file:', e);
    throw new Error('Unable to read the uploaded layout. Please upload a clear top-view college photo or layout map.');
  }

  const promptText = `You are a campus map verifier.
TASK:
1. Decide whether the uploaded document is a LEGITIMATE top-view aerial view of a college campus OR a legitimate campus layout / map (image or PDF).
2. If it is NOT either of those (e.g. selfie, classroom photo, random document, timetable, notes), set "isLegitimate": false and explain in "rejectionReason".
3. If it IS a campus layout, set "isLegitimate": true, describe what is visible (blocks, roads, courts, hostel, landmarks), and list any legibility doubts.

JSON SCHEMA REQUIREMENT (Return strictly a JSON object):
{
  "isLegitimate": boolean,
  "rejectionReason": "string (only if isLegitimate is false)",
  "summary": "string describing the layout and visible landmarks",
  "doubts": ["string question about unreadable labels or unclear areas"]
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
            image_url: { url: `data:${imgMime};base64,${base64Data}` },
          },
        ],
      },
    ];
  } else {
    modelToUse = 'openai/gpt-oss-120b';
    messages = [
      {
        role: 'user',
        content: `${promptText}\n\nDocument Text / Content Extracted:\n"""\n${
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
      max_tokens: 1500,
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
        'The uploaded file does not look like a top-view college photo or a campus layout map. Please upload the correct map.'
    );
  }

  return {
    summary: parsed.summary || 'College layout verified.',
    doubts: Array.isArray(parsed.doubts) ? parsed.doubts : [],
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

  // Compact, stable handles (s1..sN) so the model never has to copy long ids
  const baseItems: any[] = Array.isArray(params.currentItems) ? params.currentItems : [];
  const modelSlots = baseItems.map((slot, i) => ({ ...slot, id: `s${i + 1}` }));
  const hadGuidance =
    clarificationLines.trim().length > 0 || Boolean((params.additionalNotes || '').trim());

  const promptText =
    params.type === 'timetable'
      ? `You are a SURGICAL timetable patch editor.
Input: an already-extracted college timetable (authoritative) plus the user's clarifications.
Output: a MINIMAL patch. Never rewrite or re-extract the timetable.

CURRENT TIMETABLE SLOTS - use these short ids (s1, s2, ...) to point at classes:
${JSON.stringify(modelSlots, null, 2)}

USER ANSWERS TO PREVIOUS DOUBTS:
${clarificationLines || 'None provided.'}

USER'S ADDITIONAL NOTES / MISSED ITEMS:
${params.additionalNotes || 'None provided.'}

HARD RULES:
1. Touch ONLY the slots the user actually talked about. Do NOT re-emit untouched slots, do not reformat them, do not reorder, do not "fix" their spelling, faculty, room or times.
2. You are editing a list of slots, not re-reading the timetable grid. Never rebuild the whole week from scratch.
3. Refer to slots ONLY by the short ids above (s1, s2, ...). Never invent, renumber or truncate them.
4. In "updates" include ONLY the fields that change. Omitted fields keep their existing value.
5. Apply what the user asks. If they name a day/period/time/subject/faculty, find the matching slot(s) and emit the update(s). A clarification that is actionable must produce at least one patch entry - do not stay silent.
6. A missing class the user mentions goes to "additions" with all fields filled.
7. A rule that affects many slots (e.g. "Saturday has 4 periods only", "lunch is 12:30-1:15 PM", "all labs are 2 hours", "remove the last period everywhere") becomes one update/removal per affected slot - still leave every other slot untouched.
8. Never remove a slot unless the user explicitly says it does not exist.
9. Keep the original analysis conventions: full day names (Monday..Sunday), times "hh:mm AM/PM", one courseCode/courseTitle per subject, jointly handled subjects keep ALL faculty joined with " / ", type is Theory / Lab / Tutorial.
10. Only truly ambiguous notes become questions in "doubts" (no patch for that item). Do not ask about things you can resolve from the slots above.

RETURN STRICTLY THIS JSON:
{
  "summary": "one line, e.g. Updated 2 Wednesday slots; added 1 Saturday lab.",
  "doubts": ["only still-unclear points; clear the ones the user answered"],
  "updates": [
    { "id": "s12", "day": "Wednesday", "startTime": "11:00 AM", "endTime": "11:55 AM", "facultyName": "Mr. X / Dr. Y" }
  ],
  "additions": [
    { "courseCode": "BCS501", "courseTitle": "Software Engineering", "day": "Saturday", "startTime": "09:00 AM", "endTime": "09:55 AM", "room": "LH-301", "facultyName": "Ms. V", "type": "Theory" }
  ],
  "removals": ["s31"]
}`
      : `You are an expert college academic calendar refinement assistant.
TASK:
The user previously had their Academic Calendar of Events scanned.
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
5. Keep every unchanged event exactly as it is (same id, title, dates, type).

JSON SCHEMA (Return strictly JSON):
{
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
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('AI returned an invalid response format. Please try again.');
  }

  const summaryText = parsed.summary || 'Items updated based on your clarifications.';
  const doubts = Array.isArray(parsed.doubts) ? parsed.doubts : [];

  // Calendar: full list refresh (linear data, safe to rewrite)
  if (params.type !== 'timetable') {
    const formattedEvents = Array.isArray(parsed.items)
      ? parsed.items.map((it: any, i: number) => ({
          id: it.id || `cal_${Date.now()}_${i + 1}`,
          title: it.title || 'Academic Event',
          date: it.date && /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : '2026-10-15',
          type: it.type || 'Semester Milestones',
          description: it.description || '',
          isImportant: it.isImportant ?? true,
        }))
      : params.currentItems;

    return { items: formattedEvents, doubts, summary: summaryText };
  }

  // Timetable: merge a minimal patch into the previously extracted slots so
  // untouched classes are preserved exactly (no full rewrite)
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const base: any[] = baseItems;
  const patched = base.map((slot) => ({ ...slot }));
  const removedIdx = new Set<number>();
  const touched = new Set<number>();
  const unmatchedRefs: string[] = [];
  const additions: any[] = [];

  const asArray = (value: any): any[] =>
    Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];

  const resolveIndex = (ref: any): number => {
    if (typeof ref === 'number' && Number.isInteger(ref)) {
      return ref >= 0 && ref < base.length ? ref : -1;
    }
    const raw = typeof ref === 'string' ? ref.trim().toLowerCase() : '';
    if (!raw) return -1;
    const short = raw.match(/^s?(\d+)$/);
    if (short) {
      const n = Number(short[1]) - 1;
      if (n >= 0 && n < base.length) return n;
    }
    return base.findIndex((slot) => String(slot?.id ?? '').trim().toLowerCase() === raw);
  };

  const applyPatch = (slot: any, patch: any) => {
    if (!slot || !patch) return;
    (['courseCode', 'courseTitle', 'startTime', 'endTime', 'facultyName', 'room'] as const).forEach(
      (field) => {
        const value = patch[field];
        if (typeof value === 'string' && value.trim()) slot[field] = value.trim();
      }
    );
    if (typeof patch.day === 'string') {
      const match = validDays.find((d) => d.toLowerCase() === patch.day.toLowerCase().slice(0, 3));
      if (match) slot.day = match;
    }
    if (patch.type === 'Lab' || patch.type === 'Tutorial' || patch.type === 'Theory') {
      slot.type = patch.type;
    }
  };

  asArray(parsed.updates).forEach((u: any) => {
    if (!u || typeof u !== 'object') return;
    const idx = resolveIndex(u.id ?? u.index ?? u.slotId ?? u.handle ?? u.slot);
    if (idx === -1) {
      unmatchedRefs.push(String(u.id ?? u.index ?? '?'));
      return;
    }
    applyPatch(patched[idx], u);
    touched.add(idx);
  });

  asArray(parsed.removals).forEach((r: any) => {
    const ref = r && typeof r === 'object' ? r.id ?? r.index ?? r.slotId : r;
    const idx = resolveIndex(ref);
    if (idx === -1) {
      unmatchedRefs.push(String(ref ?? '?'));
      return;
    }
    removedIdx.add(idx);
    touched.add(idx);
  });

  asArray(parsed.additions).forEach((it: any, i: number) => {
    const match = validDays.find(
      (d) => d.toLowerCase() === String(it?.day || '').toLowerCase().slice(0, 3)
    );
    if (!match || !(it?.courseCode || it?.courseTitle)) return;
    additions.push({
      id: `tt_${Date.now()}_add_${i + 1}`,
      courseCode: String(it.courseCode || 'ACAD101').trim().toUpperCase(),
      courseTitle: it.courseTitle || 'Academic Subject',
      day: match,
      startTime: it.startTime || '09:00 AM',
      endTime: it.endTime || '10:00 AM',
      room: it.room || 'LH-301',
      facultyName: it.facultyName || 'Department Faculty',
      type: it.type === 'Lab' || it.type === 'Tutorial' ? it.type : 'Theory',
    });
    touched.add(base.length + additions.length); // mark as applied
  });

  // Safety net: if the model ignored the patch schema and returned a full list
  // instead, only adopt entries that resolve to existing slots (no rewrite).
  if (touched.size === 0 && asArray(parsed.items).length > 0) {
    asArray(parsed.items).forEach((it: any) => {
      const idx = resolveIndex(it?.id ?? it?.index);
      if (idx === -1) return;
      applyPatch(patched[idx], it);
      touched.add(idx);
    });
    if (touched.size === 0) {
      throw new Error(
        'The AI tried to rebuild the whole timetable instead of patching the classes you asked about. Nothing was changed — please rephrase the clarification and try again.'
      );
    }
  }

  if (hadGuidance && touched.size === 0 && additions.length === 0 && doubts.length === 0) {
    throw new Error(
      'The clarification could not be matched to any existing class, so nothing changed. Name the day and period/time, e.g. "Monday 3rd period is Software Engineering Lab".'
    );
  }

  if (unmatchedRefs.length > 0) {
    doubts.push(
      `${unmatchedRefs.length} requested edit(s) pointed at classes that no longer exist and were skipped (${unmatchedRefs
        .slice(0, 5)
        .join(', ')}).`
    );
  }

  const mergedItems = [...patched.filter((_, i) => !removedIdx.has(i)), ...additions];

  return { items: mergedItems, doubts, summary: summaryText };
}

/** Legacy wrapper kept for any existing imports */
export const extractDocumentInfo = async (uri: string, mime: string) => {
  return analyzeTimetableDocument(uri, mime);
};
