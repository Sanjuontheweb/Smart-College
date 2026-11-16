import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

export interface OcrResult {
  classes?: any[]; // timetable entries
  events?: any[]; // calendar events
}

/**
 * Sends a PNG or PDF file to Hugging Face OCR model and returns parsed data.
 * Uses the free HF token defined in Constants.manifest.extra.HF_TOKEN.
 */
export const extractDocument = async (uri: string, mime: string): Promise<OcrResult> => {
  const token = Constants.manifest?.extra?.HF_TOKEN;
  if (!token) throw new Error('HF token not configured');

  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch('https://api-inference.huggingface.co/models/microsoft/layoutlmv3-base-uncased', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': mime,
    },
    body: Buffer.from(b64, 'base64'),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`OCR request failed: ${response.status} – ${txt}`);
  }

  const data = await response.json();
  const result: OcrResult = {};

  // Very naive parsing – fine for demo purposes.
  if (Array.isArray(data)) {
    const classes = data
      .filter(b => /Mon|Tue|Wed|Thu|Fri|Sat|Sun/.test(b.text))
      .map(b => {
        const parts = b.text.split(' ');
        return {
          day: parts[0],
          time: parts[1] ?? '',
          subject: parts.slice(2).join(' ') || 'Unknown',
        };
      });
    if (classes.length) result.classes = classes;
  }

  const events = data?.filter?.((b: any) => /\d{2}\/\d{2}\/\d{4}/.test(b.text))?.map((b: any) => {
    const [date, ...titleArr] = b.text.split(' ');
    return { date, title: titleArr.join(' ') };
  });
  if (events?.length) result.events = events;

  return result;
};
