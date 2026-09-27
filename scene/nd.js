/* ══════════════════════════════════════════════════════════════
   ดีไซน์ใหม่ Guin Home (nd) — ชั้นหน้าตาที่วางทับระบบเดิม
   หลักการ: ไม่แก้ฟังก์ชันเดิม · เมนูยังเป็น .nav-item + onclick="nav('x')" (ระบบเดิมหาเมนูที่เปิดอยู่จากข้อความนี้)
   · ตัวเลขบนฉากคัดลอกจากหน้าที่ระบบเดิมคำนวณไว้ (ตัวเลข/ปุ่มกดตรงกับของเดิมเสมอ)
   ══════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const S = 'scene/';
const $ = id => document.getElementById(id);
// currentUser ของระบบเดิมประกาศด้วย let (ไม่อยู่บน window) — อ่านชื่อตรง ๆ ได้เพราะอยู่ในขอบเขตกลางของทุกสคริปต์
const CU = () => { try{ return (typeof currentUser!=='undefined' && currentUser) || null; }catch(e){ return null; } };
const role = () => (CU() && CU().role) || 'staff';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const safe = (f, d='') => { try{ const v=f(); return v==null?d:v; }catch(e){ return d; } };

/* ─────────── ไอคอน ─────────── */
const P = {
  home:'M12 3 2 11h3v9h5v-6h4v6h5v-9h3z',
  queueAvail:'M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  assign:'M9 2h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1zm0 2v2h6V4zm-1 6v2h8v-2zm0 4v2h6v-2z',
  projmgr:'M3 5a1 1 0 0 1 1-1h6l2 2h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  alloc:'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  drive:'M3 5a1 1 0 0 1 1-1h6l2 2h8a1 1 0 0 1 1 1v3H3zm0 7h18v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  projroom:'M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4v-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
  projects:'M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z',
  track:'M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm-2 7v10h14V9zm2 2h3v3H7z',
  calc:'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm2 3v4h8V5zm0 7v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm-6 4v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2z',
  fin:'M4 5h14v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v1h12V7zm12 7a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z',
  payq:'M2 6h20v12H2zm10 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 8v2a2 2 0 0 0 2-2zm14 0a2 2 0 0 0 2 2V8zM4 16h2a2 2 0 0 0-2-2zm16-2a2 2 0 0 0-2 2h2z',
  payroll:'M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm-2 7v10h14V9zm3 2h8v2H8zm0 4h5v2H8z',
  profit:'M4 20V10h3v10zm6.5 0V4h3v16zM17 20v-7h3v7z',
  docs:'M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm7 1.5V8h4.5zM8 12v2h8v-2zm0 4v2h8v-2z',
  payment:'M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2H2zm0 5h20v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm3 4v2h5v-2z',
  team:'M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM1 20c0-4 3.6-7 8-7s8 3 8 7zm17 0c0-2.5-.9-4.6-2.4-6.1C19.2 14.2 23 16.5 23 20z',
  settings:'m13.9 2 .5 2.6 1.6.9 2.5-.9 1.9 3.3-2 1.7v1.8l2 1.7-1.9 3.3-2.5-.9-1.6.9-.5 2.6h-3.8l-.5-2.6-1.6-.9-2.5.9-1.9-3.3 2-1.7v-1.8l-2-1.7 1.9-3.3 2.5.9 1.6-.9.5-2.6zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  confirm:'M11 3h2v9.6l3.3-3.3 1.4 1.4L12 16.4l-5.7-5.7 1.4-1.4 3.3 3.3zM4 15h2v4h12v-4h2v6H4z',
  money:'M12 1a1 1 0 0 1 1 1v1.1c2 .3 3.5 1.6 3.8 3.4h-2.1c-.3-.9-1.3-1.5-2.7-1.5-1.7 0-2.6.8-2.6 1.8 0 1.1.9 1.5 3 2 2.7.6 4.6 1.5 4.6 4 0 1.9-1.5 3.3-4 3.6V21a1 1 0 0 1-2 0v-1.6c-2.3-.3-4-1.7-4.2-3.7h2.1c.2 1 1.3 1.8 3.1 1.8 1.8 0 2.8-.8 2.8-1.9 0-1.1-.9-1.6-3-2-2.6-.6-4.6-1.4-4.6-3.9 0-1.8 1.5-3.2 3.8-3.6V2a1 1 0 0 1 1-1z',
  mine:'M13 3a9 9 0 1 1-8.5 12h2.2A7 7 0 1 0 6 9.3L8.5 12H2V5.5l2.6 2.6A9 9 0 0 1 13 3zm-1 4h2v5.2l4 2.4-1 1.7-5-3z',
  menu:'M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z',
  chev:'m7.4 8.6 4.6 4.6 4.6-4.6L18 10l-6 6-6-6z',
  toggle:'M5.6 5.4 7 4l8 8-8 8-1.4-1.4 6.6-6.6zm6 0L13 4l8 8-8 8-1.4-1.4 6.6-6.6z',
  bell:'M12 2a6 6 0 0 1 6 6v4.5l2 3.5H4l2-3.5V8a6 6 0 0 1 6-6zm-2.5 16h5a2.5 2.5 0 0 1-5 0z',
  help:'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1 14v2h2v-2zm1-10a4 4 0 0 0-4 4h2a2 2 0 1 1 3 1.7c-1.2.7-2 1.5-2 3.3h2c0-1 .4-1.4 1.2-1.9A4 4 0 0 0 12 6z',
};
const svg = (k, cls='nd-ic') => `<svg class="${cls}" viewBox="0 0 24 24"><path fill-rule="evenodd" d="${P[k]||P.home}"/></svg>`;

/* ─────────── เมนูซ้าย (สร้างใหม่ แต่คง id / class / onclick เดิม) ─────────── */
const item = (page, ic, label, badge='') =>
  `<div class="nav-item" onclick="nav('${page}')" data-tip="${esc(label)}">${svg(ic)}<span class="nd-lb">${esc(label)}</span>${badge}</div>`;
const badge = id => `<span class="nav-badge hidden" id="${id}">0</span>`;
const sec = t => `<div class="nd-sec"><span>${t}</span></div>`;
const grp = (key, page, ic, label, items) =>
  `<div class="nd-grp" data-grp="${key}">
     <div class="nav-item" onclick="nav('${page}')" data-tip="${esc(label)}">${svg(ic)}<span class="nd-lb">${esc(label)}</span><svg class="nd-chev" viewBox="0 0 24 24" data-grp-toggle="1"><path d="${P.chev}"/></svg></div>
     <div class="nd-sub"><div>${items}</div></div></div>`;
const PROJMGR = [['alloc','alloc','จัดสรรคน','ลงคนตามคำตอบในรอบลงคิว'],['drive','drive','จัดไฟล์งาน','สร้างโฟลเดอร์งานในไดรฟ์'],['projroom','projroom','ห้องโปรเจกต์','ห้อง Discord + โพสต์คู่มืองาน']];
const FIN = [['queue','payq','คิวจ่ายเงิน','จ่ายเงินทีม · ใบยืนยันยอด','queue-badge'],['payroll','payroll','รอบจ่ายรายเดือน','รวมยอดรายเดือนของแต่ละคน'],
             ['profit','profit','สรุปการเงิน','รายรับ รายจ่าย กำไร'],['docs','docs','เอกสาร','ใบแจ้งหนี้ ใบเสร็จ ใบสำคัญจ่าย 50 ทวิ'],['payment','payment','บัญชีรับเงิน','บัญชี/QR ท้ายใบแจ้งหนี้']];
function buildNav(){
  const a=$('admin-nav'), s=$('staff-nav'), m=$('manager-nav');
  if(!a||!s||!m) return;
  const pm = PROJMGR.map(([p,i,l])=>item(p,i,l)).join('');
  a.innerHTML = item('home','home','หน้าแรก') + sec('งาน')
    + item('availability','queueAvail','ลงคิว') + item('assign','assign','มอบหมายงาน')
    + grp('projmgr','nd-projmgr','projmgr','จัดการโปรเจกต์',pm)
    + item('projects','projects','โปรเจกต์',badge('deadline-badge')) + item('track','track','ติดตามงาน',badge('track-badge'))
    + item('calc','calc','คำนวนราคา') + sec('บัญชี')
    + grp('fin','nd-fin','fin','บัญชี',FIN.map(([p,i,l,,b])=>item(p,i,l,b?badge(b):'')).join(''))
    + sec('ทีมงาน') + item('staff','team','จัดการทีม');
  s.innerHTML = item('home','home','หน้าแรก') + sec('ของฉัน')
    + item('my-calendar','track','ปฏิทินงาน') + item('my-dashboard','money','งานของฉัน')
    + item('confirm-amount','confirm','ยืนยันยอด',badge('ca-badge-staff'))
    + item('nd-docs','docs','เอกสารของฉัน') + sec('อื่น ๆ') + item('nd-notifs','bell','การแจ้งเตือน') + item('nd-settings','settings','ตั้งค่า');
  m.innerHTML = item('home','home','หน้าแรก') + sec('งาน')
    + item('availability','queueAvail','ลงคิว') + item('assign','assign','มอบหมายงาน')
    + grp('projmgr','nd-projmgr','projmgr','จัดการโปรเจกต์',pm)
    + item('projects','projects','โปรเจกต์') + item('track','track','ติดตามงาน') + item('mgr-calc','calc','คำนวนราคา')
    + sec('ของฉัน') + item('mgr-home','mine','ภาพรวมของฉัน') + item('confirm-amount','confirm','ยืนยันยอด',badge('ca-badge-mgr'))
    + item('mgr-team','team','จัดการทีม')
    + item('nd-docs','docs','เอกสารของฉัน') + sec('อื่น ๆ') + item('nd-notifs','bell','การแจ้งเตือน') + item('nd-settings','settings','ตั้งค่า');
  const side=document.querySelector('aside.sidebar'); if(!side) return;
  side.classList.add('nd-side');
  // ปุ่มย่อ/ขยายเมนู (เดสก์ท็อป) — ใช้ฟังก์ชันเดิม toggleMobileMenu (จำค่าไว้ให้ด้วย)
  const tg=document.createElement('div'); tg.className='nd-x nd-toggle'; tg.dataset.tip='ขยาย/ย่อเมนู';
  tg.innerHTML=svg('toggle')+'<span class="nd-lb">ย่อเมนู</span>'; tg.onclick=()=>{ try{ toggleMobileMenu(); }catch(e){} };
  side.insertBefore(tg, side.firstChild);
  // รายการเมนูอยู่ในกล่องเลื่อนของตัวเอง · ส่วนท้าย (แจ้งเตือน/ธีม/โปรไฟล์) ติดด้านล่างเสมอ ไม่ตกขอบจอ
  const scroll=document.createElement('div'); scroll.className='nd-scroll';
  [a, s, m].forEach(el=>scroll.appendChild(el));
  side.insertBefore(scroll, side.firstChild);
  // ปุ่มย่อเมนูอยู่นอกกล่องเลื่อน — เมนูยาว (เมเนเจอร์) เลื่อนลงแล้วปุ่มยังอยู่บนสุดเสมอ
  tg.style.flexShrink='0'; side.insertBefore(tg, scroll);
  // ย้ายปุ่มจากแถบบนมาไว้ท้ายเมนู (id เดิม → JS เดิมอัปเดต badge/ซ่อน-แสดงได้เหมือนเดิม)
  const foot=document.createElement('div'); foot.className='nd-foot'; side.appendChild(foot);
  const LB={'top-safe-btn':'Safe Mode','top-notif-btn':'เปิดแจ้งเตือนเดสก์ท็อป','top-sync-btn':'ซิงค์รายชื่อจากชีท','top-inbox-btn':'คำขอจากเมเนเจอร์','top-bell-btn':'แจ้งเตือน'};
  // ขอสิทธิ์แจ้งเตือนเดสก์ท็อป = ไม่ใช้ (แจ้งเตือนเป็นรายการในเว็บเท่านั้น) · ช็อตคัทมีในเมนูโปรไฟล์แล้ว
  ['top-notif-btn'].forEach(id=>{ const x=$(id); if(x){ x.classList.add('nd-off'); } });
  document.querySelectorAll('.top-bar-right > .top-bar-icon-btn').forEach(b=>{
    if(b.id==='top-notif-btn' || /keyboard|ช็อต/i.test(b.title||'')) return;
    const lbl = LB[b.id] || (b.hasAttribute('data-theme-toggle') ? 'สลับธีม' : /keyboard|ช็อต/i.test(b.title||'') ? 'ช็อตคัทแป้นพิมพ์' : (b.title||''));
    // แยกอิโมจิกับ badge: ข้อความแรกของปุ่ม = อิโมจิ
    const t=[...b.childNodes].find(n=>n.nodeType===3 && n.textContent.trim());
    if(t){ const e=document.createElement('span'); e.className='nd-emo'; e.textContent=t.textContent.trim(); b.replaceChild(e,t); }
    const l=document.createElement('span'); l.className='nd-lb'; l.textContent=lbl; b.appendChild(l);
    b.dataset.tip=lbl; foot.appendChild(b);
  });
  // ช่วยเหลือ = ทัวร์แนะนำการใช้งาน (ระบบเดิม)
  const help=document.createElement('button'); help.className='top-bar-icon-btn nd-help-btn'; help.dataset.tip='ช่วยเหลือ / ทัวร์แนะนำ';
  help.innerHTML='<span class="nd-emo">❓</span><span class="nd-lb">ช่วยเหลือ</span>'; help.onclick=()=>ndHelp();
  foot.insertBefore(help, foot.firstChild);
  const av=$('top-bar-avatar'); if(av){ const w=document.createElement('button'); w.className='top-bar-icon-btn'; w.dataset.tip='โปรไฟล์และตั้งค่า';
    w.onclick=e=>{ try{ toggleProfileMenu(e); }catch(_){} }; av.onclick=null; av.removeAttribute('onclick'); w.appendChild(av);
    const l=document.createElement('span'); l.className='nd-lb'; l.id='nd-av-name'; l.textContent='โปรไฟล์'; w.appendChild(l); foot.appendChild(w); }
  // ⚙️ ตั้งค่า & สำรองข้อมูล — อยู่ในเมนูโปรไฟล์ (กดรูปโปรไฟล์) ไม่ให้เมนูซ้ายรก · แสดงเฉพาะแอดมิน
  const pmenu=$('profile-menu'), pmFirst=pmenu&&pmenu.querySelector('.profile-menu-item');
  // แอดมิน: ตั้งค่า · ซิงค์รายชื่อจากชีท · ช่วยเหลือ อยู่ในเมนูโปรไฟล์ (เมเนเจอร์/สต๊าฟ: ช่วยเหลืออยู่ท้ายเมนูซ้ายเหมือนเดิม)
  if(pmFirst){ [['nd-pm-settings','⚙️','ตั้งค่า & สำรองข้อมูล',()=>nav('settings')],
                ['nd-pm-sync','🔄','ซิงค์รายชื่อจากชีท',()=>{ try{ syncFromSheet(); }catch(e){} }],
                ['nd-pm-help','❓','ช่วยเหลือ',()=>ndHelp()]].forEach(([id,ic,lb,fn])=>{
      const it=document.createElement('div'); it.className='profile-menu-item nd-admin-only'; it.id=id;
      it.innerHTML=`<span class="profile-menu-icon">${ic}</span><span>${lb}</span>`;
      it.onclick=()=>{ try{ closeProfileMenu(); }catch(_){} fn(); }; pmenu.insertBefore(it, pmFirst); }); }
  // สลับธีม: ไอคอนพระอาทิตย์/พระจันทร์ (แบบเดียวกับหน้าสต๊าฟ)
  const th=document.querySelector('.nd-foot [data-theme-toggle]');
  if(th){ const e=th.querySelector('.nd-emo'); if(e) e.outerHTML=
      '<svg class="nd-ic nd-moon" viewBox="0 0 24 24"><path d="M20.5 14.8A8.5 8.5 0 0 1 9.2 3.5 8.5 8.5 0 1 0 20.5 14.8z"/></svg>'+
      '<svg class="nd-ic nd-sun" viewBox="0 0 24 24"><path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm-1-6h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z"/></svg>';
    const l=th.querySelector('.nd-lb'); if(l) l.innerHTML='<span class="nd-moon">โหมดมืด</span><span class="nd-sun">โหมดสว่าง</span>'; }
  // ปุ่มย้อนกลับเดิม: ลอยมุมซ้ายบนของเนื้อหา
  const back=$('top-back-btn'); if(back) document.body.appendChild(back);
}

/* ❓ ช่วยเหลือ: ทัวร์แนะนำ + ช็อตคัทแป้นพิมพ์ */
function ndHelp(){
  try{ nav('nd-help'); return; }catch(e){}   // หน้าช่วยเหลือเต็มหน้า (ทัวร์ + คำถามที่พบบ่อย)
  window._ndHelpGo=fn=>{ document.getElementById('tag-overlay')?.remove(); try{ fn(); }catch(e){} };
  try{ _tagOverlayShow('❓ ช่วยเหลือ', '<div style="display:flex;flex-direction:column;gap:10px">'
    +'<button class="btn btn-outline" style="justify-content:flex-start;padding:12px 14px" onclick="_ndHelpGo(showFirstTimeTour)">🧭 ทัวร์แนะนำการใช้งาน</button>'
    +'<button class="btn btn-outline" style="justify-content:flex-start;padding:12px 14px" onclick="_ndHelpGo(showKeyboardHelp)">⌨️ ช็อตคัทแป้นพิมพ์</button></div>', 380); }
  catch(e){ try{ showFirstTimeTour(); }catch(_){} }
}
window.ndHelp=ndHelp;
/* เมนูโปรไฟล์: ตัดสลับธีม (มีปุ่มพระอาทิตย์/พระจันทร์แล้ว) · ช็อตคัทอยู่ในช่วยเหลือ · เปลี่ยนรหัสผ่านของแอดมินอยู่หน้าตั้งค่า · แก้ไขโปรไฟล์ล่างสุด */
function tidyProfileMenu(){
  const pm=$('profile-menu'); if(!pm) return;
  pm.querySelectorAll('.profile-menu-item').forEach(it=>{ const oc=it.getAttribute('onclick')||'';
    if(/toggleTheme|showKeyboardHelp/.test(oc)) it.classList.add('nd-off');
    if(/openChangePasswordDialog/.test(oc)) it.classList.add('nd-not-admin');
    if(/openProfileModal/.test(oc)){ const sep=pm.querySelector('.profile-menu-sep'); if(sep) pm.insertBefore(it, sep); } });
}
/* ⚙️ หน้าตั้งค่า (แอดมิน): การ์ดเปลี่ยนรหัสผ่าน */
function addPasswordToSettings(){
  const g=$('setpane-general'); if(!g || $('nd-set-pw')) return;
  const c=document.createElement('div'); c.id='nd-set-pw';
  c.style.cssText='background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap';
  c.innerHTML='<div style="font-size:22px">🔐</div><div style="flex:1;min-width:200px"><div style="font-weight:800">บัญชีของฉัน · เปลี่ยนรหัสผ่าน</div><div style="font-size:12px;color:var(--text2)">ตั้งรหัสผ่านใหม่ที่ใช้เข้าสู่ระบบ</div></div><button class="btn btn-blue btn-sm" type="button">🔑 เปลี่ยนรหัสผ่าน</button>';
  c.querySelector('button').onclick=()=>{ try{ openChangePasswordDialog(); }catch(e){} };
  g.insertBefore(c, g.firstChild);
  // 🔒 ย้ายข้อมูลส่วนตัวทีมออกจากทะเบียนที่ทุกคนอ่านได้ (กดครั้งเดียวหลังอัปโหลดเวอร์ชันนี้)
  if(!$('nd-set-priv')){ const k=document.createElement('div'); k.id='nd-set-priv'; k.style.cssText=c.style.cssText;
    const paint=()=>{ const on=!!window._privSplitOn;
      k.innerHTML='<div style="font-size:22px">🔒</div><div style="flex:1;min-width:220px"><div style="font-weight:800">ความเป็นส่วนตัวของข้อมูลทีม</div><div style="font-size:12px;color:var(--text2);line-height:1.6">'
        +(on?'✅ ย้ายแล้ว — เลขบัญชี / เลขผู้เสียภาษี / ที่อยู่ ของสมาชิก เห็นเฉพาะแอดมินกับเจ้าตัว'
            :'ตอนนี้สมาชิกทุกคนที่ล็อกอินเปิดดูเลขบัญชี / เลขผู้เสียภาษี / ที่อยู่ ของคนอื่นได้ — กดย้ายไปที่ปลอดภัย (ทำหลังอัปโหลดเว็บเวอร์ชันนี้ + เพิ่มสิทธิ์ใน Firebase แล้ว)')
        +'</div></div><button class="btn '+(on?'btn-outline':'btn-blue')+' btn-sm" type="button">'+(on?'🔁 ย้ายซ้ำ (ถ้ามีข้อมูลตกค้าง)':'🔒 ย้ายข้อมูลส่วนตัว')+'</button>';
      k.querySelector('button').onclick=async()=>{ try{ await migratePrivateData(); }catch(e){} paint(); }; };
    paint(); c.after(k);
    const pg=$('page-settings'); if(pg) new MutationObserver(()=>{ if(!pg.classList.contains('hidden')) paint(); }).observe(pg,{attributes:true,attributeFilter:['class']}); }
}
/* โฟลเดอร์: ดับเบิลคลิกหัวโฟลเดอร์ = หุบ/กาง · ลูกศรเล็ก = หุบ/กาง */
function wireFolders(){
  document.addEventListener('mousedown',e=>{ const h=e.target.closest('.nd-grp>.nav-item'); if(h && e.detail===1) h.parentElement._wasOpen=h.parentElement.classList.contains('open'); },true);
  document.addEventListener('dblclick',e=>{ const h=e.target.closest('.nd-grp>.nav-item'); if(!h) return; e.preventDefault();
    const g=h.parentElement; g.classList.toggle('open', !g._wasOpen); try{ getSelection().removeAllRanges(); }catch(_){} });
  document.addEventListener('click',e=>{ const t=e.target.closest('[data-grp-toggle]'); if(!t) return; e.stopPropagation(); e.preventDefault();
    const g=t.closest('.nd-grp'); setTimeout(()=>g.classList.toggle('open'),0); },true);
  document.querySelectorAll('aside.sidebar, .nd-scroll').forEach(el=>el.addEventListener('scroll',e=>{ if(e.target.scrollLeft) e.target.scrollLeft=0; }));
  // ป้ายชื่อเมนูตอนย่อเมนู
  const tip=document.createElement('div'); tip.className='nd-tip'; document.body.appendChild(tip);
  document.addEventListener('mouseover',e=>{ const n=e.target.closest('.sidebar [data-tip]');
    if(!n || !document.body.classList.contains('sidebar-collapsed') || innerWidth<=768){ tip.classList.remove('show'); return; }
    const r=n.getBoundingClientRect(); tip.textContent=n.dataset.tip; tip.style.left=(r.right+10)+'px'; tip.style.top=(r.top+r.height/2)+'px'; tip.classList.add('show'); });
}
/* เปิดหน้าไหน → กางโฟลเดอร์ที่มีหน้านั้น */
function syncFolders(page){
  document.querySelectorAll('.nd-grp').forEach(g=>{
    const inside=[...g.querySelectorAll('.nd-sub .nav-item')].some(n=>(n.getAttribute('onclick')||'').includes(`'${page}'`));
    const head=(g.firstElementChild.getAttribute('onclick')||'').includes(`'${page}'`);
    g.classList.toggle('nd-in', inside);
    if(inside||head) g.classList.add('open');
  });
}

/* ─────────── หน้าโฟลเดอร์ ─────────── */
function makeFolderPage(id, title, sub, list){
  if($('page-'+id)) return;
  const d=document.createElement('div'); d.id='page-'+id; d.className='page hidden';
  d.innerHTML=`<div class="page-header"><div class="page-title">${title}</div><div class="page-subtitle">${sub}</div></div>
    <div class="nd-folder-grid">${list.map(([p,i,l,s])=>`<div class="nd-fcard" onclick="nav('${p}')"><div class="ic">${svg(i,'')}</div><b>${l}</b><span>${s}</span></div>`).join('')}</div>`;
  document.querySelector('.main-content')?.appendChild(d);
}

/* ─────────── เวลาไทย → ฉาก ─────────── */
const BG={ day:{v:S+'bg/day.mp4',p:S+'bg/day.jpg'}, eve:{v:S+'bg/eve.mp4',p:S+'bg/eve.jpg'}, night:{v:S+'bg/night.mp4',p:S+'bg/night.jpg'} };
function thaiPeriod(){
  const [h,m]=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':').map(Number);
  const t=h*60+m;
  if(t>=360&&t<=900) return 'day';                       // 06:00–15:00
  if((t>=901&&t<=1080)||(t>=300&&t<360)) return 'eve';   // 15:01–18:00 และ 05:00–05:59
  return 'night';                                         // 18:01–04:59
}
const wantVideo=()=>{ let p=null; try{ p=localStorage.getItem('guin-bg'); }catch(e){} if(p) return p==='video';
  return !(navigator.connection&&navigator.connection.saveData) && !matchMedia('(prefers-reduced-motion: reduce)').matches; };
let curTod='', pageReady=false;
function applyTod(){
  const t=thaiPeriod(); if(t===curTod) return; curTod=t;
  const bd=document.querySelector('#nd-backdrop .nd-bd-img'); if(bd) bd.style.backgroundImage=`url("${BG[t].p}")`;
  const po=document.querySelector('.nd-stage .poster'); if(po) po.src=BG[t].p;
  const v=document.querySelector('.nd-stage video'); if(v && v.dataset.src!==BG[t].v){ v.dataset.src=BG[t].v; if(v.getAttribute('src')) v.src=BG[t].v; }
  syncVideo();
}
function syncVideo(){
  const v=document.querySelector('.nd-stage video'); if(!v) return;
  const on=wantVideo() && pageReady && !document.hidden && document.body.classList.contains('nd-home');
  v.style.display=wantVideo()?'':'none';
  if(on){ if(!v.getAttribute('src')) v.src=v.dataset.src; v.play().catch(()=>{}); } else v.pause();
}

/* ─────────── ฉากแต่ละหน้าที่ ─────────── */
// ตำแหน่งสิ่งของ (px บนฉาก 1366×768) · ฟอง b=แบบฟอง at=ปลายหาง
const OBJ={
  admin:[['track',655,76,165],['work',151,358,117],['projects',0,425,167],['money',456,407,140],['pin',262,512,54],['folder',127,569,105],
         ['notify',582,557,140],['calc',764,621,87],['team',885,615,60],['help',94,183,68],['profile',1010,490,232]],
  manager:[['track',655,76,165],['work',151,358,117],['history',0,425,167],['money',456,407,140],['pin',262,512,54],['folder',127,569,105],
         ['notify',582,557,140],['calc',764,621,87],['team',885,615,60],['help',94,183,68],['profile',1010,490,232]],
  staff:[['calendar',655,76,165],['money',456,407,140],['notify',582,557,140],['history',0,425,167],['help',94,183,68],['profile',1010,490,232]],
};
const AT={ track:{b:6,at:[738,316]}, calendar:{b:6,at:[738,316]}, help:{b:3,at:[158,216]}, projects:{b:5,at:[118,438]}, history:{b:5,at:[118,438]},
  money:{b:2,at:[492,428]}, notify:{b:1,at:[612,574]}, profile:{b:7,at:[1072,504]}, work:{b:5,at:[250,368]}, pin:{b:3,at:[300,518]},
  folder:{b:3,at:[208,578]}, calc:{b:5,at:[818,626]}, team:{b:2,at:[900,620]} };
const BUBBLE={ 1:{w:326,h:238,tip:[294,237],body:[35,28,255,160]}, 2:{w:264,h:255,tip:[199,254],body:[28,26,208,170]},
  3:{w:279,h:289,tip:[33,287],body:[26,20,232,195]}, 4:{w:338,h:294,tip:[320,293],body:[28,22,285,170]},
  5:{w:284,h:283,tip:[35,282],body:[22,20,240,165]}, 6:{w:193,h:295,tip:[75,0],body:[14,66,179,288]}, 7:{w:267,h:273,tip:[215,272],body:[22,28,232,175]} };

// ตัวเลขสดจากระบบเดิม
const projs=()=>safe(()=>getProjects(),[]);
const activeProjs=()=>projs().filter(p=>p.projStatus!=='cancelled'&&p.projStatus!=='done'&&p.projStatus!=='paid');
const dueIn=(p,n)=>{ if(!p.deadline) return false; const d=Math.ceil((new Date(p.deadline)-new Date(new Date().toDateString()))/864e5); return d>=0&&d<=n; };
const unread=()=>{ const b=$('top-bell-count'); return b && b.style.display!=='none' ? (parseInt(b.textContent)||0) : 0; };
const fmt=n=>safe(()=>fmtB(n),'฿'+Math.round(n||0).toLocaleString());
const openProfile=()=>{ try{ openProfileModal(); }catch(e){} };
const openBell=e=>{ try{ toggleNotifPanel(e||new MouseEvent('click')); }catch(_){} };
const tour=()=>ndHelp();
const POP={
  admin:{
    track:{t:'ติดตามงาน',go:'track',b:()=>`<p>ใกล้กำหนดใน 7 วัน</p><div class="big">${projs().filter(p=>p.projStatus!=='cancelled'&&dueIn(p,7)).length} โปรเจกต์</div>`},
    work:{t:'มอบหมายงาน',go:'assign',b:()=>`<p>งานที่ยังไม่จบ</p><div class="big">${activeProjs().length} งาน</div><p>สร้างงาน / เดทไลน์ราย Role</p>`},
    projects:{t:'โปรเจกต์',go:'projects',b:()=>`<p>โปรเจกต์ทั้งหมด</p><div class="big">${projs().length} โปรเจกต์</div><p>จัดการงานและการจ่ายเงิน</p>`},
    money:{t:'บัญชี',go:'nd-fin',b:()=>`<p>ค่าจ้างทีมค้างจ่าย</p><div class="big">${fmt(safe(()=>sumProjectFinance(projs()).expensePending,0))}</div><p>คิวจ่าย · เอกสาร · สรุปการเงิน</p>`},
    folder:{t:'จัดการโปรเจกต์',go:'nd-projmgr',b:()=>'<p>จัดสรรคน · จัดไฟล์งาน<br>ห้องโปรเจกต์</p>'},
    pin:{t:'ลงคิว',go:'availability',b:()=>'<p>เปิดรอบลงคิว<br>ดูวันว่างของทีม</p>'},
    calc:{t:'คำนวนราคา',go:'calc',b:()=>'<p>คำนวนค่าจ้างและราคางาน</p>'},
    team:{t:'จัดการทีมงาน',go:'staff',b:()=>`<p>สมาชิกในทีม</p><div class="big">${safe(()=>getStaff().length,'—')} คน</div>`},
    notify:{t:'การแจ้งเตือน',fn:openBell,b:()=>unread()?`<p>ยังไม่ได้อ่าน</p><div class="big">${unread()} รายการ</div>`:'<p>ไม่มีรายการใหม่</p>'},
    help:{t:'ช่วยเหลือ',fn:tour,b:()=>'<p>ทัวร์แนะนำการใช้งาน</p>'},
    profile:{t:'โปรไฟล์',fn:openProfile,b:()=>'<p>ดูและแก้ไขโปรไฟล์ของคุณ</p>'},
  },
  manager:{
    track:{t:'ติดตามงาน',go:'track',b:()=>`<p>โปรเจกต์ที่ดูแล</p><div class="big">${safe(()=>getMgrProjects().length,'—')} โปรเจกต์</div>`},
    work:{t:'มอบหมายงาน',go:'assign',b:()=>'<p>สร้างงาน<br>ตั้งเดทไลน์ราย Role</p>'},
    history:{t:'ภาพรวมของฉัน',go:'mgr-home',b:()=>'<p>งานที่ทำและรายได้ของฉัน</p>'},
    money:{t:'ยืนยันยอด',go:'confirm-amount',b:()=>'<p>ยืนยันยอดค่าตอบแทน<br>ของฉัน</p>'},
    folder:{t:'จัดการโปรเจกต์',go:'nd-projmgr',b:()=>'<p>จัดสรรคน · จัดไฟล์งาน<br>ห้องโปรเจกต์</p>'},
    pin:{t:'ลงคิว',go:'availability',b:()=>'<p>เปิดรอบลงคิว<br>ดูวันว่างของทีม</p>'},
    calc:{t:'คำนวนราคา',go:'mgr-calc',b:()=>'<p>คำนวนค่าจ้างและราคางาน</p>'},
    team:{t:'จัดการทีม',go:'mgr-team',b:()=>'<p>ชื่นชม / ขอออกใบเตือน<br>พักงาน</p>'},
    notify:{t:'การแจ้งเตือน',fn:openBell,b:()=>unread()?`<p>ยังไม่ได้อ่าน</p><div class="big">${unread()} รายการ</div>`:'<p>ไม่มีรายการใหม่</p>'},
    help:{t:'ช่วยเหลือ',fn:tour,b:()=>'<p>ทัวร์แนะนำการใช้งาน</p>'},
    profile:{t:'โปรไฟล์',fn:openProfile,b:()=>'<p>ดูและแก้ไขโปรไฟล์ของคุณ</p>'},
  },
  staff:{
    calendar:{t:'ปฏิทินงาน',go:'my-calendar',b:()=>'<p>เดดไลน์งานของฉัน<br>รายเดือน</p>'},
    money:{t:'งานของฉัน',go:'my-dashboard',b:()=>'<p>งานและยอดค่าตอบแทน<br>ของฉัน</p>'},
    history:{t:'ยืนยันยอด',go:'confirm-amount',b:()=>'<p>ตรวจและยืนยันยอด<br>ค่าตอบแทน</p>'},
    notify:{t:'การแจ้งเตือน',fn:openBell,b:()=>unread()?`<p>ยังไม่ได้อ่าน</p><div class="big">${unread()} รายการ</div>`:'<p>ไม่มีรายการใหม่</p>'},
    help:{t:'ช่วยเหลือ',fn:tour,b:()=>'<p>ทัวร์แนะนำการใช้งาน</p>'},
    profile:{t:'โปรไฟล์',fn:openProfile,b:()=>'<p>ดูและแก้ไขโปรไฟล์ของคุณ</p>'},
  },
};

let sceneRole='';
function buildScene(){
  const pg=$('page-home'); if(!pg) return;
  const r=role(); if(sceneRole===r) return; sceneRole=r;
  const objs=OBJ[r].map(([k,x,y,w])=>`<div class="nd-obj" tabindex="0" data-k="${k}" style="left:${x}px;top:${y}px;width:${w}px"><img src="${S}${r}/${k}.png" alt="">${k==='notify'?'<span class="nd-badge" id="nd-noti-badge"></span>':''}</div>`).join('');
  pg.innerHTML=`<div class="nd-vp" id="nd-vp"><div class="nd-box" id="nd-box"><div class="nd-stage" id="nd-stage">
      <img class="poster" alt=""><video muted loop playsinline preload="none"></video>${objs}
      <div class="nd-panel nd-hello"><div class="t" id="nd-hi"></div><div class="s" id="nd-today"></div></div>
      <div class="nd-panel nd-stats" id="nd-stats"></div>
      <div class="nd-panel nd-jobs"><div class="hd"><b id="nd-jobs-t"></b><span id="nd-jobs-n"></span></div><ul id="nd-jobs"></ul></div>
      <div class="nd-pop" id="nd-pop"><div class="in" id="nd-pop-in"></div></div>
    </div></div><div class="nd-cards" id="nd-cards"></div></div>`;
  curTod=''; applyTod();
  const pop=$('nd-pop');
  new MutationObserver(()=>dimUnderPop(pop.classList.contains('show'))).observe(pop,{attributes:true,attributeFilter:['class','style']});
  const canHover=matchMedia('(hover:hover)').matches;
  pg.querySelectorAll('.nd-obj').forEach(o=>{
    const k=o.dataset.k;
    if(canHover){ o.addEventListener('mouseenter',()=>showPop(k)); o.addEventListener('mouseleave',hidePop); }
    o.addEventListener('focus',()=>{ if(canHover) showPop(k); }); o.addEventListener('blur',hidePop);
    const act=e=>{ hidePop(); const c=POP[role()][k]; if(c.go) nav(c.go); else if(c.fn){ e&&e.stopPropagation(); c.fn(e); } };
    o.addEventListener('click',act); o.addEventListener('keydown',e=>{ if(e.key==='Enter') act(e); });
  });
  layout();
}

/* ฟอง: อ่านรูปทรงฟองจริง → ย่อ/ขยายให้พอดีข้อความ แล้ววางข้อความกลางตัวฟอง */
const MASK={};
function loadMask(b){
  const img=new Image();
  img.onload=()=>{ try{
    const w=img.naturalWidth, h=img.naturalHeight, cv=document.createElement('canvas'); cv.width=w; cv.height=h;
    const cx=cv.getContext('2d'); cx.drawImage(img,0,0); const a=cx.getImageData(0,0,w,h).data;
    const sat=new Int32Array((w+1)*(h+1));
    for(let y=0;y<h;y++){ let row=0; for(let x=0;x<w;x++){ row+= a[(y*w+x)*4+3]<128?1:0; sat[(y+1)*(w+1)+x+1]=sat[y*(w+1)+x+1]+row; } }
    const D=new Float32Array(w*h), INF=1e9, S2=Math.SQRT2;
    for(let i=0;i<w*h;i++) D[i]= a[i*4+3]<128?0:INF;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x; if(!D[i]) continue;
      D[i]=Math.min(D[i], x?D[i-1]+1:0, y?D[i-w]+1:0, x&&y?D[i-w-1]+S2:0, y&&x<w-1?D[i-w+1]+S2:0); }
    for(let y=h-1;y>=0;y--) for(let x=w-1;x>=0;x--){ const i=y*w+x; if(!D[i]) continue;
      D[i]=Math.min(D[i], x<w-1?D[i+1]+1:0, y<h-1?D[i+w]+1:0, x<w-1&&y<h-1?D[i+w+1]+S2:0, y<h-1&&x?D[i+w-1]+S2:0); }
    let mx=0; for(const d of D) if(d>mx) mx=d;
    let sx=0,sy=0,n=0; for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(D[y*w+x]>=mx*.55){ sx+=x; sy+=y; n++; }
    MASK[b]={w,h,sat,cx:sx/n,cy:sy/n,cache:{}};
  }catch(e){} };
  img.src=`${S}bubble${b}.png`;
}
function inscribed(b,R){
  const M=MASK[b], key=R.toFixed(2); if(M.cache[key]) return M.cache[key];
  const {w,h,sat,cx,cy}=M, W=w+1, out=(x0,y0,x1,y1)=>sat[y1*W+x1]-sat[y0*W+x1]-sat[y1*W+x0]+sat[y0*W+x0];
  const fits=k=>{ const x0=Math.floor(cx-k*R),x1=Math.ceil(cx+k*R),y0=Math.floor(cy-k),y1=Math.ceil(cy+k); return x0>=0&&y0>=0&&x1<=w&&y1<=h&&out(x0,y0,x1,y1)===0; };
  let lo=0, hi=Math.min(cy,h-cy,cx/R,(w-cx)/R);
  while(hi-lo>.25){ const m=(lo+hi)/2; fits(m)?lo=m:hi=m; }
  return M.cache[key]={h:lo*2,w:lo*2*R,x:cx-lo*R,y:cy-lo};
}
function showPop(k){
  const c=POP[role()][k], a=AT[k], b=BUBBLE[a.b], pop=$('nd-pop'), inn=$('nd-pop-in'); if(!pop) return;
  inn.innerHTML=`<h4>${c.t}</h4>${safe(c.b,'')}<span class="go">คลิกเพื่อเข้า</span>`;
  // url ใน CSS ตัวแปรจะอ้างจากตำแหน่งไฟล์ nd.css (อยู่ใน scene/) → ใช้ลิงก์เต็มแทน กันชี้ผิดโฟลเดอร์
  pop.style.setProperty('--bub',`url("${new URL(S+'bubble'+a.b+'.png',document.baseURI).href}")`);
  let sx,sy,body;
  if(MASK[a.b]){
    Object.assign(inn.style,{left:'0',top:'0',width:'max-content',height:'auto',maxWidth:'190px'});
    const CW=inn.offsetWidth+32, CH=inn.offsetHeight+24; let pick=null;
    for(let d=1/1.3; d<=1.3+1e-6; d*=1.07){ const r=inscribed(a.b,(CW/CH)/d); if(!r.h) continue;
      const ty=CH/r.h, tx=d*ty, area=b.w*tx*b.h*ty; if(!pick||area<pick.area) pick={area,sx:tx,sy:ty,r}; }
    ({sx,sy}=pick); body=[pick.r.x*sx,pick.r.y*sy,pick.r.w*sx,pick.r.h*sy];
  } else { sx=sy=.75; body=[b.body[0]*sx,b.body[1]*sy,(b.body[2]-b.body[0])*sx,(b.body[3]-b.body[1])*sy]; }
  Object.assign(pop.style,{width:b.w*sx+'px',height:b.h*sy+'px',left:a.at[0]-b.tip[0]*sx+'px',top:a.at[1]-b.tip[1]*sy+'px',transformOrigin:`${b.tip[0]*sx}px ${b.tip[1]*sy}px`});
  Object.assign(inn.style,{left:body[0]+'px',top:body[1]+'px',width:body[2]+'px',height:body[3]+'px',maxWidth:'none'});
  pop.classList.add('show');
}
const hidePop=()=>$('nd-pop')?.classList.remove('show');
function dimUnderPop(on){
  const pop=$('nd-pop'); if(!pop) return;
  const L=pop.offsetLeft, T=pop.offsetTop, R=L+pop.offsetWidth, B=T+pop.offsetHeight;
  document.querySelectorAll('#nd-stage .nd-panel').forEach(p=>{
    const hit=on && !(p.offsetLeft+p.offsetWidth<L || p.offsetLeft>R || p.offsetTop+p.offsetHeight<T || p.offsetTop>B);
    p.classList.toggle('dim',!!hit); });
}

/* จัดฉากตามขนาดจอ: แนวนอน = เต็มจอ · แนวตั้ง = แบนเนอร์ + การ์ด */
function layout(){
  const vp=$('nd-vp'), box=$('nd-box'), st=$('nd-stage'), cards=$('nd-cards'); if(!vp||!st) return;
  const w=vp.clientWidth, h=vp.clientHeight; if(!w||!h) return;
  const stack=w/h<1.15; document.body.classList.toggle('nd-stack',stack);
  st.querySelectorAll('.nd-panel').forEach(()=>{});
  const panels=[...document.querySelectorAll('#nd-stage .nd-panel, #nd-cards .nd-panel')];
  panels.forEach(p=>{ const to=stack?cards:st; if(p.parentElement!==to) to.insertBefore(p, to===st?$('nd-pop'):null); });
  if(stack){ const s=w/1366; box.style.height=768*s+'px'; st.style.transform=`scale(${s})`; }
  else { box.style.height=''; const cover=Math.max(w/1366,h/768), contain=Math.min(w/1366,h/768);
    st.style.transform=`scale(${cover/contain<=1.25?cover:contain}) translate(-50%,-50%)`; }
}

/* กล่องข้อมูลบนฉาก — ใช้หน้าที่ระบบเดิมคำนวณไว้ (ตัวเลข/การกดตรงกับของเดิม) */
const clone=id=>{ const el=$(id); return el?el.innerHTML:''; };
function fillPanels(){
  const r=role(), cu=CU()||{};
  const hi=$('nd-hi'); if(!hi) return;
  hi.textContent='สวัสดี, '+(cu.nickname||cu.name||'')+' ☃';
  $('nd-today').textContent=new Date().toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const st=$('nd-stats'), jl=$('nd-jobs'), jt=$('nd-jobs-t'), jn=$('nd-jobs-n');
  if(r==='admin'){
    safe(()=>renderDash());
    st.innerHTML=clone('dash-stats');
    jt.textContent='ต้องทำตอนนี้';
    const chips=[...document.querySelectorAll('#dash-priority [onclick]')].filter(c=>c.children.length>=3);
    const tot=chips.reduce((s,c)=>s+(parseInt(c.children[1].textContent)||0),0);
    jn.textContent=chips.length?tot+' รายการ':'';
    jl.innerHTML=chips.length?chips.map(c=>{ const sp=c.children[0].querySelectorAll('span'); const col=c.children[1].style.color||'';
      return `<li onclick="${esc(c.getAttribute('onclick'))}" style="border-left-color:${esc(col)}"><span class="n">${esc(sp[0]?.textContent||'')} ${esc(sp[1]?.textContent||'')}</span><span class="d" style="color:${esc(col)}">${esc(c.children[1].textContent)}</span><span class="r">${esc(c.children[2].textContent)}</span></li>`; }).join('')
      :'<div class="nd-empty">🎉 เคลียร์งานครบแล้ว · ไม่มีอะไรค้าง</div>';
  } else if(r==='manager'){
    safe(()=>renderMgrHome());
    st.innerHTML=clone('mgr-home-stats');
    jt.textContent='โปรเจกต์ที่ดูแล';
    const mp=safe(()=>getMgrProjects(),[]);
    // ✅ เสร็จแล้ว = สถานะโปรเจกต์ เสร็จ/จ่ายแล้ว หรือทุกขั้นในติดตามงานเป็น "ส่งแล้ว" → ไม่นับว่าเลยกำหนด · เรียงไว้ท้าย
    const cards=safe(()=>getTrkCards(),[])||[];
    const fin=p=>{ if(p.projStatus==='done'||p.projStatus==='paid') return true;
      const c=cards.find(x=>x&&x.projId===p.id), ph=Object.values((c&&c.phases)||{}); return ph.length>0 && ph.every(x=>x&&x.status==='done'); };
    const list=mp.filter(p=>p.projStatus!=='cancelled').map(p=>({p,f:fin(p)}))
      .sort((a,b)=>(a.f-b.f) || String(a.p.deadline||'9').localeCompare(String(b.p.deadline||'9')));
    const nOpen=list.filter(x=>!x.f).length;
    jn.textContent=nOpen+' โปรเจกต์'+(list.length>nOpen?' · เสร็จ '+(list.length-nOpen):'');
    jl.innerHTML=list.length?list.map(({p,f})=>{ const d=p.deadline?Math.ceil((new Date(p.deadline)-new Date(new Date().toDateString()))/864e5):null;
      const col=f?'#1fb57a':d===null?'':d<0?'#e0506e':d<=3?'#e67e00':'';
      return `<li onclick="nav('track')" style="${col?'border-left-color:'+col:''}${f?';opacity:.75':''}"><span class="n">${esc(safe(()=>projDisp(p),p.name||''))}</span><span class="d" style="color:${col||'inherit'}">${f?'✅ เสร็จแล้ว':d===null?'—':d<0?'เลย '+(-d)+' วัน':d===0?'ส่งวันนี้':'อีก '+d+' วัน'}</span></li>`; }).join('')
      :'<div class="nd-empty">ยังไม่มีโปรเจกต์ที่ดูแล</div>';
  } else {
    safe(()=>renderMyDash());
    st.innerHTML=clone('my-summary-grid');
    st.querySelectorAll(':scope>div').forEach(d=>d.classList.add('stat-card'));
    jt.textContent='งานของฉัน';
    const rows=[...document.querySelectorAll('#my-proj-table tr')].filter(tr=>tr.cells&&tr.cells.length>=3);
    jn.textContent=rows.length?rows.length+' งาน':'';
    jl.innerHTML=rows.length?rows.slice(0,12).map(tr=>`<li onclick="nav('my-dashboard')"><span class="n">${esc(tr.cells[0].textContent.trim())}</span><span class="d">${esc(tr.cells[1].textContent.trim())}</span><span class="r">${esc((tr.cells[tr.cells.length-1]||{}).textContent||'')}</span></li>`).join('')
      :'<div class="nd-empty">ยังไม่มีงาน</div>';
  }
  const nb=$('nd-noti-badge'); if(nb) nb.textContent=unread()||'';
  layout();
}

/* ─────────── เมนูล่าง (มือถือ) ─────────── */
function buildBottomBar(){
  let bb=document.querySelector('.nd-bbar'); if(!bb){ bb=document.createElement('nav'); bb.className='nd-bbar'; document.body.appendChild(bb); }
  const r=role(); if(bb.dataset.role===r) return; bb.dataset.role=r;
  const it=(p,i,l)=>`<div class="nav-item" onclick="nav('${p}')">${svg(i,'')}<span>${l}</span></div>`;
  const L={ admin:[['home','home','หน้าแรก'],['projects','projects','โปรเจกต์'],['queue','payq','คิวจ่าย'],['staff','team','ทีม']],
            manager:[['home','home','หน้าแรก'],['track','track','ติดตาม'],['assign','assign','มอบหมาย'],['confirm-amount','confirm','ยืนยันยอด']],
            staff:[['home','home','หน้าแรก'],['my-calendar','track','ปฏิทิน'],['my-dashboard','money','งานของฉัน'],['confirm-amount','confirm','ยืนยันยอด']] }[r];
  bb.innerHTML=L.map(x=>it(...x)).join('')+`<div class="nd-x" onclick="toggleMobileMenu()">${svg('menu','')}<span>เมนู</span></div>`;
}

/* ─────────── เข้า/ออกหน้าแรก (ดูจากการซ่อน/แสดงหน้า — ทำงานทุกทาง รวมปุ่มย้อนกลับ) ─────────── */
let refreshT=0;
function onPageChange(){
  const home=$('page-home'), isHome=home && !home.classList.contains('hidden');
  document.body.classList.toggle('nd-home', !!isHome);
  const page=window._currentPage||''; syncFolders(page);
  if(isHome){ buildScene(); fillPanels();
    // ข้อมูลจาก Firebase อาจมาช้ากว่าหน้า (เหมือน safety retry ของระบบเดิม) → เติมซ้ำอีก 2 ครั้ง
    setTimeout(()=>{ if(document.body.classList.contains('nd-home')) fillPanels(); },900);
    setTimeout(()=>{ if(document.body.classList.contains('nd-home')) fillPanels(); },2200);
    clearInterval(refreshT); refreshT=setInterval(()=>{ if(!document.hidden && document.body.classList.contains('nd-home')) fillPanels(); },30000); }
  else { hidePop(); clearInterval(refreshT); }
  syncVideo();
}

/* ─────────── ⚙️ ค่าที่ผู้ใช้ตั้งเอง (ธีม · วิดีโอพื้นหลัง · เมนูซ้าย) ───────────
   เก็บในเครื่อง (โหลดเร็ว ไม่กระพริบ) + users/<uid>/prefs ใน Firebase → เข้าเครื่องไหนก็ได้ค่าเดิม */
const P_THEME='app_theme_v1', P_BG='guin-bg', P_SIDE='app_sidebar_collapsed';
const lsGet=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const lsSet=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
const curPrefs=()=>({ theme:lsGet(P_THEME)==='light'?'light':'dark', bg:wantVideo()?'video':'image', side:lsGet(P_SIDE)==='1'?'collapsed':'open' });
let prefsSaveT=null;
function savePrefsRemote(){ clearTimeout(prefsSaveT); prefsSaveT=setTimeout(()=>{ const cu=CU(); const db=safe(()=>_fbDatabase,null);
  if(cu&&cu.uid&&db) db.ref('users/'+cu.uid+'/prefs').set({...curPrefs(), at:new Date().toISOString()}).catch(()=>{}); },600); }
function applyPrefs(p, quiet){
  if(!p) return;
  if(p.theme && p.theme!==curPrefs().theme){ lsSet(P_THEME,p.theme); try{ applyTheme(p.theme); }catch(e){} }
  if(p.bg){ lsSet(P_BG,p.bg); syncVideo(); }
  if(p.side && innerWidth>768){ const c=p.side==='collapsed'; lsSet(P_SIDE,c?'1':'0'); document.body.classList.toggle('sidebar-collapsed',c); }
  renderPrefs();
}
let prefsLoadedFor='';
let prefsTry=0;
async function loadPrefsRemote(){ const cu=CU(); const db=safe(()=>_fbDatabase,null);
  if(!cu||!cu.uid||!db){ if(++prefsTry<12) setTimeout(loadPrefsRemote,1500); return; }   // รอข้อมูลผู้ใช้โหลดเสร็จ
  if(prefsLoadedFor===cu.uid) return;
  prefsLoadedFor=cu.uid;
  try{ const sn=await db.ref('users/'+cu.uid+'/prefs').get(); if(sn.exists()) applyPrefs(sn.val(),true); else savePrefsRemote(); }catch(e){} }
window.ndSetPref=function(k,v){
  if(k==='theme'){ try{ setTheme(v); }catch(e){ lsSet(P_THEME,v); } }
  if(k==='bg'){ lsSet(P_BG,v); syncVideo(); try{ toast(v==='video'?'🎬 เปิดวิดีโอพื้นหลังแล้ว':'🖼️ ปิดวิดีโอพื้นหลังแล้ว (ใช้ภาพนิ่งแทน)','info'); }catch(e){} }
  if(k==='side'){ const c=v==='collapsed'; lsSet(P_SIDE,c?'1':'0'); if(innerWidth>768) document.body.classList.toggle('sidebar-collapsed',c); }
  savePrefsRemote(); renderPrefs();
};
function prefsHTML(){
  const p=curPrefs(), seg=(k,opts)=>`<div class="nd-seg">${opts.map(([v,l])=>`<button type="button" class="${p[k]===v?'on':''}" onclick="ndSetPref('${k}','${v}')">${l}</button>`).join('')}</div>`;
  return `<div class="nd-set-card"><div class="nd-set-h">🎨 การแสดงผล <span>บันทึกไว้กับบัญชีของคุณ — เข้าเครื่องไหนก็ได้ค่าเดิม</span></div>
    <div class="nd-set-row"><div><b>ธีม</b><small>สีพื้นหลังของเว็บ</small></div>${seg('theme',[['light','☀️ สว่าง'],['dark','🌙 มืด']])}</div>
    <div class="nd-set-row"><div><b>วิดีโอพื้นหลังหน้าแรก</b><small>ปิดเพื่อใช้ภาพนิ่ง — ประหยัดเน็ต/แบตเตอรี่</small></div>${seg('bg',[['video','🎬 เปิด'],['image','🖼️ ปิด']])}</div>
    <div class="nd-set-row nd-desk-only"><div><b>เมนูด้านซ้าย</b><small>ให้กางชื่อเมนูไว้เสมอ หรือย่อเหลือแต่ไอคอน</small></div>${seg('side',[['open','📖 กางไว้เสมอ'],['collapsed','📕 ย่อไว้']])}</div></div>`;
}
function accountHTML(){
  return `<div class="nd-set-card"><div class="nd-set-h">🔐 บัญชีของฉัน</div>
    <div class="nd-set-row"><div><b>รหัสผ่าน</b><small>ระบบเก็บรหัสแบบเข้ารหัส จึงเปิดดูรหัสเดิมไม่ได้ — ถ้าลืม ตั้งรหัสใหม่ได้เลยตอนที่ยังล็อกอินอยู่ (กด 👁️ ดูรหัสที่พิมพ์ได้)</small></div>
      <button class="btn btn-blue btn-sm" type="button" onclick="openChangePasswordDialog()">🔑 ตั้งรหัสผ่านใหม่</button></div></div>`;
}
function renderPrefs(){ const a=$('nd-prefs-slot'); if(a) a.innerHTML=prefsHTML(); const b=$('nd-set-body'); if(b) b.innerHTML=prefsHTML()+accountHTML(); }
function setupPrefs(){
  // หน้าตั้งค่าของสต๊าฟ/เมเนเจอร์ (แอดมินใช้หน้าตั้งค่าเดิม + การ์ดการแสดงผลด้านบน)
  if(!$('page-nd-settings')){ const d=document.createElement('div'); d.id='page-nd-settings'; d.className='page hidden';
    d.innerHTML='<div class="page-header"><div class="page-title">⚙️ ตั้งค่า</div><div class="page-subtitle">การแสดงผล · บัญชีของฉัน</div></div><div id="nd-set-body" style="max-width:760px"></div>';
    document.querySelector('.main-content')?.appendChild(d);
    new MutationObserver(()=>{ if(!d.classList.contains('hidden')) renderPrefs(); }).observe(d,{attributes:true,attributeFilter:['class']}); }
  const g=$('setpane-general'); if(g && !$('nd-prefs-slot')){ const s=document.createElement('div'); s.id='nd-prefs-slot'; g.insertBefore(s,g.firstChild); }
  const pg=$('page-settings'); if(pg) new MutationObserver(()=>{ if(!pg.classList.contains('hidden')) renderPrefs(); }).observe(pg,{attributes:true,attributeFilter:['class']});
  // เมนูโปรไฟล์ (สต๊าฟ/เมเนเจอร์): ⚙️ ตั้งค่า
  const pm=$('profile-menu'), first=pm&&pm.querySelector('.profile-menu-item');
  if(first && !$('nd-pm-mysettings')){ const it=document.createElement('div'); it.className='profile-menu-item nd-not-admin'; it.id='nd-pm-mysettings';
    it.innerHTML='<span class="profile-menu-icon">⚙️</span><span>ตั้งค่า</span>'; it.onclick=()=>{ try{ closeProfileMenu(); }catch(_){} nav('nd-settings'); };
    pm.insertBefore(it, first); }
  // กดสลับธีม (พระอาทิตย์/พระจันทร์) หรือย่อเมนู → บันทึกกับบัญชีด้วย
  if(typeof window.setTheme==='function'){ const _st=window.setTheme; window.setTheme=function(){ const r=_st.apply(this,arguments); savePrefsRemote(); renderPrefs(); return r; }; }
  if(typeof window.toggleMobileMenu==='function'){ const _tm=window.toggleMobileMenu; window.toggleMobileMenu=function(){ const r=_tm.apply(this,arguments); if(innerWidth>768) savePrefsRemote(); return r; }; }
}

/* ─────────── 🔔 หน้าแจ้งเตือน · ❓ หน้าช่วยเหลือ · 📨 คำขอของเมเนเจอร์ · เปลี่ยนหน้าแบบจางซ้อน ─────────── */
function mkPage(id, title, sub, bodyId, onShow){
  if($('page-'+id)) return;
  const d=document.createElement('div'); d.id='page-'+id; d.className='page hidden';
  d.innerHTML=`<div class="page-header"><div class="page-title">${title}</div><div class="page-subtitle">${sub}</div></div><div id="${bodyId}" style="max-width:860px"></div>`;
  document.querySelector('.main-content')?.appendChild(d);
  new MutationObserver(()=>{ if(!d.classList.contains('hidden')) onShow(); }).observe(d,{attributes:true,attributeFilter:['class']});
}
const FAQ={
  staff:[
    ['ใบยืนยันยอดคืออะไร ต้องทำอะไร?','เมื่อแอดมินส่งใบยืนยันยอด จะมีแจ้งเตือนและตัวเลขขึ้นที่เมนู "ยืนยันยอด" — ตรวจยอดของแต่ละงาน ถ้าถูกกด ✅ ยืนยัน ถ้าไม่ถูกกด ✗ ปฏิเสธ แล้วใส่ "ยอดที่ขอ" กับเหตุผล แอดมินจะแก้ยอดแล้วส่งใบใหม่ให้'],
    ['เงินจะเข้าเมื่อไหร่?','หลังคุณยืนยันยอดแล้ว และลูกค้าจ่ายเงินให้สตูดิโอแล้ว แอดมินจะโอนให้ — ดูสถานะได้ที่ "งานของฉัน" (✅ ได้รับแล้ว / ⌛ ยังไม่ได้รับ)'],
    ['ดูงานย้อนหลังยังไง?','เมนู "งานของฉัน" — กรองตามสถานะ โรล และช่วงเวลา (เดือนนี้ / 3 เดือนล่าสุด / ปีนี้ / เลือกเดือน) ได้'],
    ['แก้บัญชีรับเงิน / ข้อมูลส่วนตัว','กดรูปโปรไฟล์ → "โปรไฟล์" → ปุ่ม "✏️ แก้ไขโปรไฟล์" มุมขวาบน แล้วกดบันทึก'],
    ['อยากรับงานโรลเพิ่ม หรือเลิกรับบางโรล','หน้าโปรไฟล์ → แก้ไข → ส่วน "โรล / ตำแหน่งงาน" กดขอเพิ่มหรือ × ขอลด — คำขอจะรอแอดมินอนุมัติ'],
    ['ลืมรหัสผ่าน','ถ้ายังล็อกอินอยู่: เมนูโปรไฟล์ → ⚙️ ตั้งค่า → "ตั้งรหัสผ่านใหม่" (ระบบดูรหัสเดิมไม่ได้เพราะเก็บแบบเข้ารหัส) · ถ้าออกจากระบบแล้ว: หน้าล็อกอินกด "ลืมรหัสผ่าน?" ระบบจะส่งลิงก์ตั้งรหัสใหม่ไปทางอีเมล'],
    ['ปิดวิดีโอพื้นหลัง / เปลี่ยนธีม','เมนูโปรไฟล์ → ⚙️ ตั้งค่า — ค่าที่ตั้งจะจำไว้กับบัญชี เข้าเครื่องไหนก็ได้ค่าเดิม'],
  ],
  manager:[
    ['ขอออกใบเตือนสมาชิก','หน้า "จัดการทีม" → ✉️ — ระบบจะส่งเป็นคำขอให้แอดมินอนุมัติก่อน ใบเตือนจึงจะออกจริง ดูสถานะคำขอได้ที่ "ภาพรวมของฉัน"'],
    ['ทำไมไม่เห็นชื่อลูกค้า?','ตามนโยบายสตูดิโอ เมเนเจอร์ดูยอดและกำไรของงานที่ตัวเองดูแลหรือลงทำได้ แต่ไม่เห็นชื่อลูกค้า'],
    ['งานที่ขึ้นว่า "ดูอย่างเดียว"','เป็นงานที่คุณลงทำแต่ไม่ได้เป็นคนดูแล — ดูรายละเอียดได้ แต่แก้/ลบ/เปลี่ยนสถานะไม่ได้'],
  ],
};
function renderHelp(){
  const b=$('nd-help-body'); if(!b) return; const r=role();
  const qs=[...(r==='manager'?FAQ.manager:[]), ...FAQ.staff];
  b.innerHTML=`<div class="nd-set-card"><div class="nd-set-h">🧭 เริ่มต้นใช้งาน</div>
      <div class="nd-set-row"><div><b>ทัวร์แนะนำการใช้งาน</b><small>พาดูเมนูหลักทีละขั้น</small></div><button class="btn btn-blue btn-sm" type="button" onclick="try{showFirstTimeTour()}catch(e){}">▶ เริ่มทัวร์</button></div>
      ${r==='admin'?'<div class="nd-set-row"><div><b>ช็อตคัทแป้นพิมพ์</b><small>ปุ่มลัดสำหรับใช้งานเร็วขึ้น</small></div><button class="btn btn-outline btn-sm" type="button" onclick="try{showKeyboardHelp()}catch(e){}">⌨️ ดูช็อตคัท</button></div>':''}</div>
    <div class="nd-set-card"><div class="nd-set-h">❓ คำถามที่พบบ่อย</div>
      ${qs.map(([q,a])=>`<details class="nd-faq"><summary>${esc(q)}</summary><div>${esc(a)}</div></details>`).join('')}</div>
    <div class="nd-set-card"><div class="nd-set-h">💬 ติดต่อแอดมิน</div><div class="nd-set-row"><div><small>ถ้ายังหาคำตอบไม่เจอ ทักแอดมินในดิสคอร์ดของสตูดิโอได้เลย</small></div></div></div>`;
}
// 📨 เมเนเจอร์: คำขอที่ส่งให้แอดมิน (ยกเลิกได้ระหว่างรอ)
const REQ_LB={warning:'✉️ ขอออกใบเตือน',rename:'✏️ ขอเปลี่ยนชื่อโปรเจกต์'};
function renderMyReqs(){
  const pg=$('page-mgr-home'); const cu=CU(); if(!pg||!cu||role()!=='manager') return;
  let box=$('nd-myreq'); if(!box){ box=document.createElement('div'); box.id='nd-myreq'; const h=pg.querySelector('.page-header'); pg.insertBefore(box, h?h.nextSibling:pg.firstChild); }
  const mine=safe(()=>getMgrRequests(),[]).filter(r=>r&&r.managerId===cu.uid&&REQ_LB[r.type]).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,6);
  const st={pending:['⏳ รออนุมัติ','var(--orange)'],approved:['✅ อนุมัติแล้ว','var(--green)'],rejected:['✕ ไม่อนุมัติ','var(--red)'],cancelled:['↩ ยกเลิกแล้ว','var(--text2)']};
  box.innerHTML=mine.length?`<div class="nd-set-card"><div class="nd-set-h">📨 คำขอที่ส่งให้แอดมิน <span>ล่าสุด ${mine.length} รายการ</span></div>
    ${mine.map(r=>{ const [l,c]=st[r.status]||st.pending; const who=r.staffName||safe(()=>getStaffById(r.staffId).nickname,'')||r.curName||'';
      return `<div class="nd-set-row"><div><b>${REQ_LB[r.type]}${who?' · '+esc(who):''}</b><small>${esc(r.warnType||r.newName||'')}${r.projName?' · '+esc(r.projName):''}</small></div>
        <span style="font-size:12px;font-weight:700;color:${c}">${l}</span>${r.status==='pending'?`<button class="btn btn-outline btn-sm" type="button" onclick="ndCancelReq('${esc(r.id)}')">ยกเลิกคำขอ</button>`:''}</div>`; }).join('')}</div>`:'';
}
window.ndCancelReq=async function(id){
  if(!confirm('ยกเลิกคำขอนี้?')) return;
  const all=safe(()=>getMgrRequests(),[]); const r=all.find(x=>x.id===id); if(!r||r.status!=='pending') return;
  r.status='cancelled'; try{ ls('mgr_requests',all); }catch(e){}
  const db=safe(()=>_fbDatabase,null); if(db){ try{ await db.ref('mgrRequests/'+id+'/status').set('cancelled'); }catch(e){} }
  try{ toast('↩ ยกเลิกคำขอแล้ว','info'); }catch(e){} renderMyReqs();
};
// 📄 เอกสารของฉัน (สต๊าฟ/เมเนเจอร์) — ใบสำคัญจ่ายของตัวเอง จาก staffDocs/<staffId> (แอดมินเป็นคนคัดสำเนาให้)
let myDocs=null, myDocsYear='all', myDocsPg=1;
const ROLE_TH={dub:'พากย์',adp:'เกลาบท',mix:'มิกซ์',qc:'QC',sub:'ซับ/วิดีโอ',trn:'แปล',mgr:'จัดการงาน'};
async function loadMyDocs(){
  const cu=CU(), db=safe(()=>_fbDatabase,null); const b=$('nd-docs-body'); if(!b) return;
  if(!cu||!cu.staffId){ b.innerHTML='<div class="nd-set-card"><div class="nd-set-row"><div><b>ยังไม่ได้ผูกบัญชีกับรายชื่อทีม</b><small>ติดต่อแอดมินให้ผูกบัญชี แล้วเอกสารของคุณจะขึ้นที่นี่</small></div></div></div>'; return; }
  b.innerHTML='<div class="nd-set-card"><div class="nd-set-row"><div><small>⏳ กำลังโหลดเอกสาร…</small></div></div></div>';
  try{ const sn=await db.ref('staffDocs/'+cu.staffId).get(); myDocs=Object.values(sn.exists()?(sn.val()||{}):{}); }
  catch(e){ myDocs=[]; }
  renderMyDocs();
}
const docDate=d=>{ const s=String(d.date||d.createdAt||''); const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return new Date(+m[1],+m[2]-1,+m[3]);
  const t=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(t){ let y=+t[3]; if(y>2400) y-=543; return new Date(y,+t[2]-1,+t[1]); } return null; };
// จัดเป็น "รอบจ่ายเงิน": 1–15 และ 16–สิ้นเดือน · แต่ละรอบมีใบสำคัญจ่าย + 50 ทวิ
const TH_M=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function roundOf(x){ if(!x) return {k:'0000-00-0',t:'ไม่ระบุวันที่'}; const y=x.getFullYear(), m=x.getMonth(), h=x.getDate()<=15?1:2;
  const last=new Date(y,m+1,0).getDate(); return {k:y+'-'+String(m+1).padStart(2,'0')+'-'+h, t:'รอบ '+(h===1?'1–15':'16–'+last)+' '+TH_M[m]+' '+(y+543)}; }
function renderMyDocs(){
  const b=$('nd-docs-body'); if(!b||!myDocs) return;
  const all=myDocs.filter(d=>d&&d.docNo);
  const years=[...new Set(all.map(d=>{ const x=docDate(d); return x?x.getFullYear():null; }).filter(Boolean))].sort((a,c)=>c-a);
  if(myDocsYear!=='all' && !years.includes(+myDocsYear)) myDocsYear='all';
  const list=all.filter(d=>{ if(myDocsYear==='all') return true; const x=docDate(d); return x && x.getFullYear()===+myDocsYear; });
  const vouchers=list.filter(d=>d.type!=='wht' && !d.cancelled), sum=vouchers.reduce((a,d)=>a+(Number(d.amount)||0),0), nW=list.filter(d=>d.type==='wht').length;
  // กลุ่มตามรอบ ใหม่ → เก่า
  const groups={}; list.forEach(d=>{ const r=roundOf(docDate(d)); (groups[r.k]=groups[r.k]||{t:r.t,docs:[]}).docs.push(d); });
  const keys=Object.keys(groups).sort().reverse();
  const per=5, pages=Math.max(1,Math.ceil(keys.length/per)); if(myDocsPg>pages) myDocsPg=pages;
  const row=d=>{ const x=docDate(d), wht=d.type==='wht', dt=x?x.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}):'—';
    const sub = wht ? `หนังสือรับรองการหักภาษี ณ ที่จ่าย · ภาษีที่หัก ${fmt(d.tax)}`
      : (d.items||[]).map(it=>`${esc(it.projName||'งาน')}${ROLE_TH[String(it.slot||'').split('-')[0]]?' · '+ROLE_TH[String(it.slot||'').split('-')[0]]:''}`).join(' · ');
    return `<div class="nd-doc${d.cancelled?' off':''}"><div class="nd-doc-ic">${wht?'🏛️':'🧾'}</div><div class="nd-doc-t"><b>${wht?'50 ทวิ · ':'ใบสำคัญจ่าย · '}${esc(d.docNo)}${d.cancelled?' <span class="nd-doc-x">ยกเลิกแล้ว</span>':''}</b>
      <small>${dt}${wht?'':' · '+(d.items||[]).length+' งาน'}</small><small class="nd-doc-j">${sub}</small></div>
      <div class="nd-doc-a"><span class="nd-doc-amt">${fmt(d.amount)}</span>${d.cancelled?'':`<button class="btn btn-outline btn-sm" type="button" onclick="ndMyDocOpen('${esc(d.docNo)}','${wht?'wht':'voucher'}')">📥 เปิด / ดาวน์โหลด</button>`}</div></div>`; };
  const grpHTML=keys.slice((myDocsPg-1)*per, myDocsPg*per).map(k=>{ const g=groups[k]; g.docs.sort((a,c)=>(a.type==='wht')-(c.type==='wht'));
    const tot=g.docs.filter(d=>d.type!=='wht'&&!d.cancelled).reduce((a,d)=>a+(Number(d.amount)||0),0);
    return `<div class="nd-set-card"><div class="nd-set-h">💸 ${g.t} <span>${g.docs.length} เอกสาร · รับ ${fmt(tot)}</span></div>${g.docs.map(row).join('')}</div>`; }).join('');
  const chip=(v,l)=>`<button type="button" class="${String(myDocsYear)===String(v)?'on':''}" onclick="ndMyDocsYear('${v}')">${l}</button>`;
  b.innerHTML=`<div class="nd-set-card"><div class="nd-set-h">📄 เอกสารทั้งหมดของฉัน <span>ใบสำคัญจ่าย ${vouchers.length} ใบ · รวม ${fmt(sum)}${nW?' · 50 ทวิ '+nW+' ใบ':''}</span></div>
      <div class="nd-set-row"><div class="nd-seg">${chip('all','ทั้งหมด')}${years.map(y=>chip(y,'ปี '+(y+543))).join('')}</div></div></div>
    ${grpHTML||'<div class="nd-set-card"><div class="nd-set-row"><div><small>'+(all.length?'ไม่มีเอกสารในปีนี้':'ยังไม่มีเอกสาร — ใบสำคัญจ่าย / 50 ทวิ จะขึ้นที่นี่เองหลังแอดมินออกใบในรอบจ่ายเงิน')+'</small></div></div></div>'}
    ${pages>1?`<div style="display:flex;justify-content:center;gap:6px;margin:4px 0 14px">${Array.from({length:pages},(_,k)=>`<button class="btn btn-sm ${k+1===myDocsPg?'btn-blue':'btn-outline'}" type="button" onclick="ndMyDocsPage(${k+1})">${k+1}</button>`).join('')}</div>`:''}
    <div class="nd-set-card"><div class="nd-set-row"><div><small>💡 เอกสารเก็บไว้ที่นี่ตลอด โหลดซ้ำได้เสมอ · ถ้ายอดหรือข้อมูลในใบไม่ถูกต้อง แจ้งแอดมินได้เลย</small></div></div></div>`;
}
window.ndMyDocsYear=v=>{ myDocsYear=v; myDocsPg=1; renderMyDocs(); };
window.ndMyDocsPage=n=>{ myDocsPg=n; renderMyDocs(); };
window.ndMyDocOpen=function(no, type){
  const d=(myDocs||[]).find(x=>x.docNo===no && ((type==='wht')===(x.type==='wht'))); const cu=CU(); if(!d) return;
  try{
    if(d.type==='wht'){ printWhtDoc(d); return; }
    const s=safe(()=>getStaffById(cu.staffId),null)||{name:d.staffName,nickname:d.staffNickname};
    downloadDocHTML(buildMultiVoucherHTML({vNo:d.docNo, staff:s, items:d.items||[], totalAmt:Number(d.amount)||0, date:d.date, note:d.note||''}), d.docNo);
  }catch(e){ try{ toast('เปิดเอกสารไม่สำเร็จ: '+e.message,'error'); }catch(_){} }
};
function setupExtraPages(){
  mkPage('nd-docs','📄 เอกสารของฉัน','ใบสำคัญจ่าย และ 50 ทวิ ของคุณ แยกตามรอบจ่ายเงิน — เปิดดูหรือดาวน์โหลดได้เสมอ','nd-docs-body',loadMyDocs);
  mkPage('nd-notifs','🔔 การแจ้งเตือน','แจ้งเตือนทั้งหมดของคุณ (เก็บไว้ 30 วัน)','nd-nf-body',()=>{ try{ renderNotifPage(); }catch(e){} });
  mkPage('nd-help','❓ ช่วยเหลือ','ทัวร์แนะนำ · คำถามที่พบบ่อย','nd-help-body',renderHelp);
  // ลิงก์ "ดูทั้งหมด" ท้ายกล่องแจ้งเตือน
  const np=$('notif-panel'); if(np && !$('nd-nf-all')){ const a=document.createElement('div'); a.id='nd-nf-all';
    a.style.cssText='padding:10px;text-align:center;border-top:1px solid var(--border2);background:var(--bg2);font-size:12.5px;font-weight:700;color:var(--accent2);cursor:pointer';
    a.textContent='ดูแจ้งเตือนทั้งหมด →'; a.onclick=()=>{ try{ closeNotifPanel(); }catch(e){} nav('nd-notifs'); }; np.appendChild(a); }
  const mh=$('page-mgr-home'); if(mh) new MutationObserver(()=>{ if(!mh.classList.contains('hidden')){ renderMyReqs(); safe(()=>loadMgrRequests(),null)?.then?.(renderMyReqs); } }).observe(mh,{attributes:true,attributeFilter:['class']});
}
// 🗂️ ขั้น 4: ห่อเนื้อหาใต้หัวเพจของทุกหน้าย่อยเป็นแผ่นการ์ดใหญ่ (.nd-sheet) — ย้ายกล่องเดิมเข้าไปทั้งกล่อง id เดิมอยู่ครบ ระบบเดิมวาดได้ตามปกติ
const NO_SHEET=/^page-(home|nd-|staff-detail$|my-history$|payment-history$)/;
function sheetify(){
  document.querySelectorAll('.main-content > .page').forEach(pg=>{
    // หัวเพจ: ชื่อ + คำอธิบาย อยู่กองเดียวกันทางซ้าย · ปุ่มอยู่ขวา
    const hd=pg.querySelector(':scope > .page-header');
    if(hd && !hd.querySelector(':scope > .nd-htext')){ const t=hd.querySelector(':scope > .page-title'), s=hd.querySelector(':scope > .page-subtitle');
      if(t){ const w=document.createElement('div'); w.className='nd-htext'; t.before(w); w.appendChild(t); if(s) w.appendChild(s); } }
    if(NO_SHEET.test(pg.id) || pg.querySelector(':scope > .nd-sheet')) return;
    const kids=[...pg.children].filter(c=>!c.classList.contains('page-header') && !c.classList.contains('nd-safe-note'));
    if(!kids.length) return;
    const sh=document.createElement('div'); sh.className='nd-sheet';
    kids[0].before(sh); kids.forEach(k=>sh.appendChild(k));
  });
}
// เปลี่ยนหน้า: หน้าเก่าค่อย ๆ จางออก ซ้อนกับหน้าใหม่ที่ค่อย ๆ จางเข้า (ไม่เลื่อน ไม่เด้ง)
function ghostOut(){
  const old=document.querySelector('.main-content > .page:not(.hidden)');
  if(!old || old.id==='page-home' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r=old.getBoundingClientRect(); if(r.height<10) return;
  let host=$('nd-ghost-host'); if(!host){ host=document.createElement('div'); host.id='nd-ghost-host'; document.body.appendChild(host); }
  host.innerHTML='';
  const g=old.cloneNode(true); g.removeAttribute('id'); g.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
  g.querySelectorAll('video,iframe,canvas').forEach(e=>e.remove());
  g.className=old.className+' nd-ghost';
  g.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;margin:0;pointer-events:none;z-index:60;opacity:1;transition:opacity .28s ease`;
  host.appendChild(g);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ g.style.opacity='0'; }));
  setTimeout(()=>{ if(g.parentNode) g.remove(); },380);
}

function init(){
  if(!$('app-layout')) return;
  // ห่อพื้นหลังไว้ในกล่องธรรมดาอีกชั้น — ระบบเดิมจะถือว่ากล่อง fixed เต็มจอที่อยู่ใต้ body ตรง ๆ เป็น "ป็อปอัป"
  // แล้วผูกกับปุ่มย้อนกลับ (กดย้อน = ลบทิ้ง) · อยู่ในกล่องห่อจึงไม่โดน
  const host=document.createElement('div'); host.id='nd-bg-host';
  host.innerHTML='<div id="nd-backdrop"><div class="nd-bd-img"></div><div class="nd-bd-tint"></div></div>';
  document.body.insertBefore(host, document.body.firstChild);
  buildNav(); wireFolders(); tidyProfileMenu(); addPasswordToSettings(); setupPrefs(); setupExtraPages();
  try{ sheetify(); }catch(e){ console.warn('sheetify',e); }
  // 🔔 กดครั้งเดียวแต่ระบบเดิมแจ้งเตือนซ้อน 2 ชั้น (เช่น Safe Mode) → ภายใน 0.7 วินาที เหลือข้อความล่าสุดอันเดียว
  if(typeof window.toast==='function'){ const _t=window.toast; let last=0;
    window.toast=function(){ const now=Date.now(); if(now-last<700){ const w=$('toastWrap'), prev=w&&w.lastElementChild; if(prev) prev.remove(); } last=now; return _t.apply(this,arguments); }; }
  makeFolderPage('nd-projmgr','📁 จัดการโปรเจกต์','จัดสรรคน · จัดไฟล์งาน · ห้องโปรเจกต์',PROJMGR);
  makeFolderPage('nd-fin','💰 บัญชี','รวมหมวดการเงินไว้ที่เดียว',FIN);
  // 🙈 Safe Mode: หน้าสรุปการเงินเบลอทั้งหน้า + ข้อความให้ปิด Safe Mode ก่อนดู
  const prof=$('page-profit'); if(prof && !prof.querySelector('.nd-safe-note')){ const n=document.createElement('div'); n.className='nd-safe-note';
    n.innerHTML='<div class="ic">🙈</div><b>เปิด Safe Mode อยู่</b><span>หน้าสรุปการเงินถูกซ่อนไว้ทั้งหน้า<br>ปิด Safe Mode ก่อนถึงจะเห็นตัวเลข</span><button class="btn btn-blue btn-sm" type="button">🔓 ปิด Safe Mode</button>';
    n.querySelector('button').onclick=()=>{ try{ toggleSafeModeQuick(); }catch(e){} };
    prof.insertBefore(n, prof.firstChild); }
  const home=document.createElement('div'); home.id='page-home'; home.className='page hidden';
  document.querySelector('.main-content').insertBefore(home, document.querySelector('.main-content').firstChild);
  // หน้าแรกเดิมของแอดมิน (ภาพรวมระบบ) รวมเข้าฉากแล้ว → ใครเรียกหน้านี้ ให้ไปหน้าแรกแทน
  const _nav=window.nav;
  window.nav=function(p){ if(p==='dashboard') p='home';
    try{ const cur=document.querySelector('.main-content > .page:not(.hidden)'); if(cur && cur.id!=='page-'+p) ghostOut(); }catch(e){}
    return _nav.apply(this,[p]); };
  // เฝ้าดูการซ่อน/แสดงหน้า
  const mo=new MutationObserver(()=>onPageChange());
  document.querySelectorAll('.main-content > .page').forEach(p=>mo.observe(p,{attributes:true,attributeFilter:['class']}));
  // เมนูล่างสร้างตามหน้าที่ตอนเข้าระบบ
  new MutationObserver(()=>{ if(!$('app-layout').classList.contains('hidden')){ buildBottomBar(); document.body.classList.toggle('nd-is-admin', role()==='admin'); setTimeout(loadPrefsRemote,1500); sceneRole&&sceneRole!==role()&&(sceneRole=''); onPageChange(); } })
    .observe($('app-layout'),{attributes:true,attributeFilter:['class']});
  applyTod(); setInterval(applyTod,30000);
  addEventListener('resize',layout);
  document.addEventListener('visibilitychange',syncVideo);
  addEventListener('load',()=>setTimeout(()=>{ pageReady=true; syncVideo(); },300));
  (window.requestIdleCallback||(f=>setTimeout(f,800)))(()=>{ for(let b=1;b<=7;b++) loadMask(b); },{timeout:2500});
  // ชื่อบนปุ่มโปรไฟล์
  setInterval(()=>{ const n=$('nd-av-name'), cu=CU(); if(n&&cu) n.textContent=(cu.nickname||cu.name||'โปรไฟล์'); },3000);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
