// /lang-switch.js (2025-09-10.1)
(function(){
  try{
    const bar = document.getElementById('langbar');
    const link = document.getElementById('langbarLink');
    const close = document.getElementById('langbarClose');
    if(!bar || !link || !close) return;

    // すでに閉じたことがあるなら出さない
    if (localStorage.getItem('langbar_closed') === '1') return;

    const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    let href = null;
    if (nav.startsWith('en')) href = '/en/';
    else if (nav.startsWith('es')) href = '/es/';

    if (href && location.pathname !== href) {
      link.href = href;
      bar.style.display = 'flex';
      close.addEventListener('click', ()=>{ localStorage.setItem('langbar_closed','1'); bar.remove(); });
    }
  }catch(e){}
})();
