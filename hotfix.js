/* hotfix.js — avoid double log on Clear */
(function(){
  const $ = (s)=>document.querySelector(s);
  function clearInputs(scope){
    scope.querySelectorAll('input,textarea,select').forEach(el=>{
      if (el.type === 'file') el.value = '';
      else if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else if (el.type === 'range'){
        const old = el.value;
        el.value = el.defaultValue || el.value;
        if (el.id==='quality' && $('#qVal')) $('#qVal').textContent = Number(el.value).toFixed(2);
        if (el.id==='scale' && $('#sVal')) $('#sVal').textContent = Number(el.value).toFixed(2);
      } else { el.value = ''; }
    });
    const thumbs = $('#thumbs'); if (thumbs) thumbs.innerHTML='';
    const logEl = $('#log'); if (logEl) { logEl.textContent += "\n[clear] 入力クリア"; logEl.scrollTop = logEl.scrollHeight; }
  }
  const handlers = {
    clearMerge: clearInputs,
    clearSplit: clearInputs,
    clearCompress: clearInputs,
    clearImg: clearInputs,
    clearP2i: clearInputs,
    clearEdit: clearInputs,
    clearWm: clearInputs,
    clearOcr: clearInputs
  };
  window.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = btn.id || '';
    if (handlers[id]){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); /* prevent duplicate logs */
      handlers[id](document.body);
      return;
    }
    if (id.startsWith('clear')){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      clearInputs(document.body);
    }
  }, true);
})();