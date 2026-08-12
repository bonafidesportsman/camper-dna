// Cloudflare Pages Function: POST /functions/send-spec-sheet
// Accepts phase 2 selections + email, formats a spec sheet and sends via Resend

// Human-readable labels for each section and item
const SECTION_LABELS = {
  "roof": "Roof",
  "roof-extras": "Roof Extras",
  "sleeping": "Sleeping",
  "sleeping-extras": "Sleeping Extras",
  "seating": "Seating",
  "kitchen": "Kitchen",
  "heating": "Heating",
  "electrics": "Electrics",
  "lighting": "Lighting",
  "storage": "Storage",
  "windows": "Windows & Privacy",
  "exterior": "Exterior",
  "safety": "Safety",
  "nice-to-haves": "Nice to Haves"
};

const PHASE1_LABELS = {
  "budget": {
    "under-20k": "Under £20,000",
    "20-30k": "£20,000-30,000",
    "30-45k": "£30,000-45,000",
    "45k-plus": "£45,000+"
  },
  "buying_route": {
    "preconverted": "Buy a pre-converted van (already fitted out by someone else)",
    "donor-converter": "Buy a donor van and commission a conversion company",
    "donor-selfbuild": "Buy a donor van and self-build (or partial self-build)",
    "undecided": "Not decided yet"
  },
  "van_generation": {
    "t6": "T6 / T6.1 (2015 or newer) - Euro 6 compliant, widest conversion ecosystem",
    "t5": "T5 (2009-2015) - excellent reliability, better value, not ULEZ-compliant",
    "t7": "T7 Transporter (UK from 2025) - new platform, conversion ecosystem still forming",
    "undecided": "Not sure - help me understand the differences"
  },
  "mileage": {
    "under-50k": "Under 50,000 miles - better resale, more years ahead",
    "100-150k": "Happy with 100-150,000 with full service history - much better value",
    "depends": "Depends on price and history"
  },
  "van_source": {
    "vw-approved": "VW Approved Used (141-point check, warranty included - recommended)",
    "private": "Private sale (better prices, less comeback if something goes wrong)",
    "converter": "Conversion company sourcing it (convenient, they know what to look for)",
    "undecided": "Not sure yet"
  },
  "spec_level": {
    "highline": "Highline (recommended - aircon standard, heated windscreen, parking sensors)",
    "sportline": "Sportline (lifestyle grade above Highline - 204PS DSG, lowered sports suspension, premium interior. Note: lowered suspension is a disadvantage for campsites and rough tracks; interior gets stripped in a conversion so the premium may not be worth it)",
    "trendline": "Trendline or Startline (budget - aircon often missing, needs retrofitting)",
    "na": "T7 / already have a van / not applicable"
  },
  "transmission": {
    "6-manual": "6-speed manual - common, reliable, lower purchase price (availability depends on engine and generation)",
    "dsg": "7-speed DSG automatic - smoother in traffic and towing, higher purchase price (150PS or 204PS only)",
    "5-manual": "5-speed manual - older T5 or lower-powered T6/T6.1 engine, lowest cost, very reliable",
    "undecided": "Not decided yet"
  },
  "seating": {
    "2-rear": "2 rear seats (recommended - wider bed, more kitchen and storage space)",
    "3-rear": "3 rear seats (accommodates three passengers, but loses storage)",
    "unsure": "Not sure"
  },
  "doors": {
    "barn": "Barn doors (two doors opening sideways)",
    "tailgate": "Tailgate (single door lifting upward)",
    "unsure": "Not sure - explain the difference"
  },
  "roof": {
    "pop-top": "Pop-top (elevating roof - extra sleeping, stays under 2m for car parks)",
    "high-roof": "High-roof (fixed raised - full standing height, no mechanism to maintain)",
    "standard": "Standard roof (no modification - lowest cost, limited headroom)"
  },
  "bed": {
    "rib": "RIB bed (folds from rear seat - ISOfix points, storage underneath)",
    "rock-roll": "Rock and Roll bed (fold-flat - simple, widely available)",
    "fixed": "Fixed bed (always made up - maximum convenience, less boot space)",
    "undecided": "Not sure"
  },
  "activities": {
    "watersports": "Surfing or water sports (board storage, roof rack, rinse shower)",
    "cycling": "Cycling or mountain biking (bike rack essential)",
    "hiking": "Hiking, climbing or trail running (lighter gear, less storage intensive)",
    "general": "General use - no specific sport or large kit"
  },
  "awning": {
    "retractable": "Retractable awning (extends out for shade and light rain cover)",
    "rail": "Awning rail (rail on van side - drive-away tent slots in and stays when you drive off)",
    "none": "No awning needed"
  },
  "heating": {
    "yes": "Yes - year-round use, cold nights, want to warm the van remotely",
    "maybe": "Probably - but not sure what's involved",
    "no": "No - mainly summer use, campsites with electricity"
  },
  "electrical": {
    "essential": "Essential - I want to wild camp and never rely on campsites",
    "useful": "Useful - mix of wild camping and campsites",
    "not-important": "Not important - I'll mostly use sites with electric hookup"
  }
};

const PHASE2_ITEM_LABELS = {
  "roof": {
    "roof-standard": "Standard roof",
    "roof-pop-top": "Pop-top roof",
    "roof-high-fixed": "High-roof (fixed raised)"
  },
  "roof-extras": {
    "roof-vent-fan": "Electric ventilation fan",
    "roof-skylight": "Skylight / roof light (non-opening)",
    "roof-rack": "Roof rack"
  },
  "sleeping": {
    "bed-rib": "RIB bed (ISOfix points available)",
    "bed-rock-roll": "Rock and Roll bed",
    "bed-fixed": "Fixed bed (always made up)",
    "bed-single-twin": "Single / twin bed layout"
  },
  "sleeping-extras": {
    "bed-pop-top-bunk": "Pop-top sleeping platform",
    "bed-mattress-topper": "Mattress topper / comfort layer",
    "bed-wide-112": "Bed width: standard (~112cm)",
    "bed-wide-129": "Bed width: wide (~129cm - 3-seat RIB)",
    "bed-wide-150": "Bed width: full-width (~150cm)"
  },
  "seating": {
    "seat-2-rear": "2-seat rear bench",
    "seat-3-rear": "3-seat rear bench",
    "seat-swivel-driver": "Swivel front seat (driver)",
    "seat-swivel-passenger": "Swivel front seat (passenger)",
    "seat-captain": "Captain seat (single front passenger)",
    "seat-retrim": "Seat upholstery re-trim",
    "seat-isofix": "ISOfix child seat points"
  },
  "kitchen": {
    "kitchen-none": "No fitted kitchen",
    "kitchen-hob-single": "Single gas hob",
    "kitchen-hob-twin": "Twin gas hob",
    "kitchen-hob-sink-combo": "Hob + sink combination unit",
    "kitchen-water-cold": "Cold water tap (electric pump)",
    "kitchen-water-hot-cold": "Hot and cold water",
    "kitchen-fridge-top": "Compressor fridge (top-loading)",
    "kitchen-fridge-front": "Compressor fridge (front-loading)",
    "kitchen-coolbox": "Portable cool box (no fitted fridge)",
    "kitchen-gas-locker": "Gas bottle locker with dropout vent"
  },
  "heating": {
    "heating-none": "No dedicated heating",
    "heating-diesel": "Diesel night heater",
    "heating-diesel-phone": "Phone / app-controllable heater timer",
    "heating-gas": "Gas heater"
  },
  "electrics": {
    "elec-battery-agm-100": "AGM leisure battery 100Ah",
    "elec-battery-agm-200": "AGM leisure battery 200Ah+",
    "elec-battery-lithium-100": "Lithium (LiFePO4) battery 100Ah",
    "elec-battery-lithium-200": "Lithium (LiFePO4) battery 200Ah+",
    "elec-split-charge": "Split charge relay (basic alternator charging)",
    "elec-dc-dc": "DC-DC charger (B2B charger - recommended)",
    "elec-solar-100": "Solar panel 100W",
    "elec-solar-200": "Solar panel 200W",
    "elec-solar-400": "Solar panel 400W+",
    "elec-mppt": "MPPT solar charge controller",
    "elec-hookup": "240v mains hookup socket",
    "elec-sockets-240": "240v mains sockets (internal)",
    "elec-sockets-12v": "12v cigar-lighter sockets",
    "elec-sockets-usb": "USB sockets (A and/or C)",
    "elec-power-panel": "Touchscreen power management panel"
  },
  "lighting": {
    "light-ceiling-spots": "LED ceiling spotlights",
    "light-dimmable": "Dimmable lighting",
    "light-task-kitchen": "Under-cupboard task lighting",
    "light-bed-reading": "Reading light over bed",
    "light-ambient-strip": "Ambient / mood LED strip",
    "light-pop-top": "Pop-top interior light",
    "light-awning": "Awning / exterior light strip"
  },
  "storage": {
    "storage-overhead-lockers": "Overhead lockers (above hob/sink)",
    "storage-overhead-lockers-rear": "Overhead lockers rear (above bed)",
    "storage-under-bed-drawers": "Under-bed pull-out drawers",
    "storage-under-bed-open": "Under-bed open storage (lift-up access)",
    "storage-wardrobe-hanging": "Wardrobe with hanging rail",
    "storage-wardrobe-shelves": "Wardrobe with shelving",
    "storage-spice-rack": "Kitchen rail / spice rack"
  },
  "windows": {
    "windows-opening-side": "Opening side window",
    "windows-fixed-tinted": "Fixed tinted privacy windows",
    "windows-blinds-roller": "Roller blinds (window-fit)",
    "windows-blinds-pleated": "Curtains (pleated / concertina)",
    "windows-screen-wrap": "Cab screen wrap / cover (driver + passenger)",
    "windows-cab-divider": "Cab divider / bulkhead curtain",
    "windows-insulation-full": "Full insulation lining (walls and ceiling)",
    "windows-acoustic": "Acoustic insulation (sound deadening)"
  },
  "exterior": {
    "ext-barn-doors": "Barn doors (rear)",
    "ext-tailgate": "Tailgate (rear)",
    "ext-rear-window": "Rear door window (glass insert)",
    "ext-awning-retractable": "Retractable awning",
    "ext-awning-rail": "Awning rail (for drive-away tent)",
    "ext-step": "Fold-down entry step",
    "ext-towbar-fixed": "Towbar (fixed)",
    "ext-towbar-detachable": "Towbar (detachable)"
  },
  "safety": {
    "safety-fire-extinguisher": "Fire extinguisher",
    "safety-first-aid": "First aid kit"
  },
  "nice-to-haves": {
    "acc-carplay": "Wireless Apple CarPlay / Android Auto",
    "acc-running-boards": "Side running boards",
    "acc-bodykit-splitter": "Body kit - front splitter",
    "acc-bodykit-spoiler": "Body kit - rear spoiler",
    "acc-alloys": "Alloy wheels",
    "acc-reversing-camera": "Reversing camera",
    "acc-led-headlights": "LED headlights",
    "acc-rear-speakers": "Rear speakers / audio"
  }
};

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin');
  const headers = buildApiHeaders(origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: 'error', message: 'Invalid request body.' }, { status: 400, headers });
  }

  const { email, phase1Answers, phase2Selections } = body || {};

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return Response.json({ status: 'error', message: 'Please enter a valid email address.' }, { status: 400, headers });
  }

  // Validate selections
  if (!phase2Selections || typeof phase2Selections !== 'object' || Array.isArray(phase2Selections)) {
    return Response.json({ status: 'error', message: 'No spec selections received.' }, { status: 400, headers });
  }
  const selectionValidationError = validatePhase2Selections(phase2Selections);
  if (selectionValidationError) {
    return Response.json({ status: 'error', message: selectionValidationError }, { status: 400, headers });
  }

  // Check env vars
  if (!env.RESEND_API_KEY) {
    console.error('[send-spec-sheet] Missing RESEND_API_KEY');
    return Response.json({ status: 'error', message: 'Service temporarily unavailable.' }, { status: 500, headers });
  }

  // Rate limiting via KV
  if (env.CAMPERDNA_KV) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipKey = `spec:rate:${ip}`;
    const ipCount = await env.CAMPERDNA_KV.get(ipKey);
    const count = parseInt(ipCount || '0', 10);
    if (count >= 5) {
      return Response.json({ status: 'error', message: 'Too many requests. Try again in an hour.' }, { status: 429, headers });
    }
    env.CAMPERDNA_KV.put(ipKey, String(count + 1), { expirationTtl: 3600 }).catch(() => {});
  }

  // Build email HTML
  const emailHTML = buildSpecSheetEmail(email, phase1Answers, phase2Selections);
  const emailText = buildSpecSheetText(email, phase1Answers, phase2Selections);

  // Send via Resend
  const fromEmail = env.RESEND_FROM_EMAIL || 'campfire@camper-dna.com';
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `CamperDNA <${fromEmail}>`,
        to: [email.trim()],
        subject: `Your CamperDNA Conversion Spec`,
        html: emailHTML,
        text: emailText,
        reply_to: 'campfire@camper-dna.com',
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[send-spec-sheet] Resend error:', resendRes.status, errText);
      return Response.json({ status: 'error', message: 'Email delivery failed. Please try again.' }, { status: 500, headers });
    }

    const resendData = await resendRes.json();
    return Response.json({ status: 'success', message: 'Spec sheet sent.', emailId: resendData.id }, { status: 200, headers });

  } catch (err) {
    console.error('[send-spec-sheet] Resend fetch error:', err);
    return Response.json({ status: 'error', message: 'Email delivery failed. Please try again.' }, { status: 500, headers });
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: buildApiHeaders(request.headers.get('Origin')),
  });
}


const ALLOWED_ORIGINS = new Set(['https://camper-dna.com', 'https://www.camper-dna.com']);

function buildApiHeaders(origin) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Cache-Control': 'no-store',
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validatePhase2Selections(phase2Selections) {
  for (const [sectionId, rawValue] of Object.entries(phase2Selections)) {
    const allowedItems = PHASE2_ITEM_LABELS[sectionId];
    if (!allowedItems) return 'Unknown spec section received.';
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const itemId of values) {
      if (typeof itemId !== 'string' || !Object.prototype.hasOwnProperty.call(allowedItems, itemId)) {
        return 'Unknown spec item received.';
      }
    }
  }
  return null;
}

// --- Build email HTML ---
function buildSpecSheetEmail(email, phase1Answers, phase2Selections) {
  let phase1HTML = '';
  if (phase1Answers && Object.keys(phase1Answers).length > 0) {
    const rows = [
      ['Budget', PHASE1_LABELS.budget?.[phase1Answers.budget] || phase1Answers.budget],
      ['Van Type', PHASE1_LABELS.van_generation?.[phase1Answers.van_generation] || phase1Answers.van_generation],
      ['Buying Route', PHASE1_LABELS.buying_route?.[phase1Answers.buying_route] || phase1Answers.buying_route],
      ['Trim Level', PHASE1_LABELS.spec_level?.[phase1Answers.spec_level] || phase1Answers.spec_level],
      ['Gearbox', PHASE1_LABELS.transmission?.[phase1Answers.transmission] || phase1Answers.transmission],
    ].filter(([, val]) => val && val !== 'undefined');

    phase1HTML = `
      <div class="profile-summary-box" style="background:#F9F8F6;padding:20px 24px;border-radius:6px;margin-bottom:28px;">
        <h3 style="margin:0 0 14px;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;">From Your CamperDNA Profile</h3>
        <table class="profile-summary-table" style="width:100%;border-collapse:collapse;font-size:14px;">
          ${rows.map(([label, val]) => `
            <tr>
              <td style="padding:6px 12px 6px 0;color:#6B7280;white-space:nowrap;vertical-align:top;">${label}</td>
              <td style="padding:6px 0;font-weight:600;color:#1F2937;">${escapeHTML(val)}</td>
            </tr>`).join('')}
        </table>
      </div>`;
  }

  const sectionsHTML = Object.entries(phase2Selections)
    .filter(([, val]) => {
      if (Array.isArray(val)) return val.length > 0;
      return !!val;
    })
    .map(([sectionId, val]) => {
      const sectionLabel = SECTION_LABELS[sectionId] || sectionId;
      const items = Array.isArray(val) ? val : [val];
      const itemList = items.map(id =>
        `<li style="margin-bottom:4px;color:#374151;">${escapeHTML(formatItemId(sectionId, id))}</li>`
      ).join('');
      return `
        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #E5E7EB;">
          <h3 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1F2937;">${escapeHTML(sectionLabel)}</h3>
          <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;">${itemList}</ul>
        </div>`;
    }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your CamperDNA Conversion Spec</title>
  <style>
    @media only screen and (max-width:480px){
      .email-shell{width:100% !important;margin:0 !important;border-radius:0 !important;}
      .email-section{padding:24px 18px !important;}
      .profile-summary-table,.profile-summary-table tbody,.profile-summary-table tr,.profile-summary-table td{display:block !important;width:100% !important;}
      .profile-summary-table tr{border-bottom:1px solid #E5E7EB;padding:6px 0;}
      .profile-summary-table tr:last-child{border-bottom:0;}
      .profile-summary-table td{box-sizing:border-box;padding:2px 0 !important;white-space:normal !important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.6;color:#1F2937;">
  <div class="email-shell" style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div class="email-section" style="background:#1F2937;padding:36px 32px;text-align:center;">
      <div style="font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#D4704F;margin-bottom:10px;">CamperDNA</div>
      <h1 style="margin:0;font-size:26px;font-weight:700;color:#F9F8F6;line-height:1.3;">Your Conversion Spec Sheet</h1>
      <p style="margin:12px 0 0;font-size:14px;color:#9CA3AF;">Everything you want in your conversion - ready to send to a converter</p>
    </div>

    <!-- Body -->
    <div class="email-section" style="padding:32px;">
      ${phase1HTML}

      <h2 style="margin:0 0 20px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Conversion Spec</h2>

      ${sectionsHTML || '<p style="color:#6B7280;font-style:italic;">No items selected.</p>'}

      <div style="background:#F9F8F6;padding:20px 24px;border-radius:6px;margin-top:24px;">
        <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>How to use this spec sheet:</strong></p>
        <p style="margin:0;font-size:14px;color:#6B7280;">Forward this email to your conversion company and ask them to quote against the selected items. Each item is a starting point for the conversation - your converter may have equivalent or preferred products for some specifications.</p>
      </div>
    </div>

    <!-- CTA -->
    <div class="email-section" style="background:#F9F8F6;padding:28px 32px;text-align:center;border-top:1px solid #E5E7EB;">
      <p style="margin:0 0 16px;font-size:14px;color:#6B7280;">Questions about your spec? Reply to this email.</p>
      <a href="https://camper-dna.com/buying-a-van/" style="display:inline-block;padding:14px 28px;background:#D4704F;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:4px;">📋 Buying Guide →</a>
    </div>

    <!-- Footer -->
    <div class="email-section" style="background:#1F2937;padding:20px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#6B7280;">CamperDNA · Real advice for VW van buyers · <a href="https://camper-dna.com" style="color:#9CA3AF;text-decoration:none;">camper-dna.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

function buildSpecSheetText(email, phase1Answers, phase2Selections) {
  let lines = ['Your CamperDNA Conversion Spec', '==============================', ''];

  if (phase1Answers && Object.keys(phase1Answers).length > 0) {
    lines.push('FROM YOUR PROFILE', '--------------');
    if (phase1Answers.van_generation) lines.push(`Van Type: ${PHASE1_LABELS.van_generation?.[phase1Answers.van_generation] || phase1Answers.van_generation}`);
    if (phase1Answers.buying_route) lines.push(`Buying Route: ${PHASE1_LABELS.buying_route?.[phase1Answers.buying_route] || phase1Answers.buying_route}`);
    if (phase1Answers.transmission) lines.push(`Gearbox: ${PHASE1_LABELS.transmission?.[phase1Answers.transmission] || phase1Answers.transmission}`);
    lines.push('');
  }

  lines.push('CONVERSION SPEC', '---------------');
  Object.entries(phase2Selections)
    .filter(([, val]) => Array.isArray(val) ? val.length > 0 : !!val)
    .forEach(([sectionId, val]) => {
      lines.push('');
      lines.push((SECTION_LABELS[sectionId] || sectionId).toUpperCase());
      const items = Array.isArray(val) ? val : [val];
      items.forEach(id => lines.push(`  • ${formatItemId(sectionId, id)}`));
    });

  lines.push('', '---', 'CamperDNA · camper-dna.com');
  return lines.join('\n');
}

// Convert item IDs like "bed-rib" to "Bed rib" (fallback - real labels come from JSON on the front end)
function formatItemId(sectionId, id) {
  return PHASE2_ITEM_LABELS[sectionId]?.[id] || String(id)
    .split('-')
    .map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)
    .join(' ');
}
