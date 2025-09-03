/* lang-switch.js v3 — resilient switcher (Shadow DOM + fallback floating) */
(function(){
  const CONFIG = { urls: { ja:'/', en:'/en/', es:'/es/' } };

  function currentLang(){
    const p = location.pathname;
    if (p.startsWith('/en/')) return 'en';
    if (p.startsWith('/es/')) return 'es';
    return 'ja';
  }

  function styleText(mode){
    // mode: 'header' or 'floating'
    return `:host{all:initial}
      .wrap{all:initial; font:12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
      .bar{display:flex; gap:8px; background:#0f1a2d; border:1px solid #1f2a44; border-radius:999px; padding:6px 8px; ${mode==='floating'?'position:fixed; top:12px; right:12px; z-index:2147483647;':''} }
      .btn{appearance:none; border:1px solid #2a366b; background:#0d1430; color:#e8ecff; padding:6px 10px; border-radius:999px; cursor:pointer}
      .btn.active{background:#14204b; color:#b8c2f2}
      .toggle{display:none}
      @media (max-width:640px){
        .bar{${mode==='floating'?'top:8px; right:8px;':''}}
      }
      @media (max-width:420px){
        .group{display:none; gap:6px}
        .open .group{display:flex}
        .toggle{display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:999px; border:1px solid #2a366b; background:#0d1430; color:#e8ecff}
        .sr{position:absolute!important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0}
      }`;
  }

  async function exists(path){
    try{ const res = await fetch(path, { method:'HEAD', cache:'no-store' }); return res.ok; }
    catch{ return false; }
  }

  function mount(){
    if (document.getElementById('lang-switcher-host')) return;

    // prefer header, else floating
    const header = document.querySelector('header');
    const mode = header ? 'header' : 'floating';

    const host = document.createElement('div');
    host.id = 'lang-switcher-host';
    if (mode === 'header') {
      // place at header start
      header.insertBefore(host, header.firstChild);
    } else {
      document.body.appendChild(host);
    }
    const root = host.attachShadow({ mode:'open' });
    const style = document.createElement('style');
    style.textContent = styleText(mode);
    root.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.innerHTML = `
      <div class="bar" role="navigation" aria-label="Language Switcher">
        <button type="button" class="toggle" aria-expanded="false" aria-controls="lang-group" title="Language"><span class="sr">Language</span>🌐</button>
        <div id="lang-group" class="group">
          <button type="button" class="btn" data-lang="ja" aria-label="日本語">日本語</button>
          <button type="button" class="btn" data-lang="en" aria-label="English">EN</button>
          <button type="button" class="btn" data-lang="es" aria-label="Español">ES</button>
        </div>
      </div>`;
    root.appendChild(wrap);

    const cur = currentLang();
    const pref = localStorage.getItem('pref_lang') || cur;

    // set active
    wrap.querySelectorAll('.btn[data-lang]').forEach(btn => {
      if (btn.getAttribute('data-lang') === cur) btn.classList.add('active');
    });

    // tiny-screen dropdown toggle
    const bar = wrap.querySelector('.bar');
    wrap.querySelector('.toggle').addEventListener('click', ()=>{
      bar.classList.toggle('open');
      const open = bar.classList.contains('open');
      wrap.querySelector('.toggle').setAttribute('aria-expanded', open?'true':'false');
    });

    // click handler
    wrap.addEventListener('click', (e)=>{
      const b = e.target.closest('.btn[data-lang]'); if(!b) return;
      const lang = b.getAttribute('data-lang');
      if (!CONFIG.urls[lang]) return;
      if (lang === cur) return;
      localStorage.setItem('pref_lang', lang);
      location.href = CONFIG.urls[lang];
    });

    // hide buttons if missing
    (async()=>{
      for (const code of ['en','es']){
        const ok = await exists(CONFIG.urls[code]);
        if (!ok){
          const btn = wrap.querySelector(`.btn[data-lang="${code}"]`);
          if (btn) btn.style.display='none';
        }
      }
    })();

    // optional first-visit redirect (on "/" only)
    try{
      if (cur === 'ja' && location.pathname === '/' && !sessionStorage.getItem('lang_redirect_done')){
        if (pref !== 'ja') {
          sessionStorage.setItem('lang_redirect_done','1');
          location.replace(CONFIG.urls[pref]);
        }
      }
    }catch{}

    // self-heal: re-mount if host is removed
    const mo = new MutationObserver(()=>{
      if (!document.getElementById('lang-switcher-host')){
        mo.disconnect();
        setTimeout(mount, 0);
      }
    });
    mo.observe(document.body, { childList:true, subtree:true });
  }

  // mount after parse
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', mount, { once:true });
  } else {
    mount();
  }
})();
