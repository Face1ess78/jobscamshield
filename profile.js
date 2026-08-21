(() => {
  'use strict';

  const client = window.jobScamShieldSupabase;
  const SCANS_KEY = 'jobScamShieldScansV1';

  const profileStyles = `
    .profile-page{max-width:1100px;margin:0 auto}
    .profile-hero{display:flex;align-items:center;gap:22px;padding:26px;border:1px solid var(--line);border-radius:16px;background:var(--panel);box-shadow:var(--shadow);margin-bottom:18px}
    .profile-avatar{display:grid;place-items:center;flex:0 0 auto;width:86px;height:86px;border-radius:50%;background:var(--blue-pale);color:var(--blue);font-size:28px;font-weight:800;border:4px solid #fff;box-shadow:0 5px 18px rgba(20,52,90,.1)}
    .profile-hero h2{margin:0 0 3px;font:700 27px/1.15 "Fraunces",Georgia,serif}.profile-hero p{margin:0;color:var(--ink-soft)}
    .profile-badge{display:inline-flex;margin-top:9px;padding:4px 9px;border-radius:20px;background:var(--green-pale);color:var(--green);font-size:11px;font-weight:700}
    .profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.profile-card{padding:22px;border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:0 3px 10px rgba(35,68,102,.025)}
    .profile-card h3{margin:0 0 16px;font:700 19px/1.2 "Fraunces",Georgia,serif}.profile-field{padding:12px 0;border-top:1px solid #eaf0f5}.profile-field:first-of-type{border-top:0;padding-top:0}.profile-field small{display:block;color:#8192a3;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}.profile-field b{display:block;margin-top:3px;color:var(--ink);word-break:break-word}
    .profile-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.profile-stat{padding:15px;border:1px solid var(--line);border-radius:10px;background:#fbfdff}.profile-stat b{display:block;font-size:25px}.profile-stat span{color:#718599;font-size:11px;font-weight:600}.profile-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}.profile-note{margin-top:12px;color:#7a8d9f;font-size:11px;line-height:1.45}.profile-danger{border-color:#efc9c7;color:var(--red)}
    @media(max-width:760px){.profile-grid{grid-template-columns:1fr}.profile-hero{align-items:flex-start}.profile-stats{grid-template-columns:1fr 1fr}.profile-hero h2{font-size:23px}}
  `;

  function initials(name, email) {
    const value = String(name || email || 'JS').trim();
    const parts = value.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : value.slice(0, 2)).toUpperCase();
  }

  function getScans() {
    try { const value = JSON.parse(localStorage.getItem(SCANS_KEY) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  function ensureUI() {
    if (!document.getElementById('profile-view')) {
      const view = document.createElement('section');
      view.id = 'profile-view';
      view.className = 'view';
      view.setAttribute('aria-labelledby', 'profile-title');
      view.innerHTML = `<div class="profile-page">
        <div class="page-intro compact-intro"><div><p class="eyebrow">Account</p><h1 id="profile-title">Your profile</h1><p>Manage your JobScamShield account and review your protection activity.</p></div></div>
        <div id="profile-content"></div>
      </div>`;
      document.querySelector('.main-content')?.appendChild(view);
    }

    if (!document.querySelector('.nav-link[data-route="profile"]')) {
      const nav = document.querySelector('.nav-list');
      const button = document.createElement('button');
      button.className = 'nav-link';
      button.dataset.route = 'profile';
      button.innerHTML = '<span>◎</span> My Profile';
      nav?.appendChild(button);
    }

    if (!document.getElementById('profile-style')) {
      const style = document.createElement('style'); style.id = 'profile-style'; style.textContent = profileStyles; document.head.appendChild(style);
    }
  }

  function navigate() {
    const link = document.querySelector('.nav-link[data-route="profile"]');
    link?.click();
  }

  function render(user) {
    ensureUI();
    const el = document.getElementById('profile-content');
    if (!el) return;
    if (!user) {
      el.innerHTML = `<div class="profile-card"><h3>Sign in required</h3><p>You need to sign in before viewing your profile.</p><div class="profile-actions"><button class="primary-button" id="profile-signin">Go to sign in <span>→</span></button></div></div>`;
      document.getElementById('profile-signin')?.addEventListener('click', () => document.querySelector('.nav-link[data-route="auth"]')?.click());
      return;
    }

    const meta = user.user_metadata || {};
    const name = meta.full_name || meta.name || user.email?.split('@')[0] || 'Job Seeker';
    const provider = user.app_metadata?.provider || (Array.isArray(user.identities) && user.identities[0]?.provider) || 'email';
    const scans = getScans();
    const high = scans.filter(s => Number(s.score) >= 70).length;
    const caution = scans.filter(s => Number(s.score) >= 35 && Number(s.score) < 70).length;
    const created = user.created_at ? new Intl.DateTimeFormat(undefined,{day:'numeric',month:'long',year:'numeric'}).format(new Date(user.created_at)) : '—';

    el.innerHTML = `<div class="profile-hero"><div class="profile-avatar">${initials(name,user.email)}</div><div><h2>${escapeHtml(name)}</h2><p>${escapeHtml(user.email || '')}</p><span class="profile-badge">✓ ${escapeHtml(provider)} account</span></div></div>
      <div class="profile-grid">
        <article class="profile-card"><h3>Account information</h3>
          <div class="profile-field"><small>Full name</small><b>${escapeHtml(name)}</b></div>
          <div class="profile-field"><small>Email</small><b>${escapeHtml(user.email || '—')}</b></div>
          <div class="profile-field"><small>Member since</small><b>${created}</b></div>
          <div class="profile-actions"><button class="secondary-button" id="profile-reset">Change password</button><button class="secondary-button profile-danger" id="profile-logout">Log out</button></div>
          <p class="profile-note">Password changes use Supabase's secure email reset flow. Your password is never stored in this website.</p>
        </article>
        <article class="profile-card"><h3>Protection activity</h3>
          <div class="profile-stats"><div class="profile-stat"><b>${scans.length}</b><span>Total scans</span></div><div class="profile-stat"><b>${high}</b><span>High risk</span></div><div class="profile-stat"><b>${caution}</b><span>Caution</span></div></div>
          <p class="profile-note">Your current scan history is stored in this browser. Cloud sync can be added next so your history follows your account across devices.</p>
          <div class="profile-actions"><button class="secondary-button" id="profile-history">View scan history</button></div>
        </article>
      </div>`;

    document.getElementById('profile-logout')?.addEventListener('click', async () => {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) return alert(error.message);
      navigate();
    });
    document.getElementById('profile-reset')?.addEventListener('click', async () => {
      if (!client || !user.email) return;
      const { error } = await client.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + window.location.pathname });
      alert(error ? error.message : 'Password reset instructions have been sent to your email.');
    });
    document.getElementById('profile-history')?.addEventListener('click', () => document.querySelector('.nav-link[data-route="history"]')?.click());
  }

  function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function init() {
    ensureUI();
    document.addEventListener('click', event => {
      if (event.target.closest?.('#profile-button')) navigate();
    });
    if (client) {
      client.auth.getSession().then(({data}) => render(data.session?.user || null));
      client.auth.onAuthStateChange((_event, session) => render(session?.user || null));
    } else render(null);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
