(() => {
  'use strict';

  const SCANS_KEY = 'jobScamShieldScansV1';
  const state = {
    inputType: 'text',
    lastResult: null,
    savedScans: loadScans(),
    authMode: 'signin',
    isSubmitting: false,
  };

  const presets = {
    fee: `URGENT WORK FROM HOME OFFER! Amazon is hiring data entry agents immediately. No experience needed. Earn ₹5000 daily for just 2 hours. Pay a refundable ₹799 registration and training fee today to reserve your seat. Contact our hiring manager on Telegram @amazon_jobs_india. Limited slots — immediate joining today!`,
    impersonation: `Hello, I am recruiting for Microsoft. You have been selected without an interview for a remote support role. Please email your Aadhaar card and bank details to microsoft.careers.recruitment@gmail.com. We need this today so that your offer letter can be processed.`,
    legitimate: `Product Support Specialist — Northwind Software

Northwind Software is hiring a Product Support Specialist for our customer success team. Responsibilities include supporting customers by email and video calls, documenting product issues, and collaborating with engineering. Qualifications: 1+ years of customer support experience, strong written communication, and comfort with SaaS tools. Our interview process includes a recruiter screen, skills discussion, and final team interview. This full-time role includes health coverage, paid time off, and a transparent salary range. Apply through the careers page on our official website.`,
  };

  const safetyRules = [
    ['Never pay to get hired', 'Legitimate employers do not charge registration, equipment, training, background-check, or joining fees before employment.'],
    ['Never share OTPs, PINs, or passwords', 'A recruiter has no legitimate reason to request one-time passwords, banking credentials, CVVs, or UPI PINs.'],
    ['Find the official website yourself', 'Type the company name into your browser and use its official careers page—not a link supplied by the recruiter.'],
    ['Be skeptical of pressure', '“Act now,” “limited seats,” and expiring offers are meant to stop you from thinking and verifying.'],
    ['Check the email domain carefully', 'A large employer using Gmail, Yahoo, or a misspelled look-alike address deserves extra scrutiny.'],
    ['Expect a real interview process', 'A job that offers immediate selection with no screening, duties, or hiring process is a major red flag.'],
    ['Be cautious with task and rating work', 'Clicking, rating, “optimization,” and paid-review tasks often begin with small payouts and later demand money.'],
    ['Do not deposit a “check”', 'Fake-check scams ask you to deposit money and forward some of it. Banks can reverse the deposit later.'],
    ['Treat unusual links with care', 'Shortened links, disposable domains, and chat-app links can hide where a message is taking you.'],
    ['Verify visa promises independently', 'No recruiter can guarantee a work visa or turn a tourist visa into a work permit in exchange for a fee.'],
    ['Read the job description', 'A real listing normally names responsibilities, qualifications, location, pay structure, and employment type.'],
    ['Do not share documents too early', 'Provide identity documents only after you have verified the employer and reached a legitimate hiring stage.'],
    ['Use official contact routes', 'Call or write the company through contacts on its official website to confirm a recruiter and job opening.'],
    ['Keep communication records', 'Save messages, profiles, payment requests, email headers, and links if something seems suspicious.'],
    ['Tell someone before sending money', 'A second opinion can disrupt a scammer’s pressure tactics. Pause and talk to someone you trust.'],
    ['Never use your account for “business payments”', 'Do not receive or forward money, gift cards, crypto, or packages for a recruiter.'],
    ['Watch for overpayment tricks', 'A genuine employer will not overpay you and ask for the balance to be sent elsewhere.'],
    ['Protect your identity', 'Redact sensitive IDs where possible and never submit financial credentials as part of a job application.'],
    ['Report suspicious offers', 'Report fake postings to the platform, the impersonated company, and your local cybercrime reporting service.'],
    ['Trust discomfort as a signal', 'If the pay, process, or pressure feels wrong, pause the conversation until you can verify independently.'],
  ];

  const $ = (selector, container = document) => container.querySelector(selector);
  const $$ = (selector, container = document) => [...container.querySelectorAll(selector)];

  function loadScans() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SCANS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function persistScans() {
    localStorage.setItem(SCANS_KEY, JSON.stringify(state.savedScans));
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function cleanPreview(text, length = 92) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    return normalized.length > length ? `${normalized.slice(0, length).trimEnd()}…` : normalized || 'Job offer scan';
  }

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp));
  }

  function pluralize(num, unit) { return `${num} ${unit}${num === 1 ? '' : 's'}`; }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function routeTo(route) {
    const destination = route === 'results' ? 'results' : route;
    $$('.view').forEach(view => view.classList.toggle('active', view.id === destination));
    $$('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.route === route));
    $('.sidebar').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function riskLabel(score) {
    if (score >= 70) return { level: 'High risk', className: 'high', color: '#d9504b' };
    if (score >= 35) return { level: 'Needs caution', className: 'medium', color: '#c88611' };
    return { level: 'Low risk', className: 'low', color: '#13856a' };
  }

  function keywordFound(text, list) {
    return list.filter(phrase => text.includes(phrase));
  }

  function containsUrlSignal(text) {
    return /(bit\.ly|tinyurl\.com|t\.me|wa\.me|shorturl\.at|is\.gd|cutt\.ly|\.xyz\b|\.top\b|\.buzz\b|\.work\b|\.cfd\b|\.click\b)/i.test(text);
  }

  function redactSensitive(text) {
    return String(text)
      .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[redacted card number]')
      .replace(/\b(?:otp|one[- ]time password)\s*[:=-]?\s*\d{4,8}\b/gi, '[redacted OTP]');
  }

  function analyzeOffer(rawInput, inputType) {
    const submittedText = redactSensitive(rawInput.trim());
    const text = submittedText.toLowerCase();
    const flags = [];
    const recommendations = [];
    const signals = [];
    const breakdown = { 'Payment request': 0, 'Pay or task claim': 0, 'Impersonation': 0, 'Communication': 0, 'Pressure': 0, 'Sensitive data': 0, 'Link / domain': 0, 'Visa / legal': 0 };
    const categories = new Set();

    function addFlag({ title, severity, detail, score, group }) {
      if (flags.some(flag => flag.title === title)) return;
      flags.push({ title, severity, detail, score, group });
      breakdown[group] = Math.min(100, Math.max(breakdown[group], score));
      categories.add(title);
    }

    const paymentTerms = keywordFound(text, [
      'registration fee', 'joining fee', 'training fee', 'security deposit', 'refundable deposit', 'processing fee', 'activation fee', 'equipment fee', 'pay to start', 'pay today', 'pay ₹', 'pay $', 'payment required', 'transfer the fee', 'recharge your account', 'advance payment', 'verification fee'
    ]);
    if (paymentTerms.length) {
      addFlag({ title: 'Upfront payment request', severity: 'HIGH', detail: `The message mentions ${paymentTerms.slice(0, 2).join(' and ')}. Legitimate employers do not charge you to get hired.`, score: 95, group: 'Payment request' });
      recommendations.push('Do not pay any registration, training, equipment, or deposit fee.');
    }

    const fakeCheck = keywordFound(text, ['cash the check', 'deposit the check', 'mobile deposit', 'keep a portion', 'send the balance', 'buy equipment with the check']);
    if (fakeCheck.length) {
      addFlag({ title: 'Possible fake-check scam', severity: 'HIGH', detail: 'The offer asks you to deposit money or a check and send funds elsewhere. Deposits can later be reversed.', score: 92, group: 'Payment request' });
      recommendations.push('Do not deposit a check or forward money for a prospective employer.');
    }

    const taskTerms = keywordFound(text, ['task platform', 'complete tasks', 'rating task', 'product rating', 'app optimization', 'optimise app', 'review tasks', 'like and subscribe', 'daily commission', 'captcha typing', 'form filling']);
    const highPayout = /(earn\s*(₹|\$|€|£)?\s*(\d{3,}|\d+\s*(per day|daily))|\b[0-9]{1,3},?[0-9]{3}\s*(daily|per day|\/day)|guaranteed daily income)/i.test(text);
    if (taskTerms.length && (highPayout || taskTerms.length > 1)) {
      addFlag({ title: 'Task or optimization scheme', severity: 'HIGH', detail: 'Clicking, rating, or “optimization” work tied to commissions is commonly used to lure people into deposits and withdrawal traps.', score: 85, group: 'Pay or task claim' });
      recommendations.push('Avoid task platforms that require deposits, recharges, or payments to unlock earnings.');
    }

    const lowEffort = keywordFound(text, ['no experience needed', 'no skills required', '1-2 hours daily', '2-3 hours a day', 'work from anywhere anytime', 'anyone can do', 'earn while sleeping']);
    if (lowEffort.length && highPayout) {
      addFlag({ title: 'Unrealistic pay for low-effort work', severity: 'HIGH', detail: 'The listing combines unusually high income with minimal work or qualifications, a common recruitment lure.', score: 72, group: 'Pay or task claim' });
    }

    const brands = ['google', 'amazon', 'apple', 'microsoft', 'meta', 'netflix', 'deloitte', 'accenture', 'ibm', 'tcs', 'infosys', 'wipro', 'walmart', 'unicef'];
    const freeEmail = /@(gmail\.com|yahoo\.com|hotmail\.com|outlook\.com|rediffmail\.com|mail\.ru|yopmail\.com|proton\.me)/i.test(text);
    const mentionedBrand = brands.find(brand => text.includes(brand));
    if (mentionedBrand && freeEmail) {
      addFlag({ title: 'Possible company impersonation', severity: 'HIGH', detail: `The message refers to ${capitalize(mentionedBrand)} but includes a public webmail address. Large employers normally recruit through their own domain.`, score: 90, group: 'Impersonation' });
      recommendations.push('Find the employer’s official careers page yourself and confirm the recruiter through a published contact channel.');
    }

    const governmentClaim = /(government job|ministry of|public sector recruitment|govt vacancy|railway recruitment|civil service|federal employee)/i.test(text);
    if (governmentClaim && (paymentTerms.length || freeEmail || /direct joining/i.test(text))) {
      addFlag({ title: 'Government recruitment impersonation', severity: 'HIGH', detail: 'The message claims official government hiring while using an unofficial contact method or requesting payment.', score: 95, group: 'Impersonation' });
    }

    const visaTerms = keywordFound(text, ['overseas job', 'work in canada', 'work in uk', 'work in dubai', 'work in australia', 'tourist visa to work permit', 'guaranteed visa', 'visa processing charge', 'unskilled visa']);
    if (visaTerms.length && (paymentTerms.length || /tourist visa|guaranteed visa/i.test(text))) {
      addFlag({ title: 'Suspicious visa or overseas hiring promise', severity: 'HIGH', detail: 'Guaranteed work visas or tourist-to-work visa conversion, especially with a fee, require independent official verification.', score: 85, group: 'Visa / legal' });
      recommendations.push('Verify visa rules through an official government immigration website, not through a recruiter.');
    }

    const credentialTerms = keywordFound(text, ['otp', 'one-time password', 'atm pin', 'upi pin', 'password', 'cvv', 'net banking', 'bank login', 'bank details before offer', 'unredacted passport']);
    if (credentialTerms.length) {
      addFlag({ title: 'Request for sensitive credentials', severity: 'HIGH', detail: `The message requests or mentions ${credentialTerms.slice(0, 2).join(' and ')}. Never share security codes, passwords, PINs, or card details.`, score: 95, group: 'Sensitive data' });
      recommendations.push('Do not share OTPs, passwords, PINs, banking details, or an unredacted ID.');
    }

    const channelTerms = keywordFound(text, ['telegram', 'whatsapp only', 'dm on instagram', 'signal group', 'contact only on whatsapp']);
    if (channelTerms.length) {
      addFlag({ title: 'Unofficial recruitment channel', severity: channelTerms.includes('telegram') ? 'HIGH' : 'MEDIUM', detail: `The offer directs you to ${channelTerms[0]}. Chat-only recruiting makes independent verification difficult.`, score: channelTerms.includes('telegram') ? 70 : 48, group: 'Communication' });
    }

    const urgencyTerms = keywordFound(text, ['limited slots', 'immediate joining today', 'offer expires in', 'act fast', 'last chance today', 'only 3 seats left', 'pay today to secure', 'urgent hiring']);
    if (urgencyTerms.length) {
      addFlag({ title: 'Artificial urgency or pressure', severity: 'MEDIUM', detail: `The message uses pressure such as “${urgencyTerms[0]}” to rush your decision.`, score: 45, group: 'Pressure' });
    }

    if (containsUrlSignal(text)) {
      addFlag({ title: 'Shortened or high-risk-looking link', severity: 'MEDIUM', detail: 'The message contains a link shortener, chat link, or disposable-looking domain that can obscure the true destination.', score: 40, group: 'Link / domain' });
    }

    if (/selected without (an |any )?interview|no interview required|direct selection/i.test(text)) {
      addFlag({ title: 'No real interview process', severity: 'MEDIUM', detail: 'The offer promises selection without an interview or normal evaluation process.', score: 42, group: 'Impersonation' });
    }

    const positiveChecks = [
      ['interview process', 'Describes a multi-stage interview or screening process.'],
      ['responsibilities', 'Includes concrete job responsibilities.'],
      ['qualifications', 'Lists job qualifications.'],
      ['benefits', 'Lists standard employee benefits.'],
      ['equal opportunity', 'Includes a standard equal-opportunity statement.'],
      ['careers@', 'Uses a careers-focused contact address.'],
      ['privacy policy', 'References a privacy policy.'],
    ];
    positiveChecks.forEach(([phrase, detail]) => { if (text.includes(phrase)) signals.push(detail); });

    const missing = [];
    if (!/(responsibilities|duties|role description)/i.test(text)) missing.push('specific job responsibilities');
    if (!/(interview|screening|assessment)/i.test(text)) missing.push('an interview or evaluation process');
    if (!/(salary|compensation|benefits)/i.test(text)) missing.push('clear compensation or benefits details');

    let score = flags.reduce((total, flag) => total + ({ HIGH: 25, MEDIUM: 12, LOW: 5 }[flag.severity] || 5), 0);
    if (flags.length >= 3) score += (flags.length - 2) * 8;
    if (paymentTerms.length && flags.length >= 2) score = Math.max(score, 85);
    if (!flags.length) score = Math.max(7, Math.min(18, 12 - signals.length));
    score = Math.max(5, Math.min(98, score));

    if (!recommendations.length) {
      recommendations.push('Verify the employer through its official careers page before sharing documents.');
      recommendations.push('Confirm the recruiter’s email domain and job requisition independently.');
    }
    recommendations.push('Keep a copy of the message and report it to the job platform if you discover it is fraudulent.');

    const risk = riskLabel(score);
    const confidence = rawInput.trim().length < 80 ? 'Limited context' : flags.length >= 2 || rawInput.trim().length > 250 ? 'High confidence' : 'Moderate confidence';
    const summary = risk.className === 'high'
      ? `Strong scam signals were found. Do not pay, share sensitive credentials, or continue until the offer is independently verified.`
      : risk.className === 'medium'
        ? `Some warning signs need independent verification before you continue with this opportunity.`
        : `No major scam signals were found in this text, but a risk check cannot prove an offer is legitimate.`;

    return {
      id: `scan_${Date.now()}`,
      timestamp: Date.now(),
      input: submittedText,
      inputType,
      score,
      risk,
      confidence,
      flags,
      recommendations: [...new Set(recommendations)].slice(0, 5),
      positiveSignals: signals,
      missing,
      breakdown,
      summary,
      industry: $('#industry-select').value,
      region: $('#region-select').value,
      currency: $('#currency-select').value,
    };
  }

  function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }

  function renderResult(result) {
    const flagsMarkup = result.flags.length
      ? result.flags.map(flag => `<div class="flag-row"><div class="flag-row-top"><b>${escapeHtml(flag.title)}</b><span class="severity ${flag.severity.toLowerCase()}">${flag.severity}</span></div><p>${escapeHtml(flag.detail)}</p></div>`).join('')
      : `<div class="clean-result"><b>✓ No prominent scam patterns detected</b><span>Continue with standard checks—especially verifying the recruiter and official job listing.</span></div>`;

    const breakdownMarkup = Object.entries(result.breakdown).map(([label, value]) => {
      const color = value >= 70 ? '#d9504b' : value >= 35 ? '#c88611' : '#13856a';
      return `<div class="breakdown-row"><b>${escapeHtml(label)}</b><span>${value}/100</span><div class="bar"><i style="width:${value}%;--bar-color:${color}"></i></div></div>`;
    }).join('');

    const positiveMarkup = result.positiveSignals.length
      ? `<div class="result-panel panel"><h2>Positive signals</h2><ul class="recommend-list">${result.positiveSignals.map(signal => `<li>${escapeHtml(signal)}</li>`).join('')}</ul></div>`
      : '';

    $('#result-content').innerHTML = `
      <article class="result-header">
        <div class="risk-gauge" style="--score:${result.score};--gauge-color:${result.risk.color}"><div class="gauge-inside"><b>${result.score}</b><span>Risk score</span></div></div>
        <div class="result-summary"><p class="eyebrow">Scan complete · ${escapeHtml(result.region)} · ${escapeHtml(result.industry)}</p><h1>${result.risk.level}</h1><p>${escapeHtml(result.summary)}</p><div class="risk-meta"><span class="risk-pill ${result.risk.className}">${result.risk.level}</span><span class="confidence-pill">${escapeHtml(result.confidence)}</span></div></div>
      </article>
      <div class="result-grid"><section class="result-panel panel"><h2>${result.flags.length ? `${result.flags.length} ${result.flags.length === 1 ? 'signal' : 'signals'} to review` : 'What this check found'}</h2><div class="flag-list">${flagsMarkup}</div></section><aside class="result-panel panel"><h2>What to do next</h2><ul class="recommend-list">${result.recommendations.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></aside></div>
      <div class="result-grid"><section class="result-panel panel"><h2>Risk by category</h2><div class="risk-breakdown">${breakdownMarkup}</div></section>${positiveMarkup || `<section class="result-panel panel"><h2>Information to confirm</h2><ul class="recommend-list">${result.missing.map(item => `<li>Ask for ${escapeHtml(item)}.</li>`).join('')}</ul></section>`}</div>
      <p class="result-footnote">This browser-only demo highlights common language patterns; it does not access external databases, inspect the employer, or prove an offer is real or fake. The submitted text is redacted for common sensitive patterns before it is stored.</p>`;
  }

  function saveCurrentScan() {
    if (!state.lastResult) return;
    if (state.savedScans.some(scan => scan.id === state.lastResult.id)) {
      showToast('This scan is already in your history.');
      return;
    }
    state.savedScans.unshift(state.lastResult);
    state.savedScans = state.savedScans.slice(0, 50);
    persistScans();
    renderDashboard();
    renderHistory();
    showToast('Scan saved in this browser.');
  }

  function renderDashboard() {
    const all = state.savedScans;
    $('#total-scans').textContent = all.length;
    $('#high-scans').textContent = all.filter(scan => scan.risk.className === 'high').length;
    $('#caution-scans').textContent = all.filter(scan => scan.risk.className === 'medium').length;
    $('#low-scans').textContent = all.filter(scan => scan.risk.className === 'low').length;
    const recent = $('#recent-scans');
    if (!all.length) {
      recent.innerHTML = `<div class="empty-state compact"><span>◷</span><p>No scans yet.<br />Your results will appear here.</p></div>`;
      return;
    }
    recent.innerHTML = all.slice(0, 4).map(scan => `<div class="recent-item"><span class="recent-score ${scan.risk.className}" style="background:${scan.risk.className === 'high' ? '#fff0ef' : scan.risk.className === 'medium' ? '#fff7e8' : '#edfbf6'};color:${scan.risk.color}">${scan.score}</span><div class="recent-details"><b>${escapeHtml(cleanPreview(scan.input, 46))}</b><span>${escapeHtml(scan.risk.level)} · ${formatDate(scan.timestamp)}</span></div><button data-open-scan="${scan.id}">View</button></div>`).join('');
  }

  function renderHistory() {
    const area = $('#history-list');
    if (!state.savedScans.length) {
      area.innerHTML = `<div class="panel empty-state"><span>◷</span><p>No saved scans.<br />Run a check and choose “Save scan” to keep it here.</p></div>`;
      return;
    }
    area.innerHTML = state.savedScans.map(scan => `<article class="history-row"><span class="history-score ${scan.risk.className}" style="background:${scan.risk.className === 'high' ? '#fff0ef' : scan.risk.className === 'medium' ? '#fff7e8' : '#edfbf6'};color:${scan.risk.color}">${scan.score}</span><div class="history-info"><b>${escapeHtml(cleanPreview(scan.input, 112))}</b><p>${escapeHtml(scan.risk.level)} · ${formatDate(scan.timestamp)} · ${escapeHtml(scan.industry || 'General')}</p></div><div class="history-actions"><button class="secondary-button" data-open-scan="${scan.id}">Open</button><button class="secondary-button delete-scan" data-delete-scan="${scan.id}">Delete</button></div></article>`).join('');
  }

  function loadScan(id) {
    const scan = state.savedScans.find(item => item.id === id);
    if (!scan) return;
    state.lastResult = scan;
    renderResult(scan);
    routeTo('results');
  }

  function renderGuide() {
    $('#guide-grid').innerHTML = safetyRules.map(([title, detail], index) => `<article class="guide-card"><span class="guide-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p></div></article>`).join('');
  }

  function switchInput(type) {
    state.inputType = type;
    $$('.scan-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.input === type));
    $('#text-input-wrap').classList.toggle('hidden', type !== 'text');
    $('#url-input-wrap').classList.toggle('hidden', type !== 'url');
  }

  function runAnalysis() {
    const raw = state.inputType === 'text' ? $('#job-text').value : $('#job-url').value;
    if (!raw.trim()) {
      showToast(state.inputType === 'text' ? 'Paste a job offer or recruiter message first.' : 'Enter a job listing link first.');
      return;
    }
    if (state.inputType === 'text' && raw.trim().length < 15) {
      showToast('Please include a little more context for a useful check.');
      return;
    }
    const button = $('#analyze-button');
    button.disabled = true;
    button.textContent = 'Checking signals…';
    setTimeout(() => {
      state.lastResult = analyzeOffer(raw, state.inputType);
      renderResult(state.lastResult);
      button.disabled = false;
      button.innerHTML = 'Analyze this offer <span>→</span>';
      routeTo('results');
    }, 480);
  }

  function getDomain(input) {
    const string = String(input || '').trim().toLowerCase();
    if (!string) return '';
    try { return new URL(string.includes('://') ? string : `https://${string}`).hostname.replace(/^www\./, ''); } catch { return string.split('@').pop().split('/')[0].replace(/^www\./, ''); }
  }

  function runVerification(event) {
    event.preventDefault();
    const company = $('#company-name').value.trim();
    const email = $('#recruiter-email').value.trim();
    const website = $('#company-website').value.trim();
    const jobUrl = $('#posting-url').value.trim();
    if (!company && !email && !website) {
      showToast('Add a company name, email, or website to check.');
      return;
    }
    const emailDomain = email.includes('@') ? email.split('@').pop().toLowerCase() : '';
    const webDomain = getDomain(website);
    const companyKey = company.toLowerCase().replace(/[^a-z0-9]/g, '');
    const publicDomain = /^(gmail\.com|yahoo\.com|hotmail\.com|outlook\.com|rediffmail\.com|proton\.me|mail\.ru)$/i.test(emailDomain);
    const checks = [];
    if (emailDomain && publicDomain) checks.push({ level: 'alert', title: 'Public email address', detail: `${emailDomain} is a public email service, not a company-owned recruiter domain.` });
    if (emailDomain && webDomain && emailDomain !== webDomain && !emailDomain.endsWith(`.${webDomain}`)) checks.push({ level: 'alert', title: 'Email and website do not match', detail: `The recruiter email uses ${emailDomain}, while the website uses ${webDomain}. Verify this discrepancy through official contact details.` });
    if (emailDomain && webDomain && (emailDomain === webDomain || emailDomain.endsWith(`.${webDomain}`))) checks.push({ level: 'safe', title: 'Email domain matches website', detail: `Both supplied details use ${webDomain}. This is a helpful sign, but it is not proof of identity.` });
    if (companyKey && emailDomain && !publicDomain && !emailDomain.replace(/[^a-z0-9]/g, '').includes(companyKey.slice(0, Math.min(5, companyKey.length)))) checks.push({ level: 'caution', title: 'Company name is not obvious in the email domain', detail: `The supplied company name and ${emailDomain} do not obviously correspond. Review the official website independently.` });
    if (jobUrl && containsUrlSignal(jobUrl)) checks.push({ level: 'caution', title: 'Shortened or unusual job link', detail: 'The job URL uses a link shortener or high-risk-looking domain. Do not rely on it as employer proof.' });
    if (!checks.length) checks.push({ level: 'caution', title: 'Limited details to compare', detail: 'The details do not show a clear mismatch, but more verification is needed. Find the official careers page yourself.' });
    const hasAlert = checks.some(check => check.level === 'alert');
    const title = hasAlert ? 'Potential mismatch found' : 'Details need verification';
    $('#verify-result').className = 'verification-card';
    $('#verify-result').innerHTML = `<div class="verify-status"><span>${hasAlert ? '!' : '✓'}</span>${title}</div><p>${hasAlert ? 'Do not assume the recruiter is genuine until you confirm the details through an official company channel.' : 'Use the results as prompts for your own verification; a match is not evidence of a genuine offer.'}</p><div class="verify-checks">${checks.map(check => `<div class="verify-check ${check.level}"><strong>${escapeHtml(check.title)}</strong>${escapeHtml(check.detail)}</div>`).join('')}</div>`;
  }

  function answerAdvisor(question) {
    const text = question.toLowerCase();
    if (/(fee|pay|payment|deposit|registration)/.test(text)) return 'Fees are a powerful scam signal because a legitimate employer pays you—not the other way around. Do not pay a registration, training, equipment, verification, or joining charge to obtain work.';
    if (/(task|optim|rating|review)/.test(text)) return 'Task scams promise commissions for clicks, ratings, or “optimization.” Small early payouts build trust; later the platform asks you to deposit money to unlock tasks or withdraw earnings. Stop before paying or recharging an account.';
    if (/(otp|pin|password|bank|cvv)/.test(text)) return 'No legitimate recruiter needs your OTP, PIN, password, CVV, or banking login. Treat any request for one as an immediate stop sign and contact your bank if you have shared anything.';
    if (/(verify|recruiter|email|domain)/.test(text)) return 'Independently find the company’s official site, then use a published number or email to confirm the recruiter and job requisition. Do not use contact details provided only in the suspicious message.';
    return 'If an offer feels rushed, vague, or unusually rewarding, pause. Check the employer independently, do not pay fees, and avoid sharing sensitive information until you have verified the opportunity.';
  }

  function appendAdvisorMessage(text, fromUser = false) {
    const message = document.createElement('div');
    message.className = fromUser ? 'user-message' : 'bot-message';
    message.textContent = text;
    $('#assistant-messages').append(message);
    $('#assistant-messages').scrollTop = $('#assistant-messages').scrollHeight;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function clearAuthErrors() {
    ['auth-name-error', 'auth-email-error', 'auth-password-error', 'auth-confirm-error'].forEach(id => { $(`#${id}`).textContent = ''; });
    const alert = $('#auth-alert');
    alert.textContent = '';
    alert.className = 'auth-alert hidden';
  }

  function setAuthError(id, message) {
    $(`#${id}`).textContent = message;
  }

  function showAuthAlert(message, type = 'error') {
    const alert = $('#auth-alert');
    alert.textContent = message;
    alert.className = `auth-alert ${type === 'success' ? 'success' : ''}`;
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    const signUp = mode === 'signup';
    $$('.auth-tab').forEach(tab => {
      const active = tab.dataset.authMode === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    $$('.signup-field').forEach(field => field.classList.toggle('hidden', !signUp));
    $('.signin-options').classList.toggle('hidden', signUp);
    $('#auth-title').textContent = signUp ? 'Create your account' : 'Welcome back';
    $('#auth-subtitle').textContent = signUp ? 'Build a private home for your job-safety checks.' : 'Sign in to keep your job-safety checks in one place.';
    $('#auth-submit-label').textContent = signUp ? 'Create Account' : 'Sign In';
    $('#auth-password').autocomplete = signUp ? 'new-password' : 'current-password';
    clearAuthErrors();
  }

  function validateAuthField(fieldId) {
    const signUp = state.authMode === 'signup';
    const values = {
      name: $('#auth-name').value.trim(),
      email: $('#auth-email').value.trim(),
      password: $('#auth-password').value,
      confirm: $('#auth-confirm-password').value,
    };
    if (fieldId === 'name' && signUp) {
      const message = values.name ? '' : 'Enter your full name.';
      setAuthError('auth-name-error', message);
      return !message;
    }
    if (fieldId === 'email') {
      const message = emailPattern.test(values.email) ? '' : 'Enter a valid email address.';
      setAuthError('auth-email-error', message);
      return !message;
    }
    if (fieldId === 'password') {
      const message = values.password.length >= 6 ? '' : 'Use at least 6 characters.';
      setAuthError('auth-password-error', message);
      if (signUp && values.confirm) validateAuthField('confirm');
      return !message;
    }
    if (fieldId === 'confirm' && signUp) {
      const message = values.confirm === values.password && values.confirm ? '' : 'Passwords do not match.';
      setAuthError('auth-confirm-error', message);
      return !message;
    }
    return true;
  }

  function validateAuthForm() {
    const fields = state.authMode === 'signup' ? ['name', 'email', 'password', 'confirm'] : ['email', 'password'];
    return fields.every(validateAuthField);
  }

  function setAuthSubmitting(submitting) {
    state.isSubmitting = submitting;
    $('#auth-submit').disabled = submitting;
    $('#auth-spinner').classList.toggle('hidden', !submitting);
  }

  function profileFrom(name, email) {
    const cleanedName = name.trim() || email.split('@')[0].replace(/[._-]+/g, ' ');
    const displayName = cleanedName.replace(/\b\w/g, letter => letter.toUpperCase());
    const initials = displayName.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'JS';
    return { name: displayName, email, initials };
  }

  function updateProfile(profile) {
    $('#profile-name').textContent = profile.name;
    $('#profile-initials').textContent = profile.initials;
    try { sessionStorage.setItem('jobScamShieldProfile', JSON.stringify(profile)); } catch { /* session storage can be unavailable in restrictive browsers */ }
  }

  function restoreProfile() {
    try {
      const profile = JSON.parse(sessionStorage.getItem('jobScamShieldProfile') || 'null');
      if (profile?.name && profile?.initials) updateProfile(profile);
    } catch { /* leave the anonymous demo profile visible */ }
  }

  function submitAuth(event) {
    event.preventDefault();
    clearAuthErrors();
    if (!validateAuthForm()) {
      showAuthAlert('Please correct the highlighted fields and try again.');
      return;
    }
    setAuthSubmitting(true);
    setTimeout(() => {
      const email = $('#auth-email').value.trim();
      const profile = profileFrom(state.authMode === 'signup' ? $('#auth-name').value.trim() : '', email);
      updateProfile(profile);
      $('#auth-password').value = '';
      $('#auth-confirm-password').value = '';
      setAuthSubmitting(false);
      showAuthAlert(state.authMode === 'signup'
        ? 'Account setup is complete for this browser session. Your password was not stored by this local demo.'
        : 'You are signed in for this browser session. Your password was not stored by this local demo.', 'success');
      showToast(`Welcome, ${profile.name}.`);
    }, 520);
  }

  function togglePassword(button) {
    const input = $(`#${button.dataset.passwordTarget}`);
    const showPassword = input.type === 'password';
    input.type = showPassword ? 'text' : 'password';
    button.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
    $('span', button).textContent = showPassword ? '◌' : '◉';
  }

  function openForgotPassword() {
    $('#forgot-email').value = $('#auth-email').value.trim();
    $('#forgot-error').textContent = '';
    $('#forgot-modal').classList.remove('hidden');
    setTimeout(() => $('#forgot-email').focus(), 0);
  }

  function submitForgotPassword(event) {
    event.preventDefault();
    const email = $('#forgot-email').value.trim();
    if (!emailPattern.test(email)) {
      $('#forgot-error').textContent = 'Enter a valid email address.';
      return;
    }
    $('#forgot-modal').classList.add('hidden');
    $('#auth-email').value = email;
    showToast('Reset instructions are not sent in this local demo. Connect a secure reset service for production.');
  }

  function initializeInteractions() {
    document.addEventListener('click', event => {
      const routeButton = event.target.closest('[data-route]');
      if (routeButton) routeTo(routeButton.dataset.route);
      const preset = event.target.closest('[data-preset]');
      if (preset) {
        $('#job-text').value = presets[preset.dataset.preset];
        $('#character-count').textContent = `${$('#job-text').value.length.toLocaleString()} / 12,000 characters`;
        switchInput('text');
        routeTo('analyze');
        showToast('Sample loaded — review it, then run a scan.');
      }
      const openButton = event.target.closest('[data-open-scan]');
      if (openButton) loadScan(openButton.dataset.openScan);
      const deleteButton = event.target.closest('[data-delete-scan]');
      if (deleteButton) {
        state.savedScans = state.savedScans.filter(scan => scan.id !== deleteButton.dataset.deleteScan);
        persistScans();
        renderDashboard();
        renderHistory();
        showToast('Saved scan removed.');
      }
    });

    $('#mobile-menu').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
    $('#theme-toggle').addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const dark = document.body.classList.contains('dark');
      $('#theme-toggle').innerHTML = dark ? '<span>☀</span> Light appearance' : '<span>☾</span> Dark appearance';
      localStorage.setItem('jobScamShieldTheme', dark ? 'dark' : 'light');
    });
    if (localStorage.getItem('jobScamShieldTheme') === 'dark') $('#theme-toggle').click();

    $$('.scan-tab').forEach(tab => tab.addEventListener('click', () => switchInput(tab.dataset.input)));
    $('#job-text').addEventListener('input', event => { $('#character-count').textContent = `${event.target.value.length.toLocaleString()} / 12,000 characters`; });
    $('#clear-text').addEventListener('click', () => { $('#job-text').value = ''; $('#character-count').textContent = '0 / 12,000 characters'; $('#job-text').focus(); });
    $('#load-example').addEventListener('click', () => { $('#job-text').value = presets.fee; $('#character-count').textContent = `${$('#job-text').value.length.toLocaleString()} / 12,000 characters`; switchInput('text'); });
    $('#analyze-button').addEventListener('click', runAnalysis);
    $('#save-result').addEventListener('click', saveCurrentScan);
    $('#print-result').addEventListener('click', () => window.print());
    $('#verify-form').addEventListener('submit', runVerification);
    $('#clear-history').addEventListener('click', () => {
      if (!state.savedScans.length) return showToast('There are no saved scans to clear.');
      if (window.confirm('Clear all saved scans from this browser?')) {
        state.savedScans = [];
        persistScans();
        renderDashboard();
        renderHistory();
        showToast('Saved scan history cleared.');
      }
    });

    $('#open-assistant').addEventListener('click', () => $('#assistant-modal').classList.remove('hidden'));
    $('#close-assistant').addEventListener('click', () => $('#assistant-modal').classList.add('hidden'));
    $('#assistant-modal').addEventListener('click', event => { if (event.target === $('#assistant-modal')) $('#assistant-modal').classList.add('hidden'); });
    $$('.quick-questions button').forEach(button => button.addEventListener('click', () => { appendAdvisorMessage(button.textContent, true); setTimeout(() => appendAdvisorMessage(answerAdvisor(button.textContent)), 180); }));
    $('#assistant-form').addEventListener('submit', event => { event.preventDefault(); const input = $('#assistant-input'); const question = input.value.trim(); if (!question) return; appendAdvisorMessage(question, true); input.value = ''; setTimeout(() => appendAdvisorMessage(answerAdvisor(question)), 180); });

    $$('.auth-tab').forEach(tab => tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode)));
    $('#auth-form').addEventListener('submit', submitAuth);
    $('#auth-name').addEventListener('input', () => validateAuthField('name'));
    $('#auth-email').addEventListener('input', () => validateAuthField('email'));
    $('#auth-password').addEventListener('input', () => validateAuthField('password'));
    $('#auth-confirm-password').addEventListener('input', () => validateAuthField('confirm'));
    $$('.password-toggle').forEach(button => button.addEventListener('click', () => togglePassword(button)));
    $('#open-forgot').addEventListener('click', openForgotPassword);
    $('#close-forgot').addEventListener('click', () => $('#forgot-modal').classList.add('hidden'));
    $('#forgot-modal').addEventListener('click', event => { if (event.target === $('#forgot-modal')) $('#forgot-modal').classList.add('hidden'); });
    $('#forgot-form').addEventListener('submit', submitForgotPassword);
    $('#google-auth').addEventListener('click', () => showAuthAlert('Google sign-in needs a configured OAuth provider. This local demo does not open an external sign-in window.'));
    $('#profile-button').addEventListener('click', () => routeTo('auth'));
  }

  renderDashboard();
  renderHistory();
  renderGuide();
  restoreProfile();
  initializeInteractions();
})();
