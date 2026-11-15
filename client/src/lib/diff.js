// Keep trailing space with its word so replacements read as phrases, not interleaved letters.
function tokens(text) { return text.match(/\S+\s*|\s+/gu) || []; }

// Word-level LCS with a bounded matrix. Long, wholly different passages are grouped.
// Both sides always reconstruct exactly, including spaces and punctuation.
export function compareWords(original, revised) {
  const a = tokens(original), b = tokens(revised);
  let prefix = 0, suffix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix++;
  const left = a.slice(prefix, a.length - suffix), right = b.slice(prefix, b.length - suffix);
  const parts = [];
  function add(type, text) {
    if (!text) return;
    if (parts.at(-1)?.type === type) parts.at(-1).text += text;
    else parts.push({ type, text });
  }
  add('equal', a.slice(0, prefix).join(''));
  const grouped = (left.length + 1) * (right.length + 1) > 1_000_000;
  if (grouped) { add('removed', left.join('')); add('added', right.join('')); }
  else {
    const width = right.length + 1;
    const matrix = new Uint16Array((left.length + 1) * width);
    for (let i = left.length - 1; i >= 0; i--) {
      for (let j = right.length - 1; j >= 0; j--) {
        matrix[i * width + j] = left[i] === right[j]
          ? 1 + matrix[(i + 1) * width + j + 1]
          : Math.max(matrix[(i + 1) * width + j], matrix[i * width + j + 1]);
      }
    }
    let i = 0, j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) { add('equal', left[i++]); j++; }
      else if (i < left.length && (j === right.length || matrix[(i + 1) * width + j] >= matrix[i * width + j + 1])) add('removed', left[i++]);
      else add('added', right[j++]);
    }
  }
  add('equal', suffix ? a.slice(a.length - suffix).join('') : '');
  return { parts, grouped };
}
