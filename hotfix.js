/* hotfix.js — clear buttons + safety */
(function(){
  const $ = (s)=>document.querySelector(s);
  function clearInputs(scope){
    scope.querySelectorAll('input[type=file],input[type=text],input[type=number],input[type=range],textarea,select').forEach(el=>{
      if (el.type === 'file') el.value = '';
      else if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else if (el.type === 'range'){ el.value = el.defaultValue || el.value; const id=el.id; if(id==='quality'&&document.getElementById('qVal')) document.getElementById('qVal').textContent = Number(el.value).toFixed(2); if(id==='scale'&&document.getElementById('sVal')) document.getElementById('sVal').textContent = Number(el.value).toFixed(2); }
      else el.value = '';
    });
    const thumbs = document.getElementById('thumbs'); if (thumbs) thumbs.innerHTML='';
    const log = document.getElementById('log'); if (log) { log.textContent += "\n[hotfix] Clear: 入力クリア"; log.scrollTop = log.scrollHeight; }
  }
  const map = {
    clearMerge: ()=> clearInputs(document.body),
    clearSplit: ()=> clearInputs(document.body),
    clearCompress: ()=> clearInputs(document.body),
    clearImg: ()=> clearInputs(document.body),
    clearP2i: ()=> clearInputs(document.body),
    clearEdit: ()=> clearInputs(document.body),
    clearWm: ()=> clearInputs(document.body),
    clearOcr: ()=> clearInputs(document.body)
  };
  window.addEventListener('click', (e)=>{
    const t = e.target.closest('button'); if(!t) return;
    const id = t.id || ''; if (map[id]) { e.preventDefault(); try{ map[id](); }catch{} return; }
    if (id.startsWith('clear')){ e.preventDefault(); try{ clearInputs(document.body); }catch{} }
  }, true);
})();