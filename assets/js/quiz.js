/* CamperDNA — Profiler Quiz */
(function () {
  'use strict';

  // ── QUESTIONS ─────────────────────────────────────────────────
  // Scores: W=Weekend Escaper, O=Off-Grid Explorer, F=Family Adventurer,
  //         E=European Road Tripper, C=Curious Beginner
  var QUESTIONS = [
    {
      q: 'How long are your typical van trips?',
      options: [
        { icon: '🏕️', text: 'Weekends and bank holidays — Friday to Sunday',   scores: { W:3 } },
        { icon: '🗓️', text: 'A week or two at a time, a few times a year',       scores: { E:2, O:1 } },
        { icon: '👨‍👩‍👧', text: 'School holidays — we travel when the kids are off', scores: { F:3 } },
        { icon: '🌍', text: 'Weeks or months — extended travel is the plan',     scores: { E:2, O:2 } },
        { icon: '🤷', text: "Not sure yet — I'm still figuring it all out",      scores: { C:3 } }
      ]
    },
    {
      q: "Who's coming with you most of the time?",
      options: [
        { icon: '🧍', text: 'Just me',                                           scores: { O:3 } },
        { icon: '💑', text: 'Me and my partner',                                 scores: { W:2, E:2 } },
        { icon: '👨‍👩‍👦', text: 'The whole family — kids and probably a dog',        scores: { F:4 } },
        { icon: '🎒', text: 'It varies — solo, partner, friends depending on the trip', scores: { C:2, W:1 } }
      ]
    },
    {
      q: 'Where do you most want to wake up?',
      options: [
        { icon: '🌲', text: 'Wild camping — off-grid, no hookup, no neighbours', scores: { O:4 } },
        { icon: '🏖️', text: 'Mix of wild spots and proper campsites',            scores: { W:2, E:1 } },
        { icon: '🔌', text: 'Campsites with facilities — showers, hookup, the lot', scores: { F:3, W:1 } },
        { icon: '🗺️', text: 'Wherever I end up on the road that night',          scores: { E:3 } },
        { icon: '💭', text: "I haven't thought that far ahead yet",              scores: { C:3 } }
      ]
    },
    {
      q: 'What does your perfect van trip look like?',
      options: [
        { icon: '🌅', text: 'Nipping away Friday night and back Sunday evening', scores: { W:4 } },
        { icon: '🏄', text: 'Remote hiking, surfing or biking — properly off-grid', scores: { O:4 } },
        { icon: '🎡', text: 'School holiday road trip — France, Spain, the Alps',scores: { F:2, E:2 } },
        { icon: '🛣️', text: 'Weeks of driving — new country every few days',    scores: { E:4 } },
        { icon: '✋', text: 'Just a test run first — to see if van life is for me', scores: { C:4 } }
      ]
    },
    {
      q: "What matters most to you in a van spec?",
      options: [
        { icon: '🅿️', text: 'Small enough to park anywhere and keep running costs low', scores: { W:3 } },
        { icon: '☀️', text: 'Fully self-sufficient — solar, big battery, diesel heater', scores: { O:4 } },
        { icon: '🛡️', text: 'Space, safety and comfort for the whole family',    scores: { F:4 } },
        { icon: '🛏️', text: 'A proper bed and comfortable driving position for long days', scores: { E:3 } },
        { icon: '📚', text: "I'd like to understand the options before I decide", scores: { C:3 } }
      ]
    },
    {
      q: 'Where are you in the buying process?',
      options: [
        { icon: '🔑', text: "Actively looking — I'm ready to buy",              scores: { W:1, O:1, F:1, E:1 } },
        { icon: '📆', text: "Planning to buy in the next 6–12 months",          scores: { W:1, O:1, F:1, E:1 } },
        { icon: '🌱', text: "Just starting to explore whether it's for me",     scores: { C:3 } },
        { icon: '🚐', text: "I already have a van and want to spec it better",  scores: { O:2, W:1 } }
      ]
    }
  ];

  // ── PROFILES ──────────────────────────────────────────────────
  var PROFILES = {
    W: {
      key:   'weekend-escaper',
      label: 'The Weekend Escaper',
      desc:  'You want a van that fits your life rather than taking it over. Frequent short escapes, easy to drive and park, practical year-round. Your spec is all about reliability and usability over complexity.',
      url:   '/your-camperdna/weekend-escaper/'
    },
    O: {
      key:   'off-grid-explorer',
      label: 'The Off-Grid Explorer',
      desc:  'You want to go places that don\'t have a car park or a shower block. Self-sufficiency is everything — serious electrical, a proper heater, and a van that doesn\'t mind a rough track.',
      url:   '/your-camperdna/off-grid-explorer/'
    },
    F: {
      key:   'family-adventurer',
      label: 'The Family Adventurer',
      desc:  'You\'re doing this with the whole crew. Space, safety, storage for bikes and boards, and a layout that works for everyone — including the dog. School holiday miles and sanity.',
      url:   '/your-camperdna/family-adventurer/'
    },
    E: {
      key:   'european-road-tripper',
      label: 'The European Road Tripper',
      desc:  'Big miles, big distances, lots of nights in the van. You need comfort for long driving days, a proper sleeping setup, and enough self-sufficiency to go where the map takes you.',
      url:   '/your-camperdna/european-road-tripper/'
    },
    C: {
      key:   'curious-beginner',
      label: 'The Curious Beginner',
      desc:  'You\'re in the right place. Van life is brilliant — but there\'s a lot to figure out before you commit. Your profile is the honest starting point: what to read, what to ask, and how to avoid the obvious mistakes.',
      url:   '/your-camperdna/curious-beginner/'
    }
  };

  // Secondary profile labels (for "you might also be…")
  var SECONDARY = {
    W: 'Weekend Escaper', O: 'Off-Grid Explorer',
    F: 'Family Adventurer', E: 'European Road Tripper', C: 'Curious Beginner'
  };

  // ── STATE ──────────────────────────────────────────────────────
  var current = 0;
  var scores  = { W:0, O:0, F:0, E:0, C:0 };
  var selected = null; // selected option index for current question

  // ── DOM REFS ───────────────────────────────────────────────────
  var quizEl      = document.getElementById('camperdna-quiz');
  if (!quizEl) return;

  var progressFill  = quizEl.querySelector('.quiz__progress-fill');
  var progressLabel = quizEl.querySelector('.quiz__progress-label');
  var stepsWrap     = quizEl.querySelector('.quiz__steps');
  var nextBtn       = quizEl.querySelector('.quiz__next');
  var resultEl      = quizEl.querySelector('.quiz__result');
  var restartBtn    = quizEl.querySelector('.quiz__restart');

  // ── BUILD STEPS ────────────────────────────────────────────────
  QUESTIONS.forEach(function (q, qi) {
    var step = document.createElement('div');
    step.className = 'quiz__step' + (qi === 0 ? ' is-active' : '');
    step.setAttribute('data-step', qi);

    var optionsHtml = q.options.map(function (opt, oi) {
      return '<button class="quiz__option" data-opt="' + oi + '" type="button">' +
             '  <span class="quiz__option-icon">' + opt.icon + '</span>' +
             '  <span class="quiz__option-text">' + opt.text + '</span>' +
             '</button>';
    }).join('');

    step.innerHTML =
      '<p class="quiz__q-num">Question ' + (qi + 1) + ' of ' + QUESTIONS.length + '</p>' +
      '<p class="quiz__question">' + q.q + '</p>' +
      '<div class="quiz__options">' + optionsHtml + '</div>';

    stepsWrap.appendChild(step);
  });

  // ── PROGRESS ───────────────────────────────────────────────────
  function updateProgress() {
    var pct = Math.round((current / QUESTIONS.length) * 100);
    progressFill.style.width = pct + '%';
    progressLabel.textContent = 'Question ' + (current + 1) + ' of ' + QUESTIONS.length;
  }
  updateProgress();

  // ── OPTION CLICK ───────────────────────────────────────────────
  stepsWrap.addEventListener('click', function (e) {
    var btn = e.target.closest('.quiz__option');
    if (!btn) return;

    var step = btn.closest('.quiz__step');
    if (!step.classList.contains('is-active')) return;

    // Clear previous selection in this step
    step.querySelectorAll('.quiz__option').forEach(function (o) {
      o.classList.remove('is-selected');
    });
    btn.classList.add('is-selected');
    selected = parseInt(btn.getAttribute('data-opt'), 10);

    // Show next/finish button
    nextBtn.classList.add('is-visible');
    nextBtn.textContent = (current === QUESTIONS.length - 1) ? 'See my profile →' : 'Next question →';
  });

  // ── NEXT / FINISH ──────────────────────────────────────────────
  nextBtn.addEventListener('click', function () {
    if (selected === null) return;

    // Accumulate scores
    var opts = QUESTIONS[current].options[selected].scores;
    Object.keys(opts).forEach(function (k) { scores[k] += opts[k]; });

    if (current < QUESTIONS.length - 1) {
      // Move to next question
      var activeStep = stepsWrap.querySelector('.quiz__step.is-active');
      activeStep.classList.remove('is-active');
      current++;
      var nextStep = stepsWrap.querySelector('[data-step="' + current + '"]');
      nextStep.classList.add('is-active');
      selected = null;
      nextBtn.classList.remove('is-visible');
      updateProgress();
    } else {
      // Show result
      showResult();
    }
  });

  // ── RESULT ─────────────────────────────────────────────────────
  function showResult() {
    // Find winner
    var winner = Object.keys(scores).reduce(function (a, b) {
      return scores[a] >= scores[b] ? a : b;
    });

    // Find runner-up (second highest, different from winner)
    var runnerUp = Object.keys(scores)
      .filter(function (k) { return k !== winner; })
      .reduce(function (a, b) { return scores[a] >= scores[b] ? a : b; });

    var profile = PROFILES[winner];
    var secondary = PROFILES[runnerUp];

    // Update result DOM
    resultEl.querySelector('.quiz__result-title').textContent = profile.label;
    resultEl.querySelector('.quiz__result-desc').textContent  = profile.desc;

    var cta = resultEl.querySelector('.quiz__result-cta');
    cta.href = profile.url;

    // Secondary match (only show if runner-up has meaningful score)
    var secondaryNote = resultEl.querySelector('.quiz__result-secondary p');
    if (scores[runnerUp] >= 3) {
      secondaryNote.innerHTML = 'Your answers also have a strong ' +
        '<a href="' + secondary.url + '">' + secondary.label + '</a> streak. Worth a read too.';
      resultEl.querySelector('.quiz__result-secondary').style.display = '';
    } else {
      resultEl.querySelector('.quiz__result-secondary').style.display = 'none';
    }

    // Hide steps and progress, show result
    progressFill.parentElement.parentElement.style.display = 'none'; // hide progress bar row
    stepsWrap.style.display = 'none';
    nextBtn.style.display = 'none';
    resultEl.classList.add('is-active');

    // Scroll quiz into view
    quizEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── RESTART ────────────────────────────────────────────────────
  restartBtn.addEventListener('click', function () {
    // Reset scores
    Object.keys(scores).forEach(function (k) { scores[k] = 0; });
    current = 0;
    selected = null;

    // Reset all steps
    stepsWrap.querySelectorAll('.quiz__step').forEach(function (s, i) {
      s.classList.toggle('is-active', i === 0);
      s.querySelectorAll('.quiz__option').forEach(function (o) {
        o.classList.remove('is-selected');
      });
    });

    // Restore progress bar and steps
    progressFill.parentElement.parentElement.style.display = '';
    stepsWrap.style.display = '';
    nextBtn.style.display = '';
    nextBtn.classList.remove('is-visible');
    nextBtn.textContent = 'Next question →';
    resultEl.classList.remove('is-active');
    updateProgress();
    quizEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

})();
