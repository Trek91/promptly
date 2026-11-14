import { responseSchema } from '../../../shared/schemas.js';

export async function processText(input, signal) {
  let response;
  try {
    response = await fetch('/api/process', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input), signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Could not reach Promptly. Check that the server is running, then try again.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message || `The request failed (${response.status}). Please try again.`);
    error.requestId = body?.error?.requestId;
    throw error;
  }
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success || parsed.data.mode !== input.mode) throw new Error('The server returned an unexpected result. Please try again.');
  return parsed.data;
}

export function formatResult(data, completed = {}) {
  const result = data.result;
  if (data.mode === 'summarize') return `Summary\n${result.summary}\n\nKey points\n${result.keyPoints.map((p) => `• ${p}`).join('\n')}\n\nTakeaway\n${result.takeaway}`;
  if (data.mode === 'rewrite') return result.rewrittenText;
  return `${result.overview}\n\n${result.actionItems.map((item, i) => `[${completed[i] ? 'x' : ' '}] ${item.task}\nOwner: ${item.assignee || 'Unassigned'} | Due: ${item.dueDate || 'Not specified'} | Priority: ${item.priority}\nSource: ${item.evidence}`).join('\n\n')}`;
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const field = document.createElement('textarea');
  field.value = text;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Copy is unavailable in this browser. Select the result text to copy it.');
}
