/* Local XLSX/CSV I/O. No external scripts. ZIP methods: stored and deflate.
   Excel formulas are read from their cached values; never executed. */
(function (root) {
  'use strict';
  const enc = new TextEncoder(), dec = new TextDecoder('utf-8');
  const MAX = 120 * 1024 * 1024;
  function xml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Повреждён XML внутри Excel. Пересохраните файл в .xlsx.');
    return doc;
  }
  function tags(node, name) { return Array.from(node.getElementsByTagNameNS('*', name)); }
  async function unzip(buf) {
    const v = new DataView(buf), bytes = new Uint8Array(buf), entries = new Map();
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
      if (v.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error('Это не стандартный XLSX. Пересохраните файл в Excel.');
    const count = v.getUint16(end + 10, true); let p = v.getUint32(end + 16, true), total = 0;
    if (count > 2000) throw new Error('Слишком много частей в Excel. Разделите файл.');
    for (let i = 0; i < count; i++) {
      if (p + 46 > bytes.length || v.getUint32(p, true) !== 0x02014b50) throw new Error('Повреждён ZIP-контейнер.');
      const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true), full = v.getUint32(p + 24, true);
      const n = v.getUint16(p + 28, true), extra = v.getUint16(p + 30, true), comment = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
      const name = ((v.getUint16(p+8,true)&0x800)?dec:new TextDecoder('ibm866')).decode(bytes.slice(p + 46, p + 46 + n));
      if (v.getUint16(p + 8, true) & 1) throw new Error('Excel защищён паролем. Загрузите незашифрованную копию.');
      if (off + 30 > bytes.length) throw new Error('Повреждён файл.');
      const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
      if (start + size > bytes.length) throw new Error('Повреждён файл.');
      total += full; if (total > MAX) throw new Error('Распакованный Excel превышает 120 МБ. Разделите выгрузку.');
      entries.set(name, {method, size, full, start}); p += 46 + n + extra + comment;
    }
    let consumed = 0;
    const read = async function read(name, binary=false) {
      const e = entries.get(name); if (!e) return null;
      let out;
      if (e.method === 0) out = bytes.slice(e.start, e.start + e.size);
      else if (e.method === 8) {
        let ds;
        try { ds = new DecompressionStream('deflate-raw'); }
        catch (_) { throw new Error('Браузер не поддерживает распаковку XLSX. Откройте сайт в актуальном Chrome/Edge или загрузите CSV.'); }
        const reader = new Blob([bytes.slice(e.start, e.start + e.size)]).stream().pipeThrough(ds).getReader();
        const parts = []; let len = 0;
        while (true) { const {done, value} = await reader.read(); if (done) break; len += value.length;
          if (len > MAX || consumed + len > MAX) { await reader.cancel(); throw new Error('Превышен лимит распаковки.'); } parts.push(value); }
        out = new Uint8Array(len); let at = 0; for (const part of parts) { out.set(part, at); at += part.length; }
      } else throw new Error('Неподдерживаемый метод сжатия XLSX.');
      consumed += out.length; if (consumed > MAX) throw new Error('Превышен лимит распаковки.');
      return binary ? out : dec.decode(out);
    }; read.names=[...entries.keys()]; return read;
  }
  function column(ref) { let n = 0; for (const c of ref.replace(/\d/g, '')) n = n * 26 + c.charCodeAt(0) - 64; return n - 1; }
  function csv(text) {
    text = text.replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/)[0]; const sep = (first.match(/;/g)||[]).length > (first.match(/,/g)||[]).length ? ';' : (first.includes('\t') ? '\t' : ',');
    const rows = []; let row = [], cell = '', quote = false;
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (c === '"') { if (quote && text[i+1] === '"') {cell += '"'; i++;} else quote = !quote; }
      else if (c === sep && !quote) { row.push(cell); cell = ''; }
      else if ((c === '\n' || c === '\r') && !quote) { if(c === '\r' && text[i+1] === '\n') i++; row.push(cell); if(row.some(x=>x.trim())) rows.push(row); row=[]; cell=''; }
      else cell += c;
    }
    row.push(cell); if(row.some(x=>x.trim())) rows.push(row); return rows;
  }
  async function readFile(file) {
    if(file.size > 25 * 1024 * 1024) throw new Error('Лимит одного файла — 25 МБ.');
    if (/\.zip$/i.test(file.name)) { const archive=await unzip(await file.arrayBuffer()); const out=[]; const files=archive.names.filter(n=>/\.(xlsx|csv)$/i.test(n)&&!n.includes('__MACOSX')&&!/(^|\/)\./.test(n)); if(files.length>40)throw Error('Не более 40 таблиц в архиве.'); for(const name of files){out.push(...await readFile(new File([await archive(name,true)],name)));if(out.reduce((n,s)=>n+s.rows.reduce((a,r)=>a+r.length,0),0)>5000000)throw Error('Архив содержит слишком много ячеек.');} if(!out.length)throw Error('В ZIP нет XLSX или CSV.'); return out; }
    if (/\.csv$/i.test(file.name)) return [{name: file.name.replace(/\.csv$/i,''), rows: csv(await file.text()), file: file.name}];
    if (!/\.xlsx$/i.test(file.name)) throw new Error('Поддерживаются .xlsx и CSV UTF-8. Старый .xls пересохраните в .xlsx.');
    const read = await unzip(await file.arrayBuffer());
    const wbText = await read('xl/workbook.xml'); if(!wbText) throw new Error('В файле не найден Excel workbook.');
    const wb = xml(wbText), rel = xml(await read('xl/_rels/workbook.xml.rels'));
    const paths = new Map(tags(rel,'Relationship').map(x=>[x.getAttribute('Id'),x.getAttribute('Target')]));
    const st = await read('xl/sharedStrings.xml');
    const strings = st ? tags(xml(st),'si').map(x=>tags(x,'t').map(t=>t.textContent).join('')) : [];
    const sheets=[];
    for(const sh of tags(wb,'sheet')) {
      if (sh.getAttribute('state') === 'hidden' || sh.getAttribute('state') === 'veryHidden') continue;
      const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
      let target=paths.get(rid); if(!target) continue;
      target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//,'');
      const text = await read(target); if(!text) continue;
      const rows=[];
      let cellCount=0,rowCount=0;
      for(const r of tags(xml(text),'row')) {
        if(++rowCount>400000)throw Error('Слишком много строк на листе.');if(rowCount%4000===0)await new Promise(resolve=>setTimeout(resolve,0));
        const row=[];
        for(const c of tags(r,'c')) {
          const k=column(c.getAttribute('r')||'A1'), type=c.getAttribute('t');
          if(!Number.isInteger(k)||k<0||k>16383||++cellCount>4000000)throw Error('Некорректные размеры листа.');
          const value=tags(c,'v')[0]; let val = value ? value.textContent : null;
          if(type==='s') val = val === null ? null : strings[Number(val)];
          else if(type==='inlineStr') val = tags(c,'t').map(x=>x.textContent).join('');
          else if(type==='e') val = null;
          else if(val!==null && type!=='str' && type!=='d') val=Number(val);
          row[k]=typeof val === 'string' ? val.trim() : val;
        }
        if(row.some(v=>v!==null&&v!==undefined&&v!==''))rows.push(row);
      }
      sheets.push({name:sh.getAttribute('name'),rows,file:file.name});
    }
    return sheets;
  }
  function esc(s) { return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,''); }
  let crcTable;
  function crc(b) {
    if(!crcTable) crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
    let n=0xffffffff;for(const x of b)n=crcTable[(n^x)&255]^(n>>>8);return (n^0xffffffff)>>>0;
  }
  function zip(files) {
    const parts=[], central=[];let offset=0;
    for(const [name,text] of Object.entries(files)) {
      const n=enc.encode(name),b=enc.encode(text),sum=crc(b),h=new Uint8Array(30+n.length),v=new DataView(h.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,sum,true);v.setUint32(18,b.length,true);v.setUint32(22,b.length,true);v.setUint16(26,n.length,true);h.set(n,30);parts.push(h,b);
      const ch=new Uint8Array(46+n.length),cv=new DataView(ch.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,sum,true);cv.setUint32(20,b.length,true);cv.setUint32(24,b.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);ch.set(n,46);central.push(ch);offset+=h.length+b.length;
    }
    const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,central.length,true);ev.setUint16(10,central.length,true);ev.setUint32(12,central.reduce((a,b)=>a+b.length,0),true);ev.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function letters(i) {let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;}
  function writeWorkbook(sheets) {
    const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main', files={};
    files['[Content_Types].xml']='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>';
    files['_rels/.rels']='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    files['xl/workbook.xml']=`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`+sheets.map((s,i)=>`<sheet name="${esc(s.name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>';
    files['xl/_rels/workbook.xml.rels']='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+'</Relationships>';
    sheets.forEach((s,i)=>{
      files[`xl/worksheets/sheet${i+1}.xml`]=`<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>`+(s.rows[0]||[]).map((_,j)=>`<col min="${j+1}" max="${j+1}" width="${j===2?55:j===s.rows[0].length-1?90:20}" customWidth="1"/>`).join('')+'</cols><sheetData>'+s.rows.map((r,ri)=>`<row r="${ri+1}">`+r.map((x,ci)=>`<c r="${letters(ci)}${ri+1}"${typeof x==='number' && Number.isFinite(x)?`><v>${x}</v>`:` t="inlineStr"><is><t xml:space="preserve">${esc(x)}</t></is>`}</c>`).join('')+'</row>').join('')+'</sheetData>'+((s.rows.length>1)?`<autoFilter ref="A1:${letters(s.rows[0].length-1)}${s.rows.length}"/>`:'')+'</worksheet>';
    });
    return zip(files);
  }
  function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),60000);}
  root.ExcelIO={readFile,writeWorkbook,save,csv};
})(typeof window!=='undefined'?window:globalThis);
