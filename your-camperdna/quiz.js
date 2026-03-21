// CamperDNA Quiz — Full 14-question flow
// Spec: FOR-AGENTS/ARCHITECTURE-SPEC.md + FOR-AGENTS/questionnaire-copy.md

const QUESTIONS = [
  {
    key: 'budget',
    q: "What's your total budget for the van and any conversion work?",
    help: "This covers everything: the van itself + any conversion costs.",
    options: [
      { value: 'under-20k', label: 'Under £20,000' },
      { value: '20-30k',    label: '£20,000–30,000' },
      { value: '30-45k',    label: '£30,000–45,000' },
      { value: '45k-plus',  label: '£45,000+' },
    ]
  },
  {
    key: 'buying_route',
    q: "How are you planning to buy?",
    help: "Different routes = different reports.",
    options: [
      { value: 'preconverted',    label: 'Buy a pre-converted van (already fitted out by someone else)' },
      { value: 'donor-converter', label: 'Buy a donor van and commission a conversion company' },
      { value: 'donor-selfbuild', label: 'Buy a donor van and self-build (or partial self-build)' },
      { value: 'undecided',       label: 'Not decided yet' },
    ]
  },
  {
    key: 'van_generation',
    q: "Are you considering a T5 or T6 — or not sure yet?",
    help: "This affects emissions compliance and long-term value.",
    options: [
      { value: 't6',       label: 'T6 (2015 or newer) — modern, ULEZ-compliant, AdBlue required' },
      { value: 't5',       label: 'T5 (2009–2015) — no AdBlue, strong reliability record, better value' },
      { value: 'undecided',label: 'Not sure — help me understand the difference' },
    ],
    expand: {
      summary: 'Show T5 vs T6 details',
      body: '<p><strong>T6 (Euro 6):</strong> ULEZ-compliant for all UK cities. Required in London, Bath, Portsmouth, and growing list of clean air zones. AdBlue every 10,000 miles (£15–25 top-up).</p><p><strong>T5:</strong> Lower entry price for equivalent spec. No AdBlue. Excellent reliability record at high mileage. Not ULEZ-compliant — factor in daily charges if you drive into clean air zones regularly.</p>'
    }
  },
  {
    key: 'mileage',
    q: "How do you feel about buying a higher-mileage van?",
    help: "Mileage matters less than service history.",
    options: [
      { value: 'under-50k',  label: 'I\'d like under 50,000 miles — better resale, more years ahead' },
      { value: '100-150k',   label: 'Happy with 100–150,000 with full service history — much better value' },
      { value: 'depends',    label: 'Not sure — depends on price and history' },
    ],
    expand: {
      summary: 'Why service history matters more than mileage',
      body: '<p>A T6 TDI with 140,000 miles and a complete VW stamped service history is a better buy than a 60,000 mile van with gaps. These engines are proven at high mileage when properly maintained. Under 50K is rare below £40K — be realistic about what your budget allows.</p>'
    }
  },
  {
    key: 'van_source',
    q: "Where are you planning to buy the base van?",
    help: "Each source has different guarantees and processes.",
    options: [
      { value: 'vw-approved', label: 'VW Approved Used (12-month warranty, 115-point check — recommended)' },
      { value: 'private',     label: 'Private sale (better prices, less comeback if something goes wrong)' },
      { value: 'converter',   label: 'Conversion company sourcing it for you (convenient, they know what to look for)' },
      { value: 'undecided',   label: 'Not sure yet' },
    ],
    expand: {
      summary: 'About each source',
      body: '<p><strong>VW Approved Used:</strong> 12-month warranty + 115-point inspection including bodywork remediation. Wales tends to have cheapest stock — worth widening your search area.</p><p><strong>Private sale:</strong> Budget £300–400 for an independent inspection — always worth it. Use a VAT-registered specialist.</p><p><strong>Conversion company:</strong> Convenient and they know what makes a good donor. Markup is often built into the conversion quote.</p>'
    }
  },
  {
    key: 'spec_level',
    q: "If buying a T6 donor, what trim level are you targeting?",
    help: "One choice matters more than you might think.",
    options: [
      { value: 'highline',  label: 'Highline (recommended — aircon standard, heated windscreen, F&R sensors)' },
      { value: 'trendline', label: 'Trendline or Startline (budget — aircon often missing, needs retrofitting)' },
      { value: 'na',        label: 'Already have a van / not applicable' },
    ],
    expand: {
      summary: 'Why Highline matters',
      body: '<p>Aircon is essentially impossible to retrofit economically (£1,500–2,500+). The Highline includes it as standard, plus heated front windscreen (genuinely useful for camping mornings) and front/rear parking sensors. The price premium at base van level is nearly always smaller than the retrofit cost. Always buy the Highline if you can.</p>'
    }
  },
  {
    key: 'seating',
    q: "How many seats do you need in the back of the van?",
    help: "This affects bed size, storage, and kitchen space.",
    options: [
      { value: '2-rear', label: '2 rear seats (recommended — wider bed, more kitchen and storage space)' },
      { value: '3-rear', label: '3 rear seats (fits more passengers, ISOfix for three children, but loses storage)' },
      { value: 'unsure', label: 'Not sure' },
    ],
    expand: {
      summary: 'Seating vs. living space trade-off',
      body: '<p>3 front seats (captain + double) and 2 rear is the right default. Going to 3 rear costs more to convert, narrows the bed by ~10cm, and significantly reduces storage and kitchen space. Unless you genuinely need to seat 3 children in the back, the 2-rear layout is better in almost every way.</p>'
    }
  },
  {
    key: 'doors',
    q: "Barn doors or tailgate?",
    help: "Each has real advantages.",
    options: [
      { value: 'barn',     label: 'Barn doors (two doors opening sideways)' },
      { value: 'tailgate', label: 'Tailgate (single door lifting upward)' },
      { value: 'unsure',   label: 'Not sure — explain the difference' },
    ],
    expand: {
      summary: 'Barn door vs. tailgate comparison',
      body: '<p><strong>Barn doors:</strong> Easier for families — children and shorter adults can reach without jumping. Compatible with towbar-mounted bike racks that swing open around the doors (e.g. Atera Strada). No problem if someone parks close behind you.</p><p><strong>Tailgate:</strong> Provides rain shelter when open. Slightly cleaner look. Marginally easier single-handed loading.</p><p><strong>Summary:</strong> Barn doors for families, either works for couples or solo.</p>'
    }
  },
  {
    key: 'roof',
    q: "What roof setup do you want?",
    help: "This affects headroom, cost, and driving profile.",
    options: [
      { value: 'pop-top',   label: 'Pop-top (elevating roof — extra sleeping space, stays under 2m for car parks)' },
      { value: 'high-roof', label: 'High-roof (fixed raised roof — full standing height, no mechanism to maintain)' },
      { value: 'standard',  label: 'Standard roof (no modification — lowest cost, limited headroom inside)' },
    ],
    expand: {
      summary: 'Roof options in detail',
      body: '<p><strong>Pop-top:</strong> Sweet spot for most buyers — extra sleeping space without losing multi-storey car park access. Only consider TUV-tested roofs (Reimo, SCA, Skyline) — these maintain body integrity.</p><p><strong>High-roof:</strong> Maximum headroom, mechanically simple, but taller driving profile. Some car parks become inaccessible. Popular with full-time van lifers.</p><p><strong>Standard:</strong> Fine if budget is tight — accept that you\'ll always be changing at a slight crouch.</p>'
    }
  },
  {
    key: 'bed',
    q: "What's your priority for the main sleeping area?",
    help: "Each option has different trade-offs.",
    options: [
      { value: 'rib',        label: 'RIB bed (folds from rear seat — ISOfix points, M1 crash tested, elevated for storage)' },
      { value: 'rock-roll',  label: 'Rock and Roll bed (traditional fold-flat — simple, widely available)' },
      { value: 'fixed',      label: 'Fixed bed (always made up — maximum sleeping convenience, less boot space)' },
      { value: 'undecided',  label: 'Not sure' },
    ],
    expand: {
      summary: 'Bed options in detail',
      body: '<p><strong>RIB (recommended for families):</strong> ISOfix points mean car seats fit properly. M1 crash tested. Raises to create usable boot storage underneath. The RIB Altair with a quality topper (e.g. Edge Campervans RIB112) is genuinely comfortable.</p><p><strong>Rock and Roll:</strong> Simpler and cheaper. Works well for couples or solo where crash-testing isn\'t a priority.</p><p><strong>Fixed:</strong> Always ready — but eats into your boot space. Best if you never need the boot for large items.</p>'
    }
  },
  {
    key: 'activities',
    q: "What do you mainly do outdoors?",
    help: "This drives rack, storage, and accessory spec.",
    options: [
      { value: 'watersports', label: 'Surfing or water sports (board storage, roof rack, rinse shower)' },
      { value: 'cycling',     label: 'Cycling or mountain biking (bike rack essential)' },
      { value: 'hiking',      label: 'Hiking, climbing or trail running (lighter gear, less storage intensive)' },
      { value: 'general',     label: 'General use — no specific sport or large kit' },
    ]
  },
  {
    key: 'awning',
    q: "Do you want external shelter attached to the van?",
    help: "These are very different solutions.",
    options: [
      { value: 'retractable', label: 'Retractable awning (extends out for shade and light rain cover)' },
      { value: 'rail',        label: 'Awning rail for a drive-away tent (rail on van side, tent slots in and stays when you drive off)' },
      { value: 'none',        label: 'No awning needed' },
    ],
    expand: {
      summary: 'Awning comparison',
      body: '<p>A retractable awning adds outdoor living space quickly — great for impromptu stops. An awning rail lets you pitch a proper connected tent and drive off independently — useful for families who want the van for sleeping but want extra space for the kids during the day.</p>'
    }
  },
  {
    key: 'heating',
    q: "Do you need a diesel night heater?",
    help: "Year-round use is transformative — but not essential for summer-only use.",
    options: [
      { value: 'yes',   label: 'Yes — year-round use, cold nights, want to warm the van remotely' },
      { value: 'maybe', label: 'Probably — but not sure what\'s involved' },
      { value: 'no',    label: 'No — mainly summer use, campsites with electricity' },
    ],
    expand: {
      summary: 'Diesel heater details',
      body: '<p>~£1,000 fitted as part of a conversion. Planar and Webasto are the best brands. The <strong>Autoterm Comfort Controller</strong> (~£120 + £80 SIM pack) allows phone control and bedside temperature setting — worth specifying. If your partner is coming, this is usually the dealbreaker. Specify it at conversion time — retrofitting is messier and pricier.</p>'
    }
  },
  {
    key: 'electrical',
    q: "How important is it to camp without a mains hookup?",
    help: "This determines your electrical spec.",
    options: [
      { value: 'essential',     label: 'Essential — I want to wild camp and never rely on campsites' },
      { value: 'useful',        label: 'Useful — mix of wild camping and campsites' },
      { value: 'not-important', label: 'Not important — I\'ll mostly use sites with electric hookup' },
    ],
    expand: {
      summary: 'Solar and battery details',
      body: '<p>~£600 to add as part of a conversion. With solar and a 100Ah+ leisure battery, you rarely need mains hookup. The founder has never plugged into mains in three years of ownership. Solar is worth specifying at conversion stage — retrofitting means cutting the roof or running cables externally.</p>'
    }
  }
];

// Map answer values to display labels for result screen
const RESULT_LABELS = {
  van_generation: { t6:'T6 (2015+)', t5:'T5 (2009–2015)', undecided:'T5 or T6' },
  buying_route:   { preconverted:'Pre-converted', 'donor-converter':'Donor + Converter', 'donor-selfbuild':'Donor + Self-build', undecided:'To be decided' },
  van_source:     { 'vw-approved':'VW Approved Used', private:'Private sale', converter:'Via converter', undecided:'To be decided' },
  roof:           { 'pop-top':'Pop-top roof', 'high-roof':'High-roof', standard:'Standard roof' },
  bed:            { rib:'RIB bed (ISOfix)', 'rock-roll':'Rock and Roll', fixed:'Fixed bed', undecided:'To be decided' },
  doors:          { barn:'Barn doors', tailgate:'Tailgate', unsure:'Either' },
  heating:        { yes:'Diesel heater', maybe:'Diesel heater (likely)', no:'Not required' },
  electrical:     { essential:'Solar + 100Ah+ battery', useful:'Solar recommended', 'not-important':'Hookup sites' },
};

// --- State ---
let current = 0;
const answers = {};

// --- DOM refs ---
const progressFill = document.getElementById('quiz-progress-fill');
const stepLabel    = document.getElementById('quiz-step');
const questionsEl  = document.getElementById('quiz-questions');
const resultEl     = document.getElementById('quiz-result');

function buildQuiz() {
  QUESTIONS.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'quiz-question' + (i === 0 ? ' active' : '');
    div.id = 'q-' + i;

    let expandHTML = '';
    if (q.expand) {
      expandHTML = `<details class="quiz-expand"><summary>${q.expand.summary}</summary><div>${q.expand.body}</div></details>`;
    }

    const optionsHTML = q.options.map(opt =>
      `<button class="quiz-option" data-key="${q.key}" data-value="${opt.value}">${opt.label}</button>`
    ).join('');

    div.innerHTML = `
      <h2>${q.q}</h2>
      <p class="quiz-help">${q.help}</p>
      <div class="quiz-options">${optionsHTML}</div>
      ${expandHTML}
      <div class="quiz-nav">
        <button class="quiz-nav-back" ${i === 0 ? 'disabled' : ''} onclick="goBack()">← Back</button>
        <span class="quiz-step" id="quiz-step">${i+1} of ${QUESTIONS.length}</span>
      </div>
    `;
    questionsEl.appendChild(div);
  });

  // Delegate option clicks
  questionsEl.addEventListener('click', e => {
    const btn = e.target.closest('.quiz-option');
    if (!btn) return;
    const key = btn.dataset.key;
    const value = btn.dataset.value;

    // Deselect siblings
    btn.closest('.quiz-options').querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    answers[key] = value;

    // Auto-advance after short delay
    setTimeout(() => goNext(), 280);
  });
}

function updateProgress() {
  const pct = ((current) / QUESTIONS.length) * 100;
  progressFill.style.width = pct + '%';
}

function showQuestion(index) {
  document.querySelectorAll('.quiz-question').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
  updateProgress();
}

function goNext() {
  const q = QUESTIONS[current];
  if (!answers[q.key]) return; // must select an option

  if (current < QUESTIONS.length - 1) {
    current++;
    showQuestion(current);
  } else {
    // All done — show result
    progressFill.style.width = '100%';
    showResult();
  }
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

  const specMap = [
    { label: 'Van Type',     key: 'van_generation' },
    { label: 'Buying Route', key: 'buying_route' },
    { label: 'Source',       key: 'van_source' },
    { label: 'Roof',         key: 'roof' },
    { label: 'Bed Config',   key: 'bed' },
    { label: 'Rear Doors',   key: 'doors' },
    { label: 'Heating',      key: 'heating' },
    { label: 'Electrical',   key: 'electrical' },
  ];

  const grid = document.getElementById('spec-grid');
  grid.innerHTML = specMap.map(s => {
    const raw = answers[s.key] || '—';
    const label = RESULT_LABELS[s.key]?.[raw] || raw;
    return `<div class="spec-cell"><div class="spec-label">${s.label}</div><div class="spec-value">${label}</div></div>`;
  }).join('');
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
    const res = await fetch('/functions/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, answers })
    });
    const data = await res.json();

    if (res.ok && data.status === 'success') {
      sentMsg.style.display = 'block';
      sendBtn.style.display = 'none';
      emailInput.style.display = 'none';
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
document.addEventListener('DOMContentLoaded', () => {
  buildQuiz();
  updateProgress();

  const sendBtn = document.getElementById('email-send-btn');
  if (sendBtn) sendBtn.addEventListener('click', submitEmail);

  const emailInput = document.getElementById('email-input');
  if (emailInput) {
    emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitEmail(); });
  }
});
