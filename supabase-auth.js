(() => {
  'use strict';

  // Safe to expose in a browser: this is the Supabase publishable/anon key.
  const SUPABASE_URL = 'https://ltdmawmtnmlfmfhiwwow.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_n_WZP0LdaRzFy_3v-xYuug_EnAsMxMM';

  if (!window.supabase?.createClient) {
    console.error('Supabase client library did not load.');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function alertBox(message, type = 'error') {
    const el = $('#auth-alert');
    if (!el) return;
    el.textContent = message;
    el.className = `auth-alert ${type}`;
  }

  function clearAlert() {
    const el = $('#auth-alert');
    if (el) { el.textContent = ''; el.className = 'auth-alert hidden'; }
  }

  function setLoading(loading) {
    const button = $('#auth-submit');
    const spinner = $('#auth-spinner');
    const label = $('#auth-submit-label');
    if (!button) return;
    button.disabled = loading;
    if (spinner) spinner.classList.toggle('hidden', !loading);
    if (label && !loading) label.textContent = $('.auth-tab.active')?.dataset.authMode === 'signup' ? 'Create Account' : 'Sign In';
  }

  function setMode(mode) {
    $$('.auth-tab').forEach(tab => {
      const active = tab.dataset.authMode === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    $$('.signup-field').forEach(el => el.classList.toggle('hidden', mode !== 'signup'));
    const title = $('#auth-title');
    const subtitle = $('#auth-subtitle');
    const label = $('#auth-submit-label');
    const password = $('#auth-password');
    if (title) title.textContent = mode === 'signup' ? 'Create your account' : 'Welcome back';
    if (subtitle) subtitle.textContent = mode === 'signup' ? 'Create a secure account to keep your job-safety checks in one place.' : 'Sign in to keep your job-safety checks in one place.';
    if (label) label.textContent = mode === 'signup' ? 'Create Account' : 'Sign In';
    if (password) password.autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    clearAlert();
  }

  function initials(name, email) {
    const source = (name || email || 'JS').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }

  function updateProfile(user) {
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Job Seeker';
    const profileName = $('#profile-name');
    const profileInitials = $('#profile-initials');
    if (profileName) profileName.textContent = name;
    if (profileInitials) profileInitials.textContent = initials(name, user?.email);
  }

  function showSignedOutProfile() {
    const profileName = $('#profile-name');
    const profileInitials = $('#profile-initials');
    if (profileName) profileName.textContent = 'Guest';
    if (profileInitials) profileInitials.textContent = 'G';
  }

  function goDashboard() {
    const dashboard = document.querySelector('[data-route="dashboard"]');
    if (dashboard) dashboard.click();
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    clearAlert();

    const mode = $('.auth-tab.active')?.dataset.authMode || 'signin';
    const name = $('#auth-name')?.value.trim() || '';
    const email = $('#auth-email')?.value.trim() || '';
    const password = $('#auth-password')?.value || '';
    const confirm = $('#auth-confirm-password')?.value || '';

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return alertBox('Please enter a valid email address.');
    if (password.length < 6) return alertBox('Password must be at least 6 characters.');
    if (mode === 'signup' && !name) return alertBox('Please enter your full name.');
    if (mode === 'signup' && password !== confirm) return alertBox('Passwords do not match.');

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin + window.location.pathname
          }
        });
        if (error) throw error;
        if (data.session) {
          updateProfile(data.user);
          alertBox('Account created successfully. You are now signed in.', 'success');
          toast(`Welcome, ${name}.`);
          setTimeout(goDashboard, 700);
        } else {
          alertBox('Account created. Check your email to verify your address before signing in.', 'success');
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        updateProfile(data.user);
        alertBox('Signed in successfully.', 'success');
        toast(`Welcome back, ${data.user.user_metadata?.full_name || email}.`);
        setTimeout(goDashboard, 500);
      }
    } catch (error) {
      console.error('Supabase authentication error:', error);
      const message = String(error?.message || 'Authentication failed. Please try again.');
      if (/invalid login credentials/i.test(message)) alertBox('Incorrect email or password.');
      else if (/user already registered/i.test(message)) alertBox('An account with this email already exists. Try signing in.');
      else alertBox(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const email = $('#forgot-email')?.value.trim() || '';
    const errorEl = $('#forgot-error');
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      if (errorEl) errorEl.textContent = 'Enter a valid email address.';
      return;
    }
    if (errorEl) errorEl.textContent = '';
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      if (error) throw error;
      $('#forgot-modal')?.classList.add('hidden');
      alertBox('Password reset instructions have been sent to your email.', 'success');
      toast('Password reset email sent.');
    } catch (error) {
      if (errorEl) errorEl.textContent = error.message || 'Unable to send reset instructions.';
    }
  }

  async function handleGoogle(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    clearAlert();
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
      if (error) throw error;
    } catch (error) {
      alertBox(error.message || 'Google sign-in is unavailable. Enable Google in Supabase Authentication → Providers.');
    }
  }

  function addLogoutButton() {
    if ($('#supabase-logout')) return;
    const actions = document.querySelector('.topbar-actions');
    if (!actions) return;
    const button = document.createElement('button');
    button.id = 'supabase-logout';
    button.className = 'secondary-button';
    button.type = 'button';
    button.textContent = 'Log out';
    button.style.display = 'none';
    button.addEventListener('click', async () => {
      const { error } = await client.auth.signOut();
      if (error) return alertBox(error.message);
      showSignedOutProfile();
      toast('You have been logged out.');
      document.querySelector('[data-route="auth"]')?.click();
    });
    actions.prepend(button);
  }

  function syncAuthUI(session) {
    const logout = $('#supabase-logout');
    if (logout) logout.style.display = session ? '' : 'none';
    if (session?.user) updateProfile(session.user); else showSignedOutProfile();
  }

  function installCaptureHandlers() {
    // Capture phase runs before the original local-demo handlers in script.js.
    document.addEventListener('submit', event => {
      if (event.target?.id === 'auth-form') handleAuthSubmit(event);
      if (event.target?.id === 'forgot-form') handleForgotSubmit(event);
    }, true);

    document.addEventListener('click', event => {
      const authTab = event.target.closest?.('.auth-tab');
      if (authTab) setMode(authTab.dataset.authMode);
      const google = event.target.closest?.('#google-auth');
      if (google) handleGoogle(event);
    }, true);
  }

  async function init() {
    addLogoutButton();
    installCaptureHandlers();
    const { data } = await client.auth.getSession();
    syncAuthUI(data.session);
    client.auth.onAuthStateChange((_event, session) => syncAuthUI(session));
  }

  init();
})();
