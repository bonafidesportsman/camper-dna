// Cloudflare Pages Function: POST /functions/send-spec-sheet
// Accepts phase 2 selections + email, formats a spec sheet and sends via Resend

// Human-readable labels for each section and item
const SECTION_LABELS = {
  'roof':            'Roof',
  'roof-extras':     'Roof Extras',
  'sleeping':        'Sleeping',
  'sleeping-extras': 'Sleeping Extras',
  'seating':         'Seating',
  'kitchen':         'Kitchen',
  'heating':         'Heating',
  'electrics':       'Electrics',
  'lighting':        'Lighting',
  'storage':         'Storage',
  'windows':         'Windows & Privacy',
  'exterior':        'Exterior',
  'safety':          'Safety',
  'finish':          'Finish & Cosmetics',
  'nice-to-haves':   'Nice to Haves',
};

const PHASE1_LABELS = {
  budget:         { 'under-20k': 'Under £20,000', '20-30k': '£20,000–30,000', '30-45k': '£30,000–45,000', '45k-plus': '£45,000+' },
  buying_route:   { preconverted: 'Pre-converted van', 'donor-converter': 'Donor + converter', 'donor-selfbuild': 'Donor + self-build', undecided: 'Not decided' },
  van_generation: { t6: 'T6 / T6.1 (2015+)', t5: 'T5 (2009–2015)', undecided: 'Not decided' },
  transmission:   { '6-manual': '6-speed manual', dsg: 'DSG automatic', '5-manual': '5-speed manual', undecided: 'Not decided' },
  spec_level:     { highline: 'Highline', sportline: 'Sportline', trendline: 'Trendline/Startline', na: 'Already have a van' },
  roof:           { 'pop-top': 'Pop-top', 'high-roof': 'High-roof', standard: 'Standard roof' },
  bed:            { rib: 'RIB bed (ISOfix)', 'rock-roll': 'Rock and Roll', fixed: 'Fixed bed', undecided: 'Not decided' },
  heating:        { yes: 'Diesel heater (yes)', maybe: 'Diesel heater (likely)', no: 'Not required' },
  electrical:     { essential: 'Solar essential', useful: 'Solar useful', 'not-important': 'Hookup sites' },
};

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

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
  if (!phase2Selections || typeof phase2Selections !== 'object') {
    return Response.json({ status: 'error', message: 'No spec selections received.' }, { status: 400, headers });
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
  const fromEmail = env.RESEND_FROM_EMAIL || 'spec@camper-dna.com';
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
        reply_to: 'hello@camper-dna.com',
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[send-spec-sheet] Resend error:', resendRes.status, errText);
      return Response.json({ status: 'error', message: 'Email delivery failed. Please try again.' }, { status: 500, headers });
    }

    const resendData = await resendRes.json();
    return Response.json({ status: 'success', message: `Spec sheet sent to ${email.trim()}`, emailId: resendData.id }, { status: 200, headers });

  } catch (err) {
    console.error('[send-spec-sheet] Resend fetch error:', err);
    return Response.json({ status: 'error', message: 'Email delivery failed. Please try again.' }, { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
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
      <div style="background:#F9F8F6;padding:20px 24px;border-radius:6px;margin-bottom:28px;">
        <h3 style="margin:0 0 14px;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;">From Your CamperDNA Quiz</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${rows.map(([label, val]) => `
            <tr>
              <td style="padding:6px 12px 6px 0;color:#6B7280;white-space:nowrap;vertical-align:top;">${label}</td>
              <td style="padding:6px 0;font-weight:600;color:#1F2937;">${val}</td>
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
        `<li style="margin-bottom:4px;color:#374151;">${formatItemId(id)}</li>`
      ).join('');
      return `
        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #E5E7EB;">
          <h3 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1F2937;">${sectionLabel}</h3>
          <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;">${itemList}</ul>
        </div>`;
    }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your CamperDNA Conversion Spec</title>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.6;color:#1F2937;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1F2937;padding:36px 32px;text-align:center;">
      <div style="font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#D4704F;margin-bottom:10px;">CamperDNA</div>
      <h1 style="margin:0;font-size:26px;font-weight:700;color:#F9F8F6;line-height:1.3;">Your Conversion Spec Sheet</h1>
      <p style="margin:12px 0 0;font-size:14px;color:#9CA3AF;">Everything you want in your conversion — ready to send to a converter</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      ${phase1HTML}

      <h2 style="margin:0 0 20px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Conversion Spec</h2>

      ${sectionsHTML || '<p style="color:#6B7280;font-style:italic;">No items selected.</p>'}

      <div style="background:#F9F8F6;padding:20px 24px;border-radius:6px;margin-top:24px;">
        <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>How to use this spec sheet:</strong></p>
        <p style="margin:0;font-size:14px;color:#6B7280;">Forward this email to your conversion company and ask them to quote against the selected items. Each item is a starting point for the conversation — your converter may have equivalent or preferred products for some specifications.</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="background:#F9F8F6;padding:28px 32px;text-align:center;border-top:1px solid #E5E7EB;">
      <p style="margin:0 0 16px;font-size:14px;color:#6B7280;">Questions about your spec? Reply to this email.</p>
      <a href="https://camper-dna.com/buying-a-van/" style="display:inline-block;padding:14px 28px;background:#D4704F;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:4px;">📋 Buying Guide →</a>
    </div>

    <!-- Footer -->
    <div style="background:#1F2937;padding:20px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#6B7280;">CamperDNA · Real advice for VW van buyers · <a href="https://camper-dna.com" style="color:#9CA3AF;text-decoration:none;">camper-dna.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

function buildSpecSheetText(email, phase1Answers, phase2Selections) {
  let lines = ['Your CamperDNA Conversion Spec', '==============================', ''];

  if (phase1Answers && Object.keys(phase1Answers).length > 0) {
    lines.push('FROM YOUR QUIZ', '--------------');
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
      items.forEach(id => lines.push(`  • ${formatItemId(id)}`));
    });

  lines.push('', '---', 'CamperDNA · camper-dna.com');
  return lines.join('\n');
}

// Convert item IDs like "bed-rib" to "Bed rib" (fallback — real labels come from JSON on the front end)
function formatItemId(id) {
  return id
    .split('-')
    .map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)
    .join(' ');
}
