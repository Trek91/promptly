import { samples, sampleSummary, sampleRewrites } from '../../shared/samples.js';

function sentences(text) {
  return (text.match(/[^.!?\n]+(?:[.!?]+|$)/gu) || [text]).map((s) => s.trim()).filter(Boolean);
}

function extractActions(text) {
  const items = [];
  // A deliberately conservative local heuristic, not an LLM. Evidence is retained verbatim.
  const lines = text.split(/\n+/u).map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = sentences(line);
    for (const [index, sentence] of parts.entries()) {
      if (/\b(?:will not|won't|don't|do not|already|completed|has fixed|has already|discussed|might|could|maybe)\b/iu.test(sentence)) continue;
      const named = sentence.match(/^([\p{Lu}][\p{L}'-]*(?: [\p{Lu}][\p{L}'-]*)?)\s+(?:will|must|needs to)\s+(.+)/u);
      const request = sentence.match(/^(?:please\s+|(?:we|i) need to\s+|(?:todo|action):\s*)(.+)/iu);
      if (!named && !request) continue;
      let task = (named?.[2] || request[1]).replace(/[.!?]+$/u, '');
      let deadline = task.match(/\b(?:by|before|on)\s+(.+)$/iu);
      // "on Slack" and "by train" are not deadlines. Keep ambiguous phrases in the task.
      if (deadline && !/^(?:(?:next|this)\s+)?(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|today|tomorrow|tonight|noon|midnight|end of (?:the )?(?:day|week|month)|january|february|march|april|may|june|july|august|september|october|november|december|\d)/iu.test(deadline[1])) deadline = null;
      if (deadline) task = task.slice(0, deadline.index).trim();
      const priority = parts[index + 1]?.match(/^priority:\s*(high|medium|low)[.!]?$/iu)?.[1]?.toLowerCase() || 'unspecified';
      items.push({ task: task.charAt(0).toUpperCase() + task.slice(1), assignee: named?.[1] || null,
        dueDate: deadline?.[0] || null, priority, evidence: sentence });
    }
  }
  return { actionItems: items, overview: items.length ? `${items.length} explicit action${items.length === 1 ? '' : 's'} found. Missing owners and deadlines are left unspecified.` : 'No explicit actions found by the demo rules. Try the meeting-notes sample, or enable real AI for more nuanced extraction.' };
}

export async function processDemo({ mode, text, preferences }) {
  // Small delay makes loading and cancellation demonstrable; no network calls are made.
  await new Promise((resolve) => setTimeout(resolve, 650));
  if (mode === 'actions') return extractActions(text);
  if (mode === 'summarize') {
    if (text === samples.summarize) {
      return preferences.length === 'detailed' ? {
        ...sampleSummary,
        summary: `${sampleSummary.summary} Collaboration shifted toward shared documents and meetings for decisions. Designers and engineers reported fewer interruptions, and two more teams will be invited to test the approach next quarter.`,
        keyPoints: [...sampleSummary.keyPoints, 'The goal is more meaningful work while preserving useful collaboration.'],
      } : structuredClone(sampleSummary);
    }
    const parts = sentences(text);
    const selected = parts.slice(0, preferences.length === 'detailed' ? 7 : 3);
    return { summary: selected.join(' '), keyPoints: selected, takeaway: parts.at(-1) || text };
  }
  const tone = preferences.tone || 'professional';
  if (text === samples.rewrite) {
    return { rewrittenText: sampleRewrites[tone], changes: tone === 'concise'
      ? ['Condensed the request into one short paragraph.', 'Kept the review pages, deadline, and launch timing.']
      : ['Clarified the request and review deadline.', `Adjusted phrasing to a ${tone} tone.`, 'Preserved the original meaning and launch details.'] };
  }
  let rewritten = text.replace(/[ \t]+/gu, ' ').replace(/\bi\b/gu, 'I');
  const changes = ['Normalized spacing and capitalized sentence openings.'];
  if (tone === 'concise') {
    rewritten = rewritten.replace(/\b(?:just |basically |actually |in order to )/giu, (match) => /in order/iu.test(match) ? 'to ' : '');
    changes.push('Removed a small set of filler phrases.');
  } else if (tone === 'professional' || tone === 'polished') {
    rewritten = rewritten.replace(/\bhey\b/giu, 'Hello').replace(/\bthanks\b/giu, 'Thank you').replace(/\bwanna\b/giu, 'want to').replace(/\bgonna\b/giu, 'going to');
    changes.push('Applied basic formal word substitutions.');
  } else {
    rewritten = rewritten.replace(/\bHello\b/gu, 'Hey').replace(/\bThank you\b/gu, 'Thanks');
    changes.push('Applied basic conversational word substitutions.');
  }
  rewritten = rewritten.replace(/(^|[.!?]\s+|\n\s*)(\p{Ll})/gu, (_m, space, char) => space + char.toUpperCase());
  return { rewrittenText: rewritten.trim(), changes };
}
