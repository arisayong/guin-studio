/* ══════════════════════════════════════════════════════════════
   📝 nd-register.js — ฟอร์มสมัครทีมหลัก "Team Registration Form"
   ดึงคำตอบจากชีททุก 10 นาที (แอดมิน) ผ่าน Apps Script จัดไฟล์ไดรฟ์ (readSheet)
   ─ คนใหม่ → เพิ่มเข้าทีมตามตำแหน่งที่เลือก + เอกสาร/บัญชีครบในครั้งเดียว
   ─ คนเดิม (ชื่อ / อีเมล / เลขบัตรตรง) → เติมเฉพาะช่องว่าง (เว็บชนะชีท) + เก็บลิงก์เอกสาร
   ─ ไม่แน่ใจ (ชื่อใกล้เคียง · ไม่รู้ตำแหน่ง · อยู่ในรายชื่อบล็อก) → รอแอดมินตรวจ ไม่เพิ่มเอง
   misc/reg_done = {แถวที่จัดการแล้ว: {at, id}} — เก็บแค่รหัสแถว ไม่เก็บข้อมูลส่วนตัว
   ══════════════════════════════════════════════════════════════ */
(function(){
const SHEET_DEF='1_9qdHzFNDJqvF94YVSUthTj9b7FQ5VmSEt-MWyjg0Bg';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(f,d)=>{ try{ const v=f(); return v==null?d:v; }catch(e){ return d; } };
const isAdm=()=>safe(()=>currentUser.role==='admin',false);
const TITLE=/^(นางสาว|นาง|นาย|น\.ส\.|น\.ศ\.|ด\.ช\.|ด\.ญ\.|mr\.?|mrs\.?|ms\.?|miss)\s*/i;
const nkey=s=>String(s||'').trim().replace(TITLE,'').replace(/[\s​]+/g,'').toLowerCase();
const emails=s=>(String(s||'').toLowerCase().match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/g)||[]);
const digits=s=>String(s||'').replace(/\D/g,'');
const hash=s=>{ let h=5381; for(const c of String(s)) h=(h*33+c.charCodeAt(0))>>>0; return h.toString(36); };
function lev(a,b){ if(Math.abs(a.length-b.length)>2) return 9; const d=[...Array(b.length+1).keys()];
  for(let i=1;i<=a.length;i++){ let p=d[0]; d[0]=i; for(let j=1;j<=b.length;j++){ const t=d[j]; d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1)); p=t; } } return d[b.length]; }
function tsMs(s){ const m=String(s||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):?(\d{2})?/); if(!m) return 0;
  let y=+m[3]; if(y>2400) y-=543; return new Date(y,+m[2]-1,+m[1],+m[4],+m[5],+(m[6]||0)).getTime(); }
// ตำแหน่งในฟอร์ม → หมวดในเว็บ (อ่านจากคำในตัวเลือก รองรับตัวเลือกที่เขียนต่างกันเล็กน้อย)
function catsOf(t){ t=String(t||'').toLowerCase(); const o=[];
  [['dubbing',/dubbing|พากย์/],['adaptation',/adaptation|สคริปต์|เกลา/],['mix',/\bmix|มิกซ์/],['qc',/\bqc\b|ตรวจสอบคุณภาพ/],['subVideo',/subtitl|sub\s*&|ซับ|วิดีโอ/],['translation',/translat|นักแปล|แปลภาษา/]]
    .forEach(([c,r])=>{ if(r.test(t)) o.push(c); }); return o; }

/* ── ตารางคำตอบ → แถว ── */
function rowsOf(vals){
  const H=(vals[0]||[]).map(x=>String(x||'').trim());
  const col=(...k)=>H.findIndex(h=>k.some(x=>h.indexOf(x)>=0));
  const C={ts:col('ประทับเวลา','Timestamp'), mail1:H.indexOf('ที่อยู่อีเมล'), mail2:H.indexOf('อีเมล'), nick:col('Nickname'), th:col('ภาษาไทย'), en:col('ภาษาอังกฤษ'), gender:col('เพศ'), pos:col('ตำแหน่ง'),
    demo:col('ตัวอย่างผลงาน'), social:col('โซเชียล'), phone:col('เบอร์โทร'), id:col('ประชาชน'), addr:col('ที่อยู่สำหรับ'), contract:col('Agreement'), idcopy:col('สำเนาบัตร'), bankcopy:col('สำเนาบัญชี'),
    bank:col('ธนาคารรับเงิน'), account:col('เลขที่บัญชี'), accName:col('เจ้าของบัญชี'), qr:col('QR'), studio:col('สะดวกเดินทาง')};
  if(C.th<0||C.ts<0) throw new Error('ไม่พบคอลัมน์ของฟอร์มสมัครทีม — หัวตารางถูกเปลี่ยนหรือไม่');
  const g=(r,k)=>C[k]>=0?String(r[C[k]]||'').trim():'';
  return vals.slice(1).map(r=>{ const x={}; Object.keys(C).forEach(k=>x[k]=g(r,k)); x.email=(x.mail2||x.mail1).toLowerCase(); x.ms=tsMs(x.ts); x.th=x.th.replace(/\s+/g,' ');
    x.idn=digits(x.id); x.cats=catsOf(x.pos); x.key=hash(x.ts+'|'+x.email+'|'+nkey(x.th)); return x; }).filter(x=>x.th||x.email).sort((a,b)=>a.ms-b.ms);
}

/* ── จับคู่กับทะเบียน (รวมคนลาออก/พักงาน — ไม่สร้างซ้ำ) ── */
function index(){ const by={}, n={}, e={}, t={}, add=(m,k,id)=>{ if(k) (m[k]=m[k]||new Set()).add(id); };
  Object.values(getStaffData()).forEach(a=>a.forEach(s=>{ if(!s||!s.id) return; by[s.id]=s;
    add(n,nkey((s.name||'')+(s.lastName?' '+s.lastName:'')),s.id); emails(s.email).forEach(x=>add(e,x,s.id)); add(t,digits(s.taxId||(s.profile&&s.profile.taxId)),s.id); }));
  return {by,n,e,t}; }
function find(ix,r){ const hit=[...(r.idn&&ix.t[r.idn]||[]), ...(r.email&&ix.e[r.email]||[]), ...(r.th&&ix.n[nkey(r.th)]||[])];
  if(hit.length) return {ids:[...new Set(hit)]};
  const k=nkey(r.th); let best=9, near=null; if(k.length>=6) Object.entries(ix.n).forEach(([x,v])=>{ const d=lev(k,x); if(d<best){ best=d; near=[...v]; } });
  return best<=2?{ids:[],near}:{ids:[]}; }

/* ── บันทึกลงเรคคอร์ด ── */
const filesOk=r=>!!(r.contract&&r.idcopy&&r.bankcopy);
function docState(s,r,now){ if(r.contract) s.docContract=r.contract; if(r.idcopy) s.docIdCopy=r.idcopy; if(r.bankcopy) s.docBankCopy=r.bankcopy;
  if(filesOk(r)) s.docForm={sent:true, at:r.ms?new Date(r.ms).toISOString():now, checkedAt:now}; else if(!(s.docForm&&(s.docForm.sent||s.docForm.exempt))) s.docForm={sent:false, checkedAt:now}; }
function fillBlank(s,r,now){ const blank=v=>safe(()=>_isBlankVal(v),!v), pf=s.profile=(s.profile&&typeof s.profile==='object')?s.profile:{};
  const put=(o,k,v)=>{ if(v && blank(o[k])) o[k]=v; };
  put(s,'gender',r.gender); put(s,'social',r.social); put(s,'phone',r.phone); put(s,'bank',r.bank); put(s,'account',digits(r.account)||r.account); put(s,'accName',r.accName); put(s,'qrUrl',r.qr);
  if(r.idn && !s.taxId && !pf.taxId){ s.taxId=r.idn; pf.taxId=r.idn; }
  if(r.addr && !s.addr && !s.address && !pf.addr){ s.addr=r.addr; pf.addr=r.addr; }
  put(pf,'nameEn',r.en); put(pf,'studioTravel',r.studio);
  if(blank(s.demoLinks) && !s.demoNote && r.demo){ const u=safe(()=>_extractUrls(r.demo),[]); if(u.length) s.demoLinks=u; else s.demoNote=r.demo; }
  docState(s,r,now); }
function newRec(r,cats,now){ const u=safe(()=>_extractUrls(r.demo),[]), idStr='RG'+(r.ms||Date.now())+'_'+r.key.slice(0,4);
  const s={id:idStr, name:r.th, nickname:r.nick||r.th, gender:r.gender, email:r.email, social:r.social, phone:r.phone, bank:r.bank, account:digits(r.account)||r.account, accName:r.accName, promptpay:'', qrUrl:r.qr,
    demoLinks:u, demoNote:!u.length&&r.demo?r.demo:'', categories:cats, joinedAt:r.ms?new Date(r.ms).toISOString():now, regForm:true, taxId:r.idn, addr:r.addr,
    profile:{nameEn:r.en, taxId:r.idn, addr:r.addr, studioTravel:r.studio}};
  docState(s,r,now); return s; }

/* ── ดึงคำตอบ ── */
let DONE=null, PEND=[], LAST={at:'',err:'',n:0}, BUSY=false;
async function loadDone(){ if(DONE) return DONE; DONE=(await fbLoadKeyed('reg_done'))||{}; return DONE; }
async function excludedList(){ const db=safe(()=>_fbDatabase,null); if(!db) return []; try{ const s=await db.ref('staff_excluded').get(); return Object.values(s.val()||{}).filter(Boolean); }catch(e){ return []; } }
async function pull(opts){ const silent=!!(opts&&opts.silent);
  if(!isAdm()) return; if(BUSY) return; BUSY=true; if(!silent) showLoader(true);
  try{
    const res=await callDrive({action:'readSheet', sheetId:safe(()=>ls('regsheet'),'')||SHEET_DEF});
    if(!res||!res.values) throw new Error((res&&res.error)||'อ่านชีทไม่ได้');
    const rows=rowsOf(res.values), done=await loadDone(), ex=await excludedList(), now=new Date().toISOString();
    const exE=new Set(ex.flatMap(x=>emails(x.email))), exN=new Set(ex.map(x=>nkey(x.name)).filter(Boolean));
    const d=getStaffData(); let added=[], merged=0, ch=false; const pend=[];
    rows.filter(r=>!done[r.key]).forEach(r=>{ const ix=index(), m=find(ix,r);
      if(m.ids.length){ let live=0; Object.values(d).forEach(a=>a.forEach(s=>{ if(m.ids.includes(s.id)){ fillBlank(s,r,now); live++; } })); if(live){ merged++; ch=true; done[r.key]={at:now,id:m.ids[0]}; } return; }
      const why=exE.has(r.email)||exN.has(nkey(r.th))?'อยู่ในรายชื่อที่บล็อกไว้':m.near?'ชื่อใกล้เคียงกับคนในทีม':!r.cats.length?'ไม่รู้ตำแหน่งงาน':!r.th?'ไม่มีชื่อจริง':'';
      if(why){ pend.push({...r, why, near:m.near||null}); return; }
      const s=newRec(r,r.cats,now); r.cats.forEach(c=>{ (d[c]=d[c]||[]).push({...s,category:c}); }); ls('staff_v3',d); added.push(s.nickname); ch=true; done[r.key]={at:now,id:s.id}; });
    if(ch){ await saveStaffData(d); await fbSaveKeyed('reg_done',done); }
    const newPend=pend.length>PEND.length; PEND=pend; LAST={at:now,err:'',n:rows.length};
    if(added.length){ toast('🎉 สมาชิกใหม่จากฟอร์มสมัคร '+added.length+' คน: '+added.slice(0,5).join(', '),'success');
      try{ await addNotificationToAdmins({type:'staff_added',title:'➕ มีสมาชิกใหม่',text:'จากฟอร์มสมัครทีม '+added.length+' คน: '+added.slice(0,5).join(', ')}); }catch(e){} }
    if(newPend) toast('📝 ฟอร์มสมัครมี '+pend.length+' คำตอบรอตรวจ — ⚙️ ตั้งค่า › เครื่องมือ','warn');
    if(!silent && !added.length && !newPend) toast('✅ ดึงแล้ว · คำตอบทั้งหมด '+rows.length+' · เติมข้อมูลคนเดิม '+merged+' คน','success');
  }catch(e){ LAST={...LAST,err:String(e&&e.message||e)}; console.warn('reg pull',e); if(!silent) toast('ดึงฟอร์มสมัครไม่ได้: '+LAST.err+' — เช็คว่าอัปเดต Apps Script จัดไฟล์ไดรฟ์แล้ว','error'); }
  finally{ BUSY=false; if(!silent) showLoader(false); box(); }
}

/* ── แถวในหน้าตั้งค่า + หน้าต่างตรวจคำตอบ ── */
function box(){ const el=document.getElementById('regform-status'); if(!el) return;
  el.innerHTML=`<div style="font-size:12.5px;margin-top:6px">${LAST.err?`<span style="color:var(--red)">⚠️ ดึงล่าสุดไม่สำเร็จ: ${E(LAST.err)}</span>`:LAST.at?`ดึงล่าสุด ${new Date(LAST.at).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} · คำตอบทั้งหมด ${LAST.n}`:'ระบบดึงให้เองทุก 10 นาทีขณะแอดมินเปิดเว็บ'}${PEND.length?` · <a href="#" style="color:var(--orange);font-weight:700" onclick="event.preventDefault();REGFORM.review()">📝 รอตรวจ ${PEND.length} คำตอบ</a>`:''}</div>`; }
function review(){ document.getElementById('reg-ov')?.remove(); if(!PEND.length){ toast('ไม่มีคำตอบรอตรวจ','info'); return; }
  const ix=index(), lab=s=>(s.nickname||'')+' · '+(s.name||''), labs={}; Object.values(ix.by).forEach(s=>labs[lab(s)]=s.id);
  const catOpt=Object.keys(CATS).filter(c=>c!=='manager').map(c=>`<option value="${c}">${E(CATS[c].label)}</option>`).join('');
  const ov=document.createElement('div'); ov.id='reg-ov'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:4000;display:flex;align-items:center;justify-content:center;padding:14px'; ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  const inp='padding:6px 8px;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-family:Kanit;font-size:12.5px';
  ov.innerHTML=`<div style="background:var(--card);border:1px solid var(--border2);border-radius:14px;width:min(860px,100%);max-height:88vh;display:flex;flex-direction:column;font-family:Kanit;overflow:hidden">
    <div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border2)"><b style="font-size:16px">📝 คำตอบฟอร์มสมัครที่รอตรวจ</b><button class="btn btn-sm btn-outline" style="margin-left:auto" onclick="document.getElementById('reg-ov').remove()">✕ ปิด</button></div>
    <datalist id="reg-dl">${Object.keys(labs).sort((a,b)=>a.localeCompare(b,'th')).map(l=>`<option value="${E(l)}"></option>`).join('')}</datalist>
    <div style="overflow:auto;padding:8px 16px">${PEND.map((r,i)=>{ const n=r.near&&ix.by[r.near[0]]; return `<div style="padding:10px 0;border-bottom:1px solid var(--border2)"><b>${E(r.nick||'—')}</b> · ${E(r.th||'—')} <span style="font-size:11.5px;color:var(--text2)">${E(r.email)}</span>
      <div style="font-size:12px;color:var(--orange);margin:2px 0 6px">⚠️ ${E(r.why)} · ตำแหน่งในฟอร์ม: ${E(r.pos||'—')}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><input id="reg-m${i}" list="reg-dl" style="${inp};flex:1;min-width:220px" placeholder="🔍 พิมพ์ชื่อ เพื่อผูกกับคนในทีม" value="${n?E(lab(n)):''}"><button class="btn btn-xs btn-blue" onclick="REGFORM.link(${i})">ผูกกับคนนี้</button>
      <select id="reg-c${i}" style="${inp}">${r.cats.length?`<option value="">ตามฟอร์ม</option>`:''}${catOpt}</select><button class="btn btn-xs btn-outline" onclick="REGFORM.addNew(${i})">➕ เพิ่มเป็นคนใหม่</button><button class="btn btn-xs btn-outline" style="color:var(--red)" onclick="REGFORM.skip(${i})">ไม่รับ</button></div></div>`; }).join('')}</div></div>`;
  ov._labs=labs; document.body.appendChild(ov); }
async function finish(i,id){ const r=PEND[i]; const done=await loadDone(); done[r.key]={at:new Date().toISOString(),id:id||'skip'}; await fbSaveKeyed('reg_done',done); PEND.splice(i,1); box(); document.getElementById('reg-ov')?.remove(); if(PEND.length) review(); }
async function link(i){ const ov=document.getElementById('reg-ov'), id=ov&&ov._labs[(document.getElementById('reg-m'+i)?.value||'').trim()]; if(!id){ toast('เลือกชื่อจากรายการที่ขึ้น','warn'); return; }
  const now=new Date().toISOString(), d=getStaffData(); Object.values(d).forEach(a=>a.forEach(s=>{ if(s.id===id) fillBlank(s,PEND[i],now); })); await saveStaffData(d); toast('ผูกกับทีมงานแล้ว','success'); await finish(i,id); }
async function addNew(i){ const r=PEND[i], c=document.getElementById('reg-c'+i)?.value, cats=c?[c]:r.cats; if(!cats.length){ toast('เลือกตำแหน่งก่อน','warn'); return; }
  const now=new Date().toISOString(), d=getStaffData(), s=newRec(r,cats,now); cats.forEach(k=>{ (d[k]=d[k]||[]).push({...s,category:k}); }); await saveStaffData(d); toast('🎉 เพิ่ม '+s.nickname+' เข้าทีมแล้ว','success'); await finish(i,s.id); }
async function skip(i){ if(confirm('ไม่รับคำตอบนี้? (ไม่เพิ่มเข้าทีม และจะไม่ถามซ้ำ)')) await finish(i,''); }

// 🛡️ ซิงค์ฟอร์มเก่า: เก็บสมาชิกจากฟอร์มใหม่ไว้ แล้วคืนให้ถ้าหายจากทะเบียน
function snap(){ const m={}; Object.entries(getStaffData()).forEach(([c,a])=>a.forEach(s=>{ if(s&&s.regForm) (m[c]=m[c]||[]).push(JSON.parse(JSON.stringify(s))); })); return m; }
function restore(m){ const d=getStaffData(); let n=0; Object.entries(m||{}).forEach(([c,a])=>a.forEach(s=>{ if(!(d[c]=d[c]||[]).some(x=>x&&x.id===s.id)){ d[c].push(s); n++; } })); return n?{d,n}:null; }

window.REGFORM={ pull, box, review, link, addNew, skip, snap, restore };
setTimeout(()=>{ if(isAdm()) pull({silent:true}); }, 15000);
document.addEventListener('click', e=>{ if(e.target.closest&&e.target.closest('[onclick*="setpane-tools"],[data-pane="tools"]')) setTimeout(box,100); }, true);
setTimeout(box,3000);
})();
