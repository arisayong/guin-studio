/* ══════════════════════════════════════════════════════════════════
   🧾 nd-acct.js — หน้า "งานบัญชี" (นักบัญชี + แอดมินใช้หน้าเดียวกัน)
   • ดึงผลจากระบบเดิม (ใบสำคัญจ่าย · 50 ทวิ · รอบรายเดือน · งวดรับเงิน · ค่าใช้จ่ายบริษัท) มาเช็กเป็นขั้น ๆ ต่อเดือน
   • นักบัญชี = ทีมงานที่แอดมินติ๊กให้ (admin_config/accountants/<uid> = true) · ดูได้ทั้งหมด แก้/จ่ายเงินไม่ได้
   • สิ่งที่นักบัญชีบันทึกได้: ✓ ตรวจแล้ว / หมายเหตุ / ไฟล์แนบ (misc/acct_<YYYY-MM>) และ "คำขอให้เจ้าของโอน" (misc/payreqs)
   ══════════════════════════════════════════════════════════════════ */
(function(){
const $=id=>document.getElementById(id);
const safe=(f,d)=>{ try{ const v=f(); return v===undefined?d:v; }catch(e){ return d; } };
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const B=n=>safe(()=>fmtB(n),'฿'+(+n||0).toLocaleString());
const arr=v=>Array.isArray(v)?v.filter(Boolean):Object.values(v||{}).filter(Boolean);
const iso=v=>safe(()=>_anyDateIso(v),String(v||'').slice(0,10));
const ym=v=>{ const s=String(v||''); if(!s) return ''; return iso(s).slice(0,7); };
const TM=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const mLabel=k=>{ const [y,m]=String(k).split('-'); return TM[(+m||1)-1]+' '+((+y||0)+543); };
const isAdm=()=>safe(()=>currentUser.role==='admin',false);
const isAcct=()=>isAdm()||safe(()=>!!currentUser.acct,false);
const me=()=>safe(()=>currentUser.nickname||currentUser.email,'');
const SSO_RATE=0.05;

let MONTH=new Date().toISOString().slice(0,7), D=null, A={}, OPEN=new Set(['s1']), BUSY=false, HIST={};

/* ── ข้อมูล ── */
// ⚡ โหลดพร้อมกันทุกก้อน (เดิมรอทีละก้อน ~12 รอบ) · จำข้อมูลหลักไว้ 5 นาที · สลับเดือนไม่ต้องโหลดใหม่
let BASE=null, BASE_AT=0, MON_AT=0;
const K=async k=>{ try{ return await fbLoadKeyed(k); }catch(e){ return null; } };
async function loadBase(force){
  if(BASE && !force && Date.now()-BASE_AT<300000) return;
  const db=safe(()=>_fbDatabase,null), out={vouchers:[],invoices:[],receipts:[],projects:[],priv:{}}, jobs=[];
  if(isAdm() || !db){   // แอดมิน = ใช้ข้อมูลที่โหลดไว้แล้ว · ไม่มีฐานข้อมูล (เดโม่) = ใช้ในเครื่อง
    out.vouchers=arr(safe(()=>getDocsStore('vouchers'),[])); out.invoices=arr(safe(()=>getDocsStore('invoices'),[])); out.receipts=arr(safe(()=>getDocsStore('receipts'),[]));
    out.projects=arr(safe(()=>getProjects(),[]));
  } else {
    jobs.push(db.ref('docs').get().then(sn=>{ const d=sn.val()||{}; out.vouchers=arr(d.vouchers); out.invoices=arr(d.invoices); out.receipts=arr(d.receipts); })
      .catch(()=>{ out.err='อ่านเอกสารไม่ได้ — แอดมินต้องอัปเดตกฎ Firebase (สิทธิ์นักบัญชี)'; }));
    const lp=arr(safe(()=>getProjects(),[]));   // เมเนเจอร์มีโปรเจกต์ในเครื่องอยู่แล้ว → ไม่ต้องโหลดซ้ำ
    if(lp.length) out.projects=lp; else jobs.push(db.ref('projects').get().then(sn=>{ out.projects=arr(sn.val()); }).catch(()=>{}));
    jobs.push(db.ref('staffPrivate').get().then(sn=>{ out.priv=sn.val()||{}; }).catch(()=>{}));
  }
  jobs.push(K('wht_docs').then(v=>{ out.wht=arr(v); }), K('company_expenses').then(v=>{ out.exp=arr(v); }),
            K('payroll_profiles').then(v=>{ out.payroll=v||{}; }), K('acct_cfg').then(v=>{ out.cfg=v||{}; }));
  await Promise.all(jobs);
  BASE=out; BASE_AT=Date.now();
}
// สถานะงานบัญชี 6 เดือนล่าสุด (ไฟล์เล็ก ดึงพร้อมกัน)
async function loadMonths(force){
  if(!force && Object.keys(HIST).length && Date.now()-MON_AT<60000) return;
  const ks=lastMonths(6); const vals=await Promise.all(ks.map(k=>K('acct_'+k)));
  HIST={}; ks.forEach((k,i)=>{ HIST[k]=vals[i]||{}; }); MON_AT=Date.now();
}
async function load(force){ await Promise.all([loadBase(force), loadMonths(force)]); D=BASE; A=HIST[MONTH]||{}; }
function lastMonths(n){ const out=[], d=new Date(); d.setDate(1); for(let i=0;i<n;i++){ out.push(d.toISOString().slice(0,7)); d.setMonth(d.getMonth()-1); } return out; }
async function saveA(){ A.updatedAt=new Date().toISOString(); A.by=me(); HIST[MONTH]=A; try{ await fbSaveKeyed('acct_'+MONTH, A); }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message,'error'); } }
const staffOf=id=>{ const s=safe(()=>getStaffById(id),null)||{}; const p=(D.priv||{})[id]||{}; return Object.assign({}, s, s.profile||{}, p, p.profile||{}); };
const taxOfItem=it=>{ if(it.taxPct!=null&&it.taxPct!=='') return +it.taxPct||0; const p=D.projects.find(x=>x.id===it.projId); return p?(parseFloat((p.tax||{})[String(it.slot||'').split('-')[0]])||0):0; };
function vStats(v){ let g=0,t=0; (v.items&&v.items.length?v.items:[{amount:v.amount}]).forEach(it=>{ const a=+it.amount||0, p=taxOfItem(it); g+=a; t+=a-Math.round(a*(1-p/100)); }); return {gross:g, tax:t, net:g-t}; }

/* ── คำนวณแต่ละขั้น ── */
function compute(){
  const M=MONTH, vs=D.vouchers.filter(v=>!v.cancelled&&ym(v.date||v.createdAt)===M);
  const rounds=[1,2].map(r=>{ const L=vs.filter(v=>((+iso(v.date||v.createdAt).slice(8,10))<=15)===(r===1));
    return {r, list:L, people:new Set(L.map(v=>v.staffId)).size, wht:L.filter(v=>v.whtNo).length, needWht:L.filter(v=>vStats(v).tax>0).length,
      sent:L.filter(v=>v.emailStatus==='sent').length, noMail:L.filter(v=>v.emailStatus==='noemail'||v.emailStatus==='failed').length,
      net:L.reduce((a,v)=>a+vStats(v).net,0)}; });
  const salaried=Object.entries(D.payroll||{}).filter(([,p])=>p&&(p.payType==='salary'||p.payType==='hybrid')).map(([id,p])=>{ const s=staffOf(id), base=parseFloat(p.baseSalary)||0, cap=+(D.cfg.ssoCap||15000);
    return {id, name:s.nickname||s.name||id, base, allow:parseFloat(p.allowance)||0, sso:Math.round(Math.min(base,cap)*SSO_RATE)}; });
  const missing=[]; const seen=new Set();
  vs.forEach(v=>{ const s=staffOf(v.staffId), st=vStats(v), n=s.nickname||s.name||v.staffNickname||v.staffId;
    if(st.tax>0 && !seen.has(v.staffId)){ seen.add(v.staffId); const lack=[]; if(!(s.taxId||s.taxid||s.idCard)) lack.push('เลขผู้เสียภาษี'); if(!(s.addr||s.address)) lack.push('ที่อยู่'); if(lack.length) missing.push({who:n, what:lack.join(' + ')+' (ใช้ใน 50 ทวิ)'}); }
    if(v.emailStatus==='noemail') missing.push({who:n, what:'อีเมล — ส่งใบสำคัญจ่าย '+v.docNo+' ไม่ได้'});
    if(v.emailStatus==='failed') missing.push({who:n, what:'ส่งเมลไม่สำเร็จ '+v.docNo+' (ส่งซ้ำได้ที่หน้าเอกสาร)'}); });
  const inc=[]; D.projects.forEach(p=>(arr(p.income)).forEach(r=>{ if(r.paidAt&&ym(r.paidAt)===M) inc.push({client:p.client||'(ไม่ระบุลูกค้า)', code:safe(()=>projCode(p),'')||p.name, amount:+r.amount||0, wht:+r.wht||0}); }));
  const byClient={}; inc.forEach(x=>{ const c=byClient[x.client]=byClient[x.client]||{client:x.client, codes:new Set(), amount:0, wht:0}; c.codes.add(x.code); c.amount+=x.amount; c.wht+=x.wht; });
  const receipts=D.receipts.filter(r=>ym(r.date||r.createdAt)===M), invoices=D.invoices.filter(r=>ym(r.date||r.createdAt)===M);
  const exp=D.exp.filter(x=>ym(x.date)===M);
  const wht=D.wht.filter(d=>ym(d.payDate)===M), pnd1=wht.filter(d=>String(d.incomeType)==='401'), pnd3=wht.filter(d=>String(d.incomeType)!=='401');
  const sum=a=>a.reduce((s,d)=>s+(+d.tax||0),0);
  return {vs, rounds, salaried, missing, clients:Object.values(byClient), receipts, invoices, exp, wht, pnd1, pnd3,
    t:{income:inc.reduce((a,x)=>a+x.amount,0), team:vs.reduce((a,v)=>a+vStats(v).net,0), wht:sum(wht), pnd3:sum(pnd3), pnd1:sum(pnd1), exp:exp.reduce((a,x)=>a+(+x.amount||0),0),
       sso:salaried.reduce((a,x)=>a+x.sso*2,0), salary:salaried.reduce((a,x)=>a+x.base+x.allow,0)}};
}

/* ── หน้าจอ ── */
const CSS=`
#nd-acct-body{max-width:1180px}
.ac-mo{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.ac-mo button{font-family:Kanit;border:1px solid var(--border2);background:var(--bg2);color:var(--text);border-radius:10px;padding:5px 12px;cursor:pointer;font-size:12.5px;text-align:center;line-height:1.3}
.ac-mo button small{display:block;font-size:10px;color:var(--text2)} .ac-mo button.on{background:var(--accent);border-color:var(--accent);color:#fff} .ac-mo button.on small{color:#dfe9ff}
.ac-mo button.done{border-color:rgba(0,223,160,.45)} .ac-mo button.done small{color:var(--green)}
.ac-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px} @media(max-width:800px){.ac-kpi{grid-template-columns:1fr 1fr}}
.ac-kpi div{background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:10px 12px} .ac-kpi small{color:var(--text2);font-size:11px;display:block} .ac-kpi b{font-size:18px}
.ac-card{background:var(--card);border:1px solid var(--border2);border-radius:14px;margin-bottom:12px;overflow:hidden}
.ac-st{border-top:1px solid var(--border2)} .ac-st:first-child{border-top:0}
.ac-sh{display:grid;grid-template-columns:30px 1fr auto auto;gap:10px;align-items:center;padding:11px 14px;cursor:pointer}
.ac-sh:hover{background:rgba(255,255,255,.025)}
.ac-ic{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:14px;background:var(--bg2)}
.ac-st.ok .ac-ic{background:rgba(0,223,160,.18)} .ac-st.warn .ac-ic{background:rgba(255,158,0,.2)}
.ac-sh b{font-weight:600} .ac-sh small{display:block;color:var(--text2);font-size:11.5px}
.ac-pill{font-size:11px;border-radius:8px;padding:2px 8px;font-weight:600;white-space:nowrap}
.ac-g{background:rgba(0,223,160,.15);color:var(--green)} .ac-o{background:rgba(255,158,0,.15);color:var(--orange)} .ac-n{background:var(--bg2);color:var(--text2)}
.ac-sb{display:none;padding:2px 14px 14px 54px} .ac-st.open .ac-sb{display:block}
@media(max-width:700px){.ac-sb{padding-left:14px}}
.ac-sb table{width:100%;border-collapse:collapse;font-size:12.5px} .ac-sb th{text-align:left;color:var(--text2);font-weight:600;font-size:11.5px;padding:5px 6px;border-bottom:1px solid var(--border2)} .ac-sb td{padding:5px 6px;border-bottom:1px solid var(--border2)}
.ac-sb td.r,.ac-sb th.r{text-align:right;font-variant-numeric:tabular-nums}
.ac-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px}
.ac-chk{display:inline-flex;gap:6px;align-items:center;font-size:12.5px;border:1px solid var(--border2);border-radius:9px;padding:4px 10px;cursor:pointer;background:var(--bg2)}
.ac-chk.on{border-color:rgba(0,223,160,.5);color:var(--green)}
.ac-mut{color:var(--text2);font-size:12px}
.ac-trk td.c,.ac-trk th.c{text-align:center}
`;
function ensurePage(){
  if($('page-nd-acct')) return;
  const mc=document.querySelector('.main-content'); if(!mc) return;
  if(!$('ac-css')){ const st=document.createElement('style'); st.id='ac-css'; st.textContent=CSS; document.head.appendChild(st); }
  const d=document.createElement('div'); d.id='page-nd-acct'; d.className='page hidden';
  d.innerHTML=`<div class="page-header"><div class="page-title">🧾 งานบัญชี</div><div class="page-subtitle">เช็กงานบัญชีรายเดือนจากข้อมูลจริงของระบบ · โหลดเอกสาร · ส่งคำขอให้เจ้าของโอนภาษี/ประกันสังคม</div></div><div id="nd-acct-body"></div>`;
  mc.appendChild(d);
  new MutationObserver(()=>{ if(!d.classList.contains('hidden')) open(); }).observe(d,{attributes:true,attributeFilter:['class']});
}
async function open(force){ const b=$('nd-acct-body'); if(!b) return;
  if(!isAcct()){ b.innerHTML='<div class="ac-mut" style="padding:40px;text-align:center">🔒 สำหรับนักบัญชีและแอดมิน</div>'; return; }
  if(BUSY) return; BUSY=true; if(!D) b.innerHTML='<div class="ac-mut" style="padding:30px">กำลังโหลดข้อมูลบัญชี…</div>';
  try{ if(D && !force) render(); await load(force); render(); }catch(e){ b.innerHTML='<div class="ac-mut" style="padding:30px">โหลดไม่สำเร็จ: '+E(e.message)+'</div>'; } finally{ BUSY=false; } }
const stepDone=k=>!!(A.steps&&A.steps[k]);
function render(){ const b=$('nd-acct-body'); if(!b||!D) return; const C=compute();
  const chk=(k,lbl)=>`<span class="ac-chk ${stepDone(k)?'on':''}" onclick="ACCT.tick('${k}')">${stepDone(k)?'✅':'⬜'} ${lbl||'ตรวจแล้ว'}${stepDone(k)?` <small class="ac-mut">${E(A.steps[k].by||'')} ${E(String(A.steps[k].at||'').slice(5,10))}</small>`:''}</span>`;
  const st=(k,ic,title,src,pill,cls,body)=>`<div class="ac-st ${stepDone(k)?'ok':cls||''} ${OPEN.has(k)?'open':''}"><div class="ac-sh" onclick="ACCT.tog('${k}')"><div class="ac-ic">${stepDone(k)?'✓':ic}</div><div><b>${title}</b><small>${src}</small></div>${pill}<span class="ac-mut">${OPEN.has(k)?'▾':'▸'}</span></div><div class="ac-sb">${body}<div class="ac-row">${chk(k)}</div></div></div>`;
  const P=(t,c)=>`<span class="ac-pill ${c||'ac-n'}">${t}</span>`;
  const steps=['s1','s2','s3','s4','s5','s6'], done=steps.filter(stepDone).length;
  // 1 รอบจ่ายทีมงาน
  const s1=`<table><tr><th>รอบ</th><th class="r">คน</th><th class="r">ใบสำคัญจ่าย</th><th class="r">50 ทวิ</th><th class="r">ส่งเมลแล้ว</th><th class="r">โอนสุทธิ</th></tr>${C.rounds.map(r=>`<tr><td>${r.r===1?'1–15':'16–สิ้นเดือน'} ${E(mLabel(MONTH))}</td><td class="r">${r.people}</td><td class="r">${r.list.length}</td><td class="r">${r.wht}/${r.needWht}</td><td class="r">${r.sent}/${r.list.length}</td><td class="r">${B(r.net)}</td></tr>`).join('')}</table>
    <div class="ac-row"><button class="btn btn-sm btn-outline" onclick="ACCT.zip()">⬇️ ใบสำคัญจ่ายทั้งเดือน (ZIP)</button><button class="btn btn-sm btn-outline" onclick="ACCT.csvPay()">⬇️ สรุปการโอนจ่าย (Excel/CSV)</button></div>`;
  const s1ok=C.vs.length&&C.rounds.every(r=>r.wht>=r.needWht);
  // 2 เงินเดือน
  const s2=C.salaried.length?`<table><tr><th>พนักงาน</th><th class="r">เงินเดือน</th><th class="r">ค่าอื่น</th><th class="r">สปส. ลูกจ้าง 5%</th><th class="r">สปส. นายจ้าง 5%</th></tr>${C.salaried.map(x=>`<tr><td>${E(x.name)}${x.base?'':' <span class="ac-pill ac-o">ยังไม่ใส่เงินเดือน</span>'}</td><td class="r">${B(x.base)}</td><td class="r">${B(x.allow)}</td><td class="r">${B(x.sso)}</td><td class="r">${B(x.sso)}</td></tr>`).join('')}</table>
    <div class="ac-mut" style="margin-top:6px">ฐานคำนวณประกันสังคมสูงสุด ${B(+(D.cfg.ssoCap||15000))} ${isAcct()?`<a href="javascript:void 0" onclick="ACCT.cap()">แก้</a>`:''} · บันทึกจ่ายจริงที่หน้า "รอบจ่ายรายเดือน"</div>`
    :'<div class="ac-mut">ยังไม่มีพนักงานประเภท "เงินเดือนประจำ/ผสม" — ตั้งได้ที่หน้ารอบจ่ายรายเดือน › ประเภทจ่าย/โบนัส</div>';
  // 3 ข้อมูลที่ขาด
  const s3=C.missing.length?`<table><tr><th>ของใคร</th><th>ขาดอะไร</th></tr>${C.missing.map(m=>`<tr><td>${E(m.who)}</td><td>${E(m.what)}</td></tr>`).join('')}</table><div class="ac-row"><button class="btn btn-sm btn-outline" onclick="ACCT.copyMissing()">📋 คัดลอกรายการ (ส่งให้แอดมิน/ทีมงาน)</button></div>`:'<div class="ac-mut">✅ ข้อมูลครบ</div>';
  // 4 รายรับ & 50 ทวิลูกค้า
  const cw=A.clientWht||{};
  const s4=`${C.clients.length?`<table><tr><th>ลูกค้า</th><th>งาน</th><th class="r">รับเงิน</th><th class="r">ถูกหัก</th><th>50 ทวิ จากลูกค้า</th></tr>${C.clients.map(c=>{ const g=cw[c.client]||{}; return `<tr><td><b>${E(c.client)}</b></td><td class="ac-mut">${E([...c.codes].join(', '))}</td><td class="r">${B(c.amount)}</td><td class="r">${B(c.wht)}</td><td>${!c.wht?'<span class="ac-mut">ไม่หัก</span>':g.got?`✅ ได้รับ${g.url?` · <a href="${E(g.url)}" target="_blank">เปิด</a>`:''}`:`<span class="ac-pill ac-o">รอ</span> <button class="btn btn-xs btn-outline" onclick="ACCT.clientWht('${E(encodeURIComponent(c.client))}')">📎 แนบ/ได้รับแล้ว</button>`}</td></tr>`; }).join('')}</table>`:'<div class="ac-mut">ไม่มีงวดรับเงินที่ลงวันรับเงินในเดือนนี้</div>'}
    <div class="ac-mut" style="margin-top:6px">ใบแจ้งหนี้ ${C.invoices.length} · ใบเสร็จ ${C.receipts.length} ใบในเดือนนี้ (เปิด/โหลดได้ที่หน้าเอกสาร › ประวัติเอกสาร)</div>`;
  const s4wait=C.clients.filter(c=>c.wht&&!(cw[c.client]||{}).got).length;
  // 5 ค่าใช้จ่าย
  const ef=A.expFiles||{};
  const s5=C.exp.length?`<table><tr><th>วันที่</th><th>รายการ</th><th>หมวด</th><th class="r">ยอด</th><th>ใบเสร็จ</th></tr>${C.exp.map(x=>{ const f=ef[x.id]; return `<tr><td>${E(iso(x.date).slice(8,10)+'/'+iso(x.date).slice(5,7))}</td><td>${E(x.label||'')}</td><td class="ac-mut">${E(x.cat||'')}</td><td class="r">${B(x.amount)}</td><td>${f?`✅ <a href="${E(f.url)}" target="_blank">เปิด</a>`:`<button class="btn btn-xs btn-outline" onclick="ACCT.expFile('${E(x.id)}')">📎 แนบ</button>`}</td></tr>`; }).join('')}</table>`:'<div class="ac-mut">ไม่มีค่าใช้จ่ายบริษัทในเดือนนี้ (แอดมินบันทึกที่หน้าสรุปการเงิน › ค่าใช้จ่ายบริษัท)</div>';
  const s5miss=C.exp.filter(x=>!ef[x.id]).length;
  // 6 ภาษี + ประกันสังคม
  const fl=A.filed||{};
  const fileRow=(k,lbl,amt,extra)=>`<tr><td>${lbl}</td><td class="r">${B(amt)}</td><td>${extra||''}</td><td>${amt>0?`<button class="btn btn-xs btn-outline" onclick="ACCT.payReq('${k}',${amt})">💳 ขอให้เจ้าของโอน</button>`:'<span class="ac-mut">ไม่มียอด</span>'}</td><td>${fl[k]?`✅ ${fl[k].url?`<a href="${E(fl[k].url)}" target="_blank">ใบเสร็จการยื่น</a>`:'ยื่นแล้ว'}`:`<button class="btn btn-xs btn-outline" onclick="ACCT.filed('${k}')">📎 ยื่นแล้ว + แนบใบเสร็จ</button>`}</td></tr>`;
  const s6=`<table><tr><th>รายการ</th><th class="r">ยอด</th><th>ไฟล์</th><th>จ่าย</th><th>ยื่นแล้ว</th></tr>
    ${fileRow('pnd3',`ภ.ง.ด.3 — หัก ณ ที่จ่ายบุคคล (${C.pnd3.length} ใบ)`,C.t.pnd3,`<button class="btn btn-xs btn-outline" onclick="ACCT.csvWht('pnd3')">⬇️ ใบแนบ</button>`)}
    ${fileRow('pnd1',`ภ.ง.ด.1 — เงินเดือน (${C.pnd1.length} ใบ)`,C.t.pnd1,C.pnd1.length?`<button class="btn btn-xs btn-outline" onclick="ACCT.csvWht('pnd1')">⬇️ ใบแนบ</button>`:'')}
    ${fileRow('sso',`ประกันสังคม (${C.salaried.length} คน · ลูกจ้าง+นายจ้าง)`,C.t.sso,'')}
    </table><div class="ac-mut" style="margin-top:6px">ภ.ง.ด.1/3/53 ยื่นภายในวันที่ 7 ของเดือนถัดไป (ยื่นออนไลน์ +8 วัน) · ประกันสังคมภายในวันที่ 15 · ภ.ง.ด.53 = ใช้เมื่อจ่ายนิติบุคคลแล้วหัก ณ ที่จ่าย</div>`;
  const allOk=done===steps.length;
  const trk=isAdm()?`<div class="ac-card"><div style="padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--border2)"><b>👑 ติดตามงานบัญชี</b><span class="ac-mut">ขั้นที่นักบัญชีติ๊ก "ตรวจแล้ว" · 6 เดือนล่าสุด</span><button class="btn btn-xs btn-outline" style="margin-left:auto" onclick="ACCT.setAcct()">👤 ตั้งนักบัญชี</button></div>
    <div style="padding:8px 14px;overflow:auto"><table class="ac-trk" style="width:100%;border-collapse:collapse;font-size:12.5px"><tr><th style="text-align:left">เดือน</th>${['รอบจ่าย','เงินเดือน','ข้อมูลขาด','รายรับ','ค่าใช้จ่าย','ภาษี/สปส.'].map(x=>`<th class="c">${x}</th>`).join('')}<th class="c">ส่งบริษัท/ปิดเดือน</th></tr>
    ${Object.keys(HIST).map(k=>{ const h=HIST[k]||{}; return `<tr><td>${E(mLabel(k))}</td>${steps.map(s=>`<td class="c">${h.steps&&h.steps[s]?'<span style="color:var(--green)">✓</span>':'<span class="ac-mut">—</span>'}</td>`).join('')}<td class="c">${h.closedAt?'<span style="color:var(--green)">✓ '+E(String(h.closedAt).slice(5,10))+'</span>':'<span class="ac-mut">—</span>'}</td></tr>`; }).join('')}</table></div></div>`:'';
  b.innerHTML=`${D.err?`<div class="ac-card" style="padding:12px 14px;border-color:rgba(255,64,64,.4)">⚠️ ${E(D.err)}</div>`:''}
   <div class="ac-mo">${lastMonths(6).reverse().map(k=>{ const h=HIST[k]||{}, n=steps.filter(s=>h.steps&&h.steps[s]).length; return `<button class="${k===MONTH?'on':''} ${h.closedAt?'done':''}" onclick="ACCT.month('${k}')">${E(mLabel(k))}<small>${h.closedAt?'✓ ปิดแล้ว':n?n+'/6':'—'}</small></button>`; }).join('')}<button onclick="ACCT.reload()" title="โหลดข้อมูลใหม่">🔄</button></div>
   <div class="ac-kpi"><div><small>รายรับ (รับเงินแล้ว)</small><b style="color:var(--green)">${B(C.t.income)}</b></div><div><small>จ่ายทีมงาน (โอนสุทธิ)</small><b>${B(C.t.team)}</b></div><div><small>ภาษีหัก ณ ที่จ่าย (ต้องนำส่ง)</small><b style="color:var(--orange)">${B(C.t.wht)}</b></div><div><small>ค่าใช้จ่ายบริษัท</small><b>${B(C.t.exp)}</b></div></div>
   ${trk}
   <div class="ac-card">
    ${st('s1','💸','1. รอบจ่ายทีมงาน','มาจาก: หน้าเอกสาร › ใบสำคัญจ่ายทีม (ออกใบ & ส่งเมล)',C.vs.length?P(C.vs.length+' ใบ',s1ok?'ac-g':'ac-o'):P('ยังไม่มีใบ'),s1ok?'':'warn',s1)}
    ${st('s2','🗓️','2. เงินเดือนพนักงานประจำ','มาจาก: รอบจ่ายรายเดือน',P(C.salaried.length+' คน'),'',s2)}
    ${st('s3','⚠️','3. ข้อมูลที่ยังขาด','ระบบรวมให้จากข้อ 1',C.missing.length?P('ขาด '+C.missing.length,'ac-o'):P('ครบ','ac-g'),C.missing.length?'warn':'',s3)}
    ${st('s4','💰','4. รายรับ & 50 ทวิ จากลูกค้า','มาจาก: งวดรับเงินในโปรเจกต์ · นับตามชื่อลูกค้า',s4wait?P('รอ 50 ทวิ '+s4wait,'ac-o'):P(C.clients.length+' ลูกค้า'),s4wait?'warn':'',s4)}
    ${st('s5','🧾','5. ค่าใช้จ่ายบริษัท','มาจาก: ค่าใช้จ่ายบริษัท · แนบใบเสร็จ',s5miss?P('ขาดใบเสร็จ '+s5miss,'ac-o'):P(C.exp.length+' รายการ'),s5miss?'warn':'',s5)}
    ${st('s6','🏛️','6. ภาษี + ประกันสังคม','ยอดจาก 50 ทวิ ที่ออกในเดือนนี้ · เจ้าของเป็นคนโอน',P(B(C.t.wht+C.t.sso)),'',s6)}
    <div class="ac-st"><div class="ac-sh" style="cursor:default"><div class="ac-ic">📤</div><div><b>7. ส่งบริษัทบัญชี & ปิดเดือน</b><small>${A.closedAt?'ปิดเดือนแล้ว โดย '+E(A.closedBy||'')+' · '+E(String(A.closedAt).slice(0,10)):'กดได้เมื่อติ๊ก "ตรวจแล้ว" ครบ 6 ขั้น'}</small></div>
     ${A.closedAt?P('✓ ปิดแล้ว','ac-g'):`<button class="btn btn-sm ${allOk?'btn-green':'btn-outline'}" ${allOk?'':'disabled style="opacity:.5"'} onclick="ACCT.close()">📤 ส่งแล้ว + ปิดเดือน</button>`}<span></span></div></div>
   </div>
   <div class="ac-mut" style="margin-bottom:20px">💡 โหลดเอกสารย้อนหลังทุกใบได้ที่ <a href="javascript:void 0" onclick="nav('docs')">หน้าเอกสาร › ประวัติเอกสาร</a> (แอดมิน) · นักบัญชีโหลดได้จากปุ่มในแต่ละขั้น</div>`;
}

/* ── ไฟล์ ── */
function dl(name, text){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+text],{type:'text/csv;charset=utf-8'})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); }
const csv=rows=>rows.map(r=>r.map(c=>{ const s=String(c==null?'':c); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }).join(',')).join('\n');
function pickFile(){ return new Promise(res=>{ const i=document.createElement('input'); i.type='file'; i.accept='image/*,.pdf'; i.onchange=()=>res(i.files[0]||null); i.click(); }); }
async function upFile(kind, base){ const f=await pickFile(); if(!f) return null;
  const data=await new Promise(r=>{ const fr=new FileReader(); fr.onload=e=>r(e.target.result); fr.onerror=()=>r(''); fr.readAsDataURL(f); });
  const name=(base+'_'+f.name).replace(/[\\\/:*?"<>|\s]+/g,'_');
  const url=await safe(()=>uploadToDrive(kind, name, data),Promise.resolve(null)); return {url:url||'', name:f.name}; }

window.ACCT={
  tog(k){ OPEN.has(k)?OPEN.delete(k):OPEN.add(k); render(); },
  month(k){ MONTH=k; A=HIST[k]||{}; render(); },
  async reload(){ await open(true); },
  async tick(k){ A.steps=A.steps||{}; if(A.steps[k]) delete A.steps[k]; else A.steps[k]={by:me(), at:new Date().toISOString()}; await saveA(); render(); },
  async cap(){ let v=null; try{ v=prompt('ฐานค่าจ้างสูงสุดสำหรับคิดประกันสังคม (บาท) — ตามประกาศล่าสุด', D.cfg.ssoCap||15000); }catch(e){} if(v==null) return; const n=parseFloat(v); if(!(n>0)) return; D.cfg.ssoCap=n; try{ await fbSaveKeyed('acct_cfg', D.cfg); }catch(e){} render(); },
  copyMissing(){ const C=compute(); const t=mLabel(MONTH)+' — ข้อมูลที่ยังขาด\n'+C.missing.map(m=>'• '+m.who+': '+m.what).join('\n'); try{ navigator.clipboard.writeText(t); toast('คัดลอกแล้ว','success'); }catch(e){ toast(t,'info'); } },
  async clientWht(enc){ const c=decodeURIComponent(enc); toast('เลือกไฟล์ 50 ทวิ ที่ลูกค้าส่งมา (หรือกดยกเลิกถ้าแค่จะติ๊กว่าได้รับแล้ว)','info');
    const f=await upFile('wht_client', 'WHT-'+c+'-'+MONTH); A.clientWht=A.clientWht||{}; A.clientWht[c]={got:true, url:(f&&f.url)||'', at:new Date().toISOString(), by:me()}; await saveA(); render(); },
  async expFile(id){ const f=await upFile('expense', 'EXP-'+id); if(!f) return; if(!f.url){ toast('อัปไฟล์ไม่สำเร็จ','warn'); return; } A.expFiles=A.expFiles||{}; A.expFiles[id]={url:f.url, name:f.name, at:new Date().toISOString(), by:me()}; await saveA(); render(); },
  async filed(k){ toast('เลือกไฟล์ใบเสร็จการยื่น (หรือกดยกเลิกถ้ายังไม่มีไฟล์)','info'); const f=await upFile('tax', k+'-'+MONTH); A.filed=A.filed||{}; A.filed[k]={at:new Date().toISOString(), by:me(), url:(f&&f.url)||''}; await saveA(); render(); },
  payReq(k, amt){ const L={pnd3:'ภาษีหัก ณ ที่จ่าย ภ.ง.ด.3',pnd1:'ภาษีเงินเดือน ภ.ง.ด.1',sso:'เงินสมทบประกันสังคม'}[k]||k;
    safe(()=>_askPayRequest([{kind:k, staffId:'_'+k, staffName:L+' '+mLabel(MONTH), projId:'', projName:L, slot:'', amount:amt}], 'งานบัญชี · '+mLabel(MONTH)),null); },
  async close(){ if(!confirm('ยืนยันว่าส่งเอกสาร '+mLabel(MONTH)+' ให้บริษัทบัญชีแล้ว และปิดเดือน?')) return; A.closedAt=new Date().toISOString(); A.closedBy=me(); await saveA(); render(); toast('📤 ปิดเดือน '+mLabel(MONTH)+' แล้ว','success'); },
  async zip(){ const C=compute(); if(!C.vs.length){ toast('ไม่มีใบสำคัญจ่ายในเดือนนี้','info'); return; }
    if(!window.GDOC){ toast('ตัวสร้าง PDF ยังไม่พร้อม','warn'); return; }
    showLoader(true); try{ await _loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'); const zip=new JSZip(); let n=0;
      for(const v of C.vs){ const s=staffOf(v.staffId); const o={vNo:v.docNo, staff:Object.assign({name:v.staffName,lastName:v.staffLastName,nickname:v.staffNickname,bank:v.bank,account:v.account},s), items:v.items||[], date:v.date, note:v.note||'', whtNo:v.whtNo||''};
        const r=await GDOC.voucherPages(o); zip.file(('ใบสำคัญจ่าย_'+v.docNo+'_'+(s.nickname||v.staffNickname||'')).replace(/[\\\/:*?"<>|\s]+/g,'_')+'.pdf', await GDOC.toBlob(r.pages)); n++; }
      for(const w of C.wht){ zip.file(('50ทวิ_'+w.docNo+'_'+((w.payee||{}).name||'')).replace(/[\\\/:*?"<>|\s]+/g,'_')+'.pdf', await GDOC.whtBlob(w)); }
      const blob=await zip.generateAsync({type:'blob'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='เอกสารจ่ายทีม_'+MONTH+'.zip'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500);
      toast('📦 ใบสำคัญจ่าย '+n+' ใบ + 50 ทวิ '+C.wht.length+' ใบ','success'); }catch(e){ toast('ทำ ZIP ไม่สำเร็จ: '+e.message,'error'); } finally{ showLoader(false); } },
  csvPay(){ const C=compute(); const rows=[['วันที่','เลขที่ใบสำคัญจ่าย','ชื่อเล่น','ชื่อ-นามสกุล','เลขผู้เสียภาษี','ยอดก่อนหัก','หัก ณ ที่จ่าย','โอนสุทธิ','ธนาคาร','เลขบัญชี','เลข 50 ทวิ','ส่งเมล']];
    C.vs.forEach(v=>{ const s=staffOf(v.staffId), t=vStats(v); rows.push([iso(v.date), v.docNo, s.nickname||v.staffNickname||'', ((s.name||v.staffName||'')+' '+(s.lastName||v.staffLastName||'')).trim(), s.taxId||s.taxid||'', t.gross, t.tax, t.net, v.bank||s.bank||'', v.account||s.account||'', v.whtNo||'', v.emailStatus||'']); });
    dl('สรุปการโอนจ่าย_'+MONTH+'.csv', csv(rows)); },
  csvWht(k){ const C=compute(); const L=k==='pnd1'?C.pnd1:C.pnd3; const rows=[['ลำดับ','เลขประจำตัวผู้เสียภาษี','ชื่อผู้มีเงินได้','ที่อยู่','วันที่จ่าย','ประเภทเงินได้','อัตราภาษี (%)','จำนวนเงินที่จ่าย','ภาษีที่หัก','เงื่อนไข','เลขที่ 50 ทวิ']];
    L.slice().sort((a,b)=>String(a.payDate).localeCompare(String(b.payDate))).forEach((d,i)=>{ const pe=d.payee||{}; rows.push([i+1, pe.taxid||'', pe.name||'', pe.addr||'', iso(d.payDate), {'401':'40(1)','402':'40(2)','408':'40(8)'}[String(d.incomeType)]||String(d.incomeType||''), d.taxPct||'', +d.amount||0, +d.tax||0, '1 (หัก ณ ที่จ่าย)', d.docNo||'']); });
    dl((k==='pnd1'?'ใบแนบ_ภงด1_':'ใบแนบ_ภงด3_')+MONTH+'.csv', csv(rows)); },
  async setAcct(){ if(!isAdm()) return; const db=safe(()=>_fbDatabase,null); if(!db){ toast('ยังไม่ได้เชื่อมฐานข้อมูล','warn'); return; }
    let users={}, cur={}; try{ users=(await db.ref('users').get()).val()||{}; cur=(await db.ref('admin_config/accountants').get()).val()||{}; }catch(e){ toast('อ่านรายชื่อไม่ได้: '+e.message,'error'); return; }
    const list=Object.entries(users).filter(([,u])=>u&&u.staffId).map(([uid,u])=>({uid, name:(u.nickname||'')+' · '+(u.email||''), on:!!cur[uid]}));
    const ov=document.createElement('div'); ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML=`<div style="background:var(--card);border:1px solid var(--border2);border-radius:16px;max-width:460px;width:100%;max-height:80vh;overflow:auto;padding:16px"><b>👤 ตั้งนักบัญชี</b><div class="ac-mut" style="margin:4px 0 10px">ติ๊กทีมงานที่เป็นนักบัญชี — เขายังใช้หน้าทีมงานปกติได้ (รับงาน ยืนยันยอด) และเห็นเมนู "งานบัญชี" เพิ่ม · ดูได้อย่างเดียว โอน/แก้ไม่ได้</div>
      ${list.map(u=>`<label style="display:flex;gap:8px;align-items:center;padding:6px 0;border-top:1px solid var(--border2);font-size:13px"><input type="checkbox" data-uid="${E(u.uid)}" ${u.on?'checked':''}> ${E(u.name)}</label>`).join('')||'<div class="ac-mut">ไม่มีผู้ใช้ที่ผูกกับทีมงาน</div>'}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn btn-outline" data-x>ยกเลิก</button><button class="btn btn-blue" data-ok>บันทึก</button></div></div>`;
    document.body.appendChild(ov); ov.querySelector('[data-x]').onclick=()=>ov.remove();
    ov.querySelector('[data-ok]').onclick=async()=>{ const upd={}; ov.querySelectorAll('input[data-uid]').forEach(i=>{ upd[i.dataset.uid]=i.checked?true:null; });
      try{ await db.ref('admin_config/accountants').update(upd); toast('บันทึกนักบัญชีแล้ว — เขาต้องรีเฟรชหน้าเว็บ 1 ครั้ง','success'); ov.remove(); }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message,'error'); } };
  },
};

/* ── สิทธิ์นักบัญชี + เมนู ── */
async function detect(){
  const cu=safe(()=>currentUser,null), db=safe(()=>_fbDatabase,null); if(!cu) return false;
  // ถามฐานข้อมูลครั้งแรก แล้วทุก 60 วินาที (แอดมินติ๊กให้ระหว่างเปิดเว็บอยู่ ก็ขึ้นเองไม่ต้องรีเฟรช)
  if(cu.role!=='admin' && cu.uid && db && (cu._acctChecked!==cu.uid || Date.now()-(cu._acctAt||0)>60000)){ cu._acctChecked=cu.uid; cu._acctAt=Date.now();
    const was=!!cu.acct;
    try{ const v=(await db.ref('admin_config/accountants/'+cu.uid).get()).val(); cu.acct=v===true; }catch(e){ console.warn('🧾 เช็กสิทธิ์นักบัญชีไม่ได้:', e&&e.message); }
    if(cu.acct && !was) safe(()=>toast('🧾 บัญชีนี้มีสิทธิ์นักบัญชี — เมนู "งานบัญชี" อยู่ใต้ "เอกสารของฉัน"','success'),null); }
  // เมนู "งานบัญชี" ของทีมงาน/เมเนเจอร์ที่เป็นนักบัญชี (แอดมินมีในกลุ่มบัญชีอยู่แล้ว)
  document.querySelectorAll('.nd-acct-nav').forEach(w=>{ w.style.display=(cu.role!=='admin'&&cu.acct)?'':'none'; });
  return true; }
// เช็กตลอด (ถามฐานข้อมูลแค่ครั้งเดียวต่อบัญชี) — เมนูถูกสร้างใหม่/สลับบัญชี ก็ยังขึ้นถูก
setInterval(()=>{ try{ ensurePage(); }catch(e){ console.warn('nd-acct page',e); } detect().catch(e=>console.warn('nd-acct detect',e)); }, 2500);
// 🔍 ตรวจสิทธิ์นักบัญชี: เปิดเว็บด้วย ?acct=debug → กล่องแสดงค่าที่ระบบเห็นจริง (ใช้ตอนเมนูไม่ขึ้น)
if(/[?&]acct=debug/.test(location.search)) setTimeout(async function dbg(){
  const cu=safe(()=>currentUser,null), db=safe(()=>_fbDatabase,null); let val='—', err='';
  if(cu&&cu.uid&&db){ try{ val=JSON.stringify((await db.ref('admin_config/accountants/'+cu.uid).get()).val()); }catch(e){ err=e.message; } }
  let all=''; if(db){ try{ all=JSON.stringify((await db.ref('admin_config/accountants').get()).val()); }catch(e){ all='อ่านทั้งหมดไม่ได้: '+e.message; } }
  const navs=[...document.querySelectorAll('.nd-acct-nav')].map(w=>(w.closest('[id$="-nav"]')||{}).id+':'+getComputedStyle(w).display).join(', ');
  let box=$('acct-dbg'); if(!box){ box=document.createElement('div'); box.id='acct-dbg'; box.style.cssText='position:fixed;right:12px;bottom:12px;z-index:99999;background:#111;color:#0f0;font:12px monospace;padding:10px 12px;border-radius:10px;max-width:440px;white-space:pre-wrap;word-break:break-all;box-shadow:0 6px 24px #000'; document.body.appendChild(box); }
  box.textContent=['🧾 acct debug (build '+(window.UPD_BUILD||'?')+')',
    'user: '+(cu?(cu.email+' · role='+cu.role+' · uid='+cu.uid):'ยังไม่ล็อกอิน'), 'db: '+(db?'ok':'none'),
    'ค่าของบัญชีนี้: '+val+(err?' · error: '+err:''), 'ทั้งหมด: '+all, 'cu.acct: '+(cu&&cu.acct), 'เมนู: '+(navs||'ไม่พบ .nd-acct-nav')].join('\n');
  setTimeout(dbg, 4000); }, 6000);
document.addEventListener('DOMContentLoaded', ensurePage);
window.addEventListener('load', ensurePage);
})();
