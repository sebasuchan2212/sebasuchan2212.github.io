/* lang-switch.js v2 — mobile-safe, no overlap, optional dropdown */
(function(){
  try{
    const urls = { ja: '/', en: '/en/', es: '/es/' };

    function detect(){
      const p = location.pathname;
      if (p.startsWith('/en/')) return 'en';
      if (p.startsWith('/es/')) return 'es';
      return 'ja';
    }
    const cur = detect();
    const pref = localStorage.getItem('pref_lang') || cur;

    // basic styles
    const css = document.createElement('style');
    css.textContent = `
      header{position:relative}
      #lang-switcher{position:absolute; top:12px; right:12px; display:flex; gap:8px; background:#0f1a2d; border:1px solid #1f2a44; border-radius:999px; padding:6px 8px; z-index:1001}
      #lang-switcher button{appearance:none; border:1px solid #2a366b; background:#0d1430; color:#e8ecff; padding:6px 10px; border-radius:999px; cursor:pointer; font: 12px/1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;}
      #lang-switcher button.active{background:#14204b; color:#b8c2f2}
      /* mobile: turn into a dropdown row above the title (no overlap) */
      @media (max-width:640px){
        #lang-switcher{position:relative; top:auto; right:auto; margin:0 0 8px auto;}
      }
      /* dropdown mode for very small screens */
      @media (max-width:420px){
        #lang-switcher{gap:0; padding:4px 6px}
        #lang-switcher .group{display:none; gap:6px}
        #lang-switcher.open .group{display:flex}
        #lang-switcher .toggle{display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:999px; border:1px solid #2a366b; background:#0d1430; font-size:14px}
        #lang-switcher .sr{position:absolute!important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0}
      }
    `;
    document.head.appendChild(css);

    // check existence of locales (optional)
    async function exists(path){
      try{ const res = await fetch(path, { method:'HEAD', cache:'no-store' }); return res.ok; }
      catch{ return false; }
    }

    const header = document.querySelector('header') || document.body;
    const bar = document.createElement('div');
    bar.id = 'lang-switcher';
    bar.innerHTML = `
      <button type="button" class="toggle" aria-expanded="false" aria-controls="lang-group" title="Language"><span class="sr">Language</span>🌐</button>
      <div id="lang-group" class="group">
        <button type="button" data-lang="ja" aria-label="日本語">日本語</button>
        <button type="button" data-lang="en" aria-label="English">EN</button>
        <button type="button" data-lang="es" aria-label="Español">ES</button>
      </div>
    `;
    header.insertBefore(bar, header.firstChild);

    // active state
    [...bar.querySelectorAll('button[data-lang]')].forEach(btn => {
      const l = btn.getAttribute('data-lang');
      if (l === cur) btn.classList.add('active');
    });

    // collapse/expand on tiny screens
    const toggle = bar.querySelector('.toggle');
    if (toggle){
      toggle.addEventListener('click', ()=>{
        const open = bar.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // click handler
    bar.addEventListener('click', (e)=>{
      const b = e.target.closest('button[data-lang]'); if(!b) return;
      const lang = b.getAttribute('data-lang');
      if (!lang || !urls[lang]) return;
      if (lang === cur) return;
      localStorage.setItem('pref_lang', lang);
      location.href = urls[lang];
    });

    // hide buttons for missing locales (non-blocking)
    (async()=>{
      const targets = [['en','/en/'], ['es','/es/']];
      for (const [code, path] of targets){
        const ok = await exists(path);
        if (!ok){
          const btn = bar.querySelector(`button[data-lang="${code}"]`);
          if (btn) btn.style.display='none';
        }
      }
    })();

    // optional initial redirect on "/" only
    try{
      if (cur === 'ja' && location.pathname === '/' && !sessionStorage.getItem('lang_redirect_done')){
        if (pref !== 'ja') {
          sessionStorage.setItem('lang_redirect_done', '1');
          location.replace(urls[pref]);
        }
      }
    }catch{}

  }catch(e){ console.error('lang-switch v2 error', e); }
})(); error', e); }
})();
