/* ══════════════════════════════════════════════════════════════════
   🗓️ วางแผนงาน + 💲 เทมเพลตราคา
   • หน้าเดียวจัดการทั้งโปรเจกต์: ข้อมูลงาน · หน้าที่ · คน · ราคา · เวลา · โฟลเดอร์ไดรฟ์ · ห้อง Discord
   • แทนหน้า จัดสรรคน / จัดไฟล์งาน / ห้องโปรเจกต์
   • บันทึกผ่าน saveProjectMerge (ดึงของล่าสุดจากเซิร์ฟเวอร์ก่อนเขียน — ไม่ทับข้อมูลช่องอื่น)
   • เฉพาะแอดมิน/เมเนเจอร์ · เมเนเจอร์ไม่เห็น/แก้ชื่อลูกค้า
   ══════════════════════════════════════════════════════════════════ */
(function(){
const $=id=>document.getElementById(id);
const CU=()=>{ try{ return (typeof currentUser!=='undefined'&&currentUser)||null; }catch(e){ return null; } };
const role=()=>(CU()&&CU().role)||'staff';
const isAdm=()=>role()==='admin';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(f,d)=>{ try{ const v=f(); return v==null?d:v; }catch(e){ return d; } };
const say=(m,t)=>safe(()=>toast(m,t||'info'));
const busy=v=>safe(()=>showLoader(v));
const audit=(a,t,d)=>safe(()=>logAudit(a,t,d));
const B=n=>'฿'+Math.round(+n||0).toLocaleString();
const TM=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'], DW=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
const fd=s=>{ const d=new Date(s); return (!s||isNaN(d))?'—':DW[d.getDay()]+' '+d.getDate()+' '+TM[d.getMonth()]; };
const dOnly=s=>String(s||'').slice(0,10);
const UNITS=safe(()=>PRICE_UNITS,['นาที','เหมา','โปรเจกต์','ชั่วโมง','หน้า','วัน','บท']);
const QTYU=safe(()=>PRICE_QTY_UNITS,['ชั่วโมง','หน้า','วัน','บท']);
// ลำดับหน้าที่ — นักแปลบนสุด (ต้องทำก่อนงานอื่น)
const R={trn:['นักแปล','🌐','#FF6FAE','translation'],adp:['เกลาบท','✍️','#00B4FF','adaptation'],dub:['พากย์','🎤','#FF9E00','dubbing'],mix:['มิกซ์','🎧','#00DFA0','mix'],qc:['QC','✅','#9B6FFF','qc'],sub:['ซับ & วิดีโอ','🎬','#E5484D','subVideo']};
const ORDER=Object.keys(R);
const ST=[['none','รอเริ่ม'],['briefed','บรีฟแล้ว'],['doing','กำลังทำ'],['done','ส่งแล้ว ✓']];
const AVC=['#1565FF','#00A878','#E67E00','#9B6FFF','#E5484D','#0090D6','#C2185B','#7a5af8'];
const av=n=>n?`<span class="pl-av" style="background:${AVC[[...n].reduce((a,c)=>a+c.charCodeAt(0),0)%AVC.length]}">${esc(n[0])}</span>`:'<span class="pl-av empty">?</span>';
const preOf=w=>String((w&&w.slot)||'').split('-')[0];
// เหมือน calcWorkerAmt เดิม: นาที = ราคา × ความยาวงาน · หน่วยนับ = ราคา × จำนวน · เหมา = ราคา
const amtOf=(rate,unit,qty,dur)=>{ rate=+rate||0; if(unit==='นาที') return dur>0?rate*dur:rate; if(QTYU.includes(unit)) return rate*(+qty||0); return rate; };

/* ── สไตล์ (ใช้สี/ตัวแปรของเว็บ) ── */
const CSS=`
.pl-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.pl-dirty{font-size:12px;color:var(--orange)}
.pl-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:14px;align-items:start}
.pl-right{position:sticky;top:12px;display:flex;flex-direction:column;gap:12px}
.pl-card{background:var(--card);border:1px solid var(--border2);border-radius:16px;margin-bottom:14px}
.pl-right .pl-card{margin-bottom:0}
.pl-ch{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 16px;border-bottom:1px solid var(--border2)}
.pl-ch h3{margin:0;font-size:15px;font-weight:800}
.pl-cb{padding:14px 16px}
.pl-mut{color:var(--text2);font-size:12px}
.pl-ok{color:var(--green)} .pl-warn{color:var(--orange)} .pl-bad{color:var(--red)}
.pl-l{display:block;font-size:11.5px;color:var(--text2);margin-bottom:3px}
#page-nd-plan .form-input,#page-nd-price .form-input{margin:0}
.pl-f{display:grid;gap:10px}
.pl-g6{grid-template-columns:90px 70px 1fr 160px} .pl-g4{grid-template-columns:repeat(4,1fr)} .pl-g3{grid-template-columns:repeat(3,1fr)}
.pl-dt{display:flex;gap:6px} .pl-dt input[type=time]{width:132px;flex-shrink:0} .pl-dt input[type=date]{min-width:0}
#page-nd-plan input[type=date],#page-nd-plan input[type=time]{cursor:pointer}
:root:not([data-theme="light"]) #page-nd-plan input[type=date]::-webkit-calendar-picker-indicator,:root:not([data-theme="light"]) #page-nd-plan input[type=time]::-webkit-calendar-picker-indicator{filter:invert(.85) sepia(1) saturate(4) hue-rotate(170deg);opacity:1;cursor:pointer}
#page-nd-plan select option,#page-nd-price select option{background:var(--card);color:var(--text)}
.pl-lock{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text2);background:var(--item,rgba(255,255,255,.05));border:1px dashed var(--border2);border-radius:10px;padding:8px 10px}
.pl-bud{display:grid;grid-template-columns:110px 1fr 90px;gap:6px}
.pl-ded{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.pl-ded .d{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border2);border-radius:10px;padding:5px 9px;font-size:12.5px}
.pl-ded .d.on{border-color:var(--accent2);background:rgba(0,180,255,.1)}
.pl-rp{display:flex;gap:8px;flex-wrap:wrap}
.pl-rp span{display:flex;align-items:center;gap:7px;border:1.5px solid var(--border2);border-radius:14px;padding:7px 13px;cursor:pointer;font-size:13.5px;color:var(--text2)}
.pl-rp span.on{border-color:var(--c);color:var(--text);background:color-mix(in srgb,var(--c) 16%,transparent)}
.pl-rp i{width:18px;height:18px;border-radius:5px;border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:11px;font-style:normal}
.pl-rp span.on i{background:var(--c);border-color:var(--c);color:#fff}
.pl-acc{border:1px solid var(--border2);border-radius:14px;margin-bottom:8px;background:rgba(255,255,255,.03)}
:root[data-theme="light"] .pl-acc{background:#f6f9fd}
.pl-ah{display:grid;grid-template-columns:36px 1fr auto auto auto 18px;gap:10px;align-items:center;padding:9px 12px;cursor:pointer;border-left:5px solid var(--c);border-radius:14px}
.pl-ic{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;background:color-mix(in srgb,var(--c) 22%,transparent)}
.pl-ah b{font-size:15px} .pl-ah small{display:block;font-size:11.5px;color:var(--text2)}
.pl-faces{display:flex} .pl-faces .pl-av{margin-left:-6px;border:2px solid var(--card)} .pl-faces .pl-av:first-child{margin-left:0}
.pl-ab{padding:12px 14px;border-top:1px solid var(--border2);background:var(--card);border-radius:0 0 14px 14px}
.pl-acc.open{border-color:color-mix(in srgb,var(--c) 60%,transparent)}
.pl-stt{font-size:11.5px;border-radius:10px;padding:3px 10px;font-weight:600;cursor:pointer;white-space:nowrap}
.s-none{background:rgba(125,156,192,.16);color:var(--text2)} .s-briefed{background:rgba(0,180,255,.16);color:var(--accent2)} .s-doing{background:rgba(255,158,0,.18);color:var(--orange)} .s-done{background:rgba(0,223,160,.16);color:var(--green)}
.pl-phase{display:grid;grid-template-columns:1fr 1fr 170px;gap:10px;margin-bottom:10px;align-items:end}
.pl-cnt{display:flex;align-items:center;border:1px solid var(--border2);border-radius:10px;height:38px;width:fit-content}
.pl-cnt button{width:34px;height:100%;border:0;background:transparent;color:var(--text);cursor:pointer;font-size:17px}
.pl-cnt b{min-width:38px;text-align:center}
.pl-rate{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:10px;padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--c) 9%,transparent);border:1px solid color-mix(in srgb,var(--c) 30%,transparent)}
.pl-rate .t{display:flex;align-items:center;gap:4px;background:var(--card);border-radius:9px;padding:3px 7px;font-size:12px}
.pl-rate .t b{color:var(--c)}
.pl-rate input{width:64px!important;padding:3px 6px!important;font-size:12.5px!important} .pl-rate select{width:auto!important;padding:3px 6px!important;font-size:12.5px!important}
.pl-wk{display:grid;gap:8px;align-items:center;padding:7px 0;border-bottom:1px dashed var(--border2)}
.pl-wk.hd{font-size:11px;color:var(--text2);border-bottom:1px solid var(--border2);padding-top:0}
.pl-wk-adp{grid-template-columns:minmax(170px,1.4fr) 1fr 90px 100px 100px 22px}
.pl-wk-dub{grid-template-columns:minmax(170px,1.4fr) 170px 100px 100px 22px}
.pl-wk-std{grid-template-columns:minmax(170px,1.6fr) 1fr 100px 100px 22px}
.pl-wk input,.pl-wk select{padding:4px 7px!important;font-size:13px!important}
.pl-amt{text-align:right;font-weight:700} .pl-x{opacity:.4;cursor:pointer;text-align:center} .pl-x:hover{opacity:1;color:var(--red)}
.pl-hrs{font-size:11.5px;color:var(--text2);text-align:right} .pl-hrs b{color:var(--accent2);font-size:13px}
.pl-paid{font-size:10px;color:var(--green)}
.pl-nb{display:flex;align-items:center;gap:7px;padding:3px 6px;border-radius:10px;cursor:pointer;position:relative;min-width:0}
.pl-nb:hover{background:rgba(255,255,255,.06)}
.pl-nb b{font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-dd{position:absolute;left:0;top:calc(100% + 4px);z-index:30;width:250px;max-height:300px;overflow:auto;background:var(--card);border:1px solid var(--border2);border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.45);padding:6px;cursor:default}
.pl-dd .op{display:flex;align-items:center;gap:7px;padding:6px;border-radius:8px;cursor:pointer;font-size:13px}
.pl-dd .op:hover{background:rgba(21,101,255,.16)} .pl-dd .op small{margin-left:auto;font-size:10.5px}
.pl-av{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:#fff;flex-shrink:0}
.pl-av.empty{background:transparent!important;border:1.5px dashed var(--border2);color:var(--text2)}
.pl-foot{display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap}
.pl-std{font-size:10.5px;color:var(--text2)} .pl-std.chg{color:var(--orange);cursor:pointer;text-decoration:underline dotted}
.pl-mrow{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.pl-mrow div{background:var(--card);border:1px solid var(--border2);border-radius:12px;padding:6px 9px;min-width:0}
.pl-mrow span{display:block;font-size:10.5px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-mrow b{font-size:13.5px;white-space:nowrap}
.pl-tl .row{display:grid;grid-template-columns:76px 1fr;align-items:center;height:24px;cursor:pointer}
.pl-tl .row span{font-size:11.5px;color:var(--text2);white-space:nowrap;overflow:hidden}
.pl-tl .lane{position:relative;height:12px;border-radius:6px;background:rgba(255,255,255,.06)}
.pl-tl .lane i{position:absolute;top:0;bottom:0;border-radius:6px}
.pl-tl .wrap{position:relative;padding-bottom:18px}
.pl-tl .vl{position:absolute;top:0;bottom:16px;width:2px}
.pl-tl .dl{position:absolute;bottom:0;font-size:9.5px;color:var(--text2);transform:translateX(-50%)}
.pl-pk{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:7px 5px;border-radius:10px;cursor:pointer}
.pl-pk:hover{background:rgba(255,255,255,.06)} .pl-pk.in{background:rgba(21,101,255,.12)}
.pl-pk b{font-weight:600;font-size:13px}
.pl-pk .msg{font-size:11px;color:var(--text2);font-style:italic}
.pl-tag{font-size:10.5px;border-radius:8px;padding:2px 7px;font-weight:600;white-space:nowrap}
.t-y{background:rgba(0,223,160,.15);color:var(--green)} .t-n{background:rgba(255,64,64,.15);color:var(--red)} .t-p{background:rgba(255,158,0,.15);color:var(--orange)}
.pl-tree{background:rgba(255,255,255,.04);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.8}
.pl-fl{max-height:210px;overflow:auto;margin-top:6px}
.pl-fl div{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:8px;cursor:pointer;font-size:13px}
.pl-fl div:hover{background:rgba(31,164,99,.15)}
.pl-crumb{display:flex;gap:4px;flex-wrap:wrap;align-items:center;font-size:12px;margin-top:6px}
.pl-crumb a{cursor:pointer;color:var(--accent2)}
.pl-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.pl-dcw{display:grid;grid-template-columns:1fr 1.9fr;gap:14px}
.pl-mem{display:flex;gap:6px;flex-wrap:wrap}
.pl-dm{display:inline-flex;align-items:center;gap:5px;border-radius:15px;padding:2px 9px 2px 2px;font-size:12.5px;cursor:pointer;border:1.5px solid transparent}
.pl-dm.in{background:rgba(0,223,160,.12)} .pl-dm.add{background:rgba(0,180,255,.12);border-color:rgba(0,180,255,.55)} .pl-dm.rm{background:rgba(255,64,64,.14);border-color:var(--red);color:var(--red)}
.pl-dm.nod{opacity:.55;border-style:dashed;border-color:var(--border2)}
.pl-dm.pick{box-shadow:0 0 0 3px rgba(255,64,64,.4)}
.pl-tpls{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.pl-tpls span{border:1px solid var(--border2);border-radius:10px;padding:4px 10px;font-size:12.5px;cursor:pointer}
.pl-tpls span.on{border-color:#5865F2;background:rgba(88,101,242,.2)}
#pl-ed{min-height:300px;line-height:1.65;resize:vertical;border-left:4px solid #5865F2!important;font-family:Kanit,sans-serif}
.pl-at{position:fixed;z-index:9999;background:var(--card);border:1px solid var(--border2);border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.45);padding:5px;min-width:180px;max-height:240px;overflow:auto}
.pl-at div{display:flex;gap:7px;align-items:center;padding:5px 7px;border-radius:7px;cursor:pointer;font-size:13px}
.pl-at div.on,.pl-at div:hover{background:rgba(88,101,242,.22)}
.pl-gd{background:linear-gradient(90deg,rgba(31,164,99,.22),transparent)} .pl-dch{background:linear-gradient(90deg,rgba(88,101,242,.25),transparent)}
.pl-trow{display:grid;grid-template-columns:150px 1fr;gap:10px;align-items:center;padding:9px 0;border-bottom:1px dashed var(--border2)}
.pl-tx{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.pl-tx .t{display:flex;align-items:center;gap:4px;background:rgba(255,255,255,.05);border-radius:9px;padding:4px 8px;font-size:12.5px}
.pl-tx input{width:70px!important;padding:3px 6px!important} .pl-tx select{width:auto!important;padding:3px 6px!important}
@media(max-width:1250px){ .pl-grid{grid-template-columns:1fr} .pl-right{position:static} .pl-dcw,.pl-2col{grid-template-columns:1fr} .pl-g6,.pl-g4{grid-template-columns:1fr 1fr} .pl-phase{grid-template-columns:1fr} .pl-wk{grid-template-columns:1fr 1fr!important} .pl-wk.hd{display:none} }
`;

/* ── สถานะของหน้า ── */
let S=null, dirty=false, saving=false, PRICE={}, WK=null, pcSel='', pcNew=false, dd=null, ddQ='', pkRole='trn', pkAll=false, pkQ='', openA=-1, infoOpen=true;
let edText=null, edPost='', tplSel='';
let DC={room:{}, keep:{}, pick:null};
const DR0=()=>({cur:'', path:[], folders:null, err:'', tpl:'', edit:false, editText:null, name:''});
let DR=DR0();

/* ── ข้อมูลพื้นฐาน ── */
// ทุกงานอยู่ครบ — งานที่ยกเลิกแล้วอยู่ท้ายรายการ (เมเนเจอร์เห็นเฉพาะงานที่ตัวเองดูแล)
const myProjects=()=>{ const all=(safe(()=>getProjects(),[])||[]).filter(p=>p&&p.id);
  const mine=role()==='manager'?all.filter(p=>p.managerId===(CU()&&CU().uid)):all;
  return mine.filter(p=>p.projStatus!=='cancelled').concat(mine.filter(p=>p.projStatus==='cancelled')); };
const staff=id=>id?safe(()=>getStaffById(id),null):null;
const nickOf=id=>{ const s=staff(id); return s?(s.nickname||s.name||id):(id?'('+id+')':''); };
const managers=()=>safe(()=>getAllManagerUsers(),[])||[];
const mgrName=uid=>{ if(!uid) return 'แอดมินดูแลเอง'; const m=managers().find(x=>x.uid===uid); if(m) return m.nickname||m.email; const uc=safe(()=>ls('mgr_users_cache'),{})||{}; const u=uc[uid]||{}; return u.nickname||(u.staffId&&nickOf(u.staffId))||u.email||'—'; };
const mgrStaff=uid=>{ const sid=uid?safe(()=>_mgrStaffIdOf(uid),''):''; return staff(sid); };
const PCODE=()=>String(S&&S.code||'').trim().toUpperCase();
const STD=()=>PRICE[PCODE()]||null;
const fresh=()=>(safe(()=>getProjects(),[])||[]).find(x=>x.id===S.id)||S.src;
const same=(a,b)=>Math.round(+a||0)===Math.round(+b||0);

/* 🛡️ หลักกันข้อมูลงานเก่าหาย/เปลี่ยนเอง:
   • บันทึกเฉพาะส่วนที่ผู้ใช้แก้จริง (S.t = ช่องข้อมูลที่แตะ · S.rolesT = แตะส่วนคน/ราคา/เวลา · S.dedT = แตะหัก ณ ที่จ่าย)
   • คนที่เรท/หน่วยไม่ตรงกับเรทของหน้าที่ → เก็บเป็น "เรทเฉพาะคน" (s.cu) ไม่ถูกปัดเป็นเรทเดียวกัน
   • ยอดเงินเดิมที่ไม่ตรงสูตร (เคยแก้มือ) → คงยอดเดิม (s.fix) จนกว่าจะแก้ราคาของคนนั้น/หน้าที่นั้นเอง */
function loadProject(id){
  const p=myProjects().find(x=>x.id===id)||myProjects()[0]; if(!p){ S=null; return; }
  const ph=p.phases||{}, ws=(p.workers||[]).filter(Boolean), dur=+p.duration||0;
  const roles={};
  ORDER.forEach(k=>{
    const mine=ws.filter(w=>preOf(w)===k); const key=R[k][3], pp=ph[key]||{};
    const r={k, on:!!(mine.length||ph[key]), st:pp.status||'none',
      start:dOnly(pp.startDate), stime:pp.startTime||'', end:dOnly(pp.deadline), etime:pp.submitTime||'', slots:[]};
    const base=w=>({n:nickOf(w.id), id:w.id, slot:w.slot, paid:w.status==='paid', ep:w.ep||'', old:+w.amount||0});
    if(k==='dub'){
      r.tiers=(Array.isArray(p.dubTiers)&&p.dubTiers.length?p.dubTiers:[{rate:'',unit:'นาที',qty:0}]).map(t=>({rate:+(t&&t.rate)||0, blank:!t||t.rate===''||t.rate==null, unit:(t&&t.unit)||'นาที', qty:+(t&&t.qty)||0}));
      r.slots=mine.map(w=>{ const s=base(w); let ti=+w.tier||0; if(ti>r.tiers.length) ti=0;
        const fits=t=>t&&!t.blank&&same(t.rate,w.ratePerUnit)&&t.unit===(w.unit||'นาที')&&(!QTYU.includes(t.unit)||same(t.qty,w.qty));
        if(ti&&!fits(r.tiers[ti-1])) ti=0;
        if(!ti){ const f=r.tiers.findIndex(fits); ti=f>=0?f+1:0; }
        s.tier=ti||1; if(!ti) s.cu={rate:+w.ratePerUnit||0, unit:w.unit||'นาที', qty:+w.qty||0};
        return s; });
    } else if(k==='adp'){
      const f=mine.find(w=>(w.unit||'นาที')==='นาที')||mine[0]; r.rate=f?(+f.ratePerUnit||0):0;
      r.slots=mine.map(w=>{ const s=base(w), u=w.unit||'นาที';
        s.min=u==='นาที'?((+w.minWorked||0)||dur):0;
        if(u!=='นาที') s.cu={rate:+w.ratePerUnit||0, unit:u, qty:+w.qty||0};
        else if(!same(w.ratePerUnit,r.rate)) s.cu={rate:+w.ratePerUnit||0, unit:'นาที', qty:0};
        return s; });
    } else {
      const f=mine[0]; r.rate=f?(+f.ratePerUnit||0):0; r.unit=(f&&f.unit)||'นาที'; r.qty=f?(+f.qty||0):0;
      r.slots=mine.map(w=>{ const s=base(w); if(!same(w.ratePerUnit,r.rate)||(w.unit||'นาที')!==r.unit||(QTYU.includes(r.unit)&&!same(w.qty,r.qty))) s.cu={rate:+w.ratePerUnit||0, unit:w.unit||'นาที', qty:+w.qty||0}; return s; });
    }
    if(!r.slots.length) r.slots=[k==='adp'?{n:'',ep:'',min:0}:k==='dub'?{n:'',tier:1}:{n:''}];
    roles[k]=r;
  });
  const dl=String(p.deadline||'');
  const tax=p.tax||{}, taxVals=ORDER.filter(k=>roles[k].on).map(k=>+tax[k]||0), maxTax=Math.max(0,...taxVals);
  const isNew=!ws.some(w=>ORDER.includes(preOf(w)));
  S={id:p.id, src:p, code:p.clientCode||'', seq:p.seq||'', name:p.name||'', type:p.type||'', minutes:dur, eps:+p.episodes||0,
     start:dOnly(p.startDate), deadline:dOnly(dl), dtime:p.deadlineTime||(dl.includes('T')?dl.slice(11,16):''), dlT:dl.includes('T'),
     budType:p.budgetType||'flat', budRate:+p.budgetRate||+p.budget||0, budQty:+p.budgetQty||0,
     client:p.client||'', link:p.downloadLink||'', secret:p.secretKey||'', mgrId:p.managerId||'',
     ded:(Array.isArray(p.deductions)&&p.deductions.length)?p.deductions.map(d=>({label:d.label||'',pct:+d.pct||0,on:!!d.on}))
         :[{label:'หัก ณ ที่จ่าย (บริษัท)',pct:maxTax||3,on:maxTax>0||isNew}],
     legacyTax:!Array.isArray(p.deductions)&&!isNew&&new Set(taxVals).size>1 ? tax : null,
     isNew, roles, t:{}, rolesT:false, dedT:false};
  // ยอดเดิมที่ไม่ตรงสูตร → คงไว้ (ไม่เปลี่ยนเงินใครถ้าไม่ได้แก้)
  ORDER.forEach(k=>{ const r=roles[k]; r.slots.forEach(s=>{ if(s.id && !same(calc(r,s),s.old)) s.fix=s.old; }); });
  // ห้อง Discord: ใครมีสิทธิ์อยู่แล้ว (บันทึกไว้ตอนอัปเดตสิทธิ์ · ห้องเก่า = ถือว่าทีมในโปรเจกต์อยู่ในห้อง)
  DC={room:{}, keep:{}, pick:null};
  if(p.discordChannelId){ const was=Array.isArray(p.discordRoomMembers)?p.discordRoomMembers:[...new Set(ws.filter(w=>preOf(w)!=='mgr').map(w=>w.id))]; was.forEach(sid=>{ if(sid) DC.room[sid]='in'; }); }
  edText=null; edPost=(safe(()=>_prPosts(p),[])[0]||{}).id||''; tplSel=p.postTplId||''; dd=null; dirty=false;
  DR=DR0();
  if(openA<0 || !S.roles[ORDER[openA]]||!S.roles[ORDER[openA]].on) openA=ORDER.findIndex(k=>S.roles[k].on);
}
const on=()=>ORDER.map(k=>S.roles[k]).filter(r=>r.on);
const planIds=()=>[...new Set(on().flatMap(r=>r.slots.map(s=>s.id).filter(Boolean)))];
const WHT=()=>S.ded.filter(d=>d.on).reduce((a,d)=>a+(+d.pct||0),0);
const taxOf=k=>(S.legacyTax&&!S.dedT)?(+S.legacyTax[k]||0):WHT();
// วัน/เวลาที่ยังไม่ได้ตั้ง → ใช้วันของโปรเจกต์แทนตอนคำนวณ/แสดงไทม์ไลน์ (ไม่เขียนลงข้อมูล)
const rS=r=>r.start||S.start||S.deadline, rE=r=>r.end||S.deadline, rST=r=>r.stime||'00:00', rET=r=>r.etime||'23:59';
const hoursOf=r=>{ const a=new Date(rS(r)+'T'+rST(r)), b=new Date(rE(r)+'T'+rET(r)); return (isNaN(a)||isNaN(b))?0:Math.max(0,Math.round((b-a)/36e5)); };
const tierAmt=t=>amtOf(t.rate,t.unit,t.qty,S.minutes);
const roleUnit=r=>amtOf(r.rate,r.unit,r.qty,S.minutes);
function calc(r,s){ const c=s.cu;
  if(r.k==='adp') return Math.round(c&&c.unit!=='นาที'?amtOf(c.rate,c.unit,c.qty,S.minutes):(+s.min||0)*(c?+c.rate:+r.rate||0));
  if(c) return Math.round(amtOf(c.rate,c.unit,c.qty,S.minutes));
  if(r.k==='dub'){ const t=r.tiers[(s.tier||1)-1]||r.tiers[0]; return Math.round(tierAmt(t)); }
  return Math.round(roleUnit(r)); }
const amt=(r,s)=>s.fix!=null?s.fix:calc(r,s);
const subTot=r=>r.slots.reduce((a,s)=>a+(s.id?amt(r,s):0),0);
const budget=()=>Math.round(safe(()=>calcBudgetTotal(+S.budRate||0,S.budType,S.minutes,+S.budQty||0),+S.budRate||0));
const stdHint=(cur,std,fn)=>std==null?'':(+cur!==+std?`<span class="pl-std chg" title="กดเพื่อใช้ราคามาตรฐาน" onclick="${fn}">↺ มาตรฐาน ${std}</span>`:'<span class="pl-std">✓ มาตรฐาน</span>');
// ป้ายบอกในแถวคน: เรทเฉพาะคน / ยอดเดิม
const slotTag=(k,j)=>{ const s=S.roles[k].slots[j]; const out=[];
  if(s.cu) out.push(`<span class="pl-std chg" title="คนนี้ใช้เรทของตัวเอง (ไม่ตรงกับเรทของหน้าที่) — กดเพื่อใช้เรทของหน้าที่" onclick="event.stopPropagation();NDP.unCu('${k}',${j})">เรทเฉพาะคน ${B(s.cu.rate)}/${esc(s.cu.unit)}</span>`);
  if(s.fix!=null) out.push(`<span class="pl-std chg" title="ยอดที่บันทึกไว้เดิมไม่ตรงกับสูตร — คงยอดเดิมไว้ · กดเพื่อคิดใหม่ตามสูตร (${B(calc(S.roles[k],s))})" onclick="event.stopPropagation();NDP.unFix('${k}',${j})">ยอดเดิม</span>`);
  return out.length?'<div style="line-height:1.2">'+out.join(' ')+'</div>':''; };

/* ── ประกอบข้อมูลที่จะบันทึก (ใช้ทั้งตอนบันทึกจริงและตอนเติมข้อความโพสต์) ── */
function buildWorkers(){
  const out=[];
  on().forEach(r=>r.slots.forEach(s=>{ if(!s.id) return;
    const base={id:s.id, slot:s.slot||(r.k==='dub'?'dub-main':r.k+'-only'), amount:amt(r,s), ...(s.ep?{ep:s.ep}:{})};
    const c=s.cu;
    if(r.k==='adp'){ if(c&&c.unit!=='นาที') out.push({...base, ratePerUnit:c.rate, unit:c.unit, qty:c.qty});
      else out.push({...base, ratePerUnit:c?c.rate:(+r.rate||0), unit:'นาที', qty:+s.min||0, minWorked:+s.min||0}); }
    else if(r.k==='dub'){ const t=r.tiers[(s.tier||1)-1]||r.tiers[0]; out.push(c?{...base, ratePerUnit:c.rate, unit:c.unit, qty:c.qty}:{...base, ratePerUnit:+t.rate||0, unit:t.unit, qty:+t.qty||0, tier:s.tier||1}); }
    else out.push(c?{...base, ratePerUnit:c.rate, unit:c.unit, qty:c.qty}:{...base, ratePerUnit:+r.rate||0, unit:r.unit||'นาที', qty:+r.qty||0});
  }));
  return out;
}
function applyPlan(f){
  const T=S.t, resend=[];
  // ข้อมูลโปรเจกต์ — เขียนเฉพาะช่องที่แก้
  if(T.code) f.clientCode=PCODE();
  if(T.seq) f.seq=parseInt(S.seq)||0;
  if(T.name||T.code||T.seq) f.name=String(S.name||'').trim()||safe(()=>projCode(f),'')||f.name||'';
  if(T.type) f.type=S.type;
  if(T.minutes) f.duration=+S.minutes||0;
  if(T.eps) f.episodes=+S.eps||0;
  if(T.start) f.startDate=S.start||'';
  if(T.deadline||T.dtime){ if(S.dlT){ f.deadline=S.deadline?(S.deadline+(S.dtime?'T'+S.dtime:'')):''; } else { f.deadline=S.deadline||''; if(S.dtime) f.deadlineTime=S.dtime; } }
  if(T.budType||T.budRate||T.budQty||(T.minutes&&S.budType==='per-minute')){ f.budgetType=S.budType; f.budgetRate=+S.budRate||0; f.budgetQty=+S.budQty||0; f.budget=budget(); }
  if(T.link) f.downloadLink=S.link||'';
  if(T.secret) f.secretKey=S.secret||'';
  if(isAdm()){ if(T.client) f.client=S.client; if(T.mgrId) f.managerId=S.mgrId||''; }
  // คน · ราคา · เวลา — เขียนเฉพาะเมื่อแตะส่วนนี้
  if(S.rolesT){
    const old=(f.workers||[]).filter(Boolean), nw=buildWorkers(), used=new Set();
    const merged=nw.map(w=>{ const i=old.findIndex((x,ix)=>!used.has(ix)&&x.id===w.id&&x.slot===w.slot); const ex=i>=0?old[i]:null; if(i>=0) used.add(i);
      if(!ex) return {...w, status:'pending', note:'', comment:'', confirmStatus:'none'};
      const m={...ex, ...w};
      if(!same(ex.amount,w.amount) && ['sent','confirmed','rejected'].includes(ex.confirmStatus)){
        m.confirmStatus='none'; m.confirmSentAt=null; m.confirmRespondedAt=null; m.confirmRejectReason=null; resend.push({id:w.id,slot:w.slot}); }
      return m; });
    f.workers=[...merged, ...old.filter(w=>!ORDER.includes(preOf(w)))];   // 🗂️ ค่าเมเนเจอร์ (mgr) และหมวดอื่นคงเดิม
    const d=S.roles.dub; f.dubTiers=d.tiers.map(t=>({rate:t.blank?'':(+t.rate||0), unit:t.unit||'นาที', qty:+t.qty||0}));
    const ph={...(f.phases||{})};
    ORDER.forEach(k=>{ const r=S.roles[k], key=R[k][3];
      if(r.on && (ph[key] || r.start || r.end || r.etime || r.stime || (r.st&&r.st!=='none'))){ const o=ph[key]||{}; ph[key]={...o, startDate:r.start||'', deadline:r.end||'', submitTime:r.etime||'', status:r.st||'none', note:o.note||''}; if(r.stime) ph[key].startTime=r.stime; }
      else if(!r.on) delete ph[key]; });
    f.phases=ph;
    if(merged.length && !['done','cancelled','inprogress'].includes(f.projStatus)) f.projStatus='inprogress';
  }
  // หัก ณ ที่จ่าย — งานเดิมที่หักแยกตามหน้าที่ไว้ ไม่แตะจนกว่าจะแก้ช่องนี้เอง · งานใหม่ใช้ค่าเริ่มต้น 3%
  if(S.dedT || (S.isNew && S.rolesT) || Array.isArray(f.deductions)){
    if(S.dedT || !S.legacyTax){ const tx={...(f.tax||{})}; ORDER.forEach(k=>{ tx[k]=WHT(); }); f.tax=tx; f.deductions=S.ded.map(d=>({label:d.label, pct:+d.pct||0, on:!!d.on})); }
  }
  return resend;
}
function previewProj(){ const f=JSON.parse(JSON.stringify(S.src)); applyPlan(f); return f; }

async function save(quiet){
  if(!S||saving) return false;
  if(!String(S.name||'').trim() && !(PCODE()&&S.seq)){ say('กรอกชื่อโปรเจกต์ หรือรหัสงาน + ลำดับ','error'); return false; }
  const nw=buildWorkers();
  const gone=(S.src.workers||[]).filter(w=>w&&ORDER.includes(preOf(w))&&w.status==='paid'&&!nw.some(x=>x.id===w.id&&x.slot===w.slot));
  if(gone.length && !confirm('⚠️ เอาคนที่ "จ่ายเงินแล้ว" ออกจากงาน: '+gone.map(w=>nickOf(w.id)).join(', ')+'\nรายการจ่ายของคนนี้จะหายจากโปรเจกต์ — ยืนยัน?')) return false;
  const chg=(S.src.workers||[]).filter(w=>w&&w.status==='paid').map(w=>({w, n:nw.find(x=>x.id===w.id&&x.slot===w.slot)})).filter(o=>o.n&&(+o.n.amount||0)!==(+o.w.amount||0));
  if(chg.length && !confirm('⚠️ ยอดของคนที่ "จ่ายเงินแล้ว" จะเปลี่ยน:\n'+chg.map(o=>'• '+nickOf(o.w.id)+' '+B(o.w.amount)+' → '+B(o.n.amount)).join('\n')+'\n\nยืนยันบันทึก?')) return false;
  saving=true; busy(true);
  let resend=[];
  try{
    const res=await saveProjectMerge(S.id, f=>{ resend=applyPlan(f); });
    if(!res||res.ok===false){ say('บันทึกไม่สำเร็จ: '+((res&&res.error&&res.error.message)||''),'error'); return false; }
    const saved=res.saved||fresh();
    safe(()=>syncPhasesToTrkCard(S.id, saved.phases));
    if(role()==='manager') safe(()=>notifyAdmin('project-updated',{projId:S.id, projName:saved.name}));
    else if(saved.managerId && saved.managerId!==(S.src.managerId||'')) safe(()=>addNotification({type:'project',title:'🗂️ คุณได้รับมอบหมายโปรเจกต์ใหม่',text:`${saved.name} — เข้าไปวางแผนงานได้เลย`,recipientUid:saved.managerId,projId:S.id}));
    audit('project.plan', saved.name, 'บันทึกจากหน้าวางแผนงาน ('+nw.length+' คน)');
    const keep={openA, infoOpen, edText, edPost, tplSel, DC, DR};
    loadProject(S.id); ({openA, infoOpen, edText, edPost, tplSel, DC, DR}=keep);
    if(!quiet) say('💾 บันทึกแล้ว','success');
    if(resend.length && isAdm()) safe(()=>_promptResendConfirms(S.id, resend));
    safe(()=>{ renderProjects(); renderDash(); updateQueueBadge(); });
    return true;
  }catch(e){ say('บันทึกไม่สำเร็จ: '+e.message,'error'); return false; }
  finally{ saving=false; busy(false); render(); }
}

/* ── คนในทีม + รอบลงคิว ── */
const teamOf=k=>{ const cat=R[k][3]; const seen=new Set();
  return (safe(()=>getAllStaff(),[])||[]).filter(s=>s&&s.id&&!seen.has(s.id)&&seen.add(s.id)&&safe(()=>isStaffAssignable(s),true)&&!safe(()=>_isAdminStaff(s.id),false))
    .filter(s=>(s.categories&&s.categories.length?s.categories:[s.category]).includes(cat))
    .sort((a,b)=>String(a.nickname||a.name||'').localeCompare(String(b.nickname||b.name||''),'th')); };
// ห้องลงคิวที่ใช้ร่วมกัน (บท+QC · มิกซ์+ซับ) → คำตอบจากห้องเดียวกันนับให้ทุกหน้าที่ในห้องนั้น
function catGroup(cat){ const ch=safe(()=>getDiscordCfg().channels,{})||{}, av=safe(()=>AV_CATS,{})||{};
  const g=new Set([cat]); Object.keys(av).forEach(c=>{ if(c===cat) return;
    if((ch[cat]&&ch[c]&&ch[cat]===ch[c]) || (av[cat]&&av[c]&&av[cat].channel&&av[cat].channel!=='-'&&av[cat].channel===av[c].channel)) g.add(c); });
  return g; }
// 🔄 ดึงคำตอบจาก Discord อัตโนมัติ (ตอนเปิดหน้า + ทุก 2 นาทีระหว่างเปิดหน้าอยู่) — ใช้ตัวดึงเดิมของหน้าลงคิว
let QP={busy:false, at:0, err:''};
async function pullQueue(force){
  if(QP.busy) return; if(!force && Date.now()-QP.at<60000) return;
  const rounds=safe(()=>getRounds().filter(r=>r.status==='open'),[])||[]; if(!rounds.length) return;
  if(typeof pullFromDiscord!=='function') return;
  QP.busy=true; QP.err=''; let keep=null; try{ keep=_avRoundId; }catch(e){}
  try{ for(const r of rounds){ try{ _avRoundId=r.id; const st=await pullFromDiscord(true); if(st&&st.error) QP.err=st.error; }catch(e){ QP.err=String(e.message||e); } } }
  finally{ try{ _avRoundId=keep; }catch(e){} QP.busy=false; QP.at=Date.now(); }
  const pg=$('page-nd-plan'); if(!pg||pg.classList.contains('hidden')) return;
  const ae=document.activeElement; if(dd||pjOpen||(ae&&pg.contains(ae)&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName)&&ae.id!=='pl-pkq')) return;
  render();
}
setInterval(()=>{ const pg=$('page-nd-plan'); if(pg&&!pg.classList.contains('hidden')&&!document.hidden) pullQueue(true); }, 120000);
function queue(){ // คำตอบจากรอบลงคิวที่เปิดอยู่ (ไม่มีแอดมิน — _alcPeople กรองไว้แล้ว)
  const ppl=safe(()=>_alcPeople(),[])||[], rounds=safe(()=>getRounds().filter(r=>r.status==='open'),[])||[];
  return {rounds, ppl:ppl.map(o=>({n:o.staff.nickname||o.staff.name, id:o.sid, cats:[...new Set(o.replies.map(x=>x.cat))], free:o.replies.some(x=>x.status!=='unavailable'&&x.status!=='declined'), msg:(o.replies.map(x=>x.freeText).filter(Boolean).pop()||'')}))}; }
const roundLabel=rs=>[...new Set(rs.map(r=>safe(()=>_roundRangeLabel(r),'')).filter(x=>x&&x!=='—'))].join(' · ');

/* ── ข้อมูลโปรเจกต์ ── */
function infoHTML(){ const adm=isAdm();
  return `<div class="pl-f pl-g6"><div><label class="pl-l">รหัสงาน</label><input class="form-input" value="${esc(S.code)}" onchange="NDP.set('code',this.value.toUpperCase())"></div>
   <div><label class="pl-l">ลำดับ</label><input class="form-input" value="${esc(S.seq)}" onchange="NDP.set('seq',this.value)"></div>
   <div><label class="pl-l">ชื่อโปรเจกต์ *</label><input class="form-input" value="${esc(S.name)}" onchange="NDP.set('name',this.value)"></div>
   <div><label class="pl-l">ประเภทงาน</label><select class="form-input form-select" onchange="NDP.set('type',this.value)">${[...new Set(['',S.type,'หนัง','ซีรีย์','อนิเมะ','อนิเมชัน','หนังแนวตั้ง','เกม','โฆษณา','บรรยาย','หนังสือเสียง','เพลง','มิกซ์'])].map(t=>`<option${t===S.type?' selected':''}>${esc(t)}</option>`).join('')}</select></div></div>
  <div class="pl-f pl-g4" style="margin-top:10px"><div><label class="pl-l">ความยาว (นาที)</label><input class="form-input" type="number" step="any" value="${S.minutes||''}" onchange="NDP.set('minutes',+this.value||0)"></div>
   <div><label class="pl-l">จำนวนตอน (Ep.)</label><input class="form-input" type="number" value="${S.eps||''}" onchange="NDP.set('eps',+this.value||0)"></div>
   <div><label class="pl-l">วันเริ่มงาน</label><input class="form-input" type="date" value="${esc(S.start)}" onchange="NDP.set('start',this.value)"></div>
   <div><label class="pl-l">🏁 Deadline ลูกค้า</label><div class="pl-dt"><input class="form-input" type="date" value="${esc(S.deadline)}" onchange="NDP.set('deadline',this.value)"><input class="form-input" type="time" value="${esc(S.dtime)}" onchange="NDP.set('dtime',this.value)"></div></div></div>
  <div class="pl-f pl-g3" style="margin-top:10px">
   <div><label class="pl-l">Budget จากลูกค้า</label><div class="pl-bud"><select class="form-input form-select" onchange="NDP.set('budType',this.value)">${[['flat','เหมา'],['per-minute','ต่อนาที'],['per-hour','ต่อชั่วโมง'],['per-episode','ต่อบท'],['per-page','ต่อหน้า'],['per-day','ต่อวัน'],['per-project','ต่อโปรเจกต์']].map(([v,l])=>`<option value="${v}"${v===S.budType?' selected':''}>${l}</option>`).join('')}</select><input class="form-input" type="number" step="any" value="${S.budRate||''}" onchange="NDP.set('budRate',+this.value||0)">${['flat','per-minute','per-project'].includes(S.budType)?'<span></span>':`<input class="form-input" type="number" step="any" value="${S.budQty||''}" placeholder="จำนวน" onchange="NDP.set('budQty',+this.value||0)">`}</div></div>
   ${adm?`<div><label class="pl-l">ชื่อ / URL ลูกค้า</label><input class="form-input" value="${esc(S.client)}" onchange="NDP.set('client',this.value)"></div>`:`<div><label class="pl-l">ลูกค้า</label><div class="pl-lock">🔒 เฉพาะแอดมิน</div></div>`}
   <div><label class="pl-l">🗂️ Manager</label>${adm?`<select class="form-input form-select" onchange="NDP.set('mgrId',this.value)"><option value="">— แอดมินดูแลเอง —</option>${managers().map(m=>`<option value="${esc(m.uid)}"${m.uid===S.mgrId?' selected':''}>${esc(m.nickname||m.email)}</option>`).join('')}</select>`:`<div class="pl-lock">${esc(mgrName(S.mgrId))}</div>`}</div></div>
  <div class="pl-f pl-g3" style="margin-top:10px"><div><label class="pl-l">🔗 Link โหลดงาน</label><input class="form-input" value="${esc(S.link)}" onchange="NDP.set('link',this.value)"></div>
   <div><label class="pl-l">🔑 Secret key</label><input class="form-input" value="${esc(S.secret)}" placeholder="เห็นเฉพาะทีมที่เกี่ยวข้อง" onchange="NDP.set('secret',this.value)"></div>
   <div><label class="pl-l">🧾 หัก ณ ที่จ่าย (จากค่าจ้างทีม · ค่าเริ่มต้น 3%)</label><div class="pl-ded">${S.ded.map((d,j)=>`<span class="d ${d.on?'on':''}"><input type="checkbox" ${d.on?'checked':''} onchange="NDP.ded(${j},'on',this.checked)">${j===0?`<b>${d.pct}%</b> ${esc(d.label)}`:`<input class="form-input" style="width:100px;padding:3px 6px" value="${esc(d.label)}" onchange="NDP.ded(${j},'label',this.value)"><input class="form-input" style="width:46px;padding:3px 6px" value="${d.pct}" onchange="NDP.ded(${j},'pct',+this.value||0)">% <a style="cursor:pointer;opacity:.6" onclick="NDP.ded(${j},'del')">✕</a>`}</span>`).join('')}<button class="btn btn-outline btn-sm" title="เพิ่มรายการหักอื่น" onclick="NDP.ded(-1,'add')">＋</button></div>
     <div class="pl-mut" style="margin-top:3px">${S.legacyTax&&!S.dedT?`<span class="pl-warn">งานเดิมหักแยกตามหน้าที่ (${ORDER.filter(k=>S.roles[k].on).map(k=>R[k][0]+' '+(+S.legacyTax[k]||0)+'%').join(' · ')}) — คงไว้ตามเดิม · แก้ช่องนี้ = ใช้ค่าเดียวทุกหน้าที่</span>`:WHT()?`รวมหัก <b>${WHT()}%</b> จากค่าจ้างทุกคนในงานนี้`:'<span class="pl-warn">ไม่หัก — เช่น งานสั่งในชื่อส่วนตัว</span>'}</div></div></div>`; }

/* ── หน้าที่ · คน · ราคา · เวลา ── */
function nameBtn(k,j){ const r=S.roles[k], s=r.slots[j], open=dd&&dd.k===k&&dd.j===j;
  const pool=teamOf(k), q=ddQ.trim().toLowerCase();
  return `<div class="pl-nb" onclick="event.stopPropagation();NDP.dd('${k}',${j})">${av(s.n)}<div style="min-width:0">${s.n?`<b>${esc(s.n)}</b>${s.paid?' <span class="pl-paid">✓ จ่ายแล้ว</span>':''}`:'<span class="pl-mut">กดเพื่อเลือกคน…</span>'}</div>
   ${open?`<div class="pl-dd" onclick="event.stopPropagation()"><input class="form-input" id="pl-ddq" style="padding:4px 8px;margin-bottom:5px" placeholder="🔍 พิมพ์ชื่อ…" value="${esc(ddQ)}" oninput="NDP.ddq(this.value)">
     ${pool.filter(x=>!q||String((x.nickname||'')+' '+(x.name||'')).toLowerCase().includes(q)).slice(0,60).map(x=>`<div class="op" onclick="NDP.pick('${k}',${j},'${esc(x.id)}')">${av(x.nickname||x.name)}${esc(x.nickname||x.name)}<small class="pl-mut">${esc(x.name&&x.nickname?x.name:'')}${x.discordId?'':' · ไม่มีดิส'}</small></div>`).join('')||'<div class="pl-mut" style="padding:6px">ไม่พบชื่อ (ดูเฉพาะคนในทีมหน้าที่นี้)</div>'}
     ${s.n?`<div class="op" style="color:var(--red)" onclick="NDP.pick('${k}',${j},'')">✕ เอาชื่อออก (เก็บช่องไว้)</div>`:''}</div>`:''}</div>`; }

function bodyHTML(k){ const r=S.roles[k], hr=hoursOf(r), st=STD();
  const late=r.end&&S.deadline&&r.end>S.deadline;
  const time=`<div class="pl-phase"><div><label class="pl-l">📅 เริ่ม (วัน · เวลา)</label><div class="pl-dt"><input class="form-input" type="date" value="${esc(r.start)}" onchange="NDP.r('${k}','start',this.value)"><input class="form-input" type="time" value="${esc(r.stime)}" onchange="NDP.r('${k}','stime',this.value)"></div></div>
    <div><label class="pl-l">🏁 ส่ง (วัน · เวลา)${late?' <span class="pl-bad">เลยเดดไลน์ลูกค้า</span>':''}</label><div class="pl-dt"><input class="form-input" type="date" value="${esc(r.end)}" style="${late?'border-color:var(--red)':''}" onchange="NDP.r('${k}','end',this.value)"><input class="form-input" type="time" value="${esc(r.etime)}" onchange="NDP.r('${k}','etime',this.value)"></div></div>
    <div><label class="pl-l">👥 จำนวนคนทำงาน</label><div class="pl-cnt"><button onclick="NDP.cnt('${k}',-1)">−</button><b>${r.slots.length}</b><button onclick="NDP.cnt('${k}',1)">+</button></div></div></div>`;
  const unitSel=(v,fn)=>`<select class="form-input form-select" onchange="${fn}">${UNITS.map(u=>`<option${u===v?' selected':''}>${u}</option>`).join('')}</select>`;
  const qtyIn=(u,q,fn)=>QTYU.includes(u)?`× <input class="form-input" style="width:54px!important" type="number" step="any" value="${q||''}" onchange="${fn}">`:(u==='นาที'?`<span class="pl-mut">× ${S.minutes||0} นาที</span>`:'');
  let rate='', head='', rows='';
  if(k==='adp'){ const sm=r.slots.reduce((a,s)=>a+(+s.min||0),0);
    rate=`<div class="pl-rate"><b style="font-size:12.5px">💰 เรทเกลาบท</b><span class="t"><input class="form-input" type="number" step="any" value="${r.rate}" onchange="NDP.r('${k}','rate',+this.value||0)"> ฿ / นาทีที่ทำจริง ${st&&st.adp?stdHint(r.rate,st.adp.rate,`NDP.std('adp')`):''}</span><span class="pl-mut">รวมนาทีทุกคน <b class="${S.minutes&&Math.abs(sm-S.minutes)>0.5?'pl-warn':'pl-ok'}">${sm} / ${S.minutes||'—'}</b></span></div>`;
    head=`<div class="pl-wk pl-wk-adp hd"><span>คนทำงาน</span><span>Ep ที่ต้องทำ</span><span style="text-align:right">นาทีที่ทำ</span><span style="text-align:right">มีเวลาทำ</span><span style="text-align:right">ค่าตอบแทน</span><span></span></div>`;
    rows=r.slots.map((s,j)=>`<div class="pl-wk pl-wk-adp"><div>${nameBtn(k,j)}${slotTag(k,j)}</div><input class="form-input" value="${esc(s.ep)}" placeholder="เช่น 1–25" onchange="NDP.s('${k}',${j},'ep',this.value)"><input class="form-input" style="text-align:right" type="number" step="any" value="${s.min||''}" placeholder="0" onchange="NDP.s('${k}',${j},'min',+this.value||0)"><span class="pl-hrs"><b>${hr}</b> ชม.</span><span class="pl-amt">${B(amt(r,s))}</span><span class="pl-x" onclick="NDP.rm('${k}',${j})">✕</span></div>`).join('');
  } else if(k==='dub'){
    rate=`<div class="pl-rate"><b style="font-size:12.5px">💰 เรทพากย์</b>${r.tiers.map((t,j)=>`<span class="t"><b>พากย์${j+1}</b><input class="form-input" type="number" step="any" value="${t.rate}" onchange="NDP.tier(${j},'rate',+this.value||0)">฿/${unitSel(t.unit,`NDP.tier(${j},'unit',this.value)`)}${qtyIn(t.unit,t.qty,`NDP.tier(${j},'qty',+this.value||0)`)} = <b style="color:var(--text)">${B(tierAmt(t))}</b> ${st&&st.dub&&st.dub[j]?stdHint(t.rate,st.dub[j].rate,`NDP.std('dub',${j})`):''}${j===r.tiers.length-1&&j>0&&!r.slots.some(s=>s.tier===j+1)?` <a style="cursor:pointer;opacity:.6" title="ลบเบอร์นี้" onclick="NDP.tier(${j},'del')">✕</a>`:''}</span>`).join('')}<button class="btn btn-outline btn-sm" onclick="NDP.tier(-1,'add')">＋ พากย์${r.tiers.length+1}</button></div>`;
    head=`<div class="pl-wk pl-wk-dub hd"><span>นักพากย์</span><span>ใช้เรท</span><span style="text-align:right">มีเวลาทำ</span><span style="text-align:right">ค่าตอบแทน</span><span></span></div>`;
    rows=r.slots.map((s,j)=>`<div class="pl-wk pl-wk-dub"><div>${nameBtn(k,j)}${slotTag(k,j)}</div><select class="form-input form-select" onchange="NDP.s('${k}',${j},'tier',+this.value)">${r.tiers.map((t,i)=>`<option value="${i+1}"${(s.tier||1)===i+1?' selected':''}>พากย์${i+1} · ${B(tierAmt(t))}</option>`).join('')}</select><span class="pl-hrs"><b>${hr}</b> ชม.</span><span class="pl-amt">${B(amt(r,s))}</span><span class="pl-x" onclick="NDP.rm('${k}',${j})">✕</span></div>`).join('');
  } else {
    rate=`<div class="pl-rate"><b style="font-size:12.5px">💰 ราคาต่อคน</b><span class="t"><input class="form-input" type="number" step="any" value="${r.rate}" onchange="NDP.r('${k}','rate',+this.value||0)">฿/${unitSel(r.unit,`NDP.r('${k}','unit',this.value)`)}${qtyIn(r.unit,r.qty,`NDP.r('${k}','qty',+this.value||0)`)}</span><span class="pl-mut">= <b style="color:var(--text)">${B(roleUnit(r))}</b> ต่อคน · เพิ่มคนแล้วราคาต่อคนคงเดิม</span> ${st&&st[k]?stdHint(r.rate,st[k].rate,`NDP.std('${k}')`):''}</div>`;
    head=`<div class="pl-wk pl-wk-std hd"><span>คนทำงาน</span><span></span><span style="text-align:right">มีเวลาทำ</span><span style="text-align:right">ค่าตอบแทน</span><span></span></div>`;
    rows=r.slots.map((s,j)=>`<div class="pl-wk pl-wk-std"><div>${nameBtn(k,j)}${slotTag(k,j)}</div><span></span><span class="pl-hrs"><b>${hr}</b> ชม.</span><span class="pl-amt">${B(amt(r,s))}</span><span class="pl-x" onclick="NDP.rm('${k}',${j})">✕</span></div>`).join('');
  }
  const w=taxOf(k);
  return time+rate+head+rows+`<div class="pl-foot"><span class="pl-mut">⏱ ทุกคนในหน้าที่นี้มีเวลาทำ <b style="color:var(--accent2)">${hr} ชม.</b></span><span style="flex:1"></span><span class="pl-mut">🧾 ${w?`หัก ณ ที่จ่าย ${w}% · โอนจริง ${B(subTot(r)*(1-w/100))}`:'ไม่หัก ณ ที่จ่าย'}</span><b>รวม ${B(subTot(r))}</b></div>`; }

function leftHTML(){ const c=PCODE()+(S.seq?String(S.seq).padStart(2,'0'):''), st=STD();
  return `<div class="pl-card"><div class="pl-ch" style="cursor:pointer" onclick="NDP.info()"><h3>📋 ข้อมูลโปรเจกต์</h3>
     ${infoOpen?`<span class="pl-mut">แก้ได้ทุกช่องเหมือนหน้าโปรเจกต์${role()==='manager'?' · ยกเว้นชื่อลูกค้า':''}</span>`:`<span class="pl-mut"><b style="color:var(--accent2)">${esc(c)}</b> ${esc(S.name)} · ${esc(S.type||'-')} · ${S.eps||'-'} ตอน · ${S.minutes||'-'} นาที · 🏁 ${fd(S.deadline)}</span>`}
     <span class="btn btn-outline btn-sm" style="margin-left:auto">${infoOpen?'▴ พับเก็บ':'▾ แก้ข้อมูล'}</span></div>${infoOpen?`<div class="pl-cb">${infoHTML()}</div>`:''}</div>
   <div class="pl-card"><div class="pl-ch"><h3>① เลือกหน้าที่ที่งานนี้ใช้</h3><span class="pl-mut">ติ๊กเฉพาะที่ใช้ — กรอบหน้าที่ขึ้นด้านล่าง</span></div>
    <div class="pl-cb"><div class="pl-rp">${ORDER.map(k=>`<span class="${S.roles[k].on?'on':''}" style="--c:${R[k][2]}" onclick="NDP.tog('${k}')"><i>${S.roles[k].on?'✓':''}</i>${R[k][1]} ${R[k][0]}</span>`).join('')}</div></div></div>
   <div class="pl-card"><div class="pl-ch"><h3>② หน้าที่ · คน · ราคา · เวลา</h3><span class="pl-mut">กดแถบเพื่อเปิดแก้ทีละหน้าที่</span>
     ${st?`<span class="pl-tag" style="margin-left:auto;background:rgba(21,101,255,.16);color:var(--accent2)">💲 ราคามาตรฐานรหัส ${esc(PCODE())}</span>`:`<span class="pl-tag t-p" style="margin-left:auto">ยังไม่มีเทมเพลตราคารหัส ${esc(PCODE()||'-')}</span>`}</div><div class="pl-cb">
    ${ORDER.map((k,i)=>{ const r=S.roles[k]; if(!r.on) return ''; const o=i===openA, named=r.slots.filter(s=>s.id).length, late=r.end&&S.deadline&&r.end>S.deadline;
      return `<div class="pl-acc ${o?'open':''}" style="--c:${R[k][2]}"><div class="pl-ah" onclick="NDP.open(${i})"><span class="pl-ic">${R[k][1]}</span>
        <div><b>${R[k][0]}</b><small>${fd(rS(r))} ${esc(r.stime)} → <span class="${late?'pl-bad':''}">${fd(rE(r))} ${esc(r.etime)}</span> · ${hoursOf(r)} ชม. · ${r.slots.length} คน${r.slots.length>named?` <span class="pl-warn">(ว่าง ${r.slots.length-named} ช่อง)</span>`:''}</small></div>
        <span class="pl-faces">${r.slots.map(s=>av(s.n)).join('')}</span><b>${B(subTot(r))}</b><span class="pl-stt s-${esc(r.st)}" title="กดเพื่อเปลี่ยนสถานะ" onclick="event.stopPropagation();NDP.stt('${k}')">${(ST.find(x=>x[0]===r.st)||ST[0])[1]}</span><span class="pl-mut">${o?'▴':'▾'}</span></div>
        ${o?`<div class="pl-ab">${bodyHTML(k)}</div>`:''}</div>`; }).join('')||'<div class="pl-mut">ยังไม่ได้เลือกหน้าที่</div>'}
   </div></div>`; }

function rightHTML(){ const cost=on().reduce((a,r)=>a+subTot(r),0), bud=budget(), w=WHT(), wht=Math.round(cost*w/100), pf=bud-cost;
  const s0=+new Date(S.start||S.deadline), e0=+new Date(S.deadline)+864e5, span=Math.max(1,e0-s0), x=d=>{ const t=+new Date(d); return isNaN(t)?0:Math.max(0,Math.min(100,(t-s0)/span*100)); };
  const days=[]; if(!isNaN(s0)&&!isNaN(e0)) for(let t=s0;t<e0&&days.length<60;t+=864e5) days.push(new Date(t));
  const q=queue(), r=S.roles[pkRole], qq=pkQ.trim().toLowerCase(), hit=n=>String(n||'').toLowerCase().includes(qq);
  const grp=catGroup(R[pkRole][3]), team=new Set(teamOf(pkRole).map(x=>x.id));
  let list=q.ppl.filter(o=>o.cats.some(c=>grp.has(c))&&(qq||pkAll||o.free)&&(!qq||hit(o.n))).sort((a,b)=>(!team.has(a.id))-(!team.has(b.id)));
  // 🔍 ค้นชื่อ = ค้นทุกคนในทีมด้วย (ใส่คนที่ไม่ได้มาลงคิวได้) — ทีมหน้าที่นี้ขึ้นก่อน
  if(qq){ const seen=new Set(list.map(o=>o.id)), mine=new Set(teamOf(pkRole).map(s=>s.id)); const all=[]; const uniq=new Set();
    (safe(()=>getAllStaff(),[])||[]).forEach(s=>{ if(!s||!s.id||uniq.has(s.id)||seen.has(s.id)) return; uniq.add(s.id);
      if(!safe(()=>isStaffAssignable(s),true)||safe(()=>_isAdminStaff(s.id),false)) return;
      if(hit(s.nickname)||hit(s.name)) all.push({n:s.nickname||s.name, id:s.id, noQ:true, other:!mine.has(s.id)}); });
    all.sort((a,b)=>(a.other-b.other)||String(a.n).localeCompare(String(b.n),'th')); list=list.concat(all.slice(0,40)); }
  return `<div class="pl-mrow" title="จ่ายทีม ${B(cost)} = โอนจริง ${B(cost-wht)} + หัก ณ ที่จ่าย ${w}% ${B(wht)}"><div><span>💰 Budget</span><b>${B(bud)}</b></div><div><span>👥 จ่ายทีม${w?` (หัก ${w}% ${B(wht)})`:' (ไม่หัก)'}</span><b>${B(cost)}</b></div><div><span>📈 กำไร ${bud?Math.round(pf/bud*100):0}%</span><b class="${pf<0?'pl-bad':'pl-ok'}">${B(pf)}</b></div></div>
   <div class="pl-card"><div class="pl-ch"><h3>📅 ไทม์ไลน์</h3></div><div class="pl-cb pl-tl">${isNaN(s0)||isNaN(e0)?'<div class="pl-mut">ใส่วันเริ่มงาน + Deadline ก่อน</div>':`<div class="wrap">${on().map(rr=>`<div class="row" onclick="NDP.open(${ORDER.indexOf(rr.k)})"><span>${R[rr.k][1]} ${R[rr.k][0]}</span><div class="lane"><i style="left:${x(rS(rr)+'T'+rST(rr))}%;width:${Math.max(3,x(rE(rr)+'T'+rET(rr))-x(rS(rr)+'T'+rST(rr)))}%;background:${R[rr.k][2]};${rr.end&&S.deadline&&rr.end>S.deadline?'box-shadow:0 0 0 2px var(--red)':''}"></i></div></div>`).join('')}
     <div class="vl" style="left:calc(76px + (100% - 76px)*${x(new Date())/100});background:var(--accent2)"></div><div class="vl" style="left:calc(76px + (100% - 76px)*${x(S.deadline+'T'+(S.dtime||'23:59'))/100});border-left:2px dashed var(--red);width:0"></div>
     ${days.filter((d,i)=>days.length<=10||i%Math.ceil(days.length/10)===0).map(d=>`<span class="dl" style="left:calc(76px + (100% - 76px)*${x(+d+12*36e5)/100})">${d.getDate()}</span>`).join('')}</div>`}</div></div>
   <div class="pl-card"><div class="pl-ch" style="display:block"><h3>🙋 คนที่ลงคิว</h3>
     <div style="display:flex;gap:6px;margin-top:8px"><select class="form-input form-select" style="padding:5px 8px" onchange="NDP.pk(this.value)">${ORDER.map(k=>`<option value="${k}"${k===pkRole?' selected':''}>${R[k][1]} ${R[k][0]}</option>`).join('')}</select>
       <select class="form-input form-select" style="padding:5px 8px;width:auto" onchange="NDP.pkAll(this.value==='all')"><option value="free">แจ้งสะดวก</option><option value="all"${pkAll?' selected':''}>ทุกคนที่ตอบ</option></select></div>
     <input class="form-input" id="pl-pkq" style="padding:5px 9px;margin-top:6px" placeholder="🔍 ค้นชื่อ — ค้นได้ทุกคนในทีม (รวมคนที่ไม่ได้ลงคิว)" value="${esc(pkQ)}" oninput="NDP.pkQ(this.value)"></div>
    <div class="pl-cb" style="padding:6px 8px;max-height:360px;overflow:auto">${list.map(o=>{ const inn=r&&r.slots.some(s=>s.id===o.id);
      return `<div class="pl-pk ${inn?'in':''}" title="กดเพื่อใส่ในหน้าที่ ${R[pkRole][0]}" onclick="NDP.fromQ('${esc(o.id)}')">${av(o.n)}<div><b>${esc(o.n)}</b>${o.msg?`<div class="msg">“${esc(String(o.msg).slice(0,60))}”</div>`:''}</div><span class="pl-tag ${inn?'t-y':o.noQ?'t-p':o.free?'t-y':'t-n'}">${inn?'✓ ใส่แล้ว':o.noQ?(o.other?'ทีมอื่น · ไม่ได้ลงคิว':'ไม่ได้ลงคิว'):o.free?'ว่าง':'ไม่ว่าง'}</span></div>`; }).join('')||`<div class="pl-mut" style="padding:10px">${qq?'ไม่พบชื่อ "'+esc(pkQ)+'"':q.rounds.length?'ยังไม่มีคนแจ้งสะดวกในหน้าที่นี้ — ค้นชื่อด้านบนเพื่อใส่คนที่ไม่ได้ลงคิว':'ยังไม่มีรอบลงคิวที่เปิดอยู่ — ค้นชื่อด้านบนเพื่อใส่คนได้'}</div>`}</div>
    <div class="pl-cb pl-mut" style="padding-top:0;font-size:11px">🗓️ ${q.rounds.length?'รอบลงคิว '+esc(roundLabel(q.rounds)||'ที่เปิดอยู่'):'ไม่มีรอบลงคิวที่เปิดอยู่'}${QP.busy?' · <span>กำลังดึงคำตอบ…</span>':''}${QP.err?` · <span class="pl-warn" title="${esc(QP.err)}">ดึงคำตอบไม่สำเร็จ</span>`:''}</div></div>`; }

/* ── 📂 โฟลเดอร์งาน (Google Drive) ── */
const drCfg=()=>safe(()=>getDriveCfg(),{})||{};
const drParents=()=>{ const c=drCfg(); return c[safe(()=>_drParentsKey(),'parents')]||[]; };
const drReady=()=>{ const c=drCfg(); return !!String((role()==='manager'&&c.mgrGasUrl)?c.mgrGasUrl:(c.gasUrl||'')).trim(); };
function drTplOptions(){ const c=drCfg(), out=[['role','🎬 ตามหน้าที่ที่เลือก'],['central','📁 เทมเพลตกลาง']];
  Object.keys(c.tplByCode||{}).sort().forEach(k=>out.push(['code:'+k,'📁 เทมเพลตรหัส '+k])); return out; }
function drTplKey(){ if(DR.tpl) return DR.tpl; const c=drCfg(); return (PCODE()&&c.tplByCode&&c.tplByCode[PCODE()]!=null)?'code:'+PCODE():'central'; }
function drTplText(key){ const c=drCfg(); key=key||drTplKey();
  if(key==='role') return on().map((r,j)=>String(j+1).padStart(2,'0')+' '+R[r.k][0]).join('\n');
  if(key.startsWith('code:')) return String((c.tplByCode||{})[key.slice(5)]||'');
  return String(c.tpl||safe(()=>_DR_TPL_DEFAULT,'')); }
const drCode=()=>(PCODE()+(S.seq?String(S.seq).padStart(2,'0'):''))||S.name;
const drFolderName=()=>String(DR.name||(drCode()+(S.name&&S.name!==drCode()?' '+S.name:''))).trim();
const drItems=()=>safe(()=>_drParseTpl(DR.edit&&DR.editText!=null?DR.editText:drTplText(), drCode(), S.name),[]);
function driveHTML(){ const p=S.src, linked=!!p.driveFolderId, ready=drReady();
  const head=`<div class="pl-ch pl-gd"><h3>📂 โฟลเดอร์งาน (Google Drive)</h3><span class="pl-mut">${linked?'ผูกโฟลเดอร์แล้ว':'ยังไม่มีโฟลเดอร์ของงานนี้'}</span>
    ${linked?`<a class="btn btn-outline btn-sm" style="margin-left:auto" href="${esc(p.driveFolderLink||('https://drive.google.com/drive/folders/'+p.driveFolderId))}" target="_blank" rel="noopener">↗ เปิดในไดรฟ์</a>`:''}</div>`;
  if(!ready) return `<div class="pl-card">${head}<div class="pl-cb pl-mut">ยังไม่ได้ตั้งค่าการเชื่อมไดรฟ์ ${isAdm()?'— <a style="cursor:pointer;color:var(--accent2)" onclick="openDriveSetup()">🔧 ตั้งค่า Drive</a>':'— ให้แอดมินตั้งค่า Drive ก่อน'}</div></div>`;
  const people=planIds().map(staff).filter(Boolean), noMail=people.filter(s=>!(s.email||'').trim());
  if(linked){
    return `<div class="pl-card">${head}<div class="pl-cb pl-2col"><div><div class="pl-tree">📁 <b>${esc(p.driveFolderName||drFolderName())}</b>${DR.folders&&DR.cur===p.driveFolderId?'<br>'+(DR.folders.map(f=>'&nbsp;&nbsp;&nbsp;&nbsp;📁 '+esc(f.name)).join('<br>')||'<span class="pl-mut">(ว่าง)</span>'):''}</div>
       <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn btn-outline btn-sm" onclick="NDP.drInside()">🔄 ดูโฟลเดอร์ข้างใน</button><button class="btn btn-outline btn-sm" onclick="NDP.drUnlink()">🔗 เปลี่ยนโฟลเดอร์</button></div>
       <div style="margin-top:12px"><label class="pl-l">📄 ไฟล์บท (ชีทสคริปต์)</label>${p.scriptLink?`<div style="display:flex;gap:6px;flex-wrap:wrap"><a class="btn btn-outline btn-sm" href="${esc(p.scriptLink)}" target="_blank" rel="noopener">↗ เปิด ${esc(p.scriptName||'ไฟล์บท')}</a><button class="btn btn-outline btn-sm" onclick="NDP.drScript()">＋ สร้างอีกไฟล์</button></div>`
         :drCfg().scriptTplId?`<button class="btn btn-green btn-sm" onclick="NDP.drScript()">📄 สร้างไฟล์บท Script/CV_${esc(drCode())}</button><div class="pl-mut" style="margin-top:4px">ก๊อปจากไฟล์บทต้นฉบับ ไว้ในโฟลเดอร์งานนี้</div>`
         :`<div class="pl-mut">ยังไม่ได้ตั้งไฟล์บทต้นฉบับ ${isAdm()?'— <a style="cursor:pointer;color:var(--accent2)" onclick="openDriveSetup()">🔧 ตั้งค่า Drive</a> (ช่อง "ไฟล์เทมเพลตบท")':'— ให้แอดมินตั้งที่ 🔧 ตั้งค่า Drive'}</div>`}</div></div>
      <div><label class="pl-l">🔐 สิทธิ์ของทีม</label><div class="pl-mut" style="line-height:1.7">เพิ่มสิทธิ์แก้ไขเงียบ ๆ ให้คนในแผน <b>${people.length}</b> คน — เฉพาะคนที่อีเมลยังไม่มีสิทธิ์ · ไม่ส่งอีเมลแจ้งเตือน${noMail.length?`<br><span class="pl-warn">ไม่มีอีเมลในทะเบียน: ${noMail.map(s=>esc(s.nickname||s.name)).join(', ')}</span>`:''}</div>
       <button class="btn btn-green" style="margin-top:8px;width:100%" onclick="NDP.drShare()">🔐 เพิ่มสิทธิ์ให้คนในแผน</button>${p.driveSharedAt?`<div class="pl-mut" style="margin-top:5px">เพิ่มสิทธิ์ล่าสุด ${esc(safe(()=>_prTimeAgo(p.driveSharedAt),''))}</div>`:''}</div></div></div>`;
  }
  const parents=drParents(), cur=DR.cur, tplKey=drTplKey(), items=drItems(), here=(DR.path[DR.path.length-1]||{}).name||'';
  return `<div class="pl-card">${head}<div class="pl-cb pl-2col"><div><label class="pl-l">📍 เลือกที่วาง — กดโฟลเดอร์เพื่อเข้าไปดูข้างใน</label>
     <div style="display:flex;gap:6px"><select class="form-input form-select" onchange="NDP.drRoot(this.value)"><option value="">— โฟลเดอร์หลัก —</option>${parents.map(x=>`<option value="${esc(x.id)}"${DR.path[0]&&DR.path[0].id===x.id?' selected':''}>📂 ${esc(x.name)}</option>`).join('')}</select>
      <button class="btn btn-outline btn-sm" title="เปิดดูจากไดรฟ์ทั้งหมด" onclick="NDP.drRoot('root')">🗂️</button></div>
     ${cur?`<div class="pl-crumb">${DR.path.map((x,i)=>`${i?'›':''}<a onclick="NDP.drUp(${i})">${esc(x.name)}</a>`).join(' ')}</div>
      <div class="pl-fl">${DR.err?`<div class="pl-bad" style="cursor:default">โหลดไม่ได้: ${esc(DR.err)}</div>`:DR.folders==null?'<div class="pl-mut" style="cursor:default">กำลังโหลด…</div>':(DR.folders.map((f,i)=>`<div onclick="NDP.drIn(${i})">📁 ${esc(f.name)}</div>`).join('')||'<div class="pl-mut" style="cursor:default">ไม่มีโฟลเดอร์ย่อย</div>')}</div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn btn-outline btn-sm" onclick="NDP.drNew()">＋ โฟลเดอร์ใหม่ที่นี่</button>${cur!=='root'?`<button class="btn btn-outline btn-sm" onclick="NDP.drLink()">🔗 ใช้ "${esc(here)}" เป็นโฟลเดอร์งาน</button>`:''}</div>
      <div class="pl-mut" style="margin-top:6px">จะสร้างไว้ใน: <b>${esc(here)}</b></div>`:`<div class="pl-mut" style="margin-top:8px">${parents.length?'เลือกโฟลเดอร์หลักก่อน':'ยังไม่มีโฟลเดอร์หลัก — กด 🗂️ เพื่อเปิดดูไดรฟ์'}</div>`}</div>
    <div><label class="pl-l">🧩 เทมเพลตโครงโฟลเดอร์</label><div style="display:flex;gap:6px"><select class="form-input form-select" onchange="NDP.drTpl(this.value)">${drTplOptions().map(([v,l])=>`<option value="${esc(v)}"${v===tplKey?' selected':''}>${esc(l)}</option>`).join('')}</select><button class="btn btn-outline btn-sm" onclick="NDP.drEdit()">${DR.edit?'✕ ปิด':'✏️ แก้'}</button></div>
     <input class="form-input" style="margin-top:8px" value="${esc(drFolderName())}" placeholder="ชื่อโฟลเดอร์งาน" onchange="NDP.drName(this.value)">
     ${DR.edit?`<textarea class="form-input" style="margin-top:8px;min-height:150px;font-family:monospace;font-size:12.5px" oninput="NDP.drEditTxt(this.value)">${esc(DR.editText!=null?DR.editText:drTplText())}</textarea>
       <div class="pl-mut" style="margin:4px 0">1 บรรทัด = 1 โฟลเดอร์ · ขึ้นต้น "-" = โฟลเดอร์ย่อยของบรรทัดบน · {รหัส} = รหัสงาน</div>
       <div style="display:flex;gap:6px;flex-wrap:wrap">${tplKey!=='role'?`<button class="btn btn-outline btn-sm" onclick="NDP.drSaveTpl('over')">💾 บันทึกทับ</button>`:''}<button class="btn btn-outline btn-sm" onclick="NDP.drSaveTpl('new')">📄 บันทึกเป็นเทมเพลตรหัส ${esc(PCODE()||'…')}</button></div>`
      :`<div class="pl-tree" style="margin-top:8px">📁 <b>${esc(drFolderName())}</b><br>${items.map(it=>`&nbsp;&nbsp;&nbsp;&nbsp;📁 ${esc(it.name)}${(it.children||[]).map(c=>'<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;📁 '+esc(c)).join('')}`).join('<br>')||'<span class="pl-mut">(ไม่มีโฟลเดอร์ย่อย)</span>'}</div>`}
     <button class="btn btn-green" style="width:100%;margin-top:10px" ${cur&&cur!=='root'?'':'disabled title="เลือกที่วางก่อน"'} onclick="NDP.drCreate()">📂 สร้างตามเทมเพลต + เพิ่มสิทธิ์ทีม</button>
     <div class="pl-mut" style="margin-top:6px">🔐 เพิ่มสิทธิ์เงียบ ๆ เฉพาะคนในแผนที่อีเมลยังไม่มีสิทธิ์ · ไม่แจ้งเตือน</div></div></div></div>`; }
async function drList(id){ DR.folders=null; DR.err=''; render(); try{ const d=await callDrive({action:'list', parentId:id}); if(DR.cur===id) DR.folders=d.folders||[]; }catch(e){ if(DR.cur===id) DR.err=String(e.message||e); } render(); }
function drShareEmails(){ const ids=[...planIds()]; const m=mgrStaff(S.mgrId); if(m) ids.push(m.id);
  return [...new Set(ids.map(staff).filter(Boolean).map(s=>String(s.email||'').trim().toLowerCase()).filter(e=>/@/.test(e)))]; }
async function drShare(folderId, quiet){
  const emails=drShareEmails(); if(!emails.length){ if(!quiet) say('คนในแผนยังไม่มีอีเมลในทะเบียน','warn'); return; }
  try{ const d=await callDrive({action:'share', folderId, emails});
    await saveProjectMerge(S.id, f=>{ f.driveSharedAt=new Date().toISOString(); });
    const fl=(d.failed||[]).length;
    say('🔐 เพิ่มสิทธิ์ '+((d.added||[]).length)+' คน · มีสิทธิ์อยู่แล้ว '+((d.already||[]).length)+(fl?' · ไม่สำเร็จ '+fl:''), fl?'warn':'success');
  }catch(e){ say(/ไม่รู้จัก|unknown/i.test(e.message)?'Apps Script ไดรฟ์ยังเป็นเวอร์ชันเก่า — วางโค้ด AppsScript-จัดไฟล์ไดรฟ์.gs ล่าสุดแล้ว Deploy ใหม่ก่อน':'เพิ่มสิทธิ์ไม่สำเร็จ: '+e.message,'error'); }
}

/* ── 💬 ห้อง Discord ── */
function syncRoom(){ const want=new Set(planIds());
  Object.keys(DC.room).forEach(id=>{ const s=DC.room[id]; if(s==='add'&&!want.has(id)) delete DC.room[id]; else if(s==='in'&&!want.has(id)&&!DC.keep[id]) DC.room[id]='rm'; else if(s==='rm'&&want.has(id)) DC.room[id]='in'; });
  want.forEach(id=>{ if(!DC.room[id]) DC.room[id]='add'; }); }
const posts=()=>safe(()=>_prPosts(S.src),[])||[];
const tpls=()=>safe(()=>getPostTpls(),[])||[];
function tplFill(t){ const txt=String((t&&t.text)||''); return safe(()=>_prFillTpl(previewProj(), txt),txt); }
function edDefault(){ const p=posts().find(x=>x.id===edPost); if(p) return String(p.text||''); return tplFill(tpls().find(x=>x.id===tplSel)||tpls()[0]); }
function dcHTML(){ const p=S.src, has=!!p.discordChannelId;
  syncRoom(); const ids=Object.keys(DC.room), cnt=k=>ids.filter(id=>DC.room[id]===k&&(staff(id)||{}).discordId).length; if(edText==null) edText=edDefault();
  const ms=mgrStaff(S.mgrId), noDc=planIds().filter(id=>!(staff(id)||{}).discordId);
  const left=has?`<div class="pl-tree"><b>📂 ${esc(p.discordCategoryName||'(หมวดหมู่)')}</b><br>&nbsp;&nbsp;#${esc(p.discordChannelName||'📁│project')} ${p.discordReadOnly?'<span class="pl-tag" style="background:rgba(88,101,242,.2);color:#aab3ff">🔒 ทีมอ่านอย่างเดียว</span>':`<a class="pl-tag t-p" style="cursor:pointer" title="ตอนนี้ทีมพิมพ์ในห้องนี้ได้ — กดเพื่อให้พิมพ์ได้เฉพาะแอดมิน/เมเนเจอร์" onclick="NDP.dcRO()">🔓 ตั้งให้ทีมอ่านอย่างเดียว</a>`}${p.discordTalkId?'<br>&nbsp;&nbsp;#🎙│พูดคุย':''}</div>
     <div style="margin:12px 0 6px;font-weight:600;font-size:13px">👥 สิทธิ์เข้าห้อง</div>
     <div class="pl-mem">${ids.map(id=>{ const s=staff(id)||{}, n=s.nickname||s.name||id, nod=!s.discordId; return `<span class="pl-dm ${DC.room[id]} ${nod?'nod':''}" title="${nod?'ยังไม่ผูก Discord — ดึงเข้าห้องไม่ได้':''}" onclick="NDP.dc('${esc(id)}')">${av(n)}${esc(n)}${DC.room[id]==='add'?' <small style="color:var(--accent2)">+ เข้า</small>':DC.room[id]==='rm'?' <small>− ออก</small>':''}${nod?' ⚠️':''}</span>`; }).join('')||'<span class="pl-mut">ยังไม่มีคนในแผน</span>'}</div>
     ${ms?`<div class="pl-mut" style="margin-top:6px">🗂️ เมเนเจอร์ ${esc(ms.nickname||ms.name)} พิมพ์ได้ทุกห้องเสมอ</div>`:''}
     <div class="pl-mut" style="margin-top:8px;line-height:1.6"><b style="color:var(--accent2)">ฟ้า</b> = จะดึงเข้า · <b class="pl-bad">แดง</b> = จะเอาออก (คนที่ไม่อยู่ในแผนแล้ว — กดซ้ำ = เก็บไว้) · กดชื่อเขียว = จะเอาออก</div>
     <button class="btn btn-blue" style="margin-top:10px;width:100%;background:#5865F2;border-color:#5865F2" onclick="NDP.dcSync()">🔄 อัปเดตสิทธิ์ห้อง · ดึงเข้า ${cnt('add')} · เอาออก ${cnt('rm')}</button>`
   :`<label class="pl-l">ชื่อหมวดหมู่</label><input class="form-input" id="pl-dccat" value="${esc(DC.cat!=null?DC.cat:('🟡'+drCode()+(ms?' | '+(ms.nickname||ms.name)+' ดูแล':'')))}" oninput="NDP.dcCat(this.value)">
     <div class="pl-tree" style="margin-top:8px">&nbsp;&nbsp;#📁│project <span class="pl-tag" style="background:rgba(88,101,242,.2);color:#aab3ff">🔒 ทีมอ่านอย่างเดียว</span><br>&nbsp;&nbsp;#🎙│พูดคุย</div>
     <label style="display:flex;gap:7px;align-items:center;font-size:12.5px;margin-top:8px;cursor:pointer"><input type="checkbox" ${DC.priv!==false?'checked':''} onchange="NDP.dcPriv(this.checked)"> ห้องส่วนตัว — เห็นเฉพาะคนในแผน</label>
     <div class="pl-mut" style="margin-top:6px">ดึงคนในแผนเข้า ${planIds().length-noDc.length} คน${noDc.length?` · <span class="pl-warn">ยังไม่ผูกดิส: ${noDc.map(id=>esc(nickOf(id))).join(', ')}</span>`:''}</div>
     <button class="btn btn-blue" style="margin-top:10px;width:100%;background:#5865F2;border-color:#5865F2" onclick="NDP.dcCreate()">🏗️ สร้างห้อง + ดึงทีม + โพสต์บรีฟ</button>
     <button class="btn btn-outline btn-sm" style="margin-top:6px;width:100%" onclick="NDP.dcLink()">🔗 ผูกห้องที่มีอยู่แล้ว</button>`;
  const P=posts(), cur=P.find(x=>x.id===edPost), posted=cur&&Array.isArray(cur.msgIds)&&cur.msgIds.length;
  return `<div class="pl-card"><div class="pl-ch pl-dch"><h3>💬 ห้อง Discord</h3><span class="pl-mut">${has?'ผูกห้องแล้ว · ชื่อคนมาจากแผนด้านบน':'ยังไม่มีห้อง — สร้างจากข้อมูลด้านบน'}</span></div>
   <div class="pl-cb pl-dcw"><div>${left}</div>
    <div><div class="pl-tpls">${P.length?`<select class="form-input form-select" style="width:auto;padding:4px 8px" title="เลือกโพสต์ที่จะแก้" onchange="NDP.post(this.value)">${P.map(x=>`<option value="${esc(x.id)}"${x.id===edPost?' selected':''}>${esc((x.emoji||'📝')+' '+(x.title||'โพสต์'))}${x.msgIds&&x.msgIds.length?' · โพสต์แล้ว':' · ร่าง'}</option>`).join('')}<option value=""${!cur?' selected':''}>＋ ข้อความใหม่</option></select>`:''}
      ${(()=>{ const L=tpls(), c=L.find(t=>t.id===tplSel); return `<select class="form-input form-select" style="width:auto;max-width:280px;padding:4px 8px" title="ดึงข้อความจากเทมเพลต (เติมข้อมูลจากแผนให้)" onchange="NDP.tpl(this.value)"><option value="" selected>📋 ${c?'เทมเพลต: '+esc(c.name||'เทมเพลต')+' — เลือกเพื่อดึงข้อความ':'ดึงข้อความจากเทมเพลต…'}</option>${L.map(t=>`<option value="${esc(t.id)}">${t.id===tplSel?'✓ ':''}${esc(t.name||'เทมเพลต')}</option>`).join('')}</select>`; })()}<span style="flex:1"></span><button class="btn btn-outline btn-sm" onclick="NDP.saveTpl()">💾 บันทึกเป็นเทมเพลต</button></div>
     <textarea class="form-input" id="pl-ed" oninput="NDP.ed(this)" onkeydown="NDP.edKey(event)" onblur="setTimeout(()=>NDP.atClose(),150)">${esc(edText)}</textarea>
     <div style="display:flex;gap:6px;margin-top:8px;align-items:center;flex-wrap:wrap"><span class="pl-mut">พิมพ์ @ เพื่อแท็กคนในแผน · ${cur?(posted?'โพสต์นี้อยู่ในห้องแล้ว':'ร่าง — ยังไม่โพสต์'):'ข้อความใหม่'}</span><span style="flex:1"></span>
      ${posted?`<button class="btn btn-sm" style="background:#5865F2;color:#fff" onclick="NDP.send('update')">📣 อัปเดตโพสต์</button>`:''}<button class="btn ${posted?'btn-outline':''} btn-sm" style="${posted?'':'background:#5865F2;color:#fff'}" ${has?'':'disabled title="สร้างห้องก่อน"'} onclick="NDP.send('new')">📤 โพสต์ใหม่</button></div></div></div></div>`; }

const dcTargets=p=>[[p.discordCategoryId,false],[p.discordChannelId,!!p.discordReadOnly],[p.discordTalkId,false]];
async function dcAllow(s, p, mgr){ let ok=0, fail=0;
  for(const [ch,read] of dcTargets(p)){ if(!ch) continue; try{ await callProjBot({action:'discordAllowMember', channelId:ch, userId:s.discordId, mode:(read&&!mgr)?'read':'full'}); ok++; }catch(e){ fail++; } }
  return {ok,fail}; }
async function postText(raw, mode){
  const p=fresh(); if(!p||!p.discordChannelId){ say('ยังไม่มีห้อง — สร้างห้องก่อน','warn'); return; }
  raw=String(raw||'').trim(); if(!raw){ say('ข้อความว่าง','error'); return; }
  let txt=raw; try{ txt=_prApplyRoleMentions(txt, await _prRoleMap()); }catch(e){}
  const chunks=_prChunks(txt); const post=mode==='update'?_prPosts(p).find(x=>x.id===edPost):null;
  const oldIds=post&&Array.isArray(post.msgIds)?[...post.msgIds]:[]; const newIds=[];
  for(let i=0;i<Math.max(chunks.length,oldIds.length);i++){ const content=chunks[i]||'—';
    if(oldIds[i]){ try{ await callProjBot({action:'discordEdit', channelId:p.discordChannelId, messageId:oldIds[i], content}); if(chunks[i]!==undefined) newIds.push(oldIds[i]); }
      catch(e){ if(String(e.message||'').includes('ไม่พบห้อง')) throw e; if(chunks[i]!==undefined){ const r=await callProjBot({action:'discordPost', channelId:p.discordChannelId, content}); newIds.push(r.messageId); } } }
    else if(chunks[i]!==undefined){ const r=await callProjBot({action:'discordPost', channelId:p.discordChannelId, content}); newIds.push(r.messageId); } }
  const id=post?post.id:('post_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  const first=(raw.split('\n').find(l=>l.trim())||'โพสต์').replace(/[*_`#>]/g,'').trim().slice(0,40);
  await saveProjectMerge(S.id, f=>{ const arr=_prEnsurePosts(f); let pp=arr.find(x=>x.id===id);
    if(!pp){ pp={id, title:first||'โพสต์', emoji:'📣', tplId:tplSel||'', postedAt:''}; arr.push(pp); }
    pp.text=raw; pp.msgIds=newIds; pp.updatedAt=new Date().toISOString(); if(!pp.postedAt) pp.postedAt=pp.updatedAt;
    if(arr[0]&&arr[0].id===pp.id){ f.discordMsgId=newIds[0]||''; f.discordMsgIds=newIds; f.postDraft=raw; }
    if(tplSel) f.postTplId=tplSel; });
  edPost=id; edText=null; audit('project.discord', p.name, (post?'อัปเดต':'โพสต์')+'ในห้องโปรเจกต์ ('+chunks.length+' ก้อน)');
  say('📣 '+(post?'อัปเดตโพสต์แล้ว':'โพสต์แล้ว')+(chunks.length>1?' ('+chunks.length+' ก้อน)':''),'success');
}

/* ── @ แท็กคนในแผน ── */
let AT=null;
function atList(q){ const ids=[...planIds()]; const m=mgrStaff(S.mgrId); if(m&&!ids.includes(m.id)) ids.push(m.id);
  q=String(q||'').toLowerCase(); return ids.map(staff).filter(Boolean).filter(s=>!q||String((s.nickname||'')+' '+(s.name||'')).toLowerCase().includes(q)).slice(0,10); }
function atRender(ta){ document.getElementById('pl-at')?.remove(); if(!AT||!AT.list.length) return;
  const rc=ta.getBoundingClientRect(); const d=document.createElement('div'); d.className='pl-at'; d.id='pl-at';
  d.style.left=(rc.left+12)+'px'; d.style.top=Math.max(8,Math.min(window.innerHeight-250,rc.top+40))+'px';
  d.innerHTML=AT.list.map((s,i)=>`<div class="${i===AT.i?'on':''}" onmousedown="event.preventDefault();NDP.atPick(${i})">${av(s.nickname||s.name)}${esc(s.nickname||s.name)}${s.discordId?'':' <small class="pl-mut">(ไม่มีดิส)</small>'}</div>`).join('');
  document.body.appendChild(d); }

/* ── ตัวเลือกโปรเจกต์ (ค้นชื่อ/รหัสได้) ── */
let pjOpen=false, pjQ='';
const pjLabel=p=>safe(()=>projDisp(p),p.name)||p.name||p.id;
const pjCode=p=>String(safe(()=>projCode(p),'')||'');
function projPicker(projs){ const cur=projs.find(p=>p.id===S.id)||S.src;
  const q=pjQ.trim().toLowerCase(), adm=isAdm();
  const hit=p=>!q||[pjLabel(p),pjCode(p),p.name,p.clientCode,adm?p.client:''].some(v=>String(v||'').toLowerCase().includes(q));
  const list=projs.filter(hit).sort((a,b)=>(a.projStatus==='cancelled')-(b.projStatus==='cancelled')||String(b.deadline||'').localeCompare(String(a.deadline||'')));
  const stLbl=p=>p.projStatus==='cancelled'?'<small class="pl-bad">ยกเลิก</small>':p.projStatus==='done'?'<small class="pl-ok">เสร็จแล้ว</small>':(p.deadline?`<small>🏁 ${fd(dOnly(p.deadline))}</small>`:'');
  return `<div style="position:relative;width:420px;max-width:100%" onclick="event.stopPropagation()">
    <div class="form-input form-select" style="cursor:pointer;display:flex;align-items:center;gap:8px" onclick="NDP.pjToggle()"><b style="color:var(--accent2)">${esc(pjCode(cur))}</b><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(cur.name&&cur.name!==pjCode(cur)?cur.name:'')}</span></div>
    ${pjOpen?`<div class="pl-dd" style="width:100%;max-height:380px">
      <input class="form-input" id="pl-pjq" style="padding:6px 9px;margin-bottom:5px" placeholder="🔍 ค้นชื่อเรื่อง หรือรหัส (เช่น M06)${adm?' / ลูกค้า':''}" value="${esc(pjQ)}" oninput="NDP.pjQ(this.value)" onkeydown="if(event.key==='Enter'){const f=document.querySelector('#nd-plan-body .pl-dd .op');if(f)f.click();}else if(event.key==='Escape')NDP.pjToggle()">
      ${list.slice(0,80).map(p=>`<div class="op" style="${p.id===S.id?'background:rgba(21,101,255,.16)':''}" onclick="NDP.proj('${esc(p.id)}')"><b style="color:var(--accent2);min-width:44px">${esc(pjCode(p))}</b><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name&&p.name!==pjCode(p)?p.name:'')}</span>${stLbl(p)}</div>`).join('')||'<div class="pl-mut" style="padding:8px">ไม่พบงาน</div>'}
      ${list.length>80?`<div class="pl-mut" style="padding:6px">แสดง 80 จาก ${list.length} งาน — พิมพ์ค้นให้แคบลง</div>`:''}</div>`:''}</div>`; }

/* ── วาดหน้า ── */
function render(){ const pg=$('nd-plan-body'); if(!pg) return;
  if(!['admin','manager'].includes(role())){ pg.innerHTML='<div class="pl-mut" style="padding:40px;text-align:center">🔒 สำหรับแอดมิน/เมเนเจอร์</div>'; return; }
  const projs=myProjects(); if(!S || !projs.find(p=>p.id===S.id)) loadProject(projs[0]&&projs[0].id);
  if(!S){ pg.innerHTML='<div class="pl-mut" style="padding:40px;text-align:center">ยังไม่มีโปรเจกต์ — สร้างที่หน้า 📋 มอบหมายงาน ก่อน</div>'; return; }
  const ae=document.activeElement, keepEd=ae&&ae.id==='pl-ed', selS=keepEd?ae.selectionStart:0, selE=keepEd?ae.selectionEnd:0;
  const y=window.scrollY, mc=$('main-content'), my=mc?mc.scrollTop:0;
  pg.innerHTML=`<div class="pl-top">${projPicker(projs)}
     ${dirty?'<span class="pl-dirty">● มีการแก้ไขที่ยังไม่บันทึก</span>':''}<span style="flex:1"></span><button class="btn btn-outline" onclick="NDP.save()">💾 บันทึก</button><button class="btn btn-green" onclick="NDP.saveSend()">✅ บันทึกโปรเจกต์ + ส่งให้ทีม</button></div>
   <div class="pl-grid"><div>${leftHTML()}</div><div class="pl-right">${rightHTML()}</div></div>${driveHTML()}${dcHTML()}`;
  window.scrollTo(0,y); if(mc) mc.scrollTop=my;
  if(dd){ const q=$('pl-ddq'); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length); } }
  else if(pjOpen){ const q=$('pl-pjq'); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length); } }
  else if(ae&&ae.id==='pl-pkq'){ const q=$('pl-pkq'); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length); } }
  if(keepEd){ const t=$('pl-ed'); if(t){ t.focus(); t.setSelectionRange(selS,selE); } }
}
const rr=()=>{ dirty=true; render(); };
const rt=()=>{ S.rolesT=true; rr(); };
const unfixRole=k=>S.roles[k].slots.forEach(s=>{ delete s.fix; });

/* ── 💲 เทมเพลตราคา (misc/pricetpl = {รหัส:{name, adp, dub:[…], mix, qc, sub, trn}}) ── */
function codesInSystem(){ const m={}; (safe(()=>getProjects(),[])||[]).forEach(p=>{ const c=String(p&&p.clientCode||'').trim().toUpperCase(); if(c && !m[c]) m[c]=p.client||''; }); return m; }
const blankTpl=()=>({name:'',adp:{rate:0,unit:'นาที'},dub:[{rate:0,unit:'นาที'}],mix:{rate:0,unit:'นาที'},qc:{rate:0,unit:'เหมา'},sub:{rate:0,unit:'นาที'},trn:{rate:0,unit:'นาที'}});
async function loadPrice(){ const v=await safe(()=>fbLoadKeyed('pricetpl'),null); PRICE=(v&&typeof v==='object')?v:(safe(()=>ls('pricetpl'),null)||{}); }
function priceRender(){ const pg=$('nd-price-body'); if(!pg) return; const adm=isAdm(), sys=codesInSystem();
  if(!['admin','manager'].includes(role())){ pg.innerHTML='<div class="pl-mut" style="padding:40px;text-align:center">🔒 สำหรับแอดมิน</div>'; return; }
  const keys=Object.keys(PRICE).sort();
  if(!pcNew && !PRICE[pcSel]){ pcSel=keys[0]||''; WK=null; }
  if(!WK && pcSel && PRICE[pcSel]) WK=JSON.parse(JSON.stringify({...blankTpl(),...PRICE[pcSel]}));
  const dis=adm?'':'disabled';
  const unitSel=(v,fn)=>`<select class="form-input form-select" ${dis} onchange="${fn}">${UNITS.map(u=>`<option${u===v?' selected':''}>${u}</option>`).join('')}</select>`;
  const one=k=>`<span class="t"><input class="form-input" type="number" step="any" value="${WK[k].rate}" ${dis} onchange="NDP.pr('${k}','rate',+this.value||0)">฿ /${k==='adp'?' นาทีที่ทำจริง':' '+unitSel(WK[k].unit,`NDP.pr('${k}','unit',this.value)`)}</span>`;
  pg.innerHTML=`<div class="pl-card"><div class="pl-cb">
    <div class="pl-f" style="grid-template-columns:minmax(220px,320px) minmax(220px,320px) auto;align-items:end;margin-bottom:12px">
     <div><label class="pl-l">📂 เลือกเทมเพลต</label><select class="form-input form-select" onchange="NDP.pc(this.value)">${keys.map(k=>`<option value="${esc(k)}"${k===pcSel&&!pcNew?' selected':''}>${esc(k)}${PRICE[k].name&&adm?' · '+esc(PRICE[k].name):''}</option>`).join('')}${pcNew?`<option selected>${esc(pcSel)} (ใหม่ · ยังไม่บันทึก)</option>`:''}${!keys.length&&!pcNew?'<option>— ยังไม่มีเทมเพลต —</option>':''}</select></div>
     ${adm?`<div><label class="pl-l">＋ เพิ่มเทมเพลตจากรหัสในระบบ</label><select class="form-input form-select" onchange="NDP.pcAdd(this.value);this.value=''"><option value="">— เลือกรหัส · ลูกค้า —</option>${Object.entries(sys).sort().map(([k,n])=>`<option value="${esc(k)}">${esc(k)} · ${esc(n)}${PRICE[k]?' (มีแล้ว)':''}</option>`).join('')}<option value="__type">⌨️ พิมพ์รหัสเอง…</option></select></div>`:'<span></span>'}
     <span class="pl-mut">${WK&&pcNew?'ราคาเริ่มต้นคัดจากเทมเพลตที่เปิดอยู่':''}</span></div>
    ${!WK?'<div class="pl-mut" style="padding:20px 0">ยังไม่มีเทมเพลต'+(adm?' — เลือกรหัสจากดร็อปดาวน์ "เพิ่มเทมเพลต"':'')+'</div>':ORDER.map(k=>`<div class="pl-trow" style="--c:${R[k][2]}"><div style="display:flex;align-items:center;gap:8px;font-weight:600"><span class="pl-ic">${R[k][1]}</span>${R[k][0]}</div><div class="pl-tx">
      ${k==='dub'?WK.dub.map((t,j)=>`<span class="t"><b style="color:var(--orange)">พากย์${j+1}</b><input class="form-input" type="number" step="any" value="${t.rate}" ${dis} onchange="NDP.prd(${j},'rate',+this.value||0)">฿ / ${unitSel(t.unit,`NDP.prd(${j},'unit',this.value)`)}${adm&&j===WK.dub.length-1&&j>0?` <a style="cursor:pointer;opacity:.6" onclick="NDP.prd(${j},'del')">✕</a>`:''}</span>`).join('')+(adm?`<button class="btn btn-outline btn-sm" onclick="NDP.prd(-1,'add')">＋ พากย์${WK.dub.length+1}</button>`:''):one(k)}
      <span class="pl-mut">${k==='adp'?'คูณนาทีที่แต่ละคนทำ':k==='dub'?'ได้เบอร์เดียวกันได้เท่ากัน':'ต่อคน'}</span></div></div>`).join('')}
    ${WK?`<div class="pl-mut" style="margin-top:8px">🧾 ทุกราคาเป็นยอดก่อนหัก ณ ที่จ่าย (งานใหม่หัก 3% เป็นค่าเริ่มต้น · แก้ได้ต่องาน)</div>`:''}
    ${adm&&WK?`<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-green" onclick="NDP.pcSave('over')">💾 ${pcNew?'บันทึกเทมเพลต '+esc(pcSel):'บันทึกทับ '+esc(pcSel)}</button><button class="btn btn-outline" onclick="NDP.pcSave('new')">📄 บันทึกเป็นเทมเพลตใหม่…</button><span style="flex:1"></span>${!pcNew?`<button class="btn btn-outline btn-sm" style="color:var(--red);border-color:rgba(255,64,64,.35)" onclick="NDP.pcDel()">🗑️ ลบเทมเพลต ${esc(pcSel)}</button>`:''}</div>`:(!adm?'<div class="pl-mut" style="margin-top:10px">🔒 แก้ได้เฉพาะแอดมิน</div>':'')}
   </div></div>`; }
function pickCodeDialog(title, cb){ const sys=codesInSystem();
  safe(()=>_tagOverlayShow(title, `<div class="pl-l">เลือกรหัสลูกค้าในระบบ หรือพิมพ์รหัสใหม่</div>
    <input class="form-input" id="pl-newcode" list="pl-codes" placeholder="เช่น M, G, H" style="text-transform:uppercase">
    <datalist id="pl-codes">${Object.entries(sys).map(([k,n])=>`<option value="${esc(k)}">${esc(k)} · ${esc(n)}${PRICE[k]?' (มีแล้ว)':''}</option>`).join('')}</datalist>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-green" style="flex:1" id="pl-newcode-ok">ตกลง</button><button class="btn btn-outline" onclick="document.getElementById('tag-overlay')?.remove()">ยกเลิก</button></div>`, 420));
  setTimeout(()=>{ const i=$('pl-newcode'), b=$('pl-newcode-ok'); if(i) i.focus(); if(b) b.onclick=()=>{ const v=String(i.value||'').trim().toUpperCase(); if(!v){ say('ใส่รหัสก่อน','warn'); return; } document.getElementById('tag-overlay')?.remove(); cb(v); }; },50); }

/* ── ตัวสั่งงาน ── */
const NDP=window.NDP={
  pjToggle(){ pjOpen=!pjOpen; pjQ=''; render(); }, pjQ(v){ pjQ=v; render(); },
  proj(id){ pjOpen=false; pjQ=''; if(S&&id===S.id){ render(); return; } if(dirty && !confirm('มีการแก้ไขที่ยังไม่บันทึก — ทิ้งการแก้ไขแล้วเปลี่ยนงาน?')){ render(); return; } loadProject(id); render(); },
  set(k,v){ S[k]=v; S.t[k]=1; if(k==='code') DR.tpl=''; if(k==='minutes'){ S.rolesT=true; ORDER.forEach(x=>S.roles[x].slots.forEach(s=>{ delete s.fix; })); } rr(); }, info(){ infoOpen=!infoOpen; render(); },
  ded(j,k,v){ S.dedT=true; if(k==='add') S.ded.push({label:'หักเพิ่ม',pct:2,on:true}); else if(k==='del') S.ded.splice(j,1); else S.ded[j][k]=v; rr(); },
  tog(k){ const r=S.roles[k];
    if(r.on && r.slots.some(s=>s.paid) && !confirm('หน้าที่นี้มีคนที่จ่ายเงินแล้ว — ปิดหน้าที่นี้จะเอาคนออกจากงานตอนบันทึก ยืนยัน?')) return;
    r.on=!r.on; if(r.on){ openA=ORDER.indexOf(k); pkRole=k; NDP.std(k,null,true); if(!r.start) r.start=S.start; if(!r.end) r.end=S.deadline; if(!r.stime) r.stime='10:00'; if(!r.etime) r.etime='18:00'; } rt(); },
  open(i){ openA=openA===i?-1:i; if(i>=0) pkRole=ORDER[i]; render(); },
  stt(k){ const r=S.roles[k], i=ST.findIndex(x=>x[0]===r.st); r.st=ST[(i+1)%ST.length][0]; rt(); },
  r(k,f,v){ S.roles[k][f]=v; if(['rate','unit','qty'].includes(f)) unfixRole(k); rt(); },
  s(k,j,f,v){ const s=S.roles[k].slots[j]; s[f]=v; if(f==='min'||f==='tier'){ delete s.fix; if(f==='tier') delete s.cu; } rt(); },
  tier(j,f,v){ const r=S.roles.dub; if(f==='add') r.tiers.push({rate:0,unit:'นาที',qty:0}); else if(f==='del') r.tiers.splice(j,1); else { r.tiers[j][f]=v; r.tiers[j].blank=false; r.slots.forEach(s=>{ if((s.tier||1)===j+1&&!s.cu) delete s.fix; }); } rt(); },
  unCu(k,j){ const s=S.roles[k].slots[j]; if(!confirm('ให้ '+s.n+' ใช้เรทของหน้าที่แทนเรทเฉพาะตัว?')) return; delete s.cu; delete s.fix; rt(); },
  unFix(k,j){ const r=S.roles[k], s=r.slots[j]; if(!confirm('คิดยอดของ '+s.n+' ใหม่ตามสูตร: '+B(s.fix)+' → '+B(calc(r,s))+' ?')) return; delete s.fix; rt(); },
  // ↺ ใช้ราคามาตรฐานของรหัสนี้ · silent = ตอนเพิ่งเปิดหน้าที่ ใส่ให้เฉพาะช่องที่ยังเป็น 0
  std(k,j,silent){ const st=STD(); if(!st) return; const r=S.roles[k];
    if(k==='dub'){ (st.dub||[]).forEach((t,i)=>{ if(j!=null&&i!==j) return; const cur=r.tiers[i]; if(silent&&cur&&+cur.rate) return; if(!cur) r.tiers.push({rate:+t.rate||0,unit:t.unit||'นาที',qty:0}); else { cur.rate=+t.rate||0; cur.unit=t.unit||cur.unit; } }); }
    else if(st[k]){ if(silent&&+r.rate) return; r.rate=+st[k].rate||0; if(k!=='adp') r.unit=st[k].unit||r.unit; }
    if(k==='dub') r.tiers.forEach(t=>{ t.blank=false; });
    if(!silent){ unfixRole(k); rt(); } },
  cnt(k,d){ const r=S.roles[k]; if(d>0) r.slots.push(k==='adp'?{n:'',ep:'',min:0}:k==='dub'?{n:'',tier:r.tiers.length}:{n:''});
    else if(r.slots.length>1){ const i=r.slots.map(s=>!s.id).lastIndexOf(true); if(i<0 && !confirm('ทุกช่องมีคนแล้ว — เอาคนสุดท้ายออก?')) return; r.slots.splice(i>=0?i:r.slots.length-1,1); } rt(); },
  rm(k,j){ const r=S.roles[k], s=r.slots[j]; if(s.paid && !confirm(s.n+' จ่ายเงินแล้วในงานนี้ — เอาออก?')) return; r.slots.splice(j,1); if(!r.slots.length) r.slots.push(k==='adp'?{n:'',ep:'',min:0}:k==='dub'?{n:'',tier:1}:{n:''}); rt(); },
  dd(k,j){ dd=(dd&&dd.k===k&&dd.j===j)?null:{k,j}; ddQ=''; render(); }, ddq(v){ ddQ=v; render(); },
  pick(k,j,id){ const r=S.roles[k], s=r.slots[j]; if(id&&r.slots.some((x,i)=>i!==j&&x.id===id)){ say(nickOf(id)+' อยู่ในหน้าที่นี้แล้ว','warn'); return; }
    if(s.id!==id){ s.slot=undefined; s.paid=false; delete s.fix; delete s.cu; } s.id=id||undefined; s.n=id?nickOf(id):''; dd=null; rt(); },
  pk(k){ pkRole=k; render(); }, pkAll(v){ pkAll=v; render(); }, pkQ(v){ pkQ=v; render(); },
  fromQ(id){ const k=pkRole, r=S.roles[k], n=nickOf(id); if(r.slots.some(s=>s.id===id)) return; if(!r.on) NDP.tog(k);
    const e=r.slots.find(s=>!s.id); if(e){ e.n=n; e.id=id; } else r.slots.push(k==='adp'?{n,id,ep:'',min:0}:k==='dub'?{n,id,tier:r.tiers.length}:{n,id}); openA=ORDER.indexOf(k); rt(); },
  async save(){ await save(); },
  async saveSend(){ if(!await save(true)) return;
    S.src=fresh();
    if(!S.src.discordChannelId){ say('💾 บันทึกแล้ว — งานนี้ยังไม่มีห้อง Discord สร้างห้องด้านล่างเพื่อส่งบรีฟให้ทีม','info'); $('pl-dccat')?.scrollIntoView({behavior:'smooth',block:'center'}); return; }
    syncRoom(); const ids=Object.keys(DC.room), add=ids.filter(id=>DC.room[id]==='add').length, rm=ids.filter(id=>DC.room[id]==='rm').length;
    const cur=posts().find(x=>x.id===edPost), posted=cur&&cur.msgIds&&cur.msgIds.length;
    if(!confirm('💾 บันทึกแล้ว — ส่งให้ทีมต่อ:\n• อัปเดตสิทธิ์ห้อง (ดึงเข้า '+add+' · เอาออก '+rm+')\n• '+(posted?'อัปเดตโพสต์ "'+(cur.title||'')+'"':'โพสต์ข้อความในกล่องลงห้อง')+'\n\nยืนยัน?')){ render(); return; }
    await NDP.dcSync(); await NDP.send(posted?'update':'new', true); },
  // 💬 Discord
  dc(id){ const s=DC.room[id];
    if(s==='rm'){ DC.room[id]='in'; DC.keep[id]=1; }
    else if(s==='in'){ DC.room[id]='rm'; DC.keep[id]=0; } render(); },
  dcCat(v){ DC.cat=v; }, dcPriv(v){ DC.priv=v; },
  async dcSync(){ const p=fresh(); if(!p||!p.discordChannelId) return;
    syncRoom(); const ms=mgrStaff(p.managerId), add=[], rm=[], skip=[];
    Object.entries(DC.room).forEach(([id,st])=>{ const s=staff(id); if(st==='in') return; if(!s||!s.discordId){ if(st==='add') skip.push(s?(s.nickname||s.name):id); else delete DC.room[id]; return; } (st==='add'?add:rm).push(s); });
    busy(true); let fail=0;
    try{
      for(const s of add){ const r=await dcAllow(s, p, false); fail+=r.fail; if(!r.fail) DC.room[s.id]='in'; }
      for(const s of rm){ let f2=0; for(const [ch] of dcTargets(p)){ if(!ch) continue; try{ await callProjBot({action:'discordRemoveMember', channelId:ch, userId:s.discordId}); }catch(e){ fail++; f2++; } } if(!f2){ delete DC.room[s.id]; delete DC.keep[s.id]; } }
      if(ms&&ms.discordId) await dcAllow(ms, p, true);
      const members=Object.keys(DC.room).filter(id=>DC.room[id]==='in'||DC.room[id]==='rm');
      await saveProjectMerge(S.id, f=>{ f.discordRoomMembers=members; });
      S.src=fresh();
      audit('project.discord', p.name, 'อัปเดตสิทธิ์ห้อง: เข้า '+add.length+' ออก '+rm.length);
      say('👥 อัปเดตสิทธิ์ห้องแล้ว · เข้า '+add.length+' · ออก '+rm.length+(fail?' · พลาด '+fail:'')+(skip.length?' · ยังไม่ผูกดิส: '+skip.join(', '):''), fail||skip.length?'warn':'success');
    }catch(e){ say('อัปเดตสิทธิ์ไม่สำเร็จ: '+e.message,'error'); }
    finally{ busy(false); render(); } },
  async dcRO(){ const p=fresh(); if(!p.discordChannelId) return; const ms=mgrStaff(p.managerId);
    if(!confirm('ตั้งห้อง #'+(p.discordChannelName||'project')+' ให้ทีมอ่านอย่างเดียว?\nพิมพ์ได้เฉพาะแอดมินเซิร์ฟเวอร์ · เมเนเจอร์'+(ms?' ('+(ms.nickname||ms.name)+')':'')+' · บอท')) return;
    busy(true); try{ await callProjBot({action:'discordMakeReadOnly', channelId:p.discordChannelId, keepUserIds:(ms&&ms.discordId)?[ms.discordId]:[]});
      await saveProjectMerge(S.id, f=>{ f.discordReadOnly=true; }); S.src=fresh(); say('🔒 ตั้งห้องให้ทีมอ่านอย่างเดียวแล้ว','success'); }
    catch(e){ say(/ไม่รู้จักคำสั่ง/.test(e.message)?'บอทยังเป็นเวอร์ชันเก่า — Deploy worker.js ล่าสุดก่อน':'ไม่สำเร็จ: '+e.message,'error'); } finally{ busy(false); render(); } },
  async dcCreate(){ const cat=String(DC.cat!=null?DC.cat:($('pl-dccat')||{}).value||'').trim(); if(!cat){ say('ตั้งชื่อหมวดหมู่ก่อน','error'); return; }
    if(!planIds().length && !confirm('ยังไม่มีคนในแผน — สร้างห้องเปล่าไว้ก่อน?')) return;
    const txt=($('pl-ed')||{}).value||edText;
    if(dirty && !await save(true)) return;
    const priv=DC.priv!==false; busy(true);
    try{
      const c1=await callProjBot({action:'discordCreateChannel', categoryName:cat, channelName:'📁│project', readOnly:true, ...(priv?{private:true}:{})});
      let c2=null; try{ c2=await callProjBot({action:'discordCreateChannel', categoryName:cat, channelName:'🎙│พูดคุย', ...(priv?{private:true}:{})}); }catch(e){ say('⚠️ ห้องพูดคุยสร้างไม่สำเร็จ: '+e.message,'warn'); }
      await saveProjectMerge(S.id, f=>{ f.discordCategoryName=cat; f.discordCategoryId=c1.categoryId||''; f.discordChannelId=c1.channelId; f.discordChannelName=c1.channelName||'📁│project'; f.discordPrivate=priv; f.discordReadOnly=true; if(c2) f.discordTalkId=c2.channelId; f.discordRoomMembers=[]; });
      S.src=fresh(); DC.room={}; DC.keep={}; planIds().forEach(id=>DC.room[id]='add');
      audit('project.discord', cat, 'สร้างหมวด+ห้องโปรเจกต์จากหน้าวางแผนงาน');
      say('🏗️ สร้างห้องแล้ว — กำลังดึงทีมและโพสต์บรีฟ…','success');
      busy(false); await NDP.dcSync();
      if(String(txt||'').trim()){ busy(true); try{ await postText(txt,'new'); }finally{ busy(false); } }
    }catch(e){ say(/ไม่รู้จักคำสั่ง/.test(e.message)?'Worker ของบอทยังเป็นเวอร์ชันเก่า — Deploy worker.js ล่าสุดก่อน':'สร้างห้องไม่สำเร็จ: '+e.message,'error'); }
    finally{ busy(false); S.src=fresh(); render(); } },
  dcLink(){ if(dirty){ say('บันทึกแผนก่อน แล้วค่อยผูกห้อง','warn'); return; } safe(()=>prLinkExisting(S.id)); },
  post(id){ const cur=($('pl-ed')||{}).value; if(cur!=null && cur!==edDefault() && !confirm('ทิ้งข้อความที่แก้ในกล่อง?')){ render(); return; } edPost=id; edText=null; render(); },
  tpl(id){ if(!id) return; const cur=($('pl-ed')||{}).value||''; if(cur.trim() && cur!==edDefault() && !confirm('แทนที่ข้อความในกล่องด้วยเทมเพลตนี้?')){ render(); return; } tplSel=id; edText=tplFill(tpls().find(t=>t.id===id)); render(); },
  async saveTpl(){ const txt=String(($('pl-ed')||{}).value||'').trim(); if(!txt){ say('กล่องข้อความว่าง','warn'); return; }
    const list=tpls(), cur=list.find(t=>t.id===tplSel);
    let mode='new'; if(cur && isAdm()) mode=confirm('บันทึกทับเทมเพลต "'+cur.name+'"?\n\nOK = บันทึกทับ · Cancel = บันทึกเป็นเทมเพลตใหม่')?'over':'new';
    if(mode==='over'){ cur.text=txt; } else { const nm=prompt('ตั้งชื่อเทมเพลตใหม่:',''); if(!nm||!nm.trim()) return; const id='tpl_'+Date.now().toString(36); list.push({id,name:nm.trim(),text:txt}); tplSel=id; }
    await savePostTpls(list); say('💾 บันทึกเทมเพลตแล้ว (ข้อความที่เติมชื่อ/วันไว้แล้วจะเก็บตามที่เห็น)','success'); render(); },
  ed(ta){ edText=ta.value; const pos=ta.selectionStart, m=ta.value.slice(0,pos).match(/@([^\s@<>]{0,20})$/);
    if(m){ AT={start:pos-m[0].length, end:pos, list:atList(m[1]), i:0}; atRender(ta); } else NDP.atClose(); },
  edKey(e){ if(!AT||!AT.list.length) return; if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); AT.i=(AT.i+(e.key==='ArrowDown'?1:-1)+AT.list.length)%AT.list.length; atRender(e.target); } else if(e.key==='Enter'||e.key==='Tab'){ e.preventDefault(); NDP.atPick(AT.i); } else if(e.key==='Escape') NDP.atClose(); },
  atPick(i){ const ta=$('pl-ed'); if(!ta||!AT) return; const s=AT.list[i]; if(!s) return; const tag=(s.discordId?'<@'+s.discordId+'>':'@'+(s.nickname||s.name))+' ';
    ta.value=ta.value.slice(0,AT.start)+tag+ta.value.slice(AT.end); const p=AT.start+tag.length; edText=ta.value; NDP.atClose(); ta.focus(); ta.setSelectionRange(p,p); },
  atClose(){ AT=null; document.getElementById('pl-at')?.remove(); },
  async send(mode, noConfirm){ const txt=($('pl-ed')||{}).value||edText;
    if(dirty && !await save(true)) return;
    if(!noConfirm && mode==='new' && !confirm('โพสต์ข้อความนี้ลงห้อง #'+(S.src.discordChannelName||'project')+' เป็นข้อความใหม่?')) return;
    busy(true); try{ await postText(txt, mode); S.src=fresh(); }
    catch(e){ say(String(e.message||'').includes('ไม่พบห้อง')?'⚠️ ห้องนี้ถูกลบไปแล้วใน Discord — กด "🔗 ผูกห้องที่มีอยู่แล้ว" หรือสร้างห้องใหม่':'โพสต์ไม่สำเร็จ: '+e.message,'error'); }
    finally{ busy(false); render(); } },
  // 📂 Drive
  drRoot(id){ if(!id){ DR.cur=''; DR.path=[]; render(); return; } const x=id==='root'?{id:'root',name:'ไดรฟ์ของฉัน'}:drParents().find(p=>p.id===id); if(!x) return; DR.path=[{id:x.id,name:x.name}]; DR.cur=x.id; drList(x.id); },
  drIn(i){ const f=(DR.folders||[])[i]; if(!f) return; DR.path.push({id:f.id,name:f.name}); DR.cur=f.id; drList(f.id); },
  drUp(i){ DR.path=DR.path.slice(0,i+1); DR.cur=DR.path[i].id; drList(DR.cur); },
  async drNew(){ const nm=prompt('ชื่อโฟลเดอร์ใหม่ (สร้างใน "'+((DR.path[DR.path.length-1]||{}).name||'')+'"):'); if(!nm||!nm.trim()) return;
    busy(true); try{ const d=await callDrive({action:'create', parentId:DR.cur, name:nm.trim()}); DR.path.push({id:d.id,name:d.name||nm.trim()}); DR.cur=d.id; say('📁 สร้างโฟลเดอร์แล้ว','success'); busy(false); drList(d.id); }
    catch(e){ say('สร้างไม่ได้: '+e.message,'error'); } finally{ busy(false); } },
  async drLink(){ const x=DR.path[DR.path.length-1]; if(!x||x.id==='root') return; if(!confirm('ใช้โฟลเดอร์ "'+x.name+'" เป็นโฟลเดอร์งานของโปรเจกต์นี้?')) return;
    const link='https://drive.google.com/drive/folders/'+x.id;
    await saveProjectMerge(S.id, f=>{ f.driveFolderId=x.id; f.driveFolderLink=link; f.driveFolderName=x.name; if(!f.downloadLink) f.downloadLink=link; });
    S.src=fresh(); if(!S.link) S.link=S.src.downloadLink||''; say('🔗 ผูกโฟลเดอร์แล้ว','success');
    if(planIds().length && confirm('เพิ่มสิทธิ์ให้คนในแผนเลยไหม? (เงียบ ๆ ไม่แจ้งเตือน)')){ busy(true); try{ await drShare(x.id); S.src=fresh(); }finally{ busy(false); } } render(); },
  drTpl(v){ DR.tpl=v; DR.editText=null; render(); }, drName(v){ DR.name=v; render(); },
  drEdit(){ DR.edit=!DR.edit; DR.editText=null; render(); }, drEditTxt(v){ DR.editText=v; },
  async drSaveTpl(mode){ const txt=String(DR.editText!=null?DR.editText:drTplText()).split('\n').map(l=>l.replace(/\s+$/,'')).filter(l=>l.trim()).join('\n');
    const c=drCfg(), key=drTplKey();
    if(mode==='over'){ if(!confirm('บันทึกทับ "'+((drTplOptions().find(o=>o[0]===key)||[])[1]||'')+'"?')) return; if(key.startsWith('code:')){ c.tplByCode=c.tplByCode||{}; c.tplByCode[key.slice(5)]=txt; } else c.tpl=txt; }
    else { const code=PCODE(); if(!code){ say('งานนี้ยังไม่มีรหัสงาน','warn'); return; } c.tplByCode=c.tplByCode||{}; if(c.tplByCode[code]!=null && !confirm('มีเทมเพลตรหัส '+code+' อยู่แล้ว — บันทึกทับ?')) return; c.tplByCode[code]=txt; DR.tpl='code:'+code; }
    await saveDriveCfg(c); DR.edit=false; DR.editText=null; say('💾 บันทึกเทมเพลตโฟลเดอร์แล้ว','success'); render(); },
  async drCreate(){ const parent=DR.cur; if(!parent||parent==='root'){ say('เลือกที่วางก่อน','warn'); return; }
    const name=drFolderName(); if(!name){ say('ตั้งชื่อโฟลเดอร์ก่อน','error'); return; }
    const items=drItems();
    if(!confirm('สร้างโฟลเดอร์ "'+name+'" ใน "'+(DR.path[DR.path.length-1]||{}).name+'" + โฟลเดอร์ย่อย '+items.length+' โฟลเดอร์?')) return;
    busy(true);
    try{ const root=await callDrive({action:'create', parentId:parent, name});
      if(items.length) await callDrive({action:'tree', parentId:root.id, items});
      await saveProjectMerge(S.id, f=>{ f.driveFolderId=root.id; f.driveFolderLink=root.link||''; f.driveFolderName=root.name||name; if(!f.downloadLink) f.downloadLink=root.link||''; });
      S.src=fresh(); if(!S.link) S.link=S.src.downloadLink||'';
      audit('project.drive', S.name, 'สร้างโฟลเดอร์งานจากหน้าวางแผนงาน ('+items.length+' โฟลเดอร์)');
      say('📂 สร้างโฟลเดอร์ "'+name+'" แล้ว','success');
      if(planIds().length){ await drShare(root.id, true); S.src=fresh(); }
    }catch(e){ say('สร้างไม่สำเร็จ: '+e.message,'error'); }
    finally{ busy(false); render(); } },
  async drScript(){ const p=fresh(), tid=drCfg().scriptTplId; if(!p.driveFolderId){ say('สร้าง/ผูกโฟลเดอร์งานก่อน','warn'); return; } if(!tid){ say('ยังไม่ได้ตั้งไฟล์บทต้นฉบับ — ตั้งได้ที่ 🔧 ตั้งค่า Drive','warn'); return; }
    let name='Script/CV_'+drCode(); if(p.scriptLink){ const nm=prompt('ชื่อไฟล์บทใหม่:', name+' (2)'); if(!nm||!nm.trim()) return; name=nm.trim(); }
    busy(true); try{ const d=await callDrive({action:'copy', fileId:tid, destId:p.driveFolderId, name});
      if(!p.scriptLink) await saveProjectMerge(S.id, f=>{ f.scriptLink=d.link||''; f.scriptName=d.name||name; });
      S.src=fresh(); audit('project.drive', S.name, 'สร้างไฟล์บท '+name); say('📄 สร้างไฟล์บท '+name+' แล้ว','success'); if(d.link) window.open(d.link,'_blank'); }
    catch(e){ say('สร้างไฟล์บทไม่ได้: '+e.message,'error'); } finally{ busy(false); render(); } },
  async drInside(){ const id=S.src.driveFolderId; DR.cur=id; busy(true); try{ const d=await callDrive({action:'list', parentId:id}); DR.folders=d.folders||[]; }catch(e){ say('โหลดไม่ได้: '+e.message,'error'); } finally{ busy(false); render(); } },
  async drUnlink(){ if(!confirm('เลิกผูกโฟลเดอร์นี้กับโปรเจกต์? (โฟลเดอร์ในไดรฟ์ไม่ถูกลบ)')) return;
    await saveProjectMerge(S.id, f=>{ delete f.driveFolderId; delete f.driveFolderLink; delete f.driveFolderName; }); S.src=fresh(); DR=DR0(); render(); },
  async drShare(){ busy(true); try{ await drShare(S.src.driveFolderId); S.src=fresh(); }finally{ busy(false); render(); } },
  // 💲 เทมเพลตราคา
  pc(k){ if(pcNew && !confirm('ทิ้งเทมเพลตใหม่ที่ยังไม่บันทึก?')){ priceRender(); return; } pcSel=k; pcNew=false; WK=null; priceRender(); },
  pcAdd(k){ if(!k) return; const go=c=>{ if(PRICE[c]){ say('รหัส '+c+' มีเทมเพลตอยู่แล้ว — เปิดให้แก้','info'); pcSel=c; pcNew=false; WK=null; priceRender(); return; }
      WK=JSON.parse(JSON.stringify(WK||blankTpl())); WK.name=codesInSystem()[c]||''; pcSel=c; pcNew=true; priceRender(); };
    if(k==='__type') pickCodeDialog('＋ เทมเพลตราคารหัสใหม่', go); else go(k); },
  pr(k,f,v){ WK[k][f]=v; priceRender(); }, prd(j,f,v){ const d=WK.dub; if(f==='add') d.push({rate:0,unit:'นาที'}); else if(f==='del') d.splice(j,1); else d[j][f]=v; priceRender(); },
  async pcSave(mode){ if(!isAdm()||!WK) return;
    const write=async c=>{ PRICE[c]=JSON.parse(JSON.stringify(WK)); PRICE[c].name=codesInSystem()[c]||PRICE[c].name||''; await fbSaveKeyed('pricetpl', PRICE); pcSel=c; pcNew=false; WK=null; audit('price.tpl', c, 'บันทึกเทมเพลตราคา'); say('💾 บันทึกเทมเพลตราคา '+c+' แล้ว','success'); priceRender(); };
    if(mode==='over'){ if(!pcNew && !confirm('บันทึกทับเทมเพลต '+pcSel+'?')) return; await write(pcSel); }
    else pickCodeDialog('📄 บันทึกเป็นเทมเพลตใหม่', async c=>{ if(PRICE[c] && !confirm('มีเทมเพลตรหัส '+c+' อยู่แล้ว — บันทึกทับ?')) return; await write(c); }); },
  async pcDel(){ if(!confirm('ลบเทมเพลตราคา '+pcSel+'?')) return; delete PRICE[pcSel]; await fbSaveKeyed('pricetpl', PRICE); audit('price.tpl', pcSel, 'ลบเทมเพลตราคา'); pcSel=''; WK=null; priceRender(); },
};
document.addEventListener('click',()=>{ if(dd||pjOpen){ dd=null; pjOpen=false; render(); } });

/* ── ข้อมูลเปลี่ยนจากเครื่องอื่น → วาดใหม่ (เฉพาะตอนไม่ได้แก้ค้างอยู่) ── */
setInterval(()=>{ const pg=$('page-nd-plan'); if(!S||!pg||pg.classList.contains('hidden')||dirty||saving||dd||pjOpen) return;
  const ae=document.activeElement; if(ae&&pg.contains(ae)&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName)) return;
  const p=(safe(()=>getProjects(),[])||[]).find(x=>x.id===S.id); if(!p||p.updatedAt===S.src.updatedAt) return;
  const keep={openA, infoOpen, edPost, tplSel, DR, edText}; loadProject(S.id); ({openA, infoOpen, edPost, tplSel, DR, edText}=keep); render(); }, 4000);

/* ── สร้างหน้า ── */
function mk(id,title,sub,bodyId,onShow){ if($('page-'+id)) return; const d=document.createElement('div'); d.id='page-'+id; d.className='page hidden';
  d.innerHTML=`<div class="page-header"><div><div class="page-title">${title}</div><div class="page-subtitle">${sub}</div></div></div><div id="${bodyId}"></div>`;
  document.querySelector('.main-content')?.appendChild(d);
  new MutationObserver(()=>{ if(!d.classList.contains('hidden')) onShow(); }).observe(d,{attributes:true,attributeFilter:['class']}); }
// เปิดหน้าวางแผนงานพร้อมเลือกโปรเจกต์ (ใช้จากปุ่มในหน้าอื่น)
window.openPlanFor=function(id){ if(id){ if(dirty&&S&&S.id!==id&&!confirm('มีการแก้ไขที่ยังไม่บันทึก — ทิ้งแล้วเปิดงานนี้?')) return; if(!S||S.id!==id) loadProject(id); window._ndPlanPending=true; } safe(()=>nav('nd-plan')); };
function init(){ if(!document.querySelector('.main-content')) return;
  const st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
  mk('nd-plan','🗓️ วางแผนงาน','เวลา · คน · ราคา · ไฟล์ · ห้อง Discord ของโปรเจกต์ในหน้าเดียว','nd-plan-body',async()=>{ if(!window._ndPlanPending && !dirty) S=null; window._ndPlanPending=false; render(); await loadPrice(); render(); pullQueue(false); });
  mk('nd-price','💲 เทมเพลตราคา','ราคามาตรฐานต่อรหัสลูกค้า — หน้าวางแผนงานดึงไปใช้เป็นราคาเริ่มต้น','nd-price-body',async()=>{ await loadPrice(); WK=null; pcNew=false; priceRender(); });
  window.addEventListener('beforeunload',e=>{ if(dirty){ e.preventDefault(); e.returnValue=''; } });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,300)); else setTimeout(init,300);
})();
