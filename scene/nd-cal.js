/* ══════════════════════════════════════════════════════════════
   📅 nd-cal.js — หน้า "ติดตามงาน" = ปฏิทินกลางของบริษัท (แบบ Notion Calendar)
   ─ 🏢 ปฏิทินทีม   : พนักงานทุกคนเห็นเหมือนกัน — งานโปรเจกต์ (วันเริ่ม→เดดไลน์) · เฟสงาน · กิจกรรมทีม
   ─ 🙋 ของฉัน      : ปฏิทินส่วนตัว + To-do (คนอื่นไม่เห็น) · ติ๊กโชว์ปฏิทินทีมซ้อนได้ · ร่างไว้แล้วกดส่งเข้าทีม
   ─ 📋 ตารางเดิม   : หน้าติดตามงานแบบเดิม (แอดมิน/เมเนเจอร์)
   ใครเข้าได้: แอดมิน · เมเนเจอร์ · นักบัญชี · คนที่ติ๊ก "พนักงานบริษัท" (admin_config/employees/<uid>)
   ข้อมูล: teamcal/events/<id> (พนักงานอ่าน/เขียน) · privcal/<uid>/{events,todos}/<id> (เจ้าของคนเดียว)
   ══════════════════════════════════════════════════════════════ */
(function(){
const $=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(f,d)=>{ try{ const v=f(); return v==null?d:v; }catch(e){ return d; } };
const CU=()=>safe(()=>currentUser,null), DB=()=>safe(()=>_fbDatabase,null);
const role=()=>safe(()=>CU().role,'');
const canSee=()=>{ const u=CU(); return !!u && (u.role==='admin'||u.role==='manager'||u.acct===true||u.emp===true); };
const isStaffAdm=()=>role()==='admin'||role()==='manager';
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const pd=s=>{ const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return null; let y=+m[1]; if(y>2400) y-=543; return new Date(y,+m[2]-1,+m[3]); };
const addD=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const TODAY=()=>ymd(new Date());
const TM=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'], TMF=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const WD=['อา','จ','อ','พ','พฤ','ศ','ส'];
const thD=s=>{ const d=pd(s); return d?d.getDate()+' '+TM[d.getMonth()]+' '+String(d.getFullYear()+543).slice(2):''; };
const COLORS=['#4F8CFF','#00B4FF','#00C48C','#FFB020','#FF6B6B','#9B6FFF','#FF6FAE','#8A94A6'];
const uid=()=>'E'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ── สถานะหน้า ── */
const ST={tab:'team', view:'month', cur:new Date(), q:'',
  L:safe(()=>JSON.parse(localStorage.getItem('guin3_cal_layers')),null)||{proj:true, phase:false, team:true, mine:true, todo:true, teamInMine:false}};
const saveL=()=>{ try{ localStorage.setItem('guin3_cal_layers', JSON.stringify(ST.L)); }catch(e){} };
const D={team:{}, mine:{}, todo:{}, proj:null, projAt:0, live:false};

/* ── โหลด / บันทึก (Firebase · ไม่มีก็ใช้ในเครื่อง) ── */
const lsk=k=>'guin3_cal_'+k+'_'+(safe(()=>CU().uid,'local'));
const lget=k=>safe(()=>JSON.parse(localStorage.getItem(lsk(k))),null)||{};
const lset=(k,v)=>{ try{ localStorage.setItem(lsk(k), JSON.stringify(v)); }catch(e){} };
function path(kind){ const u=safe(()=>CU().uid,''); return kind==='team'?'teamcal/events':kind==='mine'?'privcal/'+u+'/events':'privcal/'+u+'/todos'; }
function attach(){
  if(D.live) return; D.live=true; const db=DB();
  if(!db){ D.team=lget('team'); D.mine=lget('mine'); D.todo=lget('todo'); return; }
  ['team','mine','todo'].forEach(k=>{ try{ db.ref(path(k)).on('value', sn=>{ D[k]=sn.val()||{}; if(visible()) render(); }, e=>{ console.warn('cal '+k, e&&e.message); D['err_'+k]=String(e&&e.message||e); if(visible()) render(); }); }catch(e){} });
}
async function put(kind, ev){ const db=DB(); D[kind][ev.id]=ev; if(db){ try{ await db.ref(path(kind)+'/'+ev.id).set(ev); }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message+(kind==='team'?' (ต้องวาง Firebase Rules v6)':''),'error'); throw e; } } else lset(kind, D[kind]); }
async function del(kind, id){ const db=DB(); delete D[kind][id]; if(db){ try{ await db.ref(path(kind)+'/'+id).remove(); }catch(e){ toast('ลบไม่สำเร็จ: '+e.message,'error'); } } else lset(kind, D[kind]); }
async function projects(){
  if(isStaffAdm() || !DB()) return safe(()=>getProjects(),[])||[];
  if(D.proj && Date.now()-D.projAt<5*60e3) return D.proj;
  try{ const sn=await DB().ref('projects').get(); D.proj=Object.values(sn.val()||{}).filter(Boolean); D.projAt=Date.now(); }catch(e){ D.proj=safe(()=>getProjects(),[])||[]; }
  return D.proj;
}

/* ── รวมรายการในช่วงวันที่ ── */
const code=p=>safe(()=>projCode(p),'')||'';
const pname=p=>safe(()=>projDisp(p),p.name||'');
function items(list, from, to){
  const out=[], inR=(a,b)=>!(b<from||a>to), q=ST.q.trim().toLowerCase(), mineTab=ST.tab==='me', L=ST.L;
  const showTeam=!mineTab || L.teamInMine;
  const add=it=>{ if(!it.start) return; it.end=it.end&&it.end>=it.start?it.end:it.start; if(!inR(it.start,it.end)) return; if(q && !String(it.title+' '+(it.note||'')).toLowerCase().includes(q)) return; out.push(it); };
  if(showTeam && L.proj) list.forEach(p=>{ if(!p||p.projStatus==='cancelled') return; const s=String(p.startDate||p.date||'').slice(0,10), e=String(p.deadline||'').slice(0,10)||s;
    const done=p.projStatus==='done'||p.projStatus==='paid', over=!done && e && e<TODAY();
    add({k:'proj', id:p.id, title:pname(p), start:s||e, end:e, color:done?'#00C48C':over?'#FF6B6B':p.projStatus==='inprogress'?'#4F8CFF':'#8A94A6', done, over, src:p}); });
  if(showTeam && L.phase) list.forEach(p=>{ if(!p||p.projStatus==='cancelled'||p.projStatus==='done'||p.projStatus==='paid') return;
    safe(()=>PHASES,[]).forEach(P=>{ const ph=(p.phases||{})[P.key]; if(!ph||!(ph.deadline||ph.startDate)) return;
      add({k:'phase', id:p.id+'|'+P.key, title:P.emoji+' '+(code(p)||p.name||''), start:String(ph.startDate||ph.deadline).slice(0,10), end:String(ph.deadline||ph.startDate).slice(0,10), color:P.color, done:ph.status==='done', src:p, ph:P}); }); });
  if(showTeam && L.team) Object.values(D.team).forEach(e=>e&&add({k:'team', ...e, color:e.color||COLORS[0]}));
  if(mineTab && L.mine) Object.values(D.mine).forEach(e=>e&&add({k:'mine', ...e, color:e.color||COLORS[5]}));
  if(mineTab && L.todo) Object.values(D.todo).forEach(t=>t&&t.due&&add({k:'todo', id:t.id, title:'☑ '+t.text, start:t.due, end:t.due, color:t.done?'#8A94A6':'#FFB020', done:!!t.done}));
  const rank={team:0,mine:0,todo:1,proj:2,phase:3};
  return out.sort((a,b)=>(rank[a.k]-rank[b.k]) || String(a.time||'').localeCompare(String(b.time||'')) || (b.end>b.start)-(a.end>a.start) || a.start.localeCompare(b.start));
}

/* ── CSS ── */
const CSS=`
#page-nd-cal .cl-wrap{display:grid;grid-template-columns:240px minmax(0,1fr);gap:14px;align-items:start}
@media(max-width:900px){#page-nd-cal .cl-wrap{grid-template-columns:1fr}}
#page-nd-cal .cl-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
#page-nd-cal .cl-tab{padding:8px 14px;border-radius:10px;border:1px solid var(--border2);background:var(--card);cursor:pointer;font-weight:700;font-size:13px}
#page-nd-cal .cl-tab.on{background:var(--accent2);border-color:var(--accent2);color:#fff}
#page-nd-cal .cl-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
#page-nd-cal .cl-title{font-size:19px;font-weight:800;min-width:170px}
#page-nd-cal .cl-seg{display:inline-flex;border:1px solid var(--border2);border-radius:9px;overflow:hidden}
#page-nd-cal .cl-seg button{border:none;background:var(--card);color:var(--text2);padding:7px 12px;font-family:Kanit;font-size:12.5px;cursor:pointer}
#page-nd-cal .cl-seg button.on{background:var(--bg2);color:var(--text);font-weight:700}
#page-nd-cal .cl-side{background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:12px;position:sticky;top:10px}
#page-nd-cal .cl-side h4{margin:4px 0 8px;font-size:12px;color:var(--text2);letter-spacing:.5px}
#page-nd-cal .cl-lay{display:flex;gap:8px;align-items:center;font-size:13px;padding:4px 2px;cursor:pointer}
#page-nd-cal .cl-lay i{width:12px;height:12px;border-radius:3px;display:inline-block}
#page-nd-cal .cl-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border:1px solid var(--border2);border-radius:14px;overflow:hidden;background:var(--card)}
#page-nd-cal .cl-wd{padding:7px 8px;font-size:11.5px;color:var(--text2);font-weight:700;border-bottom:1px solid var(--border2);background:var(--bg2)}
#page-nd-cal .cl-day{min-height:112px;border-right:1px solid var(--border2);border-bottom:1px solid var(--border2);padding:4px 4px 6px;cursor:pointer;position:relative;transition:background .12s}
#page-nd-cal .cl-day:nth-child(7n){border-right:none}
#page-nd-cal .cl-day:hover{background:rgba(128,150,180,.06)}
#page-nd-cal .cl-day.out{opacity:.45}
#page-nd-cal .cl-day.drop{background:rgba(0,180,255,.12)}
#page-nd-cal .cl-dn{font-size:12px;font-weight:700;color:var(--text2);display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}
#page-nd-cal .cl-day.today .cl-dn b{background:#FF5A4F;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center}
#page-nd-cal .cl-plus{opacity:0;font-size:15px;color:var(--text2)} #page-nd-cal .cl-day:hover .cl-plus{opacity:1}
#page-nd-cal .cl-ch{display:block;font-size:11.5px;line-height:1.35;padding:2px 6px;border-radius:6px;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;border-left:3px solid var(--c);background:color-mix(in srgb,var(--c) 18%,transparent)}
#page-nd-cal .cl-ch.cont{opacity:.55;font-size:10.5px}
#page-nd-cal .cl-ch.done{text-decoration:line-through;opacity:.55}
#page-nd-cal .cl-ch.over{box-shadow:inset 0 0 0 1px #FF6B6B}
#page-nd-cal .cl-more{font-size:11px;color:var(--accent2);padding:1px 6px;cursor:pointer}
#page-nd-cal .cl-wk{grid-column:1/-1;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));min-height:118px;border-bottom:1px solid var(--border2)}
#page-nd-cal .cl-wk:last-child{border-bottom:none}
#page-nd-cal .cl-week .cl-wk{min-height:420px}
#page-nd-cal .cl-bg{grid-row:1/-1;border-right:1px solid var(--border2);padding:4px 6px;cursor:pointer;transition:background .12s;min-width:0}
#page-nd-cal .cl-bg:nth-child(7){border-right:none}
#page-nd-cal .cl-bg:hover{background:rgba(128,150,180,.06)} #page-nd-cal .cl-bg.out{background:rgba(0,0,0,.12)} #page-nd-cal .cl-bg.out .cl-dn{opacity:.45}
#page-nd-cal .cl-bg.drop{background:rgba(0,180,255,.14)}
#page-nd-cal .cl-bg.today .cl-dn b{background:#FF5A4F;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center}
#page-nd-cal .cl-bg:hover .cl-plus{opacity:1}
#page-nd-cal .cl-bar{z-index:1;align-self:center;margin:0 3px;font-size:11.5px;line-height:1.3;padding:2px 7px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;background:color-mix(in srgb,var(--c) 24%,var(--card));border-left:3px solid var(--c);min-width:0}
#page-nd-cal .cl-bar.l{border-top-left-radius:0;border-bottom-left-radius:0;border-left-width:0;margin-left:0}
#page-nd-cal .cl-bar.r{border-top-right-radius:0;border-bottom-right-radius:0;margin-right:0}
#page-nd-cal .cl-bar.done{text-decoration:line-through;opacity:.5}
#page-nd-cal .cl-bar.over{box-shadow:inset 0 0 0 1px #FF6B6B}
#page-nd-cal .cl-bar:hover{filter:brightness(1.15)}
#page-nd-cal .cl-week .cl-bar{white-space:normal}
#page-nd-cal .cl-mc{z-index:1;align-self:center;font-size:11px;color:var(--accent2);padding:0 7px;cursor:pointer;white-space:nowrap}
#page-nd-cal .cl-list{background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:6px 14px}
#page-nd-cal .cl-lrow{display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--border2)}
#page-nd-cal .cl-now{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px}
#page-nd-cal .cl-nowc{min-width:210px;background:var(--card);border:1px solid var(--border2);border-radius:12px;padding:9px 11px;cursor:pointer}
#page-nd-cal .cl-pbar{height:5px;border-radius:3px;background:var(--bg2);overflow:hidden;margin-top:6px} #page-nd-cal .cl-pbar>i{display:block;height:100%;background:var(--accent2)}
#page-nd-cal .cl-todo{display:flex;gap:6px;align-items:flex-start;padding:5px 2px;font-size:13px;border-bottom:1px dashed var(--border2)}
#page-nd-cal .cl-todo.done span{text-decoration:line-through;color:var(--text2)}
#cl-ed .cl-sw{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;display:inline-block}
#cl-ed .cl-sw.on{border-color:var(--text)}
`;

/* ── วาดหน้า ── */
const visible=()=>{ const p=$('page-nd-cal'); return p && !p.classList.contains('hidden'); };
function ensurePage(){
  if($('page-nd-cal')) return; const mc=document.querySelector('.main-content'); if(!mc) return;
  if(!$('cl-css')){ const st=document.createElement('style'); st.id='cl-css'; st.textContent=CSS; document.head.appendChild(st); }
  const d=document.createElement('div'); d.id='page-nd-cal'; d.className='page hidden';
  d.innerHTML=`<div class="page-header"><div class="page-title">📅 ติดตามงาน</div><div class="page-subtitle">ปฏิทินกลางของบริษัท — ทีมกำลังทำอะไร ถึงไหนแล้ว · มีปฏิทินส่วนตัวและ To-do ของแต่ละคน</div></div><div id="nd-cal-body"></div>`;
  mc.appendChild(d);
  new MutationObserver(()=>{ if(visible()) open(); }).observe(d,{attributes:true,attributeFilter:['class']});
}
let PROJ=[];
async function open(){ if(!canSee()){ const b=$('nd-cal-body'); if(b) b.innerHTML='<div style="padding:40px;text-align:center;color:var(--text2)">🔒 สำหรับพนักงานบริษัท (แอดมิน · เมเนเจอร์ · บัญชี · พนักงาน)</div>'; return; }
  attach(); render(); PROJ=await projects(); render(); }
function range(){ const c=ST.cur;
  if(ST.view==='week'){ const s=addD(c,-c.getDay()); return [s, addD(s,6)]; }
  if(ST.view==='list'){ const s=new Date(); s.setHours(0,0,0,0); return [s, addD(s,30)]; }
  const f=new Date(c.getFullYear(),c.getMonth(),1), s=addD(f,-f.getDay()), l=new Date(c.getFullYear(),c.getMonth()+1,0), e=addD(l,6-l.getDay()); return [s,e]; }
function titleTxt(){ const c=ST.cur; if(ST.view==='week'){ const [s,e]=range(); return s.getDate()+' '+TM[s.getMonth()]+' – '+e.getDate()+' '+TM[e.getMonth()]+' '+(e.getFullYear()+543); }
  if(ST.view==='list') return 'กำลังจะมาถึง 30 วัน'; return TMF[c.getMonth()]+' '+(c.getFullYear()+543); }
function chip(it, day){ const first=it.start===day || new Date(pd(day)).getDay()===0, multi=it.end>it.start;
  const drag=['team','mine','todo'].includes(it.k)?` draggable="true" ondragstart="NDCAL.drag(event,'${it.k}','${E(it.id)}')"`:'';
  const lbl=first?(it.time?it.time+' ':'')+E(it.title):'↳ '+E(it.title);
  return `<span class="cl-ch${first?'':' cont'}${it.done?' done':''}${it.over?' over':''}" style="--c:${E(it.color)}"${drag} title="${E(it.title)}${multi?' · '+thD(it.start)+' – '+thD(it.end):''}" onclick="event.stopPropagation();NDCAL.openIt('${it.k}','${E(it.id)}')">${lbl}</span>`; }
function dayCell(d, its, monthIdx, cap){ const k=ymd(d), list=its.filter(it=>it.start<=k && it.end>=k);
  const shown=cap?list.slice(0,cap):list, more=list.length-shown.length;
  return `<div class="cl-day${monthIdx!=null&&d.getMonth()!==monthIdx?' out':''}${k===TODAY()?' today':''}" data-d="${k}" onclick="NDCAL.add('${k}')" ondragover="NDCAL.over(event,this)" ondragleave="this.classList.remove('drop')" ondrop="NDCAL.drop(event,'${k}')">
    <div class="cl-dn"><b>${d.getDate()}</b><span class="cl-plus">＋</span></div>${shown.map(it=>chip(it,k)).join('')}${more>0?`<div class="cl-more" onclick="event.stopPropagation();NDCAL.dayList('${k}')">+ อีก ${more}</div>`:''}</div>`; }
const dd=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
function weekRow(ws, its, mIdx, cap){
  const days=[...Array(7)].map((_,i)=>addD(ws,i)), k0=ymd(days[0]), k6=ymd(days[6]);
  const L=its.filter(it=>it.start<=k6 && it.end>=k0).map(it=>({it, s:Math.max(0,dd(k0,it.start)), e:Math.min(6,dd(k0,it.end))}))
    .sort((a,b)=>a.s-b.s || (b.e-b.s)-(a.e-a.s));
  const lanes=[]; L.forEach(x=>{ let l=0; while(lanes[l] && lanes[l].some(y=>!(x.e<y.s||x.s>y.e))) l++; (lanes[l]=lanes[l]||[]).push(x); x.l=l; });
  const nL=cap?Math.min(cap,lanes.length):lanes.length, hid=[0,0,0,0,0,0,0];
  L.forEach(x=>{ if(cap && x.l>=cap) for(let d=x.s; d<=x.e; d++) hid[d]++; });
  const bg=days.map((d,i)=>{ const k=ymd(d); return `<div class="cl-bg${mIdx!=null&&d.getMonth()!==mIdx?' out':''}${k===TODAY()?' today':''}" style="grid-column:${i+1}" onclick="NDCAL.add('${k}')" ondragover="NDCAL.over(event,this)" ondragleave="this.classList.remove('drop')" ondrop="NDCAL.drop(event,'${k}')"><div class="cl-dn"><b>${d.getDate()}${d.getDate()===1?' '+TM[d.getMonth()]:''}</b><span class="cl-plus">＋</span></div></div>`; }).join('');
  const bars=L.filter(x=>!cap||x.l<cap).map(x=>{ const it=x.it, cutL=it.start<k0, cutR=it.end>k6;
    const drag=['team','mine','todo'].includes(it.k)?` draggable="true" ondragstart="NDCAL.drag(event,'${it.k}','${E(it.id)}')"`:'';
    return `<div class="cl-bar${cutL?' l':''}${cutR?' r':''}${it.done?' done':''}${it.over?' over':''}" style="--c:${E(it.color)};grid-row:${x.l+2};grid-column:${x.s+1}/${x.e+2}"${drag} title="${E(it.title)} · ${thD(it.start)}${it.end>it.start?' – '+thD(it.end):''}${it.time?' · '+it.time:''}" onclick="event.stopPropagation();NDCAL.openIt('${it.k}','${E(it.id)}')">${cutL?'‹ ':''}${it.time&&!cutL?'<b>'+E(it.time)+'</b> ':''}${E(it.title)}</div>`; }).join('');
  const more=cap?hid.map((n,i)=>n?`<div class="cl-mc" style="grid-row:${nL+2};grid-column:${i+1}" onclick="event.stopPropagation();NDCAL.dayList('${ymd(days[i])}')">+ อีก ${n}</div>`:'').join(''):'';
  return `<div class="cl-wk" style="grid-template-rows:28px repeat(${nL},24px)${cap&&hid.some(Boolean)?' 20px':''} 1fr">${bg}${bars}${more}</div>`;
}
function nowStrip(){ if(ST.tab!=='team'&&!ST.L.teamInMine) return ''; const t=TODAY();
  const L=PROJ.filter(p=>p&&!['cancelled','done','paid'].includes(p.projStatus) && String(p.startDate||p.date||'').slice(0,10)<=t && (String(p.deadline||'').slice(0,10)||t)>=t);
  if(!L.length) return '';
  return `<div style="font-size:12.5px;font-weight:700;margin:2px 0 6px">🔥 กำลังดำเนินอยู่ตอนนี้ (${L.length})</div><div class="cl-now">${L.sort((a,b)=>String(a.deadline).localeCompare(String(b.deadline))).map(p=>{
    const ph=safe(()=>PHASES,[]).filter(P=>(p.phases||{})[P.key]&&((p.phases[P.key].deadline)||(p.phases[P.key].startDate))), done=ph.filter(P=>p.phases[P.key].status==='done').length, pct=ph.length?Math.round(done/ph.length*100):0;
    const next=ph.find(P=>p.phases[P.key].status!=='done');
    return `<div class="cl-nowc" onclick="NDCAL.openIt('proj','${E(p.id)}')"><b style="font-size:12.5px">${E(pname(p))}</b><div style="font-size:11px;color:var(--text2);margin-top:2px">เดดไลน์ ${E(thD(p.deadline))}${next?' · ตอนนี้: '+E(next.label):''}</div><div class="cl-pbar"><i style="width:${pct}%"></i></div><div style="font-size:10.5px;color:var(--text2);margin-top:3px">เฟสเสร็จ ${done}/${ph.length}</div></div>`; }).join('')}</div>`; }
function side(){ const L=ST.L, cb=(k,lbl,col)=>`<label class="cl-lay"><input type="checkbox" ${L[k]?'checked':''} onchange="NDCAL.lay('${k}',this.checked)"><i style="background:${col}"></i>${lbl}</label>`;
  if(ST.tab==='team') return `<div class="cl-side"><h4>แสดงในปฏิทินทีม</h4>${cb('proj','งานโปรเจกต์ (เริ่ม → เดดไลน์)','#4F8CFF')}${cb('phase','เฟสงาน (บท/พากย์/มิกซ์/QC…)','#00C48C')}${cb('team','กิจกรรม / นัดหมายทีม','#9B6FFF')}
    <div style="margin-top:10px;font-size:11.5px;color:var(--text2);line-height:1.6">🟦 กำลังทำ · ⬜ ยังไม่เริ่ม · 🟩 เสร็จ · 🟥 เลยเดดไลน์<br>กดวันว่างเพื่อเพิ่มกิจกรรม · ลากกิจกรรมไปวันอื่นได้</div></div>`;
  const todos=Object.values(D.todo).filter(Boolean).sort((a,b)=>(a.done-b.done)||String(a.due||'9').localeCompare(String(b.due||'9'))||String(a.at).localeCompare(String(b.at)));
  return `<div class="cl-side"><h4>แสดงในปฏิทินของฉัน</h4>${cb('mine','โน้ต / นัดของฉัน','#9B6FFF')}${cb('todo','To-do ที่มีวันที่','#FFB020')}${cb('teamInMine','รวมปฏิทินทีมด้วย','#4F8CFF')}
    ${L.teamInMine?`<div style="padding-left:20px">${cb('proj','งานโปรเจกต์','#4F8CFF')}${cb('phase','เฟสงาน','#00C48C')}${cb('team','กิจกรรมทีม','#9B6FFF')}</div>`:''}
    <h4 style="margin-top:14px">☑ To-do ของฉัน <span style="font-weight:400">(คนอื่นไม่เห็น)</span></h4>
    <div style="display:flex;gap:6px;margin-bottom:6px"><input id="cl-td" class="form-input" style="padding:7px 9px;font-size:13px" placeholder="เพิ่มงานที่ต้องทำ… กด Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();NDCAL.todoAdd(this.value)}"></div>
    ${todos.map(t=>`<div class="cl-todo${t.done?' done':''}"><input type="checkbox" ${t.done?'checked':''} onchange="NDCAL.todoDone('${E(t.id)}',this.checked)" style="margin-top:3px"><span style="flex:1;min-width:0;word-break:break-word">${E(t.text)}${t.due?`<div style="font-size:10.5px;color:${!t.done&&t.due<TODAY()?'#FF6B6B':'var(--text2)'}">📅 ${E(thD(t.due))}</div>`:''}</span>
      <input type="date" value="${E(t.due||'')}" title="ลงวันที่ในปฏิทิน" onchange="NDCAL.todoDue('${E(t.id)}',this.value)" style="width:26px;border:none;background:transparent;color:var(--text2);cursor:pointer"><button onclick="NDCAL.todoDel('${E(t.id)}')" style="border:none;background:none;color:var(--text2);cursor:pointer">✕</button></div>`).join('')||'<div style="font-size:12px;color:var(--text2)">ยังไม่มี To-do</div>'}</div>`; }
function render(){ const b=$('nd-cal-body'); if(!b||!visible()) return; if(!canSee()){ open(); return; }
  const [s,e]=range(), from=ymd(s), to=ymd(e), its=items(PROJ, from, to);
  let main='';
  if(ST.view==='list'){ const days={}; its.forEach(it=>{ for(let d=pd(it.start); ymd(d)<=it.end && ymd(d)<=to; d=addD(d,1)){ const k=ymd(d); if(k<from) continue; (days[k]=days[k]||[]).push(it); } });
    main=`<div class="cl-list">${Object.keys(days).sort().map(k=>{ const d=pd(k); return `<div class="cl-lrow"><div style="width:86px;flex:none"><b style="font-size:15px">${d.getDate()} ${TM[d.getMonth()]}</b><div style="font-size:11px;color:var(--text2)">${k===TODAY()?'วันนี้':WD[d.getDay()]}</div></div><div style="flex:1;min-width:0">${days[k].map(it=>chip(it,it.start>=k?k:it.start)).join('')}</div></div>`; }).join('')||'<div style="padding:24px;text-align:center;color:var(--text2)">ไม่มีรายการใน 30 วันข้างหน้า</div>'}</div>`; }
  else { const weeks=[]; for(let d=new Date(s); d<=e; d=addD(d,7)) weeks.push(new Date(d));
    main=`<div class="cl-grid${ST.view==='week'?' cl-week':''}">${WD.map(w=>`<div class="cl-wd">${w}</div>`).join('')}${weeks.map(w=>weekRow(w, its, ST.view==='month'?ST.cur.getMonth():null, ST.view==='month'?4:0)).join('')}</div>`; }
  const err=D.err_team&&ST.tab==='team'?`<div style="margin-bottom:10px;padding:9px 12px;border-radius:10px;background:rgba(255,158,0,.1);border:1px solid rgba(255,158,0,.35);font-size:12.5px">⚠️ อ่านกิจกรรมทีมไม่ได้ (${E(D.err_team)}) — ให้แอดมินวาง Firebase Rules v6</div>`:'';
  b.innerHTML=`<div class="cl-tabs"><div class="cl-tab ${ST.tab==='team'?'on':''}" onclick="NDCAL.tab('team')">🏢 ปฏิทินทีม</div><div class="cl-tab ${ST.tab==='me'?'on':''}" onclick="NDCAL.tab('me')">🙋 ของฉัน (ส่วนตัว)</div>${isStaffAdm()?`<div class="cl-tab" onclick="nav('track')" title="หน้าติดตามงานแบบเดิม">📋 ตารางติดตามงานแบบเดิม</div>`:''}</div>
    ${err}${nowStrip()}
    <div class="cl-wrap">${side()}<div style="min-width:0">
      <div class="cl-bar"><button class="btn btn-sm btn-outline" onclick="NDCAL.nav(-1)">‹</button><button class="btn btn-sm btn-outline" onclick="NDCAL.nav(0)">วันนี้</button><button class="btn btn-sm btn-outline" onclick="NDCAL.nav(1)">›</button>
        <span class="cl-title">${E(titleTxt())}</span>
        <span class="cl-seg"><button class="${ST.view==='month'?'on':''}" onclick="NDCAL.view('month')">เดือน</button><button class="${ST.view==='week'?'on':''}" onclick="NDCAL.view('week')">สัปดาห์</button><button class="${ST.view==='list'?'on':''}" onclick="NDCAL.view('list')">รายการ</button></span>
        <input id="cl-q" class="form-input" style="width:170px;padding:7px 10px;font-size:13px" placeholder="🔍 ค้นหา" value="${E(ST.q)}" oninput="NDCAL.search(this.value)">
        <button class="btn btn-sm btn-blue" style="margin-left:auto" onclick="NDCAL.add('${TODAY()}')">＋ ${ST.tab==='team'?'กิจกรรมทีม':'โน้ตของฉัน'}</button></div>
      ${main}</div></div>`;
  if(ST._focusQ){ const q=$('cl-q'); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length); } ST._focusQ=false; }
}

/* ── หน้าต่างแก้กิจกรรม ── */
function people(){ const seen=new Set(); return (safe(()=>getAllStaff(),[])||[]).filter(s=>s&&s.id&&(s.employee||s.category==='manager')&&!seen.has(s.id)&&seen.add(s.id)); }
function editor(kind, ev){ document.getElementById('cl-ed')?.remove(); const isNew=!ev.id, team=kind==='team';
  const ov=document.createElement('div'); ov.id='cl-ed'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3500;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  const ppl=team?people():[], who=new Set(ev.who||[]), inp='padding:8px 10px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:Kanit;font-size:13px';
  ov.innerHTML=`<div style="background:var(--card);border:1px solid var(--border2);border-radius:16px;width:min(520px,100%);max-height:90vh;overflow:auto;padding:16px;font-family:Kanit">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><b style="font-size:15px">${team?'🏢 กิจกรรมทีม':'🙋 โน้ตของฉัน'}${isNew?' · ใหม่':''}</b><span style="font-size:11.5px;color:var(--text2)">${team?'พนักงานทุกคนเห็น':'เห็นคนเดียว'}</span><button class="btn btn-sm btn-outline" style="margin-left:auto" onclick="document.getElementById('cl-ed').remove()">✕</button></div>
    <input id="cl-t" style="${inp};width:100%;box-sizing:border-box;font-size:15px;font-weight:700" placeholder="ชื่อกิจกรรม / งาน" value="${E(ev.title||'')}">
    <div style="display:grid;grid-template-columns:1fr 1fr 110px;gap:8px;margin-top:8px"><label style="font-size:11.5px;color:var(--text2)">เริ่ม<input id="cl-s" type="date" style="${inp};width:100%;box-sizing:border-box" value="${E(ev.start||TODAY())}"></label>
      <label style="font-size:11.5px;color:var(--text2)">ถึง<input id="cl-e" type="date" style="${inp};width:100%;box-sizing:border-box" value="${E(ev.end||ev.start||TODAY())}"></label>
      <label style="font-size:11.5px;color:var(--text2)">เวลา<input id="cl-tm" type="time" style="${inp};width:100%;box-sizing:border-box" value="${E(ev.time||'')}"></label></div>
    <div style="margin-top:10px;display:flex;gap:6px;align-items:center">${COLORS.map(c=>`<span class="cl-sw${(ev.color||(team?COLORS[0]:COLORS[5]))===c?' on':''}" data-c="${c}" style="background:${c}" onclick="document.querySelectorAll('#cl-ed .cl-sw').forEach(x=>x.classList.remove('on'));this.classList.add('on')"></span>`).join('')}</div>
    <textarea id="cl-n" class="note-grow" rows="3" style="${inp};width:100%;box-sizing:border-box;margin-top:10px;resize:vertical;line-height:1.55" placeholder="รายละเอียด / โน้ต (Enter = ขึ้นบรรทัดใหม่)">${E(ev.note||'')}</textarea>
    ${team&&ppl.length?`<div style="margin-top:8px;font-size:11.5px;color:var(--text2)">ผู้เกี่ยวข้อง</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${ppl.map(s=>`<label style="font-size:12px;padding:3px 9px;border:1px solid var(--border2);border-radius:14px;cursor:pointer"><input type="checkbox" class="cl-who" value="${E(s.id)}" ${who.has(s.id)?'checked':''}> ${E(s.nickname||s.name)}</label>`).join('')}</div>`:''}
    <label style="display:flex;gap:6px;align-items:center;margin-top:10px;font-size:13px"><input id="cl-done" type="checkbox" ${ev.done?'checked':''}> เสร็จแล้ว</label>
    ${ev.byName&&!isNew?`<div style="font-size:11px;color:var(--text2);margin-top:6px">สร้างโดย ${E(ev.byName)} · ${E(thD(String(ev.at||'').slice(0,10)))}</div>`:''}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">${!isNew?`<button class="btn btn-sm btn-outline" style="color:var(--red)" onclick="NDCAL.remove('${kind}','${E(ev.id)}')">🗑️ ลบ</button>`:''}
      ${kind==='mine'?`<button class="btn btn-sm btn-outline" onclick="NDCAL.save('${kind}','${E(ev.id||'')}',true)" title="ย้ายโน้ตนี้ไปปฏิทินทีม ให้ทุกคนเห็น">📤 ส่งเข้าปฏิทินทีม</button>`:''}
      <button class="btn btn-sm btn-blue" style="margin-left:auto" onclick="NDCAL.save('${kind}','${E(ev.id||'')}')">💾 บันทึก</button></div></div>`;
  document.body.appendChild(ov); setTimeout(()=>{ const t=$('cl-t'); if(t&&isNew) t.focus(); try{ _noteGrowAll(ov); }catch(e){} },30);
}
function projInfo(p){ document.getElementById('cl-ed')?.remove(); const ov=document.createElement('div'); ov.id='cl-ed'; ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3500;display:flex;align-items:center;justify-content:center;padding:16px'; ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  const ph=safe(()=>PHASES,[]).filter(P=>(p.phases||{})[P.key]);
  ov.innerHTML=`<div style="background:var(--card);border:1px solid var(--border2);border-radius:16px;width:min(480px,100%);padding:16px;font-family:Kanit"><div style="display:flex"><b style="font-size:15px">📁 ${E(pname(p))}</b><button class="btn btn-sm btn-outline" style="margin-left:auto" onclick="document.getElementById('cl-ed').remove()">✕</button></div>
    <div style="font-size:12.5px;color:var(--text2);margin:6px 0 10px">${E(thD(p.startDate||p.date))} → เดดไลน์ ${E(thD(p.deadline))}</div>
    ${ph.map(P=>{ const x=p.phases[P.key]; return `<div style="display:flex;gap:8px;font-size:12.5px;padding:5px 0;border-top:1px solid var(--border2)"><span style="flex:1">${E(P.label)}</span><span style="color:var(--text2)">${E(thD(x.startDate))} – ${E(thD(x.deadline))}</span><b style="color:${x.status==='done'?'var(--green)':'var(--text2)'}">${x.status==='done'?'✓ เสร็จ':'…'}</b></div>`; }).join('')||'<div style="font-size:12px;color:var(--text2)">ยังไม่ได้ตั้งช่วงเฟสงาน</div>'}
    ${isStaffAdm()?`<button class="btn btn-sm btn-blue" style="margin-top:12px;width:100%" onclick="document.getElementById('cl-ed').remove();openProjDetail('${E(p.id)}')">เปิดหน้าโปรเจกต์ ›</button>`:''}</div>`;
  document.body.appendChild(ov); }

/* ── คำสั่ง ── */
let DRAG=null;
window.NDCAL={
  tab(t){ ST.tab=t; render(); }, view(v){ ST.view=v; render(); },
  nav(n){ const c=ST.cur; if(n===0) ST.cur=new Date(); else if(ST.view==='week') ST.cur=addD(c,7*n); else ST.cur=new Date(c.getFullYear(),c.getMonth()+n,1); render(); },
  lay(k,v){ ST.L[k]=v; saveL(); render(); },
  search(v){ ST.q=v; ST._focusQ=true; render(); },
  add(day){ editor(ST.tab==='team'?'team':'mine', {start:day, end:day}); },
  openIt(k,id){ if(k==='proj'||k==='phase'){ const p=PROJ.find(x=>x.id===String(id).split('|')[0]); if(p) projInfo(p); return; }
    if(k==='todo'){ ST.tab='me'; render(); return; }
    const ev=D[k][id]; if(ev) editor(k, ev); },
  dayList(day){ ST.cur=pd(day); ST.view='week'; render(); },
  async save(kind, id, toTeam){ const g=x=>(($(x)||{}).value||'').trim(); const title=g('cl-t'); if(!title){ toast('ใส่ชื่อกิจกรรมก่อน','warn'); return; }
    let s=g('cl-s')||TODAY(), e=g('cl-e')||s; if(e<s) e=s;
    const u=CU()||{}, old=(id&&D[kind][id])||{};
    const ev={...old, id:id||uid(), title, start:s, end:e, time:g('cl-tm'), note:(($('cl-n')||{}).value||'').replace(/\r\n?/g,'\n').trim(), color:(document.querySelector('#cl-ed .cl-sw.on')||{}).dataset?.c||old.color||COLORS[0], done:!!($('cl-done')||{}).checked,
      who:[...document.querySelectorAll('#cl-ed .cl-who:checked')].map(x=>x.value), at:old.at||new Date().toISOString(), upd:new Date().toISOString(), by:old.by||u.uid||'', byName:old.byName||u.nickname||u.email||''};
    try{
      if(toTeam){ if(!confirm('ส่ง "'+title+'" เข้าปฏิทินทีม? (พนักงานทุกคนจะเห็น · ลบออกจากปฏิทินส่วนตัว)')) return; await put('team', {...ev, id:uid(), at:new Date().toISOString()}); if(id) await del('mine', id); toast('📤 ส่งเข้าปฏิทินทีมแล้ว','success'); }
      else { await put(kind, ev); toast('💾 บันทึกแล้ว','success'); }
      document.getElementById('cl-ed')?.remove(); render();
    }catch(e){} },
  async remove(kind,id){ if(!confirm('ลบรายการนี้?')) return; await del(kind,id); document.getElementById('cl-ed')?.remove(); render(); },
  drag(e,k,id){ DRAG={k,id}; try{ e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed='move'; }catch(_){} },
  over(e,el){ if(!DRAG) return; e.preventDefault(); el.classList.add('drop'); },
  async drop(e,day){ e.preventDefault(); document.querySelectorAll('#page-nd-cal .cl-bg.drop,#page-nd-cal .cl-day.drop').forEach(x=>x.classList.remove('drop')); const d=DRAG; DRAG=null; if(!d) return;
    if(d.k==='todo'){ const t=D.todo[d.id]; if(t){ await put('todo',{...t, due:day}); render(); } return; }
    const ev=D[d.k][d.id]; if(!ev) return; const span=Math.round((pd(ev.end||ev.start)-pd(ev.start))/864e5);
    await put(d.k, {...ev, start:day, end:ymd(addD(pd(day),span)), upd:new Date().toISOString()}); render(); },
  async todoAdd(v){ v=String(v||'').trim(); if(!v) return; await put('todo',{id:uid(), text:v, done:false, at:new Date().toISOString()}); const i=$('cl-td'); render(); setTimeout(()=>$('cl-td')?.focus(),0); },
  async todoDone(id,v){ const t=D.todo[id]; if(t){ await put('todo',{...t, done:v, doneAt:v?new Date().toISOString():''}); render(); } },
  async todoDue(id,v){ const t=D.todo[id]; if(t){ await put('todo',{...t, due:v}); render(); } },
  async todoDel(id){ await del('todo',id); render(); },
  render, open,
};

/* ── ใครเป็นพนักงาน (เช็กครั้งแรก + ทุก 60 วิ) → เมนู ── */
async function detect(){ const u=CU(), db=DB(); if(!u) return;
  if(u.uid && db && u.role!=='admin' && (u._empChecked!==u.uid || Date.now()-(u._empAt||0)>60000)){ u._empChecked=u.uid; u._empAt=Date.now();
    try{ u.emp=(await db.ref('admin_config/employees/'+u.uid).get()).val()===true; }catch(e){} }
  document.querySelectorAll('.nd-emp-nav').forEach(w=>{ w.style.display=(u.role!=='admin'&&u.role!=='manager'&&(u.acct||u.emp))?'':'none'; });
}
setInterval(()=>{ try{ ensurePage(); }catch(e){} detect().catch(()=>{}); if(visible() && DB() && !isStaffAdm()) projects().then(p=>{ if(p!==PROJ){ PROJ=p; render(); } }); }, 3000);
window.addEventListener('guindatachange', e=>{ if(e.detail&&e.detail.key==='projects_cache'&&visible()&&isStaffAdm()){ PROJ=safe(()=>getProjects(),[])||[]; render(); } });
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensurePage); else ensurePage();
})();
