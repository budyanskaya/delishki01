const KEY="delishki-local-v2";
const OLD_KEY="studyglass-pwa-v1";
const initial=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY)||'null');
const state=initial||{tab:"home",subjects:[],deadlines:[],measurements:[],ideas:[]};
let cloudBusy=false;
let saveTimer=null;
function localSave(){localStorage.setItem(KEY,JSON.stringify(state))}
function save(){
  localSave();
  if(cloudBusy || !window.Cloud?.configured || !window.Cloud.getSession()?.access_token) return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    try{await window.Cloud.saveData(state); updateCloudBadge("Синхронизировано");}
    catch(e){updateCloudBadge("Ошибка синхронизации"); console.warn(e)}
  },450);
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function grade(s){return s>=85?"5":s>=64?"4":"2"}
function score(sub){return Math.min(100,(sub.tasks||[]).filter(x=>x.done).reduce((a,x)=>a+(+x.points||0),0))}
function icon(t){return {home:"⌂",subjects:"▦",deadlines:"◷",measurements:"◌",ideas:"✦"}[t]}
const tabs=[["home","Главная"],["subjects","Предметы"],["deadlines","Дедлайны"],["measurements","Замеры"],["ideas","Видео"]];
function render(){const a=document.querySelector("#app");a.innerHTML=`<div class="shell"><header class="top"><div class="brand-line"><div><div class="eyebrow">ДЕЛИШКИ</div><h1>${tabs.find(x=>x[0]===state.tab)[1]}</h1><div class="sub muted">${subtitle()}</div></div><div class="header-actions"><button class="cloud-badge" id="cloudBadge" onclick="openCloud()">${cloudLabel()}</button><button class="brand-mark" onclick="openCloud()">Д</button></div></div></header><div id="content">${content()}</div></div>${state.tab!=="home"?`<button class="fab" onclick="openAdd()">+</button>`:""}${nav()}`}
function subtitle(){return {home:"Учёба, планы и маленькие победы в одном месте",subjects:"Задания, баллы и прогресс",deadlines:"Сроки под контролем",measurements:"Динамика и изменения по месяцам",ideas:"Идеи для роликов и контент"}[state.tab]}
function cloudLabel(){
 if(!window.Cloud?.configured) return "☁ Подключить";
 return window.Cloud.getSession()?.access_token ? "☁ В облаке" : "☁ Войти";
}
function updateCloudBadge(text){const b=document.querySelector("#cloudBadge");if(b)b.textContent="☁ "+text}
function nav(){return `<nav class="tabs">${tabs.map(([k,n])=>`<button class="tab ${state.tab===k?"active":""}" onclick="go('${k}')"><span class="tab-icon">${icon(k)}</span><span>${n}</span></button>`).join("")}</nav>`}
function go(t){state.tab=t;save();render()}
function content(){if(state.tab==="home")return home();if(state.tab==="subjects")return subjects();if(state.tab==="deadlines")return deadlines();if(state.tab==="measurements")return measurements();return ideas()}
function ring(sc){return `<div class="ring" style="--progress:${sc*3.6}deg"><div class="ring-inner"><strong>${Math.round(sc)}</strong><span>/100</span></div></div>`}
function home(){
 if(!state.subjects.length)return `<div class="hero-card"><div class="hero-copy"><span class="kicker">СТАРТ</span><h2>Собери свои<br>делишки ✦</h2><p>Добавь предметы и задания — здесь появится аналитика твоего прогресса.</p><button class="btn" onclick="state.tab='subjects';save();render()">Добавить предмет</button></div><div class="hero-orb"></div></div>`;
 let avg=state.subjects.reduce((a,s)=>a+score(s),0)/state.subjects.length;
 let total=state.subjects.reduce((a,s)=>a+(s.tasks||[]).length,0), done=state.subjects.reduce((a,s)=>a+(s.tasks||[]).filter(x=>x.done).length,0);
 let high=state.subjects.filter(s=>score(s)>=85).length;
 let deadlineSoon=state.deadlines.filter(d=>d.date>Date.now()).sort((a,b)=>a.date-b.date)[0];
 return `<div class="hero-card"><div class="hero-copy"><span class="kicker">ОБЩИЙ ПРОГРЕСС</span><h2>${Math.round(avg)}<small> / 100</small></h2><p>${done} из ${total} заданий выполнено · ${high} ${plural(high,"предмет","предмета","предметов")} на 5</p></div>${ring(avg)}</div>
 <div class="section-title"><h3>Статистика</h3><span class="muted">сейчас</span></div>
 <div class="stats-grid"><div class="stat-card"><span>Задания</span><strong>${done}/${total}</strong><div class="mini-bar"><i style="width:${total?done/total*100:0}%"></i></div></div><div class="stat-card"><span>Предметы</span><strong>${state.subjects.length}</strong><div class="stat-note">${high} с высокой динамикой</div></div><div class="stat-card accent"><span>Средний балл</span><strong>${Math.round(avg)}</strong><div class="stat-note">оценка ${grade(avg)}</div></div><div class="stat-card"><span>Дедлайн</span><strong>${deadlineSoon?formatShort(deadlineSoon.date):"—"}</strong><div class="stat-note">${deadlineSoon?remainingText(deadlineSoon.date):"ничего срочного"}</div></div></div>
 <div class="section-title"><h3>По предметам</h3><span class="muted">${state.subjects.length}</span></div>
 ${state.subjects.map(s=>{let sc=score(s);return `<div class="card subject-card"><div class="subject-ring-wrap">${ring(sc)}</div><div class="subject-main"><div class="row between"><div><strong>${esc(s.name)}</strong><div class="muted small">Оценка ${grade(sc)} · ${(s.tasks||[]).filter(x=>x.done).length}/${(s.tasks||[]).length} заданий</div></div><span class="pill">${sc}%</span></div><div class="mini-bar big"><i style="width:${sc}%"></i></div></div></div>`}).join("")}`
}
function subjects(){return `${state.subjects.length?state.subjects.map((s,si)=>`<div class="card"><div class="row between"><div><strong class="card-title">${esc(s.name)}</strong><div class="muted">${score(s)} / 100 · оценка ${grade(score(s))}</div></div><button class="more" onclick="openMenu(event,'subject',${si})">•••</button></div>${(s.tasks||[]).map((t,ti)=>`<div class="task"><button class="check ${t.done?"on":""}" onclick="toggleTask(${si},${ti})"></button><span class="task-name" style="${t.done?"text-decoration:line-through;color:#777":""}">${esc(t.title)}</span><span class="muted points">+${t.points}</span><button class="task-more" onclick="openMenu(event,'task',${si},${ti})">•••</button></div>`).join("")}<button class="btn secondary" style="margin-top:12px;width:100%" onclick="openTask(${si})">＋ Добавить задание</button></div>`).join(""):`<div class="card empty">▦<br><br>Добавь первый предмет.</div>`}`}
function deadlines(){let arr=[...state.deadlines].sort((a,b)=>a.date-b.date);return arr.length?arr.map((d,i)=>`<div class="card deadline-card"><div class="row between"><div><span class="kicker">ДЕДЛАЙН</span><strong class="card-title">${esc(d.title)}</strong></div><button class="more" onclick="openMenu(event,'deadline',${i})">•••</button></div><div class="muted date-line">${new Date(d.date).toLocaleString("ru-RU")}</div><div class="countdown">${remaining(d.date)}</div></div>`).join(""):`<div class="card empty">◷<br><br>Дедлайнов нет.</div>`}
function remaining(date){let ms=date-Date.now();if(ms<=0)return `<span class="danger">Дедлайн прошёл</span>`;return `Осталось ${remainingText(date)}`}
function remainingText(date){let ms=Math.max(0,date-Date.now()),d=Math.floor(ms/86400000),h=Math.floor(ms/3600000)%24,m=Math.floor(ms/60000)%60;return `${d?d+" д ":""}${h} ч ${m} мин`}
function formatShort(date){return new Date(date).toLocaleDateString("ru-RU",{day:"2-digit",month:"short"}).replace(".","")}
function plural(n,a,b,c){n=Math.abs(n)%100;let x=n%10;return n>10&&n<20?c:x===1?a:x>=2&&x<=4?b:c}
function measurementStats(arr){const latest=arr[0], first=arr[arr.length-1];const fields=[["weight","Вес","кг"],["chest","Грудь","см"],["waist","Талия","см"],["lower","Низ живота","см"],["hips","Бёдра","см"],["thigh","Ляшка","см"]];return fields.map(([key,name,u])=>{let l=+latest[key]||0,f=+first[key]||0,d=l-f;return {key,name,u,l,f,d}})}
function sparkline(arr,key){let pts=arr.slice().reverse().map(x=>+x[key]||0).filter(v=>v>0);if(pts.length<2)return `<div class="spark-empty">добавь ещё замеры</div>`;let min=Math.min(...pts),max=Math.max(...pts);let range=max-min||1;let coords=pts.map((v,i)=>`${(i/(pts.length-1))*100},${92-((v-min)/range)*72}`).join(" ");return `<svg class="spark" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${coords}" fill="none" stroke="url(#g)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs></svg>`}
function measurements(){
 let arr=[...state.measurements].sort((a,b)=>b.date-a.date); if(!arr.length)return `<div class="card empty">◌<br><br>Добавь первый замер.</div>`;
 const stats=measurementStats(arr); const months=arr.length; const changes=stats.map(x=>x.d).filter(x=>x!==0); const changed=changes.length; const trend=changes.filter(x=>x<0).length;
 return `<div class="analytics-hero"><div><span class="kicker">АНАЛИТИКА</span><h2>${months}<small> ${plural(months,"замер","замера","замеров")}</small></h2><p>${changed?`Из ${changed} параметров ${trend} сейчас ниже стартового значения.`:"Сохраняй замеры, чтобы увидеть динамику."}</p></div><div class="analytics-icon">↗</div></div>
 <div class="stats-grid measure-stats"><div class="stat-card"><span>Последний замер</span><strong>${new Date(arr[0].date).toLocaleDateString("ru-RU",{day:"2-digit",month:"short"})}</strong><div class="stat-note">обновлено</div></div><div class="stat-card"><span>Период</span><strong>${months>1?months-1:0}</strong><div class="stat-note">интервалов</div></div></div>
 <div class="section-title"><h3>Динамика параметров</h3><span class="muted">от первого к последнему</span></div>
 <div class="metric-grid">${stats.map(x=>`<div class="metric-card"><div class="row between"><div><span class="muted">${x.name}</span><strong>${x.l||"—"} ${x.u}</strong></div><span class="change ${x.d<0?"down":x.d>0?"up":"flat"}">${x.d>0?"+":""}${x.d.toFixed(1)} ${x.u}</span></div><div class="spark-wrap">${sparkline(arr,x.key)}</div><div class="muted tiny">старт ${x.f||"—"} · сейчас ${x.l||"—"}</div></div>`).join("")}</div>
 <div class="section-title"><h3>История</h3><span class="muted">${months} ${plural(months,"запись","записи","записей")}</span></div>
 ${arr.map((m,i)=>{let p=arr[i+1];let vals=[["Вес",m.weight,"кг","weight"],["Грудь",m.chest,"см","chest"],["Талия",m.waist,"см","waist"],["Низ живота",m.lower,"см","lower"],["Бёдра",m.hips,"см","hips"],["Ляшка",m.thigh,"см","thigh"]];return `<div class="card measurement-history"><div class="row between"><strong>${new Date(m.date).toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</strong><button class="more" onclick="openMenu(event,'measurement',${i})">•••</button></div><div class="grid metrics">${vals.map(([n,v,u,k])=>`<div class="metric"><div class="muted tiny">${n}</div><strong>${v||"—"} ${u}</strong>${p&&v?`<div class="delta ${v-p[k]<0?"down":"up"}">${v-p[k]>0?"+":""}${(v-p[k]).toFixed(1)} ${u}</div>`:""}</div>`).join("")}</div></div>`}).join("")}`
}
function ideas(){if(!state.ideas.length)return `<div class="card empty">✦<br><br>Идей пока нет.</div>`;return `<div class="video-toolbar"><span class="pill">${state.ideas.filter(x=>x.done).length} снято</span><span class="pill">${state.ideas.filter(x=>!x.done).length} в планах</span></div><div class="grid video-grid">${state.ideas.map((x,i)=>`<div class="card idea"><div class="row between"><span class="status-dot ${x.done?"done":""}"></span><button class="more" onclick="openMenu(event,'idea',${i})">•••</button></div><strong>${esc(x.title)}</strong><p class="muted small">${esc(x.desc)}</p><p class="muted tiny">♫ ${esc(x.sound)}</p><button class="btn ${x.done?"mint":"secondary"}" style="width:100%" onclick="toggleIdea(${i})">${x.done?"Снято ✓":"Не снято"}</button></div>`).join("")}</div>`}
function modal(html){document.body.insertAdjacentHTML("beforeend",`<div class="modal" id="modal"><div class="sheet"><button class="close" onclick="closeModal()">×</button>${html}</div></div>`)}
function closeModal(){document.querySelector("#modal")?.remove()}
function openMenu(e,type,i,j){e.stopPropagation();document.querySelector("#quick-menu")?.remove();const label={subject:"предмет",task:"задание",deadline:"дедлайн",measurement:"замер",idea:"идею"}[type];document.body.insertAdjacentHTML("beforeend",`<div class="quick-backdrop" id="quick-menu" onclick="closeMenu()"><div class="quick-menu" onclick="event.stopPropagation()"><div class="quick-title">${label[0].toUpperCase()+label.slice(1)}</div><button onclick="deleteItem('${type}',${i},${j??-1})">Удалить</button><button onclick="closeMenu()">Отмена</button></div></div>`)}
function closeMenu(){document.querySelector("#quick-menu")?.remove()}
function deleteItem(type,i,j){if(type==="subject")state.subjects.splice(i,1);if(type==="task")state.subjects[i].tasks.splice(j,1);if(type==="deadline"){let arr=[...state.deadlines].sort((a,b)=>a.date-b.date);const id=arr[i].date;state.deadlines=state.deadlines.filter(x=>x.date!==id)}if(type==="measurement"){let arr=[...state.measurements].sort((a,b)=>b.date-a.date);const id=arr[i].date;state.measurements=state.measurements.filter(x=>x.date!==id)}if(type==="idea")state.ideas.splice(i,1);save();closeMenu();render()}
function openAdd(){if(state.tab==="subjects")modal(`<h2>Новый предмет</h2><input id="name" class="field" placeholder="Название"><button class="btn" style="width:100%;margin-top:8px" onclick="addSubject()">Добавить</button>`);if(state.tab==="deadlines")modal(`<h2>Новый дедлайн</h2><input id="name" class="field" placeholder="Название"><input id="date" class="field" type="datetime-local"><button class="btn" style="width:100%;margin-top:8px" onclick="addDeadline()">Добавить</button>`);if(state.tab==="measurements")modal(`<h2>Новый замер</h2><input id="date" class="field" type="date" value="${new Date().toISOString().slice(0,10)}">${["weight:Вес, кг","chest:Грудь, см","waist:Талия, см","lower:Низ живота, см","hips:Бёдра, см","thigh:Ляшка, см"].map(x=>{let [id,n]=x.split(":");return `<input id="${id}" class="field" inputmode="decimal" placeholder="${n}">`}).join("")}<button class="btn" style="width:100%;margin-top:8px" onclick="addMeasurement()">Сохранить</button>`);if(state.tab==="ideas")modal(`<h2>Новая идея</h2><input id="title" class="field" placeholder="Название"><textarea id="desc" class="field" placeholder="Идея / описание"></textarea><input id="sound" class="field" placeholder="Звук"><button class="btn" style="width:100%;margin-top:8px" onclick="addIdea()">Добавить</button>`)}
function openTask(si){modal(`<h2>Новое задание</h2><input id="title" class="field" placeholder="Название"><input id="points" class="field" type="number" min="1" max="100" value="10" placeholder="Баллы"><button class="btn" style="width:100%;margin-top:8px" onclick="addTask(${si})">Добавить</button>`)}
function addSubject(){let n=document.querySelector("#name").value.trim();if(n)state.subjects.push({name:n,tasks:[]});save();closeModal();render()}
function addTask(si){let t=document.querySelector("#title").value.trim(),p=+document.querySelector("#points").value||10;if(t)state.subjects[si].tasks.push({title:t,points:Math.max(1,Math.min(100,p)),done:false});save();closeModal();render()}
function toggleTask(si,ti){state.subjects[si].tasks[ti].done=!state.subjects[si].tasks[ti].done;save();render()}
function addDeadline(){let t=document.querySelector("#name").value.trim(),d=new Date(document.querySelector("#date").value);if(t&&d>new Date())state.deadlines.push({title:t,date:d.getTime()});save();closeModal();render()}
function num(id){return +(document.querySelector("#"+id).value.replace(",","."))||0}
function addMeasurement(){state.measurements.push({date:new Date(document.querySelector("#date").value).getTime(),weight:num("weight"),chest:num("chest"),waist:num("waist"),lower:num("lower"),hips:num("hips"),thigh:num("thigh")});save();closeModal();render()}
function addIdea(){let title=document.querySelector("#title").value.trim();if(title)state.ideas.unshift({title,desc:document.querySelector("#desc").value,sound:document.querySelector("#sound").value,done:false});save();closeModal();render()}
function toggleIdea(i){state.ideas[i].done=!state.ideas[i].done;save();render()}

function cloudForm(mode="login",message=""){
 const configured=window.Cloud?.configured;
 if(!configured) return `<div class="cloud-head"><div class="cloud-symbol">☁</div><div><span class="kicker">ОБЛАКО</span><h2>Синхронизация «Делишек»</h2><p class="muted">Данные будут храниться в твоём личном облачном аккаунте.</p></div></div><div class="cloud-info"><strong>Остался один шаг</strong><p>Подключи бесплатный Supabase-проект и вставь его URL и anon key в файл <b>cloud-config.js</b>. Я уже подготовила приложение для облачной синхронизации.</p></div><button class="btn" style="width:100%" onclick="closeModal()">Понятно</button>`;
 const user=window.Cloud.getSession()?.user;
 if(user) return `<div class="cloud-head"><div class="cloud-symbol">✓</div><div><span class="kicker">СИНХРОНИЗАЦИЯ</span><h2>Данные в облаке</h2><p class="muted">${esc(user.email||"")}</p></div></div><div class="cloud-info"><strong>Синхронизация включена</strong><p>Изменения автоматически сохраняются в облако. Можно также принудительно отправить текущие данные.</p></div><button class="btn" style="width:100%;margin-bottom:8px" onclick="pushCloud()">Сохранить сейчас</button><button class="btn secondary" style="width:100%;margin-bottom:8px" onclick="pullCloud()">Загрузить из облака</button><button class="btn secondary" style="width:100%" onclick="logoutCloud()">Выйти из аккаунта</button>`;
 return `<div class="cloud-head"><div class="cloud-symbol">☁</div><div><span class="kicker">СИНХРОНИЗАЦИЯ</span><h2>${mode==="login"?"Войти":"Создать аккаунт"}</h2><p class="muted">${mode==="login"?"Войди, чтобы открыть свои данные на любом устройстве.":"Создай аккаунт для облачного хранения."}</p></div></div>${message?`<div class="cloud-message">${esc(message)}</div>`:""}<input id="cloudEmail" class="field" type="email" autocomplete="email" placeholder="Email"><input id="cloudPassword" class="field" type="password" autocomplete="current-password" placeholder="Пароль (минимум 6 символов)"><button class="btn" style="width:100%;margin-top:8px" onclick="${mode==="login"?"loginCloud()":"signupCloud()"}">${mode==="login"?"Войти":"Создать аккаунт"}</button><button class="link-btn" onclick="openCloud('${mode==="login"?"signup":"login"}')">${mode==="login"?"Нет аккаунта? Создать":"Уже есть аккаунт? Войти"}</button>`;
}
function openCloud(mode){
 if(window.Cloud?.getSession()?.access_token) return modal(cloudForm());
 modal(cloudForm(mode||"login"));
}
async function loginCloud(){
 const email=document.querySelector("#cloudEmail").value.trim(),password=document.querySelector("#cloudPassword").value;
 if(!email||password.length<6)return openCloud("login","Проверь email и пароль.");
 try{await window.Cloud.signIn(email,password);await hydrateFromCloud();closeModal();render();}catch(e){openCloud("login",e.message)}
}
async function signupCloud(){
 const email=document.querySelector("#cloudEmail").value.trim(),password=document.querySelector("#cloudPassword").value;
 if(!email||password.length<6)return openCloud("signup","Нужны корректный email и пароль минимум из 6 символов.");
 try{const d=await window.Cloud.signUp(email,password);if(!d?.access_token){openCloud("login","Аккаунт создан. Подтверди email, затем войди.");return;}await hydrateFromCloud();closeModal();render();}catch(e){openCloud("signup",e.message)}
}
function hasLocalData(){return state.subjects.length||state.deadlines.length||state.measurements.length||state.ideas.length}
async function hydrateFromCloud(){
 cloudBusy=true;
 try{
   const cloud=await window.Cloud.loadData();
   if(cloud && (cloud.subjects||cloud.deadlines||cloud.measurements||cloud.ideas)){
     const tab=state.tab; Object.assign(state,cloud); state.tab=tab; localSave();
   } else if(hasLocalData()) {
     await window.Cloud.saveData(state);
   } else {
     await window.Cloud.saveData(state);
   }
 }finally{cloudBusy=false}
}
async function pushCloud(){try{await window.Cloud.saveData(state);updateCloudBadge("Синхронизировано");closeModal();}catch(e){openCloud("login",e.message)}}
async function pullCloud(){try{const cloud=await window.Cloud.loadData();if(cloud){const tab=state.tab;Object.assign(state,cloud);state.tab=tab;localSave();closeModal();render();}}catch(e){openCloud("login",e.message)}}
async function logoutCloud(){await window.Cloud.signOut();closeModal();render()}
async function initCloud(){
 if(!window.Cloud?.configured)return;
 try{if(window.Cloud.getSession()?.access_token){await hydrateFromCloud();updateCloudBadge("Синхронизировано");}}catch(e){console.warn(e);updateCloudBadge("Ошибка")}
}

setInterval(()=>{if(state.tab==="deadlines")document.querySelector("#content").innerHTML=deadlines()},30000)
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});render(); initCloud();
