
/**
 * AdSafe v1.1 (2025-08-31)
 * - Blocks ads on pages without publisher content (per Google policy).
 * - Waits for CMP consent (TCF) before unpausing AdSense.
 * - Falls back to non-personalized if CMP absent/denied.
 * - Avoids ad rendering on utility pages (verify, 404, thanks, login).
 * Docs: README.txt
 */
(function(){
  const BLOCKED_PATHS = [/\/verify\.html$/i, /\/404\.html$/i, /\/thank/i, /\/login/i];
  const MIN_WORDS = 250;
  const CONTENT_SELECTORS = ['main', '.article', '.help', '.doc', '.content', '.body'];
  const isBlockedPath = BLOCKED_PATHS.some(re => re.test(location.pathname));

  function countWords(text){
    if(!text) return 0;
    const clean = text.replace(/\s+/g,' ').trim();
    if(!clean) return 0;
    return clean.split(' ').length;
  }
  function hasPublisherContent(){
    for(const sel of CONTENT_SELECTORS){
      const el = document.querySelector(sel);
      if(el){
        const words = countWords(el.innerText || '');
        if(words >= MIN_WORDS) return true;
      }
    }
    return false;
  }
  function loadAds(){
    if(!document.querySelector('.adsbygoogle')) return;
    (adsbygoogle = window.adsbygoogle || []).push({});
  }

  async function ensureTCFandLoad(){
    try{
      (adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 1;
      const resume = (personalized)=>{
        if(!personalized){
          (adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1;
        }
        (adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 0;
        loadAds();
      };
      if(typeof window.__tcfapi === 'function'){
        let resolved = false;
        const timeout = setTimeout(()=>{ if(!resolved){ resolved=true; resume(false); } }, 4000);
        window.__tcfapi('addEventListener', 2, (tcData, success)=>{
          if(resolved) return;
          if(success && tcData && (tcData.eventStatus === 'tcloaded' || tcData.eventStatus === 'useractioncomplete')){
            resolved = true; clearTimeout(timeout);
            const purpose4 = tcData.purpose && tcData.purpose.consents && tcData.purpose.consents['4'];
            resume(!!purpose4);
          }
        });
      } else {
        resume(false);
      }
    }catch(e){
      console.error('[AdSafe] error', e);
      (adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 1;
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    if(isBlockedPath){
      document.querySelectorAll('.adsbygoogle').forEach(el=> el.remove());
      return;
    }
    if(!hasPublisherContent()){
      console.warn('[AdSafe] No sufficient publisher content; skipping ads.');
      document.querySelectorAll('.adsbygoogle').forEach(el=> el.remove());
      return;
    }
    ensureTCFandLoad();
  });
})();
