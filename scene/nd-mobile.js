/* ═══════════════════════════════════════════════════════════════════
   📱 nd-mobile.js — โหมดมือถือ (เจ้าของอนุมัติหน้าตาแล้ว 15 พ.ย. 2569)
   - ขึ้นเองเมื่อจอกว้าง ≤ 760px หลังล็อกอิน · กด "เปิดเว็บแบบเต็ม" กลับไปหน้าเดิมได้ตลอด (จำแค่ในแท็บนี้)
   - ใช้ข้อมูล/ฟังก์ชันเดิมของเว็บทั้งหมด (getProjects, saveProjectMerge, _updateWorkerConfirm ฯลฯ) ไม่แยกข้อมูล
   - แอดมิน: ปฏิทิน · โปรเจกต์ · มอบหมาย · เอกสาร (+กระดิ่ง = รออนุมัติ)
   - เมเนเจอร์: ปฏิทิน · โปรเจกต์ (ที่ดูแล) · เงิน · ฉัน
   - ทีมงาน / พนักงานบริษัท: งาน · ปฏิทิน · เงิน · ฉัน (พนักงานบริษัทดูทั้งทีม + เลื่อนวันได้)
   - ปฏิทิน: แตะ = เปิดแก้ · กดค้าง 3 วิ = หยิบไปวางวันอื่น (ขยับนิ้วก่อนครบ = ไม่ย้าย)
   ═══════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const safe=(f,d)=>{ try{ const v=f(); return v==null?d:v; }catch(e){ return d; } };
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const A=s=>encodeURIComponent(String(s??''));   // ใส่ใน onclick="NDM.x('…')" อย่างปลอดภัย
const $=id=>document.getElementById(id);
const CU=()=>safe(()=>currentUser,null), DB=()=>safe(()=>_fbDatabase,null);
const role=()=>safe(()=>CU().role,'');
const isAdm=()=>role()==='admin', isMgr=()=>role()==='manager';
const isEmp=()=>{ const u=CU()||{}; if(u.emp===true) return true; const s=safe(()=>getStaffById(u.staffId),null); return !!(s&&s.employee); };
const canDates=()=>isAdm()||isMgr()||isEmp();
const toastM=(m,t)=>safe(()=>toast(m,t||'success'));
const B=n=>'฿'+Math.round(+n||0).toLocaleString();
const pad=n=>String(n).padStart(2,'0'), ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const pd=s=>{ const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return null; let y=+m[1]; if(y>2400) y-=543; return new Date(y,+m[2]-1,+m[3]); };
const dOnly=s=>{ const d=pd(s); return d?ymd(d):''; };
const addD=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; }, shift=(s,n)=>ymd(addD(pd(s),n));
const dd=(a,b)=>Math.round((pd(b)-pd(a))/864e5), TODAY=()=>ymd(new Date());
const TM=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'], WD=['อา','จ','อ','พ','พฤ','ศ','ส'];
const thD=s=>{ const d=pd(s); return d?d.getDate()+' '+TM[d.getMonth()]:'—'; };
const thDW=s=>{ const d=pd(s); return d?WD[d.getDay()]+'. '+d.getDate()+' '+TM[d.getMonth()]:'—'; };
const PH=[{k:'translation',s:'trn',name:'แปล',color:'#F9C6DB'},{k:'adaptation',s:'adp',name:'บท',color:'#FFC9BC'},{k:'dubbing',s:'dub',name:'พากย์',color:'#FFE2A8'},
          {k:'mix',s:'mix',name:'มิกซ์',color:'#CDEDC4'},{k:'qc',s:'qc',name:'QC',color:'#C2E2F7'},{k:'subVideo',s:'sub',name:'ซับ',color:'#DCD0F6'}];
const PHK=k=>PH.find(x=>x.k===k)||{name:k,color:'#ccc',s:''};
const pre=w=>String((w&&w.slot)||'').split('-')[0];
const nick=id=>{ const s=safe(()=>getStaffById(id),null); return s?(s.nickname||s.name||''):''; };
const projs=()=>(safe(()=>getProjects(),[])||[]).filter(p=>p&&p.id&&p.projStatus!=='cancelled');
const pDone=p=>p.projStatus==='done'||p.projStatus==='paid';
const code=p=>safe(()=>projCode(p),'')||p.clientCode||'';
const disp=p=>safe(()=>projDisp(p),p.name||'');
const mgrs=()=>safe(()=>getAllManagerUsers(),[])||[];
const mgrName=uid=>{ if(!uid) return '—'; if(uid===safe(()=>CU().uid,'')) return 'ฉัน'; const m=mgrs().find(x=>x.uid===uid); return m?(m.nickname||m.name||m.email||'—'):(nick(uid)||'—'); };
const dlTime=p=>{ const d=String(p.deadline||''); return p.deadlineTime||(d.includes('T')?d.slice(11,16):''); };

/* ── สถานะของโหมดมือถือ ── */
const S={tab:'', cur:(()=>{ const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })(), day:TODAY(), sheet:null, moving:null,
  pf:'all', calMode:'mine', asg:{mgr:''}, docSel:{}, ok:false};
let ROOT=null, built=false, hold=null, held=false, TT=null;
const OFFK='guin3_m_off';
const small=()=>safe(()=>matchMedia('(max-width: 760px)').matches,false)||/[?&]m=1/.test(location.search);
const off=()=>safe(()=>sessionStorage.getItem(OFFK)==='1',false);
const ready=()=>!!CU()&&!$('app-splash')&&$('app-layout')&&!$('app-layout').classList.contains('hidden');
const tabsOf=()=>isAdm()?[['cal','ปฏิทิน','cal'],['proj','โปรเจกต์','folder'],['assign','มอบหมาย','users'],['doc','เอกสาร','doc']]
  :isMgr()?[['cal','ปฏิทิน','cal'],['proj','โปรเจกต์','folder'],['money','เงิน','money'],['me','ฉัน','me']]
  :[['jobs','งาน','job'],['cal','ปฏิทิน','cal'],['money','เงิน','money'],['me','ฉัน','me']];

/* ── ไอคอน (เส้น) ── */
const IC={cal:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',doc:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  money:'<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/>',me:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  job:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',chev:'<path d="m9 18 6-6-6-6"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',check:'<path d="M20 6 9 17l-5-5"/>'};
const ic=(k,sz)=>`<svg width="${sz||22}" height="${sz||22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]||''}</svg>`;

/* ── CSS ── */
const CSS=`
#ndm{position:fixed;inset:0;z-index:950;background:#0b1424;color:#e8eef7;font-family:Kanit,system-ui,sans-serif;display:flex;flex-direction:column;overflow:hidden;-webkit-tap-highlight-color:transparent}
#ndm *{box-sizing:border-box}#ndm button{font-family:inherit;cursor:pointer;color:inherit}
#ndm .m-hd{display:flex;align-items:center;gap:12px;padding:calc(12px + env(safe-area-inset-top)) 16px 8px;flex-shrink:0}
#ndm .m-logo{width:40px;height:40px;border-radius:12px;background:#0487E2;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#fff;flex-shrink:0}
#ndm .m-sub{font-size:12px;color:#9fb0c6}#ndm .m-ttl{font-size:20px;font-weight:600;line-height:1.2}
#ndm .m-ib{position:relative;width:44px;height:44px;border-radius:12px;border:1px solid #22324a;background:#111d31;display:flex;align-items:center;justify-content:center;flex-shrink:0}
#ndm .m-badge{position:absolute;top:5px;right:5px;min-width:16px;height:16px;border-radius:8px;background:#ff5a5f;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px}
#ndm .m-body{flex:1;overflow-y:auto;padding:4px 14px 14px;display:flex;flex-direction:column;gap:14px;-webkit-overflow-scrolling:touch}
#ndm .m-tabs{flex-shrink:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #1a2840;background:#0d1729;padding-bottom:env(safe-area-inset-bottom)}
#ndm .m-tab{height:62px;border:0;background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:12px;color:#6d819c;position:relative}
#ndm .m-tab.on{color:#4fb3ff}
#ndm .m-card{background:#111d31;border:1px solid #1d2c44;border-radius:16px;padding:12px 14px}
#ndm .m-h2{font-size:16px;font-weight:600}#ndm .m-mut{font-size:12px;color:#9fb0c6}
#ndm .m-btn{height:44px;border-radius:12px;border:1px solid #2a3d5c;background:transparent;font-size:14px;padding:0 14px}
#ndm .m-pri{border:0;background:#0487E2;color:#fff!important;font-weight:600}
#ndm .m-ok{border:0;background:#1fae7f;color:#fff!important;font-weight:600}
#ndm .m-chip{height:38px;padding:0 14px;border-radius:19px;border:1px solid #2a3d5c;background:transparent;font-size:13px;color:#c9d6e8}
#ndm .m-chip.on{background:#0487E2;border-color:#0487E2;color:#fff}
#ndm .m-in{width:100%;height:46px;border-radius:10px;border:1px solid #2a3d5c;background:#0d1729;color:#e8eef7;font-family:inherit;font-size:16px;padding:0 12px;color-scheme:dark}
#ndm textarea.m-in{height:auto;padding:8px 12px;resize:none}
#ndm .m-lbl{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#9fb0c6}
#ndm .m-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#ndm .m-stat{background:#111d31;border:1px solid #1d2c44;border-radius:14px;padding:10px 12px}
#ndm .m-stat b{display:block;font-size:20px;font-weight:600}
#ndm .m-tag{font-size:11px;padding:2px 8px;border-radius:8px;white-space:nowrap}
#ndm .m-code{font-size:12px;font-weight:700;padding:2px 8px;border-radius:8px;background:#0f2e4d;color:#6cc0ff;white-space:nowrap}
#ndm .m-row{display:flex;align-items:center;gap:8px;min-width:0}
#ndm .m-ell{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* ปฏิทินเดือน */
#ndm .m-mon{display:flex;align-items:center;justify-content:center;gap:16px}
#ndm .m-mon b{font-size:21px}
#ndm .m-mon button{width:40px;height:40px;border:0;background:transparent;color:#6d819c;font-size:22px}
#ndm .m-dow{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));text-align:center;font-size:12.5px;color:#9fb0c6;border-bottom:2px solid #2a3547;padding-bottom:5px;margin:0 -8px}
#ndm .m-wk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-template-rows:28px 20px 20px 20px 14px;row-gap:2px;border-bottom:1px solid #222c3b;padding-top:3px;margin:0 -8px}
#ndm .m-dc{grid-row:1/span 5;margin:0 1px;border-radius:9px;border:2px solid transparent;background:transparent;padding:2px 0 0;display:flex;flex-direction:column;align-items:center}
#ndm .m-dc.sel{border-color:#3b82f6}
#ndm .m-dn{min-width:25px;height:23px;line-height:23px;border-radius:7px;font-size:14.5px;font-weight:600}
#ndm .m-dc.today .m-dn{background:#1e6fff;color:#fff}#ndm .m-dc.out .m-dn{color:#4a5568}#ndm .m-dc.sun .m-dn{color:#ff6b6b}
#ndm .m-more{grid-row:5;font-size:10px;color:#9fb0c6;text-align:center;z-index:1;pointer-events:none}
#ndm .m-bar{margin:0 2px;height:20px;border-radius:4px;border:0;color:#1d2733;font-size:11px;font-weight:600;padding:0 4px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative;z-index:1;
  user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:pan-x pan-y}
#ndm .m-bar.done{opacity:.45;text-decoration:line-through}
#ndm .m-bar.hold{box-shadow:0 0 0 3px rgba(30,140,255,.85);transition:box-shadow 3s linear}
#ndm .m-bar.mv{outline:2px dashed #fff;box-shadow:0 4px 14px rgba(0,0,0,.5)}
#ndm .m-addbar{flex-shrink:0;display:flex;align-items:center;gap:12px;padding:8px 14px}
#ndm .m-pill{flex:1;height:48px;border-radius:24px;border:1.5px solid #3a4a62;background:#121b2b;color:#8193ab;font-size:15px;text-align:left;padding:0 18px}
#ndm .m-fab{width:54px;height:54px;border-radius:27px;border:0;background:#1e8cff;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(30,140,255,.35)}
#ndm .m-mvbar{flex-shrink:0;margin:6px 14px 0;padding:10px 12px;border-radius:12px;background:#0f2e4d;border:1px solid #1e8cff;display:flex;align-items:center;gap:10px;font-size:13.5px}
/* แผ่นเลื่อนขึ้น */
#ndm .m-sh{position:absolute;inset:0;z-index:20;background:rgba(3,8,16,.6);display:flex;flex-direction:column;justify-content:flex-end}
#ndm .m-shx{flex:1;border:0;background:transparent;min-height:40px}
#ndm .m-shb{background:#111d31;border-top:1px solid #22324a;border-radius:22px 22px 0 0;padding:10px 16px calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;max-height:88vh;overflow-y:auto}
#ndm .m-grip{width:40px;height:5px;border-radius:3px;background:#2a3d5c;align-self:center;flex-shrink:0}
#ndm .m-step{display:flex;align-items:center;gap:8px}
#ndm .m-step button{width:54px;height:48px;border-radius:12px;border:1px solid #2a3d5c;background:transparent;font-size:15px}
#ndm .m-step div{flex:1;height:48px;border-radius:12px;background:#0d1729;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600}
#ndm .m-seg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;background:#0d1729;border-radius:12px;padding:4px}
#ndm .m-seg button{height:38px;border-radius:9px;border:0;background:transparent;color:#c9d6e8;font-size:14px}
#ndm .m-seg button.on{background:#0487E2;color:#fff}
#ndm .m-list{background:#111d31;border:1px solid #1d2c44;border-radius:16px;overflow:hidden}
#ndm .m-li{width:100%;min-height:52px;display:flex;align-items:center;gap:12px;padding:9px 14px;background:transparent;border:0;border-bottom:1px solid #1a2840;text-align:left}
#ndm .m-li:last-child{border-bottom:0}
#ndm .m-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
#ndm .m-steps span{display:flex;flex-direction:column;gap:3px;align-items:center;font-size:10.5px}
#ndm .m-steps i{width:100%;height:5px;border-radius:3px;background:#2a3d5c}
#ndm .m-steps .on i{background:#37d6a0}#ndm .m-steps .on{color:#7fe3bd}
#ndm-pill{position:fixed;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:940;height:44px;padding:0 16px;border-radius:22px;border:0;background:#0487E2;color:#fff;font:600 14px Kanit,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.35)}
@media (min-width:761px){#ndm-pill{display:none}}
`;

/* ════════ ข้อมูล ════════ */
// งานในปฏิทิน: ช่วงของแต่ละหน้าที่ + วันส่งลูกค้า (🏁)
function calItems(onlyMine){
  const me=safe(()=>CU().staffId,''), uid=safe(()=>CU().uid,''), out=[];
  projs().forEach(p=>{ if(pDone(p)) return; const ws=p.workers||[];
    const mineP=!onlyMine||p.managerId===uid||ws.some(w=>w&&w.id===me);
    if(!mineP) return;
    PH.forEach(P=>{ const x=(p.phases||{})[P.k]; if(!x) return; const s=dOnly(x.startDate)||dOnly(x.deadline), e=dOnly(x.deadline)||s; if(!s) return;
      const pw=ws.filter(w=>w&&pre(w)===P.s);
      if(onlyMine&&!isMgr()&&!pw.some(w=>w.id===me)) return;
      out.push({key:p.id+'|'+P.k, pid:p.id, k:P.k, code:code(p), ph:P.name, color:P.color, s, e:e<s?s:e, time:x.submitTime||'', done:x.status==='done', who:[...new Set(pw.map(w=>nick(w.id)).filter(Boolean))].join(',')}); });
    const dl=dOnly(p.deadline); if(dl&&!onlyMine) out.push({key:p.id+'|end', pid:p.id, k:'end', code:code(p), ph:'🏁 ส่งลูกค้า', color:'#7fb8ff', s:dl, e:dl, time:dlTime(p), done:false, who:''});
  });
  return out;
}
function phStatus(p){ const t=TODAY(); return PH.filter(P=>(p.phases||{})[P.k]).map(P=>{ const x=p.phases[P.k], s=dOnly(x.startDate)||dOnly(x.deadline), e=dOnly(x.deadline)||s;
  return x.status==='done'?'done':(e&&e<t)?'late':(s&&s<=t)?'now':'wait'; }); }
function projSt(p){ if(pDone(p)) return 'done'; const t=TODAY(), dl=dOnly(p.deadline), st=phStatus(p);
  if((dl&&dl<t)||st.includes('late')) return 'late'; if(dl&&dd(t,dl)<=3) return 'soon'; return 'act'; }
const STX={act:['กำลังทำ','#0f2e4d','#6cc0ff'],soon:['ใกล้ส่ง','#3a2a0c','#ffc56b'],late:['เลยกำหนด','#3a1620','#ff9aa6'],done:['เสร็จแล้ว','#123a2e','#7fe3bd']};
const cost=p=>(p.workers||[]).reduce((a,w)=>a+(+w.amount||0),0);
const nowTxt=p=>{ const t=TODAY(); const cur=PH.find(P=>{ const x=(p.phases||{})[P.k]; if(!x||x.status==='done') return false; return true; });
  if(!cur) return pDone(p)?'ส่งลูกค้าแล้ว':'ยังไม่วางแผน'; const who=[...new Set((p.workers||[]).filter(w=>pre(w)===cur.s).map(w=>nick(w.id)).filter(Boolean))].join(','); return cur.name+(who?' · '+who:''); };
// งานของฉัน (ทีมงาน)
function myWorks(){ const me=safe(()=>CU().staffId,''); if(!me) return []; const out=[];
  projs().forEach(p=>(p.workers||[]).forEach(w=>{ if(!w||w.id!==me) return; const P=PH.find(x=>x.s===pre(w)); const x=P?(p.phases||{})[P.k]||{}:{};
    out.push({p, w, P, due:dOnly(x.deadline)||dOnly(p.deadline), time:x.submitTime||dlTime(p), done:x.status==='done'||pDone(p)||w.status==='paid', note:x.note||''}); }));
  return out; }
function stageOf(w){ if(w.status==='paid') return w.voucherNo?4:3; if(w.status==='approved'||w.status==='waiting_client') return 2; if(w.confirmStatus==='confirmed') return 1; return 0; }
function myConfirms(){ return (safe(()=>_getMyConfirmItems(),[])||[]).filter(x=>x&&x.w&&x.w.confirmStatus==='sent'); }

/* ════════ บันทึก ════════ */
// แอดมิน / เมเนเจอร์เจ้าของงาน = saveProjectMerge · คนอื่น (พนักงานบริษัท) = update เฉพาะช่องวัน/สถานะ (Rules v7)
async function writeProj(pid, apply, fields){
  if(isAdm()||isMgr()||!DB()){ const r=await safe(()=>saveProjectMerge(pid, apply), Promise.resolve({ok:false})); return r||{ok:false}; }
  const P=JSON.parse(JSON.stringify(projs().find(x=>x.id===pid)||{})), me=(CU()||{}).nickname||(CU()||{}).email||'', up={};
  apply(P); P.updatedAt=new Date().toISOString();
  fields(P).forEach(k=>{ const v=k.split('/').reduce((o,x)=>o==null?o:o[x],P); up['projects/'+pid+'/'+k]=v===undefined?null:v; });
  up['projects/'+pid+'/updatedAt']=P.updatedAt; up['projects/'+pid+'/_lastSavedBy']=me;
  try{ await DB().ref().update(up); safe(()=>_notifyProjectChange()); return {ok:true}; }catch(e){ return {ok:false,error:e}; } }
const phFields=(p,keys)=>keys.flatMap(k=>['startDate','deadline','submitTime','status'].map(f=>'phases/'+k+'/'+f));
// เลื่อนหน้าที่ถัดไปที่ "เริ่มวันที่หน้าที่ก่อนส่ง" ตามไปด้วย (เหมือนปฏิทินบนคอม)
function chain(p, k, oldEnd, delta, seen){ seen=seen||[]; if(!delta) return seen; const i=PH.findIndex(x=>x.k===k);
  for(let j=i+1;j<PH.length;j++){ const x=(p.phases||{})[PH[j].k]; if(!x) continue;
    if(dOnly(x.startDate)===oldEnd){ const oe=dOnly(x.deadline); x.startDate=shift(x.startDate,delta); if(oe) x.deadline=shift(oe,delta); seen.push(PH[j].k); chain(p, PH[j].k, oe, delta, seen); }
    break; }
  return seen; }

/* ════════ หน้าต่าง ๆ ════════ */
function hdr(){ const t=tabsOf().find(x=>x[0]===S.tab)||tabsOf()[0], u=CU()||{};
  const sub=(isAdm()?'แอดมิน':isMgr()?'เมเนเจอร์':isEmp()?'พนักงานบริษัท':'ทีมงาน')+' · '+(u.nickname||u.name||'');
  const bell=isAdm()?approvals().length:myConfirms().length;
  return `<div class="m-hd"><div class="m-logo">G</div><div style="flex:1;min-width:0"><div class="m-sub">${E(sub)}</div><div class="m-ttl">${E(TTL[S.tab]||t[1])}</div></div>
    <button class="m-ib" aria-label="แจ้งเตือน" onclick="NDM.bell()">${ic('bell',20)}${bell?`<span class="m-badge">${bell}</span>`:''}</button></div>`; }
const TTL={cal:'ปฏิทินงาน',proj:'โปรเจกต์ทั้งหมด',assign:'มอบหมายงาน',doc:'เอกสาร',approve:'รออนุมัติ',jobs:'งานของฉัน',money:'เงินของฉัน',me:'ฉัน'};
function tabsHTML(){ const conf=myConfirms().length;
  return `<div class="m-tabs">${tabsOf().map(([k,l,i])=>`<button class="m-tab ${S.tab===k?'on':''}" onclick="NDM.go('${k}')">${ic(i)}<span>${l}</span>${k==='money'&&conf?`<span class="m-badge" style="top:6px;right:26%">${conf}</span>`:''}</button>`).join('')}</div>`; }

/* ── ปฏิทินเดือน ── */
function calHTML(){
  const mine=!(isAdm()||(isEmp()&&S.calMode==='team')||isMgr()), items=calItems(mine&&!isMgr());
  const y=S.cur.getFullYear(), m=S.cur.getMonth(), first=new Date(y,m,1), start=addD(first,-first.getDay()), rows=Math.ceil((first.getDay()+new Date(y,m+1,0).getDate())/7), t=TODAY();
  let h=`${isEmp()&&!isAdm()&&!isMgr()?`<div class="m-seg">${[['mine','ของฉัน'],['team','ทั้งทีม']].map(([k,l])=>`<button class="${S.calMode===k?'on':''}" onclick="NDM.set('calMode','${k}')">${l}</button>`).join('')}</div>`:''}
    <div class="m-mon"><button aria-label="เดือนก่อน" onclick="NDM.mon(-1)">‹</button><b>${TM[m]} ${y+543}</b><button aria-label="เดือนถัดไป" onclick="NDM.mon(1)">›</button></div>
    <div><div class="m-dow">${WD.map((w,i)=>`<span style="${i===0?'color:#ff6b6b':''}">${w}.</span>`).join('')}</div>`;
  for(let r=0;r<rows;r++){ const ws=addD(start,r*7), wsY=ymd(ws), weY=ymd(addD(ws,6));
    let cells='', bars='', more={};
    for(let i=0;i<7;i++){ const d=addD(ws,i), k=ymd(d), out=d.getMonth()!==m;
      cells+=`<button class="m-dc ${k===t?'today':''} ${S.day===k?'sel':''} ${out?'out':''} ${i===0?'sun':''}" style="grid-column:${i+1}" aria-label="${d.getDate()} ${TM[d.getMonth()]}" onclick="NDM.day('${k}')"><span class="m-dn">${d.getDate()}</span></button>`; }
    const lanes=[[],[],[]];
    items.filter(e=>e.s<=weY&&e.e>=wsY).sort((a,b)=>a.s.localeCompare(b.s)||dd(b.s,b.e)-dd(a.s,a.e)).forEach(e=>{
      const a=e.s<wsY?wsY:e.s, b=e.e>weY?weY:e.e, ca=dd(wsY,a), cb=dd(wsY,b), L=lanes.findIndex(l=>l.every(([x,y])=>cb<x||ca>y));
      if(L<0){ for(let c=ca;c<=cb;c++) more[c]=(more[c]||0)+1; return; } lanes[L].push([ca,cb]);
      const mv=S.moving&&S.moving.key===e.key;
      bars+=`<button class="m-bar ${e.done?'done':''} ${mv?'mv':''}" data-key="${E(e.key)}" style="grid-column:${ca+1}/span ${cb-ca+1};grid-row:${L+2};background:${e.color}">${mv?'✥ ':''}${E(e.code)} ${E(e.ph)}${e.who?'·'+E(e.who):''}</button>`; });
    Object.keys(more).forEach(c=>{ bars+=`<span class="m-more" style="grid-column:${+c+1}">+${more[c]}</span>`; });
    h+=`<div class="m-wk" style="height:${28+20*3+14+12}px">${cells}${bars}</div>`; }
  return h+'</div>'; }
function dayItems(){ const mine=!(isAdm()||(isEmp()&&S.calMode==='team')||isMgr()); return calItems(mine&&!isMgr()).filter(e=>e.s<=S.day&&e.e>=S.day); }

/* ── แผ่นงานของวัน + แผ่นแก้หน้าที่ ── */
function sheetDay(){ const L=dayItems(), tdo=todoList();
  return `<div class="m-h2">${S.day===TODAY()?'วันนี้ · ':''}${thDW(S.day)}</div>
    ${L.map(e=>`<button class="m-li" style="background:#0d1729;border-radius:12px;border:0" onclick="NDM.openPh('${A(e.key)}')"><span style="width:5px;align-self:stretch;border-radius:3px;background:${e.color};flex-shrink:0"></span>
      <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:500">${E(e.code)} · ${E(e.ph)}</div><div class="m-mut">${E(e.who||'—')}${e.time?' · ส่ง '+E(e.time):''} · ${thD(e.s)}${e.e!==e.s?'–'+thD(e.e):''}</div></div><span style="font-size:12px;color:#6cc0ff">แก้</span></button>`).join('')||'<div class="m-mut" style="text-align:center;padding:8px">ยังไม่มีงานวันนี้</div>'}
    ${tdo!==null?`<div class="m-h2" style="font-size:14px;margin-top:4px">To-do ของฉัน</div>
    <div style="display:flex;gap:8px"><input id="ndm-todo" class="m-in" placeholder="พิมพ์ To-do แล้วกดเพิ่ม" enterkeyhint="done" onkeydown="if(event.key==='Enter'){event.preventDefault();NDM.todoAdd()}"><button class="m-btn m-pri" onclick="NDM.todoAdd()">เพิ่ม</button></div>
    ${tdo.map(t=>`<button class="m-li" onclick="NDM.todoTog('${A(t.id)}')"><span style="width:22px;height:22px;border-radius:7px;border:2px solid ${t.done?'#1fae7f':'#4a5d7a'};background:${t.done?'#1fae7f':'transparent'};flex-shrink:0"></span><span style="font-size:14px;${t.done?'text-decoration:line-through;opacity:.5':''}">${E(t.text)}</span></button>`).join('')}`:''}`; }
function findItem(key){ const [pid,k]=String(key).split('|'), p=projs().find(x=>x.id===pid); return p?{p,k}:null; }
function sheetPh(){ const f=findItem(S.sheet.key); if(!f) return '<div class="m-mut">ไม่พบงาน</div>'; const {p,k}=f, dr=S.sheet.dr;
  const ro=!canDates(); const isEnd=k==='end', P=PHK(k);
  const ws=(p.workers||[]).filter(w=>w&&pre(w)===P.s);
  const cand=isEnd?[]:(safe(()=>getAllStaff(),[])||[]).filter((s,i,a)=>s&&s.id&&a.findIndex(x=>x.id===s.id)===i&&(s.categories||[s.category]).includes(k)&&safe(()=>getStaffStatus(s),'active')!=='resigned');
  const lockW=w=>w.status==='paid'||w.voucherNo||w.confirmStatus==='confirmed';
  return `<div><div style="font-size:12px;color:#6cc0ff;font-weight:600">${E(disp(p))}</div><div style="font-size:18px;font-weight:600">${E(isEnd?'🏁 วันส่งลูกค้า':P.name)}</div></div>
    ${isEnd?'':`<div class="m-lbl">วันเริ่ม<div class="m-step"><button ${ro?'disabled':''} onclick="NDM.dr('s',-1)">−1</button><div>${thDW(dr.s)}</div><button ${ro?'disabled':''} onclick="NDM.dr('s',1)">+1</button></div></div>`}
    <div class="m-lbl">${isEnd?'วันส่ง':'วันส่ง (เดดไลน์)'}<div class="m-step"><button ${ro?'disabled':''} onclick="NDM.dr('e',-1)">−1</button><div>${thDW(dr.e)}</div><button ${ro?'disabled':''} onclick="NDM.dr('e',1)">+1</button></div>
      ${isEnd?'':'<span>หน้าที่ถัดไปที่ต่อกันจะเลื่อนตามให้เอง</span>'}</div>
    <div class="m-lbl">เวลาส่ง<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr)) ;gap:6px">${['10:00','12:00','15:00','18:00','20:00'].map(v=>`<button class="m-chip ${dr.t===v?'on':''}" style="padding:0" ${ro?'disabled':''} onclick="NDM.drT('${v}')">${v}</button>`).join('')}</div>
      <input type="time" class="m-in" value="${E(dr.t)}" ${ro?'disabled':''} onchange="NDM.drT(this.value)"></div>
    ${isEnd?'':`<div class="m-lbl">คนทำ${isAdm()?' (แตะชื่อเพื่อเปลี่ยน / เพิ่มคน)':''}
      <div style="display:flex;gap:6px;flex-wrap:wrap">${ws.map(w=>`<span class="m-chip on" style="display:inline-flex;align-items:center">${E(nick(w.id)||'?')}${lockW(w)?' 🔒':''}</span>`).join('')||'<span class="m-mut">ยังไม่มีคนทำ</span>'}</div>
      ${isAdm()?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${cand.filter(s=>!ws.some(w=>w.id===s.id)).slice(0,12).map(s=>`<button class="m-chip" onclick="NDM.who('${A(s.id)}')">${E(s.nickname||s.name)}</button>`).join('')}</div>
        <span>${ws.length===1?'แตะชื่อด้านบน = เปลี่ยนคนทำแทน':ws.length?'มีหลายคน — เปลี่ยนคนทำในหน้าแก้โปรเจกต์บนคอม':'แตะชื่อ = เพิ่มเป็นคนทำ (ค่าจ้างใส่ทีหลังได้)'}</span>`:''}</div>
      <button class="m-btn" style="${dr.done?'background:#123a2e;border-color:#1d4a3b;color:#7fe3bd':''}" ${ro?'disabled':''} onclick="NDM.drDone()">${dr.done?'✓ หน้าที่นี้เสร็จแล้ว (แตะเพื่อยกเลิก)':'ติ๊กว่าหน้าที่นี้เสร็จแล้ว'}</button>`}
    ${ro?'<div class="m-mut" style="text-align:center">ดูได้อย่างเดียว · แก้วันได้เฉพาะแอดมิน เมเนเจอร์ และพนักงานบริษัท</div>':`<button class="m-btn m-pri" style="height:52px;font-size:16px" onclick="NDM.savePh()">บันทึก</button>`}`; }

/* ── โปรเจกต์ ── */
function projList(){ const uid=safe(()=>CU().uid,''); return projs().filter(p=>isAdm()||p.managerId===uid); }
function projHTML(){ const L=projList(), live=L.filter(p=>!pDone(p));
  const sum=k=>live.reduce((a,p)=>a+k(p),0);
  const shown=L.filter(p=>S.pf==='all'?!pDone(p):S.pf==='done'?pDone(p):projSt(p)===S.pf).sort((a,b)=>String(dOnly(a.deadline)||'9').localeCompare(String(dOnly(b.deadline)||'9')));
  const C={done:'#37d6a0',now:'#4fb3ff',wait:'#2a3d5c',late:'#ff6b72'};
  return `<div class="m-grid2"><div class="m-stat"><span class="m-mut">กำลังทำ</span><b style="color:#4fb3ff">${live.length} งาน</b></div><div class="m-stat"><span class="m-mut">เลยกำหนด</span><b style="color:#ff8a8f">${live.filter(p=>projSt(p)==='late').length} งาน</b></div>
    ${isAdm()?`<div class="m-stat"><span class="m-mut">งบลูกค้ารวม</span><b style="font-size:17px">${B(sum(p=>+p.budget||0))}</b></div><div class="m-stat"><span class="m-mut">กำไรคร่าว ๆ</span><b style="font-size:17px;color:#7fe3bd">${B(sum(p=>(+p.budget||0)-cost(p)))}</b></div>`:''}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${[['all','กำลังทำทั้งหมด'],['late','เลยกำหนด'],['soon','ใกล้ส่ง'],['done','เสร็จแล้ว']].map(([k,l])=>`<button class="m-chip ${S.pf===k?'on':''}" onclick="NDM.set('pf','${k}')">${l}</button>`).join('')}</div>
    ${shown.map(p=>{ const st=projSt(p), x=STX[st], bars=phStatus(p);
      return `<div class="m-card" style="display:flex;flex-direction:column;gap:8px"><div class="m-row"><span class="m-code">${E(code(p))}</span><span class="m-ell" style="font-size:14px;font-weight:500">${E(p.name||'')}</span><span class="m-tag" style="background:${x[1]};color:${x[2]}">${x[0]}</span></div>
        <div style="display:flex;gap:3px">${(bars.length?bars:['wait']).map(b=>`<i style="flex:1;height:6px;border-radius:3px;background:${C[b]}"></i>`).join('')}</div>
        <div class="m-row m-mut"><span class="m-ell">${E(nowTxt(p))} · ดูแล ${E(mgrName(p.managerId))}</span><span style="color:${st==='late'?'#ff8a8f':'#9fb0c6'}">ส่ง ${thD(p.deadline)}</span></div>
        <div class="m-row"><span class="m-ell" style="font-size:13px;color:#c9d6e8">${isAdm()?'งบ '+B(p.budget)+' · กำไร '+B((+p.budget||0)-cost(p)):''}</span><button class="m-btn" style="height:38px" onclick="NDM.openProj('${A(p.id)}')">แก้</button></div></div>`; }).join('')||'<div class="m-mut" style="text-align:center;padding:20px">ไม่มีโปรเจกต์</div>'}`; }
function sheetProj(){ const p=projs().find(x=>x.id===S.sheet.pid); if(!p) return '<div class="m-mut">ไม่พบโปรเจกต์</div>'; const d=S.sheet.dr, tabT=S.sheet.t||'info';
  const g=safe(()=>calcBudgetTotal(+d.rate||0,p.budgetType||'flat',+p.duration||0,+p.budgetQty||0),+d.rate||0), net=Math.round(g*(1-(+d.cut||0)/100));
  const lockW=w=>w.status==='paid'||w.voucherNo||w.confirmStatus==='confirmed';
  return `<div><div style="font-size:12px;color:#6cc0ff;font-weight:600">${E(code(p))} · ดูแล ${E(mgrName(p.managerId))}</div><div style="font-size:17px;font-weight:600;line-height:1.3">${E(p.name||'')}</div></div>
    <div class="m-seg"><button class="${tabT==='info'?'on':''}" onclick="NDM.pt('info')">ข้อมูล + งบ</button><button class="${tabT==='team'?'on':''}" onclick="NDM.pt('team')">ทีม + ค่าจ้าง</button></div>
    ${tabT==='info'?`<div style="display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:8px"><label class="m-lbl">ส่งลูกค้า<input type="date" class="m-in" value="${E(d.dl)}" onchange="NDM.pv('dl',this.value)"></label><label class="m-lbl">เวลา<input type="time" class="m-in" value="${E(d.tm)}" onchange="NDM.pv('tm',this.value)"></label></div>
      ${isAdm()?`<div class="m-grid2"><label class="m-lbl">เรทลูกค้า (${E(({'per-minute':'ต่อนาที','flat':'เหมา'})[p.budgetType||'flat']||'ต่อหน่วย')})<input type="number" inputmode="decimal" class="m-in" value="${E(d.rate)}" oninput="NDM.pv('rate',this.value,1)"></label>
        <label class="m-lbl">ลูกค้าหัก (%)<input type="number" inputmode="decimal" class="m-in" value="${E(d.cut||'')}" placeholder="0 = ไม่หัก" oninput="NDM.pv('cut',this.value,1)"></label></div>
        <div class="m-grid2" id="ndm-psum"><div class="m-stat"><span class="m-mut">งบหลังหัก</span><b style="font-size:16px">${B(net)}</b></div><div class="m-stat"><span class="m-mut">กำไรคร่าว ๆ</span><b style="font-size:16px;color:#7fe3bd">${B(net-cost(p))}</b></div></div>`:''}
      <label class="m-lbl">หมายเหตุ / บรีฟ<textarea class="m-in" rows="3" oninput="NDM.pv('note',this.value,1)">${E(d.note)}</textarea></label>
      <button class="m-btn" style="${d.done?'background:#123a2e;border-color:#1d4a3b;color:#7fe3bd':''}" onclick="NDM.pv('done',${d.done?0:1})">${d.done?'✓ โปรเจกต์นี้เสร็จแล้ว (แตะเพื่อยกเลิก)':'ติ๊กว่าโปรเจกต์นี้เสร็จแล้ว'}</button>`
    :`${(p.workers||[]).filter(w=>w&&pre(w)!=='mgr').map((w,i)=>{ const P=PH.find(x=>x.s===pre(w))||{name:pre(w),color:'#888'}, idx=(p.workers||[]).indexOf(w), lk=lockW(w);
        return `<div class="m-card" style="background:#0d1729;padding:10px 12px;display:flex;flex-direction:column;gap:6px"><div class="m-row"><i style="width:10px;height:10px;border-radius:5px;background:${P.color}"></i><b style="font-size:14px">${E(P.name)}</b><span class="m-ell m-mut">${E(nick(w.id)||'?')}</span>${lk?'<span class="m-tag" style="background:#123a2e;color:#7fe3bd">🔒 ยืนยัน/จ่ายแล้ว</span>':''}</div>
          <label class="m-lbl">ค่าจ้าง (บาท)<input type="number" inputmode="decimal" class="m-in" value="${E(d.amt[idx]??w.amount??'')}" ${lk||!isAdm()?'disabled':''} oninput="NDM.pam(${idx},this.value)"></label></div>`; }).join('')||'<div class="m-mut">ยังไม่มีทีมงาน</div>'}
      <div class="m-mut" style="text-align:center">เพิ่ม/ลบคนทำ ทำได้ที่ปฏิทิน (แตะงาน) หรือในคอม</div>`}
    <button class="m-btn m-pri" style="height:52px;font-size:16px" onclick="NDM.saveProj()">บันทึกโปรเจกต์</button>
    <button class="m-btn" onclick="NDM.full('proj','${A(p.id)}')">แก้ละเอียดในหน้าเต็ม (คอม)</button>`; }

/* ── มอบหมายงาน ── */
function assignHTML(){ const M=mgrs(), u=CU()||{}, a=S.asg;
  const load=uid=>projs().filter(p=>p.managerId===uid&&!pDone(p)).length;
  const list=[{uid:u.uid, nickname:'ฉันดูแลเอง'}].concat(M);
  const sent=projs().filter(p=>p.managerId).sort((x,y)=>String(y.createdAt||'').localeCompare(String(x.createdAt||''))).slice(0,6);
  return `<div class="m-card" style="display:flex;flex-direction:column;gap:12px"><div class="m-h2">สั่งงานใหม่</div>
    <div class="m-lbl">รหัสงาน <span style="color:#ff8a8f">* ต้องกรอก</span><div style="display:flex;gap:8px"><input id="ndm-a-pre" class="m-in" style="width:76px;text-align:center;text-transform:uppercase;font-weight:600" placeholder="M" maxlength="4" value="${E(a.pre||'')}" oninput="NDM.av('pre',this.value)"><input id="ndm-a-no" class="m-in" inputmode="numeric" style="font-weight:600" placeholder="05" value="${E(a.no||'')}" oninput="NDM.av('no',this.value)"></div><span id="ndm-a-hint" style="color:#6cc0ff">${E(codeHint())}</span></div>
    <label class="m-lbl">ชื่องาน (ไม่กรอกก็ได้)<input id="ndm-a-name" class="m-in" value="${E(a.name||'')}" oninput="NDM.av('name',this.value)"></label>
    <div class="m-lbl">ผู้รับผิดชอบ<div class="m-grid2">${list.map(m=>`<button class="m-btn" style="height:auto;padding:8px 12px;text-align:left;${a.mgr===m.uid?'border-color:#1e8cff;background:#0f2e4d':''}" onclick="NDM.av('mgr','${A(m.uid)}',1)"><b style="display:block;font-size:15px">${E(m.nickname||m.name||m.email||'—')}</b><span class="m-mut">ดูแลอยู่ ${load(m.uid)} งาน</span></button>`).join('')}</div></div>
    <label class="m-lbl">ลิงก์ / URL ลูกค้า<input id="ndm-a-url" class="m-in" inputmode="url" placeholder="https://…" value="${E(a.url||'')}" oninput="NDM.av('url',this.value)"></label>
    <div style="display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:8px"><label class="m-lbl">เดดไลน์สุดท้าย<input type="date" class="m-in" value="${E(a.dl||'')}" onchange="NDM.av('dl',this.value)"></label><label class="m-lbl">เวลา<input type="time" class="m-in" value="${E(a.tm||'')}" onchange="NDM.av('tm',this.value)"></label></div>
    <label class="m-lbl">บรีฟคร่าว ๆ<textarea class="m-in" rows="3" placeholder="เช่น ลูกค้าขอเสียงเหมือนเรื่องก่อน · 80 นาที" oninput="NDM.av('note',this.value)">${E(a.note||'')}</textarea></label>
    <label style="display:flex;gap:8px;align-items:center;font-size:13px;color:#c9d6e8"><input type="checkbox" ${a.dc?'checked':''} onchange="NDM.av('dc',this.checked,1)" style="width:20px;height:20px"> สร้างห้อง Discord + โพสต์บรีฟให้เลย</label>
    <button class="m-btn m-pri" style="height:52px;font-size:16px" onclick="NDM.assign()">ส่งงานให้ ${E(a.mgr?(list.find(m=>m.uid===a.mgr)||{}).nickname||'':'…')}</button></div>
    <div class="m-h2">สั่งไปล่าสุด</div>
    <div class="m-list">${sent.map(p=>{ const st=projSt(p), pl=Object.keys(p.phases||{}).length; return `<div class="m-li"><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:500">${E(code(p))} → ${E(mgrName(p.managerId))}</div><div class="m-mut">สั่ง ${thD(p.createdAt||p.date)} · ส่งลูกค้า ${thD(p.deadline)}</div></div>
      <span class="m-tag" style="background:${pl?STX[st][1]:'#3a2a0c'};color:${pl?STX[st][2]:'#ffc56b'}">${pl?STX[st][0]:'ยังไม่วางแผน'}</span></div>`; }).join('')||'<div class="m-li m-mut">ยังไม่มี</div>'}</div>`; }
function codeOf(){ const a=S.asg, p=String(a.pre||'').trim().toUpperCase(), n=String(a.no||'').replace(/\D/g,''); return p&&n?{pre:p, seq:+n, code:p+pad(+n)}:null; }
function codeHint(){ const c=codeOf(); if(!c) return S.asg.err?'⚠️ ใส่รหัสงานก่อน เช่น M + 05':'เช่น M + 05 = M05';
  return projs().some(p=>code(p)===c.code)?'⚠️ รหัส '+c.code+' มีอยู่แล้ว — เช็กอีกที':'รหัสงาน: '+c.code; }

/* ── เอกสาร ── */
function docHTML(){ const L=[...(safe(()=>getDocsStore('invoices'),[])||[]).map(d=>({...d,_k:'inv'})),...(safe(()=>getDocsStore('quotations'),[])||[]).map(d=>({...d,_k:'qt'}))]
    .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,12);
  return `<div class="m-grid2"><button class="m-btn" style="height:76px;border-color:#1d4a75;background:#0f2e4d;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px" onclick="NDM.newDoc('qt')">${ic('doc')}ใบเสนอราคาใหม่</button>
    <button class="m-btn" style="height:76px;border-color:#1d4a75;background:#0f2e4d;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px" onclick="NDM.newDoc('inv')">${ic('doc')}ใบแจ้งหนี้ใหม่</button></div>
    <div class="m-h2">ล่าสุด</div>
    ${L.map(d=>`<div class="m-card" style="display:flex;align-items:center;gap:10px;padding:10px 12px"><div style="flex:1;min-width:0"><div style="font-size:13px;color:#6cc0ff;font-weight:600">${E(d.docNo)}</div><div class="m-ell" style="font-size:14px">${E(d.client||'—')}</div>
      <div class="m-mut">${(d.items||[]).length} รายการ · ${d.currency&&d.currency!=='THB'?E(d.currency)+' ':''}${B(d.total)}</div></div>
      <span class="m-tag" style="background:${d.isDraft?'#3a2a0c':'#123a2e'};color:${d.isDraft?'#ffc56b':'#7fe3bd'}">${d.isDraft?'ดราฟ':'บันทึกแล้ว'}</span>
      <button class="m-btn" style="height:40px;padding:0 12px" onclick="NDM.openDoc('${d._k}','${A(d.docNo)}')">${d.isDraft?'ทำต่อ':'เปิด'}</button></div>`).join('')||'<div class="m-mut" style="text-align:center">ยังไม่มีเอกสาร</div>'}
    <div class="m-mut" style="text-align:center">ส่งอีเมล / ออก PDF จะเปิดฟอร์มเต็มให้ (ใช้ระบบเดิม)</div>`; }
function sheetDoc(){ const k=S.sheet.k, L=projs().filter(p=>!pDone(p)||p.projStatus==='done').sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,20);
  const sel=L.filter(p=>S.docSel[p.id]), tot=sel.reduce((a,p)=>a+(+p.budget||0),0), cl=S.sheet.client??(sel[0]&&sel[0].client)??'';
  return `<div class="m-h2" style="font-size:18px">${k==='qt'?'ใบเสนอราคาใหม่':'ใบแจ้งหนี้ใหม่'}</div>
    <label class="m-lbl">ลูกค้า<input class="m-in" value="${E(cl)}" oninput="NDM.dc(this.value)" placeholder="ชื่อลูกค้า"></label>
    <div class="m-mut">เลือกโปรเจกต์ (ราคาดึงจากโปรเจกต์ให้)</div>
    ${L.map(p=>{ const on=!!S.docSel[p.id]; return `<button class="m-li" style="border:1px solid ${on?'#1d4a75':'#2a3d5c'};border-radius:12px;background:${on?'#0f2e4d':'transparent'};margin-bottom:6px" onclick="NDM.ds('${A(p.id)}')">
      <span style="width:20px;height:20px;border-radius:6px;border:2px solid ${on?'#0487E2':'#4a5d7a'};background:${on?'#0487E2':'transparent'};flex-shrink:0"></span><span class="m-ell" style="font-size:14px">${E(disp(p))}</span><b style="font-size:14px">${B(p.budget)}</b></button>`; }).join('')}
    <div class="m-row" style="font-size:15px;font-weight:600;padding:2px 4px"><span style="flex:1">รวม</span><span>${B(tot)}</span></div>
    <div class="m-grid2"><button class="m-btn" style="height:50px" onclick="NDM.docGo(1)">เซฟเป็นดราฟ</button><button class="m-btn m-pri" style="height:50px" onclick="NDM.docGo(0)">เปิดฟอร์มเต็ม → ส่ง</button></div>`; }

/* ── รออนุมัติ (แอดมิน · กระดิ่ง) ── */
function approvals(){ const out=[];
  projs().forEach(p=>(p.workers||[]).forEach(w=>{ if(!w) return;
    if(w.confirmStatus==='rejected') out.push({tag:'ยอดถูกแย้ง',fg:'#ff9aa6',t:(nick(w.id)||'?')+' · '+code(p),s:'ขอ '+B(w.confirmAskAmount)+' · '+(w.confirmRejectReason||''),go:'queue'});
    else if(w.status==='pending'&&w.confirmStatus==='confirmed') out.push({tag:'รออนุมัติจ่าย',fg:'#ffc56b',t:(nick(w.id)||'?')+' · '+code(p)+' '+(PH.find(x=>x.s===pre(w))||{name:''}).name,s:'ยืนยันยอดแล้ว '+B(w.amount),go:'queue'}); }));
  (safe(()=>getMgrRequests(),[])||[]).filter(r=>r&&r.status==='pending').forEach(r=>out.push({tag:'คำขอเมเนเจอร์',fg:'#8fd0ff',t:r.title||r.type||'คำขอ',s:r.text||r.reason||'',go:'staff'}));
  Object.values(safe(()=>ls('mgr_users_cache'),{})||{}).forEach(u=>{ const q=u&&u.roleReq; if(q&&((q.add||[]).length||(q.del||[]).length)) out.push({tag:'ขอเปลี่ยนตำแหน่ง',fg:'#c9b2ff',t:u.nickname||u.email||'',s:[(q.add||[]).length?'เพิ่ม '+q.add.join(', '):'',(q.del||[]).length?'ลด '+q.del.join(', '):''].filter(Boolean).join(' · '),go:'staff'}); });
  return out; }
function approveHTML(){ const L=approvals();
  return `<div class="m-mut">ไว้ดูเร็ว ๆ · กดแล้วจะเปิดหน้าเต็มที่เกี่ยวข้อง</div>
    ${L.map(x=>`<button class="m-card" style="text-align:left;display:flex;align-items:center;gap:10px" onclick="NDM.full('${x.go}')"><div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;color:${x.fg}">${E(x.tag)}</div><div style="font-size:14px;font-weight:500">${E(x.t)}</div><div class="m-mut m-ell">${E(x.s)}</div></div>${ic('chev',18)}</button>`).join('')
      ||'<div class="m-card" style="text-align:center;color:#7fe3bd;background:#0f2a22;border-color:#1d4a3b">ไม่มีเรื่องรออนุมัติ</div>'}`; }

/* ── ทีมงาน: งาน / เงิน / ฉัน ── */
function jobsHTML(){ const W=myWorks(), t=TODAY(), open=W.filter(x=>!x.done).sort((a,b)=>String(a.due||'9').localeCompare(String(b.due||'9'))), done=W.filter(x=>x.done).slice(0,8), conf=myConfirms();
  const wait=W.filter(x=>stageOf(x.w)<3).reduce((a,x)=>a+(+x.w.amount||0),0);
  const left=d=>!d?'':d<t?'เลยกำหนด '+dd(d,t)+' วัน':d===t?'วันนี้':'อีก '+dd(t,d)+' วัน';
  return `<div class="m-grid2"><div class="m-stat"><span class="m-mut">งานที่ต้องส่ง</span><b style="color:#4fb3ff">${open.length} งาน</b></div><div class="m-stat"><span class="m-mut">ยอดรอรับเงิน</span><b style="color:#7fe3bd">${B(wait)}</b></div></div>
    ${conf.length?`<button class="m-card" style="text-align:left;border-color:#6b4d14;background:#3a2a0c;color:#ffe2b0;display:flex;gap:10px;align-items:center" onclick="NDM.go('money')"><span style="flex:1">มีใบยืนยันยอดรอคุณ <b>${conf.length} ใบ</b> · ต้องยืนยันก่อนถึงจะได้เงิน</span><b>ไปยืนยัน ›</b></button>`:''}
    <div class="m-h2">ต้องส่ง</div>
    ${open.map(x=>{ const late=x.due&&x.due<=t; return `<div class="m-card" style="display:flex;flex-direction:column;gap:10px"><div class="m-row"><span class="m-code">${E(code(x.p))}</span><span class="m-ell" style="font-size:14px;font-weight:500">${E((x.P||{}).name||pre(x.w))} · ${E(x.p.name||'')}</span></div>
      <div class="m-row"><div style="flex:1"><div style="font-size:15px;font-weight:600;color:${late?'#ff8a8f':'#e8eef7'}">ส่ง ${x.due?thDW(x.due):'—'} ${E(x.time)}</div><div style="font-size:12px;color:${late?'#ff8a8f':'#9fb0c6'}">${left(x.due)}</div></div>
        <div style="text-align:right"><div class="m-mut">ค่าตอบแทน</div><div style="font-size:16px;font-weight:600">${B(x.w.amount)}</div></div></div>
      <div class="m-grid2"><button class="m-btn" onclick="NDM.job('${A(x.p.id)}','${A(x.w.slot)}')">ดูบรีฟ / รายละเอียด</button>${dcBtn(x.p)}</div></div>`; }).join('')||'<div class="m-card m-mut" style="text-align:center">ไม่มีงานค้าง 🎉</div>'}
    ${done.length?`<div class="m-h2">ส่งแล้ว</div><div class="m-list">${done.map(x=>{ const sg=stageOf(x.w); return `<button class="m-li" onclick="NDM.job('${A(x.p.id)}','${A(x.w.slot)}')"><span style="font-size:12px;font-weight:700;color:#6cc0ff;width:40px">${E(code(x.p))}</span><span style="flex:1;font-size:14px">${E((x.P||{}).name||'')}</span>
      <span class="m-tag" style="background:${sg>=3?'#123a2e':'#0f2e4d'};color:${sg>=3?'#7fe3bd':'#6cc0ff'}">${sg>=3?'โอนแล้ว':'ส่งแล้ว'}</span></button>`; }).join('')}</div>`:''}
    <div class="m-mut" style="text-align:center">ส่งงานและคุยงานใน Discord ของแต่ละโปรเจกต์ตามปกติ</div>`; }
function dcBtn(p){ const gid=safe(()=>getDiscordCfg().guildId,'')||''; const url=p.discordChannelId?(gid?'https://discord.com/channels/'+gid+'/'+p.discordChannelId:'https://discord.com/channels/@me'):'';
  return url?`<a class="m-btn" style="display:flex;align-items:center;justify-content:center;background:#5865f2;border:0;color:#fff;text-decoration:none" href="${E(url)}" target="_blank" rel="noopener">ห้อง Discord</a>`:'<button class="m-btn" disabled style="opacity:.5">ยังไม่มีห้อง Discord</button>'; }
function sheetJob(){ const p=projs().find(x=>x.id===S.sheet.pid); if(!p) return ''; const w=(p.workers||[]).find(x=>x&&x.slot===S.sheet.slot&&x.id===safe(()=>CU().staffId,''))||{}; const P=PH.find(x=>x.s===pre(w))||{name:''}, x=(p.phases||{})[P.k]||{};
  const steps=['ยืนยันยอด','อนุมัติ','โอนแล้ว','ออกใบ'], sg=stageOf(w);
  return `<div><div style="font-size:12px;color:#6cc0ff;font-weight:600">${E(disp(p))}</div><div style="font-size:18px;font-weight:600">${E(P.name)}</div></div>
    <div class="m-grid2"><div class="m-stat"><span class="m-mut">ส่งงาน</span><b style="font-size:15px">${thDW(dOnly(x.deadline)||p.deadline)} ${E(x.submitTime||'')}</b></div><div class="m-stat"><span class="m-mut">ค่าตอบแทน</span><b style="font-size:15px">${B(w.amount)}</b></div></div>
    <div class="m-stat"><span class="m-mut">บรีฟ / หมายเหตุ</span><div style="font-size:14px;line-height:1.5;white-space:pre-wrap">${E([x.note,w.comment,p.note].filter(Boolean).join('\n')||'—')}</div></div>
    <div class="m-stat"><span class="m-mut">เงินถึงไหนแล้ว</span><div class="m-steps" style="margin-top:6px">${steps.map((s,i)=>`<span class="${i<sg?'on':''}"><i></i>${s}</span>`).join('')}</div></div>
    <div class="m-grid2">${p.downloadLink?`<a class="m-btn" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="${E(p.downloadLink)}" target="_blank" rel="noopener">ไฟล์งาน</a>`:'<button class="m-btn" disabled style="opacity:.5">ไม่มีลิงก์ไฟล์</button>'}${dcBtn(p)}</div>`; }
function moneyHTML(){ const C=myConfirms(), W=myWorks().filter(x=>x.w.amount), steps=['ยืนยันยอด','อนุมัติ','โอนแล้ว','ออกใบ'];
  const mk=TODAY().slice(0,7), pp=safe(()=>getPayProfile(CU().staffId),{})||{}, monthJobs=W.filter(x=>String(x.due||'').slice(0,7)===mk).reduce((a,x)=>a+(+x.w.amount||0),0);
  return `${(isEmp()||isMgr())&&+pp.baseSalary?`<div class="m-card" style="background:#0f2e4d;border-color:#1d4a75"><div class="m-mut" style="color:#9fc7ea">รายได้เดือนนี้ (ประมาณ)</div><div style="font-size:28px;font-weight:600">${B((+pp.baseSalary||0)+(+pp.allowance||0)+monthJobs)}</div><div class="m-mut" style="color:#9fc7ea">เงินเดือน ${B(pp.baseSalary)}${+pp.allowance?' + '+E(pp.allowanceLabel||'เบี้ยเลี้ยง')+' '+B(pp.allowance):''} + ค่างาน ${B(monthJobs)}</div></div>`:''}
    <div class="m-h2">รอคุณยืนยันยอด</div>
    ${C.map(({p,w})=>`<div class="m-card" style="border-color:#6b4d14;display:flex;flex-direction:column;gap:10px"><div class="m-row"><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:500">${E(code(p))} · ${E((PH.find(x=>x.s===pre(w))||{name:pre(w)}).name)}</div><div class="m-mut m-ell">${E(p.name||'')}</div></div><b style="font-size:20px">${B(w.confirmAmount||w.amount)}</b></div>
      <div style="display:flex;gap:8px"><button class="m-btn m-ok" style="flex:1;height:48px;font-size:15px" onclick="NDM.cfYes('${A(p.id)}','${A(w.id)}','${A(w.slot)}')">ยอดถูกต้อง</button><button class="m-btn" style="width:108px;height:48px;color:#ff9aa6;border-color:#5a2a33" onclick="NDM.cfNo('${A(p.id)}','${A(w.id)}','${A(w.slot)}')">ยอดไม่ถูก</button></div></div>`).join('')
      ||'<div class="m-card" style="text-align:center;color:#7fe3bd;background:#0f2a22;border-color:#1d4a3b">ไม่มีใบรอยืนยัน</div>'}
    <div class="m-h2">เงินถึงไหนแล้ว</div>
    ${W.filter(x=>stageOf(x.w)<4||x.w.status!=='paid'||String(x.w.paidAt||'')>=ymd(addD(new Date(),-45))).slice(0,12).map(x=>{ const sg=stageOf(x.w); return `<div class="m-card" style="display:flex;flex-direction:column;gap:8px"><div class="m-row"><span class="m-ell" style="font-size:14px;font-weight:500">${E(code(x.p))} · ${E((x.P||{}).name||'')}</span><b>${B(x.w.amount)}</b></div>
      <div class="m-steps">${steps.map((s,i)=>`<span class="${i<sg?'on':''}"><i></i>${s}</span>`).join('')}</div>${x.w.slipUrl?`<a class="m-btn" style="align-self:flex-start;height:34px;display:flex;align-items:center;text-decoration:none;font-size:13px" href="${E(x.w.slipUrl)}" target="_blank" rel="noopener">ดูสลิปโอน</a>`:''}</div>`; }).join('')||'<div class="m-mut">ยังไม่มีรายการ</div>'}
    <button class="m-btn" style="height:50px" onclick="NDM.full('docs-me')">${ic('doc',18)} เอกสารของฉัน (ใบสำคัญจ่าย · 50 ทวิ)</button>`; }
function sheetRej(){ return `<div class="m-h2" style="font-size:18px">แจ้งยอดไม่ถูก</div>
  <label class="m-lbl">ยอดที่ถูก (บาท)<input id="ndm-rj-amt" class="m-in" inputmode="decimal" placeholder="เช่น 4900"></label>
  <label class="m-lbl">เหตุผล<textarea id="ndm-rj-why" class="m-in" rows="3" placeholder="เช่น ทำไป 98 นาที ไม่ใช่ 97 นาที"></textarea></label>
  <button class="m-btn" style="height:52px;border:0;background:#d94452;color:#fff;font-weight:600;font-size:16px" onclick="NDM.cfSend()">ส่งให้แอดมินตรวจ</button>`; }
function meHTML(){ const u=CU()||{}, s=safe(()=>getStaffById(u.staffId),null)||{}, cats=(s.categories||[s.category]).filter(Boolean);
  const bank=s.bank||s.bankName||'', acc=String(s.account||s.bankAccount||s.promptpay||''), df=s.docForm||{};
  const row=(t,sub,go,fg)=>`<button class="m-li" onclick="NDM.full('${go}')"><div style="flex:1;min-width:0"><div style="font-size:14px">${t}</div><div style="font-size:12px;color:${fg||'#9fb0c6'}">${sub}</div></div>${ic('chev',18)}</button>`;
  return `<div class="m-card" style="display:flex;align-items:center;gap:14px"><div style="width:58px;height:58px;border-radius:29px;background:#0487E2;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:600;color:#fff">${E((s.nickname||u.nickname||'?').slice(0,1))}</div>
    <div style="flex:1;min-width:0"><div style="font-size:18px;font-weight:600">${E(s.nickname||u.nickname||'')}</div><div class="m-mut">${E(((s.name||'')+' '+(s.lastName||'')).trim()||u.email||'')}</div>
    <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">${[isEmp()?'พนักงานบริษัท':isMgr()?'เมเนเจอร์':'ทีมงาน'].concat(cats.map(c=>safe(()=>CATS[c].label.replace(/^\S+\s/,''),c))).map(t=>`<span class="m-tag" style="background:#0f2e4d;color:#6cc0ff">${E(t)}</span>`).join('')}</div></div></div>
    <div class="m-list">${row('ข้อมูลส่วนตัว / แก้โปรไฟล์','ชื่อ · ช่องทางติดต่อ · ที่อยู่','profile')}
      ${row('บัญชีรับเงิน', bank||acc?E(bank)+(acc?' · xxx'+E(acc.replace(/\D/g,'').slice(-4)):''):'ยังไม่กรอก — กรอกให้ครบ เงินจะได้เข้า','profile', bank||acc?'':'#ff8a8f')}
      ${row('เอกสารสัญญา / บัตร / บัญชี', df.sent?'ส่งแล้ว ✓':df.exempt?'ไม่ต้องส่ง':df.sent===false?'ยังไม่ได้ส่ง':'—','profile', df.sent?'#7fe3bd':df.sent===false?'#ff8a8f':'')}
      ${row('เอกสารของฉัน','ใบสำคัญจ่าย · 50 ทวิ','docs-me')}
      ${row('ตั้งค่า','ธีม · รหัสผ่าน','settings')}</div>
    <button class="m-btn" style="height:50px" onclick="NDM.offMode()">เปิดเว็บแบบเต็ม (เหมือนในคอม)</button>
    <button class="m-btn" style="height:46px;color:#ff9aa6;border-color:#5a2a33" onclick="NDM.logout()">ออกจากระบบ</button>`; }

/* ── To-do ส่วนตัว (เก็บที่เดียวกับปฏิทินบนคอม privcal/<uid>/todos) ── */
let TODO=null, todoOn=false;
function todoList(){ if(!(isAdm()||isMgr()||isEmp())) return null; if(!todoOn){ todoOn=true; const db=DB(), uid=safe(()=>CU().uid,''); if(db&&uid) db.ref('privcal/'+uid+'/todos').on('value',sn=>{ TODO=sn.val()||{}; if(S.sheet&&S.sheet.type==='day') renderSheet(); }); }
  return Object.values(TODO||{}).filter(t=>t&&(!t.due||t.due===S.day||!t.done)).sort((a,b)=>(a.done?1:0)-(b.done?1:0)||String(a.at||'').localeCompare(String(b.at||''))).slice(0,20); }

/* ════════ วาดหน้า ════════ */
function body(){ switch(S.tab){
  case 'cal': return calHTML(); case 'proj': return projHTML(); case 'assign': return assignHTML(); case 'doc': return docHTML(); case 'approve': return approveHTML();
  case 'jobs': return jobsHTML(); case 'money': return moneyHTML(); case 'me': return meHTML(); default: return ''; } }
function render(){ if(!ROOT) return; const keep=ROOT.querySelector('.m-body'), st=keep?keep.scrollTop:0;
  ROOT.innerHTML=hdr()+(S.moving?`<div class="m-mvbar"><span style="flex:1">กำลังย้าย <b>${E(S.moving.label)}</b> · แตะวันที่จะให้ส่ง</span><button class="m-btn" style="height:34px;padding:0 12px" onclick="NDM.stopMv()">ยกเลิก</button></div>`:'')
    +`<div class="m-body">${body()}</div>`
    +(S.tab==='cal'?`<div class="m-addbar"><button class="m-pill" onclick="NDM.openDay()">งานวันที่ ${thD(S.day)}${(isAdm()||isMgr()||isEmp())?' · เพิ่ม To-do':''}</button><button class="m-fab" aria-label="ดูงานของวัน" onclick="NDM.openDay()">${ic('plus',26)}</button></div>`:'')
    +tabsHTML()+'<div id="ndm-sheet"></div>';
  const nb=ROOT.querySelector('.m-body'); if(nb&&S.keepScroll!==false) nb.scrollTop=st; S.keepScroll=true; renderSheet(); }
function renderSheet(){ const h=$('ndm-sheet'); if(!h) return; const sh=S.sheet; if(!sh){ h.innerHTML=''; return; }
  const inner=sh.type==='day'?sheetDay():sh.type==='ph'?sheetPh():sh.type==='proj'?sheetProj():sh.type==='doc'?sheetDoc():sh.type==='job'?sheetJob():sh.type==='rej'?sheetRej():'';
  const b=h.querySelector('.m-shb'), st=b?b.scrollTop:0;
  h.innerHTML=`<div class="m-sh"><button class="m-shx" aria-label="ปิด" onclick="NDM.close()"></button><div class="m-shb"><div class="m-grip"></div>${inner}</div></div>`;
  const nb=h.querySelector('.m-shb'); if(nb) nb.scrollTop=st; }
// เลี่ยงวาดใหม่ตอนกำลังพิมพ์ในช่อง (ข้อมูลเปลี่ยนจากเครื่องอื่น)
let RT=null; function soft(){ clearTimeout(RT); RT=setTimeout(()=>{ if(!ROOT||ROOT.style.display==='none') return; const a=document.activeElement; if(a&&ROOT.contains(a)&&/INPUT|TEXTAREA/.test(a.tagName)) return soft(); if(S.sheet&&S.sheet.type!=='day') return; render(); },400); }

/* ── กดค้าง 3 วิ เพื่อย้าย (เฉพาะแถบหน้าที่) ── */
function bindHold(){ if(!ROOT) return;
  ROOT.addEventListener('pointerdown',e=>{ const b=e.target.closest&&e.target.closest('.m-bar'); if(!b) return; const key=b.dataset.key; held=false; clearTimeout(hold);
    const x0=e.clientX, y0=e.clientY; b._xy=[x0,y0]; b.classList.add('hold');
    hold=setTimeout(()=>{ held=true; b.classList.remove('hold'); const f=findItem(key); if(!f||f.k==='end'||!canDates()){ held=false; return; }
      try{ navigator.vibrate&&navigator.vibrate(30); }catch(_){} S.moving={key, label:code(f.p)+' '+PHK(f.k).name}; render(); },3000); });
  ROOT.addEventListener('pointermove',e=>{ const b=e.target.closest&&e.target.closest('.m-bar'); if(!hold||!b||!b._xy) return; if(Math.hypot(e.clientX-b._xy[0],e.clientY-b._xy[1])>8){ clearTimeout(hold); hold=null; b.classList.remove('hold'); } });
  const end=e=>{ const b=e.target.closest&&e.target.closest('.m-bar'); clearTimeout(hold); if(b) b.classList.remove('hold');
    if(e.type==='pointerup'&&b&&hold!==null&&!held&&b._xy&&Math.hypot(e.clientX-b._xy[0],e.clientY-b._xy[1])<=8) NDM.openPh(encodeURIComponent(b.dataset.key)); hold=null; };
  ROOT.addEventListener('pointerup',end); ROOT.addEventListener('pointercancel',end);
  ROOT.addEventListener('contextmenu',e=>{ if(e.target.closest&&e.target.closest('.m-bar')) e.preventDefault(); }); }

/* ════════ คำสั่ง ════════ */
const NDM=window.NDM={
  render, go(t){ S.tab=t; S.sheet=null; S.moving=null; S.keepScroll=false; render(); }, set(k,v){ S[k]=v; render(); },
  bell(){ if(isAdm()) NDM.go('approve'); else NDM.go('money'); },
  close(){ S.sheet=null; renderSheet(); },
  mon(n){ S.cur=new Date(S.cur.getFullYear(), S.cur.getMonth()+n, 1); render(); },
  day(k){ if(S.moving){ return NDM.drop(k); } if(S.day===k){ S.sheet={type:'day'}; renderSheet(); return; } S.day=k; render(); },
  openDay(){ S.sheet={type:'day'}; renderSheet(); },
  openPh(key){ key=decodeURIComponent(key); const f=findItem(key); if(!f) return; const {p,k}=f;
    const x=k==='end'?{startDate:p.deadline, deadline:p.deadline, submitTime:dlTime(p)}:((p.phases||{})[k]||{});
    S.sheet={type:'ph', key, dr:{s:dOnly(x.startDate)||dOnly(x.deadline), e:dOnly(x.deadline)||dOnly(x.startDate), t:x.submitTime||'', done:x.status==='done'}}; renderSheet(); },
  dr(f,n){ const d=S.sheet.dr; d[f]=shift(d[f]||TODAY(),n); if(d.e<d.s) (f==='s'?d.e=d.s:d.s=d.e); renderSheet(); },
  drT(v){ S.sheet.dr.t=v; renderSheet(); }, drDone(){ S.sheet.dr.done=!S.sheet.dr.done; renderSheet(); },
  async savePh(){ const f=findItem(S.sheet.key); if(!f) return; const {p,k}=f, d=S.sheet.dr;
    if(k==='end'){ const r=await writeProj(p.id, q=>{ q.deadline=d.e; q.deadlineTime=d.t||''; }, ()=>['deadline','deadlineTime']); return done(r,'บันทึกวันส่งลูกค้าแล้ว'); }
    let moved=[]; const r=await writeProj(p.id, q=>{ q.phases=q.phases||{}; const x=q.phases[k]=Object.assign({startDate:'',deadline:'',submitTime:'',status:'none'},q.phases[k]||{});
      const oe=dOnly(x.deadline); x.startDate=d.s; x.deadline=d.e; x.submitTime=d.t||''; x.status=d.done?'done':(x.status==='done'?'none':x.status||'none');
      if(oe&&oe!==d.e) moved=chain(q,k,oe,dd(oe,d.e)); }, q=>phFields(q,[k].concat(moved)));
    done(r,'บันทึกแล้ว'+(moved.length?' · หน้าที่ถัดไป '+moved.length+' อันเลื่อนตามให้':'')); },
  async who(sid){ sid=decodeURIComponent(sid); const f=findItem(S.sheet.key); if(!f||!isAdm()) return; const {p,k}=f, P=PHK(k), cur=(p.workers||[]).filter(w=>w&&pre(w)===P.s);
    if(cur.length>1){ toastM('งานนี้มีหลายคน — เปลี่ยนในหน้าแก้โปรเจกต์บนคอม','warn'); return; }
    if(cur.length===1&&(cur[0].status==='paid'||cur[0].voucherNo||cur[0].confirmStatus==='confirmed')){ toastM('คนเดิมยืนยันยอด/จ่ายแล้ว เปลี่ยนไม่ได้','warn'); return; }
    const nm=nick(sid); if(!confirm(cur.length?'เปลี่ยนคนทำ '+P.name+' จาก "'+nick(cur[0].id)+'" เป็น "'+nm+'"?':'เพิ่ม "'+nm+'" เป็นคนทำ '+P.name+'?')) return;
    const r=await safe(()=>saveProjectMerge(p.id, q=>{ q.workers=q.workers||[]; const w=q.workers.find(x=>x&&pre(x)===P.s);
      if(w){ w.id=sid; w.status='pending'; w.confirmStatus='none'; delete w.confirmAmount; delete w.confirmSentAt; delete w.confirmRejectReason; delete w.confirmAskAmount; }
      else q.workers.push({id:sid, slot:P.s+'-'+(P.s==='dub'?'main':'only'), amount:0, ratePerUnit:0, unit:'งาน', qty:0, status:'pending', note:'', comment:''}); }), Promise.resolve({ok:false}));
    if(r&&r.ok){ toastM('บันทึกคนทำแล้ว'+(cur.length?'':' · อย่าลืมใส่ค่าจ้าง')); S.sheet=null; render(); } else toastM('บันทึกไม่สำเร็จ','error'); },
  drop(k){ const mv=S.moving; S.moving=null; const f=findItem(mv.key); if(!f){ render(); return; } const {p,k:ph}=f, x=(p.phases||{})[ph]||{}, oe=dOnly(x.deadline)||dOnly(x.startDate), delta=dd(oe,k);
    if(!delta){ render(); return; } let moved=[];
    writeProj(p.id, q=>{ const y=q.phases[ph]; const o=dOnly(y.deadline)||dOnly(y.startDate); if(y.startDate) y.startDate=shift(y.startDate,delta); y.deadline=shift(o,delta); moved=chain(q,ph,o,delta); }, q=>phFields(q,[ph].concat(moved)))
      .then(r=>done(r,'ย้าย '+mv.label+' ไปส่ง '+thD(k)+' แล้ว'+(moved.length?' · หน้าที่ถัดไปเลื่อนตาม '+moved.length+' อัน':''))); S.day=k; render(); },
  stopMv(){ S.moving=null; render(); },
  // โปรเจกต์
  openProj(pid){ pid=decodeURIComponent(pid); const p=projs().find(x=>x.id===pid); if(!p) return;
    S.sheet={type:'proj', pid, t:'info', dr:{dl:dOnly(p.deadline), tm:dlTime(p), rate:p.budgetRate||p.budget||'', cut:+p.clientDedPct||'', note:p.note||'', done:pDone(p)?1:0, amt:{}}}; renderSheet(); },
  pt(t){ S.sheet.t=t; renderSheet(); },
  pv(k,v,quiet){ S.sheet.dr[k]=k==='done'?!!+v:v; if(!quiet) renderSheet(); else if(k==='rate'||k==='cut'){ const p=projs().find(x=>x.id===S.sheet.pid), d=S.sheet.dr, el=$('ndm-psum'); if(p&&el){ const g=safe(()=>calcBudgetTotal(+d.rate||0,p.budgetType||'flat',+p.duration||0,+p.budgetQty||0),+d.rate||0), net=Math.round(g*(1-(+d.cut||0)/100)); el.querySelectorAll('b')[0].textContent=B(net); el.querySelectorAll('b')[1].textContent=B(net-cost(p)); } } },
  pam(i,v){ S.sheet.dr.amt[i]=v; },
  async saveProj(){ const d=S.sheet.dr, pid=S.sheet.pid;
    const r=await safe(()=>saveProjectMerge(pid, q=>{
      q.deadline=d.dl||q.deadline; q.deadlineTime=d.tm||''; q.note=d.note;
      if(d.done&&!pDone(q)) q.projStatus='done'; else if(!d.done&&q.projStatus==='done') q.projStatus='inprogress';
      if(isAdm()){ const rate=+d.rate||0, cut=Math.min(100,Math.max(0,+d.cut||0)); if(rate!==(+q.budgetRate||0)||cut!==(+q.clientDedPct||0)){ const t=q.budgetType||'flat';
          const g=Math.round(safe(()=>calcBudgetTotal(rate,t,+q.duration||0,+q.budgetQty||0),rate)); q.budgetRate=rate; q.budgetGross=g; q.clientDedPct=cut; q.budget=Math.round(g*(1-cut/100)); }
        Object.keys(d.amt).forEach(i=>{ const w=(q.workers||[])[+i]; if(!w||w.status==='paid'||w.voucherNo||w.confirmStatus==='confirmed') return; const a=Math.round(+d.amt[i]||0);
          if(a!==(+w.amount||0)){ w.amount=a; if(w.confirmStatus==='sent'||w.confirmStatus==='rejected') w.confirmStatus='none'; } }); }
    }), Promise.resolve({ok:false}));
    done(r,'บันทึกโปรเจกต์แล้ว'); },
  // มอบหมายงาน
  av(k,v,re){ S.asg[k]=k==='mgr'?decodeURIComponent(v):v; if(k==='pre'||k==='no'){ const h=$('ndm-a-hint'); if(h) h.textContent=codeHint(); } if(re) render(); },
  async assign(){ const a=S.asg, c=codeOf(); if(!c){ a.err=1; render(); toastM('ต้องใส่รหัสงานก่อน','warn'); return; }
    if(!a.mgr){ toastM('เลือกผู้รับผิดชอบก่อน','warn'); return; }
    if(projs().some(p=>code(p)===c.code)&&!confirm('รหัส '+c.code+' มีอยู่แล้ว — สร้างซ้ำเลยไหม?')) return;
    const today=TODAY(), id='P'+Date.now();
    const proj={id, name:String(a.name||'').trim()||c.code, date:today, startDate:today, deadline:a.dl||'', deadlineTime:a.tm||'', clientCode:c.pre, seq:c.seq, episodes:0,
      client:String(a.url||'').trim(), downloadLink:'', workLinks:[], note:String(a.note||'').trim(), managerId:a.mgr, workers:[], tax:{}, evidenceLogs:[], snapshot:null, createdAt:new Date().toISOString(), phases:{}};
    try{ safe(()=>showLoader(true)); await saveProjectDB(proj);
      if(a.mgr!==safe(()=>CU().uid,'')) try{ await addNotification({type:'project', title:'📁 คุณได้รับมอบหมายโปรเจกต์ "'+(proj.name)+'"', text:(proj.note||'')+(proj.deadline?' · ส่งลูกค้า '+thD(proj.deadline):''), recipientUid:a.mgr, projId:id}); }catch(e){}
      try{ logAudit('project.create', proj.name, 'มอบหมายจากมือถือ → '+mgrName(a.mgr)); }catch(e){}
      toastM('ส่ง '+c.code+' ให้ '+mgrName(a.mgr)+' แล้ว');
      const dc=a.dc; S.asg={mgr:a.mgr}; render();
      if(dc) setTimeout(()=>{ try{ createProjRoom(id); }catch(e){ toastM('สร้างห้อง Discord ไม่สำเร็จ — ทำในคอมได้','warn'); } },600);
    }catch(e){ toastM('บันทึกไม่สำเร็จ: '+(e.message||e),'error'); } finally{ safe(()=>showLoader(false)); } },
  // เอกสาร
  newDoc(k){ S.docSel={}; S.sheet={type:'doc', k}; renderSheet(); }, ds(pid){ pid=decodeURIComponent(pid); S.docSel[pid]=!S.docSel[pid]; renderSheet(); }, dc(v){ S.sheet.client=v; },
  docGo(draft){ const k=S.sheet.k, ids=Object.keys(S.docSel).filter(x=>S.docSel[x]); if(!ids.length){ toastM('เลือกโปรเจกต์อย่างน้อย 1 งาน','warn'); return; }
    const cl=S.sheet.client; NDM.offMode(true);
    try{ window.nav('docs'); const t=document.querySelector(`#docs-main-tabs .tab[onclick*="'${k==='inv'?'invoice':'client'}'"]`); switchDocsMain(k==='inv'?'invoice':'client', t||undefined);
      k==='inv'?cancelInvEdit(true):cancelQtEdit(true);
      if(k==='inv'){ window._invPickSelected=new Set(ids); confirmInvPPAdd(); } else { window._qtPickSelected=new Set(ids); confirmQtPPAdd(); }
      if(cl){ const el=$(k+'-client'); if(el){ el.value=cl; try{ _cliFill(k); }catch(e){} } }
      if(draft){ k==='inv'?saveInvoiceDraft():saveQuotationDraft(); setTimeout(()=>NDM.onMode(),400); }
    }catch(e){ toastM('เปิดฟอร์มไม่สำเร็จ: '+e.message,'error'); } },
  openDoc(k,no){ no=decodeURIComponent(no); NDM.offMode(true); try{ window.nav('docs'); k==='inv'?editInvoice(no):editQuotation(no); }catch(e){} },
  // ทีมงาน
  job(pid,slot){ S.sheet={type:'job', pid:decodeURIComponent(pid), slot:decodeURIComponent(slot)}; renderSheet(); },
  async cfYes(pid,wid,slot){ await safe(()=>staffConfirmYes(decodeURIComponent(pid),decodeURIComponent(wid),decodeURIComponent(slot))); render(); },
  cfNo(pid,wid,slot){ S.sheet={type:'rej', pid:decodeURIComponent(pid), wid:decodeURIComponent(wid), slot:decodeURIComponent(slot)}; renderSheet(); setTimeout(()=>$('ndm-rj-amt')?.focus(),80); },
  async cfSend(){ const sh=S.sheet, amt=String($('ndm-rj-amt')?.value||'').replace(/,/g,'').trim(), why=String($('ndm-rj-why')?.value||'').trim(), ask=Number(amt);
    if(amt===''||!isFinite(ask)||ask<0){ toastM('กรอกยอดที่ถูกก่อน','warn'); return; } if(!why){ toastM('กรอกเหตุผลก่อน','warn'); return; }
    const ok=await safe(()=>_updateWorkerConfirm(sh.pid, sh.wid, sh.slot, {confirmStatus:'rejected', confirmRespondedAt:new Date().toISOString(), confirmRejectReason:why, confirmAskAmount:Math.round(ask)}), Promise.resolve(false));
    if(!ok){ toastM('ส่งไม่สำเร็จ','error'); return; }
    try{ const p=projs().find(x=>x.id===sh.pid); await addNotificationToAdmins({type:'payment', title:'❌ '+(nick(sh.wid)||'ทีมงาน')+' แจ้งยอดไม่ถูก', text:(p?disp(p):'')+' · ขอ '+B(ask)+' · '+why, projId:sh.pid}); }catch(e){}
    toastM('ส่งให้แอดมินตรวจแล้ว'); S.sheet=null; render(); },
  // To-do
  async todoAdd(){ const el=$('ndm-todo'), v=String(el&&el.value||'').trim(); if(!v) return; const db=DB(), uid=safe(()=>CU().uid,''); if(!db||!uid) return;
    const id=Date.now().toString(36)+Math.random().toString(36).slice(2,6); try{ await db.ref('privcal/'+uid+'/todos/'+id).set({id, text:v, done:false, at:new Date().toISOString(), due:S.day}); el.value=''; }catch(e){ toastM('บันทึกไม่สำเร็จ','error'); } },
  async todoTog(id){ id=decodeURIComponent(id); const t=(TODO||{})[id]; if(!t) return; const db=DB(), uid=safe(()=>CU().uid,''); try{ await db.ref('privcal/'+uid+'/todos/'+id+'/done').set(!t.done); }catch(e){} },
  // สลับโหมด
  full(go, pid){ NDM.offMode(true); try{
    if(go==='proj'&&pid) openEditProject(decodeURIComponent(pid));
    else if(go==='profile') window.nav('nd-profile'); else if(go==='docs-me') window.nav('nd-docs');
    else if(go) window.nav(go); }catch(e){} },
  offMode(temp){ try{ sessionStorage.setItem(OFFK,'1'); }catch(e){} if(ROOT) ROOT.style.display='none'; pill(true); document.documentElement.style.overflow=''; },
  onMode(){ try{ sessionStorage.removeItem(OFFK); }catch(e){} pill(false); show(); },
  logout(){ if(!confirm('ออกจากระบบ?')) return; safe(()=>doLogout()); }
};
function done(r,msg){ if(r&&r.ok){ toastM(msg); S.sheet=null; render(); } else toastM('บันทึกไม่สำเร็จ'+(r&&r.error?': '+(r.error.message||r.error):''),'error'); }

/* ── ปุ่มลอย "📱 โหมดมือถือ" ตอนเปิดเว็บแบบเต็ม ── */
function pill(on){ let b=$('ndm-pill'); if(!on){ b&&b.remove(); return; } if(b||!small()) return; b=document.createElement('button'); b.id='ndm-pill'; b.textContent='📱 โหมดมือถือ'; b.onclick=()=>NDM.onMode(); document.body.appendChild(b); }

/* ── เริ่มทำงาน ── */
function show(){ if(!ROOT){ const st=document.createElement('style'); st.id='ndm-css'; st.textContent=CSS; document.head.appendChild(st);
    ROOT=document.createElement('div'); ROOT.id='ndm'; document.body.appendChild(ROOT); bindHold(); }
  if(!S.tab||!tabsOf().some(x=>x[0]===S.tab)&&S.tab!=='approve') S.tab=tabsOf()[0][0];
  ROOT.style.display='flex'; render(); }
function tick(){ if(!ready()){ if(ROOT&&!CU()){ ROOT.style.display='none'; S.tab=''; } return; }
  if(!small()){ if(ROOT&&ROOT.style.display!=='none') ROOT.style.display='none'; pill(false); return; }
  if(off()){ if(ROOT) ROOT.style.display='none'; pill(true); return; }
  if(!ROOT||ROOT.style.display==='none') show(); }
setInterval(tick, 700); setTimeout(tick, 300);
window.addEventListener('resize', ()=>setTimeout(tick,100));
window.addEventListener('guindatachange', e=>{ const k=e&&e.detail&&e.detail.key; if(ROOT&&ROOT.style.display!=='none'&&/projects|staff|docs|mgr_|payroll/.test(String(k||''))) soft(); });
// เปิดกลับมาที่แท็บ → วาดใหม่ (ข้อมูลอาจเปลี่ยน)
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden&&ROOT&&ROOT.style.display!=='none') soft(); });
})();
