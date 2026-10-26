/* ══════════════════════════════════════════════════════════════════
   📄 nd-docpdf.js — เอกสาร PDF แบบทางการ (A4 เต็มหน้า · 2 ภาษา · เราเซ็นฝั่งเดียว)
   • หน้ากระดาษ 210×297 มม. เนื้อหาเว้นขอบ 9 มม. · PDF วางภาพเต็มหน้า (ไม่มีขอบขาวเพิ่ม)
   • ฟอนต์ Sarabun — โหลด "ชุดตัวอักษรไทย" ให้ครบก่อนวาด (กันสระ/วรรณยุกต์ตก-ลอย)
   • รูปทุกรูป (โลโก้/ลายเซ็น) แปลงเป็น data URL ก่อนวาด (กันรูปหาย)
   • รายการยาว → แบ่งหน้าเอง หัวตารางซ้ำทุกหน้า · ยอดรวม/ลายเซ็นอยู่หน้าสุดท้าย
   ใช้: GDOC.voucherBlob(opts) · GDOC.whtBlob(doc) · GDOC.salesBlob(kind,data) · GDOC.open(pages)
   ══════════════════════════════════════════════════════════════════ */
(function(){
const safe=(f,d)=>{ try{ const v=f(); return v===undefined?d:v; }catch(e){ return d; } };
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LOGO='https://res.cloudinary.com/dttappsmw/image/upload/v1775871891/PNG3_fevdmu.png';
const ACC='#0d3b8c';
// 🏢 ข้อมูลบริษัท (จากหนังสือรับรอง 16 ต.ค. 2569) — แก้ทับได้ที่ ls('doc_company')
const CO0={th:'บริษัท กวิน โฮม มีเดีย จำกัด', en:'Guin Home Media Co., Ltd.',
  ath:'48/714 หมู่บ้าน เค.ซี การ์เด้นโฮม ซอย 15 ถนนนิมิตใหม่ 40 แขวงสามวาตะวันออก เขตคลองสามวา กรุงเทพมหานคร 10510',
  aen:'48/714 K.C. Garden Home Village, Soi 15, Nimitmai 40 Rd., Sam Wa Tawan Ok, Khlong Sam Wa, Bangkok 10510',
  tax:'0105569194966', brTh:'สำนักงานใหญ่', brEn:'Head Office', tel:'', email:'penguinstudiovoice@gmail.com',
  sth:'นางสาวอริสา ปลื้มจิตร', sen:'Ms. Arisa Pluemjit'};
const CO=()=>Object.assign({}, CO0, safe(()=>ls('doc_company'),null)||{});
let LG='both';                                   // both | th | en — ตั้งที่ ls('doc_lang')
const L=(th,en)=>LG==='th'?th:LG==='en'?en:`${th} <span class="gd-en">/ ${en}</span>`;
const L1=(th,en)=>LG==='en'?en:th;
const B=n=>(+n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

// ── จำนวนเงินตัวอักษร ──
function bahtText(n){ n=Math.round((+n||0)*100)/100; const neg=n<0; n=Math.abs(n);
  const D=['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'], P=['','สิบ','ร้อย','พัน','หมื่น','แสน'];
  const rd=s=>{ let o=''; s=String(s).replace(/^0+/,''); const k=s.length; for(let i=0;i<k;i++){ const d=+s[i], p=k-i-1; if(!d) continue; if(p===0&&d===1&&k>1) o+='เอ็ด'; else if(p===1&&d===2) o+='ยี่'; else if(!(p===1&&d===1)) o+=D[d]; o+=P[p]; } return o; };
  const big=s=>s.length>6?big(s.slice(0,-6))+'ล้าน'+rd(s.slice(-6)):rd(s);
  const [b,s]=n.toFixed(2).split('.'); return (neg?'ลบ':'')+(+b?big(b):'ศูนย์')+'บาท'+(+s?big(s)+'สตางค์':'ถ้วน'); }
function engText(n){ n=Math.round(Math.abs(+n||0)*100)/100; const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'], t=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const h=x=>{ let o=''; if(x>=100){ o+=a[Math.floor(x/100)]+' Hundred'; x%=100; if(x) o+=' '; } if(x>=20){ o+=t[Math.floor(x/10)]; if(x%10) o+='-'+a[x%10]; } else if(x) o+=a[x]; return o; };
  const w=x=>{ if(!x) return 'Zero'; const o=[]; for(const [v,nm] of [[1e9,'Billion'],[1e6,'Million'],[1e3,'Thousand']]) if(x>=v){ o.push(h(Math.floor(x/v))+' '+nm); x%=v; } if(x) o.push(h(x)); return o.join(' '); };
  const b=Math.floor(n), s=Math.round((n-b)*100); return w(b)+' Baht'+(s?' and '+w(s)+' Satang':' Only'); }
let CUR='THB';                                  // สกุลเงินของเอกสารที่กำลังสร้าง (ใบเสนอราคา/ใบแจ้งหนี้/ใบเสร็จ)
const CURN={USD:['US Dollars','Cents'],EUR:['Euros','Cents'],GBP:['Pounds Sterling','Pence'],JPY:['Japanese Yen',''],CNY:['Chinese Yuan','Fen'],HKD:['Hong Kong Dollars','Cents'],SGD:['Singapore Dollars','Cents'],TWD:['New Taiwan Dollars','Cents'],KRW:['Korean Won',''],AUD:['Australian Dollars','Cents'],MYR:['Malaysian Ringgit','Sen']};
function fxText(n,c){ const [m,s]=CURN[c]||[c,'Cents']; const w=engText(Math.floor(Math.abs(+n||0))).replace(/ Baht.*$/,''); const sc=Math.round((Math.abs(+n||0)%1)*100); return w+' '+m+(sc&&s?' and '+engText(sc).replace(/ Baht.*$/,'')+' '+s:'')+' Only'; }
const words=n=>CUR!=='THB'?fxText(n,CUR):LG==='th'?bahtText(n):LG==='en'?engText(n):bahtText(n)+'<br><span class="gd-en">'+engText(n)+'</span>';
// วันที่ → วว/ดด/ปปปป(พ.ศ.) · รับได้ทั้ง 2026-10-22 และ 22/10/2026 หรือ 22/10/2569 (ช่องวันที่ในเว็บมีหลายแบบ)
const isoOf=d=>{ const s=String(d||'').trim(); let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m){ let y=+m[1]; if(y>2400) y-=543; return `${y}-${m[2]}-${m[3]}`; } m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m){ let y=+m[3]; if(y>2400) y-=543; return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`; } return ''; };
const thDate=d=>{ const i=isoOf(d); if(!i) return E(d||''); const [y,mo,da]=i.split('-'); return `${da}/${mo}/${LG==='en'?+y:+y+543}`; };
// หน่วย / รายละเอียดที่ระบบเติมให้ (ภาษาไทย) → อังกฤษ ในเอกสารภาษาอังกฤษ
const UNIT_EN={'งาน':'Job','ชิ้น':'Piece','ตอน':'Episode','นาที':'Minute','ชั่วโมง':'Hour','ชม.':'Hour','หน้า':'Page','วัน':'Day','เรื่อง':'Title','บท':'Script','เดือน':'Month','ครั้ง':'Time','โปรเจกต์':'Project','ชุด':'Set','รายการ':'Item','คน':'Person','เสียง':'Voice','ไฟล์':'File'};
const unitL=u=>{ u=String(u||'').trim(); const en=UNIT_EN[u]; return !en||LG==='th'?E(u):LG==='en'?en:E(u)+'<br><span class="gd-en">'+en+'</span>'; };
const detEn=t=>String(t||'').replace(/ความยาว\s*([\d.,]+)\s*นาที/g,'Duration $1 min').replace(/([\d.,]+)\s*ตอน/g,'$1 episodes').replace(/([\d.,]+)\s*นาที/g,'$1 min');
const detL=t=>{ if(!t) return ''; const en=detEn(t); return LG==='th'||en===t?E(t):LG==='en'?E(en):E(t)+' <span class="gd-en">/ '+E(en)+'</span>'; };

// ── CSS (ใส่ครั้งเดียว · ทุกคลาสขึ้นต้น gd- ไม่ชนกับเว็บ) ──
const CSS=`
.gd-page{width:210mm;height:297mm;background:#fff;color:#0f172a;font-family:'Sarabun',sans-serif;font-size:12.5px;line-height:1.45;padding:9mm 10mm 8mm;display:flex;flex-direction:column;position:relative;overflow:hidden;box-sizing:border-box;letter-spacing:normal;text-align:left}
.gd-page *{box-sizing:border-box;letter-spacing:normal;margin:0;padding:0}
.gd-page th,.gd-page td,.gd-page div,.gd-page span{text-transform:none;font-family:inherit}   /* กันสไตล์ของเว็บรั่วเข้ามา (เช่นหัวตารางตัวพิมพ์ใหญ่) */
.gd-page img{max-width:none}
.gd-items table th{font-size:10.5px!important;padding:4px 6px!important;white-space:normal!important;color:#0d3b8c!important}
.gd-items table td{font-size:12px!important;padding:5px 6px!important;white-space:normal!important;color:#0f172a!important}
.gd-items table .r{white-space:nowrap!important}
.gd-wht table th,.gd-wht table td{font-size:10.8px!important;padding:3px 5px!important;white-space:normal!important;color:#111!important}
.gd-wht table td.r{white-space:nowrap!important}
.gd-page table{font-size:12px!important}
.gd-en{color:#64748b;font-weight:400;font-size:.88em}
.gd-corner{position:absolute;top:0;right:0;width:0;height:0;border-top:22mm solid ${ACC};border-left:22mm solid transparent}
.gd-corner span{position:absolute;top:-19.5mm;right:3mm;color:#fff;font-weight:700;font-size:12px}
.gd-hd{display:grid;grid-template-columns:auto 1fr auto;gap:5mm;align-items:start}
.gd-hd .gd-logo{height:21mm;width:auto;display:block}
.gd-hd .n{font-size:15px;font-weight:700;line-height:1.3}
.gd-hd .ne{font-size:11px;color:#64748b;font-weight:500}
.gd-hd .a{font-size:10.8px;color:#334155;line-height:1.5;margin-top:2px}
.gd-tt{text-align:right;padding-right:17mm;padding-top:1mm}
.gd-tt .th{font-size:21px;font-weight:700;color:${ACC};line-height:1.2}
.gd-tt .en{font-size:11.5px;color:${ACC};font-weight:600}
.gd-tt .cp{display:inline-block;margin-top:4px;font-size:10.5px;font-weight:600;color:${ACC};border:1px solid ${ACC};border-radius:3px;padding:0 6px}
.gd-rule{height:1.5px;background:${ACC};margin:4mm 0 3mm}
.gd-g2{display:grid;grid-template-columns:1fr 80mm;gap:8mm}
.gd-k{color:${ACC};font-size:10.8px;font-weight:600}
.gd-party .v{font-weight:600;font-size:13px}
.gd-party .s{font-size:11.3px;color:#334155}
.gd-info div{display:grid;grid-template-columns:30mm 1fr;padding:1.2px 0;font-size:11.8px}
.gd-items{flex:1;display:flex;flex-direction:column;margin-top:4mm;border-top:1.5px solid ${ACC};border-bottom:1.5px solid ${ACC};min-height:20mm;overflow:hidden}
.gd-items table{width:100%;border-collapse:collapse;font-size:12px}
.gd-items th{font-weight:600;font-size:10.5px;color:${ACC};text-align:left;padding:4px 6px;border-bottom:1px solid #cbd5e1;background:#f1f5f9;line-height:1.25;vertical-align:bottom}
.gd-items td{padding:5px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
.gd-items .r{text-align:right;white-space:nowrap}
.gd-items .c{text-align:center}
.gd-items .sub{font-size:10.5px;color:#64748b}
.gd-items .fill{flex:1;background:repeating-linear-gradient(transparent 0 7.4mm,#f1f5f9 7.4mm 7.5mm)}
.gd-cont{font-size:10.5px;color:#64748b;text-align:right;padding:3px 6px}
.gd-sum{display:grid;grid-template-columns:1fr 80mm;gap:8mm;margin-top:3mm}
.gd-words{align-self:end;font-weight:600;font-size:12px}
.gd-words small{display:block;color:#64748b;font-weight:400;font-size:10.5px}
.gd-tot div{display:flex;justify-content:space-between;padding:1.8px 0;font-size:12px}
.gd-tot div span:first-child{color:${ACC}}
.gd-tot .g{border-top:1.5px solid ${ACC};margin-top:2px;padding-top:4px;font-size:14px;font-weight:700}
.gd-end{display:grid;grid-template-columns:1fr 72mm;gap:8mm;margin-top:5mm;align-items:end}
.gd-ev{border:1px solid #cbd5e1;border-radius:4px;padding:3mm 4mm;font-size:11.3px;line-height:1.65}
.gd-ev .gd-k{display:block;margin-bottom:1px}
.gd-ck{display:inline-block;width:10px;height:10px;border:1px solid #334155;vertical-align:-1px;margin-right:3px;font-size:9px;line-height:8px;text-align:center}
.gd-sg{text-align:center;font-size:11.3px}
.gd-sg .on{font-size:11px;color:#334155;margin-bottom:1mm}
.gd-sg .im{height:20mm;display:flex;align-items:center;justify-content:center;position:relative}
.gd-sg .im img{max-height:19mm;max-width:60mm}
.gd-sg .ln{border-top:1px solid #475569;padding-top:2px}
.gd-sg .rl{color:#64748b;font-size:10.5px}
.gd-note{font-size:11px;color:#334155;margin-top:2mm}
.gd-foot{display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;margin-top:4mm;border-top:1px solid #e2e8f0;padding-top:2mm}
.gd-wht{border:1.2px solid #111;font-size:11.3px;flex:1;display:flex;flex-direction:column}
.gd-wht .h{display:grid;grid-template-columns:1fr auto;border-bottom:1.2px solid #111;padding:4px 8px}
.gd-wht .h .t{font-size:15.5px;font-weight:700;text-align:center}
.gd-wht .row{border-bottom:1px solid #111;padding:4px 8px}
.gd-wht .fl{display:grid;grid-template-columns:auto 1fr auto 46mm;gap:3px 8px;align-items:end}
.gd-wht .u{border-bottom:1px dotted #333;min-height:15px;padding:0 3px;font-weight:600}
.gd-wht table{width:100%;border-collapse:collapse}
.gd-wht th,.gd-wht td{border:1px solid #111;padding:3px 5px;font-size:10.8px;vertical-align:top}
.gd-wht th{font-weight:600;text-align:center;background:#f8fafc}
.gd-wht td.r{text-align:right;white-space:nowrap}
.gd-wht .gd-ck{margin:0 3px 0 7px;border-color:#111}
`;
function ensureCss(){ if(document.getElementById('gd-css')) return; const st=document.createElement('style'); st.id='gd-css'; st.textContent=CSS; document.head.appendChild(st); }
// 🔤 ฟอนต์: ต้องโหลด "ชุดไทย" ของ Sarabun (Google แบ่งไฟล์ตามภาษา) — ถ้าโหลดแค่ชุดอังกฤษ สระจะตก/ลอย
async function ensureFonts(){
  if(!document.getElementById('gd-font')){ const l=document.createElement('link'); l.id='gd-font'; l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap'; document.head.appendChild(l);
    await new Promise(r=>{ l.onload=r; l.onerror=r; setTimeout(r,4000); }); }
  if(document.fonts){ const TH='กขคงจฉชซญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮะาำิีึืุูเแโใไ่้๊๋็์ั฿ ABCabc0123';
    await Promise.all(['400','500','600','700'].map(w=>document.fonts.load(`${w} 16px Sarabun`, TH))).catch(()=>{});
    if(document.fonts.ready) await document.fonts.ready; }
}
// 🖼️ รูป → data URL (ใช้ตัวช่วยเดิมของเว็บที่ลองหลายทาง) · โลโก้สีขาว → ย้อมเป็นสีน้ำเงินบริษัท (PNG พื้นใส) ให้เห็นบนกระดาษขาว
const _imgC=new Map();
async function dataUrl(src){ if(!src) return ''; if(/^data:/.test(src)) return src; if(_imgC.has(src)) return _imgC.get(src);
  let d=''; try{ d=typeof _vcImgToDataUrl==='function'?await _vcImgToDataUrl(src):''; }catch(e){}
  if(!d){ try{ const r=await fetch(src,{mode:'cors'}); const b=await r.blob(); d=await new Promise(res=>{ const f=new FileReader(); f.onload=()=>res(f.result); f.onerror=()=>res(''); f.readAsDataURL(b); }); }catch(e){} }
  _imgC.set(src,d); return d; }
async function tint(src, hex){ const key='tint:'+hex+':'+src.slice(0,80)+src.length; if(_imgC.has(key)) return _imgC.get(key);
  const d=await dataUrl(src); if(!d) return '';
  const out=await new Promise(res=>{ const im=new Image(); im.onload=()=>{ try{ const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; const g=c.getContext('2d'); g.drawImage(im,0,0);
      const px=g.getImageData(0,0,c.width,c.height), a=px.data, R=parseInt(hex.slice(1,3),16), G=parseInt(hex.slice(3,5),16), Bl=parseInt(hex.slice(5,7),16);
      let light=0, n=0; for(let i=0;i<a.length;i+=4){ if(a[i+3]>40){ n++; if(a[i]+a[i+1]+a[i+2]>690) light++; } }
      if(n && light/n>0.6) for(let i=0;i<a.length;i+=4){ if(a[i+3]>0){ a[i]=R; a[i+1]=G; a[i+2]=Bl; } }   // ย้อมเฉพาะโลโก้ที่เป็นสีขาวล้วน
      g.putImageData(px,0,0); res(c.toDataURL('image/png')); }catch(e){ res(d); } }; im.onerror=()=>res(d); im.src=d; });
  _imgC.set(key,out); return out; }
async function assets(){ const custom=safe(()=>ls('doc_logo'),'');
  const logo=custom?await dataUrl(custom):await tint(LOGO, ACC);
  const sigRaw=safe(()=>ls('admin_signature'),''); const sig=sigRaw?await dataUrl(sigRaw):'';
  return {logo, sig}; }

// ── ชิ้นส่วนเอกสาร ──
const head=(A,th,en,cp,pg)=>{ const c=CO(); return `<div class="gd-corner"><span>${pg}</span></div>
 <div class="gd-hd">${A.logo?`<img class="gd-logo" src="${A.logo}">`:'<span></span>'}<div><div class="n">${E(LG==='en'?c.en:c.th)}</div>${LG==='both'?`<div class="ne">${E(c.en)}</div>`:''}
  <div class="a">${E(LG==='en'?c.aen:c.ath)}${LG==='both'?'<br>'+E(c.aen):''}<br>${L('เลขประจำตัวผู้เสียภาษี','Tax ID')} ${E(c.tax)} (${L1(c.brTh,c.brEn)})${c.tel?' · '+E(c.tel):''}${c.email?' · '+E(c.email):''}</div></div>
  <div class="gd-tt"><div class="th">${LG==='en'?en:th}</div>${LG==='both'?`<div class="en">${en}</div>`:''}${cp?`<div class="cp">${cp}</div>`:''}</div></div><div class="gd-rule"></div>`; };
const party=(th,en,name,lines)=>`<div class="gd-party"><div class="gd-k">${L(th,en)}</div><div class="v">${name}</div><div class="s">${lines.filter(Boolean).join('<br>')}</div></div>`;
const info=rows=>`<div class="gd-info">${rows.filter(r=>r[2]).map(([th,en,v])=>`<div><span class="gd-k">${L(th,en)}</span><span>${v}</span></div>`).join('')}</div>`;
const thead=cols=>`<tr>${cols.map(c=>`<th class="${c[2]||''}" style="${c[3]?'width:'+c[3]:''}">${LG==='both'?c[0]+'<br><span class="gd-en">'+c[1]+'</span>':LG==='en'?c[1]:c[0]}</th>`).join('')}</tr>`;
const itemsBox=(cols,rows,cont)=>`<div class="gd-items"><table><thead>${thead(cols)}</thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<td class="${cols[i][2]||''}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table><div class="fill"></div>${cont?`<div class="gd-cont">${L('มีต่อหน้าถัดไป','Continued on next page')} →</div>`:''}</div>`;
const totals=(grand,lines,note)=>`<div class="gd-sum"><div class="gd-words"><small>${L('จำนวนเงินตัวอักษร','Amount in words')}</small>(${words(grand)})${note?`<small style="margin-top:3px">${note}</small>`:''}</div><div class="gd-tot">${lines.map(([th,en,v])=>`<div><span>${L(th,en)}</span><span>${B(v)}</span></div>`).join('')}<div class="g"><span>${L('จำนวนเงินรวมทั้งสิ้น','Grand Total')}</span><span>${B(grand)} ${CUR!=='THB'?CUR:L1('บาท','THB')}</span></div></div></div>`;
const signBox=(A,dt)=>{ const c=CO(); return `<div class="gd-sg"><div class="on">${L('ในนาม','On behalf of')} ${E(LG==='en'?c.en:c.th)}</div><div class="im">${A.sig?`<img src="${A.sig}">`:(A.logo?`<img src="${A.logo}" style="opacity:.35">`:'')}</div>
 <div class="ln">( ${E(LG==='en'?c.sen:c.sth)} )</div><div class="rl">${L('ผู้มีอำนาจลงนาม','Authorized Signature')} · ${dt}</div></div>`; };
const foot=no=>`<div class="gd-foot"><span>${L('เอกสารออกและลงนามโดยบริษัท ไม่ต้องลงนามตอบกลับ','Issued and signed by the company — no counter-signature required')}</span><span>${E(no)}</span></div>`;

// ── แบ่งหน้า: ใส่แถวให้เต็มหน้า แล้วยกที่เหลือไปหน้าถัดไป (วัดจริงในเบราว์เซอร์) ──
function measureHost(){ let h=document.getElementById('gd-host'); if(!h){ h=document.createElement('div'); h.id='gd-host'; h.style.cssText='position:fixed;left:-10000px;top:0;width:210mm;z-index:-1;pointer-events:none'; document.body.appendChild(h); } return h; }
function fits(html){ const h=measureHost(); h.innerHTML=`<div class="gd-page">${html}</div>`; const p=h.firstElementChild, box=p.querySelector('.gd-items');
  const ok=p.scrollHeight<=p.clientHeight+1 && (!box || box.querySelector('table').offsetHeight<=box.clientHeight+1); h.innerHTML=''; return ok; }
// spec: {top(pg,cont) → html ก่อนตาราง, cols, rows, last → html หลังตาราง (ยอด/ลายเซ็น), foot}
function paginate(spec){ const pages=[]; let rest=spec.rows.slice(), pg=1;
  while(true){
    const build=(rows,final)=>spec.top(pg)+itemsBox(spec.cols,rows,!final)+(final?spec.last:'')+spec.foot;
    if(!rest.length || fits(build(rest,true))){ pages.push(build(rest,true)); break; }
    let lo=1, hi=rest.length, k=1;   // จำนวนแถวมากสุดที่ลงหน้านี้ได้ (ไม่มียอดท้าย)
    while(lo<=hi){ const m=(lo+hi)>>1; if(fits(build(rest.slice(0,m),false))){ k=m; lo=m+1; } else hi=m-1; }
    if(k>=rest.length) k=Math.max(1,rest.length-1);   // ทุกแถวลงได้แต่ยอดท้ายไม่พอ → ยกแถวท้ายไปหน้าใหม่พร้อมยอด
    pages.push(build(rest.slice(0,k),false)); rest=rest.slice(k); pg++;
    if(pg>40) break;
  }
  return pages; }

// ═══ 💸 ใบสำคัญจ่าย (ทีมงาน) ═══
const SLOT={dub:['พากย์','Dubbing'],adp:['เกลาบท','Script'],mix:['มิกซ์','Mixing'],qc:['QC','QC'],sub:['ซับ & วิดีโอ','Subtitle & Video'],trn:['แปล','Translation'],mgr:['เมเนเจอร์','Manager']};
function staffAddr(s){ const p=Object.assign({}, s&&s.profile||{}, s||{}); const a=[p.addr||p.address||'', p.moo?('หมู่ '+p.moo):'', p.sub||'', p.dist||'', p.prov||'', p.zip||''].filter(Boolean).join(' ');
  return {addr:a, tax:p.taxId||p.taxid||p.idCard||p.citizenId||''}; }
async function voucherPages(o){ await prep(); const A=await assets(); LG=safe(()=>ls('doc_lang'),'')||'both';
  const s=o.staff||{}, full=((s.name||'')+(s.lastName?' '+s.lastName:'')).trim()||s.nickname||'—', sa=staffAddr(s);
  let gross=0, tax=0, unknownTax=false; const rows=(o.items||[]).map((it,i)=>{ const pre=String(it.slot||'').split('-')[0], p=it.projId?safe(()=>getProjects().find(x=>x.id===it.projId),null):null;
    const t=(it.taxPct!=null&&it.taxPct!=='')?(+it.taxPct||0):(p?(parseFloat((p.tax||{})[pre])||0):0), amt=+it.amount||0, tx=amt-Math.round(amt*(1-t/100)); gross+=amt; tax+=tx;
    const sl=SLOT[pre]||[E(pre),E(pre)]; if(it.taxPct==null&&!p) unknownTax=true; return [String(i+1), E(it.projName||'—')+(t?`<div class="sub">${L('หัก ณ ที่จ่าย','WHT')} ${t}%</div>`:''), L(sl[0],sl[1]), B(amt)]; });
  const net=gross-tax, dt=thDate(o.date), cfm=o.confirmedAt?thDate(String(o.confirmedAt).slice(0,10))+' '+E(String(o.confirmedAt).slice(11,16)):'';
  const cols=[['#','No.','c','8mm'],['รายการ','Description'],['หน้าที่','Role','c','28mm'],['จำนวนเงิน','Amount','r','30mm']];
  const top=pg=>head(A,'ใบสำคัญจ่าย','PAYMENT VOUCHER',L('ต้นฉบับ','Original'),pg)+(pg>1?'':`<div class="gd-g2">${party('จ่ายให้','Paid to',E(full)+(s.nickname?` (${E(s.nickname)})`:''),[E(sa.addr), sa.tax?L('เลขประจำตัวผู้เสียภาษี','Tax ID')+' '+E(sa.tax):''])}
    ${info([['เลขที่','No.',E(o.vNo||'')],['วันที่จ่าย','Payment date',dt],['หมายเหตุ','Note',E(o.note||'')],['50 ทวิ','WHT cert.',E(o.whtNo||'')]])}</div>`);
  const last=totals(net,[['รวมค่าจ้าง','Total fee',gross]].concat(tax?[['หักภาษี ณ ที่จ่าย','Less withholding tax',-tax]]:[]), tax?L('ยอดโอนสุทธิ','Net transferred'):'')+
   `<div class="gd-end"><div class="gd-ev"><span class="gd-k">${L('หลักฐานการจ่ายเงิน','Payment evidence')}</span>
     <span class="gd-ck">✓</span>${L('โอนเข้าบัญชี','Bank transfer')} ${E(s.bank||'')} ${E(s.account||'')}<br>${L('วันที่จ่าย','Date')} ${dt}${unknownTax?'':` · ${L('จำนวน','Amount')} ${B(net)}`}<br>
     ${cfm?`✓ ${L('ผู้รับเงินยืนยันยอดในระบบ','Amount confirmed by payee in system')} ${cfm}<br>`:''}<span style="color:#64748b">${L('หลักฐานการโอนเงินเก็บในระบบบริษัท','Transfer evidence kept on file')}</span></div>${signBox(A,dt)}</div>`;
  return {pages:paginate({top, cols, rows, last, foot:foot(o.vNo||'')}), gross, tax, net}; }

// ═══ 🏛️ 50 ทวิ (แบบกรมสรรพากร · ฉบับที่ 1 และ 2) ═══
async function whtPages(d){ await prep(); const A=await assets(); LG=safe(()=>ls('doc_lang'),'')||'both'; const c=CO(); const pay=d.payer||{}, pe=d.payee||{};
  const payerName=pay.name||c.th, payerTax=pay.taxid||c.tax, payerAddr=pay.addr||c.ath;
  const it=String(d.incomeType||'402'), dt=thDate(d.payDate), amt=+d.amount||0, tx=+d.tax||0;
  const row=(k,label)=>`<tr><td>${label}</td><td style="text-align:center">${it===k?dt:''}</td><td class="r">${it===k?B(amt):''}</td><td class="r">${it===k?B(tx):''}</td></tr>`;
  const form=['ภ.ง.ด.1ก','ภ.ง.ด.1ก พิเศษ','ภ.ง.ด.2','ภ.ง.ด.3','ภ.ง.ด.2ก','ภ.ง.ด.3ก','ภ.ง.ด.53'], pick=d.form||(it==='401'?'ภ.ง.ด.1ก':'ภ.ง.ด.3');
  const one=(no,forWho)=>`<div style="text-align:right;font-size:10.5px">ฉบับที่ ${no} ${forWho}</div>
  <div class="gd-wht" style="margin-top:2mm">
   <div class="h"><div class="t">หนังสือรับรองการหักภาษี ณ ที่จ่าย<div style="font-size:10.5px;font-weight:400">ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร <span class="gd-en">· Withholding Tax Certificate (Section 50 bis)</span></div></div><div style="font-size:11px;text-align:right">เลขที่ <span class="u">${E(d.docNo||'')}</span></div></div>
   <div class="row" style="display:grid;grid-template-columns:auto 1fr;gap:4mm;align-items:center">${A.logo?`<img src="${A.logo}" style="height:13mm">`:'<span></span>'}<div><b>ผู้มีหน้าที่หักภาษี ณ ที่จ่าย</b> <span class="gd-en">Withholder</span>
    <div class="fl" style="margin-top:2px"><span>ชื่อ</span><span class="u">${E(payerName)}</span><span>เลขประจำตัวผู้เสียภาษีอากร</span><span class="u">${E(payerTax)}</span></div><div class="fl" style="grid-template-columns:auto 1fr;margin-top:2px"><span>ที่อยู่</span><span class="u">${E(payerAddr)}</span></div></div></div>
   <div class="row"><b>ผู้ถูกหักภาษี ณ ที่จ่าย</b> <span class="gd-en">Payee</span><div class="fl" style="margin-top:2px"><span>ชื่อ</span><span class="u">${E(pe.name||'')}</span><span>เลขประจำตัวผู้เสียภาษีอากร</span><span class="u">${E(pe.taxid||'')}</span></div><div class="fl" style="grid-template-columns:auto 1fr;margin-top:2px"><span>ที่อยู่</span><span class="u">${E(pe.addr||'')}</span></div></div>
   <div class="row">ลำดับที่ <span class="u">&nbsp;${E(d.seq||'')}&nbsp;</span> ในแบบ ${form.map(f=>`<span class="gd-ck">${f===pick?'✓':''}</span>${f}`).join(' ')}</div>
   <table><tr><th>ประเภทเงินได้พึงประเมินที่จ่าย <span class="gd-en">Type of income</span></th><th style="width:24mm">วันที่จ่าย<br><span class="gd-en">Date paid</span></th><th style="width:28mm">จำนวนเงินที่จ่าย<br><span class="gd-en">Amount paid</span></th><th style="width:26mm">ภาษีที่หักไว้<br><span class="gd-en">Tax withheld</span></th></tr>
    ${row('401','1. เงินเดือน ค่าจ้าง เบี้ยเลี้ยง โบนัส ฯลฯ ตามมาตรา 40 (1)')}${row('402','2. ค่าธรรมเนียม ค่านายหน้า ฯลฯ ตามมาตรา 40 (2)')}${row('403','3. ค่าแห่งลิขสิทธิ์ ฯลฯ ตามมาตรา 40 (3)')}
    ${row('404','4. (ก) ดอกเบี้ย ฯลฯ ตามมาตรา 40 (4)(ก) · (ข) เงินปันผล ฯลฯ ตามมาตรา 40 (4)(ข)')}${row('408','5. การจ่ายเงินได้ที่ต้องหักภาษี ณ ที่จ่าย ตามคำสั่งกรมสรรพากรที่ออกตามมาตรา 3 เตรส (ค่าจ้างทำของ ค่าบริการ ค่าเช่า ฯลฯ)')}${row('499','6. อื่น ๆ (ระบุ) ..............................')}
    <tr><td colspan="2" style="text-align:right;font-weight:600">รวมเงินที่จ่ายและภาษีที่หักนำส่ง <span class="gd-en">Total</span></td><td class="r"><b>${B(amt)}</b></td><td class="r"><b>${B(tx)}</b></td></tr>
    <tr><td colspan="4"><b>รวมเงินภาษีที่หักนำส่ง (ตัวอักษร)</b> (${bahtText(tx)}) <span class="gd-en">${engText(tx)}</span></td></tr></table>
   <div class="row">กองทุนประกันสังคม <span class="u">&nbsp;${d.sso?B(d.sso):'—'}&nbsp;</span> บาท · กองทุนสำรองเลี้ยงชีพ <span class="u">&nbsp;—&nbsp;</span> บาท</div>
   <div class="row">ผู้จ่ายเงิน <span class="gd-ck">✓</span>(1) หัก ณ ที่จ่าย <span class="gd-ck"></span>(2) ออกให้ตลอดไป <span class="gd-ck"></span>(3) ออกให้ครั้งเดียว <span class="gd-ck"></span>(4) อื่น ๆ</div>
   <div style="flex:1;display:grid;grid-template-columns:1fr 1fr">
    <div style="padding:8px;border-right:1px solid #111;font-size:10.5px"><b>คำเตือน</b> ผู้มีหน้าที่ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย ฝ่าฝืนไม่ปฏิบัติตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร ต้องรับโทษทางอาญาตามมาตรา 35 แห่งประมวลรัษฎากร</div>
    <div style="padding:8px;display:flex;flex-direction:column;justify-content:flex-end;text-align:center;font-size:11px">ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้นถูกต้องตรงกับความจริงทุกประการ
     <div class="gd-sg" style="margin-top:2mm"><div class="im">${A.sig?`<img src="${A.sig}">`:''}</div><div class="ln">ลงชื่อ ผู้จ่ายเงิน ( ${E(c.sth)} )</div><div class="rl">${dt} · ประทับตรานิติบุคคล (ถ้ามี)</div></div></div></div>
  </div><div class="gd-foot"><span>${E(c.en)}</span><span>${E(d.docNo||'')} · ฉบับที่ ${no}</span></div>`;
  return [one(1,'(สำหรับผู้ถูกหักภาษี ณ ที่จ่าย ใช้แนบพร้อมกับแบบแสดงรายการภาษี)'), one(2,'(สำหรับผู้ถูกหักภาษี ณ ที่จ่าย เก็บไว้เป็นหลักฐาน)')]; }

// ═══ 📋🧾 ใบเสนอราคา / ใบแจ้งหนี้ / ใบเสร็จรับเงิน (ข้อมูลจากฟอร์มเดิมของเว็บ) ═══
const KIND={quotation:['ใบเสนอราคา','QUOTATION'], invoice:['ใบแจ้งหนี้ / ใบวางบิล','INVOICE / BILLING NOTE'], receipt:['ใบเสร็จรับเงิน','RECEIPT']};
async function salesPages(kind, d){ await prep(); const A=await assets(); LG=(d&&['both','th','en'].includes(d.lang)?d.lang:'')||safe(()=>ls('doc_lang'),'')||'both';
  const FX=d.currency&&d.currency!=='THB'&&+d.fxRate>0; CUR=FX?d.currency:'THB';
  const qn=x=>(+x.qty||1), r2=n=>Math.round((+n||0)*100)/100, up=x=>FX?(x.fxUnit!=null?+x.fxUnit:r2((+x.price||0)/d.fxRate)):(+x.price||0);   // ราคาต่อหน่วยในสกุลเอกสาร
  const [th,en]=KIND[kind]||KIND.invoice, sub=r2((d.items||[]).reduce((a,x)=>a+qn(x)*up(x),0));
  const vp=+d.vat||0, vat=vp?(FX?r2(sub*vp/100):Math.round(sub*vp/100)):0, grand=FX?r2(sub+vat):(d.total!=null?+d.total:sub+vat), dt=thDate(d.date);
  const rows=(d.items||[]).map((x,i)=>[String(i+1), E(x.desc||'')+(x.detail?`<div class="sub">${detL(x.detail)}</div>`:''), B(qn(x)).replace(/\.00$/,''), unitL(x.unit), B(up(x)), B(qn(x)*up(x))]);
  const fxNote=FX?L('อัตราแลกเปลี่ยน','Exchange rate')+` 1 ${E(CUR)} = ${(+d.fxRate).toLocaleString('en-US',{maximumFractionDigits:4})} THB`+(d.fxDate?` (${thDate(d.fxDate)})`:'')+` · ${L('เทียบเท่า','Equivalent to')} ${B((()=>{ const t=(d.items||[]).reduce((a,x)=>a+qn(x)*(+x.price||0),0); return r2(t+(vp?Math.round(t*vp/100):0)); })())} THB`:'';
  const cols=[['#','No.','c','8mm'],['รายละเอียด','Description'],['จำนวน','Qty','r','16mm'],['หน่วย','Unit','c','16mm'],['ราคาต่อหน่วย'+(FX?' ('+CUR+')':''),'Unit Price'+(FX?' ('+CUR+')':''),'r','25mm'],['จำนวนเงิน'+(FX?' ('+CUR+')':''),'Amount'+(FX?' ('+CUR+')':''),'r','27mm']];
  const copies=kind==='receipt'?[L('ต้นฉบับ','Original'),L('สำเนา','Copy')]:[L('ต้นฉบับ','Original')];
  const cust=[E(d.clientAddr||''), d.clientTax?L('เลขประจำตัวผู้เสียภาษี','Tax ID')+' '+E(d.clientTax)+(d.clientBranch?' ('+E(d.clientBranch)+')':''):'', d.email?E(d.email):''];
  const evid=kind==='receipt'
    ? `<span class="gd-k">${L('หลักฐานการรับเงิน','Payment received')}</span>${['เงินสด|Cash','โอนเงิน|Transfer','เช็ค|Cheque'].map(x=>{ const [a,b]=x.split('|'); return `<span class="gd-ck">${String(d.method||'โอน').includes(a.slice(0,3))?'✓':''}</span>${L1(a,b)} &nbsp;`; }).join('')}<br>${L('วันที่','Date')} ${dt}${d.fromInvoice?' · '+L('อ้างอิง','Ref.')+' '+E(d.fromInvoice):''}<br><span style="color:#64748b">${L('ใบเสร็จนี้สมบูรณ์เมื่อบริษัทได้รับเงินแล้ว','Valid upon receipt of funds')}</span>`
    : `<span class="gd-k">${L('ช่องทางชำระเงิน','Payment details')}</span>${d.payText||L('โอนเข้าบัญชีบริษัทตามที่แจ้ง','Transfer to the company account provided')}${d.dueDate?`<br>${L('ครบกำหนด','Due date')} ${thDate(d.dueDate)}`:''}`;
  const out=[];
  copies.forEach(cp=>{ const top=pg=>head(A,th,en,cp,pg)+(pg>1?'':`<div class="gd-g2">${party(kind==='receipt'?'ได้รับเงินจาก':'ลูกค้า', kind==='receipt'?'Received from':'Customer', E(d.client||'—'), cust)}
     ${info([['เลขที่','No.',E(d.docNo||'')],['วันที่','Date',dt],['ครบกำหนด','Due date',kind==='invoice'&&d.dueDate?thDate(d.dueDate):''],['อ้างอิง','Reference',E(d.fromInvoice||d.ref||'')]])}</div>`);
    const last=totals(grand,[['รวมเป็นเงิน','Subtotal',sub]].concat(vat?[[`ภาษีมูลค่าเพิ่ม ${vp}%`,`VAT ${vp}%`,vat]]:[]), [fxNote, d.note?E(d.note):''].filter(Boolean).join('<br>'))+`<div class="gd-end"><div class="gd-ev">${evid}</div>${signBox(A,dt)}</div>`;
    out.push(...paginate({top, cols, rows, last, foot:foot((d.docNo||'')+' · '+cp.replace(/<[^>]+>/g,''))})); });
  CUR='THB'; return out; }

// ── PDF: แต่ละหน้า = ภาพเต็มแผ่น A4 (ไม่มีขอบเพิ่ม) ──
async function libs(){ await _loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'); await _loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); }
async function prep(){ ensureCss(); await Promise.all([ensureFonts(), libs()]); }
async function toBlob(pages){ await prep();
  const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
  const h=document.createElement('div'); h.style.cssText='position:fixed;left:-10000px;top:0;width:210mm;z-index:-1;pointer-events:none'; document.body.appendChild(h);
  try{
  for(let i=0;i<pages.length;i++){
    h.innerHTML=`<div class="gd-page">${pages[i]}</div>`; const el=h.firstElementChild;
    await Promise.all([...el.querySelectorAll('img')].map(async im=>{ const src=im.getAttribute('src')||''; if(src&&!/^data:/.test(src)){ const d=await dataUrl(src); if(d) im.src=d; else im.style.visibility='hidden'; } }));   // รูปทุกรูปเป็น data URL — ไม่หายใน PDF
    await Promise.all([...el.querySelectorAll('img')].map(im=>im.complete&&im.naturalWidth?0:new Promise(r=>{ im.onload=r; im.onerror=r; setTimeout(r,4000); })));
    const cv=await window.html2canvas(el,{scale:3,useCORS:true,backgroundColor:'#ffffff',logging:false,width:el.offsetWidth,height:el.offsetHeight,windowWidth:el.offsetWidth,scrollX:0,scrollY:0});
    if(i) pdf.addPage('a4','portrait');
    pdf.addImage(cv.toDataURL('image/jpeg',0.93),'JPEG',0,0,210,297,undefined,'FAST');
  }
  } finally { h.remove(); }
  const blob=pdf.output('blob'); if(!blob||blob.size<15000) throw new Error('สร้าง PDF ไม่สำเร็จ (ไฟล์เล็กผิดปกติ)');
  return blob; }
// 👁️ เปิดดู/พิมพ์ (หน้าต่างใหม่ · พิมพ์ = ตัวอักษรคมแบบเวกเตอร์ · ไม่ต้องตั้งขอบเอง)
async function open(pages, title){ await prep(); const w=window.open('','_blank'); if(!w){ toast('เบราว์เซอร์บล็อกหน้าต่างใหม่','warn'); return; }
  w.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>${E(title||'เอกสาร')}</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
   <style>${CSS} body{margin:0;background:#cfd6e0} .gd-page{margin:10px auto;box-shadow:0 4px 18px rgba(0,0,0,.2)} @page{size:A4;margin:0} @media print{ body{background:#fff} .gd-page{margin:0;box-shadow:none;break-after:page} .gd-page:last-child{break-after:auto} } *{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head>
   <body>${pages.map(p=>`<div class="gd-page">${p}</div>`).join('')}</body></html>`); w.document.close(); }
async function save(pages, fname){ const blob=await toBlob(pages); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=String(fname||'document').replace(/[\\/:*?"<>|]+/g,'_').slice(0,120)+'.pdf'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); return blob; }

window.GDOC={ bahtText, engText, prep, toBlob, open, save,
  voucherPages, whtPages, salesPages,
  async voucherBlob(o){ await prep(); const r=await voucherPages(o); return toBlob(r.pages); },
  async whtBlob(d){ await prep(); return toBlob(await whtPages(d)); },
  async salesBlob(kind,d){ await prep(); return toBlob(await salesPages(kind,d)); },
  setLang(l){ try{ ls('doc_lang', l); }catch(e){} }, lang(){ return safe(()=>ls('doc_lang'),'')||'both'; }, company:CO };
})();
