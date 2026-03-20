/**
 * CamperDNA Report Generator Worker
 * Receives quiz answers → generates report via Claude → sends email via Resend
 */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { answers, email } = await request.json();

      // Validate input
      if (!answers || !email) {
        return new Response(
          JSON.stringify({ error: 'Missing answers or email' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Build Claude prompt from quiz answers
      const prompt = buildReportPrompt(answers);

      // Call Claude via OpenRouter (use env.OPENROUTER_API_KEY)
      const claudeResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'anthropic/claude-haiku-4-5',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
        }),
      });

      if (!claudeResponse.ok) {
        throw new Error(`Claude API error: ${claudeResponse.status}`);
      }

      const claudeData = await claudeResponse.json();
      const reportMarkdown = claudeData.choices[0].message.content;

      // Convert markdown to HTML
      const reportHTML = markdownToHTML(reportMarkdown);

      // Send via Resend (use env.RESEND_API_KEY)
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'noreply@camper-dna.com',
          to: email,
          subject: 'Your CamperDNA Report',
          html: reportHTML,
        }),
      });

      if (!resendResponse.ok) {
        throw new Error(`Resend API error: ${resendResponse.status}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          reportURL: `/report/?email=${encodeURIComponent(email)}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

function buildReportPrompt(answers) {
  const answersText = `Q1: What\'s your total budget for the van and any conversion work?\nA: ${answers.budget}\n\nQ2: How are you planning to buy?\nA: ${answers.buyingRoute}\n\nQ3: Are you considering a T5 or T6 — or not sure yet?\nA: ${answers.vanGeneration}\n\nQ4: How do you feel about buying a higher-mileage van?\nA: ${answers.mileageTolerance}\n\nQ5: Where are you planning to buy the base van?\nA: ${answers.vanSource}\n\nQ6: If buying a T6 donor, what trim level are you targeting?\nA: ${answers.specLevel}\n\nQ7: How many seats do you need in the back of the van?\nA: ${answers.seatingConfig}\n\nQ8: Barn doors or tailgate?\nA: ${answers.rearDoors}\n\nQ9: What roof setup do you want?\nA: ${answers.roof}\n\nQ10: What\'s your priority for the main sleeping area?\nA: ${answers.bedConfig}\n\nQ11: What do you mainly do outdoors?\nA: ${answers.outdoorActivities}\n\nQ12: Do you want external shelter attached to the van?\nA: ${answers.awning}\n\nQ13: Do you need a diesel night heater?\nA: ${answers.heating}\n\nQ14: How important is it to camp without a mains hookup?\nA: ${answers.electrical}`;

  return `You are a VW T6 buying expert. Based on the following quiz answers, generate a personalized buying guide report.\n\n${answersText}\n\nGenerate a report with these sections:\n1. Executive Summary (2-3 sentences)\n2. Recommended Van Specifications (roof, heating, electrical, bedding based on answers)\n3. Top Product Recommendations (3-5 specific products they should research)\n4. Decision Guide (next steps in the buying process)\n5. FAQs (3 common questions for their use case)\n\nUse markdown formatting. Be practical and specific.`;
}

function markdownToHTML(markdown) {
  let html = markdown
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$2</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .split('\n\n')
    .map(para => `<p>${para.trim()}</p>`)
    .join('\n');

  return `<html><body>${html}</body></html>`;
}