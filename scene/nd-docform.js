/* ══════════════════════════════════════════════════════════════
   📋 เอกสารฟรีแลนซ์ (สัญญา + NDA · สำเนาบัตร · สำเนาบัญชี) จากฟอร์ม Google
   ─ แอดมิน: ดึงคำตอบจากชีทฟอร์ม (หรืออัปโหลด CSV) → จับคู่ทีมงานด้วยชื่อจริง-นามสกุล (สำรอง: อีเมล)
            → เติมข้อมูลเข้าโปรไฟล์ (เลขบัตร · ที่อยู่ · ชื่ออังกฤษ · ลิงก์เอกสาร) + สรุปใครส่ง/ยังไม่ส่ง
   ─ ทีมงานที่ยังไม่ส่ง: แถบแดงบนหัวเว็บ พร้อมลิงก์ฟอร์ม (ส่งแล้ว/ยกเว้น = ไม่ขึ้นอะไร)
   ข้อมูล: s.docForm = {sent, at, checkedAt, exempt} (สถานะ · ทะเบียนทีม)
           s.docContract / s.docIdCopy / s.docBankCopy (ลิงก์เอกสาร · แยกไป staffPrivate ตามระบบเดิม)
   ══════════════════════════════════════════════════════════════ */
(function(){
const FORM_URL='https://forms.gle/nFFKRsLx7yeRMPrx9';
const SHEET_DEF='1ofc8RhVS3zDoI6IczvfhGzlTq2Qp1-Xkhz7i1CICZaw';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(f,d)=>{ try{ const v=f(); return v==null?d:v; }catch(e){ return d; } };
const isAdm=()=>safe(()=>currentUser.role==='admin',false);
const TITLE=/^(นางสาว|นาง|นาย|น\.ส\.|น\.ศ\.|ด\.ช\.|ด\.ญ\.|mr\.?|mrs\.?|ms\.?|miss)\s*/i;
const nkey=s=>String(s||'').trim().replace(TITLE,'').replace(/[\s​]+/g,'').toLowerCase();
const emails=s=>(String(s||'').toLowerCase().match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/g)||[]);
const digits=s=>String(s||'').replace(/\D/g,'');
function lev(a,b){ if(Math.abs(a.length-b.length)>2) return 9; const d=[...Array(b.length+1).keys()];
  for(let i=1;i<=a.length;i++){ let p=d[0]; d[0]=i; for(let j=1;j<=b.length;j++){ const t=d[j]; d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1)); p=t; } } return d[b.length]; }

/* ── อ่านตาราง (CSV / ค่าจากชีท) → แถวคำตอบ ── */
function parseCSV(t){ const out=[]; let row=[], f='', q=false;
  for(let i=0;i<t.length;i++){ const c=t[i];
    if(q){ if(c==='"'){ if(t[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; }
    else if(c==='"') q=true; else if(c===','){ row.push(f); f=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&t[i+1]==='\n') i++; row.push(f); f=''; if(row.some(x=>x!=='')) out.push(row); row=[]; } else f+=c; }
  row.push(f); if(row.some(x=>x!=='')) out.push(row); return out; }
function tsOf(s){ const m=String(s||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):?(\d{2})?/); if(!m) return '';
  let y=+m[3]; if(y>2400) y-=543; return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T${m[4].padStart(2,'0')}:${m[5]}:${m[6]||'00'}`; }
function rowsOf(vals){
  const H=(vals[0]||[]).map(x=>String(x||''));
  const col=keys=>H.findIndex(h=>keys.some(k=>h.indexOf(k)>=0));
  const C={ts:col(['ประทับเวลา','Timestamp']), email:col(['อีเมล','Email']), nick:col(['Nickname','ชื่อเล่น','ชื่อที่ใช้']), th:col(['ภาษาไทย']), en:col(['ภาษาอังกฤษ']),
    id:col(['ประชาชน']), addr:col(['ที่อยู่']), contract:col(['Agreement','สัญญา']), idcopy:col(['สำเนาบัตร']), bank:col(['สำเนาบัญชี'])};
  if(C.th<0) throw new Error('ไม่พบคอลัมน์ "ชื่อ–นามสกุล (ภาษาไทย)" — เช็คว่าเป็นชีทคำตอบของฟอร์มเอกสาร');
  const g=(r,k)=>C[k]>=0?String(r[C[k]]||'').trim():'';
  const by={};
  vals.slice(1).forEach(r=>{ let th=g(r,'th'), id=g(r,'id'); const bad=/^[\d\s-]{10,}$/.test(th);
    if(bad && !digits(id)) id=th;        // กรอกเลขบัตรไว้ในช่องชื่อ
    const x={ts:tsOf(g(r,'ts')), email:g(r,'email'), nick:g(r,'nick'), th:bad?'':th, en:g(r,'en'), id:digits(id), addr:g(r,'addr'),
      contract:g(r,'contract'), idcopy:g(r,'idcopy'), bank:g(r,'bank'), bad};
    if(!x.th && !x.email) return;
    const k=x.th?'N:'+nkey(x.th):'E:'+x.email.toLowerCase();
    if(!by[k] || String(by[k].ts)<String(x.ts)) by[k]=x; });   // ส่งซ้ำ → ใช้คำตอบล่าสุด
  return Object.values(by);
}

/* ── จับคู่กับทะเบียนทีม ── */
function people(){ const m={}; safe(()=>getAllStaff(),[]).forEach(s=>{ if(!s||!s.id) return; const p=m[s.id]||(m[s.id]={id:s.id, s, cats:[]}); p.cats.push(s.category); }); return Object.values(m); }
const fullName=s=>((s.name||'')+(s.lastName?' '+s.lastName:'')).trim();
const statusOf=s=>safe(()=>getStaffStatus(s),'active');
function match(rows){
  const P=people(), byN={}, byE={};
  P.forEach(p=>{ const k=nkey(fullName(p.s)); if(k) (byN[k]=byN[k]||[]).push(p.id); emails(p.s.email).forEach(e=>(byE[e]=byE[e]||[]).push(p.id)); });
  const res=rows.map(r=>{ let ids=r.th?(byN[nkey(r.th)]||[]):[], how='ชื่อจริง';
    if(!ids.length && r.email){ ids=byE[r.email.toLowerCase()]||[]; how='อีเมล'; }
    let near=null;
    if(!ids.length && r.th){ const k=nkey(r.th); let best=9; Object.entries(byN).forEach(([n,v])=>{ if(k.length<6) return; const d=lev(k,n); if(d<best){ best=d; near=v; } }); if(best>2) near=null; }
    return {r, ids, how:ids.length?how:'', near}; });
  return {P, res};
}

/* ── หน้าต่างนำเข้า (แอดมิน) ── */
let LAST=null;
async function importFromSheet(){
  if(!isAdm()) return toast('เฉพาะแอดมิน','error');
  let id=safe(()=>ls('docform_sheet'),'')||SHEET_DEF;
  showLoader(true);
  try{ const d=await callDrive({action:'readSheet', sheetId:id});
    if(!d||!d.values) throw new Error(d&&d.error||'อ่านชีทไม่ได้'); preview(rowsOf(d.values)); }
  catch(e){ toast('ดึงจากชีทไม่ได้ ('+e.message+') — ใช้ "📄 อัปโหลด CSV" แทน หรืออัปเดต Apps Script จัดไฟล์ไดรฟ์ตัวใหม่','warn'); }
  finally{ showLoader(false); }
}
function importCSV(){
  if(!isAdm()) return toast('เฉพาะแอดมิน','error');
  const i=document.createElement('input'); i.type='file'; i.accept='.csv,text/csv';
  i.onchange=()=>{ const f=i.files[0]; if(!f) return; const fr=new FileReader();
    fr.onload=()=>{ try{ preview(rowsOf(parseCSV(String(fr.result).replace(/^﻿/,'')))); }catch(e){ toast(e.message,'error'); } }; fr.readAsText(f,'utf-8'); };
  i.click();
}
function preview(rows){
  const {P,res}=match(rows); LAST={P,res};
  const hit=new Set(); res.forEach(x=>x.ids.forEach(i=>hit.add(i)));
  const act=P.filter(p=>statusOf(p.s)!=='resigned');
  const miss=act.filter(p=>!hit.has(p.id) && !(p.s.docForm&&p.s.docForm.exempt));
  const lab=p=>(p.s.nickname||'')+' · '+fullName(p.s)+(p.cats.length?' ['+p.cats.map(c=>safe(()=>CATS[c].label,c)).join('/')+']':'');
  const labMap={}; P.forEach(p=>{ labMap[lab(p)]=p.id; });
  const opts=Object.keys(labMap).sort((a,b)=>a.localeCompare(b,'th')).map(l=>`<option value="${E(l)}"></option>`).join('');
  const row=(x,i)=>{ const r=x.r; const who=x.ids.map(id=>{ const p=P.find(q=>q.id===id); return p?E(p.s.nickname||'')+' · '+E(fullName(p.s)):id; }).join('<br>');
    return `<tr><td>${E(r.nick)}</td><td>${E(r.th||'—')}${r.bad?' <span style="color:var(--orange)">(กรอกเลขบัตรในช่องชื่อ)</span>':''}<div style="font-size:11px;color:var(--text2)">${E(r.email)}</div></td>
      <td>${x.ids.length?`✅ ${who}<div style="font-size:11px;color:var(--text2)">จับคู่ด้วย${x.how}</div>`:`<input class="df-pick" data-i="${i}" list="df-dl" autocomplete="off" placeholder="🔍 พิมพ์ชื่อเล่น / ชื่อจริง เพื่อค้นหา (เว้นว่าง = ไม่ผูก)" style="width:100%;max-width:300px;padding:6px 8px;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-family:Kanit;font-size:12.5px"><div class="df-pick-ok" style="font-size:11px;margin-top:2px"></div>${x.near?'<div style="font-size:11px;color:var(--orange)">ชื่อใกล้เคียง — เลือกไว้ให้แล้ว ตรวจก่อนบันทึก</div>':''}`}</td>
      <td style="font-size:11px">${[r.contract&&'สัญญา',r.idcopy&&'บัตร',r.bank&&'บัญชี'].filter(Boolean).join(' · ')||'—'}</td></tr>`; };
  const un=res.filter(x=>!x.ids.length).length;
  const ov=document.createElement('div'); ov.id='df-ov'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:4000;display:flex;align-items:center;justify-content:center;padding:14px';
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  ov.innerHTML=`<div style="background:var(--card);border:1px solid var(--border2);border-radius:14px;width:min(980px,100%);max-height:90vh;display:flex;flex-direction:column;font-family:Kanit;overflow:hidden">
    <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border2)"><b style="font-size:16px">📋 นำเข้าเอกสารฟรีแลนซ์จากฟอร์ม</b><button class="btn btn-sm btn-outline" style="margin-left:auto" onclick="document.getElementById('df-ov').remove()">✕ ปิด</button></div>
    <datalist id="df-dl">${opts}</datalist>
    <div style="overflow:auto;padding:12px 16px;flex:1">
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <span class="badge" style="padding:6px 10px;border-radius:8px;background:rgba(0,223,160,.12);color:var(--green)">✅ ส่งแล้ว ${hit.size} คน</span>
      <span style="padding:6px 10px;border-radius:8px;background:rgba(255,64,64,.12);color:var(--red)">❌ ยังไม่ส่ง ${miss.length} คน</span>
      <span style="padding:6px 10px;border-radius:8px;background:rgba(255,158,0,.12);color:var(--orange)">⚠️ คำตอบที่ยังจับคู่ไม่ได้ ${un} แถว</span>
      <span style="padding:6px 10px;border-radius:8px;background:var(--bg2);color:var(--text2)">คำตอบในฟอร์ม ${rows.length} คน (ส่งซ้ำใช้อันล่าสุด)</span></div>
    <label style="display:flex;gap:6px;align-items:center;font-size:12.5px;margin-bottom:8px"><input type="checkbox" id="df-over"> เขียนทับเลขบัตร / ที่อยู่ / ชื่ออังกฤษเดิมด้วยข้อมูลจากฟอร์ม <span style="color:var(--text2)">(ไม่ติ๊ก = เติมเฉพาะช่องที่ยังว่าง)</span></label>
    <table style="width:100%;font-size:12.5px"><thead><tr><th>ชื่อเล่น (ฟอร์ม)</th><th>ชื่อจริง (ฟอร์ม)</th><th>ทีมงานในเว็บ</th><th>เอกสาร</th></tr></thead>
      <tbody>${res.map((x,i)=>[x,i]).sort((a,b)=>(a[0].ids.length?1:0)-(b[0].ids.length?1:0)).map(([x,i])=>row(x,i)).join('')}</tbody></table>
    <div style="margin-top:12px"><b style="color:var(--red)">❌ ทีมงานที่ยังไม่ส่ง (${miss.length})</b> <span style="font-size:11.5px;color:var(--text2)">· ไม่รวมคนที่ลาออก · กด "ยกเว้น" สำหรับคนที่ไม่ต้องส่ง (เช่น เจ้าของ)</span>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px;margin-top:6px">${miss.map(p=>`<div style="display:flex;gap:6px;align-items:center;padding:6px 8px;border:1px solid var(--border2);border-radius:8px;font-size:12px"><div style="flex:1;min-width:0"><b>${E(p.s.nickname||'')}</b><div style="color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${E(fullName(p.s))}</div></div><label style="font-size:11px;white-space:nowrap"><input type="checkbox" class="df-ex" value="${E(p.id)}"> ยกเว้น</label></div>`).join('')}</div></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;padding:10px 16px;border-top:1px solid var(--border2);flex-wrap:wrap;background:var(--card)"><span id="df-cnt" style="margin-right:auto;font-size:12px;color:var(--text2);align-self:center"></span><button class="btn btn-sm btn-outline" onclick="DOCFORM.copyMissing()">📋 คัดลอกรายชื่อคนที่ยังไม่ส่ง</button><button class="btn btn-sm btn-blue" id="df-save" onclick="DOCFORM.apply()">💾 บันทึกเข้าเว็บ + เปิดแจ้งเตือนคนที่ยังไม่ส่ง</button></div></div>`;
  document.getElementById('df-ov')?.remove(); document.body.appendChild(ov);
  LAST.labMap=labMap;
  const chk=inp=>{ const ok=inp.nextElementSibling; const v=inp.value.trim(); if(!ok) return; ok.textContent=!v?'':labMap[v]?'✅ ผูกกับคนนี้':'⚠️ ยังไม่ตรงกับรายชื่อ — เลือกจากรายการที่ขึ้น'; ok.style.color=labMap[v]?'var(--green)':'var(--orange)'; };
  ov.querySelectorAll('.df-pick').forEach(inp=>{ inp.addEventListener('input',()=>chk(inp)); inp.addEventListener('change',()=>chk(inp)); });
  res.forEach((x,i)=>{ if(!x.ids.length && x.near && x.near.length===1){ const s=ov.querySelector(`.df-pick[data-i="${i}"]`); const p=P.find(q=>q.id===x.near[0]); if(s&&p){ s.value=lab(p); chk(s); } } });
  LAST.miss=miss;
  const cnt=()=>{ const n=ov.querySelectorAll('.df-ex:checked').length; const c=ov.querySelector('#df-cnt'); if(c) c.textContent='ยังไม่ส่ง '+(miss.length-n)+' คน'+(n?' · ยกเว้น '+n:''); };
  ov.querySelectorAll('.df-ex').forEach(c=>c.addEventListener('change',cnt)); cnt();
}
function apply(){
  if(!LAST) return; const ov=document.getElementById('df-ov'); if(!ov) return;
  const btn=ov.querySelector('#df-save'); if(btn){ if(btn.disabled) return; btn.disabled=true; btn.textContent='⏳ กำลังบันทึก…'; }
  setTimeout(()=>{ try{ applyRun(ov); }catch(e){ console.error('docform apply',e); showLoader(false); if(btn){ btn.disabled=false; btn.textContent='💾 บันทึกเข้าเว็บ + เปิดแจ้งเตือนคนที่ยังไม่ส่ง'; } toast('บันทึกไม่สำเร็จ: '+(e&&e.message||e),'error'); } }, 30);
}
function applyRun(ov){
  const over=!!ov.querySelector('#df-over')?.checked;
  ov.querySelectorAll('.df-pick').forEach(s=>{ const x=LAST.res[+s.dataset.i]; const id=(LAST.labMap||{})[s.value.trim()]; if(x && id){ x.ids=[id]; x.how='เลือกเอง'; } });
  const ex=new Set([...ov.querySelectorAll('.df-ex:checked')].map(c=>c.value));
  const byId={}; LAST.res.forEach(x=>x.ids.forEach(id=>{ if(!byId[id]||String(byId[id].ts)<String(x.r.ts)) byId[id]=x.r; }));
  const now=new Date().toISOString(), d=getStaffData(); let nS=0, nM=0;
  Object.keys(d||{}).forEach(cat=>{ const arr=Array.isArray(d[cat])?d[cat]:Object.values(d[cat]||{});
    arr.filter(Boolean).forEach(s=>{ const r=byId[s.id];
      if(r){ const pf=s.profile=(s.profile&&typeof s.profile==='object')?s.profile:{}; const put=(o,k,v)=>{ if(v && (over||!o[k])) o[k]=v; };
        if(r.id && (over || !(s.taxId||pf.taxId))){ pf.taxId=r.id; s.taxId=r.id; }
        if(r.addr && (over || !(s.addr||s.address||pf.addr))){ pf.addr=r.addr; s.addr=r.addr; }
        put(pf,'nameEn',r.en);
        if(r.contract) s.docContract=r.contract; if(r.idcopy) s.docIdCopy=r.idcopy; if(r.bank) s.docBankCopy=r.bank;
        s.docForm={sent:true, at:r.ts||now, checkedAt:now}; nS++; }
      else if(ex.has(s.id)) s.docForm={sent:false, exempt:true, checkedAt:now};
      else if(!(s.docForm&&(s.docForm.sent||s.docForm.exempt)) && statusOf(s)!=='resigned'){ s.docForm={sent:false, checkedAt:now}; nM++; } });
    d[cat]=arr; });
  const exList=new Set(ex); LAST.exSet=exList; ov.remove(); showLoader(true);
  Promise.resolve(saveStaffData(d)).catch(e=>toast('บันทึกขึ้นระบบไม่สำเร็จ: '+(e&&e.message||e),'error')).finally(()=>showLoader(false));
  try{ fbSaveKeyed('docform_meta',{at:now}); }catch(e){}
  try{ logAudit('staff.docform','ฟอร์มเอกสาร','นำเข้าเอกสารฟรีแลนซ์ · ส่งแล้ว '+Object.keys(byId).length+' คน'); }catch(e){}
  toast('💾 บันทึกแล้ว · ส่งแล้ว '+Object.keys(byId).length+' คน · ยังไม่ส่ง '+new Set(LAST.miss.filter(p=>!byId[p.id]&&!ex.has(p.id)).map(p=>p.id)).size+' คน (ขึ้นแถบแดงให้แล้ว)','success');
  banner(); try{ renderStatusBox(); }catch(e){}
}
// ชื่อจริงอย่างเดียว (ตัดคำนำหน้า + นามสกุล)
const firstName=s=>String(s.name||'').trim().replace(TITLE,'').trim().split(/\s+/)[0]||'';
// คัดลอกรายชื่อคนที่ยังไม่ส่ง: ไม่รวมคนที่ติ๊กยกเว้น · คนเดียวกันหลายรายชื่อนับครั้งเดียว · "ชื่อเล่น (ชื่อจริง)"
function copyMissing(){ const ov=document.getElementById('df-ov'); const ex=ov?new Set([...ov.querySelectorAll('.df-ex:checked')].map(c=>c.value)):(LAST&&LAST.exSet)||new Set();
  const seen=new Set(); const L=((LAST&&LAST.miss)||[]).filter(p=>!ex.has(p.id)).filter(p=>{ const k=nkey(fullName(p.s))||p.id; if(seen.has(k)) return false; seen.add(k); return true; });
  const t='รายชื่อทีมงานที่ยังไม่ส่งเอกสาร (สัญญา + สำเนาบัตร + สำเนาบัญชี)\nส่งได้ที่ '+FORM_URL+'\n\n'+L.map((p,i)=>(i+1)+'. '+(p.s.nickname||'')+' ('+firstName(p.s)+')').join('\n');
  navigator.clipboard.writeText(t).then(()=>toast('📋 คัดลอกรายชื่อแล้ว','success'),()=>prompt('คัดลอกข้อความนี้',t)); }

/* ── สถานะในหน้าตั้งค่า (แอดมิน) ── */
function renderStatusBox(){ const el=document.getElementById('docform-status'); if(!el) return;
  const P=people().filter(p=>statusOf(p.s)!=='resigned'), sent=P.filter(p=>p.s.docForm&&p.s.docForm.sent), ex=P.filter(p=>p.s.docForm&&p.s.docForm.exempt), miss=P.filter(p=>p.s.docForm&&!p.s.docForm.sent&&!p.s.docForm.exempt), unk=P.filter(p=>!p.s.docForm);
  el.innerHTML=`<div style="font-size:12.5px;margin-top:6px">✅ ส่งแล้ว <b>${sent.length}</b> · ❌ ยังไม่ส่ง <b style="color:var(--red)">${miss.length}</b> · ยกเว้น ${ex.length}${unk.length?` · ยังไม่ได้ตรวจ ${unk.length} (คนที่เพิ่มหลังนำเข้าครั้งล่าสุด — กดดึงใหม่)`:''}</div>
    ${miss.length?`<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12.5px">ดูรายชื่อคนที่ยังไม่ส่ง</summary><div style="font-size:12px;margin-top:6px;line-height:1.8">${miss.map(p=>`<span style="display:inline-block;margin:0 6px 4px 0;padding:2px 8px;border-radius:6px;background:rgba(255,64,64,.1)">${E(p.s.nickname||'')} · ${E(fullName(p.s))} <a href="#" style="color:var(--text2)" onclick="event.preventDefault();DOCFORM.exempt('${E(p.id)}')" title="ไม่ต้องส่ง">ยกเว้น</a></span>`).join('')}</div></details>`:''}`; }
function exempt(id){ if(!confirm('ยกเว้นคนนี้ไม่ต้องส่งเอกสาร?')) return; try{ _updateStaffRecords(id, s=>{ s.docForm={sent:false, exempt:true, checkedAt:new Date().toISOString()}; }); }catch(e){} renderStatusBox(); banner(); }

/* ── แถบแดงบนหัวเว็บ ── */
function banner(){
  const u=safe(()=>currentUser,null); let html='';
  if(u && u.role!=='admin' && u.staffId){
    const mine=safe(()=>getAllStaff(),[]).filter(s=>s.id===u.staffId);
    const need=mine.length && mine.some(s=>s.docForm && s.docForm.sent===false && !s.docForm.exempt) && !mine.some(s=>s.docForm&&(s.docForm.sent||s.docForm.exempt));
    if(need) html=`⚠️ <b>คุณยังไม่ได้ส่งเอกสารสัญญา / สำเนาบัตรประชาชน / สำเนาบัญชี</b> — กรุณาส่งฟอร์มเอกสารที่ <a href="${FORM_URL}" target="_blank" rel="noopener" style="color:#fff;text-decoration:underline;font-weight:800">${FORM_URL}</a>`;
  } else if(u && u.role==='admin' && !sessionStorage.getItem('df_hide')){
    const n=people().filter(p=>statusOf(p.s)!=='resigned' && p.s.docForm && !p.s.docForm.sent && !p.s.docForm.exempt).length;
    if(n) html=`⚠️ ทีมงาน <b>${n} คน</b> ยังไม่ส่งเอกสารฟรีแลนซ์ <a href="#" onclick="event.preventDefault();DOCFORM.open()" style="color:#fff;text-decoration:underline;font-weight:800">ดูรายชื่อ / ดึงคำตอบล่าสุด</a> <a href="#" onclick="event.preventDefault();sessionStorage.setItem('df_hide','1');DOCFORM.banner()" style="color:#fff;opacity:.75;margin-left:8px">ซ่อน</a>`;
  }
  let b=document.getElementById('df-banner');
  if(!html){ b?.remove(); return; }
  if(!b){ b=document.createElement('div'); b.id='df-banner'; b.style.cssText='position:sticky;top:0;z-index:3500;background:#d92b2b;color:#fff;font-family:Kanit;font-size:13.5px;padding:9px 16px;text-align:center;line-height:1.5;box-shadow:0 2px 10px rgba(0,0,0,.35)'; document.body.insertBefore(b, document.body.firstChild); }
  b.innerHTML=html;
}
window.addEventListener('guindatachange', e=>{ if(e.detail&&e.detail.key==='staff_v3') setTimeout(()=>{ banner(); renderStatusBox(); },50); });
setInterval(()=>{ banner(); renderStatusBox(); }, 60000); setTimeout(()=>{ banner(); renderStatusBox(); }, 3000);
document.addEventListener('click', e=>{ if(e.target.closest&&e.target.closest('[onclick*="setpane-tools"],[data-pane="tools"]')) setTimeout(renderStatusBox,100); }, true);

window.DOCFORM={ open:()=>{ const el=document.getElementById('docform-status'); importFromSheet(); }, fromSheet:importFromSheet, fromCSV:importCSV, apply, copyMissing, exempt, banner, renderStatusBox, FORM_URL };
})();
