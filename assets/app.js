
// ================= Utilities & Core =================
class Logger {
  constructor(el){ this.el = el; }
  write(msg){ if(!this.el) return; this.el.textContent += "\n"+msg; this.el.scrollTop = this.el.scrollHeight; }
  info(m){ this.write("ℹ️ " + m); }
  ok(m){ this.write("✅ " + m); }
  warn(m){ this.write("⚠️ " + m); }
  err(m){ this.write("❌ " + m); }
}

class Helper {
  static async fileToArrayBuffer(file){
    return await file.arrayBuffer();
  }
  static async saveFile(data, filename, mime='application/octet-stream'){
    try{
      if ('showSaveFilePicker' in window){
        const handle = await window.showSaveFilePicker({ suggestedName: filename });
        const w = await handle.createWritable();
        const blob = data instanceof Blob ? data : new Blob([data], {type:mime});
        await w.write(blob); await w.close(); return;
      }
    }catch(e){}
    const blob = data instanceof Blob ? data : new Blob([data], {type:mime});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
  }
  static parseRanges(input, total){
    if(!input) return [];
    const out=[];
    for (const raw of input.split(',').map(s=>s.trim()).filter(Boolean)){
      if (/^\d+$/.test(raw)){ const n=+raw; if(n>=1 && n<=total) out.push([n,n]); }
      else if (/^(\d+)-(\d+)$/.test(raw)){ let [_,a,b]=raw.match(/(\d+)-(\d+)/); a=+a; b=+b; if(a>b) [a,b]=[b,a]; a=Math.max(1,a); b=Math.min(total,b); if(a<=b) out.push([a,b]); }
      else if (/^(\d+)-$/.test(raw)){ let [_,a]=raw.match(/(\d+)-/); a=+a; if(a<=total) out.push([Math.max(1,a), total]); }
    }
    const set=new Set(); out.forEach(([a,b])=>{ for(let i=a;i<=b;i++) set.add(i); }); return Array.from(set).sort((a,b)=>a-b);
  }
  static async sha256(buf){ const d=await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(d)).map(b=>('0'+b.toString(16)).slice(-2)).join(''); }
  static async exifCanvas(imgBlob){
    let orientation=1; try{ orientation = await exifr.orientation(imgBlob) || 1; }catch{ orientation=1; }
    const url=URL.createObjectURL(imgBlob); const img=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
    const w=img.naturalWidth, h=img.naturalHeight; let cw=w, ch=h;
    if(orientation>=5 && orientation<=8){ cw=h; ch=w; }
    const cv=document.createElement('canvas'); cv.width=cw; cv.height=ch; const ctx=cv.getContext('2d');
    switch(orientation){
      case 2: ctx.translate(cw,0); ctx.scale(-1,1); break;
      case 3: ctx.translate(cw,ch); ctx.rotate(Math.PI); break;
      case 4: ctx.translate(0,ch); ctx.scale(1,-1); break;
      case 5: ctx.rotate(0.5*Math.PI); ctx.scale(1,-1); ctx.translate(0,-cw); break;
      case 6: ctx.rotate(0.5*Math.PI); ctx.translate(0,-cw); break;
      case 7: ctx.rotate(0.5*Math.PI); ctx.translate(0,-cw); ctx.scale(-1,1); break;
      case 8: ctx.rotate(-0.5*Math.PI); ctx.translate(-ch,0); break;
    }
    ctx.drawImage(img,0,0); URL.revokeObjectURL(url); return cv;
  }
  static toast(msg){ const el = document.getElementById('toast'); if(!el) return; el.textContent=msg; el.style.display='block'; setTimeout(()=> el.style.display='none', 3600); }
}

class ErrorBoundary {
  static async wrap(task, logger, context){
    try{
      await task();
    }catch(e){
      console.error(e);
      logger?.err(context + ': ' + (e.message||e));
      alert((context||'Error') + ': ' + (e.message||e));
    }
  }
}

class Settings {
  static get(key, def){ try{ return JSON.parse(localStorage.getItem('pdfneo:'+key)) ?? def; }catch{ return def; } }
  static set(key, val){ try{ localStorage.setItem('pdfneo:'+key, JSON.stringify(val)); }catch{} }
}

// ================= I18N =================
class I18N {
  constructor(){
    this.str = {
      ja: { title:"かんたんPDFツール Neo", headline:"かんたんPDFツール Neo 100%ブラウザ内処理 無料", btn_create:"作成", btn_clear:"クリア", btn_export:"書き出し", btn_apply:"適用して保存", btn_run:"実行", merge_h:"PDFを結合", split_h:"PDFを分割", ranges:"ページ範囲（例: 1-3,5,8-）", compress_h:"画像主体PDFの軽量化", jpeg_q:"JPEG品質 0.3–0.95", scale:"スケール 0.5–1.0", imgpdf_h:"画像 → PDF（EXIF自動回転）", images:"画像", page_size:"用紙サイズ", fit:"元画像", margins:"余白（mm）", editor_h:"ページ編集（並べ替え/削除/回転）", wm_h:"ウォーターマーク & メタデータ", type:"形式", language:"言語", pages:"処理ページ数", form_h:"フォーム入力 & フラット化", scan:"項目をスキャン", hand_h:"手書きサイン", draw:"キャンバスに描く", page:"ページ", position:"位置", width:"幅(pt)", opacity:"透過度", outline_h:"しおり分割 → ZIP", kw_h:"キーワード抽出", keyword:"キーワード", case:"大小区別", text_h:"埋め込みテキスト → TXT", seal_h:"暗号学的シール（ES256 QR・実験）", place:"ページ", qr_size:"QRサイズ", seal_note:"これはPAdES互換の電子署名ではありません。ブラウザで検証できる暗号学的シールです。", lang_suggest:"English also available." , scan_qr:"QR読み取り" },
      en: { title:"Simple PDF Tools Neo", headline:"Simple PDF Tools Neo — 100% In-browser · Free", btn_create:"Create", btn_clear:"Clear", btn_export:"Export", btn_apply:"Apply & Save", btn_run:"Run", merge_h:"Merge PDFs", split_h:"Split PDF", ranges:"Ranges (e.g. 1-3,5,8-)", compress_h:"Compress image-heavy PDF", jpeg_q:"JPEG quality 0.3–0.95", scale:"Scale 0.5–1.0", imgpdf_h:"Images → PDF (EXIF auto-rotation)", images:"Images", page_size:"Page size", fit:"Fit to image", margins:"Margins (mm)", editor_h:"Page editor (reorder/delete/rotate)", wm_h:"Watermark & metadata", type:"Type", language:"Language", pages:"Pages (first N)", form_h:"Form fill & flatten", scan:"Scan fields", hand_h:"Handwritten sign", draw:"Draw on canvas", page:"Page", position:"Position", width:"Width (pt)", opacity:"Opacity", outline_h:"Split by outline → ZIP", kw_h:"Extract by keyword", keyword:"Keyword", case:"Case sensitive", text_h:"Export embedded text → TXT", seal_h:"Cryptographic seal (ES256 QR — experimental)", place:"Page", qr_size:"QR size", seal_note:"This is not a PAdES digital signature; it's a cryptographic seal verifiable in the browser.", lang_suggest:"English is available.", scan_qr:"Scan QR" },
      es: { title:"Herramientas PDF Neo", headline:"Herramientas PDF Neo — 100% en el navegador · Gratis", btn_create:"Crear", btn_clear:"Limpiar", btn_export:"Exportar", btn_apply:"Aplicar y guardar", btn_run:"Ejecutar", merge_h:"Unir PDFs", split_h:"Dividir PDF", ranges:"Rangos (p.ej. 1-3,5,8-)", compress_h:"Comprimir PDF con imágenes", jpeg_q:"Calidad JPEG 0.3–0.95", scale:"Escala 0.5–1.0", imgpdf_h:"Imágenes → PDF (rotación EXIF)", images:"Imágenes", page_size:"Tamaño de página", fit:"Ajustar a la imagen", margins:"Márgenes (mm)", editor_h:"Editor de páginas (reordenar/eliminar/rotar)", wm_h:"Marca de agua y metadatos", type:"Tipo", language:"Idioma", pages:"Páginas (primeras N)", form_h:"Rellenar formularios y aplanar", scan:"Escanear campos", hand_h:"Firma manuscrita", draw:"Dibujar en lienzo", page:"Página", position:"Posición", width:"Ancho (pt)", opacity:"Opacidad", outline_h:"Dividir por índice → ZIP", kw_h:"Extraer por palabra", keyword:"Palabra clave", case:"Sensible a mayúsculas", text_h:"Exportar texto incrustado → TXT", seal_h:"Sello criptográfico (ES256 QR — experimental)", place:"Página", qr_size:"Tamaño QR", seal_note:"No es una firma PAdES; es un sello criptográfico verificable en el navegador.", lang_suggest:"English/Spanish available.", scan_qr:"Escanear QR" }
    };
  }
  apply(lang){
    const t = this.str[lang] || this.str.ja;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if (t[key]) el.innerText = t[key];
    });
    document.title = t.title;
  }
  auto(){
    const nav = (navigator.language||'ja').toLowerCase();
    if (nav.startsWith('en')) return 'en';
    if (nav.startsWith('es')) return 'es';
    return 'ja';
  }
}

// ================= Modules (OOP) =================
class MergeModule {
  constructor(log){ this.log=log; this.bind(); }
  bind(){
    document.getElementById('mergeBtn')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.run(), this.log, 'Merge'));
    document.getElementById('clearMerge')?.addEventListener('click', ()=>{ const i=document.getElementById('mergeFiles'); if(i) i.value=''; });
  }
  async run(){
    const files = Array.from(document.getElementById('mergeFiles').files||[]); if(!files.length) throw new Error('No PDFs');
    this.log.info('Merge '+files.length+' files');
    const outPdf = await PDFLib.PDFDocument.create();
    for(const f of files){
      try{
        const src = await PDFLib.PDFDocument.load(await Helper.fileToArrayBuffer(f));
        const pages = await outPdf.copyPages(src, src.getPageIndices());
        pages.forEach(p=>outPdf.addPage(p));
      }catch(e){ this.log.warn('Skip: '+f.name); }
    }
    const bytes = await outPdf.save({ updateFieldAppearances:true });
    await Helper.saveFile(bytes, 'merged.pdf', 'application/pdf');
    this.log.ok('Merged saved');
  }
}

class SplitModule {
  constructor(log){ this.log=log; this.bind(); }
  bind(){
    document.getElementById('splitBtn')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.run(), this.log, 'Split'));
    document.getElementById('clearSplit')?.addEventListener('click', ()=>{ const a=document.getElementById('splitFile'), b=document.getElementById('splitRanges'); if(a) a.value=''; if(b) b.value=''; });
  }
  async run(){
    const f=document.getElementById('splitFile').files[0]; if(!f) throw new Error('Select PDF');
    const buf=await Helper.fileToArrayBuffer(f); const src=await PDFLib.PDFDocument.load(buf); const total=src.getPageCount();
    const pages=Helper.parseRanges(document.getElementById('splitRanges').value, total); if(!pages.length) throw new Error('Enter ranges');
    let idx=1;
    for(const n of pages){
      const out=await PDFLib.PDFDocument.create(); const [page]=await out.copyPages(src,[n-1]); out.addPage(page);
      const bytes=await out.save(); const name=`page_${String(idx).padStart(3,'0')}_${n}.pdf`; await Helper.saveFile(bytes, name, 'application/pdf'); idx++;
    }
    this.log.ok('Split saved');
  }
}

class CompressModule {
  constructor(log){ this.log=log; this.bind(); }
  bind(){
    const q=document.getElementById('quality'), s=document.getElementById('scale');
    q?.addEventListener('input', e=> document.getElementById('qVal').innerText = Number(e.target.value).toFixed(2));
    s?.addEventListener('input', e=> document.getElementById('sVal').innerText = Number(e.target.value).toFixed(2));
    document.getElementById('compressBtn')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.run(), this.log, 'Compress'));
    document.getElementById('clearCompress')?.addEventListener('click', ()=>{ const i=document.getElementById('compressFile'); if(i) i.value=''; });
  }
  async run(){
    const file=document.getElementById('compressFile').files[0]; if(!file) throw new Error('Select PDF');
    const q=Number(document.getElementById('quality').value), sc=Number(document.getElementById('scale').value);
    const pdf=await pdfjsLib.getDocument({data:await Helper.fileToArrayBuffer(file)}).promise;
    const { jsPDF } = window.jspdf;
    let doc, first=true;
    for(let p=1; p<=pdf.numPages; p++){
      const page=await pdf.getPage(p); const viewport=page.getViewport({scale:sc}); const cv=document.createElement('canvas'); cv.width=Math.ceil(viewport.width); cv.height=Math.ceil(viewport.height);
      await page.render({canvasContext:cv.getContext('2d',{alpha:false}), viewport}).promise;
      const url=cv.toDataURL('image/jpeg', q); const w=cv.width*72/96, h=cv.height*72/96;
      if(first){ doc=new jsPDF({unit:'pt', format:[w,h]}); first=false; } else { doc.addPage([w,h]); }
      doc.addImage(url, 'JPEG', 0,0,w,h);
    }
    await Helper.saveFile(doc.output('blob'), 'compressed.pdf', 'application/pdf');
    this.log.ok('Compressed saved');
  }
}

class ImageToPDFModule {
  constructor(log){ this.log=log; this.bind(); }
  bind(){
    document.getElementById('img2pdfBtn')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.run(), this.log, 'Images->PDF'));
    document.getElementById('clearImg')?.addEventListener('click', ()=>{ const i=document.getElementById('imgFiles'); if(i) i.value=''; });
  }
  async run(){
    const files=Array.from(document.getElementById('imgFiles').files||[]); if(!files.length) throw new Error('Select images');
    const sizeSel=document.getElementById('pageSize').value; const marginMm=Number(document.getElementById('marginMm').value)||0;
    const mm2pt=mm=> mm*72/25.4; const a4p=[595.28,841.89], a4l=[841.89,595.28];
    const { jsPDF } = window.jspdf;
    let doc, first=true;
    for(const f of files){
      const cv=await Helper.exifCanvas(f); const iw=cv.width, ih=cv.height; let pw,ph;
      if(sizeSel==='a4p'){ [pw,ph]=a4p; } else if(sizeSel==='a4l'){ [pw,ph]=a4l; } else { pw=Math.max(100, iw*72/96); ph=Math.max(100, ih*72/96); }
      const m=mm2pt(marginMm), aw=pw-m*2, ah=ph-m*2, r=Math.min(aw/iw, ah/ih), w=iw*r, h=ih*r;
      if(first){ doc=new jsPDF({unit:'pt', format:[pw,ph]}); first=false; } else { doc.addPage([pw,ph]); }
      doc.addImage(cv, 'PNG', m+(aw-w)/2, m+(ah-h)/2, w, h);
    }
    await Helper.saveFile(doc.output('blob'), 'images.pdf', 'application/pdf');
    this.log.ok('Images->PDF saved');
  }
}

class EditorModule {
  constructor(log){ this.log=log; this.state={ pdf:null, bytes:null, pages:[], file:null }; this.bind(); }
  bind(){
    document.getElementById('editFile')?.addEventListener('change', (e)=> ErrorBoundary.wrap(()=>this.load(e), this.log, 'Editor load'));
    document.getElementById('applyEditBtn')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.apply(), this.log, 'Editor apply'));
    document.getElementById('clearEdit')?.addEventListener('click', ()=>{ const i=document.getElementById('editFile'); if(i) i.value=''; document.getElementById('thumbs').innerHTML=''; this.state={ pdf:null, bytes:null, pages:[], file:null }; });
  }
  async load(e){
    const f=e.target.files[0]; if(!f) throw new Error('Select PDF');
    this.state.file=f; this.state.bytes=await Helper.fileToArrayBuffer(f);
    this.state.pdf=await pdfjsLib.getDocument({data:this.state.bytes}).promise;
    this.state.pages=Array.from({length:this.state.pdf.numPages}, (_,i)=>({idx:i+1,rot:0,hidden:false}));
    await this.render();
    this.log.ok('Editor loaded '+this.state.pages.length+' pages');
  }
  async render(){
    const wrap=document.getElementById('thumbs'); if(!wrap || !this.state.pdf) return; wrap.innerHTML='';
    for(const pageInfo of this.state.pages){
      const p=await this.state.pdf.getPage(pageInfo.idx); const viewport=p.getViewport({scale:0.3}); const c=document.createElement('canvas'); c.width=viewport.width; c.height=viewport.height; await p.render({canvasContext:c.getContext('2d'), viewport}).promise;
      const item=document.createElement('div'); item.className='thumb'; item.draggable=true; item.dataset.page=String(pageInfo.idx);
      const cv=document.createElement('div'); cv.className='canvas'; cv.appendChild(c);
      const ctr=document.createElement('div'); ctr.className='btns'; ctr.innerHTML=`<button class="btn" data-act="rot">↻</button><button class="btn danger" data-act="hide">${pageInfo.hidden?'Show':'Hide'}</button><span class="tag">#${pageInfo.idx}</span>`;
      if(pageInfo.hidden) item.classList.add('hiddenPage');
      item.appendChild(cv); item.appendChild(ctr); wrap.appendChild(item);
      ctr.querySelector('[data-act="rot"]').onclick=()=>{ pageInfo.rot=(pageInfo.rot+90)%360; this.log.info('Rotate '+pageInfo.idx+' = '+pageInfo.rot); };
      ctr.querySelector('[data-act="hide"]').onclick=(ev)=>{ pageInfo.hidden=!pageInfo.hidden; ev.target.textContent = pageInfo.hidden?'Show':'Hide'; item.classList.toggle('hiddenPage', pageInfo.hidden); };
      item.addEventListener('dragstart', e=> e.dataTransfer.setData('text/plain', pageInfo.idx));
      item.addEventListener('dragover', e=>{ e.preventDefault(); item.classList.add('dragover'); });
      item.addEventListener('dragleave', ()=> item.classList.remove('dragover'));
      item.addEventListener('drop', e=>{ e.preventDefault(); item.classList.remove('dragover'); const from=+e.dataTransfer.getData('text/plain'); const to=pageInfo.idx; const arr=this.state.pages; const a=arr.findIndex(x=>x.idx===from), b=arr.findIndex(x=>x.idx===to); const [moved]=arr.splice(a,1); arr.splice(b,0,moved); arr.forEach((x,i)=> x.idx=i+1); this.render(); });
    }
  }
  async apply(){
    if(!this.state.bytes) throw new Error('Select PDF');
    const src=await PDFLib.PDFDocument.load(this.state.bytes); const out=await PDFLib.PDFDocument.create(); const { degrees }=PDFLib; const kept=this.state.pages.filter(p=>!p.hidden);
    if(!kept.length) throw new Error('No pages');
    for(const p of kept){ const [copied]=await out.copyPages(src,[p.idx-1]); if(p.rot) copied.setRotation(degrees(p.rot)); out.addPage(copied); }
    await Helper.saveFile(await out.save(), 'edited.pdf', 'application/pdf'); this.log.ok('Editor saved');
  }
}

class WatermarkModule {
  constructor(log){ this.log=log; this.bind(); }
  bind(){
    document.getElementById('applyWmBtn')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.run(), this.log, 'Watermark'));
    document.getElementById('clearWm')?.addEventListener('click', ()=>{ ['wmFile','wmText','wmImage','wmAlpha','wmScale','metaTitle','metaAuthor'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); });
  }
  async textToPngBytes(text, scale=2){
    const pad=20*scale, fs=28*scale; const cv=document.createElement('canvas'); const ctx=cv.getContext('2d');
    ctx.font=`${fs}px "Noto Sans JP", system-ui, sans-serif`; const w=Math.ceil(ctx.measureText(text).width)+pad*2, h=fs+pad*2; cv.width=w; cv.height=h;
    ctx.font=`${fs}px "Noto Sans JP", system-ui, sans-serif`; ctx.fillStyle="#fff"; ctx.textBaseline="top"; ctx.shadowColor="rgba(0,0,0,.35)"; ctx.shadowBlur=4*scale; ctx.fillText(text, pad, pad);
    const blob=await new Promise(res=> cv.toBlob(res,'image/png')); return new Uint8Array(await blob.arrayBuffer());
  }
  async run(){
    const f=document.getElementById('wmFile').files[0]; if(!f) throw new Error('Select PDF');
    const buf=await Helper.fileToArrayBuffer(f); const src=await PDFLib.PDFDocument.load(buf); const out=await PDFLib.PDFDocument.create(); const { degrees }=PDFLib;
    let wmBytes=null; const imgFile=document.getElementById('wmImage').files[0]; const txt=document.getElementById('wmText').value.trim();
    if(imgFile) wmBytes=new Uint8Array(await imgFile.arrayBuffer()); else if(txt) wmBytes=await this.textToPngBytes(txt,2);
    const alpha=Math.max(0.05,Math.min(0.5, parseFloat(document.getElementById('wmAlpha').value)||0.12)); const scale=Math.max(0.2, Math.min(1, parseFloat(document.getElementById('wmScale').value)||0.6));
    const title=document.getElementById('metaTitle').value.trim(), author=document.getElementById('metaAuthor').value.trim();
    let wmEmbed=null; if(wmBytes) wmEmbed=await out.embedPng(wmBytes);
    const pages=await out.copyPages(src, src.getPageIndices()); pages.forEach(p=> out.addPage(p));
    if(wmEmbed) out.getPages().forEach(pg=>{ const {width,height}=pg.getSize(); const w=wmEmbed.width*scale, h=wmEmbed.height*scale; pg.drawImage(wmEmbed, { x:(width-w)/2, y:(height-h)/2, width:w, height:h, opacity: alpha, rotate: degrees(30) }); });
    if(title) out.setTitle(title); if(author) out.setAuthor(author);
    await Helper.saveFile(await out.save(), 'watermarked.pdf', 'application/pdf'); this.log.ok('Watermark saved');
  }
}

class PDFToImagesModule {
  constructor(log){ this.log=log; this.bind(); }
  bind(){
    document.getElementById('p2iBtn')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.run(), this.log, 'PDF->Images'));
    document.getElementById('clearP2i')?.addEventListener('click', ()=>{ ['p2iFile','p2iRanges'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); });
  }
  async run(){
    const f=document.getElementById('p2iFile').files[0]; if(!f) throw new Error('Select PDF');
    const pdf=await pdfjsLib.getDocument({data:await Helper.fileToArrayBuffer(f)}).promise; const total=pdf.numPages;
    const picks=Helper.parseRanges(document.getElementById('p2iRanges').value, total); const pages=picks.length? picks : Array.from({length:total},(_,i)=>i+1);
    const type=document.getElementById('p2iType').value; const scale=Math.max(1, Math.min(3, parseFloat(document.getElementById('p2iScale').value)||2)); const zip=new JSZip(); let i=1;
    for(const n of pages){ const page=await pdf.getPage(n); const viewport=page.getViewport({scale}); const c=document.createElement('canvas'); c.width=viewport.width; c.height=viewport.height; await page.render({canvasContext:c.getContext('2d'), viewport}).promise; const blob=await new Promise(res=> c.toBlob(res,type, type==='image/jpeg'?0.92:undefined)); zip.file(`page_${String(i).padStart(3,'0')}.`+(type==='image/png'?'png':'jpg'), await blob.arrayBuffer()); i++; }
    await Helper.saveFile(await zip.generateAsync({type:'blob'}), 'pdf_images.zip', 'application/zip'); this.log.ok('Images ZIP saved');
  }
}

class OCRModule {
  constructor(log){ this.log=log; this.lib=null; this.bind(); }
  bind(){
    document.getElementById('ocrBtn')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.run(), this.log, 'OCR'));
    document.getElementById('clearOcr')?.addEventListener('click', ()=>{ const i=document.getElementById('ocrFile'); if(i) i.value=''; document.getElementById('ocrPages').value='3'; });
  }
  async ensure(){ if(this.lib) return; await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload=()=>res(); s.onerror=rej; document.head.appendChild(s); }); this.lib=window.Tesseract; }
  async run(){
    await this.ensure(); const f=document.getElementById('ocrFile').files[0]; if(!f) throw new Error('Select PDF');
    const lang=document.getElementById('ocrLang').value; const N=Math.max(1, parseInt(document.getElementById('ocrPages').value||'1',10));
    const pdf=await pdfjsLib.getDocument({data:await Helper.fileToArrayBuffer(f)}).promise; const total=pdf.numPages; const end=Math.min(N,total);
    let text=''; for(let i=1;i<=end;i++){ const page=await pdf.getPage(i); const viewport=page.getViewport({scale:2}); const c=document.createElement('canvas'); c.width=viewport.width; c.height=viewport.height; await page.render({canvasContext:c.getContext('2d'), viewport}).promise; const url=c.toDataURL('image/png'); const {data}=await this.lib.recognize(url, lang, { logger:m=>{} }); text+=(text?'\n\n':'')+data.text.trim(); }
    await Helper.saveFile(new Blob([text], {type:'text/plain'}), 'ocr.txt', 'text/plain'); this.log.ok('OCR saved');
  }
}

class FormModule {
  constructor(log){ this.log=log; this.fields=[]; this.bind(); }
  bind(){
    document.getElementById('formScan')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.scan(), this.log, 'Form scan'));
    document.getElementById('formApply')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.apply(), this.log, 'Form apply'));
  }
  async scan(){
    const f=document.getElementById('formFile').files[0]; if(!f) throw new Error('Select PDF'); const pdfDoc=await PDFLib.PDFDocument.load(await Helper.fileToArrayBuffer(f)); let form; try{ form=pdfDoc.getForm(); }catch{ throw new Error('No form'); } const fields=form.getFields(); if(!fields.length) throw new Error('No fields');
    this.fields = fields.map(fd=> fd.getName()); const table=document.getElementById('formTable'); const tbody=table.querySelector('tbody'); tbody.innerHTML=''; this.fields.forEach(name=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${name}</td><td><input data-fname="${name}" type="text" placeholder="value"></td>`; tbody.appendChild(tr); }); table.style.display='table'; this.log.ok('Form fields: '+this.fields.length);
  }
  async apply(){
    const f=document.getElementById('formFile').files[0]; if(!f) throw new Error('Select PDF'); const pdfDoc=await PDFLib.PDFDocument.load(await Helper.fileToArrayBuffer(f)); let form; try{ form=pdfDoc.getForm(); }catch{ throw new Error('No form'); }
    const inputs=Array.from(document.querySelectorAll('input[data-fname]')); inputs.forEach(inp=>{ const name=inp.getAttribute('data-fname'); const val=inp.value??''; try{ const tf=form.getTextField(name); if(tf) tf.setText(String(val)); }catch{} });
    form.flatten(); await Helper.saveFile(await pdfDoc.save(), 'filled.pdf', 'application/pdf'); this.log.ok('Form saved');
  }
}

class SignModule {
  constructor(log){ this.log=log; this.bindCanvas(); }
  bindCanvas(){
    const c=document.getElementById('sigpad'); if(!c) return; const ctx=c.getContext('2d'); ctx.lineWidth=2; ctx.strokeStyle='#fff'; let d=false; c.onpointerdown=e=>{d=true;ctx.beginPath();ctx.moveTo(e.offsetX,e.offsetY);}; c.onpointermove=e=>{ if(d){ctx.lineTo(e.offsetX,e.offsetY);ctx.stroke();} }; c.onpointerup=()=> d=false;
    document.getElementById('sigClear')?.addEventListener('click', ()=> ctx.clearRect(0,0,c.width,c.height));
    document.getElementById('sigApply')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.apply(c), this.log, 'Sign apply'));
  }
  async apply(c){
    const f=document.getElementById('sigPdf').files[0]; if(!f) throw new Error('Select PDF'); const pageNo=Math.max(1, parseInt(document.getElementById('sigPage').value||'1',10)); const pos=document.getElementById('sigPos').value; const wpt=Math.max(60, parseFloat(document.getElementById('sigWidth').value)||180); const alpha=Math.max(0.2, Math.min(1, parseFloat(document.getElementById('sigAlpha').value)||0.98)); const pngBlob=await new Promise(res=> c.toBlob(res,'image/png'));
    const pdfDoc=await PDFLib.PDFDocument.load(await Helper.fileToArrayBuffer(f)); const png=await pdfDoc.embedPng(await pngBlob.arrayBuffer()); const idx=Math.min(pageNo, pdfDoc.getPageCount())-1; const page=pdfDoc.getPage(idx); const {width,height}=page.getSize(); const hpt=(png.height/png.width)*wpt; let x=36,y=36; if(pos==='rb'){x=width-wpt-36;y=36;} else if(pos==='lb'){x=36;y=36;} else if(pos==='rt'){x=width-wpt-36;y=height-hpt-36;} else if(pos==='lt'){x=36;y=height-hpt-36;} else if(pos==='center'){x=(width-wpt)/2;y=(height-hpt)/2;} page.drawImage(png, {x,y,width:wpt,height:hpt,opacity:alpha}); await Helper.saveFile(await pdfDoc.save(), 'signed.pdf', 'application/pdf'); this.log.ok('Signed saved');
  }
}

class OutlineModule {
  constructor(log){ this.log=log; this.bind(); }
  bind(){ document.getElementById('olSplit')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.run(), this.log, 'Outline split')); }
  async run(){
    const f=document.getElementById('olFile').files[0]; if(!f) throw new Error('Select PDF'); const buf=await Helper.fileToArrayBuffer(f); const pdf=await pdfjsLib.getDocument({data:buf}).promise; const outline=await pdf.getOutline(); if(!outline||!outline.length) throw new Error('No outline');
    async function collect(items, acc=[]){ for(const it of items){ try{ if(!it.dest) continue; const dest=await pdf.getDestination(it.dest); if(!dest) continue; const idx=await pdf.getPageIndex(dest[0]); acc.push({title:(it.title||'section').trim(), page:idx+1}); if(it.items?.length) await collect(it.items, acc); }catch{} } return acc; }
    const items=(await collect(outline,[])).sort((a,b)=>a.page-b.page); if(!items.length) throw new Error('No valid outline'); const ranges=items.map((cur,i)=> [cur.page, (i<items.length-1? items[i+1].page-1 : pdf.numPages), cur.title]);
    const src=await PDFLib.PDFDocument.load(buf); const zip=new JSZip(); for(const [start,end,title] of ranges){ const out=await PDFLib.PDFDocument.create(); const pages=await out.copyPages(src, Array.from({length:end-start+1},(_,k)=>start-1+k)); pages.forEach(p=> out.addPage(p)); const bytes=await out.save(); const safe=title.replace(/[^a-zA-Z0-9_()\-]/g,'_'); zip.file(`${String(start).padStart(3,'0')}_${safe}.pdf`, bytes); }
    await Helper.saveFile(await zip.generateAsync({type:'blob'}),'outline_split.zip','application/zip'); this.log.ok('Outline ZIP saved');
  }
}

class KeywordModule {
  constructor(log){ this.log=log; this.bind(); }
  bind(){ document.getElementById('kwExtract')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.run(), this.log, 'Keyword extract')); }
  async run(){
    const f=document.getElementById('kwFile').files[0]; if(!f) throw new Error('Select PDF'); const keyword=(document.getElementById('kw').value||'').trim(); if(!keyword) throw new Error('Enter keyword'); const caseSens=document.getElementById('kwCase').value==='sens'; const buf=await Helper.fileToArrayBuffer(f); const pdf=await pdfjsLib.getDocument({data:buf}).promise; const hits=[];
    for(let i=1;i<=pdf.numPages;i++){ const page=await pdf.getPage(i); const tc=await page.getTextContent(); const txt=tc.items.map(it=>it.str).join('\n'); if(caseSens? txt.includes(keyword) : txt.toLowerCase().includes(keyword.toLowerCase())) hits.push(i); }
    if(!hits.length) throw new Error('No match'); const src=await PDFLib.PDFDocument.load(buf); const out=await PDFLib.PDFDocument.create(); const copied=await out.copyPages(src, hits.map(n=>n-1)); copied.forEach(p=> out.addPage(p)); await Helper.saveFile(await out.save(), `found_${keyword}.pdf`, 'application/pdf'); this.log.ok('Found: '+hits.join(','));
  }
}

class TextExportModule {
  constructor(log){ this.log=log; this.bind(); }
  bind(){ document.getElementById('txtExport')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.run(), this.log, 'Text export')); }
  async run(){
    const f=document.getElementById('txtFile').files[0]; if(!f) throw new Error('Select PDF'); const pdf=await pdfjsLib.getDocument({data:await Helper.fileToArrayBuffer(f)}).promise; let out=''; for(let i=1;i<=pdf.numPages;i++){ const page=await pdf.getPage(i); const tc=await page.getTextContent(); out += tc.items.map(x=>x.str).join(' ') + '\n\n'; } await Helper.saveFile(new Blob([out],{type:'text/plain'}),'text.txt','text/plain'); this.log.ok('TXT saved');
  }
}

class SealModule {
  constructor(log){ this.log=log; this.bind(); }
  bind(){
    document.getElementById('sealCreate')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.create(), this.log, 'Seal create'));
    document.getElementById('sealScan')?.addEventListener('click', ()=> ErrorBoundary.wrap(()=>this.scan(), this.log, 'Seal scan'));
  }
  async makeQRCanvas(text, size=256){ return await new Promise((resolve, reject)=>{ QRCode.toCanvas(text, { width:size, errorCorrectionLevel:'L' }, (err, canv)=> err?reject(err):resolve(canv)); }); }
  async create(){
    const f=document.getElementById('sealPdf').files[0]; if(!f) throw new Error('Select PDF'); const pageNo=Math.max(1, parseInt(document.getElementById('sealPage').value||'1', 10)); const size=Math.max(96, parseInt(document.getElementById('sealSize').value||'160',10));
    const buf=await Helper.fileToArrayBuffer(f); const hashHex = await Helper.sha256(buf);
    const keypair = await crypto.subtle.generateKey({ name:'ECDSA', namedCurve:'P-256' }, true, ['sign','verify']);
    const sig = await crypto.subtle.sign({ name:'ECDSA', hash:'SHA-256' }, keypair.privateKey, new TextEncoder().encode(hashHex));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
    const pubJwk = await crypto.subtle.exportKey('jwk', keypair.publicKey);
    const payload = { alg:'ES256', hash:'SHA-256', pdfHash:hashHex, pubKeyJwk:pubJwk, signature:sigB64, created:new Date().toISOString() };
    const jsonText = JSON.stringify(payload);
    const qr = await this.makeQRCanvas(jsonText, 512); const blob = await new Promise(res=> qr.toBlob(res,'image/png')); const pngBytes = new Uint8Array(await blob.arrayBuffer());
    const pdfDoc = await PDFLib.PDFDocument.load(buf); const png = await pdfDoc.embedPng(pngBytes); const idx = Math.min(pageNo, pdfDoc.getPageCount())-1; const page = pdfDoc.getPage(idx); const { width, height } = page.getSize();
    const w = size, h = size; page.drawImage(png, { x: width - w - 36, y: 36, width: w, height: h, opacity: 0.95 });
    const out = await pdfDoc.save();
    await Helper.saveFile(out, 'sealed.pdf', 'application/pdf');
    await Helper.saveFile(new Blob([jsonText], {type:'application/json'}), 'seal.json', 'application/json');
    this.log.ok('sealed.pdf & seal.json saved');
  }
  async scan(){
    // minimal QR scan using camera and jsQR
    const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } });
    const v = document.createElement('video'); v.srcObject = stream; v.playsInline = true; await v.play(); Helper.toast('Scanning QR…');
    const cv=document.createElement('canvas'); const ctx=cv.getContext('2d');
    return new Promise((resolve)=>{
      const loop = ()=>{
        if(v.readyState === v.HAVE_ENOUGH_DATA){
          cv.width=v.videoWidth; cv.height=v.videoHeight; ctx.drawImage(v,0,0,cv.width,cv.height);
          const imgData=ctx.getImageData(0,0,cv.width,cv.height); const code=jsQR(imgData.data, cv.width, cv.height);
          if(code){ try{ navigator.clipboard.writeText(code.data).catch(()=>{}); Helper.toast('QR content copied to clipboard'); stream.getTracks().forEach(t=>t.stop()); this.log.ok('QR read'); resolve(); return; }catch(e){} }
        }
        requestAnimationFrame(loop);
      };
      loop();
    });
  }
}

// ================= App bootstrap =================
class PDFNeoApp {
  constructor(){
    this.lang = new I18N();
    this.logger = new Logger(document.getElementById('log'));
    this.modules = [];
    this.init();
  }
  init(){
    // Language
    const chosen = this.lang.auto(); this.lang.apply(chosen);
    try{
      const nav=(navigator.language||'').toLowerCase();
      const bar=document.getElementById('langbar');
      if (bar && (nav.startsWith('en') || nav.startsWith('es'))){ bar.style.display='flex'; document.getElementById('langbarClose').onclick=()=> bar.remove(); }
    }catch{}

    // Modules
    this.modules.push(new MergeModule(this.logger));
    this.modules.push(new SplitModule(this.logger));
    this.modules.push(new CompressModule(this.logger));
    this.modules.push(new ImageToPDFModule(this.logger));
    this.modules.push(new EditorModule(this.logger));
    this.modules.push(new WatermarkModule(this.logger));
    this.modules.push(new PDFToImagesModule(this.logger));
    this.modules.push(new OCRModule(this.logger));
    this.modules.push(new FormModule(this.logger));
    this.modules.push(new SignModule(this.logger));
    this.modules.push(new OutlineModule(this.logger));
    this.modules.push(new KeywordModule(this.logger));
    this.modules.push(new TextExportModule(this.logger));
    this.modules.push(new SealModule(this.logger));

    // PWA
    this.registerSW();
  }
  async registerSW(){
    if(!('serviceWorker' in navigator)) return;
    try{
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      navigator.serviceWorker.addEventListener('controllerchange', ()=> Helper.toast('App updated. Reloaded.'));
      if (reg.waiting){
        Helper.toast('Update available'); reg.waiting.postMessage({type:'SKIP_WAITING'});
      }
      reg.addEventListener('updatefound', ()=>{
        const newW = reg.installing;
        newW?.addEventListener('statechange', ()=>{
          if(newW.state === 'installed' && navigator.serviceWorker.controller){
            Helper.toast('New version ready. Reloading…');
            newW.postMessage({type:'SKIP_WAITING'});
          }
        });
      });
    }catch(e){ this.logger.warn('SW: '+e.message); }
  }
}

window.addEventListener('DOMContentLoaded', ()=> new PDFNeoApp());
