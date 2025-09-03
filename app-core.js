/* app-core.js */
(function(){
  if (window.__APP_CORE__) return; window.__APP_CORE__ = true;
  const $ = (s)=>document.querySelector(s);
  const log = (m)=>{ const el=$('#log'); if(el){ el.textContent += "\n" + m; el.scrollTop = el.scrollHeight; } };
  function fileToArrayBuffer(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsArrayBuffer(file); }); }
  function downloadBlob(blob, filename){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  function parseRanges(input, total){
    if(!input) return []; const out=[];
    for (const raw of input.split(',').map(s=>s.trim()).filter(Boolean)){
      if (/^\d+$/.test(raw)){ const n=+raw; if(n>=1&&n<=total) out.push([n,n]); }
      else if (/^(\d+)-(\d+)$/.test(raw)){ let m=raw.match(/(\d+)-(\d+)/); let a=+m[1],b=+m[2]; if(a>b)[a,b]=[b,a]; a=Math.max(1,a); b=Math.min(total,b); if(a<=b) out.push([a,b]); }
      else if (/^(\d+)-$/.test(raw)){ let m=raw.match(/(\d+)-/); let a=+m[1]; if(a<=total) out.push([Math.max(1,a), total]); }
    }
    const set = new Set(); out.forEach(([a,b])=>{ for(let i=a;i<=b;i++) set.add(i); }); return Array.from(set).sort((a,b)=>a-b);
  }
  function setupMerge(){ const b=$('#mergeBtn'); if(!b) return; b.addEventListener('click', async ()=>{
    const files = Array.from($('#mergeFiles')?.files||[]); if(!files.length){ alert('PDFを選択'); return; }
    const outPdf = await PDFLib.PDFDocument.create();
    for(const f of files){ try{ const buf=await fileToArrayBuffer(f); const src=await PDFLib.PDFDocument.load(buf); const pages=await outPdf.copyPages(src, src.getPageIndices()); pages.forEach(p=>outPdf.addPage(p)); }catch(e){ alert('読み込み失敗: '+f.name); } }
    const bytes = await outPdf.save({ updateFieldAppearances:true }); downloadBlob(new Blob([bytes],{type:'application/pdf'}),'merged.pdf'); log('Merge: 完了');
  });}
  function setupSplit(){ const b=$('#splitBtn'); if(!b) return; b.addEventListener('click', async ()=>{
    const file=$('#splitFile')?.files?.[0]; if(!file){ alert('PDFを選択'); return; } const buf=await fileToArrayBuffer(file);
    const src=await PDFLib.PDFDocument.load(buf); const total=src.getPageCount(); const pages=parseRanges($('#splitRanges')?.value,total); if(!pages.length){ alert('正しい範囲を入力'); return; }
    let idx=1; for(const n of pages){ const out=await PDFLib.PDFDocument.create(); const [page]=await out.copyPages(src,[n-1]); out.addPage(page); const bytes=await out.save(); downloadBlob(new Blob([bytes],{type:'application/pdf'}),`page_${idx++}_${n}.pdf`); await new Promise(r=>setTimeout(r,40)); }
    log('Split: 完了');
  });}
  function setupCompress(){ const q=$('#quality'), s=$('#scale'); if(q) q.addEventListener('input', e=> $('#qVal')&&( $('#qVal').textContent=Number(e.target.value).toFixed(2))); if(s) s.addEventListener('input', e=> $('#sVal')&&( $('#sVal').textContent=Number(e.target.value).toFixed(2)));
    const b=$('#compressBtn'); if(!b) return; b.addEventListener('click', async ()=>{
      const file=$('#compressFile')?.files?.[0]; if(!file){ alert('PDFを選択'); return; }
      const qv=Number($('#quality')?.value||0.7), sc=Number($('#scale')?.value||0.8); const buf=await fileToArrayBuffer(file); const pdf=await pdfjsLib.getDocument({data:buf}).promise;
      const { jsPDF }=window.jspdf; let doc,first=true; for(let p=1;p<=pdf.numPages;p++){ const page=await pdf.getPage(p); const viewport=page.getViewport({scale:sc}); const c=document.createElement('canvas'); const ctx=c.getContext('2d',{alpha:false}); c.width=Math.ceil(viewport.width); c.height=Math.ceil(viewport.height); await page.render({canvasContext:ctx,viewport}).promise;
        const dataUrl=c.toDataURL('image/jpeg',qv); const W=c.width*72/96, H=c.height*72/96; if(first){ doc=new jsPDF({unit:'pt',format:[W,H]}); first=false; } else { doc.addPage([W,H]); } doc.addImage(dataUrl,'JPEG',0,0,W,H); }
      const out=doc.output('blob'); downloadBlob(out,'compressed.pdf'); log('Compress: 完了');
    });}
  function orientCanvas(img, orientation){ const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d'); const w=img.naturalWidth,h=img.naturalHeight; if([5,6,7,8].includes(orientation)){ canvas.width=h; canvas.height=w; } else { canvas.width=w; canvas.height=h; }
    switch(orientation){ case 2: ctx.translate(w,0); ctx.scale(-1,1); break; case 3: ctx.translate(w,h); ctx.rotate(Math.PI); break; case 4: ctx.translate(0,h); ctx.scale(1,-1); break; case 5: ctx.rotate(0.5*Math.PI); ctx.scale(1,-1); break; case 6: ctx.rotate(0.5*Math.PI); ctx.translate(0,-h); break; case 7: ctx.rotate(0.5*Math.PI); ctx.translate(w,-h); ctx.scale(-1,1); break; case 8: ctx.rotate(-0.5*Math.PI); ctx.translate(-w,0); break; } ctx.drawImage(img,0,0); return canvas; }
  function setupImg2Pdf(){ const b=$('#img2pdfBtn'); if(!b) return; b.addEventListener('click', async ()=>{
    const files=Array.from($('#imgFiles')?.files||[]); if(!files.length){ alert('画像を選択'); return; } const sel=$('#pageSize')?.value||'fit'; const marginMm=Number($('#marginMm')?.value||10);
    const mm2pt=(mm)=> mm*72/25.4, a4p=[595.28,841.89], a4l=[841.89,595.28]; const { jsPDF }=window.jspdf; let doc,first=true;
    for(const f of files){ const url=URL.createObjectURL(f); const img=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
      let orientation=1; try{ if(window.exifr && exifr.orientation) orientation=await exifr.orientation(f)||1; }catch{}
      const can=orientCanvas(img,orientation); const iw=can.width, ih=can.height; let pw,ph; if(sel==='a4p'){[pw,ph]=a4p;} else if(sel==='a4l'){[pw,ph]=a4l;} else { pw=Math.max(100, iw*72/96); ph=Math.max(100, ih*72/96); }
      const margin=mm2pt(marginMm), availW=pw-margin*2, availH=ph-margin*2; const r=Math.min(availW/iw, availH/ih); const w=iw*r, h=ih*r; const dataUrl=can.toDataURL('image/jpeg',0.92);
      if(first){ doc=new jsPDF({unit:'pt',format:[pw,ph]}); first=false; } else { doc.addPage([pw,ph]); } doc.addImage(dataUrl,'JPEG', margin+(availW-w)/2, margin+(availH-h)/2, w, h);
      URL.revokeObjectURL(url);
    } const out=doc.output('blob'); downloadBlob(out,'images.pdf'); log('Images→PDF: 完了'); });}
  function setupPdf2Img(){ const b=$('#p2iBtn'); if(!b) return; b.addEventListener('click', async ()=>{
    const f=$('#p2iFile')?.files?.[0]; if(!f){ alert('PDFを選択'); return; } const ranges=$('#p2iRanges')?.value||''; const type=$('#p2iType')?.value||'image/png'; const scale=Math.max(1, Math.min(3, parseFloat($('#p2iScale')?.value||'2')));
    const buf=await fileToArrayBuffer(f); const pdf=await pdfjsLib.getDocument({data:buf}).promise; const total=pdf.numPages; const picks=parseRanges(ranges,total); const pages=picks.length?picks:Array.from({length:total},(_,i)=>i+1);
    const zip=new JSZip(); let i=1; for(const n of pages){ const page=await pdf.getPage(n); const viewport=page.getViewport({scale}); const c=document.createElement('canvas'); c.width=viewport.width; c.height=viewport.height; await page.render({canvasContext:c.getContext('2d'),viewport}).promise; const blob=await new Promise(res=> c.toBlob(res,type, type==='image/jpeg'?0.92:undefined)); zip.file(`page_${String(i).padStart(3,'0')}.`+(type==='image/png'?'png':'jpg'), await blob.arrayBuffer()); i++; await new Promise(r=>setTimeout(r,20)); }
    const out=await zip.generateAsync({type:'blob'}); downloadBlob(out,'pdf_images.zip'); log('PDF→画像: 完了'); });}
  const editState={ pdf:null, bytes:null, pages:[], file:null };
  function setupEditor(){ const input=$('#editFile'); if(!input) return; input.addEventListener('change', async (e)=>{ const f=e.target.files[0]; if(!f) return; editState.file=f; editState.bytes=await fileToArrayBuffer(f); editState.pdf=await pdfjsLib.getDocument({data:editState.bytes}).promise; editState.pages=Array.from({length:editState.pdf.numPages},(_,i)=>({idx:i+1, rot:0, hidden:false})); await renderThumbs(); log(`Edit: ${editState.pages.length}p`); });
    $('#applyEditBtn')?.addEventListener('click', async ()=>{ if(!editState.bytes){ alert('PDFを選択'); return; } const src=await PDFLib.PDFDocument.load(editState.bytes); const out=await PDFLib.PDFDocument.create(); const { degrees }=PDFLib; const kept=editState.pages.filter(p=>!p.hidden); if(!kept.length){ alert('1ページ以上'); return; } for(const p of kept){ const [copied]=await out.copyPages(src,[p.idx-1]); if(p.rot){ copied.setRotation(degrees(p.rot)); } out.addPage(copied); } const bytes=await out.save(); downloadBlob(new Blob([bytes],{type:'application/pdf'}),'edited.pdf'); log('Edit: 保存'); });
    $('#clearEdit')?.addEventListener('click', ()=>{ input.value=''; const t=$('#thumbs'); if(t) t.innerHTML=''; Object.assign(editState,{pdf:null,bytes:null,pages:[],file:null}); });
  }
  async function renderThumbs(){ const wrap=$('#thumbs'); if(!wrap) return; wrap.innerHTML=''; for(const pageInfo of editState.pages){ const p=await editState.pdf.getPage(pageInfo.idx); const viewport=p.getViewport({scale:0.3}); const c=document.createElement('canvas'); c.width=viewport.width; c.height=viewport.height; await p.render({canvasContext:c.getContext('2d'),viewport}).promise;
      const item=document.createElement('div'); item.className='thumb'; item.draggable=true; item.dataset.page=String(pageInfo.idx); const cv=document.createElement('div'); cv.className='canvas'; cv.appendChild(c); const ctr=document.createElement('div'); ctr.className='btns'; ctr.innerHTML=`<button class="btn" data-act="rot">↻</button><button class="btn danger" data-act="hide">${pageInfo.hidden?'表示':'非表示'}</button><span class="tag">#${pageInfo.idx}</span>`; if(pageInfo.hidden) item.classList.add('hiddenPage'); item.appendChild(cv); item.appendChild(ctr); wrap.appendChild(item);
      ctr.querySelector('[data-act="rot"]').onclick=()=>{ pageInfo.rot=(pageInfo.rot+90)%360; log('rot '+pageInfo.idx); };
      ctr.querySelector('[data-act="hide"]').onclick=(ev)=>{ pageInfo.hidden=!pageInfo.hidden; ev.target.textContent=pageInfo.hidden?'表示':'非表示'; item.classList.toggle('hiddenPage', pageInfo.hidden); };
      item.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', pageInfo.idx); });
      item.addEventListener('dragover', e=>{ e.preventDefault(); item.classList.add('dragover'); });
      item.addEventListener('dragleave', ()=> item.classList.remove('dragover'));
      item.addEventListener('drop', e=>{ e.preventDefault(); item.classList.remove('dragover'); const from=+e.dataTransfer.getData('text/plain'); const to=pageInfo.idx; const arr=editState.pages; const a=arr.findIndex(x=>x.idx===from), b=arr.findIndex(x=>x.idx===to); const [moved]=arr.splice(a,1); arr.splice(b,0,moved); arr.forEach((x,i)=> x.idx=i+1); renderThumbs(); });
  }}
  let TesseractLib=null; async function ensureTesseract(){ if(TesseractLib) return TesseractLib; await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); TesseractLib=window.Tesseract; return TesseractLib; }
  function setupOCR(){ const b=$('#ocrBtn'); if(!b) return; b.addEventListener('click', async ()=>{ const f=$('#ocrFile')?.files?.[0]; if(!f){ alert('PDFを選択'); return; } await ensureTesseract(); const lang=$('#ocrLang')?.value||'eng'; const maxN=Math.max(1, parseInt($('#ocrPages')?.value||'1',10)); const buf=await fileToArrayBuffer(f); const pdf=await pdfjsLib.getDocument({data:buf}).promise; const total=pdf.numPages, N=Math.min(maxN,total); let text=''; for(let i=1;i<=N;i++){ const page=await pdf.getPage(i); const viewport=page.getViewport({scale:2}); const c=document.createElement('canvas'); c.width=viewport.width; c.height=viewport.height; await page.render({canvasContext:c.getContext('2d'),viewport}).promise; const dataUrl=c.toDataURL('image/png'); const { data }=await TesseractLib.recognize(dataUrl, lang, {logger:m=>{}}); text += (text?'\n\n':'') + (data.text||'').trim(); } downloadBlob(new Blob([text],{type:'text/plain; charset=utf-8'}), 'ocr.txt'); log('OCR: 完了'); }); }
  function setupSamples(){ const { jsPDF }=window.jspdf; function makeSample(title,color){ const doc=new jsPDF({unit:'pt',format:'a4'}); for(let p=1;p<=2;p++){ if(p>1) doc.addPage('a4','p'); doc.setFillColor(color[0],color[1],color[2]); doc.rect(0,0,595.28,841.89,'F'); doc.setTextColor(255,255,255); doc.setFontSize(24); doc.text(`${title} - Page ${p}`, 40, 60); doc.setFontSize(12); doc.text('Test PDF for merge/split/edit.', 40, 90);} return doc.output('blob'); } document.getElementById('genA')?.addEventListener('click', ()=> downloadBlob(makeSample('Sample A',[46,134,222]), 'sampleA.pdf')); document.getElementById('genB')?.addEventListener('click', ()=> downloadBlob(makeSample('Sample B',[245,130,32]), 'sampleB.pdf')); }
  window.addEventListener('DOMContentLoaded', ()=>{ try{ setupMerge(); setupSplit(); setupCompress(); setupImg2Pdf(); setupPdf2Img(); setupEditor(); setupOCR(); setupSamples(); if('serviceWorker' in navigator){ navigator.serviceWorker.register('/service-worker.js').catch(()=>{}); } }catch(e){ console.error(e); } });
})();