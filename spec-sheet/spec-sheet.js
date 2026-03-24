// CamperDNA Phase 2 — Conversion Spec Sheet
// Loads from /assets/data/questionnaire.json
// showIf logic, email pre-fill from sessionStorage

let phase2Data = null;
let phase1Session = null;
const selections = {}; // { sectionId: Set<itemId> }  or  { sectionId: itemId } for single-choice

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  // Load session from Phase 1 if available
  try {
    const raw = sessionStorage.getItem('camperdna_session');
    if (raw) {
      phase1Session = JSON.parse(raw);
      // Expire after 2 hours
      if (Date.now() - phase1Session.timestamp > 7200000) {
        phase1Session = null;
        sessionStorage.removeItem('camperdna_session');
      }
    }
  } catch (e) { /* ignore */ }

  // Set up email bar
  setupEmailBar();

  // Load questionnaire data
  try {
    const res = await fetch('/assets/data/questionnaire.json');
    const data = await res.json();
    phase2Data = data.phase2;
    renderSections();
  } catch (err) {
    document.getElementById('spec-sections').innerHTML =
      '<p class="spec-load-error">Could not load spec sheet data. Please refresh the page.</p>';
    console.error('Failed to load questionnaire.json', err);
  }

  // Submit button
  document.getElementById('spec-submit-btn').addEventListener('click', submitSpec);
});

// --- Email (inline at bottom, near submit) ---
function setupEmailBar() {
  const confirmEl   = document.getElementById('spec-email-confirm');
  const inputWrap   = document.getElementById('spec-email-input-wrap');
  const displayEl   = document.getElementById('spec-email-display');
  const inputEl     = document.getElementById('spec-email-input');

  if (phase1Session?.email) {
    // User already gave email in the quiz — show quiet confirm line
    displayEl.textContent = phase1Session.email;
    inputEl.value = phase1Session.email;
    confirmEl.style.display = 'flex';
    inputWrap.style.display = 'none';
  } else {
    // No email yet — show input
    confirmEl.style.display = 'none';
    inputWrap.style.display = 'flex';
  }

  // "Change" button handler
  document.getElementById('spec-email-change-btn').addEventListener('click', () => {
    confirmEl.style.display = 'none';
    inputWrap.style.display = 'flex';
    inputEl.focus();
  });
}

function getEmail() {
  return document.getElementById('spec-email-input').value.trim();
}

// --- Render sections ---
function renderSections() {
  const container = document.getElementById('spec-sections');
  container.innerHTML = '';

  phase2Data.sections.forEach(section => {
    const sectionEl = buildSection(section);
    container.appendChild(sectionEl);
  });

  // Apply initial showIf visibility
  updateAllVisibility();
}

function buildSection(section) {
  const wrapper = document.createElement('div');
  wrapper.className = 'spec-section';
  wrapper.id = 'section-' + section.id;

  const typeNote = section.type === 'single-choice'
    ? '<span class="spec-section-type">Choose one</span>'
    : '<span class="spec-section-type">Tick all that apply</span>';

  wrapper.innerHTML = `
    <div class="spec-section-header">
      <h2 class="spec-section-title">${section.title}</h2>
      ${typeNote}
    </div>
    <p class="spec-section-helper">${section.helper}</p>
    <div class="spec-items" id="items-${section.id}"></div>
  `;

  // Initialise selection state
  if (section.type === 'single-choice') {
    selections[section.id] = null;
  } else {
    selections[section.id] = new Set();
  }

  const itemsContainer = wrapper.querySelector('.spec-items');
  section.items.forEach(item => {
    const itemEl = buildItem(section, item);
    itemsContainer.appendChild(itemEl);
  });

  return wrapper;
}

function buildItem(section, item) {
  const wrapper = document.createElement('div');
  wrapper.className = 'spec-item';
  wrapper.id = 'item-' + item.id;

  // showIf hidden by default if rule exists (will be shown by updateAllVisibility)
  if (item.showIf) {
    wrapper.style.display = 'none';
    wrapper.dataset.showIf = JSON.stringify(item.showIf);
  }

  const inputType = section.type === 'single-choice' ? 'radio' : 'checkbox';
  const inputName = section.type === 'single-choice' ? 'spec-' + section.id : 'spec-' + section.id + '-' + item.id;

  wrapper.innerHTML = `
    <label class="spec-item-label">
      <input type="${inputType}"
             name="${inputType === 'radio' ? 'spec-' + section.id : inputName}"
             value="${item.id}"
             data-section="${section.id}"
             data-item="${item.id}">
      <span class="spec-item-check"></span>
      <span class="spec-item-text">
        <strong class="spec-item-name">${item.label}</strong>
        <span class="spec-item-helper">${item.helper}</span>
      </span>
    </label>
  `;

  // Handle selection changes
  const input = wrapper.querySelector('input');
  input.addEventListener('change', () => {
    if (section.type === 'single-choice') {
      selections[section.id] = input.checked ? item.id : null;
    } else {
      if (input.checked) {
        selections[section.id].add(item.id);
      } else {
        selections[section.id].delete(item.id);
      }
    }
    // Re-evaluate showIf for all items since selections changed
    updateAllVisibility();
  });

  return wrapper;
}

// --- showIf logic ---
function updateAllVisibility() {
  const allItems = document.querySelectorAll('.spec-item[data-show-if]');
  allItems.forEach(itemEl => {
    const rule = JSON.parse(itemEl.dataset.showIf);
    const visible = evaluateShowIf(rule);
    itemEl.style.display = visible ? '' : 'none';

    // If hidden, clear its selection
    if (!visible) {
      const input = itemEl.querySelector('input');
      if (input) {
        const sectionId = input.dataset.section;
        const itemId = input.dataset.item;
        input.checked = false;
        if (selections[sectionId] instanceof Set) {
          selections[sectionId].delete(itemId);
        } else if (selections[sectionId] === itemId) {
          selections[sectionId] = null;
        }
      }
    }
  });
}

function evaluateShowIf(rule) {
  // rule: { source: 'phase1'|'phase2', sectionId: string, anyOf: [values] }
  if (rule.source === 'phase1') {
    const phase1Answer = phase1Session?.answers?.[rule.sectionId];
    return rule.anyOf.includes(phase1Answer);
  }
  if (rule.source === 'phase2') {
    const sel = selections[rule.sectionId];
    if (sel === null || sel === undefined) return false;
    if (sel instanceof Set) {
      return rule.anyOf.some(v => sel.has(v));
    }
    return rule.anyOf.includes(sel);
  }
  return true;
}

// --- Submit ---
async function submitSpec() {
  const submitBtn = document.getElementById('spec-submit-btn');
  const sentMsg   = document.getElementById('spec-sent-msg');
  const errMsg    = document.getElementById('spec-error-msg');

  // Validate email
  const email = getEmail();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errMsg.textContent = 'Please enter a valid email address.';
    errMsg.style.display = 'block';
    // Make sure the input is visible and focus it
    document.getElementById('spec-email-confirm').style.display = 'none';
    document.getElementById('spec-email-input-wrap').style.display = 'flex';
    document.getElementById('spec-email-input').focus();
    return;
  }

  // Build selections payload
  const payload = {};
  Object.entries(selections).forEach(([sectionId, sel]) => {
    if (sel instanceof Set) {
      payload[sectionId] = Array.from(sel);
    } else if (sel) {
      payload[sectionId] = sel;
    }
  });

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';
  errMsg.style.display = 'none';

  try {
    const res = await fetch('/functions/send-spec-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        phase1Answers: phase1Session?.answers || null,
        phase2Selections: payload
      })
    });
    const data = await res.json();

    if (res.ok && data.status === 'success') {
      sentMsg.style.display = 'block';
      submitBtn.style.display = 'none';
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } else {
      errMsg.textContent = data.message || 'Something went wrong. Please try again.';
      errMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Email me my spec sheet →';
    }
  } catch {
    errMsg.textContent = 'Network error. Please try again.';
    errMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Email me my spec sheet →';
  }
}
