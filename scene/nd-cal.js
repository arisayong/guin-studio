/* ══════════════════════════════════════════════════════════════
   📅 nd-cal.js — "ติดตามงาน" = ปฏิทินกลางของบริษัท (หน้าเดียว แบบ Google Calendar)
   ─ ซ้าย: 🙋 ปฏิทินของฉัน (แท็ก · To-do · คนอื่นไม่เห็น) · 🏢 ปฏิทินทีม (งานของฉัน · งานทั้งทีม · อีเวนต์)
   ─ โปรเจกต์ = กรอบฟ้าใส 1 กล่อง · ข้างในเป็นช่วงหน้าที่สีพาสเทล (ต่อกัน = เส้นเดียว · คาบเกี่ยว = แยกเส้น) + ชื่อคนรับผิดชอบ
   ─ วัน/เวลาโปรเจกต์อ่าน-เขียน p.startDate · p.deadline · p.phases[*] ชุดเดียวกับหน้าโปรเจกต์/วางแผนงาน (saveProjectMerge)
   ─ แก้วัน/สถานะเสร็จของโปรเจกต์: แอดมิน · เมเนเจอร์ · พนักงาน (Rules v7) · อีเวนต์ทีมแก้ได้: คนสร้าง + แอดมิน · ของส่วนตัวแก้ได้คนเดียว
   ข้อมูล: teamcal/events/<id> · privcal/<uid>/{events,todos,tags}   (Firebase Rules v6)
   ══════════════════════════════════════════════════════════════ */
(function(){
const $=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(f,d)=>{ try{ const v=f(); return v==null?d:v; }catch(e){ return d; } };
const CU=()=>safe(()=>currentUser,null), DB=()=>safe(()=>_fbDatabase,null);
const role=()=>safe(()=>CU().role,'');
const canSee=()=>{ const u=CU(); return !!u && (u.role==='admin'||u.role==='manager'||u.acct===true||u.emp===true); };
const isAdm=()=>role()==='admin';
// ✏️ แก้วัน/เวลา/สถานะเสร็จของโปรเจกต์ได้: แอดมิน · เมเนเจอร์ · พนักงานบริษัท (ช่วยกันทำงาน — Rules v7 เปิดเฉพาะช่องวัน/สถานะ)
const canProj=()=>{ const u=CU(); return !!u && (u.role==='admin'||u.role==='manager'||u.emp===true); };
const canOpenProj=()=>role()==='admin'||role()==='manager';
// บันทึก: แอดมิน = saveProjectMerge (ทั้งก้อน) · คนอื่น = update เฉพาะช่องที่ Rules v7 อนุญาต
async function projWrite(pid, apply, fields){ if(isAdm()||!DB()) return await safe(()=>saveProjectMerge(pid, apply), Promise.resolve({ok:false}));
  const P=PROJ.find(x=>x.id===pid)||{}, me=ME(), up={}; apply(P); P.updatedAt=new Date().toISOString(); P._lastSavedBy=me;
  fields(P).forEach(k=>{ const v=k.split('/').reduce((o,x)=>o==null?o:o[x],P); up['projects/'+pid+'/'+k]=v===undefined?null:v; });
  up['projects/'+pid+'/updatedAt']=P.updatedAt; up['projects/'+pid+'/_lastSavedBy']=me;
  try{ await DB().ref().update(up); safe(()=>_notifyProjectChange()); return {ok:true}; }catch(e){ return {ok:false, error:e}; } }
const ME=()=>{ const u=CU()||{}; return u.nickname||u.name||u.email||''; };
const pad=n=>String(n).padStart(2,'0'), ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const pd=s=>{ const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return null; let y=+m[1]; if(y>2400) y-=543; return new Date(y,+m[2]-1,+m[3]); };
const dOnly=s=>{ const d=pd(s); return d?ymd(d):''; };
const addD=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; }, shift=(s,n)=>ymd(addD(pd(s),n));
const dd=(a,b)=>Math.round((pd(b)-pd(a))/864e5), TODAY=()=>ymd(new Date());
const TM=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'], TMF=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'], WD=['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
const thD=s=>{ const d=pd(s); return d?d.getDate()+' '+TM[d.getMonth()]:'—'; };
const ago=t=>{ if(!t) return ''; const m=Math.round((Date.now()-t)/6e4); return m<1?'เมื่อสักครู่':m<60?m+' นาทีที่แล้ว':m<1440?Math.round(m/60)+' ชม.ที่แล้ว':Math.round(m/1440)+' วันที่แล้ว'; };
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const tmin=s=>{ const [h,m]=String(s||'0:0').split(':').map(Number); return (h||0)*60+(m||0); }, tstr=m=>pad(Math.floor(m/60))+':'+pad(m%60);
const frac=t=>t?Math.min(1,Math.max(.12,tmin(t)/1440)):1;
// ตัวหนังสือบนพื้นสี: สีอ่อน → ตัวเข้ม · สีเข้ม → ตัวขาว
const tcOf=hex=>{ const h=String(hex||'').replace('#',''); if(h.length<6) return '#fff'; const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255); return (0.2126*r+0.7152*g+0.0722*b)>0.55?'#1d2733':'#fff'; };

/* หน้าที่ในโปรเจกต์ (ลำดับงาน) — สีพาสเทลไล่ต่อกัน · s = prefix ของ slot ใน p.workers */
const PH=[{k:'translation',s:'trn',name:'แปล',color:'#F9C6DB'},{k:'adaptation',s:'adp',name:'บท',color:'#FFC9BC'},{k:'dubbing',s:'dub',name:'พากย์',color:'#FFE2A8'},
          {k:'mix',s:'mix',name:'มิกซ์',color:'#CDEDC4'},{k:'qc',s:'qc',name:'QC',color:'#C2E2F7'},{k:'subVideo',s:'sub',name:'ซับ',color:'#DCD0F6'}];
const TEAM_CATS=[{id:'meet',name:'ประชุม / มีตติ้ง',color:'#0487E2'},{id:'off',name:'วันหยุด / ลา',color:'#65C2F5'},{id:'tax',name:'ส่งภาษี / บัญชี',color:'#09B1EC'},{id:'other',name:'อื่น ๆ',color:'#0463CA'}];
const PALETTE=['#D50000','#E67C73','#F4511E','#F6BF26','#33B679','#0B8043','#039BE5','#3F51B5','#7986CB','#8E24AA','#616161'];
const DEF_TAGS={t1:{name:'ส่วนตัว',color:'#8E24AA'},t2:{name:'งาน',color:'#F4511E'}};

/* ── สถานะ ── */
const LSK='guin3_cal_v2';
const ST=Object.assign({view:'month', cur:new Date(), open:{me:true,team:true},
  L:{me:true, tags:{}, todo:true, teamOn:true, mine:true, all:true, events:true}}, safe(()=>{ const x=JSON.parse(localStorage.getItem(LSK)); return x?{view:x.view||'month', open:x.open||{me:true,team:true}, L:x.L}:null; },{}));
ST.cur=new Date(); ST.cur.setHours(0,0,0,0);
const saveST=()=>{ try{ localStorage.setItem(LSK, JSON.stringify({view:ST.view, open:ST.open, L:ST.L})); }catch(e){} };
const D={team:{}, mine:{}, todo:{}, tags:null, live:false, proj:null, projAt:0};
let PROJ=[];

/* ── Firebase ── */
const myUid=()=>safe(()=>CU().uid,'');
const path=k=>k==='team'?'teamcal/events':k==='ttags'?'teamcal/tags':'privcal/'+myUid()+'/'+(k==='mine'?'events':k==='todo'?'todos':'tags');
function attach(){ if(D.live) return; D.live=true; const db=DB();
  if(!db){ ['team','mine','todo','tags','ttags'].forEach(k=>{ D[k]=safe(()=>JSON.parse(localStorage.getItem('guin3_cal_'+k)),null)||(/tags/.test(k)?null:{}); }); return; }
  ['team','mine','todo','tags','ttags'].forEach(k=>{ try{ db.ref(path(k)).on('value', sn=>{ D[k]=sn.val()||(/tags/.test(k)?null:{}); D['err_'+k]=''; if(visible()) render(); }, e=>{ D['err_'+k]=String(e&&e.message||e); if(visible()) render(); }); }catch(e){} }); }
async function put(k, obj, id){ const db=DB(); if(/tags/.test(k)) D[k]=obj; else D[k][id]=obj;
  if(!db){ try{ localStorage.setItem('guin3_cal_'+k, JSON.stringify(D[k])); }catch(e){} return; }
  try{ await db.ref(path(k)+(/tags/.test(k)?'':'/'+id)).set(obj); }catch(e){ safe(()=>toast('บันทึกไม่สำเร็จ: '+e.message+(k==='team'?' (ต้องวาง Firebase Rules v6)':''),'error')); throw e; } }
async function del(k, id){ const db=DB(); delete D[k][id]; if(!db){ try{ localStorage.setItem('guin3_cal_'+k, JSON.stringify(D[k])); }catch(e){} return; }
  try{ await db.ref(path(k)+'/'+id).remove(); }catch(e){ safe(()=>toast('ลบไม่สำเร็จ: '+e.message,'error')); } }
async function projects(force){ if(role()==='admin'||role()==='manager'||!DB()) return safe(()=>getProjects(),[])||[];
  if(!force && D.proj && Date.now()-D.projAt<5*60e3) return D.proj;
  try{ const sn=await DB().ref('projects').get(); D.proj=Object.values(sn.val()||{}).filter(Boolean); D.projAt=Date.now(); }catch(e){ D.proj=safe(()=>getProjects(),[])||[]; }
  return D.proj; }
const tags=()=>D.tags||DEF_TAGS;
// 🏷️ แท็กทีม: ทุกคนในทีมเพิ่ม/แก้/เลือกสีได้ · มีแท็กย่อยได้ 1 ชั้น (เช่น งาน › พากย์ · งาน › มิกซ์)
const DEF_TT={meet:{name:'ประชุม / มีตติ้ง',color:'#0487E2'},work:{name:'งาน',color:'#0463CA'},off:{name:'วันหยุด / ลา',color:'#65C2F5'},tax:{name:'ส่งภาษี / บัญชี',color:'#09B1EC'},other:{name:'อื่น ๆ',color:'#7BAAF7'}};
const TGS=sc=>sc==='team'?(D.ttags||DEF_TT):tags(), TK=sc=>sc==='team'?'ttags':'tags', LK=sc=>sc==='team'?'tt':'tags';
function tagTree(sc){ const T=TGS(sc), ids=Object.keys(T), top=ids.filter(id=>!T[id].parent||!T[T[id].parent]); return top.map(id=>({id, t:T[id], kids:ids.filter(k=>T[k].parent===id).map(k=>({id:k, t:T[k]}))})); }
function tagFull(sc,id){ const T=TGS(sc), t=T[id]; if(!t) return ''; const p=t.parent&&T[t.parent]; return (p?p.name+' › ':'')+t.name; }
function tagOn(sc,id){ const L=ST.L[LK(sc)]||{}, T=TGS(sc), t=T[id]; if(L[id]===false) return false; return !(t&&t.parent&&L[t.parent]===false); }

/* ── แปลงข้อมูลจริง → รายการในปฏิทิน ── */
const staffNick=id=>{ const s=safe(()=>getStaffById(id),null); return s?(s.nickname||s.name||''):''; };
function dlTime(p){ const d=String(p.deadline||''); return p.deadlineTime||(d.includes('T')?d.slice(11,16):''); }
function toProj(p){ if(!p||!p.id||p.projStatus==='cancelled') return null;
  const me=safe(()=>CU().staffId,''), ws=p.workers||[], phases={};
  PH.forEach(P=>{ const x=(p.phases||{})[P.k]; if(!x) return; const s=dOnly(x.startDate)||dOnly(x.deadline), e=dOnly(x.deadline)||s; if(!s) return;
    phases[P.k]={start:s, end:e<s?s:e, time:x.submitTime||'', done:x.status==='done',
      who:[...new Set(ws.filter(w=>w&&String(w.slot||'').split('-')[0]===P.s).map(w=>staffNick(w.id)).filter(Boolean))]}; });
  const ks=Object.values(phases), pStart=dOnly(p.startDate||p.date)||(ks.map(x=>x.start).sort()[0]||''), pEnd=dOnly(p.deadline)||(ks.map(x=>x.end).sort().pop()||pStart);
  if(!pStart&&!pEnd) return null;
  const it={id:'p:'+p.id, pid:p.id, kind:'proj', scope:'team', title:safe(()=>projDisp(p),p.name||''), pStart:pStart||pEnd, pEnd:pEnd<pStart?pStart:pEnd, endTime:dlTime(p), phases,
    owner:staffNick(p.managerId), done:p.projStatus==='done'||p.projStatus==='paid', st:p.projStatus||'', edBy:p._lastSavedBy||'', at:Date.parse(p.updatedAt||'')||0,
    mine:!!me&&(p.managerId===me||ws.some(w=>w&&w.id===me))};
  const all=[it.pStart, ...ks.map(x=>x.start)].sort(), ends=[it.pEnd, ...ks.map(x=>x.end)].sort(); it.start=all[0]; it.end=ends[ends.length-1]; return it; }
const phList=p=>PH.filter(x=>p.phases[x.k]).map(x=>({...x, ...p.phases[x.k]}));
function phLines(p){ const L=[]; phList(p).sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)).forEach(x=>{ const i=L.findIndex(l=>x.start>=l[l.length-1].end); if(i<0) L.push([x]); else L[i].push(x); }); return L; }
const evOf=(k,e)=>({...e, id:(k==='team'?'t:':'m:')+e.id, rid:e.id, kind:'event', scope:k==='team'?'team':'me', end:e.end&&e.end>=e.start?e.end:e.start, edBy:e.updBy||e.byName||'', at:Date.parse(e.upd||e.at||'')||0});
let EV=[];
function build(){ EV=PROJ.map(toProj).filter(Boolean).concat(Object.values(D.team).filter(e=>e&&e.start).map(e=>evOf('team',e)), Object.values(D.mine).filter(e=>e&&e.start).map(e=>evOf('mine',e))); }
function visible_(){ const L=ST.L; return EV.filter(e=>{
    if(e.scope==='me') return L.me && tagOn('me',e.tag);
    if(!L.teamOn) return false;
    if(e.kind==='proj') return L.all || (L.mine && e.mine);
    return L.events && (!e.cat || !TGS('team')[e.cat] || tagOn('team',e.cat)); })
  .concat(L.me&&L.todo?Object.values(D.todo).filter(t=>t&&t.due).map(t=>({id:'d:'+t.id, rid:t.id, kind:'todo', scope:'me', title:'☑ '+t.text, start:t.due, end:t.due, done:!!t.done})):[]); }
const findAny=id=>EV.find(x=>x.id===id)||(String(id).startsWith('d:')&&D.todo[id.slice(2)]?{id, rid:id.slice(2), kind:'todo', scope:'me', title:'☑ '+D.todo[id.slice(2)].text, start:D.todo[id.slice(2)].due, end:D.todo[id.slice(2)].due}:null);
const canEdit=e=>!e?false:e.kind==='todo'||e.scope==='me'?true:e.kind==='proj'?canProj():(isAdm()||!(D.team[e.rid]||{}).by||(D.team[e.rid]||{}).by===myUid());
const colorOf=e=>e.kind==='todo'?'#FBBC04':e.scope==='me'?((tags()[e.tag]||{}).color||'#8E24AA'):((TGS('team')[e.cat]||TEAM_CATS.find(c=>c.id===e.cat)||{}).color||e.color||'#0487E2');

/* ── CSS (ขอบเขต #page-nd-cal + ป๊อปอัปขึ้นต้น .c-) ── */
const CSS=`
#page-nd-cal{--cl-line:var(--border2);--cl-hov:rgba(101,194,245,.09)}
.c-app{display:grid;grid-template-columns:250px minmax(0,1fr);border:1px solid var(--cl-line);border-radius:14px;background:var(--card);overflow:hidden;height:calc(100vh - 150px);min-height:560px;user-select:none}
@media(max-width:860px){.c-app{grid-template-columns:1fr;height:auto}.c-side{order:2;border-right:none!important;border-top:1px solid var(--cl-line)}}
.c-side{border-right:1px solid var(--cl-line);padding:14px 12px;overflow:auto;font-size:13px}
.c-create{display:inline-flex;gap:10px;align-items:center;padding:11px 20px;border-radius:16px;background:var(--bg2);border:1px solid var(--cl-line);color:var(--text);font-family:Kanit;font-size:14.5px;font-weight:600;cursor:pointer}
.c-create:hover{border-color:#65C2F5} .c-create b{font-size:22px;line-height:0;color:#0487E2}
.c-mini{margin:14px 0 6px} .c-mini-h{display:flex;align-items:center;font-weight:600;margin-bottom:4px} .c-mini-h span{flex:1} .c-mini-h button{background:none;border:none;color:var(--text2);cursor:pointer;font-size:15px;padding:2px 6px}
.c-mini-g{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:11px} .c-mini-g div{padding:4px 0;border-radius:50%;cursor:pointer}
.c-mini-g .w{color:var(--text2);cursor:default} .c-mini-g .o{opacity:.4} .c-mini-g .t{background:#0487E2;color:#fff} .c-mini-g div:not(.w):hover{background:var(--cl-hov)}
.c-grp{margin-top:12px} .c-gh{display:flex;align-items:center;gap:8px;font-weight:600;font-size:13.5px;padding:6px 4px;border-radius:8px} .c-gh:hover{background:var(--cl-hov)}
.c-car{width:16px;text-align:center;cursor:pointer;color:var(--text2);font-size:11px;transition:.15s} .c-grp.closed .c-car{transform:rotate(-90deg)} .c-grp.closed .c-gb{display:none}
.c-row{display:flex;align-items:center;gap:9px;padding:5px 6px;border-radius:8px;cursor:pointer;position:relative} .c-row:hover{background:var(--cl-hov)}
.c-row input,.c-gh input{display:none} .c-ck{width:17px;height:17px;border-radius:4px;border:2px solid var(--c);display:inline-flex;align-items:center;justify-content:center;flex:none}
input:checked+.c-ck{background:var(--c)} input:checked+.c-ck::after{content:'✓';color:#fff;font-size:11px;font-weight:700}
.c-act{margin-left:auto;display:none;gap:2px} .c-row:hover .c-act{display:flex} .c-act button{background:none;border:none;color:var(--text2);cursor:pointer;font-size:12px;padding:1px 4px;border-radius:5px}
.c-sub{padding-left:24px} .c-sub.off{opacity:.38;pointer-events:none} .c-note{font-size:11px;color:var(--text2);padding:0 6px 5px 32px;line-height:1.45}
.c-addtag{font-size:12.5px;color:#0487E2;cursor:pointer;padding:5px 6px;border-radius:8px} .c-addtag:hover{background:var(--cl-hov)}
.c-todo{display:flex;gap:8px;align-items:flex-start;padding:3px 6px} .c-todo.done span{text-decoration:line-through;color:var(--text2)} .c-todo input{accent-color:#0487E2;margin-top:3px}
.c-todo button{margin-left:auto;background:none;border:none;color:var(--text2);cursor:pointer;opacity:0} .c-todo:hover button{opacity:1}
.c-tin{width:100%;box-sizing:border-box;background:var(--bg2);border:1px solid var(--cl-line);border-radius:8px;color:var(--text);padding:7px 9px;font-family:Kanit;font-size:13px}
.c-main{display:flex;flex-direction:column;min-width:0;min-height:0}
.c-top{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--cl-line);flex-wrap:wrap}
.c-ttl{font-size:20px;font-weight:500;margin-left:6px} .c-btn{background:none;border:1px solid var(--cl-line);color:var(--text);border-radius:18px;padding:6px 15px;font-family:Kanit;cursor:pointer} .c-btn:hover{background:var(--cl-hov)}
.c-ib{background:none;border:none;color:var(--text);font-size:20px;width:34px;height:34px;border-radius:50%;cursor:pointer} .c-ib:hover{background:var(--cl-hov)}
.c-seg{margin-left:auto;display:inline-flex;border:1px solid var(--cl-line);border-radius:18px;overflow:hidden} .c-seg button{background:none;border:none;color:var(--text2);padding:6px 15px;font-family:Kanit;cursor:pointer} .c-seg button.on{background:rgba(4,135,226,.18);color:var(--text);font-weight:600}
.c-month{flex:1;overflow:auto} .c-wdh{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-bottom:1px solid var(--cl-line);position:sticky;top:0;background:var(--card);z-index:4} .c-wdh div{text-align:center;font-size:11px;color:var(--text2);padding:6px 0}
.c-wk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-bottom:1px solid var(--cl-line);min-height:118px}
.c-cell{grid-row:1/-1;border-right:1px solid var(--cl-line);padding:4px 0 2px;min-width:0;position:relative} .c-cell:nth-child(7){border-right:none} .c-cell.out .c-dn{opacity:.4} .c-cell.drop{background:rgba(4,135,226,.13)}
.c-dn{text-align:center;font-size:12px;height:24px;white-space:nowrap} .c-dn b{display:inline-flex;min-width:24px;padding:0 4px;height:24px;align-items:center;justify-content:center;border-radius:12px;font-weight:500}
.c-cell.today .c-dn b{background:#0487E2;color:#fff}
.c-plus{position:absolute;top:3px;right:5px;width:22px;height:22px;border-radius:50%;border:none;background:rgba(4,135,226,.16);color:#0487E2;padding:0;cursor:pointer;opacity:0;transition:.12s}
.c-plus::before,.c-plus::after{content:'';position:absolute;left:50%;top:50%;width:10px;height:2px;border-radius:1px;background:currentColor;transform:translate(-50%,-50%)} .c-plus::after{transform:translate(-50%,-50%) rotate(90deg)} .c-cell:hover .c-plus{opacity:1}
.c-ev{z-index:2;margin:1px 4px;font-size:12px;line-height:18px;height:20px;padding:0 6px;border-radius:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;position:relative;min-width:0;align-self:center;touch-action:none}
.c-ev.bar{background:var(--c);color:var(--tc);font-weight:500} .c-ev.dot::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:6px;vertical-align:1px}
.c-ev:hover{filter:brightness(1.08)} .c-ev.dot:hover{background:var(--cl-hov)} .c-ev.l{border-top-left-radius:0;border-bottom-left-radius:0;margin-left:0} .c-ev.r{border-top-right-radius:0;border-bottom-right-radius:0;margin-right:0}
.c-ev.done{opacity:.55;text-decoration:line-through} .c-ev.dragging,.c-phs.dragging{opacity:.35}
.c-rz,.c-rzl{position:absolute;top:0;bottom:0;width:9px;cursor:ew-resize} .c-rz{right:0} .c-rzl{left:0}
.c-more{z-index:2;font-size:12px;color:var(--text2);padding:0 8px;cursor:pointer;align-self:center;font-weight:500} .c-more:hover{color:var(--text)}
.c-pb{z-index:2;margin:1px 3px;border-radius:8px;background:rgba(4,135,226,.13);border:1.5px solid rgba(101,194,245,.65);display:flex;flex-direction:column;gap:2px;padding:2px 3px 3px;min-width:0}
[data-theme="light"] .c-pb{background:rgba(176,214,245,.28);border-color:#65C2F5}
.c-pb.l{border-top-left-radius:0;border-bottom-left-radius:0;border-left:none;margin-left:0} .c-pb.r{border-top-right-radius:0;border-bottom-right-radius:0;border-right:none;margin-right:0} .c-pb.done{opacity:.55}
.c-pbh{height:18px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#65C2F5;white-space:nowrap;overflow:hidden;padding:0 4px;cursor:pointer}
[data-theme="light"] .c-pbh{color:#0463CA} .c-pbh .fin{margin-left:auto;font-size:10.5px;font-weight:500;background:rgba(4,135,226,.18);border-radius:4px;padding:0 5px;flex:none}
.c-pbl{height:18px;position:relative}
.c-phs{position:absolute;top:0;bottom:0;border-radius:5px;background:var(--c);color:#1d2733;font-size:11px;display:flex;align-items:center;gap:4px;padding:0 6px;overflow:hidden;white-space:nowrap;cursor:grab;touch-action:none;min-width:6px}
.c-phs .nm{font-weight:600;flex:none} .c-phs .who{opacity:.85;overflow:hidden;text-overflow:ellipsis;min-width:0} .c-phs .tm{margin-left:auto;font-size:10.5px;opacity:.85;flex:none}
.c-phs.cl{border-top-left-radius:0;border-bottom-left-radius:0} .c-phs.cr{border-top-right-radius:0;border-bottom-right-radius:0} .c-phs.joinL{border-top-left-radius:0;border-bottom-left-radius:0;box-shadow:inset 1px 0 0 rgba(0,0,0,.25)}
.c-phs .h{position:absolute;top:0;bottom:0;width:8px;cursor:ew-resize} .c-phs .h.l{left:0} .c-phs .h.r{right:0} .c-phs.ro{cursor:pointer} .c-phs.done{opacity:.55} .c-phs.done .nm::before{content:'✓ '} .c-phs:hover{filter:brightness(1.05)}
.c-week{flex:1;display:flex;flex-direction:column;min-height:0}
.c-wkh,.c-allday,.c-tgi{display:grid;grid-template-columns:56px repeat(7,minmax(0,1fr))} .c-wkh,.c-allday{border-bottom:1px solid var(--cl-line)}
.c-wkh .d{text-align:center;padding:6px 0} .c-wkh .d small{display:block;font-size:11px;color:var(--text2)} .c-wkh .d b{display:inline-flex;width:36px;height:36px;border-radius:50%;align-items:center;justify-content:center;font-size:19px;font-weight:400} .c-wkh .d.today b{background:#0487E2;color:#fff}
.c-allday{min-height:28px} .c-allday .lb{font-size:10px;color:var(--text2);padding:6px 4px;text-align:right;grid-row:1/-1}
.c-tg{flex:1;overflow:auto} .c-hr{height:48px;font-size:10.5px;color:var(--text2);text-align:right;padding-right:8px;transform:translateY(-7px)}
.c-col{position:relative;border-left:1px solid var(--cl-line)} .c-slot{height:48px;border-bottom:1px solid var(--cl-line)} .c-slot:hover{background:var(--cl-hov)} .c-col.drop{background:rgba(4,135,226,.08)}
.c-tev{position:absolute;left:2px;right:4px;border-radius:6px;padding:3px 6px;font-size:12px;line-height:1.3;overflow:hidden;cursor:pointer;z-index:2;touch-action:none}
.c-tev small{display:block;opacity:.85;font-size:11px} .c-tev .rzb{position:absolute;left:0;right:0;bottom:0;height:7px;cursor:ns-resize}
.c-now{position:absolute;left:0;right:0;height:2px;background:#ea4335;z-index:3} .c-now::before{content:'';position:absolute;left:-6px;top:-5px;width:12px;height:12px;border-radius:50%;background:#ea4335}
.c-tip,.c-ctx,.c-card,.c-dlg{background:var(--card);border:1px solid var(--cl-line,#3c4043);color:var(--text);font-family:Kanit;box-shadow:0 12px 36px rgba(0,0,0,.45)}
.c-tip{position:fixed;z-index:3600;border-radius:10px;padding:9px 12px;font-size:12.5px;max-width:290px;pointer-events:none;line-height:1.55} .c-tip .m{color:var(--text2)}
.c-ctx{position:fixed;z-index:3700;border-radius:10px;padding:6px 0;min-width:210px} .c-ctx div{padding:7px 16px;cursor:pointer;font-size:13px;display:flex;gap:10px;align-items:center} .c-ctx div:hover{background:rgba(101,194,245,.12)} .c-ctx hr{border:none;border-top:1px solid var(--border2);margin:5px 0} .c-ctx .dang{color:#f28b82} .c-ctx .sw{width:12px;height:12px;border-radius:50%}
.c-card{position:fixed;z-index:3650;border-radius:14px;width:350px;max-width:calc(100vw - 20px);padding:12px 16px 14px;font-size:13px}
.c-card .tb{display:flex;justify-content:flex-end;gap:2px;margin:-4px -8px 4px 0} .c-card .tb button{background:none;border:none;color:var(--text2);font-size:16px;width:32px;height:32px;border-radius:50%;cursor:pointer} .c-card .tb button:hover{background:rgba(101,194,245,.12)}
.c-card h3{margin:0 0 4px;font-weight:500;font-size:18px;display:flex;gap:10px;align-items:flex-start} .c-card h3 i{width:13px;height:13px;border-radius:3px;background:var(--c);margin-top:7px;flex:none} .c-card .ln{color:var(--text2);margin:5px 0 0 23px;line-height:1.55}
.c-mask{position:fixed;inset:0;z-index:3550;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}
.c-dlg{border-radius:16px;width:min(480px,100%);max-height:92vh;overflow:auto;padding:18px 20px}
.c-dlg input.t{width:100%;box-sizing:border-box;background:none;border:none;border-bottom:2px solid var(--border2);color:var(--text);font-family:Kanit;font-size:20px;padding:6px 2px;outline:none} .c-dlg input.t:focus{border-color:#0487E2}
.c-fr{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap;font-size:13px} .c-fr .ic{width:22px;color:var(--text2);text-align:center}
.c-fi{background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:6px 8px;font-family:Kanit;font-size:13px} .c-fi:focus{outline:none;border-color:#0487E2}
.c-chips{display:flex;gap:6px;flex-wrap:wrap} .c-chip{padding:4px 11px;border-radius:14px;border:1px solid var(--border2);font-size:12.5px;cursor:pointer;display:inline-flex;gap:6px;align-items:center} .c-chip.on{border-color:var(--c);background:color-mix(in srgb,var(--c) 22%,transparent)} .c-chip i{width:9px;height:9px;border-radius:50%;background:var(--c)}
.c-teamck{margin-top:14px;padding:10px 12px;border-radius:10px;background:rgba(4,135,226,.1);border:1px solid rgba(101,194,245,.4);display:flex;gap:10px;align-items:flex-start;cursor:pointer;font-size:13px} .c-teamck input{accent-color:#0487E2;margin-top:3px}
.c-ft{display:flex;gap:8px;margin-top:18px;justify-content:flex-end;flex-wrap:wrap} .c-bp{background:#0487E2;color:#fff;border:none;border-radius:18px;padding:8px 22px;font-family:Kanit;font-weight:500;cursor:pointer} .c-bg{background:none;border:none;color:#0487E2;padding:8px 14px;font-family:Kanit;cursor:pointer;border-radius:18px} .c-bg:hover{background:rgba(101,194,245,.12)}
.c-ghost{position:fixed;z-index:3800;pointer-events:none;font-size:12px;padding:2px 8px;border-radius:5px;box-shadow:0 6px 18px rgba(0,0,0,.4);white-space:nowrap;font-family:Kanit}
.c-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#323232;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:3900;font-family:Kanit;box-shadow:0 6px 18px rgba(0,0,0,.4)} .c-toast button{background:none;border:none;color:#8ab4f8;font-family:Kanit;margin-left:12px;cursor:pointer}
`;

/* ── หน้า ── */
const visible=()=>{ const p=$('page-nd-cal'); return p && !p.classList.contains('hidden'); };
function ensurePage(){ if($('page-nd-cal')) return; const mc=document.querySelector('.main-content'); if(!mc) return;
  if(!$('cl-css')){ const st=document.createElement('style'); st.id='cl-css'; st.textContent=CSS; document.head.appendChild(st); }
  const d=document.createElement('div'); d.id='page-nd-cal'; d.className='page hidden';
  d.innerHTML=`<div class="page-header"><div class="page-title">📅 ติดตามงาน</div><div class="page-subtitle">ปฏิทินกลางของบริษัท — งานโปรเจกต์ · อีเวนต์ทีม · ปฏิทินส่วนตัว และ To-do</div></div><div id="nd-cal-body"></div>`;
  mc.appendChild(d); new MutationObserver(()=>{ if(visible()) open(); }).observe(d,{attributes:true,attributeFilter:['class']}); }
async function open(){ const b=$('nd-cal-body'); if(!canSee()){ if(b) b.innerHTML='<div style="padding:40px;text-align:center;color:var(--text2)">🔒 สำหรับพนักงานบริษัท (แอดมิน · เมเนเจอร์ · บัญชี · พนักงาน)</div>'; return; }
  attach(); render(); PROJ=await projects(); render(); }

function side(){ const c=new Date(ST.cur.getFullYear(),ST.cur.getMonth(),1), s=addD(c,-c.getDay()), L=ST.L, T=tags(); let mini='';
  for(let i=0;i<42;i++){ const d=addD(s,i); mini+=`<div class="${d.getMonth()!==c.getMonth()?'o':''} ${ymd(d)===TODAY()?'t':''}" onclick="NDCAL.go('${ymd(d)}')">${d.getDate()}</div>`; }
  const row=(on,col,label,fn,act)=>`<label class="c-row"><input type="checkbox" ${on?'checked':''} onchange="${fn}"><span class="c-ck" style="--c:${col}"></span><span>${label}</span>${act||''}</label>`;
  const head=(key,on,col,label,hint,fn)=>`<div class="c-gh"><span class="c-car" onclick="NDCAL.fold('${key}')">▼</span><label style="display:flex;gap:8px;align-items:center;cursor:pointer;flex:1"><input type="checkbox" ${on?'checked':''} onchange="${fn}"><span class="c-ck" style="--c:${col}"></span>${label} <span style="font-weight:400;font-size:11px;color:var(--text2)">${hint}</span></label></div>`;
  const todos=Object.values(D.todo).filter(Boolean).sort((a,b)=>(a.done-b.done)||String(a.due||'9').localeCompare(String(b.due||'9')));
  return `<button class="c-create" onclick="NDCAL.add('${TODAY()}')"><b>＋</b> สร้าง</button>
   <div class="c-mini"><div class="c-mini-h"><span>${TMF[c.getMonth()]} ${c.getFullYear()+543}</span><button onclick="NDCAL.nav(-1)">‹</button><button onclick="NDCAL.nav(1)">›</button></div><div class="c-mini-g">${WD.map(w=>`<div class="w">${w[0]}</div>`).join('')}${mini}</div></div>
   <div class="c-grp ${ST.open.me?'':'closed'}">${head('me',L.me,'#9aa0a6','🙋 ปฏิทินของฉัน','(คนอื่นไม่เห็น)',"NDCAL.lay('me',this.checked)")}<div class="c-gb"><div class="c-sub ${L.me?'':'off'}">
     ${tagRows('me')}
     ${row(L.todo,'#FBBC04','☑ To-do',"NDCAL.lay('todo',this.checked)")}
     ${todos.map(t=>`<div class="c-todo ${t.done?'done':''}"><input type="checkbox" ${t.done?'checked':''} onchange="NDCAL.todoDone('${E(t.id)}',this.checked)"><span style="flex:1;min-width:0;word-break:break-word">${E(t.text)}${t.due?` <small style="color:var(--text2)">· ${thD(t.due)}</small>`:''}</span><button title="ลบ" onclick="NDCAL.todoDel('${E(t.id)}')">✕</button></div>`).join('')}
     <input class="c-tin" id="cl-td" placeholder="＋ เพิ่ม To-do แล้วกด Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();NDCAL.todoAdd(this.value)}">
   </div></div></div>
   <div class="c-grp ${ST.open.team?'':'closed'}">${head('team',L.teamOn,'#0487E2','🏢 ปฏิทินทีม','(ทั้งทีมเห็น)',"NDCAL.lay('teamOn',this.checked)")}<div class="c-gb"><div class="c-sub ${L.teamOn?'':'off'}">
     ${row(L.mine,'#0463CA','งานของฉัน',"NDCAL.lay('mine',this.checked)")}<div class="c-note">โปรเจกต์ที่ฉันดูแลหรือมีชื่ออยู่</div>
     ${row(L.all,'#0487E2','งานทั้งทีม',"NDCAL.lay('all',this.checked)")}<div class="c-note">ทุกโปรเจกต์ในบริษัท</div>
     ${row(L.events,'#65C2F5','อีเวนต์ / งานทีม',"NDCAL.lay('events',this.checked)")}<div class="c-note">แยกตามแท็ก — เพิ่มแท็ก/แท็กย่อย เลือกสีเองได้</div>
     <div class="${L.events?'':'c-sub off'}" style="padding-left:14px">${tagRows('team')}</div>
     <div style="display:flex;gap:7px;flex-wrap:wrap;padding:4px 6px">${PH.map(c=>`<span style="font-size:11px;display:inline-flex;gap:5px;align-items:center;color:var(--text2)"><i style="width:9px;height:9px;border-radius:2px;background:${c.color}"></i>${c.name}</span>`).join('')}</div>
   </div></div></div>`; }
function tagRows(sc){ const L=ST.L[LK(sc)]||{}, ck=(id,t,kid)=>`<label class="c-row" style="${kid?'padding-left:26px;font-size:12.5px':''}"><input type="checkbox" ${L[id]!==false?'checked':''} onchange="NDCAL.lay('${sc}:${id}',this.checked)"><span class="c-ck" style="--c:${E(t.color)}"></span><span>${E(t.name)}</span><span class="c-act">${kid?'':`<button title="เพิ่มแท็กย่อย" onclick="event.preventDefault();NDCAL.tagAdd('${sc}','${id}')">＋</button>`}<button title="แก้ชื่อ/สี" onclick="event.preventDefault();NDCAL.tagEdit('${sc}','${id}')">✎</button><button title="ลบแท็ก" onclick="event.preventDefault();NDCAL.tagDel('${sc}','${id}')">✕</button></span></label>`;
  return tagTree(sc).map(g=>ck(g.id,g.t)+g.kids.map(k=>ck(k.id,k.t,1)).join('')).join('')+`<div class="c-addtag" onclick="NDCAL.tagAdd('${sc}')">＋ เพิ่มแท็ก${sc==='team'?'ทีม':''}</div>`; }
function topBar(){ const c=ST.cur, t=ST.view==='week'?(()=>{ const s=addD(c,-c.getDay()), e=addD(s,6); return s.getDate()+' '+TM[s.getMonth()]+' – '+e.getDate()+' '+TM[e.getMonth()]+' '+(e.getFullYear()+543); })():TMF[c.getMonth()]+' '+(c.getFullYear()+543);
  return `<button class="c-btn" onclick="NDCAL.nav(0)">วันนี้</button><button class="c-ib" onclick="NDCAL.nav(-1)">‹</button><button class="c-ib" onclick="NDCAL.nav(1)">›</button><span class="c-ttl">${t}</span>
   <span class="c-seg"><button class="${ST.view==='month'?'on':''}" onclick="NDCAL.view('month')">เดือน</button><button class="${ST.view==='week'?'on':''}" onclick="NDCAL.view('week')">สัปดาห์</button></span>`; }

/* ── เดือน: วางแถบไม่ให้ทับกัน (กล่องโปรเจกต์สูงตามจำนวนเส้นหน้าที่) ── */
function weekRow(ws, all, mIdx, opt){ opt=opt||{}; const k0=ymd(ws), k6=ymd(addD(ws,6)), CAP=opt.cap||14, OFF=opt.off||0, R0=opt.noNum?1:2;
  const L2=all.filter(x=>x.start<=k6&&x.end>=k0).map(it=>({it,s:Math.max(0,dd(k0,it.start)),e:Math.min(6,dd(k0,it.end)),h:it.kind==='proj'?1+Math.max(1,phLines(it).length):1}))
    .sort((a,b)=>(b.it.kind==='proj')-(a.it.kind==='proj')||a.s-b.s||(b.e-b.s)-(a.e-a.s)||String(a.it.time||'').localeCompare(String(b.it.time||'')));
  const occ=[], free=(l,x)=>{ for(let r=l;r<l+x.h;r++) if((occ[r]||[]).some(y=>!(x.e<y.s||x.s>y.e))) return false; return true; };
  L2.forEach(x=>{ let l=0; while(!free(l,x)) l++; x.l=l; for(let r=l;r<l+x.h;r++) (occ[r]=occ[r]||[]).push(x); });
  const nL=Math.min(CAP,occ.length), hid=[0,0,0,0,0,0,0]; L2.forEach(x=>{ if(x.l+x.h>CAP) for(let d=x.s;d<=x.e;d++) hid[d]++; });
  let h=''; if(!opt.noCells) for(let i=0;i<7;i++){ const d=addD(ws,i), k=ymd(d);
    h+=`<div class="c-cell ${mIdx!=null&&d.getMonth()!==mIdx?'out':''} ${k===TODAY()?'today':''}" style="grid-column:${i+1}" data-d="${k}" oncontextmenu="NDCAL.ctxDay(event,'${k}')" ondblclick="NDCAL.add('${k}')"><div class="c-dn"><b>${d.getDate()===1?'1 '+TM[d.getMonth()]:d.getDate()}</b></div><button class="c-plus" title="เพิ่ม" onclick="NDCAL.add('${k}')"></button></div>`; }
  L2.filter(x=>x.l+x.h<=CAP).forEach(x=>{ const it=x.it, cutL=it.start<k0, cutR=it.end>k6, row=x.l+R0, col=`${x.s+1+OFF}/${x.e+2+OFF}`;
    if(it.kind==='proj'){ h+=projBlock(it,x,k0,cutL,cutR,row,col); return; }
    const multi=it.end>it.start, bar=multi||!it.time, ed=canEdit(it), c=colorOf(it);
    h+=`<div class="c-ev ${bar?'bar':'dot'} ${cutL?'l':''} ${cutR?'r':''} ${it.done?'done':''}" style="--c:${c};--tc:${tcOf(c)};grid-row:${row};grid-column:${col}" onpointerdown="NDCAL.down(event,'${E(it.id)}')" onmouseenter="NDCAL.tip(event,'${E(it.id)}')" onmouseleave="NDCAL.tipOff()" oncontextmenu="NDCAL.ctx(event,'${E(it.id)}')">${it.time&&!multi?E(it.time)+' ':''}${E(it.title)}${ed&&bar&&it.kind!=='todo'?(cutL?'':'<span class="c-rzl" data-rz="L"></span>')+(cutR?'':'<span class="c-rz" data-rz="R"></span>'):''}</div>`; });
  hid.forEach((n,i)=>{ if(n) h+=`<div class="c-more" style="grid-row:${R0+nL};grid-column:${i+1+OFF}" onclick="NDCAL.go('${ymd(addD(ws,i))}','week')">อีก ${n} รายการ</div>`; });
  return {html:h, rows:nL, more:hid.some(Boolean)}; }
function projBlock(p,x,k0,cutL,cutR,row,col){ const n=x.e-x.s+1, ed=canEdit(p), lines=phLines(p), pos=v=>Math.max(0,Math.min(n,v-x.s))/n*100;
  const fin=p.pEnd>=k0&&p.pEnd<=shift(k0,6)?`<span class="fin">🏁 ส่ง ${E(p.endTime||thD(p.pEnd))}</span>`:'';
  let ln=lines.map(L=>`<div class="c-pbl">${L.map((ph,i)=>{ const prev=L[i-1], sx=dd(k0,ph.start)+(prev&&prev.end===ph.start?frac(prev.time):0), ex=dd(k0,ph.end)+frac(ph.time);
      if(ex<=x.s||sx>=x.e+1) return ''; const l=pos(sx), w=Math.max(1.5,pos(ex)-l), cl=sx<x.s, cr=ex>x.e+1, join=prev&&prev.end===ph.start&&!cl;
      return `<div class="c-phs ${cl?'cl':''} ${cr?'cr':''} ${join?'joinL':''} ${ph.done?'done':''} ${ed?'':'ro'}" style="left:${l}%;width:${w}%;--c:${ph.color}" onpointerdown="NDCAL.phDown(event,'${E(p.id)}','${ph.k}')" onmouseenter="NDCAL.phTip(event,'${E(p.id)}','${ph.k}')" onmouseleave="NDCAL.tipOff()"><span class="nm">${ph.name}</span><span class="who">· ${ph.who.length?E(ph.who[0])+(ph.who.length>1?' +'+(ph.who.length-1):''):'<i>ยังไม่มีคน</i>'}</span>${cr?'':`<span class="tm">${E(ph.time)}</span>`}${ed&&!cl?'<span class="h l" data-h="L"></span>':''}${ed&&!cr?'<span class="h r" data-h="R"></span>':''}</div>`; }).join('')}</div>`).join('');
  if(!lines.length) ln='<div class="c-pbl" style="font-size:11px;color:var(--text2);padding:0 6px">ยังไม่ได้ตั้งเดดไลน์หน้าที่</div>';
  return `<div class="c-pb ${cutL?'l':''} ${cutR?'r':''} ${p.done?'done':''}" style="grid-row:${row}/span ${x.h};grid-column:${col}" oncontextmenu="NDCAL.ctx(event,'${E(p.id)}')"><div class="c-pbh" onpointerdown="NDCAL.down(event,'${E(p.id)}')" onmouseenter="NDCAL.tip(event,'${E(p.id)}')" onmouseleave="NDCAL.tipOff()">${cutL?'‹ ':''}📁 ${E(p.title)}${fin}</div>${ln}</div>`; }
function monthView(all){ const c=ST.cur, f=new Date(c.getFullYear(),c.getMonth(),1), s=addD(f,-f.getDay()), last=new Date(c.getFullYear(),c.getMonth()+1,0), e=addD(last,6-last.getDay());
  let h=`<div class="c-wdh">${WD.map(w=>`<div>${w}</div>`).join('')}</div>`;
  for(let w=new Date(s); w<=e; w=addD(w,7)){ const r=weekRow(w, all, c.getMonth()); h+=`<div class="c-wk" style="grid-template-rows:26px repeat(${r.rows},22px)${r.more?' 20px':''} 1fr">${r.html}</div>`; }
  return `<div class="c-month">${h}</div>`; }
/* ── สัปดาห์: ตารางเวลา ── */
const H0=7, H1=23, PX=48;
function weekView(all){ const ws=addD(ST.cur,-ST.cur.getDay()), k0=ymd(ws), k6=shift(k0,6);
  let head='<div></div>'; for(let i=0;i<7;i++){ const d=addD(ws,i); head+=`<div class="d ${ymd(d)===TODAY()?'today':''}"><small>${WD[i]}</small><b>${d.getDate()}</b></div>`; }
  const r=weekRow(ws, all.filter(x=>(x.end>x.start||!x.time||x.kind==='proj')), null, {off:1, noNum:true, noCells:true, cap:99});
  let ad='<div class="lb">ทั้งวัน</div>'; for(let i=0;i<7;i++){ const k=shift(k0,i); ad+=`<div class="c-cell" style="grid-column:${i+2};padding:0" data-d="${k}" oncontextmenu="NDCAL.ctxDay(event,'${k}')" ondblclick="NDCAL.add('${k}')"></div>`; }
  let hrs='', cols=''; for(let h=H0;h<H1;h++) hrs+=`<div class="c-hr">${h===H0?'':pad(h)+':00'}</div>`;
  for(let i=0;i<7;i++){ const k=shift(k0,i); let sl=''; for(let h=H0;h<H1;h++) sl+=`<div class="c-slot" ondblclick="NDCAL.add('${k}','${pad(h)}:00')" oncontextmenu="NDCAL.ctxDay(event,'${k}','${pad(h)}:00')"></div>`;
    const tv=all.filter(x=>x.kind!=='proj'&&x.start===k&&x.end===k&&x.time).map(it=>{ const a=Math.max(tmin(it.time),H0*60), b=Math.max(a+30,tmin(it.endTime||tstr(tmin(it.time)+60))), c=colorOf(it);
      return `<div class="c-tev" style="top:${(a-H0*60)/60*PX}px;height:${(b-a)/60*PX-2}px;background:${c};color:${tcOf(c)}" onpointerdown="NDCAL.down(event,'${E(it.id)}')" onmouseenter="NDCAL.tip(event,'${E(it.id)}')" onmouseleave="NDCAL.tipOff()" oncontextmenu="NDCAL.ctx(event,'${E(it.id)}')"><b>${E(it.title)}</b><small>${E(it.time)} – ${E(it.endTime||'')}</small>${canEdit(it)?'<span class="rzb" data-rzb="1"></span>':''}</div>`; }).join('');
    const now=k===TODAY()?`<div class="c-now" style="top:${((new Date().getHours()*60+new Date().getMinutes())-H0*60)/60*PX}px"></div>`:'';
    cols+=`<div class="c-col" data-d="${k}">${sl}${tv}${now}</div>`; }
  return `<div class="c-week"><div class="c-wkh">${head}</div><div class="c-allday" style="grid-template-rows:repeat(${Math.max(1,r.rows)},23px)">${ad}${r.html}</div><div class="c-tg" id="c-tg"><div class="c-tgi"><div>${hrs}</div>${cols}</div></div></div>`; }

function render(){ const b=$('nd-cal-body'); if(!b||!visible()) return; if(!canSee()){ open(); return; }
  build(); const all=visible_(), sc=($('c-tg')||{}).scrollTop, ms=(document.querySelector('#page-nd-cal .c-month')||{}).scrollTop, sd=(document.querySelector('#page-nd-cal .c-side')||{}).scrollTop;
  const err=D.err_team?`<div style="margin-bottom:10px;padding:9px 12px;border-radius:10px;background:rgba(255,158,0,.1);border:1px solid rgba(255,158,0,.35);font-size:12.5px">⚠️ อ่านปฏิทินทีมไม่ได้ (${E(D.err_team)}) — ให้แอดมินวาง Firebase Rules v6</div>`:'';
  b.innerHTML=`${err}<div class="c-app"><aside class="c-side">${side()}</aside><section class="c-main"><div class="c-top">${topBar()}</div>${ST.view==='week'?weekView(all):monthView(all)}</section></div>`;
  const tg=$('c-tg'); if(tg) tg.scrollTop=sc!=null?sc:(9-H0)*PX; const m=document.querySelector('#page-nd-cal .c-month'); if(m&&ms) m.scrollTop=ms; const s=document.querySelector('#page-nd-cal .c-side'); if(s&&sd) s.scrollTop=sd; }

/* ── บันทึกโปรเจกต์ (ชุดเดียวกับหน้าโปรเจกต์/วางแผนงาน) ── */
async function saveProj(pid, m, msg, undo){ const P=PROJ.find(x=>x.id===pid); if(!P) return;
  const apply=p=>{ p.startDate=m.pStart||p.startDate||'';
    if(String(p.deadline||'').includes('T')) p.deadline=m.pEnd?(m.pEnd+(m.endTime?'T'+m.endTime:'')):''; else { p.deadline=m.pEnd||''; if(m.endTime) p.deadlineTime=m.endTime; else delete p.deadlineTime; }
    p.phases=p.phases||{}; Object.entries(m.phases).forEach(([k,x])=>{ const o=p.phases[k]||{}; p.phases[k]={...o, startDate:x.start, deadline:x.end, submitTime:x.time||'', status:x.done?'done':(o.status==='done'?'none':(o.status||'none'))}; }); };
  apply(P); render();   // แสดงทันที แล้วค่อยบันทึกขึ้นเซิร์ฟเวอร์
  const r=await projWrite(pid, apply, p=>['startDate','deadline','deadlineTime', ...Object.keys(m.phases).flatMap(k=>['startDate','deadline','submitTime','status'].map(f=>'phases/'+k+'/'+f))]);
  if(!r||!r.ok){ safe(()=>toast('บันทึกวันโปรเจกต์ไม่สำเร็จ'+(r&&r.error?': '+r.error.message+(isAdm()?'':' (ต้องวาง Firebase Rules v7)'):''),'error')); PROJ=await projects(true); render(); return; }
  if(r.saved){ const i=PROJ.findIndex(x=>x.id===pid); if(i>=0) PROJ[i]=r.saved; } render(); say(msg, undo); }
const model=it=>JSON.parse(JSON.stringify({pStart:it.pStart, pEnd:it.pEnd, endTime:it.endTime, phases:it.phases}));
// 🔗 ขยับวันเสร็จหน้าที่ → หน้าที่ถัดไปที่ต่อกันอยู่เลื่อนตามเป็นทอด ๆ (ที่ตั้งคาบเกี่ยวไว้ไม่แตะ)
function chainShift(m,k,oldEnd){ const ks=PH.map(x=>x.k).filter(x=>m.phases[x]), nk=ks[ks.indexOf(k)+1]; if(!nk) return 0; const ph=m.phases[k], nx=m.phases[nk];
  if(nx.start!==oldEnd||ph.end===oldEnd) return 0; const n=dd(oldEnd,ph.end), oe=nx.end; nx.start=ph.end; nx.end=shift(nx.end,n); if(nx.end<nx.start) nx.end=nx.start; return 1+chainShift(m,nk,oe); }

/* ── อีเวนต์ทีม / ส่วนตัว ── */
async function saveEv(it, patch, msg, undo){ const k=it.scope==='team'?'team':'mine', raw=D[k][it.rid]; if(!raw) return;
  const nu={...raw, ...patch, upd:new Date().toISOString(), updBy:ME()}; D[k][it.rid]=nu; render();
  try{ await put(k, nu, it.rid); say(msg, undo); }catch(e){} }

/* ── ลาก / ยืด ── */
let DR=null, TIP=null, TT=null;
function under(e){ return document.elementsFromPoint(e.clientX,e.clientY).find(x=>x.dataset&&x.dataset.d); }
function closeFloat(){ document.querySelectorAll('.c-ctx,.c-card').forEach(x=>x.remove()); }
function tipOff(){ TIP&&TIP.remove(); TIP=null; }
function place(el,x,y,w){ el.style.left=Math.max(8,Math.min(x+8,innerWidth-(w||el.offsetWidth)-10))+'px'; el.style.top=Math.max(8,Math.min(y+8,innerHeight-el.offsetHeight-10))+'px'; }
function say(msg, undo){ if(!msg) return; document.querySelector('.c-toast')?.remove(); clearTimeout(TT); const t=document.createElement('div'); t.className='c-toast'; t.innerHTML=E(msg)+(undo?'<button>เลิกทำ</button>':''); if(undo) t.querySelector('button').onclick=()=>{ t.remove(); undo(); }; document.body.appendChild(t); TT=setTimeout(()=>t.remove(),5000); }
document.addEventListener('pointermove',e=>{ if(!DR) return;
  if(!DR.active){ if(Math.hypot(e.clientX-DR.x,e.clientY-DR.y)<5) return; if(!DR.ed){ say(DR.ph||DR.it.kind==='proj'?'🔒 วันของโปรเจกต์แก้ได้เฉพาะแอดมิน · เมเนเจอร์ · พนักงานบริษัท':'🔒 แก้ได้เฉพาะคนสร้างและแอดมิน'); DR=null; return; }
    if(DR.mode==='proj'){ DR=null; return; }
    DR.active=true; tipOff(); DR.el.classList.add('dragging'); const g=document.createElement('div'); g.className='c-ghost'; const c=DR.color||colorOf(DR.it); g.style.background=c; g.style.color=tcOf(c); g.textContent=DR.it.title; document.body.appendChild(g); DR.g=g; }
  DR.g.style.left=(e.clientX+10)+'px'; DR.g.style.top=(e.clientY+8)+'px';
  document.querySelectorAll('#page-nd-cal .drop').forEach(x=>x.classList.remove('drop'));
  const t=under(e); if(t&&!(DR.ph&&t.classList.contains('c-col'))){ t.classList.add('drop'); DR.to=t.dataset.d; DR.toEl=t; DR.cy=e.clientY; }
  if(DR.to){ const it=DR.it, n=dd(DR.from,DR.to); DR.g.textContent=DR.mode==='move'?it.title+' → '+thD(shift(it.start,n))+(it.end>it.start?' – '+thD(shift(it.end,n)):''):DR.mode==='resize'?'↔ ถึง '+thD(DR.to<it.start?it.start:DR.to):DR.mode==='resizeL'?'↔ เริ่ม '+thD(DR.to>it.end?it.end:DR.to):it.title; } });
document.addEventListener('pointerup',e=>{ if(!DR) return; const d=DR; DR=null; document.querySelectorAll('#page-nd-cal .drop').forEach(x=>x.classList.remove('drop')); d.g&&d.g.remove(); d.el.classList.remove('dragging');
  if(!d.active){ if(d.ph) phPop(d.pid,d.ph,e); else openCard(d.it.id,e); return; }
  if(!d.to){ render(); return; } const it=d.it, n=dd(d.from,d.to);
  if(d.ph){ const p=findAny(d.pid), m=model(p), ph=m.phases[d.ph], oldEnd=ph.end, b4=model(p), nm=PH.find(x=>x.k===d.ph).name;
    if(d.mode==='move'){ ph.start=shift(ph.start,n); ph.end=shift(ph.end,n); } else if(d.mode==='resize') ph.end=d.to<ph.start?ph.start:d.to; else if(d.mode==='resizeL') ph.start=d.to>ph.end?ph.end:d.to;
    const nc=d.mode==='resizeL'?0:chainShift(m,d.ph,oldEnd); if(JSON.stringify(m)===JSON.stringify(b4)){ render(); return; }
    saveProj(p.pid, m, nm+' · '+thD(ph.start)+(ph.end>ph.start?' – '+thD(ph.end):'')+(nc?' · หน้าที่ถัดไป '+nc+' อันเลื่อนต่อให้แล้ว':''), ()=>saveProj(p.pid, b4, 'เลิกทำแล้ว')); return; }
  if(it.kind==='todo'){ const t=D.todo[it.rid]; if(t&&n){ put('todo',{...t, due:shift(t.due,n)},t.id).then(render); } else render(); return; }
  const raw=D[it.scope==='team'?'team':'mine'][it.rid]||{}, b4={start:raw.start, end:raw.end||raw.start, time:raw.time||'', endTime:raw.endTime||''}, pt={...b4};
  if(d.mode==='move'){ pt.start=shift(b4.start,n); pt.end=shift(b4.end,n);
    if(d.toEl&&d.toEl.classList.contains('c-col')&&b4.time){ const r=d.toEl.getBoundingClientRect(), mm=Math.round(((d.cy-r.top)/PX*60+H0*60)/30)*30, dur=tmin(b4.endTime||tstr(tmin(b4.time)+60))-tmin(b4.time); pt.time=tstr(mm); pt.endTime=tstr(mm+dur); } }
  else if(d.mode==='resize') pt.end=d.to<b4.start?b4.start:d.to; else if(d.mode==='resizeL') pt.start=d.to>b4.end?b4.end:d.to;
  else if(d.mode==='resizeT'&&d.toEl&&d.toEl.classList.contains('c-col')){ const r=d.toEl.getBoundingClientRect(), mm=Math.round(((d.cy-r.top)/PX*60+H0*60)/30)*30; pt.endTime=tstr(Math.max(tmin(b4.time)+30,mm)); }
  if(JSON.stringify(pt)===JSON.stringify(b4)){ render(); return; }
  saveEv(it, pt, d.mode==='move'?'ย้ายไป '+thD(pt.start)+' แล้ว':'แก้ช่วงเวลาแล้ว · ถึง '+thD(pt.end)+(pt.endTime?' '+pt.endTime:''), ()=>saveEv(it, b4, 'เลิกทำแล้ว')); });
document.addEventListener('pointerdown',e=>{ if(!e.target.closest('.c-ctx,.c-card')) closeFloat(); }, true);
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeFloat(); document.querySelector('.c-mask')?.remove(); } });

/* ── ชี้ดู ── */
function tipAt(e,html){ if(DR&&DR.active) return; tipOff(); TIP=document.createElement('div'); TIP.className='c-tip'; TIP.innerHTML=html; document.body.appendChild(TIP);
  const r=e.currentTarget.getBoundingClientRect(); TIP.style.left=Math.max(8,Math.min(innerWidth-300,r.left))+'px'; TIP.style.top=(r.bottom+6+TIP.offsetHeight>innerHeight?r.top-TIP.offsetHeight-6:r.bottom+6)+'px'; }
const edLine=(by,at)=>by?`<div style="margin-top:4px">✏️ แก้ล่าสุดโดย <b>${E(by)}</b> <span class="m">· ${ago(at)}</span></div>`:'';
function catName(it){ return it.kind==='todo'?'To-do':it.scope==='me'?tagFull('me',it.tag):it.kind==='proj'?'งานโปรเจกต์':(tagFull('team',it.cat)||(TEAM_CATS.find(c=>c.id===it.cat)||{}).name||'อีเวนต์ทีม'); }
function whenTxt(it){ return thD(it.kind==='proj'?it.pStart:it.start)+((it.kind==='proj'?it.pEnd:it.end)>(it.kind==='proj'?it.pStart:it.start)?' – '+thD(it.kind==='proj'?it.pEnd:it.end):'')+(it.kind==='proj'?(it.endTime?' · ส่ง '+it.endTime:''):it.time?' · '+it.time+(it.endTime?'–'+it.endTime:''):''); }

/* ── การ์ด / ป๊อปอัป ── */
function openCard(id,e){ const it=findAny(id); if(!it||it.kind==='todo') return; closeFloat(); tipOff(); const ed=canEdit(it), c=document.createElement('div'); c.className='c-card';
  const pj=it.kind==='proj';
  c.innerHTML=`<div class="tb">${ed?`<button title="${pj?'แก้วัน / เลื่อนเดดไลน์':'แก้ไข'}" onclick="NDCAL.${pj?'dates':'edit'}('${E(id)}')">✏️</button>${pj?'':`<button title="ลบ" onclick="NDCAL.delEv('${E(id)}')">🗑️</button>`}`:''}<button onclick="NDCAL.close()">✕</button></div>
   <h3 style="--c:${pj?'#0487E2':colorOf(it)}"><i></i><span>${pj?'📁 ':''}${E(it.title)}</span></h3>
   <div class="ln">${whenTxt(it)}${!pj&&!it.time?' · ทั้งวัน':''}</div><div class="ln">${it.scope==='me'?'🙋 ปฏิทินของฉัน':'🏢 ปฏิทินทีม'} · ${E(catName(it))}</div>
   ${pj?`${it.owner?`<div class="ln">🗂️ เมเนเจอร์ ${E(it.owner)}</div>`:''}${phList(it).map(ph=>`<div class="ln" style="display:flex;gap:6px;align-items:center"><i style="width:9px;height:9px;border-radius:2px;background:${ph.color};flex:none"></i><span>${ph.name} · ${E(ph.who.join(', ')||'ยังไม่มีคน')} · ${thD(ph.start)}${ph.end>ph.start?'–'+thD(ph.end):''}${ph.time?' · เสร็จ '+E(ph.time):''}${ph.done?' ✓':''}</span></div>`).join('')}
     ${canProj()?`<label style="display:flex;gap:8px;align-items:center;margin:10px 0 0 23px;cursor:pointer;font-weight:600"><input type="checkbox" ${it.done?'checked':''} ${it.st==='paid'?'disabled title="รับเงินแล้ว"':''} onchange="NDCAL.projDone('${E(it.pid)}',this.checked)" style="width:17px;height:17px;accent-color:#0487E2"> ✅ โปรเจกต์นี้เสร็จแล้ว${it.st==='paid'?' (รับเงินแล้ว)':''}</label>`:it.done?'<div class="ln" style="color:#1fb57a">✅ เสร็จแล้ว</div>':''}
     ${canProj()?`<div style="display:flex;gap:8px;margin:12px 0 0 23px;flex-wrap:wrap"><button class="c-bp" style="padding:6px 14px" onclick="NDCAL.dates('${E(id)}')">✏️ แก้วัน / เลื่อนเดดไลน์</button>${canOpenProj()?`<button class="c-bg" style="border:1px solid var(--border2)" onclick="NDCAL.goProj('${E(it.pid)}')">📁 แก้ข้อมูลโปรเจกต์ ›</button>`:''}</div>`:''}`:''}
   ${it.note?`<div class="ln" style="white-space:pre-wrap;color:var(--text)">${E(it.note)}</div>`:''}<div class="ln">${it.edBy?'✏️ แก้ล่าสุดโดย '+E(it.edBy)+' · '+ago(it.at):''}</div>`;
  document.body.appendChild(c); place(c, e&&e.clientX||innerWidth/2, e&&e.clientY||200, 350); }
function phPop(id,k,e){ closeFloat(); tipOff(); const p=findAny(id), ph=p.phases[k], P=PH.find(x=>x.k===k), ed=canEdit(p), c=document.createElement('div'); c.className='c-card'; c.style.width='290px';
  c.innerHTML=`<div style="display:flex;align-items:center;gap:8px"><i style="width:12px;height:12px;border-radius:3px;background:${P.color}"></i><b style="font-size:14.5px">${P.name}</b><button class="c-bg" style="margin-left:auto;padding:2px 8px" onclick="NDCAL.close()">✕</button></div>
   <div class="ln" style="margin-left:0">${E(p.title)}</div><div class="ln" style="margin-left:0">👤 ${E(ph.who.join(', ')||'ยังไม่ได้มอบหมาย')}</div><div class="ln" style="margin-left:0">📅 ${thD(ph.start)}${ph.end>ph.start?' – '+thD(ph.end):''}${ed?' <span style="opacity:.7">(ลากขอบช่วงเพื่อเปลี่ยนวัน)</span>':''}</div>
   <div style="display:flex;gap:8px;align-items:center;margin-top:10px">⏰ ต้องเสร็จ <input type="time" class="c-fi" id="c-pht" value="${E(ph.time||'')}" ${ed?'':'disabled'}> น.</div>
   <label style="display:flex;gap:6px;align-items:center;margin-top:8px;font-size:12.5px"><input type="checkbox" id="c-phd" ${ph.done?'checked':''} ${ed?'':'disabled'}> หน้าที่นี้เสร็จแล้ว</label>
   <div style="display:flex;gap:6px;margin-top:12px">${ed?`<button class="c-bp" style="padding:6px 16px" onclick="NDCAL.phSave('${E(id)}','${k}')">บันทึก</button>${canOpenProj()?`<button class="c-bg" style="margin-left:auto" onclick="NDCAL.goProj('${E(p.pid)}')">แก้ข้อมูลโปรเจกต์ ›</button>`:''}`:''}</div>`;
  document.body.appendChild(c); place(c, e.clientX, e.clientY, 300); }
// ✏️ แก้วันโปรเจกต์: วันเริ่ม · วันส่งลูกค้า+เวลา · เลื่อนทั้งโปรเจกต์ · วัน/เวลาแต่ละหน้าที่ (ใส่วันเสร็จ → หน้าที่ถัดไปเริ่มต่อให้)
function projDates(id){ const p=findAny(id); if(!p||!canEdit(p)) return; closeFloat(); tipOff(); const m=document.createElement('div'); m.className='c-mask'; m.onclick=x=>{ if(x.target===m) m.remove(); };
  m.innerHTML=`<div class="c-dlg" style="width:min(680px,100%)"><div style="font-size:12px;color:var(--text2)">✏️ แก้วัน / เดดไลน์</div><b style="font-size:17px">📁 ${E(p.title)}</b>
   <div class="c-fr" style="flex-wrap:nowrap;white-space:nowrap;overflow-x:auto"><span class="ic">▶</span>เริ่มงาน <input type="date" class="c-fi" id="pd-s" value="${p.pStart}"><span class="ic" style="margin-left:6px">🏁</span>ส่งลูกค้า <input type="date" class="c-fi" id="pd-e" value="${p.pEnd}"><input type="time" class="c-fi" id="pd-et" value="${E(p.endTime)}"></div>
   <div class="c-fr" style="background:rgba(101,194,245,.1);border-radius:10px;padding:8px 10px"><span>⇆ เลื่อนทั้งโปรเจกต์</span><button class="c-bg" onclick="NDCAL.pdN(-1)">− 1 วัน</button><input type="number" class="c-fi" id="pd-n" value="0" style="width:64px;text-align:center"><button class="c-bg" onclick="NDCAL.pdN(1)">+ 1 วัน</button><span style="font-size:11.5px;color:var(--text2)">ทุกหน้าที่ขยับตามกัน</span></div>
   <div style="margin-top:12px;font-size:12px;color:var(--text2)">แต่ละหน้าที่</div>
   ${phList(p).map(ph=>`<div class="c-fr" style="margin-top:6px"><i style="width:10px;height:10px;border-radius:3px;background:${ph.color}"></i><b style="width:46px">${ph.name}</b><input type="date" class="c-fi" data-k="${ph.k}" data-f="start" value="${ph.start}">–<input type="date" class="c-fi" data-k="${ph.k}" data-f="end" value="${ph.end}" data-old="${ph.end}" onchange="NDCAL.pdChain(this)"><input type="time" class="c-fi" data-k="${ph.k}" data-f="time" value="${E(ph.time)}" title="ต้องเสร็จกี่โมง"><span style="font-size:11.5px;color:var(--text2)">${E(ph.who.join(', '))}</span></div>`).join('')||'<div style="font-size:12px;color:var(--text2);margin-top:6px">ยังไม่ได้ตั้งวันหน้าที่ — ตั้งที่หน้าโปรเจกต์หรือวางแผนงาน</div>'}
   <div style="font-size:11.5px;color:var(--text2);margin-top:10px">🔗 ใส่วันเสร็จของหน้าที่ไหน หน้าที่ถัดไปจะเริ่มต่อให้อัตโนมัติ (อยากให้คาบเกี่ยว แก้วันเริ่มเองได้)</div>
   <div class="c-ft">${canOpenProj()?`<button class="c-bg" style="margin-right:auto" onclick="NDCAL.goProj('${E(p.pid)}')">📁 แก้ข้อมูลโปรเจกต์ ›</button>`:''}<button class="c-bg" onclick="this.closest('.c-mask').remove()">ยกเลิก</button><button class="c-bp" onclick="NDCAL.pdSave('${E(id)}')">บันทึก</button></div></div>`;
  document.body.appendChild(m); }
/* ── เพิ่ม / แก้อีเวนต์ ── */
let DLG={};
function openDlg(it, day, time){ closeFloat(); tipOff(); const isNew=!it, raw=it?D[it.scope==='team'?'team':'mine'][it.rid]||{}:{start:day||TODAY(), time:time||'', endTime:time?tstr(tmin(time)+60):''};
  const T=tags(); DLG={id:it&&it.id, team:it?it.scope==='team':false, tag:raw.tag||Object.keys(T)[0], cat:raw.cat||'meet'}; const ad=!raw.time;
  const m=document.createElement('div'); m.className='c-mask'; m.onclick=x=>{ if(x.target===m) m.remove(); };
  m.innerHTML=`<div class="c-dlg"><input class="t" id="c-ft" placeholder="เพิ่มชื่อและเวลา" value="${E(raw.title||'')}">
   <div class="c-fr"><span class="ic">🕘</span><input type="date" class="c-fi" id="c-fs" value="${E(raw.start)}"><span>ถึง</span><input type="date" class="c-fi" id="c-fe" value="${E(raw.end||raw.start)}">
     <label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="c-fad" ${ad?'checked':''} onchange="document.getElementById('c-ftm').style.display=this.checked?'none':'flex'"> ทั้งวัน</label></div>
   <div class="c-fr" id="c-ftm" style="display:${ad?'none':'flex'}"><span class="ic"></span><input type="time" class="c-fi" id="c-fa" value="${E(raw.time||'09:00')}"><span>–</span><input type="time" class="c-fi" id="c-fb" value="${E(raw.endTime||'10:00')}"></div>
   <div class="c-fr" style="align-items:flex-start"><span class="ic">🏷️</span><div class="c-chips" id="c-fchips"></div></div>
   <div class="c-fr" style="align-items:flex-start"><span class="ic">≡</span><textarea class="c-fi note-grow" id="c-fn" rows="2" style="flex:1;resize:vertical" placeholder="เพิ่มรายละเอียด">${E(raw.note||'')}</textarea></div>
   ${isNew||!DLG.team?`<label class="c-teamck"><input type="checkbox" id="c-fteam" ${DLG.team?'checked':''} onchange="NDCAL.dlgTeam(this.checked)"><span><b>📢 เพิ่มในปฏิทินทีม</b><br><span style="color:var(--text2);font-size:12px">ติ๊ก = ทั้งทีมเห็นร่วมกัน · ไม่ติ๊ก = เก็บเป็นของส่วนตัว</span></span></label>`:''}
   <div class="c-ft">${!isNew?`<button class="c-bg" style="color:#f28b82;margin-right:auto" onclick="this.closest('.c-mask').remove();NDCAL.delEv('${E(it.id)}')">ลบ</button>`:''}<button class="c-bg" onclick="this.closest('.c-mask').remove()">ยกเลิก</button><button class="c-bp" onclick="NDCAL.dlgSave()">บันทึก</button></div></div>`;
  document.body.appendChild(m); chips(); setTimeout(()=>{ if(isNew) $('c-ft')?.focus(); safe(()=>_noteGrowAll(m)); },30); }
function chips(){ const el=$('c-fchips'); if(!el) return; const sc=DLG.team?'team':'me', f=DLG.team?'cat':'tag', cur=DLG[f];
  if(!TGS(sc)[cur]) DLG[f]=Object.keys(TGS(sc))[0];
  const chip=(id,t,kid)=>`<span class="c-chip ${DLG[f]===id?'on':''}" style="--c:${E(t.color)}${kid?';font-size:11.5px;padding:3px 9px':''}" onclick="NDCAL.dlgPick('${f}','${id}')"><i></i>${kid?'› ':''}${E(t.name)}</span>`;
  el.innerHTML=tagTree(sc).map(g=>`<span style="display:inline-flex;gap:4px;flex-wrap:wrap;align-items:center">${chip(g.id,g.t)}${g.kids.map(k=>chip(k.id,k.t,1)).join('')}</span>`).join('')+`<span class="c-chip" style="--c:#9aa0a6" onclick="NDCAL.tagAdd('${sc}','',true)">＋ แท็กใหม่</span>`; }
const PAL2=['#0463CA','#0487E2','#09B1EC','#65C2F5','#B0D6F5','#FFC9BC','#FFE2A8','#CDEDC4','#C2E2F7','#DCD0F6','#F9C6DB'];
function tagDlg(sc,id){ const T=TGS(sc), t=T[id]||{}, kids=Object.keys(T).some(k=>T[k].parent===id), parents=tagTree(sc).filter(g=>g.id!==id);
  const m=document.createElement('div'); m.className='c-mask'; m.onclick=x=>{ if(x.target===m) m.remove(); };
  m.innerHTML=`<div class="c-dlg" style="width:min(400px,100%)"><b>🏷️ แก้แท็ก${sc==='team'?'ทีม':''}</b><input class="c-fi" id="c-tgn" style="width:100%;box-sizing:border-box;margin-top:10px" value="${E(t.name||'')}" placeholder="ชื่อแท็ก">
   ${kids?'':`<div class="c-fr"><span>อยู่ใต้แท็ก</span><select class="c-fi" id="c-tgp"><option value="">— แท็กหลัก —</option>${parents.map(g=>`<option value="${g.id}"${t.parent===g.id?' selected':''}>${E(g.t.name)}</option>`).join('')}</select></div>`}
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center">${PALETTE.concat(PAL2).map(c=>`<span class="c-pc" data-c="${c}" onclick="document.querySelectorAll('.c-pc').forEach(x=>x.style.outline='');this.style.outline='2px solid var(--text)';document.getElementById('c-tgc').value='${c}'" style="width:24px;height:24px;border-radius:50%;background:${c};cursor:pointer;${c===t.color?'outline:2px solid var(--text)':''}"></span>`).join('')}
    <label title="เลือกสีเอง" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">🎨 <input type="color" id="c-tgc" value="${E(t.color||'#0487E2')}" style="width:34px;height:26px;border:none;background:none;padding:0;cursor:pointer" onclick="document.querySelectorAll('.c-pc').forEach(x=>x.style.outline='')"></label></div>
   <div class="c-ft"><button class="c-bg" onclick="this.closest('.c-mask').remove()">ยกเลิก</button><button class="c-bp" onclick="NDCAL.tagSave('${sc}','${id}')">บันทึก</button></div></div>`; document.body.appendChild(m); setTimeout(()=>$('c-tgn')?.focus(),30); }

/* ── คำสั่ง ── */
window.NDCAL={ render, open,
  close:closeFloat, tipOff,
  view(v){ ST.view=v; saveST(); render(); },
  nav(n){ const c=ST.cur; ST.cur=n===0?(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; })():ST.view==='week'?addD(c,7*n):new Date(c.getFullYear(),c.getMonth()+n,1); render(); },
  go(k,v){ ST.cur=pd(k); if(v){ ST.view=v; saveST(); } render(); },
  fold(k){ ST.open[k]=!ST.open[k]; saveST(); render(); },
  lay(k,v){ const m=k.match(/^(me|team):(.+)$/); if(m){ const lk=LK(m[1]); ST.L[lk]=ST.L[lk]||{}; ST.L[lk][m[2]]=v; } else ST.L[k]=v; saveST(); render(); },
  add(day,time){ openDlg(null, day, time); },
  edit(id){ closeFloat(); openDlg(findAny(id)); },
  dates:projDates,
  goProj(pid){ closeFloat(); document.querySelector('.c-mask')?.remove(); if(canOpenProj()) safe(()=>openEditProject(pid)); },
  down(e,id){ if(e.button!==0) return; const it=findAny(id); if(!it) return; const u=under(e), rz=e.target.dataset.rz, rzb=e.target.dataset.rzb;
    DR={it, el:e.currentTarget, x:e.clientX, y:e.clientY, mode:rz==='L'?'resizeL':rz?'resize':rzb?'resizeT':it.kind==='proj'?'proj':'move', from:u?u.dataset.d:it.start, ed:canEdit(it)}; e.preventDefault(); },
  phDown(e,id,k){ if(e.button!==0) return; e.stopPropagation(); const p=findAny(id), ph=p.phases[k], P=PH.find(x=>x.k===k), u=under(e), h=e.target.dataset.h;
    DR={pid:id, ph:k, it:{...ph, title:P.name+' · '+p.title, kind:'phase'}, color:P.color, el:e.currentTarget, x:e.clientX, y:e.clientY, mode:h==='L'?'resizeL':h==='R'?'resize':'move', from:u?u.dataset.d:ph.start, ed:canEdit(p)}; e.preventDefault(); },
  tip(e,id){ const it=findAny(id); if(!it) return; tipAt(e,`<b>${E(it.title)}</b><div class="m">${whenTxt(it)}</div><div class="m">${it.scope==='me'?'🙋 ส่วนตัว':'🏢 ทีม'} · ${E(catName(it))}${it.owner?' · 🗂️ '+E(it.owner):''}</div>${edLine(it.edBy,it.at)}`); },
  phTip(e,id,k){ const p=findAny(id), ph=p.phases[k], P=PH.find(x=>x.k===k); tipAt(e,`<b>${P.name} · ${E(p.title)}</b><div class="m">${thD(ph.start)}${ph.end>ph.start?' – '+thD(ph.end):''}${ph.time?' · ต้องเสร็จ '+E(ph.time)+' น.':''}</div><div style="margin-top:3px">👤 ${ph.who.length?'<b>'+ph.who.map(E).join(', ')+'</b>':'<span class="m">ยังไม่ได้มอบหมาย</span>'}</div>${p.owner?`<div class="m">🗂️ เมเนเจอร์ ${E(p.owner)}</div>`:''}${edLine(p.edBy,p.at)}`); },
  ctx(e,id){ const it=findAny(id); if(!it) return; e.preventDefault(); e.stopPropagation(); const ed=canEdit(it), I=E(id); let h;
    if(it.kind==='todo') h=`<div onclick="NDCAL.close();NDCAL.todoDone('${E(it.rid)}',true)">✓ ทำเสร็จแล้ว</div><div class="dang" onclick="NDCAL.close();NDCAL.todoDel('${E(it.rid)}')">🗑️ ลบ To-do</div>`;
    else if(it.kind==='proj') h=canProj()?`<div onclick="NDCAL.dates('${I}')">✏️ แก้วัน / เลื่อนเดดไลน์</div>${canOpenProj()?`<div onclick="NDCAL.goProj('${E(it.pid)}')">📁 แก้ข้อมูลโปรเจกต์ ›</div>`:''}`:`<div onclick="NDCAL.close();NDCAL.card('${I}',${e.clientX},${e.clientY})">👁️ ดูรายละเอียด</div>`;
    else if(!ed) h=`<div onclick="NDCAL.close();NDCAL.card('${I}',${e.clientX},${e.clientY})">👁️ ดูรายละเอียด</div><div style="color:var(--text2);cursor:default">🔒 อีเวนต์ของ ${E(it.byName||'คนอื่น')}</div>`;
    else { const sc=it.scope==='me'?'me':'team', f=sc==='me'?'tag':'cat', one=(k,t,kid)=>`<div onclick="NDCAL.close();NDCAL.setF('${I}','${f}','${k}')" style="${kid?'padding-left:34px;font-size:12.5px':''}"><span class="sw" style="background:${E(t.color)}"></span>${E(t.name)}${it[f]===k?' ✓':''}</div>`, tg=tagTree(sc).map(g=>one(g.id,g.t)+g.kids.map(k=>one(k.id,k.t,1)).join('')).join('');
      h=`<div onclick="NDCAL.edit('${I}')">✏️ แก้ไข</div><div onclick="NDCAL.close();NDCAL.dup('${I}')">⧉ ทำซ้ำ</div>${it.scope==='me'?`<div onclick="NDCAL.close();NDCAL.toTeam('${I}')">📢 ย้ายไปปฏิทินทีม</div>`:''}<hr>${tg}<hr><div class="dang" onclick="NDCAL.close();NDCAL.delEv('${I}')">🗑️ ลบ</div>`; }
    closeFloat(); tipOff(); const m=document.createElement('div'); m.className='c-ctx'; m.innerHTML=h; document.body.appendChild(m); place(m,e.clientX-8,e.clientY-8); },
  ctxDay(e,k,time){ e.preventDefault(); closeFloat(); tipOff(); const m=document.createElement('div'); m.className='c-ctx';
    m.innerHTML=`<div onclick="NDCAL.close();NDCAL.add('${k}'${time?`,'${time}'`:''})">＋ เพิ่มนัดหมาย ${thD(k)}${time?' '+time:''}</div><div onclick="NDCAL.close();NDCAL.add('${k}'${time?`,'${time}'`:''});NDCAL.dlgTeam(true)">📢 เพิ่มลงปฏิทินทีม</div><hr><div onclick="NDCAL.close();NDCAL.todoAdd(prompt('To-do วันที่ ${thD(k)}:')||'','${k}')">☑ เพิ่ม To-do วันนี้</div>`;
    document.body.appendChild(m); place(m,e.clientX-8,e.clientY-8); },
  card(id,x,y){ openCard(id,{clientX:x,clientY:y}); },
  phSave(id,k){ const p=findAny(id), m=model(p), b4=model(p), ph=m.phases[k]; ph.time=$('c-pht').value; ph.done=$('c-phd').checked; closeFloat();
    if(JSON.stringify(m)!==JSON.stringify(b4)) saveProj(p.pid, m, PH.find(x=>x.k===k).name+(ph.done?' ✓ เสร็จแล้ว':ph.time?' ต้องเสร็จ '+ph.time+' น.':' บันทึกแล้ว'), ()=>saveProj(p.pid,b4,'เลิกทำแล้ว')); },
  async projDone(pid,v){ if(!canProj()) return; const P=PROJ.find(x=>x.id===pid); if(!P||P.projStatus==='paid') return; const old=P.projStatus||'', nu=v?'done':(old==='done'?'inprogress':old);
    const r=await projWrite(pid, p=>{ p.projStatus=nu; if(v) p.doneAt=p.doneAt||new Date().toISOString(); }, ()=>['projStatus','doneAt']);
    if(!r||!r.ok){ safe(()=>toast('บันทึกสถานะไม่สำเร็จ'+(r&&r.error?': '+r.error.message+' (ต้องวาง Firebase Rules v7)':''),'error')); return; } if(r.saved){ const i=PROJ.findIndex(x=>x.id===pid); if(i>=0) PROJ[i]=r.saved; } else P.projStatus=nu;
    closeFloat(); render(); say(v?'✅ ตั้งเป็นเสร็จแล้ว (หน้าโปรเจกต์เปลี่ยนตาม)':'↩️ กลับเป็นกำลังทำ', ()=>NDCAL.projDone(pid,!v)); },
  pdN(n){ const i=$('pd-n'); i.value=(+i.value||0)+n; },
  pdChain(el){ const rows=[...document.querySelectorAll('.c-mask [data-f="end"]')], i=rows.indexOf(el), old=el.dataset.old, nu=el.value; el.dataset.old=nu; const nx=rows[i+1]; if(!nx||!nu) return;
    const ns=document.querySelector(`.c-mask [data-k="${nx.dataset.k}"][data-f="start"]`); if(ns.value&&ns.value!==old) return;
    const dur=ns.value&&nx.value?Math.max(0,dd(ns.value,nx.value)):0; ns.value=nu; nx.value=shift(nu,dur); safe(()=>ns.animate([{boxShadow:'0 0 0 2px #65C2F5'},{boxShadow:'none'}],{duration:800})); NDCAL.pdChain(nx); },
  pdSave(id){ const p=findAny(id), m=model(p), b4=model(p), n=+$('pd-n').value||0;
    m.pStart=$('pd-s').value||m.pStart; m.pEnd=$('pd-e').value||m.pEnd; if(m.pEnd<m.pStart) m.pEnd=m.pStart; m.endTime=$('pd-et').value;
    document.querySelectorAll('.c-mask [data-k]').forEach(el=>{ const ph=m.phases[el.dataset.k]; if(el.dataset.f==='time') ph.time=el.value; else if(el.value) ph[el.dataset.f]=el.value; if(ph.end<ph.start) ph.end=ph.start; });
    if(n){ m.pStart=shift(m.pStart,n); m.pEnd=shift(m.pEnd,n); Object.values(m.phases).forEach(ph=>{ ph.start=shift(ph.start,n); ph.end=shift(ph.end,n); }); }
    document.querySelector('.c-mask')?.remove();
    if(JSON.stringify(m)!==JSON.stringify(b4)) saveProj(p.pid, m, (n?'เลื่อนทั้งโปรเจกต์ '+(n>0?'+':'')+n+' วัน · ':'')+'บันทึกแล้ว · ส่งลูกค้า '+thD(m.pEnd)+(m.endTime?' '+m.endTime:''), ()=>saveProj(p.pid,b4,'เลิกทำแล้ว')); },
  dlgTeam(v){ DLG.team=v; const c=$('c-fteam'); if(c) c.checked=v; chips(); },
  dlgPick(f,v){ DLG[f]=v; chips(); },
  async dlgSave(){ const g=x=>($(x)||{}).value||'', title=g('c-ft').trim(); if(!title){ $('c-ft').focus(); return; }
    let s=g('c-fs')||TODAY(), e=g('c-fe')||s; if(e<s) e=s; const ad=$('c-fad').checked, u=CU()||{}, now=new Date().toISOString();
    const old=DLG.id?findAny(DLG.id):null, oldK=old?(old.scope==='team'?'team':'mine'):'', k=DLG.team?'team':'mine', raw=old?D[oldK][old.rid]||{}:{};
    const ev={...raw, id:old&&oldK===k?old.rid:uid(), title, start:s, end:e, time:ad?'':g('c-fa'), endTime:ad?'':g('c-fb'), note:g('c-fn').replace(/\r\n?/g,'\n').trim(), at:raw.at||now, upd:now, updBy:ME(), by:raw.by||u.uid||'', byName:raw.byName||ME()};
    if(k==='team'){ ev.cat=DLG.cat; delete ev.tag; delete ev.color; } else { ev.tag=DLG.tag; delete ev.cat; }
    try{ await put(k, ev, ev.id); if(old&&oldK!==k) await del(oldK, old.rid); document.querySelector('.c-mask')?.remove(); render(); say(old?'บันทึกแล้ว':k==='team'?'📢 เพิ่มในปฏิทินทีมแล้ว':'เพิ่มในปฏิทินของฉันแล้ว'); }catch(e){} },
  async delEv(id){ closeFloat(); const it=findAny(id); if(!it||!canEdit(it)) return; const k=it.scope==='team'?'team':'mine', raw=D[k][it.rid]; await del(k, it.rid); render(); say('ลบ "'+it.title+'" แล้ว', ()=>put(k, raw, raw.id).then(render)); },
  setF(id,f,v){ const it=findAny(id); if(it) saveEv(it,{[f]:v}); },
  async dup(id){ const it=findAny(id), k=it.scope==='team'?'team':'mine', raw=D[k][it.rid], now=new Date().toISOString(); const c={...raw, id:uid(), at:now, upd:now, by:myUid(), byName:ME(), updBy:ME()}; await put(k,c,c.id); render(); say('ทำซ้ำแล้ว'); },
  async toTeam(id){ const it=findAny(id), raw=D.mine[it.rid]; if(!raw||!confirm('ย้าย "'+raw.title+'" ไปปฏิทินทีม? ทั้งทีมจะเห็น')) return; const c={...raw, id:uid(), cat:TGS('team').other?'other':Object.keys(TGS('team'))[0], by:myUid(), byName:ME(), updBy:ME(), upd:new Date().toISOString()}; delete c.tag; await put('team',c,c.id); await del('mine',raw.id); render(); say('📢 ย้ายไปปฏิทินทีมแล้ว'); },
  async tagAdd(sc,parent,inDlg){ sc=sc||'me'; const T={...TGS(sc)}, P=parent&&T[parent]; const n=prompt(P?'ชื่อแท็กย่อยใต้ "'+P.name+'" (เช่น พากย์ · มิกซ์):':'ชื่อแท็กใหม่:'); if(!n||!n.trim()) return;
    const id='t'+uid(); T[id]={name:n.trim(), color:P?P.color:PALETTE.concat(PAL2)[Object.keys(T).length%22], ...(P?{parent}:{}), by:ME()}; await put(TK(sc),T);
    if(inDlg){ DLG[sc==='team'?'cat':'tag']=id; chips(); } render(); say('🏷️ เพิ่มแท็ก "'+n.trim()+'" แล้ว — กด ✎ เพื่อเปลี่ยนสี'); },
  tagEdit(sc,id){ tagDlg(sc,id); },
  async tagSave(sc,id){ const T={...TGS(sc)}, o=T[id]||{}, pe=$('c-tgp'); T[id]={...o, name:($('c-tgn').value||'').trim()||o.name, color:($('c-tgc')||{}).value||o.color};
    if(pe){ if(pe.value&&pe.value!==id) T[id].parent=pe.value; else delete T[id].parent; } document.querySelector('.c-mask')?.remove(); await put(TK(sc),T); render(); },
  async tagDel(sc,id){ const T={...TGS(sc)}; if(Object.keys(T).length<=1){ say('ต้องมีแท็กอย่างน้อย 1 อัน'); return; }
    const kids=Object.keys(T).filter(k=>T[k].parent===id), to=T[id].parent&&T[T[id].parent]?T[id].parent:Object.keys(T).find(x=>x!==id&&!kids.includes(x)&&!T[x].parent)||Object.keys(T).find(x=>x!==id);
    const k2=sc==='team'?'team':'mine', f=sc==='team'?'cat':'tag', used=Object.values(D[k2]).filter(e=>e&&e[f]===id);
    if(!confirm('ลบแท็ก "'+T[id].name+'"?'+(kids.length?'\nแท็กย่อย '+kids.length+' อันจะกลายเป็นแท็กหลัก':'')+(used.length?'\nงาน '+used.length+' รายการจะย้ายไปแท็ก "'+(T[to]||{}).name+'"':''))) return;
    kids.forEach(k=>{ T[k]={...T[k]}; delete T[k].parent; }); delete T[id]; await put(TK(sc),T); for(const e of used) await put(k2,{...e, [f]:to},e.id); render(); },
  async todoAdd(v,due){ v=String(v||'').trim(); if(!v) return; const t={id:uid(), text:v, done:false, at:new Date().toISOString()}; if(due) t.due=due; await put('todo',t,t.id); render(); if(!due) setTimeout(()=>$('cl-td')?.focus(),0); },
  async todoDone(id,v){ const t=D.todo[id]; if(t){ await put('todo',{...t, done:v, doneAt:v?new Date().toISOString():''},id); render(); } },
  async todoDel(id){ await del('todo',id); render(); },
};

/* ── ใครเป็นพนักงาน → เมนู ── */
async function detect(){ const u=CU(), db=DB(); if(!u) return;
  if(u.uid && db && u.role!=='admin' && (u._empChecked!==u.uid || Date.now()-(u._empAt||0)>60000)){ u._empChecked=u.uid; u._empAt=Date.now(); try{ u.emp=(await db.ref('admin_config/employees/'+u.uid).get()).val()===true; }catch(e){} }
  document.querySelectorAll('.nd-emp-nav').forEach(w=>{ w.style.display=(u.role!=='admin'&&u.role!=='manager'&&(u.acct||u.emp))?'':'none'; }); }
setInterval(()=>{ try{ ensurePage(); }catch(e){} detect().catch(()=>{}); if(visible()&&DB()&&role()!=='admin'&&role()!=='manager'&&!DR) projects().then(p=>{ if(p!==PROJ){ PROJ=p; render(); } }); }, 3000);
window.addEventListener('guindatachange', e=>{ if(e.detail&&e.detail.key==='projects_cache'&&visible()&&(role()==='admin'||role()==='manager')&&!DR){ PROJ=safe(()=>getProjects(),[])||[]; render(); } });
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensurePage); else ensurePage();
})();
