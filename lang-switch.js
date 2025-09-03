/* lang-switch.js — visible language toggle (JA/EN/ES) */
(function(){
  try{
    const urls = { ja: '/', en: '/en/', es: '/es/' };
    const detect = ()=> {
      const p = location.pathname;
      if (p.startsWith('/en/')) return 'en';
      if (p.startsWith('/es/')) return 'es';
      return 'ja';
    };
    const cur = detect();
    const pref = localStorage.getItem('pref_lang') || cur;

    // Styles (non-intrusive)
    const css = document.createElement('style');
    css.textContent = `
      header{position:relative}
      #lang-switcher{position:absolute; top:12px; right:12px; display:flex; gap:8px; background:#0f1a2d; border:1px solid #1f2a44; border-radius:999px; padding:6px 8px; z-index:1001}
      #lang-switcher button{appearance:none; border:1px solid #2a366b; background:#0d1430; color:#e8ecff; padding:6px 10px; border-radius:999px; cursor:pointer; font: 12px/1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;}
      #lang-switcher button.active{background:#14204b; color:#b8c2f2}
      @media (max-width:640px){ #lang-switcher{top:8px; right:8px} }
    `;
    document.head.appendChild(css);

    // Switcher UI
    const bar = document.createElement('div');
    bar.id = 'lang-switcher';
    bar.innerHTML = `
      <button type="button" data-lang="ja" aria-label="日本語">日本語</button>
      <button type="button" data-lang="en" aria-label="English">EN</button>
      <button type="button" data-lang="es" aria-label="Español">ES</button>
    `;
    const header = document.querySelector('header') || document.body;
    header.appendChild(bar);

    // set active
    [...bar.querySelectorAll('button')].forEach(btn => {
      const l = btn.getAttribute('data-lang');
      if (l === cur) btn.classList.add('active');
    });

    // click handler
    bar.addEventListener('click', (e)=>{
      const b = e.target.closest('button'); if(!b) return;
      const lang = b.getAttribute('data-lang');
      if (!lang || !urls[lang]) return;
      if (lang === cur) return;
      localStorage.setItem('pref_lang', lang);
      location.href = urls[lang];
    });

    // Optional: initial preference redirect only on first visit to "/" path (no hash/query)
    try{
      if (cur === 'ja' && location.pathname === '/' && !sessionStorage.getItem('lang_redirect_done')){
        if (pref !== 'ja') {
          sessionStorage.setItem('lang_redirect_done', '1');
          location.replace(urls[pref]);
        }
      }
    }catch{}
  }catch(e){ console.error('lang-switch error', e); }
})();