/* ══════════════════════════════════════════════════════════════
   🎨 หน้าโปรไฟล์ใหม่ (สต๊าฟ/เมเนเจอร์แก้เอง + แอดมินดู/แก้ข้อมูลคนในทีม) — ใช้หน้าตาเดียวกัน
   ที่เก็บข้อมูล (ไม่ต้องแก้สิทธิ์ Firebase):
   • สต๊าฟแก้เอง → users/<uid>/profile (+ nickname, photoURL/photoAt, roleReq) — สิทธิ์เดิมให้เจ้าของบัญชีเขียนได้ (ยกเว้น role)
   • แอดมินแก้   → ทะเบียนทีม staff/<หมวด>[] (เหมือนเดิม) + สำเนาไป users/<uid>/profile ให้สต๊าฟเห็นค่าเดียวกัน
   • เมื่อแอดมินเปิดเว็บ ระบบนำข้อมูลที่สต๊าฟแก้เองเข้าทะเบียนทีมให้อัตโนมัติ (ใบสำคัญจ่ายใช้ข้อมูลใหม่) — ถ้าแอดมินแก้ทีหลัง ของแอดมินชนะ
   • รูปโปรไฟล์: สต๊าฟเปลี่ยนรูป → แอดมินเห็นด้วย · แอดมินตั้งรูปให้ → เห็นเฉพาะฝั่งแอดมิน (ใช้รูปที่เปลี่ยนล่าสุด)
   • โรล: สต๊าฟขอเพิ่ม/ลด → รอแอดมินอนุมัติที่หน้าจัดการทีม · แอดมินเปลี่ยนได้ทันที
   ══════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const CU=()=>{ try{ return (typeof currentUser!=='undefined' && currentUser)||null; }catch(e){ return null; } };
const FB=()=>{ try{ return (typeof _fbDatabase!=='undefined' && _fbDatabase)||null; }catch(e){ return null; } };
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const safe=(f,d)=>{ try{ const v=f(); return v==null?d:v; }catch(e){ return d; } };
const nowIso=()=>new Date().toISOString();
const CAT_KEYS=['dubbing','adaptation','mix','qc','subVideo','translation','manager'];
const catLabel=c=>safe(()=>CATS[c].label,c), catColor=c=>safe(()=>CATS[c].color,'var(--accent2)');

/* ─── ช่องข้อมูล (เก่า + ใหม่ รวมกัน) · core = ฟิลด์เดิมในทะเบียนทีม ─── */
const SECTIONS=[
  {t:'ข้อมูลส่วนตัว',f:[['name','ชื่อจริง - นามสกุล (ไทย)',{req:1,core:1}],['nickname','ชื่อเล่น',{req:1,core:1}],
    ['nameEn','ชื่อ - นามสกุล (อังกฤษ)',{ph:'ตามบัตรประชาชน'}],['nickEn','ชื่อเล่น (อังกฤษ)',{ph:'เช่น Ham'}],['credit','นามแฝง / ชื่อในเครดิต',{ph:'ชื่อที่อยากให้ขึ้นในเครดิตผลงาน'}],
    ['birth','วันเกิด',{type:'date'}],['phone','เบอร์ติดต่อ',{ph:'08x-xxx-xxxx'}],['gender','เพศ',{core:1,select:['','ชาย','หญิง','อื่นๆ']}],
    ['taxId','เลขประจำตัวผู้เสียภาษี (เลขบัตรประชาชน 13 หลัก)',{full:1,hint:'ใช้ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) ให้คุณ'}]]},
  {t:'ช่องทางติดต่อ',f:[['email','Email',{core:1,roStaff:1}],['discord','Discord ID (อ่านอย่างเดียว)',{ro:1}],
    ['line','LINE ID'],['social','Facebook / IG / X',{core:1,ph:'ลิงก์หรือชื่อบัญชี'}]]},
  {t:'ที่อยู่สำหรับออกเอกสาร',f:[['addr','บ้านเลขที่ / ซอย / ถนน',{full:1}],['moo','หมู่ที่'],['sub','ตำบล / แขวง'],['dist','อำเภอ / เขต'],['prov','จังหวัด'],['zip','รหัสไปรษณีย์']]},
  {t:'ข้อมูลการรับเงิน',f:[['payType','ประเภทการรับเงิน',{select:['','บัญชีธนาคาร','พร้อมเพย์']}],['bank','ชื่อธนาคาร',{core:1,ph:'เช่น กสิกรไทย'}],
    ['accName','ชื่อบัญชี',{ph:'ชื่อตามหน้าสมุดบัญชี'}],['account','เลขบัญชี',{core:1}],['promptpay','เบอร์ / พร้อมเพย์',{core:1}],['qrUrl','ลิงก์รูป QR รับเงิน',{core:1,ph:'https://'}]]},
  {t:'ROLES'},
  {t:'อุปกรณ์ที่ใช้งาน',sub:'ช่วยให้ทีมจัดงานให้เหมาะกับอุปกรณ์ของคุณ',f:[['mic','🎙️ ไมค์',{ph:'ยี่ห้อ / รุ่น'}],['iface','🎛️ อินเตอร์เฟส / มิกซ์เซอร์',{ph:'ยี่ห้อ / รุ่น'}],
    ['software','💻 โปรแกรมที่ใช้งาน',{full:1,ph:'พิมพ์ได้หลายชื่อ เช่น Adobe Audition, Reaper, iZotope RX'}],['gearOther','📦 อื่น ๆ',{full:1,area:1,ph:'เช่น หูฟัง, บูธ/ห้องเก็บเสียง'}]]},
  {t:'ผลงาน & ข้อมูลเพิ่มเติม',f:[['demo','🎬 ลิงก์ผลงาน / เดโม่ (บรรทัดละลิงก์)',{core:1,area:1,full:1,ph:'เช่น\nhttps://youtube.com/watch?v=...\nhttps://drive.google.com/file/d/...\nhttps://soundcloud.com/...'}],
    ['extra','ข้อมูล / ความสามารถพิเศษอื่น ๆ (บรรทัดละเรื่อง)',{area:1,full:1,ph:'เช่น\nภาษาที่พูดได้: อังกฤษ, ญี่ปุ่น\nโทนเสียงที่ถนัด: เด็ก, วัยรุ่น\nร้องเพลงได้'}]]},
];
const CORE=['name','nickname','gender','email','social','bank','account','promptpay','qrUrl','demo'];
const REQ=['name','nickname'];

/* ─── อ่านค่า: รวมทะเบียนทีม + ที่สต๊าฟแก้เอง (ใช้ชุดที่ใหม่กว่า) ─── */
function coreOf(s){ s=s||{}; return {name:s.name||'',nickname:s.nickname||'',gender:s.gender||'',email:s.email||'',social:s.social||'',bank:s.bank||'',
  account:s.account||'',promptpay:s.promptpay||'',qrUrl:s.qrUrl||'',demo:(Array.isArray(s.demoLinks)&&s.demoLinks.length)?s.demoLinks.join('\n'):(s.demoNote||'')}; }
function valuesOf(s, up){
  const staffAt=String((s&&(s.manualEditAt||''))||''), pf=(s&&s.profile)||{}, upAt=String((up&&up._at)||'');
  let v={...coreOf(s), ...pf};
  if(up && upAt>=staffAt && upAt>=String(pf._at||'')) v={...v, ...Object.fromEntries(Object.entries(up).filter(([k,x])=>x!=='' && x!=null))};
  v.discord=(s&&(s.discordName||s.discordId))?((s.discordName?s.discordName+' · ':'')+(s.discordId||'')):'';
  return v;
}
function accountOf(s){ if(!s) return null; const uc=safe(()=>ls('mgr_users_cache'),{})||{};
  const e=Object.entries(uc).find(([uid,u])=>u && (u.staffId===s.id || (s.email && u.email && String(u.email).toLowerCase()===String(s.email).toLowerCase())));
  return e?{uid:e[0],...e[1]}:null; }
function photoForAdmin(s,acct){ const a=[]; if(acct&&acct.photoURL) a.push([acct.photoAt||'',acct.photoURL]); if(s&&s.adminPhoto) a.push([s.adminPhotoAt||'',s.adminPhoto]);
  a.sort((x,y)=>String(y[0]).localeCompare(String(x[0]))); return a.length?a[0][1]:''; }

/* ─── วาดหน้าโปรไฟล์ ─── */
let ST=null;   // {mode:'self'|'admin', staff, acct, uid, vals, roles, pendAdd, pendDel, photo, pendingPhoto, dirty}
function fieldHTML([k,l,o]){ o=o||{}; const v=esc(ST.vals[k]||''); const ro=o.ro||(o.roStaff&&ST.mode==='self');
  if(!ST.edit){   // 👀 โหมดดู: เห็นว่ากรอกอะไรไปแล้ว อะไรยังไม่กรอก
    const has=String(ST.vals[k]||'').trim()!=='';
    return `<div class="ndp-f ndp-view ${o.full?'full':''}"><label>${esc(l)}${o.req?' <span class="req">*</span>':''}</label><div class="ndp-val ${has?'':'empty'}">${has?v:'ยังไม่กรอก'}</div></div>`; }
  const lbl=`<label>${esc(l)}${o.req?' <span class="req">*</span>':''}</label>`;
  let inp;
  if(o.select) inp=`<select data-f="${k}" ${ro?'disabled':''}>${o.select.map(x=>`<option value="${esc(x)}" ${x===(ST.vals[k]||'')?'selected':''}>${esc(x||'— เลือก —')}</option>`).join('')}</select>`;
  else if(o.area) inp=`<textarea data-f="${k}" rows="3" placeholder="${esc(o.ph||'')}" ${ro?'readonly':''}>${v}</textarea>`;
  else inp=`<input data-f="${k}" value="${v}" ${o.type?`type="${o.type}"`:''} placeholder="${esc(o.ph||'')}" ${ro?'readonly':''}>`;
  return `<div class="ndp-f ${o.full?'full':''}">${lbl}${inp}${o.hint?`<span class="hint">${esc(o.hint)}</span>`:''}</div>`; }
function rolesHTML(){
  if(ST.mode==='admin'){
    const acc=ST.acct, isMgr=acc&&acc.role==='manager';
    return `<div class="ndp-card"><div class="ndp-ch"><h3>โรล / ตำแหน่งงาน</h3><span class="muted">แอดมินเปลี่ยนได้ทันที</span></div><div class="ndp-cb">
      <div class="ndp-roles">${CAT_KEYS.map(c=>`<label class="ndp-rchip ${ST.roles.includes(c)?'on':''}" style="--c:${catColor(c)}"><input type="checkbox" data-role="${c}" ${ST.roles.includes(c)?'checked':''}> ${esc(catLabel(c))}</label>`).join('')}</div>
      ${acc?`<div class="ndp-f" style="margin-top:12px;max-width:320px"><label>บทบาทในระบบ</label><select id="ndp-sysrole"><option value="staff" ${!isMgr?'selected':''}>🎙️ Staff (ทีมงาน)</option><option value="manager" ${isMgr?'selected':''}>🗂️ Manager</option></select></div>`:''}
      ${reqNoteHTML()}</div></div>`;
  }
  const cur=ST.roles, add=ST.pendAdd, del=ST.pendDel;
  if(!ST.edit) return `<div class="ndp-card"><div class="ndp-ch"><h3>โรล / ตำแหน่งงาน</h3></div><div class="ndp-cb">
    <div class="ndp-roles">${cur.map(c=>`<span class="ndp-rchip on ${del.includes(c)?'pend':''}" style="--c:${catColor(c)}">${esc(catLabel(c))}${del.includes(c)?'<small>รอลด</small>':''}</span>`).join('')||'<span class="muted">ยังไม่มีโรล</span>'}
      ${add.map(c=>`<span class="ndp-rchip on pend" style="--c:${catColor(c)}">${esc(catLabel(c))}<small>รอเพิ่ม</small></span>`).join('')}</div>
    ${(add.length||del.length)?'<div class="ndp-note">⏳ มีคำขอเปลี่ยนโรลรอแอดมินอนุมัติ</div>':''}</div></div>`;
  return `<div class="ndp-card"><div class="ndp-ch"><h3>โรล / ตำแหน่งงาน</h3><span class="muted">เพิ่มหรือลดโรลที่คุณอยากรับงาน</span></div><div class="ndp-cb">
    <div class="muted" style="margin-bottom:8px">โรลปัจจุบัน — กด × เพื่อขอลดโรล</div>
    <div class="ndp-roles">${cur.map(c=>`<span class="ndp-rchip on ${del.includes(c)?'pend':''}" style="--c:${catColor(c)}">${esc(catLabel(c))}${del.includes(c)?'<small>รอลด</small>':''}<button type="button" data-rdel="${c}" title="${del.includes(c)?'ยกเลิกคำขอ':'ขอลดโรลนี้'}">${del.includes(c)?'↺':'×'}</button></span>`).join('')||'<span class="muted">ยังไม่มีโรล</span>'}
      ${add.map(c=>`<span class="ndp-rchip on pend" style="--c:${catColor(c)}">${esc(catLabel(c))}<small>รอเพิ่ม</small><button type="button" data-radd="${c}" title="ยกเลิกคำขอ">×</button></span>`).join('')}</div>
    <div class="muted" style="margin:12px 0 8px">เพิ่มโรล — กดเพื่อขอเพิ่ม</div>
    <div class="ndp-roles">${CAT_KEYS.filter(c=>c!=='manager'&&!cur.includes(c)&&!add.includes(c)).map(c=>`<button type="button" class="ndp-radd" data-radd="${c}">+ ${esc(catLabel(c))}</button>`).join('')||'<span class="muted">คุณมีครบทุกโรลแล้ว</span>'}</div>
    <div class="ndp-note">ℹ️ การเปลี่ยนโรลจะส่งเป็นคำขอให้แอดมินอนุมัติก่อน · ระหว่างรอจะแสดงเป็นเส้นประ กดซ้ำเพื่อยกเลิกคำขอได้</div></div></div>`;
}
function reqNoteHTML(){ const r=ST.acct&&ST.acct.roleReq; if(!r||(!(r.add||[]).length&&!(r.del||[]).length)) return '';
  return `<div class="ndp-note warn">🙋 คำขอจากสมาชิก: ${(r.add||[]).map(c=>'เพิ่ม '+esc(catLabel(c))).concat((r.del||[]).map(c=>'ลด '+esc(catLabel(c)))).join(' · ')}
    <span style="margin-left:auto;display:inline-flex;gap:6px"><button class="btn btn-blue btn-sm" type="button" onclick="ndRoleReqDecide('${ST.acct.uid}',true)">✓ อนุมัติ</button><button class="btn btn-outline btn-sm" type="button" onclick="ndRoleReqDecide('${ST.acct.uid}',false)">✕ ไม่อนุมัติ</button></span></div>`; }
function sideHTML(){
  const v=ST.vals, filled=REQ.every(k=>String(v[k]||'').trim()), letter=(v.nickname||v.name||'?').trim()[0]||'?';
  const updated=[ST.staff&&ST.staff.manualEditAt, v._at].filter(Boolean).sort().pop();
  return `<aside class="ndp-card ndp-side">
    <div class="ndp-av" id="ndp-av" style="${ST.photo?`background-image:url('${esc(ST.photo)}')`:''}">${ST.photo?'':esc(letter)}</div>
    <input type="file" id="ndp-file" accept="image/*" hidden>
    ${ST.edit?'<button class="btn btn-outline btn-sm" type="button" id="ndp-photo-btn">📷 เปลี่ยนรูป</button>':''}
    ${ST.mode==='admin'?'<div class="hint" style="text-align:center">รูปที่แอดมินตั้ง เห็นเฉพาะฝั่งแอดมิน<br>ถ้าสมาชิกเปลี่ยนรูปเองภายหลัง จะเห็นรูปใหม่ของสมาชิก</div>':''}
    ${(ST.edit&&ST.photo)?'<button class="btn btn-outline btn-sm ndp-danger" type="button" id="ndp-photo-del">🗑️ ลบรูป</button>':''}
    <div class="ndp-nick">${esc(v.nickname||v.name||'—')}</div>
    <span class="ndp-stat ${filled?'ok':''}">${filled?'✓ ข้อมูลหลักครบ':'กรอกข้อมูลยังไม่ครบ'}</span>
    <hr><div class="k">Discord ID</div><div class="ro">${esc(v.discord||'— ยังไม่ผูก —')}</div>
    <hr><div class="k">โรล / ตำแหน่งงาน</div><div class="ndp-roles sm">${ST.roles.map(c=>`<span class="ndp-rchip on" style="--c:${catColor(c)}">${esc(catLabel(c))}</span>`).join('')||'<span class="muted">—</span>'}</div>
    <hr><div class="k">อัปเดตล่าสุด</div><div class="ro">${updated?new Date(updated).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'—'}</div>
    ${ST.mode==='admin'&&ST.staff?`<hr><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
      <button class="btn btn-outline btn-sm" type="button" style="border-color:rgba(255,64,64,.35);color:#FF6060" onclick="teamWarn('${esc(ST.staff.id)}')">✉️ ออกใบเตือน</button>
      <button class="btn btn-outline btn-sm" type="button" style="border-color:rgba(255,199,0,.4);color:#E0A800" onclick="teamAppr('${esc(ST.staff.id)}')">⭐ ออกใบชื่นชม</button></div>
      <div id="ndp-warn-slot"></div>`:''}
  </aside>`;
}
function fillStat(){
  let n=0,t=0; const miss=[];
  SECTIONS.forEach(sec=>{ (sec.f||[]).forEach(([k,l,o])=>{ o=o||{}; if(o.ro) return; t++; if(String(ST.vals[k]||'').trim()) n++; else miss.push(l.replace(/^[^\wก-๙]+\s*/,'')); }); });
  return {n,t,miss};
}
function headActs(){
  const box=$('ndp-head-act'); if(!box) return;
  if(ST.mode!=='self'){ box.innerHTML=''; return; }
  box.innerHTML=ST.edit?`<button class="btn btn-outline" type="button" onclick="ndProfileEdit(false)">✕ ยกเลิกการแก้ไข</button>`
    :`<button class="btn btn-blue" type="button" onclick="ndProfileEdit(true)">✏️ แก้ไขโปรไฟล์</button>`;
}
window.ndProfileEdit=function(on){
  if(!ST) return;
  if(!on && ST.dirty && !confirm('ยกเลิกการแก้ไข? ข้อมูลที่ยังไม่บันทึกจะหายไป')) return;
  if(on){ ST.edit=true; const host=$('ndp-self-body'); if(host) render(host); window.scrollTo(0,0); }
  else { ST.dirty=false; open('self'); }
};
function render(host){
  headActs();
  const fs=fillStat(), pct=fs.t?Math.round(fs.n*100/fs.t):0;
  const summary=(ST.mode==='self'&&!ST.edit)?`<div class="ndp-card ndp-fill"><div class="ndp-cb">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><b>กรอกข้อมูลแล้ว ${fs.n} จาก ${fs.t} ช่อง</b><span class="muted">(${pct}%)</span></div>
      <div class="ndp-bar"><i style="width:${pct}%"></i></div>
      ${fs.miss.length?`<div class="muted" style="margin-top:8px">ยังไม่กรอก: ${fs.miss.slice(0,8).map(esc).join(' · ')}${fs.miss.length>8?` และอีก ${fs.miss.length-8} ช่อง`:''}</div>`:'<div class="muted" style="margin-top:8px">✓ กรอกครบทุกช่องแล้ว</div>'}
    </div></div>`:'';
  const secs=SECTIONS.map(sec=>sec.t==='ROLES'?rolesHTML():`<div class="ndp-card"><div class="ndp-ch"><h3>${esc(sec.t)}</h3>${sec.sub?`<span class="muted">${esc(sec.sub)}</span>`:''}</div>
      <div class="ndp-cb ndp-grid2">${sec.f.map(fieldHTML).join('')}</div></div>`).join('');
  host.innerHTML=`<div class="ndp-wrap">${sideHTML()}<div class="ndp-main">${summary}${secs}</div></div>
    <div class="ndp-savebar" id="ndp-savebar"><span>มีการแก้ไขที่ยังไม่บันทึก</span><button class="btn btn-outline" type="button" id="ndp-undo">ยกเลิก</button><button class="btn btn-blue" type="button" id="ndp-save">💾 บันทึก</button></div>`;
  wire(host);
}
function markDirty(){ ST.dirty=true; $('ndp-savebar')?.classList.add('show'); }
function wire(host){
  host.querySelectorAll('[data-f]').forEach(el=>{ el.addEventListener('input',()=>{ ST.vals[el.dataset.f]=el.value; markDirty(); }); el.addEventListener('change',()=>{ ST.vals[el.dataset.f]=el.value; markDirty(); }); });
  host.querySelectorAll('[data-role]').forEach(el=>el.addEventListener('change',()=>{ const c=el.dataset.role;
    ST.roles=el.checked?[...new Set([...ST.roles,c])]:ST.roles.filter(x=>x!==c); el.parentElement.classList.toggle('on',el.checked); markDirty(); }));
  $('ndp-sysrole')?.addEventListener('change',markDirty);
  host.addEventListener('click',e=>{
    const a=e.target.closest('[data-radd]'), d=e.target.closest('[data-rdel]');
    if(a){ const c=a.dataset.radd; ST.pendAdd=ST.pendAdd.includes(c)?ST.pendAdd.filter(x=>x!==c):[...ST.pendAdd,c]; markDirty(); rerenderKeep(host); }
    if(d){ const c=d.dataset.rdel;
      if(!ST.pendDel.includes(c) && ST.roles.filter(x=>!ST.pendDel.includes(x)).length<=1){ toast('ต้องมีอย่างน้อย 1 โรล','warn'); return; }
      ST.pendDel=ST.pendDel.includes(c)?ST.pendDel.filter(x=>x!==c):[...ST.pendDel,c]; markDirty(); rerenderKeep(host); }
  });
  const pb=$('ndp-photo-btn'); if(pb) pb.onclick=()=>$('ndp-file').click();
  $('ndp-file').onchange=async ev=>{ const f=ev.target.files&&ev.target.files[0]; if(!f) return;
    if(!f.type.startsWith('image/')){ toast('ต้องเป็นไฟล์รูปภาพ','error'); return; }
    try{ ST.pendingPhoto=await shrink(f); ST.photo=ST.pendingPhoto; const av=$('ndp-av'); av.style.backgroundImage=`url('${ST.photo}')`; av.textContent=''; markDirty(); }catch(e){ toast('อ่านรูปไม่สำเร็จ','error'); } };
  const del=$('ndp-photo-del'); if(del) del.onclick=()=>{ ST.pendingPhoto='__REMOVE__'; ST.photo=''; const av=$('ndp-av'); av.style.backgroundImage=''; av.textContent=(ST.vals.nickname||'?')[0]; markDirty(); };
  $('ndp-undo').onclick=()=>{ ST.dirty=false; open(ST.mode, ST.mode==='admin'?ST.staff.id:null); };   // โปรไฟล์ตัวเอง → กลับไปโหมดดู
  $('ndp-save').onclick=()=>save();
}
function rerenderKeep(host){ const y=window.scrollY; render(host); if(ST.dirty) $('ndp-savebar').classList.add('show'); window.scrollTo(0,y); }
function shrink(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>{ const im=new Image(); im.onload=()=>{ const m=400, k=Math.min(1,m/Math.max(im.width,im.height));
  const c=document.createElement('canvas'); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height); res(c.toDataURL('image/jpeg',.85)); }; im.onerror=rej; im.src=r.result; }; r.onerror=rej; r.readAsDataURL(file); }); }

/* ─── เปิดหน้า ─── */
async function open(mode, staffId){
  const cu=CU(); if(!cu) return;
  let staff=null, acct=null, up=null;
  if(mode==='admin'){ staff=safe(()=>getStaffById(staffId),null); if(!staff) return; acct=accountOf(staff); up=acct&&acct.profile||null; }
  else { staff=cu.staffId?safe(()=>getStaffById(cu.staffId),null):null;
    try{ if(FB()){ const sn=await FB().ref('users/'+cu.uid).get(); if(sn.exists()){ const u=sn.val()||{}; up=u.profile||null; acct={uid:cu.uid,...u}; } } }catch(e){}
    try{ if(FB()){ const pv=await FB().ref('private/'+cu.uid+'/profile').get(); if(pv.exists()) up=pv.val(); } }catch(e){} }   // 🔒 โปรไฟล์ย้ายไปที่ private/ (เจ้าตัว + แอดมิน)
  const vals=valuesOf(staff||{}, up);
  if(mode==='self'){ if(!vals.nickname) vals.nickname=cu.nickname||''; if(!vals.email) vals.email=cu.email||''; }
  const roles=staff?[...new Set((staff.categories&&staff.categories.length?staff.categories:[staff.category]).filter(Boolean))]:[];
  const rq=(acct&&acct.roleReq)||{};
  ST={mode, staff, acct, uid:mode==='self'?cu.uid:(acct&&acct.uid), vals, roles, pendAdd:mode==='self'?(rq.add||[]).slice():[], pendDel:mode==='self'?(rq.del||[]).slice():[],
      photo:mode==='self'?(cu.photoURL||''):photoForAdmin(staff,acct), pendingPhoto:null, dirty:false, edit:mode==='admin'};
  const host=mode==='admin'?$('sd-body-1'):$('ndp-self-body');
  if(host) render(host);
}

/* ─── บันทึก ─── */
// 🧼 ทุกช่องผ่านการทำความสะอาดก่อนบันทึก (กันฝังโค้ดผ่านชื่อ/ธนาคาร/ลิงก์) · ช่องตัวเลขเก็บเฉพาะตัวเลข · ลิงก์ QR ต้องเป็น https
const NUMF=['account','promptpay','phone','taxId','zip'];
function cleanVal(k,v){ v=String(v==null?'':v).trim();
  if(k==='qrUrl') return (typeof safeUrl==='function')?safeUrl(v):'';
  if(NUMF.includes(k)) return (typeof cleanNum==='function')?cleanNum(v):v.replace(/[^0-9\- ]/g,'');
  const big=['demo','extra','gearOther','addr'].includes(k);
  return (typeof cleanStr==='function')?cleanStr(v, big?2000:200):v.replace(/[<>"`\\]/g,''); }
function readVals(){ const o={}; Object.entries(ST.vals).forEach(([k,v])=>{ if(k!=='discord' && typeof v==='string') o[k]=cleanVal(k,v); }); return o; }
async function save(){
  const v=readVals();
  for(const k of REQ) if(!v[k]){ toast('กรุณากรอกชื่อจริงและชื่อเล่น','error'); return; }
  const btn=$('ndp-save'); if(btn){ btn.disabled=true; btn.textContent='⏳ กำลังบันทึก...'; }
  try{
    if(ST.mode==='self') await saveSelf(v); else await saveAdmin(v);
    ST.dirty=false; toast('💾 บันทึกข้อมูลแล้ว ✅','success');
    await open(ST.mode, ST.mode==='admin'?ST.staff.id:null);
  }catch(e){ console.error('profile save',e); toast('บันทึกไม่สำเร็จ: '+((e&&e.message)||e),'error'); if(btn){ btn.disabled=false; btn.textContent='💾 บันทึก'; } }
}
async function saveSelf(v){
  const cu=CU(), db=FB(); if(!db||!cu) throw new Error('ยังไม่ได้เชื่อมต่อระบบ');
  const pf={...v, _at:nowIso()}; delete pf.email;   // อีเมลใช้ล็อกอิน — แก้ผ่านแอดมิน
  await db.ref('private/'+cu.uid+'/profile').set(pf);   // 🔒 ข้อมูลส่วนตัว — เจ้าตัว + แอดมินเท่านั้น
  try{ await db.ref('users/'+cu.uid+'/profile').remove(); }catch(e){}
  await db.ref('users/'+cu.uid+'/nickname').set(v.nickname);
  cu.nickname=v.nickname;
  if(ST.pendingPhoto){ if(ST.pendingPhoto==='__REMOVE__'){ await db.ref('users/'+cu.uid+'/photoURL').remove(); cu.photoURL=''; }
    else { await db.ref('users/'+cu.uid+'/photoURL').set(ST.pendingPhoto); cu.photoURL=ST.pendingPhoto; }
    await db.ref('users/'+cu.uid+'/photoAt').set(nowIso());
    try{ renderAvatarInto('top-bar-avatar', cu.photoURL, (cu.nickname||'?')[0]); }catch(e){} }
  // คำขอเปลี่ยนโรล → รอแอดมินอนุมัติ
  const had=(ST.acct&&ST.acct.roleReq)||{};
  if(JSON.stringify([ST.pendAdd,ST.pendDel])!==JSON.stringify([had.add||[],had.del||[]])){
    if(ST.pendAdd.length||ST.pendDel.length) await db.ref('users/'+cu.uid+'/roleReq').set({add:ST.pendAdd,del:ST.pendDel,at:nowIso()});
    else await db.ref('users/'+cu.uid+'/roleReq').remove();
    if(ST.pendAdd.length||ST.pendDel.length) toast('📨 ส่งคำขอเปลี่ยนโรลให้แอดมินแล้ว','info');
  }
  try{ const pmn=$('pm-name'); if(pmn) pmn.textContent=v.nickname+' · '+(cu.role==='admin'?'Administrator':cu.role==='manager'?'🗂️ Manager':'ทีมงาน'); }catch(e){}
}
function writeStaff(merged, cats){
  const data=getStaffData();
  Object.keys(data).forEach(k=>{ data[k]=(Array.isArray(data[k])?data[k]:[]).filter(x=>x&&x.id!==merged.id); });
  cats.forEach(c=>{ if(!data[c]) data[c]=[]; data[c].push({...merged,category:c}); });
  saveStaffData(data);
}
function mergeInto(s, v){
  const demoRaw=v.demo||'', links=safe(()=>_extractUrls(demoRaw),[])||[];
  const pf={}; Object.keys(v).forEach(k=>{ if(!CORE.includes(k) && k!=='discord') pf[k]=v[k]; });
  const out={...s, name:v.name, nickname:v.nickname, gender:v.gender||'', social:v.social||'', bank:v.bank||'', account:v.account||'',
    promptpay:v.promptpay||'', qrUrl:v.qrUrl||'', demoLinks:links, demoNote:(!links.length&&demoRaw)?demoRaw:'', profile:{...(s.profile||{}),...pf}};
  if(v.email!==undefined) out.email=v.email;
  return out;
}
async function saveAdmin(v){
  const s=ST.staff, db=FB();
  if(!ST.roles.length){ throw new Error('เลือกโรลอย่างน้อย 1 อย่าง'); }
  const at=nowIso(), merged=mergeInto(s, v);
  // จำอีเมลเก่า (กันซิงค์ชีทสร้างซ้ำ) — เหมือนระบบเดิม
  const oldEm=String(s.email||'').trim().toLowerCase(), pe=Array.isArray(s.prevEmails)?s.prevEmails.slice():[];
  if(oldEm && v.email && oldEm!==v.email.toLowerCase() && !pe.some(x=>String(x).toLowerCase()===oldEm)) pe.push(s.email);
  merged.prevEmails=pe.slice(-5); merged.manualEditAt=at; merged.profile._at=at; merged.categories=ST.roles.slice();
  const sysRole=$('ndp-sysrole')?.value; if(sysRole==='manager' && !merged.categories.includes('manager')) merged.categories.push('manager');
  if(ST.pendingPhoto){ if(ST.pendingPhoto==='__REMOVE__'){ delete merged.adminPhoto; delete merged.adminPhotoAt; } else { merged.adminPhoto=ST.pendingPhoto; merged.adminPhotoAt=at; } }
  writeStaff(merged, merged.categories);
  if(sysRole){ try{ await applyStaffRole(s.id, sysRole); }catch(e){} }
  if(ST.acct && db){ try{ const pf={...readVals(), _at:at}; delete pf.email; await db.ref('private/'+ST.acct.uid+'/profile').set(pf);
      const uc=ls('mgr_users_cache')||{}; if(uc[ST.acct.uid]){ uc[ST.acct.uid].profile=pf; ls('mgr_users_cache',uc); } }catch(e){ console.warn('profile mirror',e); } }
  try{ logAudit('staff.edit', v.nickname, 'แก้ข้อมูลสมาชิก (หน้าโปรไฟล์)'); }catch(e){}
}

/* ─── แอดมิน: นำข้อมูลที่สต๊าฟแก้เองเข้าทะเบียนทีม + คำขอเปลี่ยนโรล ─── */
async function adminSync(){
  const cu=CU(), db=FB(); if(!cu||cu.role!=='admin'||!db) return;
  let users={}; try{ const sn=await db.ref('users').get(); users=sn.exists()?(sn.val()||{}):{}; }catch(e){ return; }
  try{ const pv=await db.ref('private').get(); if(pv.exists()) Object.entries(pv.val()||{}).forEach(([uid,x])=>{ if(x&&x.profile&&users[uid]){ const o=users[uid].profile; if(!o || String(x.profile._at||'')>=String(o._at||'')) users[uid]={...users[uid], profile:x.profile}; } }); }catch(e){}
  const uc=ls('mgr_users_cache')||{}; Object.entries(users).forEach(([uid,u])=>{ uc[uid]={...(uc[uid]||{}),...u}; }); ls('mgr_users_cache',uc);
  const all=safe(()=>getAllStaff(),[]); let changed=[], data=null;
  Object.entries(users).forEach(([uid,u])=>{
    const up=u&&u.profile; if(!up||!up._at) return;
    const s=all.find(x=>x.id===u.staffId) || all.find(x=>x.email&&u.email&&x.email.toLowerCase()===String(u.email).toLowerCase()); if(!s) return;
    if(String(up._at)<=String(s.selfSyncedAt||'') || String(up._at)<=String(s.manualEditAt||'')) return;
    const v={}; Object.entries(up).forEach(([k,x])=>{ if(k!=='_at' && k!=='email' && x!=null) v[k]=cleanVal(k,x); });
    const merged=mergeInto(s, {...coreOf(s), ...v}); merged.selfSyncedAt=up._at; merged.profile._at=up._at;
    const cats=[...new Set((s.categories&&s.categories.length?s.categories:[s.category]).filter(Boolean))];
    if(!data) data=getStaffData();
    Object.keys(data).forEach(k=>{ data[k]=(data[k]||[]).filter(x=>x&&x.id!==merged.id); });
    cats.forEach(c=>{ if(!data[c]) data[c]=[]; data[c].push({...merged,category:c}); });
    changed.push(merged.nickname||merged.name);
  });
  if(data && changed.length){ saveStaffData(data); try{ logAudit('staff.selfsync','ระบบ','นำข้อมูลที่สมาชิกแก้เองเข้าทะเบียน: '+changed.join(', ')); }catch(e){} }
  renderRoleReqCard(users);
}
function renderRoleReqCard(users){
  const pg=$('page-staff'); if(!pg) return;
  let box=$('ndp-rolereq'); if(!box){ box=document.createElement('div'); box.id='ndp-rolereq'; const h=pg.querySelector('.page-header'); pg.insertBefore(box, h?h.nextSibling:pg.firstChild); }
  const allU=users||ls('mgr_users_cache')||{};
  const reqs=Object.entries(allU).filter(([uid,u])=>u&&u.roleReq&&(((u.roleReq.add||[]).length)||((u.roleReq.del||[]).length)));
  // 🔗 บัญชีที่สมัครแล้วแต่ยังไม่ได้ผูกกับรายชื่อทีม → เห็นข้อมูลทีมไม่ได้จนกว่าแอดมินจะผูก
  const unl=Object.entries(allU).filter(([uid,u])=>u && !u.staffId && u.role!=='admin' && u.role!=='manager');
  const unlHTML=unl.length?`<div class="ndp-card" style="margin-bottom:14px"><div class="ndp-ch"><h3>🔗 บัญชีที่ยังไม่ได้ผูกกับรายชื่อทีม</h3><span class="ndp-pill">${unl.length} บัญชี</span></div>
    <div class="ndp-cb"><div class="muted" style="margin-bottom:8px">บัญชีเหล่านี้ล็อกอินได้แต่ยังเห็นข้อมูลทีมไม่ได้ · ถ้าเป็นคนในทีม: ใส่อีเมลนี้ในข้อมูลสมาชิก ระบบจะผูกให้เอง หรือกด "ผูก" · ถ้าไม่รู้จัก: ลบบัญชีได้ที่ Firebase → Authentication</div>
    ${unl.map(([uid,u])=>{ const c=u.claimStaffId?safe(()=>getStaffById(u.claimStaffId),null):null;
      const opts=[...new Map(safe(()=>getAllStaff(),[]).filter(x=>x&&x.id).map(x=>[x.id,x])).values()].sort((a,b)=>String(a.nickname||a.name).localeCompare(String(b.nickname||b.name),'th'))
        .map(x=>`<option value="${esc(x.id)}"${c&&c.id===x.id?' selected':''}>${esc(x.nickname||x.name)}${x.name&&x.nickname?' ('+esc(x.name)+')':''}</option>`).join('');
      return `<div class="ndp-rq" style="flex-wrap:wrap"><b>${esc(u.email||uid)}</b><span class="muted">${esc(u.nickname||'')}${c?' · ขอผูกกับ "'+esc(c.nickname||c.name)+'"':''}${u.createdAt?' · สมัคร '+esc(String(u.createdAt).slice(0,10)):''}</span>
        <span style="margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><select class="form-control" id="ndp-lk-${esc(uid)}" style="width:auto;min-width:150px;padding:4px 8px;font-size:12px"><option value="">— เลือกคนในทีม —</option>${opts}</select>
          <button class="btn btn-blue btn-sm" onclick="ndLinkStaffPick('${esc(uid)}')">🔗 ผูก</button>
          <button class="btn btn-outline btn-sm" title="ลบบัญชีนี้ออกจากรายการผู้ใช้ของเว็บ" onclick="ndUnlinkedRemove('${esc(uid)}')">🗑 เอาออก</button></span></div>`; }).join('')}</div></div>`:'';
  box.innerHTML=unlHTML+(reqs.length?`<div class="ndp-card" style="margin-bottom:14px"><div class="ndp-ch"><h3>🙋 คำขอเปลี่ยนโรลจากทีมงาน</h3><span class="ndp-pill">${reqs.length} รายการ</span></div>
    ${reqs.map(([uid,u])=>{ const s=safe(()=>getStaffById(u.staffId),null)||{}; const nm=u.nickname||s.nickname||s.name||u.email||uid;
      return `<div class="ndp-rq"><b>${esc(nm)}</b>${(u.roleReq.add||[]).map(c=>`<span class="ndp-rchip on" style="--c:${catColor(c)}">+ ${esc(catLabel(c))}</span>`).join('')}${(u.roleReq.del||[]).map(c=>`<span class="ndp-rchip on pend" style="--c:${catColor(c)}">− ${esc(catLabel(c))}</span>`).join('')}
        <span style="margin-left:auto;display:flex;gap:6px"><button class="btn btn-blue btn-sm" onclick="ndRoleReqDecide('${uid}',true)">✓ อนุมัติ</button><button class="btn btn-outline btn-sm" onclick="ndRoleReqDecide('${uid}',false)">✕ ไม่อนุมัติ</button></span></div>`; }).join('')}</div>`:'');
}
window.ndRoleReqDecide=async function(uid, ok){
  const db=FB(); const uc=ls('mgr_users_cache')||{}; const u=uc[uid]; if(!u||!u.roleReq) return;
  if(ok){ const s=safe(()=>getStaffById(u.staffId),null) || safe(()=>getAllStaff().find(x=>x.email&&u.email&&x.email.toLowerCase()===String(u.email).toLowerCase()),null);
    if(!s){ toast('ไม่พบสมาชิกที่ผูกกับบัญชีนี้','error'); return; }
    let cats=[...new Set((s.categories&&s.categories.length?s.categories:[s.category]).filter(Boolean))];
    cats=[...new Set([...cats,...(u.roleReq.add||[])])].filter(c=>!(u.roleReq.del||[]).includes(c));
    if(!cats.length){ toast('ต้องเหลืออย่างน้อย 1 โรล','error'); return; }
    writeStaff({...s, categories:cats, manualEditAt:nowIso()}, cats); }
  try{ if(db) await db.ref('users/'+uid+'/roleReq').remove(); }catch(e){}
  delete u.roleReq; ls('mgr_users_cache',uc);
  toast(ok?'✅ อนุมัติคำขอเปลี่ยนโรลแล้ว':'ไม่อนุมัติคำขอแล้ว', ok?'success':'info');
  renderRoleReqCard(uc); if(ST&&ST.mode==='admin') open('admin', ST.staff.id);
};

/* ─── ติดตั้ง ─── */
function init(){
  const main=document.querySelector('.main-content'); if(!main) return;
  // หน้าโปรไฟล์ของฉัน (แทนหน้าต่างเดิม)
  if(!$('page-nd-profile')){ const d=document.createElement('div'); d.id='page-nd-profile'; d.className='page hidden';
    d.innerHTML='<div class="page-header" style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:200px"><div class="page-title">👤 โปรไฟล์</div><div class="page-subtitle">ข้อมูลส่วนตัว ช่องทางรับเงิน อุปกรณ์ และโรลของคุณ</div></div><div id="ndp-head-act"></div></div><div id="ndp-self-body"></div>';
    main.appendChild(d);
    new MutationObserver(()=>{ if(!d.classList.contains('hidden')) open('self'); }).observe(d,{attributes:true,attributeFilter:['class']}); }
  window.openProfileModal=function(){ try{ closeProfileMenu(); }catch(e){} nav('nd-profile'); };
  // แอดมิน: หน้ารายละเอียดสมาชิก แท็บข้อมูล = หน้าตาเดียวกับโปรไฟล์ (แก้ได้ทันที)
  if(typeof window.renderStaffDetail==='function'){
    const orig=window.renderStaffDetail;
    window.renderStaffDetail=function(){
      try{ _sdEditing=false; }catch(e){}   // ตัวแปร let ของระบบเดิม — หน้าแก้แบบใหม่ใช้แทนโหมดแก้เดิม
      const r=orig.apply(this,arguments);
      try{ if(typeof _sdTab!=='undefined' && _sdTab===1 && CU()&&CU().role==='admin'){
        const b1=$('sd-body-1'); const keep=b1?[...b1.querySelectorAll('.table-wrap')].filter(el=>/ใบเตือน|ใบชื่นชม/.test((el.textContent||'').slice(0,60))):[];
        const act=$('sd-edit-actions'); if(act) act.innerHTML='';
        open('admin', _detailStaffId).then(()=>{ const slot=$('ndp-warn-slot'); if(slot) keep.forEach(el=>slot.appendChild(el)); });
      } }catch(e){ console.warn('nd profile admin',e); }
      return r; };
  }
  // แอดมิน: นำข้อมูลที่สต๊าฟแก้เองเข้าทะเบียน + คำขอโรล (ตอนเข้าระบบ และทุก 2 นาที)
  let started=false;
  new MutationObserver(()=>{ const lay=$('app-layout'); if(lay && !lay.classList.contains('hidden') && !started && CU()&&CU().role==='admin'){ started=true;
      setTimeout(adminSync,4000); setInterval(()=>{ if(!document.hidden) adminSync(); },120000); } }).observe($('app-layout'),{attributes:true,attributeFilter:['class']});
  const sp=$('page-staff'); if(sp) new MutationObserver(()=>{ if(!sp.classList.contains('hidden')) renderRoleReqCard(); }).observe(sp,{attributes:true,attributeFilter:['class']});
  // ปิดหน้าโปรไฟล์ทั้งที่ยังไม่บันทึก → ถาม
  addEventListener('beforeunload',e=>{ if(ST&&ST.dirty){ e.preventDefault(); e.returnValue=''; } });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
/* 🔗 แอดมินกดผูกบัญชีกับรายชื่อทีมเอง (กรณีอีเมลไม่ตรงกับทะเบียน) */
window.ndLinkStaffPick=function(uid){
  const sel=document.getElementById('ndp-lk-'+uid); const id=sel&&sel.value;
  if(!id){ toast('เลือกคนในทีมก่อน','info'); if(sel) sel.focus(); return; }
  ndLinkStaff(uid, id);
};
// 🗑 เอาบัญชีที่ไม่ใช้ออกจากรายการ (ลบ users/<uid>) — ตัวบัญชีล็อกอินยังอยู่ ต้องลบต่อที่ Firebase → Authentication
window.ndUnlinkedRemove=async function(uid){
  const db=(typeof _fbDatabase!=='undefined')?_fbDatabase:null; if(!db) return;
  const uc=ls('mgr_users_cache')||{}; const u=uc[uid]||{};
  if(!confirm('เอาบัญชี "'+(u.email||u.nickname||uid)+'" ออกจากรายการ?\n\n• ลบข้อมูลผู้ใช้ของบัญชีนี้ในเว็บ (users/'+uid+')\n• ตัวบัญชีล็อกอินยังอยู่ — ถ้าไม่ใช้แล้วให้ลบต่อที่ Firebase → Authentication (ค้นด้วย UID นี้)\n• ถ้าบัญชีนี้ล็อกอินอีก จะกลับมาอยู่ในรายการนี้ใหม่')) return;
  try{ await db.ref('users/'+uid).remove(); delete uc[uid]; ls('mgr_users_cache',uc);
    try{ logAudit('staff.unlink','ระบบ','เอาบัญชีที่ไม่ได้ผูกออก: '+(u.email||u.nickname||uid)); }catch(e){}
    toast('เอาออกจากรายการแล้ว','success'); renderRoleReqCard(uc);
  }catch(e){ toast('เอาออกไม่สำเร็จ: '+e.message,'error'); }
};
window.ndLinkStaff=async function(uid, staffId){
  const db=(typeof _fbDatabase!=='undefined')?_fbDatabase:null; if(!db) return;
  const s=(typeof getStaffById==='function')?getStaffById(staffId):null;
  if(!confirm('ผูกบัญชีนี้กับ "'+(s?(s.nickname||s.name):staffId)+'"?\n\nบัญชีนี้จะเห็นงาน/ยอดเงิน/ข้อมูลส่วนตัวของคนนี้ — เช็คให้แน่ใจว่าเป็นคนเดียวกัน')) return;
  try{ await db.ref('users/'+uid+'/staffId').set(staffId); await db.ref('users/'+uid+'/claimStaffId').remove();
    const uc=ls('mgr_users_cache')||{}; if(uc[uid]){ uc[uid].staffId=staffId; delete uc[uid].claimStaffId; ls('mgr_users_cache',uc); }
    try{ logAudit('staff.link', s?(s.nickname||s.name):staffId, 'แอดมินผูกบัญชีกับรายชื่อทีม'); }catch(e){}
    toast('🔗 ผูกบัญชีแล้ว','success');
    try{ renderRoleReqCard(uc); }catch(e){}
  }catch(e){ toast('ผูกไม่สำเร็จ: '+e.message,'error'); }
};
