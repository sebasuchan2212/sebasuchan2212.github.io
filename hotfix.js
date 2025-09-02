/*! pdftools-hotfix.js v2 — add CLEAR support + delegation + self-test (2025-09-02) */
(function(){
  if (window.__PDFTOOLS_HOTFIX_V2__) return;
  window.__PDFTOOLS_HOTFIX_V2__ = true;

  const $ = (s)=>document.querySelector(s);
  const logEl = $('#log');
  function log(msg){
    if (logEl){ logEl.textContent += "\n[hotfix] " + msg; logEl.scrollTop = logEl.scrollHeight; }
    try { console.log("[hotfix] " + msg); } catch {}
  }
  function alertOnce(key, msg){
    const k = "__hotfix_alert_" + key;
    if (!sessionStorage.getItem(k)){ sessionStorage.setItem(k, "1"); alert(msg); }
  }
  async function fileToArrayBuffer(file){
    if (!file) throw new Error("No file selected");
    const fr = new FileReader();
    return await new Promise((res,rej)=>{ fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsArrayBuffer(file); });
  }
  function downloadBlob(blob, filename){
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }
  function parseRanges(input, total){
    if(!input) return [];
    const out = [];
    for (const raw of input.split(',').map(s=>s.trim()).filter(Boolean)){
      if (/^\d+$/.test(raw)){ const n=+raw; if(n>=1 && n<=total) out.push([n,n]); }
      else if (/^(\d+)-(\d+)$/.test(raw)){ let m=raw.match(/(\d+)-(\d+)/); let a=+m[1], b=+m[2]; if(a>b)[a,b]=[b,a]; a=Math.max(1,a); b=Math.min(total,b); if(a<=b) out.push([a,b]); }
      else if (/^(\d+)-$/.test(raw)){ let m=raw.match(/(\d+)-/); let a=+m[1]; if(a<=total) out.push([Math.max(1,a), total]); }
    }
    const set = new Set(); out.forEach(([a,b])=>{ for(let i=a;i<=b;i++) set.add(i); });
    return Array.from(set).sort((a,b)=>a-b);
  }

  const env = {
    PDFLib: !!window.PDFLib,
    pdfjsLib: !!window.pdfjsLib && !!window.pdfjsLib.getDocument,
    jsPDF: !!(window.jspdf && window.jspdf.jsPDF),
    JSZip: !!window.JSZip,
    exifr: !!window.exifr
  };
  try { log("env: " + JSON.stringify(env)); } catch {}
  if (!env.PDFLib || !env.pdfjsLib || !env.jsPDF){
    alertOnce("libs", "必要ライブラリが読み込めていません。通信環境や広告ブロッカー、古いキャッシュ（Service Worker）を確認してください。ページの「ハード再読み込み」をお試しください。");
  }

  async function doMerge(){
    const files = Array.from($('#mergeFiles')?.files||[]);
    if (!files.length) return alert('PDFを選択してください');
    const outPdf = await PDFLib.PDFDocument.create();
    for (const f of files){
      try{
        const buf = await fileToArrayBuffer(f);
        const src = await PDFLib.PDFDocument.load(buf);
        const pages = await outPdf.copyPages(src, src.getPageIndices());
        pages.forEach(p=>outPdf.addPage(p));
      }catch(e){ console.error(e); alert('読み込み失敗: '+f.name); }
    }
    const bytes = await outPdf.save({ updateFieldAppearances: true });
    downloadBlob(new Blob([bytes], {type:'application/pdf'}), 'merged.pdf');
    log('Merge: 完了 merged.pdf');
  }
  async function doSplit(){
    const file = $('#splitFile')?.files?.[0];
    if (!file) return alert('PDFを選択してください');
    const buf = await fileToArrayBuffer(file);
    const src = await PDFLib.PDFDocument.load(buf);
    const total = src.getPageCount();
    const pages = parseRanges($('#splitRanges')?.value, total);
    if (!pages.length) return alert('正しいページ範囲を入力してください');
    let idx=1;
    for (const n of pages){
      const out = await PDFLib.PDFDocument.create();
      const [page] = await out.copyPages(src, [n-1]);
      out.addPage(page);
      const bytes = await out.save();
      downloadBlob(new Blob([bytes],{type:'application/pdf'}), `page_${idx++}_${n}.pdf`);
      await new Promise(r=>setTimeout(r,40));
    }
    log('Split: 保存完了');
  }
  async function doCompress(){
    const file = $('#compressFile')?.files?.[0];
    if (!file) return alert('PDFを選択してください');
    const q = Number($('#quality')?.value || 0.7);
    const sc = Number($('#scale')?.value || 0.8);
    const buf = await fileToArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const { jsPDF } = window.jspdf;
    let doc; let first=true;
    for (let p=1; p<=pdf.numPages; p++){
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: sc });
      const c = document.createElement('canvas'); const ctx = c.getContext('2d', { alpha:false });
      c.width = Math.ceil(viewport.width); c.height = Math.ceil(viewport.height);
      await page.render({canvasContext: ctx, viewport}).promise;
      const dataUrl = c.toDataURL('image/jpeg', q);
      const W = c.width * 72 / 96, H = c.height * 72 / 96;
      if (first){ doc = new jsPDF({ unit:'pt', format:[W,H] }); first=false; } else { doc.addPage([W,H]); }
      doc.addImage(dataUrl, 'JPEG', 0, 0, W, H);
    }
    const out = doc.output('blob');
    downloadBlob(out, 'compressed.pdf');
    log('Compress: 完了 compressed.pdf');
  }
  function orientCanvas(img, orientation){
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let w = img.naturalWidth, h = img.naturalHeight;
    if([5,6,7,8].includes(orientation)){ canvas.width = h; canvas.height = w; }
    else { canvas.width = w; canvas.height = h; }
    switch(orientation){
      case 2: ctx.translate(w,0); ctx.scale(-1,1); break;
      case 3: ctx.translate(w,h); ctx.rotate(Math.PI); break;
      case 4: ctx.translate(0,h); ctx.scale(1,-1); break;
      case 5: ctx.rotate(0.5*Math.PI); ctx.scale(1,-1); break;
      case 6: ctx.rotate(0.5*Math.PI); ctx.translate(0,-h); break;
      case 7: ctx.rotate(0.5*Math.PI); ctx.translate(w,-h); ctx.scale(-1,1); break;
      case 8: ctx.rotate(-0.5*Math.PI); ctx.translate(-w,0); break;
    }
    ctx.drawImage(img, 0, 0);
    return canvas;
  }
  async function doImg2Pdf(){
    const files = Array.from($('#imgFiles')?.files||[]);
    if (!files.length) return alert('画像を選択してください');
    const sel = $('#pageSize')?.value || 'fit';
    const marginMm = Number($('#marginMm')?.value || 10);
    const mm2pt = (mm)=> mm * 72 / 25.4;
    const a4p = [595.28, 841.89], a4l = [841.89, 595.28];
    const { jsPDF } = window.jspdf;
    let doc, first=true;
    for (const f of files){
      const url = URL.createObjectURL(f);
      const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
      let orientation = 1;
      try { if (window.exifr && exifr.orientation) orientation = await exifr.orientation(f) || 1; } catch {}
      const canvas = orientCanvas(img, orientation);
      const iw = canvas.width, ih = canvas.height;
      let pw, ph;
      if (sel==='a4p'){ [pw,ph] = a4p; } else if (sel==='a4l'){ [pw,ph]=a4l; } else { pw = Math.max(100, iw * 72 / 96); ph = Math.max(100, ih * 72 / 96); }
      const margin = mm2pt(marginMm), availW = pw - margin*2, availH = ph - margin*2;
      const r = Math.min(availW/iw, availH/ih); const w = iw*r, h = ih*r;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      if (first){ doc = new jsPDF({ unit:'pt', format:[pw,ph] }); first = false; } else { doc.addPage([pw,ph]); }
      doc.addImage(dataUrl, 'JPEG', margin+(availW-w)/2, margin+(availH-h)/2, w, h);
      URL.revokeObjectURL(url);
    }
    const out = doc.output('blob');
    downloadBlob(out, 'images.pdf');
    log('Images→PDF: 完了 images.pdf');
  }
  async function doPdf2Img(){
    const f = $('#p2iFile')?.files?.[0];
    if (!f) return alert('PDFを選択');
    const ranges = $('#p2iRanges')?.value || '';
    const type = $('#p2iType')?.value || 'image/png';
    const scale = Math.max(1, Math.min(3, parseFloat($('#p2iScale')?.value || '2')));
    const buf = await fileToArrayBuffer(f);
    const pdf = await pdfjsLib.getDocument({data:buf}).promise;
    const total = pdf.numPages;
    const picks = parseRanges(ranges, total);
    const pages = picks.length ? picks : Array.from({length:total}, (_,i)=>i+1);
    const zip = new JSZip();
    let i=1;
    for (const n of pages){
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({scale});
      const c = document.createElement('canvas'); c.width = viewport.width; c.height = viewport.height;
      await page.render({canvasContext: c.getContext('2d'), viewport}).promise;
      const blob = await new Promise(res=> c.toBlob(res, type, type==='image/jpeg'?0.92:undefined));
      zip.file(`page_${String(i).padStart(3,'0')}.` + (type==='image/png'?'png':'jpg'), await blob.arrayBuffer());
      i++; await new Promise(r=>setTimeout(r,20));
    }
    const out = await zip.generateAsync({type:'blob'});
    downloadBlob(out, 'pdf_images.zip');
    log('PDF→画像: ZIP保存');
  }

  function resetRangesDisplays(){
    const q = $('#quality'); const s = $('#scale');
    if (q && $('#qVal')) $('#qVal').textContent = Number(q.value||q.getAttribute('value')||0.7).toFixed(2);
    if (s && $('#sVal')) $('#sVal').textContent = Number(s.value||s.getAttribute('value')||0.8).toFixed(2);
  }
  function clearMerge(){ const el=$('#mergeFiles'); if(el) el.value=''; log('Merge: 入力クリア'); }
  function clearSplit(){ const a=$('#splitFile'); const b=$('#splitRanges'); if(a) a.value=''; if(b) b.value=''; log('Split: 入力クリア'); }
  function clearCompress(){ const a=$('#compressFile'); if(a) a.value=''; resetRangesDisplays(); log('Compress: 入力クリア'); }
  function clearImg(){ const a=$('#imgFiles'); if(a) a.value=''; log('Images→PDF: 入力クリア'); }
  function clearP2i(){ const a=$('#p2iFile'); const b=$('#p2iRanges'); if(a) a.value=''; if(b) b.value=''; log('PDF→画像: 入力クリア'); }
  function clearEdit(){ const a=$('#editFile'); if(a) a.value=''; const t=$('#thumbs'); if(t) t.innerHTML=''; log('Edit: 入力クリア'); }
  function clearWm(){
    const ids = ['wmFile','wmText','wmImage','metaTitle','metaAuthor'];
    ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const alpha=$('#wmAlpha'); if(alpha) alpha.value='0.12';
    const scale=$('#wmScale'); if(scale) scale.value='0.6';
    log('WM: 入力クリア');
  }
  function clearOcr(){ const a=$('#ocrFile'); if(a) a.value=''; const p=$('#ocrPages'); if(p) p.value='3'; log('OCR: 入力クリア'); }

  function clearGeneric(btn){
    const card = btn.closest('.card') || btn.closest('.body') || document;
    card.querySelectorAll('input[type="file"]').forEach(el=> el.value='');
    card.querySelectorAll('input[type="text"]').forEach(el=> el.value='');
    card.querySelectorAll('textarea').forEach(el=> el.value='');
    card.querySelectorAll('input[type="number"]').forEach(el=> {
      if (el.id==='ocrPages') el.value='3';
      else if (el.id==='wmAlpha') el.value='0.12';
      else if (el.id==='wmScale') el.value='0.6';
      else el.value='';
    });
    card.querySelectorAll('input[type="range"]').forEach(el=> {
      const def = el.getAttribute('value');
      if (def!=null) el.value = def;
    });
    const thumbs = card.querySelector('#thumbs'); if (thumbs) thumbs.innerHTML='';
    resetRangesDisplays();
  }

  document.addEventListener('click', async (e)=>{
    const btn = e.target.closest && e.target.closest('button, [role="button"]');
    if (!btn) return;
    const id = btn.id || '';
    const map = {
      mergeBtn: doMerge, splitBtn: doSplit, compressBtn: doCompress, img2pdfBtn: doImg2Pdf, p2iBtn: doPdf2Img,
      clearMerge: clearMerge, clearSplit: clearSplit, clearCompress: clearCompress, clearImg: clearImg, clearP2i: clearP2i,
      clearEdit: clearEdit, clearWm: clearWm, clearOcr: clearOcr
    };
    const fn = map[id];
    if (fn){
      e.preventDefault(); e.stopPropagation();
      try{ await fn(); }catch(err){ console.error(err); alert("処理中にエラー: " + (err && err.message || err)); }
    } else if (id.startsWith('clear')){
      e.preventDefault(); e.stopPropagation();
      clearGeneric(btn);
      log('Clear: 入力クリア（汎用）');
    }
  }, true);

  log("hotfix v2 loaded");
})();