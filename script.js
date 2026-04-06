(() => {
'use strict';
const $ = s => document.querySelector(s);
const regexInput = $('#regexInput'), flagsInput = $('#flagsInput'), testString = $('#testString');
const highlightedText = $('#highlightedText'), matchCount = $('#matchCount'), execTime = $('#execTime');
const explanation = $('#explanation'), matchGroups = $('#matchGroups'), replaceInput = $('#replaceInput'), replaceResult = $('#replaceResult');

const COMMON_PATTERNS = [
  { name: 'Email Address', regex: '[\\w.+-]+@[\\w-]+\\.[\\w.]+', flags: 'gi', desc: 'Matches standard email addresses' },
  { name: 'URL', regex: 'https?://[\\w.-]+(?:\\.[\\w]+)+[/\\w.,@?^=%&:~+#-]*', flags: 'gi', desc: 'Matches HTTP/HTTPS URLs' },
  { name: 'IP Address (IPv4)', regex: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g', desc: 'Matches IPv4 addresses like 192.168.1.1' },
  { name: 'Phone Number', regex: '[+]?[\\d\\s()-]{7,15}', flags: 'g', desc: 'Matches international phone numbers' },
  { name: 'HTML Tag', regex: '<([a-z][a-z0-9]*)\\b[^>]*>.*?</\\1>', flags: 'gis', desc: 'Matches opening and closing HTML tags' },
  { name: 'Hex Color', regex: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'gi', desc: 'Matches CSS hex color codes' },
  { name: 'Date (YYYY-MM-DD)', regex: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])', flags: 'g', desc: 'Matches ISO date format' },
  { name: 'Credit Card', regex: '\\b(?:\\d{4}[- ]?){3}\\d{4}\\b', flags: 'g', desc: 'Matches common credit card number formats' },
  { name: 'Strong Password', regex: '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}', flags: '', desc: 'Validates strong passwords (8+ chars, mixed case, digit, special)' },
  { name: 'CSS Property', regex: '([\\w-]+)\\s*:\\s*([^;]+);', flags: 'g', desc: 'Matches CSS property: value pairs' },
  { name: 'JSON Key-Value', regex: '"(\\w+)"\\s*:\\s*"?([^",}]+)"?', flags: 'g', desc: 'Matches JSON key-value pairs' },
  { name: 'Markdown Link', regex: '\\[([^\\]]+)\\]\\(([^)]+)\\)', flags: 'g', desc: 'Matches Markdown [text](url) links' },
];

const EXPLANATIONS = {
  '.': 'Any character except newline', '\\d': 'Digit (0-9)', '\\D': 'Non-digit', '\\w': 'Word character (a-z, A-Z, 0-9, _)',
  '\\W': 'Non-word character', '\\s': 'Whitespace (space, tab, newline)', '\\S': 'Non-whitespace', '\\b': 'Word boundary',
  '\\B': 'Non-word boundary', '^': 'Start of string/line', '$': 'End of string/line', '*': '0 or more (greedy)',
  '+': '1 or more (greedy)', '?': '0 or 1 (optional)', '*?': '0 or more (lazy)', '+?': '1 or more (lazy)',
  '|': 'Alternation (OR)', '\\n': 'Newline', '\\t': 'Tab', '\\r': 'Carriage return',
};

function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function runRegex() {
  const pattern = regexInput.value;
  const flags = flagsInput.value;
  const text = testString.value;
  if (!pattern) { highlightedText.innerHTML = escapeHtml(text); matchCount.textContent = '0 matches'; execTime.textContent = '0ms'; explanation.innerHTML = 'Enter a regex...'; matchGroups.innerHTML = ''; replaceResult.textContent = ''; return; }

  let regex;
  try { regex = new RegExp(pattern, flags); } catch (e) { highlightedText.innerHTML = `<span style="color:#ef4444">Error: ${escapeHtml(e.message)}</span>`; matchCount.textContent = 'Error'; return; }

  const t0 = performance.now();
  let matches = [];
  let m;
  const isGlobal = flags.includes('g');
  if (isGlobal) { while ((m = regex.exec(text)) !== null) { matches.push(m); if (matches.length > 1000) break; } }
  else { m = regex.exec(text); if (m) matches.push(m); }
  const elapsed = (performance.now() - t0).toFixed(1);
  execTime.textContent = elapsed + 'ms';
  matchCount.textContent = matches.length + ' match' + (matches.length !== 1 ? 'es' : '');

  // Highlight matches
  if (matches.length === 0) { highlightedText.innerHTML = escapeHtml(text); }
  else {
    let result = ''; let lastIndex = 0;
    for (const match of matches) {
      result += escapeHtml(text.slice(lastIndex, match.index));
      result += '<mark>' + escapeHtml(match[0]) + '</mark>';
      lastIndex = match.index + match[0].length;
    }
    result += escapeHtml(text.slice(lastIndex));
    highlightedText.innerHTML = result;
  }

  // Match groups
  matchGroups.innerHTML = matches.slice(0, 50).map((m, i) => {
    let groups = '';
    for (let g = 1; g < m.length; g++) { if (m[g] !== undefined) groups += `<div class="mg-group">Group ${g}: ${escapeHtml(m[g])}</div>`; }
    return `<div class="match-group-item"><span class="mg-index">#${i + 1}</span> <span class="mg-full">${escapeHtml(m[0])}</span> <span style="color:var(--text-muted);font-size:.75rem">@${m.index}</span>${groups}</div>`;
  }).join('');

  // Replace
  if (replaceInput.value) {
    try { replaceResult.textContent = text.replace(regex, replaceInput.value); } catch (e) { replaceResult.textContent = 'Replace error: ' + e.message; }
  }

  // Explanation
  explainRegex(pattern);
}

function explainRegex(pattern) {
  const tokens = [];
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '\\' && i + 1 < pattern.length) {
      const seq = pattern.slice(i, i + 2);
      const desc = EXPLANATIONS[seq] || `Escaped: ${seq}`;
      tokens.push(`<span class="token">${escapeHtml(seq)}</span> ${desc}`);
      i += 2;
    } else if (pattern[i] === '(') {
      let end = pattern.indexOf(')', i);
      if (end === -1) end = pattern.length;
      const group = pattern.slice(i, end + 1);
      if (group.startsWith('(?:')) tokens.push(`<span class="token">${escapeHtml(group)}</span> Non-capturing group`);
      else if (group.startsWith('(?=')) tokens.push(`<span class="token">${escapeHtml(group)}</span> Positive lookahead`);
      else if (group.startsWith('(?!')) tokens.push(`<span class="token">${escapeHtml(group)}</span> Negative lookahead`);
      else tokens.push(`<span class="token">${escapeHtml(group)}</span> Capturing group`);
      i = end + 1;
    } else if (pattern[i] === '[') {
      let end = pattern.indexOf(']', i);
      if (end === -1) end = pattern.length;
      const cls = pattern.slice(i, end + 1);
      const neg = cls[1] === '^' ? 'Negated character class' : 'Character class';
      tokens.push(`<span class="token">${escapeHtml(cls)}</span> ${neg}`);
      i = end + 1;
    } else if (pattern[i] === '{') {
      let end = pattern.indexOf('}', i);
      if (end === -1) end = pattern.length;
      const q = pattern.slice(i, end + 1);
      tokens.push(`<span class="token">${escapeHtml(q)}</span> Quantifier: repeat ${q}`);
      i = end + 1;
    } else {
      const desc = EXPLANATIONS[pattern[i]] || `Literal: "${pattern[i]}"`;
      tokens.push(`<span class="token">${escapeHtml(pattern[i])}</span> ${desc}`);
      i++;
    }
  }
  explanation.innerHTML = tokens.join('<br>') || 'Enter a regex to see explanation...';
}

function renderPatterns() {
  const grid = $('#patternsGrid');
  grid.innerHTML = COMMON_PATTERNS.map(p => `<div class="pattern-card" data-regex="${escapeHtml(p.regex)}" data-flags="${p.flags}"><h4>${p.name}</h4><div class="pattern-regex">${escapeHtml(p.regex)}</div><p>${p.desc}</p></div>`).join('');
  grid.addEventListener('click', e => {
    const card = e.target.closest('.pattern-card');
    if (card) { regexInput.value = card.dataset.regex; flagsInput.value = card.dataset.flags; runRegex(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
}

regexInput.addEventListener('input', runRegex);
flagsInput.addEventListener('input', runRegex);
testString.addEventListener('input', runRegex);
replaceInput.addEventListener('input', runRegex);
$('#themeBtn').addEventListener('click', () => { const d = document.documentElement; const isDark = d.dataset.theme === 'dark'; d.dataset.theme = isDark ? 'light' : 'dark'; $('#themeBtn').textContent = isDark ? '☀️' : '🌙'; localStorage.setItem('theme', d.dataset.theme); });
if (localStorage.getItem('theme') === 'light') { document.documentElement.dataset.theme = 'light'; $('#themeBtn').textContent = '☀️'; }
renderPatterns();
runRegex();
})();
