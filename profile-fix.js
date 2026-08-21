(() => {
  'use strict';

  const SUPABASE_URL = 'https://ltdmawmtnmlfmfhiwwow.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_n_WZP0LdaRzFy_3v-xYuug_EnAsMxMM';
  const SCANS_KEY = 'jobScamShieldScansV1';

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getScans() {
    try {
      const value = JSON.parse(localStorage.getItem(SCANS_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }

  function getClient() {
    if (window.jobScamShieldSupabase) return window.jobScamShieldSupabase;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      window.jobScamShieldSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return window.jobScamShieldSupabase;
    }
    return null;
  }

  function initials(name, email) {
    const value = String(name || email || 'JS').trim();
    const parts = value.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : value.slice(0, 2)).toUpperCase();
  }

  function showProfile() {
    const profile = document.getElementById('profile-view');
    if (!profile) return;
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view === profile));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.route === 'profile'));
    document.querySelector('.sidebar')?.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildProfile() {
    let profile = document.getElementById('profile-view');
    if (!profile) {
      profile = document.createElement('section');
      profile.id = 'profile-view';
      profile.className = 'view';
      document.querySelector('.main-content')?.appendChild(profile);
    }
    profile.innerHTML = `
      <div class="profile-page">
        <div class="page-intro compact-intro">
          <div><p class="eyebrow">Account</p><h1>Your profile</h1><p>Manage your JobScamShield account and review your protection activity.</p></div>
        </div>
        <div id="profile-content"></div>
      </div>`;
    let nav = document.querySelector('.nav-link[data-route="profile"]');
    if (!nav) {
      nav = document.createElement('button');
      nav.type = 'button';
      nav.className = 'nav-link';
      nav.dataset.route = 'profile';
      nav.innerHTML = '<span>◎</span> My Profile';
      document.querySelector('.nav-list')?.appendChild(nav);
    }
    nav.onclick = event => { event.preventDefault(); event.stopPropagation(); showProfile(); loadProfile(); };
    document.getElementById('profile-button')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      showProfile();
      loadProfile();
    }, true);
  }

  async function loadProfile() {
    const target = document.getElementById('profile-content');
    if (!target) return;
    const client = getClient();
    if (!client) {
      target.innerHTML = '<div class="profile-card"><h3>Authentication is loading</h3><p>Please refresh the page and try again.</p></div>';
      return;
    }
    target.innerHTML = '<div class="profile-card"><h3>Loading profile…</h3><p>Connecting securely to your account.</p></div>';
    const { data, error } = await client.auth.getSession();
    if (error) {
      target.innerHTML = `<div class="profile-card"><h3>Unable to load profile</h3><p>${escapeHtml(error.message)}</p></div>`;
      return;
    }
    const user = data.session?.user;
    if (!user) {
      target.innerHTML = '<div class="profile-card"><h3>Sign in required</h3><p>Sign in to view your profile and account activity.</p><div class="profile-actions"><button class="primary-button" id="profile-go-auth">Go to sign in <span>→</span></button></div></div>';
      document.getElementById('profile-go-auth')?.addEventListener('click', () => document.querySelector('.nav-link[data-route="auth"]')?.click());
      return;
    }

    const meta = user.user_metadata || {};
    const name = meta.full_name || meta.name || user.email?.split('@')[0] || 'Job Seeker';
    const provider = user.app_metadata?.provider || user.identities?.[0]?.provider || 'email';
    const scans = getScans();
    const high = scans.filter(item => Number(item.score) >= 70).length;
    const caution = scans.filter(item => Number(item.score) >= 35 && Number(item.score) < 70).length;
    const created = user.created_at ? new Intl.DateTimeFormat(undefined, {day:'numeric', month:'long', year:'numeric'}).format(new Date(user.created_at)) : '—';

    target.innerHTML = `
      <div class="profile-hero">
        <div class="profile-avatar">${initials(name, user.email)}</div>
        <div><h2>${escapeHtml(name)}</h2><p>${escapeHtml(user.email || '')}</p><span class="profile-badge">✓ ${escapeHtml(provider)} account</span></div>
      </div>
      <div class="profile-grid">
        <article class="profile-card">
          <h3>Account information</h3>
          <div class="profile-field"><small>Full name</small><b>${escapeHtml(name)}</b></div>
          <div class="profile-field"><small>Email</small><b>${escapeHtml(user.email || '—')}</b></div>
          <div class="profile-field"><small>Member since</small><b>${created}</b></div>
          <div class="profile-actions"><button class="secondary-button" id="profile-reset">Change password</button><button class="secondary-button profile-danger" id="profile-logout">Log out</button></div>
        </article>
        <article class="profile-card">
          <h3>Protection activity</h3>
          <div class="profile-stats"><div class="profile-stat"><b>${scans.length}</b><span>Total scans</span></div><div class="profile-stat"><b>${high}</b><span>High risk</span></div><div class="profile-stat"><b>${caution}</b><span>Caution</span></div></div>
          <p class="profile-note">Scan history is currently stored in this browser.</p>
          <div class="profile-actions"><button class="secondary-button" id="profile-history">View scan history</button></div>
        </article>
      </div>`;

    document.getElementById('profile-logout')?.addEventListener('click', async () => {
      const result = await client.auth.signOut();
      if (result.error) { alert(result.error.message); return; }
      document.querySelector('.nav-link[data-route="auth"]')?.click();
    });
    document.getElementById('profile-reset')?.addEventListener('click', async () => {
      const result = await client.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + window.location.pathname });
      alert(result.error ? result.error.message : 'Password reset instructions have been sent to your email.');
    });
    document.getElementById('profile-history')?.addEventListener('click', () => document.querySelector('.nav-link[data-route="history"]')?.click());
  }

  function init() {
    buildProfile();
    const client = getClient();
    if (client) client.auth.onAuthStateChange(() => { if (document.getElementById('profile-view')?.classList.contains('active')) loadProfile(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
