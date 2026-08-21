(() => {
  'use strict';
  const root=document.documentElement;
  const saved=localStorage.getItem('jss-theme');
  function apply(theme){document.body.classList.toggle('dark',theme==='dark');localStorage.setItem('jss-theme',theme);const b=document.querySelector('#theme-toggle');if(b){b.textContent=theme==='dark'?'☀ Light mode':'☾ Dark mode';b.setAttribute('aria-label',theme==='dark'?'Switch to light mode':'Switch to dark mode')}}
  function initTheme(){apply(saved||'light');document.querySelector('#theme-toggle')?.addEventListener('click',()=>apply(document.body.classList.contains('dark')?'light':'dark'))}
  function polishGoogle(){const b=document.querySelector('#google-auth');if(!b)return;b.classList.add('google-button');if(!b.dataset.polished){b.dataset.polished='1';const original=b.textContent.trim();if(!/google/i.test(original))b.textContent='Continue with Google';}}
  function init(){
    if(!document.querySelector('#theme-toggle')){const side=document.querySelector('.sidebar-bottom');if(side){const b=document.createElement('button');b.id='theme-toggle';b.className='theme-button';b.type='button';side.appendChild(b)}}
    initTheme();polishGoogle();
    const observer=new MutationObserver(polishGoogle);observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
