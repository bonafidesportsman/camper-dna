// CamperDNA Quiz - Phase 1 (15-question flow)
// Data-driven from /assets/data/questionnaire.json

let QUESTIONS = [];
let current = 0;
const answers = {};

// --- DOM refs ---
const progressFill = document.getElementById('quiz-progress-fill');
const questionsEl  = document.getElementById('quiz-questions');
const resultEl     = document.getElementById('quiz-result');

// Result display labels (concise versions for the spec grid)
const RESULT_LABELS = {
  van_generation: { t6:'T6 / T6.1 (2015+)', t5:'T5 (2009-2015)', t7:'T7 Transporter (2025+)', undecided:'T5, T6 or T7' },
  buying_route:   { preconverted:'Pre-converted', 'donor-converter':'Donor + Converter', 'donor-selfbuild':'Donor + Self-build', undecided:'To be decided' },
  van_source:     { 'vw-approved':'VW Approved Used', private:'Private sale', converter:'Via converter', undecided:'To be decided' },
  transmission:   { '6-manual':'6-speed manual', dsg:'DSG automatic', '5-manual':'5-speed manual', undecided:'To be decided' },
  roof:           { 'pop-top':'Pop-top roof', 'high-roof':'High-roof', standard:'Standard roof' },
  bed:            { rib:'RIB bed', 'rock-roll':'Rock and Roll', fixed:'Fixed bed', undecided:'To be decided' },
  doors:          { barn:'Barn doors', tailgate:'Tailgate', unsure:'Either' },
  heating:        { yes:'Diesel heater', maybe:'Diesel heater (likely)', no:'Not required' },
  electrical:     { essential:'Solar + 100Ah+ battery', useful:'Solar recommended', 'not-important':'Hookup sites' },
};

// Spec grid dimensions shown on results page
const SPEC_MAP = [
  { label: 'Van Type',     key: 'van_generation' },
  { label: 'Buying Route', key: 'buying_route' },
  { label: 'Gearbox',      key: 'transmission' },
  { label: 'Roof',         key: 'roof' },
  { label: 'Bed Config',   key: 'bed' },
  { label: 'Rear Doors',   key: 'doors' },
  { label: 'Heating',      key: 'heating' },
  { label: 'Electrical',   key: 'electrical' },
];

async function loadQuestions() {
  try {
    const res = await fetch('/assets/data/questionnaire.json');
    const data = await res.json();
    QUESTIONS = data.phase1.questions.map(q => ({
      key: q.id,
      q: q.question,
      help: q.helper,
      options: q.options,
      expand: q.expand ? {
        summary: q.expand.summary,
        body: plainTextToHTML(q.expand.body)
      } : null
    }));
    // Update subtitle
    const heroP = document.querySelector('.quiz-hero p');
    if (heroP) heroP.textContent = data.phase1.subtitle;
  } catch (err) {
    console.error('Failed to load questionnaire.json, falling back to defaults', err);
    // Fallback: keep empty, quiz won't render
  }
}

function plainTextToHTML(text) {
  if (!text) return '';
  // Convert \n\n to paragraph breaks, wrap in <p> tags
  return '<p>' + text.split(/\n\n+/).map(p => p.replace(/\n/g, '<br>')).join('</p><p>') + '</p>';
}

function buildQuiz() {
  questionsEl.innerHTML = '';
  QUESTIONS.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'quiz-question' + (i === 0 ? ' active' : '');
    div.id = 'q-' + i;

    let expandHTML = '';
    if (q.expand) {
      expandHTML = `<details class="quiz-expand"><summary>${q.expand.summary}</summary><div class="quiz-expand-body">${q.expand.body}</div></details>`;
    }

    const optionsHTML = q.options.map(opt => {
      const showIf = opt.showIf ? ` data-show-if='${JSON.stringify(opt.showIf)}'` : '';
      return `<button class="quiz-option" data-key="${q.key}" data-value="${opt.value}"${showIf}>${opt.label}</button>`;
    }).join('');

    div.innerHTML = `
      <h2>${q.q}</h2>
      <p class="quiz-help">${q.help}</p>
      <div class="quiz-options">${optionsHTML}</div>
      ${expandHTML}
      <div class="quiz-nav">
        <button class="quiz-nav-back" ${i === 0 ? 'disabled' : ''} onclick="goBack()">← Back</button>
        <span class="quiz-step">${i + 1} of ${QUESTIONS.length}</span>
      </div>
    `;
    questionsEl.appendChild(div);
  });

  // Restore any previously selected answers (e.g. after back navigation)
  Object.entries(answers).forEach(([key, value]) => {
    const btn = questionsEl.querySelector(`.quiz-option[data-key="${key}"][data-value="${value}"]`);
    if (btn) btn.classList.add('selected');
  });

  // Delegate option clicks
  questionsEl.addEventListener('click', e => {
    const btn = e.target.closest('.quiz-option');
    if (!btn) return;
    const key = btn.dataset.key;
    const value = btn.dataset.value;

    btn.closest('.quiz-options').querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    answers[key] = value;
    pruneInvalidAnswers();

    setTimeout(() => goNext(), 280);
  });

  updateOptionVisibility();
}

function updateProgress() {
  const pct = (current / QUESTIONS.length) * 100;
  progressFill.style.width = pct + '%';
}

function showQuestion(index) {
  updateOptionVisibility();
  document.querySelectorAll('.quiz-question').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
  updateProgress();
  // Scroll to top of quiz wrapper
  document.querySelector('.quiz-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goNext() {
  const q = QUESTIONS[current];
  if (!isAnswerValid(q.key, answers[q.key])) return;

  if (current < QUESTIONS.length - 1) {
    current++;
    showQuestion(current);
  } else {
    progressFill.style.width = '100%';
    showResult();
  }
}

function updateOptionVisibility() {
  questionsEl.querySelectorAll('.quiz-option[data-show-if]').forEach(btn => {
    const visible = evaluateShowIf(JSON.parse(btn.dataset.showIf));
    btn.hidden = !visible;
    btn.disabled = !visible;
    if (!visible && answers[btn.dataset.key] === btn.dataset.value) {
      delete answers[btn.dataset.key];
      btn.classList.remove('selected');
    }
  });
}

function pruneInvalidAnswers() {
  QUESTIONS.forEach(q => {
    if (answers[q.key] && !isAnswerValid(q.key, answers[q.key])) {
      delete answers[q.key];
      questionsEl
        .querySelectorAll(`.quiz-option[data-key="${q.key}"].selected`)
        .forEach(btn => btn.classList.remove('selected'));
    }
  });
}

function isAnswerValid(key, value) {
  if (!value) return false;
  const btn = questionsEl.querySelector(`.quiz-option[data-key="${key}"][data-value="${value}"]`);
  if (!btn) return false;
  if (btn.dataset.showIf && !evaluateShowIf(JSON.parse(btn.dataset.showIf))) return false;
  return true;
}

function evaluateShowIf(rule) {
  if (rule.source !== 'phase1') return true;
  return rule.anyOf.includes(answers[rule.sectionId]);
}

function goBack() {
  if (current > 0) {
    current--;
    showQuestion(current);
  }
}

function showResult() {
  questionsEl.style.display = 'none';
  resultEl.classList.add('active');

  const grid = document.getElementById('spec-grid');
  grid.innerHTML = SPEC_MAP.map(s => {
    const raw = answers[s.key] || ' - ';
    const label = RESULT_LABELS[s.key]?.[raw] || raw;
    return `<div class="spec-cell"><div class="spec-label">${s.label}</div><div class="spec-value">${label}</div></div>`;
  }).join('');

  // Show spec sheet CTA if they indicated they want a conversion
  const buyingRoute = answers.buying_route;
  const specSheetCTA = document.getElementById('spec-sheet-cta');
  if (specSheetCTA && buyingRoute !== 'preconverted') {
    specSheetCTA.style.display = 'block';
  }
}

async function submitEmail() {
  const emailInput = document.getElementById('email-input');
  const sendBtn    = document.getElementById('email-send-btn');
  const sentMsg    = document.getElementById('email-sent-msg');
  const errMsg     = document.getElementById('email-error-msg');
  const email = emailInput.value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errMsg.textContent = 'Please enter a valid email address.';
    errMsg.style.display = 'block';
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending…';
  errMsg.style.display = 'none';

  try {
    const res = await fetch('/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, answers })
    });
    const data = await res.json();

    if (res.ok && data.status === 'success') {
      sentMsg.style.display = 'block';
      sendBtn.style.display = 'none';
      emailInput.style.display = 'none';

      // Save session to sessionStorage for Phase 2 spec sheet
      try {
        sessionStorage.setItem('camperdna_session', JSON.stringify({
          email: email,
          answers: answers,
          timestamp: Date.now()
        }));
      } catch (e) { /* sessionStorage not available */ }

      // Show spec sheet link
      const specSheetCTA = document.getElementById('spec-sheet-cta');
      if (specSheetCTA && answers.buying_route !== 'preconverted') {
        specSheetCTA.style.display = 'block';
      }
    } else {
      errMsg.textContent = data.message || 'Something went wrong. Please try again.';
      errMsg.style.display = 'block';
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send my report →';
    }
  } catch {
    errMsg.textContent = 'Network error. Please try again.';
    errMsg.style.display = 'block';
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send my report →';
  }
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  await loadQuestions();
  buildQuiz();
  updateProgress();

  const sendBtn = document.getElementById('email-send-btn');
  if (sendBtn) sendBtn.addEventListener('click', submitEmail);

  const emailInput = document.getElementById('email-input');
  if (emailInput) {
    emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitEmail(); });
  }
});
