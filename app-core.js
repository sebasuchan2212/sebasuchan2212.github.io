/* app-core.js — delegated binding, single source of truth (2025-09-10.2) */
/* ========= Helpers ========= */
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const log = (m)=>{ const el=$('#log'); if(el){ el.textContent += '\n'+m; el.scrollTop = el.scrollHeight; } };
function downloadBlob(blob, filename){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function fileToArrayBuffer(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsArrayBuffer(file); }); }
function parseRanges(input, total){
  if(!input) return [];
  const out = [];
  for (const raw of input.split(',').map(s=>s.trim()).filter(Boolean)){
    if (/^\d+$/.test(raw)){ const n=+raw; if(n>=1 && n<=total) out.push([n,n]); }
    else if (/^(\d+)-(\d+)$/.test(raw)){ let [_,a,b]=raw.match(/(\d+)-(\d+)/); a=+a; b=+b; if(a>b)[a,b]=[b,a]; a=Math.max(1,a); b=Math.min(total,b); if(a<=b) out.push([a,b]); }
    else if (/^(\d+)-$/.test(raw)){ let [_,a]=raw.match(/(\d+)-/); a=+a; if(a<=total) out.push([Math.max(1,a), total]); }
  }
  const set = new Set(); out.forEach(([a,b])=>{ for(let i=a;i<=b;i++) set.add(i); });
  return Array.from(set).sort((a,b)=>a-b);
}
function safe(fn){ return async (e)=>{ try{ await fn(e); }catch(err){ console.error(err); alert('エラー: '+(err?.message||err)); } } }

/* ========= Globals ========= */
const { jsPDF } = window.jspdf || {};
const editState = { pdf:null, bytes:null, pages:[], file:null }; // Page Editor
let TesseractLib = null;

/* ========= Features ========= */
// Merge
const doMerge = safe(async ()=>{
  const input = $('#mergeFiles'); if(!input){ alert('UIが見つかりません'); return; }
  const files = Array.from(input.files||[]);
  if(!files.length){ alert('PDFを選択してください'); return; }
  log(`Merge: ${files.length} ファイル処理開始`);
  const outPdf = await PDFLib.PDFDocument.create();
  for(const f of files){
    try{
      const buf = await fileToArrayBuffer(f);
      const src = await PDFLib.PDFDocument.load(buf);
      const pages = await outPdf.copyPages(src, src.getPageIndices());
      pages.forEach(p=>outPdf.addPage(p));
    }catch(e){ console.error(e); alert('読み込み失敗: '+f.name); }
  }
  const bytes = await outPdf.save({ updateFieldAppearances: true });
  downloadBlob(new Blob([bytes], {type:'application/pdf'}), 'merged.pdf');
  log('Merge: 完了 merged.pdf を保存');
});
const clearMerge = ()=>{ const el=$('#mergeFiles'); if(el) el.value=''; log('Merge: 入力クリア'); };

// Split
const doSplit = safe(async ()=>{
  const file = $('#splitFile')?.files?.[0];
  if(!file){ alert('PDFを選択してください'); return; }
  const buf = await fileToArrayBuffer(file);
  const src = await PDFLib.PDFDocument.load(buf);
  const total = src.getPageCount();
  const pages = parseRanges($('#splitRanges')?.value||'', total);
  if(!pages.length){ alert('正しいページ範囲を入力してください'); return; }
  let idx=1;
  for (const n of pages){
    const out = await PDFLib.PDFDocument.create();
    const [page] = await out.copyPages(src, [n-1]);
    out.addPage(page);
    const bytes = await out.save();
    downloadBlob(new Blob([bytes],{type:'application/pdf'}), `page_${idx++}_${n}.pdf`);
    await new Promise(r=>setTimeout(r,60));
  }
  log(`Split: ${pages.join(',')} を個別保存`);
});
const clearSplit = ()=>{ const a=$('#splitFile'); const b=$('#splitRanges'); if(a) a.value=''; if(b) b.value=''; log('Split: 入力クリア'); };

// Compress
const updateQ = (e)=>{ const v = Number(e.target.value||0).toFixed(2); const q=$('#qVal'); if(q) q.textContent=v; };
const updateS = (e)=>{ const v = Number(e.target.value||0).toFixed(2); const s=$('#sVal'); if(s) s.textContent=v; };
const doCompress = safe(async ()=>{
  const file = $('#compressFile')?.files?.[0];
  if(!file){ alert('PDFを選択してください'); return; }
  const q = Number($('#quality')?.value||'0.7');
  const sc = Number($('#scale')?.value||'0.8');
  const buf = await fileToArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  log(`Compress: ${pdf.numPages}ページ 読み込み`);
  let doc; let first = true;
  for(let p=1; p<=pdf.numPages; p++){
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: sc });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha:false });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({canvasContext: ctx, viewport}).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', q);
    const pageWpt = canvas.width * 72 / 96;
    const pageHpt = canvas.height * 72 / 96;
    if(first){ doc = new jsPDF({ unit:'pt', format:[pageWpt,pageHpt] }); first=false; }
    else { doc.addPage([pageWpt,pageHpt]); }
    doc.addImage(dataUrl, 'JPEG', 0, 0, pageWpt, pageHpt);
  }
  const out = doc.output('blob');
  downloadBlob(out, 'compressed.pdf');
  log('Compress: 完了 compressed.pdf を保存');
});
const clearCompress = ()=>{ const el=$('#compressFile'); if(el) el.value=''; log('Compress: 入力クリア'); };

// Images -> PDF with EXIF
function drawImageWithOrientation(img, orientation=1){
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const w = img.naturalWidth, h = img.naturalHeight;
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
const doImg2Pdf = safe(async ()=>{
  const files = Array.from($('#imgFiles')?.files||[]);
  if(!files.length){ alert('画像を選択してください'); return; }
  const sizeSel = $('#pageSize')?.value||'fit'; const marginMm = Number($('#marginMm')?.value||'10');
  const mm2pt = (mm)=> mm * 72 / 25.4;
  const a4p = [595.28, 841.89], a4l = [841.89, 595.28];
  let doc; let first=true;
  for(const f of files){
    const url = URL.createObjectURL(f);
    const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
    let orientation = 1; try{ orientation = await exifr.orientation(f) || 1; }catch{}
    const canvas = drawImageWithOrientation(img, orientation);
    const iw = canvas.width, ih = canvas.height;
    let pw, ph;
    if(sizeSel==='a4p'){ [pw,ph]=a4p; } else if(sizeSel==='a4l'){ [pw,ph]=a4l; }
    else { pw = Math.max(100, iw * 72 / 96); ph = Math.max(100, ih * 72 / 96); }
    const margin = mm2pt(marginMm), availW = pw - margin*2, availH = ph - margin*2;
    const r = Math.min(availW/iw, availH/ih); const w = iw*r, h = ih*r;
    if(first){ doc = new jsPDF({ unit:'pt', format:[pw,ph] }); first=false; } else { doc.addPage([pw,ph]); }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(dataUrl, 'JPEG', margin+(availW-w)/2, margin+(availH-h)/2, w, h);
    URL.revokeObjectURL(url);
  }
  const out = doc.output('blob');
  downloadBlob(out, 'images.pdf');
  log('Images→PDF: 完了 images.pdf を保存');
});
const clearImg = ()=>{ const el=$('#imgFiles'); if(el) el.value=''; log('Images→PDF: 入力クリア'); };

// Page Editor
async function renderThumbs(){
  const wrap = $('#thumbs'); if(!wrap || !editState.pdf){ return; }
  wrap.innerHTML='';
  for (const pageInfo of editState.pages){
    const p = await editState.pdf.getPage(pageInfo.idx);
    const viewport = p.getViewport({scale:0.3});
    const c = document.createElement('canvas'); c.width=viewport.width; c.height=viewport.height;
    await p.render({canvasContext:c.getContext('2d'), viewport}).promise;
    const item = document.createElement('div');
    item.className = 'thumb'; item.draggable = true; item.dataset.page = String(pageInfo.idx);
    const cv = document.createElement('div'); cv.className='canvas'; cv.appendChild(c);
    const ctr = document.createElement('div'); ctr.className='btns';
    ctr.innerHTML = `
      <button class="btn" data-act="rot" data-page="${pageInfo.idx}">↻ 回転</button>
      <button class="btn danger" data-act="hide" data-page="${pageInfo.idx}">${pageInfo.hidden?'表示':'非表示'}</button>
      <span class="tag">#${pageInfo.idx}</span>`;
    if(pageInfo.hidden) item.classList.add('hiddenPage');
    item.appendChild(cv); item.appendChild(ctr); wrap.appendChild(item);
  }
}
const onEditFileChange = safe(async (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  editState.file = f;
  editState.bytes = await fileToArrayBuffer(f);
  editState.pdf = await pdfjsLib.getDocument({data:editState.bytes}).promise;
  editState.pages = Array.from({length:editState.pdf.numPages}, (_,i)=>({idx:i+1, rot:0, hidden:false}));
  await renderThumbs();
  log(`Edit: ${editState.pages.length}ページを読み込みました`);
});
const doApplyEdit = safe(async ()=>{
  if(!editState.bytes){ alert('PDFを選択してください'); return; }
  const src = await PDFLib.PDFDocument.load(editState.bytes);
  const out = await PDFLib.PDFDocument.create();
  const { degrees } = PDFLib;
  const kept = editState.pages.filter(p=>!p.hidden);
  if(!kept.length){ alert('1ページ以上残してください'); return; }
  for (const p of kept){
    const [copied] = await out.copyPages(src, [p.idx-1]);
    if(p.rot){ copied.setRotation(degrees(p.rot)); }
    out.addPage(copied);
  }
  const bytes = await out.save();
  downloadBlob(new Blob([bytes],{type:'application/pdf'}), 'edited.pdf');
  log('Edit: 変更を適用して edited.pdf を保存');
});
const clearEdit = ()=>{ const a=$('#editFile'); const b=$('#thumbs'); if(a) a.value=''; if(b) b.innerHTML=''; Object.assign(editState,{pdf:null,bytes:null,pages:[],file:null}); };

// Watermark & Metadata
async function textToPngBytes(text, scale=2){
  const pad = 20*scale; const fs = 28*scale;
  const cv = document.createElement('canvas'); const ctx = cv.getContext('2d');
  ctx.font = `${fs}px "Noto Sans JP", system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad*2, h = fs + pad*2;
  cv.width=w; cv.height=h;
  ctx.font = `${fs}px "Noto Sans JP", system-ui, sans-serif`; ctx.fillStyle="rgba(255,255,255,1)";
  ctx.textBaseline="top"; ctx.shadowColor="rgba(0,0,0,.35)"; ctx.shadowBlur=4*scale;
  ctx.fillText(text, pad, pad);
  const blob = await new Promise(res=> cv.toBlob(res,'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}
const doApplyWm = safe(async ()=>{
  const f = $('#wmFile')?.files?.[0];
  if(!f){ alert('PDFを選択してください'); return; }
  const buf = await fileToArrayBuffer(f);
  const src = await PDFLib.PDFDocument.load(buf);
  const out = await PDFLib.PDFDocument.create();
  let wmBytes=null;
  const imgFile = $('#wmImage')?.files?.[0];
  const txt = ($('#wmText')?.value||'').trim();
  if (imgFile){ wmBytes = new Uint8Array(await imgFile.arrayBuffer()); }
  else if (txt){ wmBytes = await textToPngBytes(txt, 2); }
  const alpha = Math.max(0.05, Math.min(0.5, parseFloat($('#wmAlpha')?.value)||0.12));
  const scale = Math.max(0.2, Math.min(1, parseFloat($('#wmScale')?.value)||0.6));
  const title = ($('#metaTitle')?.value||'').trim(); const author = ($('#metaAuthor')?.value||'').trim();
  let wmEmbed=null;
  if (wmBytes){ wmEmbed = await out.embedPng(wmBytes); }
  const pages = await out.copyPages(src, src.getPageIndices());
  for (const p of pages){ out.addPage(p); }
  if (wmEmbed){
    const { degrees } = PDFLib;
    out.getPages().forEach(page=>{
      const { width, height } = page.getSize();
      const w = wmEmbed.width * scale, h = wmEmbed.height * scale;
      page.drawImage(wmEmbed, { x: (width - w)/2, y: (height - h)/2, width: w, height: h, opacity: alpha, rotate: degrees(30) });
    });
  }
  if (title) out.setTitle(title);
  if (author) out.setAuthor(author);
  const bytes = await out.save();
  downloadBlob(new Blob([bytes],{type:'application/pdf'}), 'watermarked.pdf');
  log('WM: 適用完了 watermarked.pdf を保存');
});
const clearWm = ()=>{ ['wmFile','wmText','wmImage','wmAlpha','wmScale','metaTitle','metaAuthor'].forEach(id=>{ const el=$('#'+id); if(!el) return; if(el.type==='text' || el.type==='file' || el.tagName==='INPUT') el.value = (id==='wmAlpha'?'0.12': id==='wmScale'?'0.6':''); }); };

// PDF -> Image
const doPdf2Img = safe(async ()=>{
  const f = $('#p2iFile')?.files?.[0]; if(!f){ alert('PDFを選択'); return; }
  const buf = await fileToArrayBuffer(f);
  const pdf = await pdfjsLib.getDocument({data:buf}).promise;
  const total = pdf.numPages;
  const picks = parseRanges($('#p2iRanges')?.value||'', total);
  const pages = picks.length ? picks : Array.from({length:total}, (_,i)=>i+1);
  const type = $('#p2iType')?.value||'image/png';
  const scale = Math.max(1, Math.min(3, parseFloat($('#p2iScale')?.value)||2));
  const zip = new JSZip();
  let i=1;
  for (const n of pages){
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({scale});
    const c = document.createElement('canvas'); c.width=viewport.width; c.height=viewport.height;
    await page.render({canvasContext:c.getContext('2d'), viewport}).promise;
    const blob = await new Promise(res=> c.toBlob(res, type, type==='image/jpeg'?0.92:undefined));
    zip.file(`page_${String(i).padStart(3,'0')}.` + (type==='image/png'?'png':'jpg'), await blob.arrayBuffer());
    i++; await new Promise(r=>setTimeout(r,20));
  }
  const out = await zip.generateAsync({type:'blob'});
  downloadBlob(out, 'pdf_images.zip');
  log('PDF→画像: ZIP保存');
});
const clearP2i = ()=>{ const a=$('#p2iFile'); const b=$('#p2iRanges'); if(a) a.value=''; if(b) b.value=''; };

// OCR
async function ensureTesseract(){
  if (TesseractLib) return TesseractLib;
  await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
  TesseractLib = window.Tesseract;
  return TesseractLib;
}
const doOcr = safe(async ()=>{
  const f = $('#ocrFile')?.files?.[0]; if(!f){ alert('PDFを選択'); return; }
  await ensureTesseract();
  const lang = $('#ocrLang')?.value||'jpn';
  const maxN = Math.max(1, parseInt($('#ocrPages')?.value||'1',10));
  const buf = await fileToArrayBuffer(f);
  const pdf = await pdfjsLib.getDocument({data:buf}).promise;
  const total = pdf.numPages, N = Math.min(maxN, total);
  log(`OCR: 最初の${N}ページを ${lang} で解析`);
  let text = '';
  for (let i=1;i<=N;i++){
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({scale:2});
    const c=document.createElement('canvas'); c.width=viewport.width; c.height=viewport.height;
    await page.render({canvasContext:c.getContext('2d'), viewport}).promise;
    const dataUrl = c.toDataURL('image/png');
    const { data } = await TesseractLib.recognize(dataUrl, lang, { logger:m=>{} });
    text += (text? '\n\n' : '') + (data.text||'').trim();
  }
  const blob = new Blob([text], {type:'text/plain; charset=utf-8'});
  downloadBlob(blob, 'ocr.txt');
  log('OCR: 完了 ocr.txt を保存');
});
const clearOcr = ()=>{ const a=$('#ocrFile'); const b=$('#ocrPages'); if(a) a.value=''; if(b) b.value='3'; };

// Samples
function makeSample(title, color){
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const pages = 2;
  for(let p=1;p<=pages;p++){ if(p>1) doc.addPage('a4','p'); doc.setFillColor(color[0],color[1],color[2]); doc.rect(0,0,595.28,841.89,'F'); doc.setTextColor(255,255,255); doc.setFontSize(24); doc.text(`${title} - Page ${p}`, 40, 60); doc.setFontSize(12); doc.text('これはテスト用PDFです。結合/分割/編集の確認に。', 40, 90); }
  return doc.output('blob');
}
const genA = ()=>{ const b=makeSample('Sample A',[46,134,222]); downloadBlob(b,'sampleA.pdf'); log('サンプルA生成'); };
const genB = ()=>{ const b=makeSample('Sample B',[245,130,32]); downloadBlob(b,'sampleB.pdf'); log('サンプルB生成'); };

/* ========= Delegated Binding ========= */
document.addEventListener('click', (e)=>{
  const t = e.target;
  if (!(t instanceof Element)) return;
  const id = t.id;
  const act = t.getAttribute('data-act');
  switch(id){
    case 'mergeBtn': e.preventDefault(); doMerge(e); return;
    case 'clearMerge': e.preventDefault(); clearMerge(); return;
    case 'splitBtn': e.preventDefault(); doSplit(e); return;
    case 'clearSplit': e.preventDefault(); clearSplit(); return;
    case 'compressBtn': e.preventDefault(); doCompress(e); return;
    case 'clearCompress': e.preventDefault(); clearCompress(); return;
    case 'img2pdfBtn': e.preventDefault(); doImg2Pdf(e); return;
    case 'clearImg': e.preventDefault(); clearImg(); return;
    case 'applyEditBtn': e.preventDefault(); doApplyEdit(e); return;
    case 'clearEdit': e.preventDefault(); clearEdit(); return;
    case 'applyWmBtn': e.preventDefault(); doApplyWm(e); return;
    case 'clearWm': e.preventDefault(); clearWm(); return;
    case 'p2iBtn': e.preventDefault(); doPdf2Img(e); return;
    case 'clearP2i': e.preventDefault(); clearP2i(); return;
    case 'ocrBtn': e.preventDefault(); doOcr(e); return;
    case 'clearOcr': e.preventDefault(); clearOcr(); return;
    case 'genA': e.preventDefault(); genA(); return;
    case 'genB': e.preventDefault(); genB(); return;
  }
  if (act === 'rot' || act === 'hide'){
    const pageNo = Number(t.getAttribute('data-page')||'0');
    const item = editState.pages.find(p=>p.idx===pageNo);
    if (!item) return;
    if (act==='rot'){ item.rot = (item.rot+90)%360; log(`Page ${item.idx}: rot=${item.rot}`); }
    if (act==='hide'){ item.hidden = !item.hidden; }
    renderThumbs();
  }
});
document.addEventListener('input', (e)=>{
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.id === 'quality') updateQ(e);
  if (t.id === 'scale') updateS(e);
});
document.addEventListener('change', (e)=>{
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.id === 'editFile') onEditFileChange(e);
});

log('Core loaded (delegated binding)');
