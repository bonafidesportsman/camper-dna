// Cloudflare Pages Function: POST /functions/generate-report
// Receives quiz answers + email, calls Claude via OpenRouter, sends report via Resend

const QUESTION_LABELS = {
  budget:       { 'under-20k': 'Under £20,000', '20-30k': '£20,000–30,000', '30-45k': '£30,000–45,000', '45k-plus': '£45,000+' },
  buying_route: { preconverted: 'Buy pre-converted', 'donor-converter': 'Donor van + conversion company', 'donor-selfbuild': 'Donor van + self-build', undecided: 'Not decided' },
  van_generation: { t6: 'T6 (2015+, ULEZ-compliant)', t5: 'T5 (2009–2015)', undecided: 'Not sure yet' },
  mileage:      { 'under-50k': 'Under 50,000 miles preferred', '100-150k': 'Happy with 100–150k with full history', depends: 'Depends on price and history' },
  van_source:   { 'vw-approved': 'VW Approved Used', private: 'Private sale', converter: 'Via conversion company', undecided: 'Not sure' },
  spec_level:   { highline: 'Highline', sportline: 'Sportline', trendline: 'Trendline/Startline', na: 'Already have a van / N/A' },
  transmission: { '6-manual': '6-speed manual', dsg: '7-speed DSG automatic', '5-manual': '5-speed manual', undecided: 'Not decided yet' },
  seating:      { '2-rear': '2 rear seats (wider bed, more storage)', '3-rear': '3 rear seats (ISOfix for 3 children)', unsure: 'Not sure' },
  doors:        { barn: 'Barn doors', tailgate: 'Tailgate', unsure: 'Not sure' },
  roof:         { 'pop-top': 'Pop-top (elevating roof)', 'high-roof': 'High-roof (fixed raised)', standard: 'Standard roof' },
  bed:          { rib: 'RIB bed (ISOfix, M1 crash tested)', 'rock-roll': 'Rock and Roll bed', fixed: 'Fixed bed', undecided: 'Not sure' },
  activities:   { watersports: 'Surfing / water sports', cycling: 'Cycling / mountain biking', hiking: 'Hiking / trail running / climbing', general: 'General use, no specific sport' },
  awning:       { retractable: 'Retractable awning', rail: 'Awning rail for drive-away tent', none: 'No awning needed' },
  heating:      { yes: 'Yes — year-round use / cold nights', maybe: 'Probably yes', no: 'No — mainly summer / campsites' },
  electrical:   { essential: 'Essential — wild camp, no mains hookup', useful: 'Useful — mix of wild and sites', 'not-important': 'Not important — mostly hookup sites' },
};

const REQUIRED_KEYS = ['budget', 'buying_route', 'van_generation', 'mileage', 'van_source', 'spec_level', 'transmission', 'seating', 'doors', 'roof', 'bed', 'activities', 'awning', 'heating', 'electrical'];

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: 'error', message: 'Invalid request body.', code: 'VALIDATION_ERROR' }, { status: 400, headers });
  }

  const { email, answers } = body || {};

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return Response.json({ status: 'error', message: 'Please enter a valid email address.', code: 'VALIDATION_ERROR' }, { status: 400, headers });
  }

  // Validate answers
  if (!answers || typeof answers !== 'object') {
    return Response.json({ status: 'error', message: 'Quiz answers are missing.', code: 'VALIDATION_ERROR' }, { status: 400, headers });
  }
  const missing = REQUIRED_KEYS.filter(k => !answers[k]);
  if (missing.length > 0) {
    return Response.json({ status: 'error', message: `Missing answers for: ${missing.join(', ')}`, code: 'VALIDATION_ERROR' }, { status: 400, headers });
  }

  // Rate limiting + deduplication via KV (if bound)
  if (env.CAMPERDNA_KV) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipKey = `rate:${ip}`;
    const emailKey = `dedup:${email.toLowerCase().trim()}`;

    const [ipCount, emailSent] = await Promise.all([
      env.CAMPERDNA_KV.get(ipKey),
      env.CAMPERDNA_KV.get(emailKey),
    ]);

    if (emailSent) {
      return Response.json({ status: 'error', message: 'A report was already sent to this address in the last hour. Check your inbox (including spam).', code: 'RATE_LIMITED' }, { status: 429, headers });
    }

    const count = parseInt(ipCount || '0', 10);
    if (count >= 10) {
      return Response.json({ status: 'error', message: 'Too many requests from this connection. Try again in an hour.', code: 'RATE_LIMITED' }, { status: 429, headers });
    }

    // Write KV (non-blocking — don't await)
    const expirationTtl = 3600;
    env.CAMPERDNA_KV.put(ipKey, String(count + 1), { expirationTtl }).catch(() => {});
    env.CAMPERDNA_KV.put(emailKey, '1', { expirationTtl }).catch(() => {});
  }

  // Check env vars
  if (!env.OPENROUTER_API_KEY) {
    console.error('[generate-report] Missing OPENROUTER_API_KEY');
    return Response.json({ status: 'error', message: 'Service temporarily unavailable.', code: 'API_ERROR' }, { status: 500, headers });
  }
  if (!env.RESEND_API_KEY) {
    console.error('[generate-report] Missing RESEND_API_KEY');
    return Response.json({ status: 'error', message: 'Service temporarily unavailable.', code: 'API_ERROR' }, { status: 500, headers });
  }

  // Build answer summary for prompt
  const answerLines = REQUIRED_KEYS.map(k => {
    const label = QUESTION_LABELS[k]?.[answers[k]] || answers[k];
    return `- ${k.replace(/_/g, ' ')}: ${label}`;
  }).join('\n');

  const systemPrompt = `You are writing a personalised CamperDNA buying guide email for someone about to buy a VW Transporter campervan conversion. You are the founder of CamperDNA — you spent a year researching before buying a VW T6, then helped four friends through the same buying process. Your advice is based on real experience, not theory.

Your tone is:
- Warm and direct (like talking to a friend who's been through this)
- Practical (specific product names, real costs, actionable next steps)
- Honest (if something is a compromise, say so)
- Never salesy (only recommend what you'd actually use)
- Experienced but not condescending

Structure your report in exactly this format:

## Personal Summary
Two paragraphs. Summarise what the quiz told you about their needs, budget, and priorities. Use specific details. Show you understood their situation.

## Recommended Spec
Present a clear 8-row table using markdown:
| Dimension | Recommendation | Why |
|---|---|---|
[Complete for: Van Type, Buying Route, Source, Roof, Bed, Doors, Heating, Electrical]

## Deep Dive
For each spec dimension, write a short paragraph: what they're choosing between, why you'd recommend one option, the trade-offs and gotchas, specific product examples and real costs where relevant.

## What to Watch Out For
3–5 specific red flags based on their situation (buying route, budget, mileage tolerance). Include: service history, AdBlue (if T6), damp/mould signs, suspicious pricing, conversion quality.

## Top 3–5 Things to Verify Before Buying
Numbered. Specific to their situation.

## Useful Resources
- Link: /buying-a-van/ (Buying guide)
- Link: /buying-a-van/inspection-checklist/ (Inspection checklist)
- Link: /blog/ (Blog)

Close with a warm sign-off that invites questions.

Keep the report to 900–1200 words. Format: plain Markdown.`;

  const userMessage = `Please write a personalised CamperDNA buying guide for this reader.

**Quiz Answers:**
${answerLines}

**Email:** ${email.trim()}`;

  // Call Claude via OpenRouter
  let markdownReport;
  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://camper-dna.com',
        'X-Title': 'CamperDNA Report Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      console.error('[generate-report] OpenRouter error:', orRes.status, errText);
      return Response.json({ status: 'error', message: 'Report generation failed. Please try again in a moment.', code: 'API_ERROR' }, { status: 500, headers });
    }

    const orData = await orRes.json();
    markdownReport = orData.choices?.[0]?.message?.content;
    if (!markdownReport) {
      console.error('[generate-report] Empty response from OpenRouter');
      return Response.json({ status: 'error', message: 'Report generation failed. Please try again.', code: 'API_ERROR' }, { status: 500, headers });
    }
  } catch (err) {
    console.error('[generate-report] OpenRouter fetch error:', err);
    return Response.json({ status: 'error', message: 'Report generation timed out. Please try again in a moment.', code: 'API_ERROR' }, { status: 500, headers });
  }

  // Convert markdown → HTML
  const reportHTML = markdownToHTML(markdownReport);

  // Build spec summary for email header
  const specRows = buildSpecRows(answers);

  // Generate email HTML + text
  const emailHTML = buildEmailHTML(reportHTML, specRows, email);
  const emailText = buildEmailText(markdownReport, specRows, email);

  // Send via Resend
  const fromEmail = env.RESEND_FROM_EMAIL || 'reports@camper-dna.com';
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
        subject: `Your CamperDNA Profile — personalised van buying guide`,
        html: emailHTML,
        text: emailText,
        reply_to: 'hello@camper-dna.com',
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[generate-report] Resend error:', resendRes.status, errText);
      return Response.json({ status: 'error', message: 'Email delivery failed. Please try again.', code: 'API_ERROR' }, { status: 500, headers });
    }

    const resendData = await resendRes.json();
    return Response.json({ status: 'success', message: `Report sent to ${email.trim()}`, emailId: resendData.id }, { status: 200, headers });

  } catch (err) {
    console.error('[generate-report] Resend fetch error:', err);
    return Response.json({ status: 'error', message: 'Email delivery failed. Please try again.', code: 'API_ERROR' }, { status: 500, headers });
  }
}

// CORS preflight
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

// --- Helpers ---

function buildSpecRows(answers) {
  return [
    { label: 'Van Type',     value: QUESTION_LABELS.van_generation?.[answers.van_generation] || answers.van_generation },
    { label: 'Buying Route', value: QUESTION_LABELS.buying_route?.[answers.buying_route] || answers.buying_route },
    { label: 'Source',       value: QUESTION_LABELS.van_source?.[answers.van_source] || answers.van_source },
    { label: 'Roof',         value: QUESTION_LABELS.roof?.[answers.roof] || answers.roof },
    { label: 'Bed Config',   value: QUESTION_LABELS.bed?.[answers.bed] || answers.bed },
    { label: 'Rear Doors',   value: QUESTION_LABELS.doors?.[answers.doors] || answers.doors },
    { label: 'Heating',      value: QUESTION_LABELS.heating?.[answers.heating] || answers.heating },
    { label: 'Electrical',   value: QUESTION_LABELS.electrical?.[answers.electrical] || answers.electrical },
  ];
}

function markdownToHTML(md) {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Markdown tables → simple HTML table
    .replace(/(\|.+\|\n\|[-| :]+\|\n)(\|.+\|\n)+/g, (match) => {
      const rows = match.trim().split('\n').filter(r => !r.match(/^\|[-| :]+\|$/));
      const [headerRow, ...dataRows] = rows;
      const headers = headerRow.split('|').filter(Boolean).map(h => `<th>${h.trim()}</th>`).join('');
      const bodyRows = dataRows.map(row => {
        const cells = row.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('\n');
      return `<table class="spec-table"><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    })
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ol>${m}</ol>`)
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Paragraphs (double newline → paragraph break)
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    // Cleanup: don't wrap headings/tables/lists in <p>
    .replace(/<p>(<h[1-6]>|<table|<ul>|<ol>)/g, '$1')
    .replace(/(<\/h[1-6]>|<\/table>|<\/ul>|<\/ol>)<\/p>/g, '$1')
    .replace(/<p><\/p>/g, '');
}

function buildEmailHTML(reportHTML, specRows, email) {
  const specCells = specRows.map(row => `
    <div style="background:#F9F8F6;padding:14px 16px;border-radius:4px;border-left:3px solid #D4704F;margin-bottom:12px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B7280;margin-bottom:4px;">${row.label}</div>
      <div style="font-size:15px;font-weight:600;color:#1F2937;">${row.value}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your CamperDNA Profile</title>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.6;color:#1F2937;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1F2937;padding:36px 32px;text-align:center;">
      <div style="font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#D4704F;margin-bottom:10px;">CamperDNA</div>
      <h1 style="margin:0;font-size:26px;font-weight:700;color:#F9F8F6;line-height:1.3;">Your personalised van buying guide</h1>
      <p style="margin:12px 0 0;font-size:14px;color:#9CA3AF;">Based on your CamperDNA quiz answers</p>
    </div>

    <!-- Spec Summary -->
    <div style="background:#fff;padding:32px;border-bottom:1px solid #E5E7EB;">
      <h2 style="margin:0 0 20px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">Your Recommended Spec</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
        ${specCells}
      </div>
    </div>

    <!-- Report Body -->
    <div style="padding:32px;color:#374151;font-size:15px;line-height:1.7;">
      <style>
        h2{font-size:18px;color:#1F2937;margin-top:28px;margin-bottom:10px;border-bottom:1px solid #E5E7EB;padding-bottom:8px;}
        h3{font-size:16px;color:#1F2937;margin-top:20px;margin-bottom:8px;}
        p{margin:0 0 14px;}
        table.spec-table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;}
        table.spec-table th{background:#1F2937;color:#F9F8F6;padding:10px 12px;text-align:left;}
        table.spec-table td{padding:10px 12px;border-bottom:1px solid #E5E7EB;}
        table.spec-table tr:nth-child(even) td{background:#F9F8F6;}
        ol,ul{padding-left:20px;margin:0 0 14px;}
        li{margin-bottom:6px;}
        strong{color:#1F2937;}
        a{color:#D4704F;text-decoration:none;}
      </style>
      ${reportHTML}
    </div>

    <!-- CTA -->
    <div style="background:#F9F8F6;padding:28px 32px;text-align:center;border-top:1px solid #E5E7EB;">
      <p style="margin:0 0 16px;font-size:14px;color:#6B7280;">Questions? Reply to this email — I read everything.</p>
      <a href="https://camper-dna.com/buying-a-van/" style="display:inline-block;padding:14px 28px;background:#D4704F;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:4px;">📋 Full Buying Guide →</a>
    </div>

    <!-- Footer -->
    <div style="background:#1F2937;padding:20px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#6B7280;">CamperDNA · Real advice for VW van buyers · <a href="https://camper-dna.com" style="color:#9CA3AF;text-decoration:none;">camper-dna.com</a></p>
      <p style="margin:8px 0 0;font-size:11px;color:#4B5563;">This is a transactional email sent in response to your quiz submission.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildEmailText(markdown, specRows, email) {
  const specLines = specRows.map(r => `${r.label}: ${r.value}`).join('\n');
  const bodyText = markdown
    .replace(/#{1,3} /g, '\n\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\|[-| :]+\|/g, '')
    .replace(/\|/g, '  ')
    .trim();

  return `Your CamperDNA Profile
======================

Your Recommended Spec
---------------------
${specLines}

---

${bodyText}

---
CamperDNA · Real advice for VW van buyers · camper-dna.com
Questions? Reply to this email.`;
}
