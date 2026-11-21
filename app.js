const tg=window.Telegram?.WebApp;
tg?.ready();tg?.expand();
const root=document.getElementById('app');
const state={me:null,events:[],view:'all',selected:null,participants:[],tables:[],adminRegs:[],organizers:[],language:'en',filter:'all',editId:null,stats:null,adminStats:[],leaderboard:[],leaderboardOpen:false,leaderboardHasMore:false,visitUser:null,visitHistory:[],visitCount:0};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=iso=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}).format(new Date(iso))+' (МСК)';
const langLabel=lang=>lang==='ru'?'🇷🇺 Русский':'🇬🇧 Английский';
const statusLabel=s=>({pending:'⏳ Старая заявка ожидает обработки',approved:'✅ Вы записаны',rejected:'❌ Отклонено',cancelled:'Запись отменена'})[s]||'';
const poster=e=>`<div class="poster">${e.image_url?`<img src="${esc(e.image_url)}" alt="Афиша мероприятия" loading="lazy" onerror="this.remove()">`:'<span class="fallback">🗣️</span>'}<span class="lang-flag">🇷🇺 🇬🇧</span></div>`;
const cap=e=>Math.max(0,e.capacity-e.approved_count);
const safeUser=u=>`<div class="avatar">${u.photo_url?`<img src="${esc(u.photo_url)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:esc((u.first_name||'?').slice(0,1))}</div>`;
const API_BASE='https://yprkajaeahnxcjuawjrz.supabase.co/functions/v1/club';
const CLUB_COIN_RATE = 33;
const toClubCoin = visits => visits * CLUB_COIN_RATE;
// Завершённая встреча видна 30 минут после фактического завершения.
const visibleCompletedEvent = e => e.status !== 'completed' ||
  (e.closed_at && Date.now() < Date.parse(e.closed_at) + 30 * 60 * 1000);
async function api(url,method='GET',body){const headers={'X-Telegram-Init-Data':tg?.initData||''};if(body!==undefined)headers['Content-Type']='application/json';const r=await fetch(API_BASE+url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});let data;try{data=await r.json()}catch{data={error:'Не удалось прочитать ответ сервера'}}if(!r.ok)throw new Error(data.error||'Ошибка запроса');return data;}
function toast(msg){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.append(el);setTimeout(()=>el.remove(),3500)}
function top(){return `<div class="top"><div class="brand"><span class="logo">🌍</span><span>Speaking Club<br><span class="smallnote">Московский Политех</span></span></div><span class="tag">Участие бесплатно</span></div>`}
function nav(){return `<div class="menu"><button data-action="all">Афиша</button><button data-action="mine">Мои записи</button><button data-action="my-stats">🏅 Мои посещения</button>${state.me?.is_admin?'<button data-action="admin">⚙️ Организатор</button>':''}</div>`}
function render(){let html=top();if(state.view==='all'||state.view==='mine'){const mine=state.view==='mine';
const events=state.events.filter(e=>
  e.status!=='cancelled' &&
  visibleCompletedEvent(e) &&
  (!mine||['pending','approved'].includes(e.my_status))
);
html+=`<section class="hero"><div class="hero-emoji">🏅</div><h1>Афиша встреч</h1><p class="muted">Общайся на русском и английском</p></section><div class="tabs"><button data-action="all" class="${!mine?'active':''}">Все встречи</button><button data-action="mine" class="${mine?'active':''}">Мои записи</button></div>`;html+=events.length?`<div class="grid">${events.map(e=>`<article class="event-card" data-action="event" data-id="${e.id}">${poster(e)}<h3>${esc(e.title)}</h3><div class="date">${fmtDate(e.starts_at)}</div><div class="count">${e.status==='cancelled'?'Отменено':e.status==='completed'?'Завершено':`Свободно ${cap(e)} из ${e.capacity}`}</div>${e.my_status&&['pending','approved'].includes(e.my_status)?`<span class="pill ${e.my_status==='approved'?'green':'orange'}">${statusLabel(e.my_status)}</span>`:'<span class="pill">Бесплатно</span>'}</article>`).join('')}</div>`:`<div class="empty"><div class="emoji">🗓️</div>${mine?'Вы пока не записались на встречи':'Пока нет опубликованных встреч'}</div>`;html+=nav();}
else if(state.view==='detail'){const e=state.events.find(x=>x.id===state.selected);if(!e){state.view='all';return render()}const active=['pending','approved'].includes(e.my_status);html+=`<button class="back" data-action="all" aria-label="Назад">‹ Назад</button><section class="detail">${poster(e)}<h1>${esc(e.title)}</h1><span class="pill green">Бесплатно</span><div class="meta">📅 ${fmtDate(e.starts_at)}</div><div class="meta location">📍 ${esc(e.building)}, ауд. ${esc(e.room)}</div>${e.description?`<p class="description">${esc(e.description)}</p>`:''}
<button class="secondary small" data-action="participants">
  👥 Участники (${e.approved_count}/${e.capacity})
</button>
<div class="places"><span class="pill">Осталось ${cap(e)} мест</span></div>${e.status==='cancelled'?'<div class="notice">Встреча отменена</div>':e.status==='completed'?'<div class="notice">✅ Встреча завершена. Посещение учтено, если вы не отменили запись до закрытия.</div>':new Date(e.starts_at)<=new Date()?'<div class="notice">Встреча уже прошла</div>':active?`<div class="notice">${statusLabel(e.my_status)}<br>Ваш язык общения: <b>${langLabel(e.my_language)}</b>${e.my_status==='pending'?'<br>Организатор ещё не подтвердил вашу заявку.':`<br><b>Ваш стол: №${e.my_table||'не назначен'}</b>`}</div><div class="choices"><button class="choice ${e.my_language==='ru'?'selected':''}" data-action="change-lang" data-lang="ru">🇷🇺 Русский</button><button class="choice ${e.my_language==='en'?'selected':''}" data-action="change-lang" data-lang="en">🇬🇧 Английский</button></div><button class="danger" data-action="cancel">Отменить запись</button>`:`<h3>На каком языке хочешь общаться?</h3><div class="choices"><button class="choice ${state.language==='ru'?'selected':''}" data-action="select-lang" data-lang="ru">🇷🇺 Русский</button><button class="choice ${state.language==='en'?'selected':''}" data-action="select-lang" data-lang="en">🇬🇧 Английский</button></div><button class="primary" data-action="register" ${cap(e)===0?'disabled':''}>${cap(e)===0?'Мест нет':'Записаться'}</button><div class="smallnote" style="margin-top:10px">Запись подтверждается сразу. Стол назначается автоматически.</div>`}</section>${nav()}`;}

else if(state.view==='participants'){
  const e=state.events.find(x=>x.id===state.selected);
  const arr=state.participants.filter(p=>
    state.filter==='all'||p.language===state.filter
  );

  html+=`
    <button class="back" data-action="detail">‹ Назад</button>
    <section class="hero">
      <div class="hero-emoji">👥</div>
      <h1>Участники встречи</h1>
      <p class="muted">${e?.approved_count||0} из ${e?.capacity||0}</p>
    </section>
    <div class="filter">
      <button data-action="filter" data-filter="all">Все</button>
      <button data-action="filter" data-filter="ru">🇷🇺 Русский</button>
      <button data-action="filter" data-filter="en">🇬🇧 Английский</button>
    </div>
    <div class="tables-grid">
      ${state.tables.map(t=>`
        <div class="table-tile">
          <b>Стол №${t.number}</b>
          <span>${t.language?langLabel(t.language):'⚪ Свободный'}</span>
          <small>${t.count}/${t.capacity} мест</small>
        </div>
      `).join('')}
    </div>
    <div class="panel">
      ${arr.length?arr.map(p=>`
        <div class="person">
          ${safeUser(p)}
          <div class="person-info">
            <div class="person-name">
              ${esc([p.first_name,p.last_name].filter(Boolean).join(' ')||'Участник')}
            </div>
            ${state.me?.is_admin && p.username ? `<div class="person-sub">@${esc(p.username)}</div>` : ''}
            <button type="button" class="person-sub club-coins club-coins-link" data-action="my-stats">
${Number(p.club_coins??0)}
<span class="club-coin-icon" aria-label="Club coin">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"
      fill="#FFF1B3"
      stroke="#955B0A"
      stroke-width="1.6"
      stroke-linejoin="round"
    />
  </svg>
</span>
</button>
          </div>
          <span class="language">
            ${langLabel(p.language)}<br>Стол №${p.table_number??'—'}
          </span>
        </div>
      `).join(''):'<div class="empty">Пока нет подтверждённых участников</div>'}
    </div>
  `;
}
else if(state.view==='admin'){html+=`<section class="hero"><div class="hero-emoji">⚙️</div><h1>Панель организатора</h1><p class="muted">Создание встреч и список записавшихся</p></section><button class="primary" data-action="create">+ Создать встречу</button><button class="secondary" data-action="admin-stats">🏆 Статистика участников</button>${state.me?.is_owner?'<button class="secondary" data-action="organizers">👥 Управление организаторами</button>':''}${
state.events.filter(e =>
  visibleCompletedEvent(e) &&
  (e.status !== 'cancelled' ||
   (e.cancelled_at && Date.now() < Date.parse(e.cancelled_at) + 120000))
).map(e=>
`<div class="admin-card"><h3>${esc(e.title)}</h3><div class="smallnote">${fmtDate(e.starts_at)} · ${esc(e.room)}</div><div class="status">Записано: ${e.approved_count}/${e.capacity} · ${e.status==='cancelled'?'Отменено':e.status==='completed'?'Завершено':'Опубликовано'}</div><div class="admin-actions"><button class="secondary small" data-action="requests" data-id="${e.id}">Участники (${e.approved_count})</button>${e.status==='published'?`<button class="secondary small" data-action="edit" data-id="${e.id}">Изменить</button><button class="primary small" data-action="complete" data-id="${e.id}">✅ Завершить встречу</button>`:''}${e.status!=='completed'?`<button class="danger small" data-action="toggle-status" data-id="${e.id}">${e.status==='cancelled'?'Восстановить':'Отменить встречу'}</button>`:''}</div></div>`).join('')}${nav()}`;}
else if(state.view==='editor'){const e=state.events.find(x=>x.id===state.editId);html+=`<button class="back" data-action="admin">‹ Назад</button><h1>${e?'Редактировать встречу':'Новая встреча'}</h1><form id="event-form"><label class="field">Название</label><input class="control" name="title" maxlength="120" required value="${esc(e?.title||'Разговорный клуб')}"><label class="field">Описание</label><textarea class="control" name="description" maxlength="3000">${esc(e?.description||'')}</textarea><label class="field">Дата и время (Москва)</label><input class="control" name="starts_at" type="datetime-local" required value="${e?esc(new Date(new Date(e.starts_at).getTime()+3*3600000).toISOString().slice(0,16)):''}"><label class="field">Корпус / адрес</label><input class="control" name="building" maxlength="180" required placeholder="Москва, ул. Большая Семёновская, д. 38" value="${esc(e?.building||'')}"><label class="field">Аудитория</label><input class="control" name="room" maxlength="60" required placeholder="А-305" value="${esc(e?.room||'')}"><label class="field">Количество мест</label><input class="control" name="capacity" type="number" min="1" max="10000" required value="${e?.capacity||48}"><label class="field">Количество столов</label><input class="control" name="table_count" type="number" min="1" max="50" required value="${e?.table_count||8}"><label class="field">Мест за столом</label><input class="control" name="table_capacity" type="number" min="1" max="30" required value="${e?.table_capacity||6}"><label class="field">Длительность встречи (минут)</label><input class="control" name="duration_minutes" type="number" min="15" max="480" required value="${e?.duration_minutes||90}"><label class="field">Ссылка на изображение (необязательно, HTTPS)</label><input class="control" name="image_url" type="url" placeholder="https://..." value="${esc(e?.image_url||'')}"><div class="notice">Время вводится по Москве (UTC+3). Для записи доступны только будущие встречи.</div><button class="primary" type="submit">Сохранить встречу</button></form>`;}
else if(state.view==='requests'){const e=state.events.find(x=>x.id===state.selected);html+=`<button class="back" data-action="admin">‹ Назад</button><h1>Записи на встречу</h1><p class="muted">${esc(e?.title||'')}</p><div class="filter">${['pending','approved','rejected','cancelled'].map(s=>`<span class="pill ${s==='approved'?'green':s==='pending'?'orange':'gray'}">${({pending:'Ожидают',approved:'Одобрены',rejected:'Отклонены',cancelled:'Отменили'})[s]}: ${state.adminRegs.filter(r=>r.status===s).length}</span>`).join('')}</div>${state.adminRegs.length?state.adminRegs.map(r=>`<div class="admin-reg"><div class="person">${safeUser(r)}<div class="person-info"><div class="person-name">${esc([r.first_name,r.last_name].filter(Boolean).join(' '))}</div><div class="person-sub">${r.username?'@'+esc(r.username):'Telegram ID: '+r.user_id} · ${langLabel(r.language)}</div><div class="status">${statusLabel(r.status)}${r.table_number?' · Стол №'+r.table_number:''}</div></div></div></div>`).join(''):'<div class="empty">Заявок пока нет</div>'}`;}

else if(state.view==='shop'){
  html+=`
    <button class="back" data-action="my-stats">‹ Назад</button>
    <section class="hero">
      <div class="hero-emoji">🪙</div>
      <h1>Магазин Club coin</h1>
      <p class="muted">Скоро здесь появятся награды!</p>
    </section>
  `;
}
else if(state.view==='my-stats'){
  const s=state.stats||{count:0,history:[]};
  const top=state.leaderboard.slice(0,5);
  const medal=n=>n===1?'🥇':n===2?'🥈':n===3?'🥉':`№${n}`;
  const playerRow=p=>`<div class="person"><span style="min-width:38px;font-weight:700">${medal(p.place)}</span><div class="person-info"><div class="person-name">${esc([p.first_name,p.last_name].filter(Boolean).join(' ')||'Участник')}</div></div><b>${toClubCoin(p.visits)} 🪙 🏅</b></div>`;
  html+=`<button class="back" data-action="all">‹ Назад</button><section class="hero stats-hero"><div class="hero-emoji">🏅</div><h1>Мои посещения><p class="muted">Засчитываются после завершения встречи организатором</p><h2>${s.count} ${s.count===1?'посещение':'посещений'}</h2></section><h2>🏆 Топ-5 участников</h2><p class="muted">По количеству Club coin</p><div class="panel">${top.length?top.map(playerRow).join(''):'<div class="empty">Пока никто не набрал посещений</div>'}</div>${state.leaderboardOpen?`<h3>Полный рейтинг</h3><div class="panel">${state.leaderboard.slice(5).length?state.leaderboard.slice(5).map(playerRow).join(''):'<div class="empty">Других участников пока нет</div>'}</div>${state.leaderboardHasMore?'<button class="secondary" data-action="leaderboard-more">Показать ещё</button>':'<button class="secondary" data-action="leaderboard-hide">Свернуть рейтинг</button>'}`:state.leaderboardHasMore?'<button class="secondary" data-action="leaderboard-more">Посмотреть остальных участников</button>':''}<h2>История посещений</h2><div class="panel">${s.history.length?s.history.map(h=>`<div class="person"><div class="person-info"><b>${esc(h.event?.title||'Встреча')}</b><div class="person-sub">${h.event?.starts_at?fmtDate(h.event.starts_at):''}</div></div><span class="pill green">+1</span></div>`).join(''):'<div class="empty">Пока нет засчитанных посещений</div>'}</div>${nav()}`;


html += `
  <div class="clubcoin-hints">
    <div class="clubcoin-info">
      🪙 1 посещение ≈ 33 Club coin
    </div>
    <button class="clubcoin-shop-btn" data-action="shop">
      На что можно потратить Club coin? ›
    </button>
  </div>
`;

}
else if(state.view==='organizers'){
  const rows=state.organizers.map(o=>`<div class="person"><div class="person-info"><div class="person-name">${esc([o.first_name,o.last_name].filter(Boolean).join(' ')||'Telegram ID '+o.telegram_id)}</div><div class="person-sub">${o.username?'@'+esc(o.username)+' · ':''}ID: ${o.telegram_id}${o.is_owner?' · Главный организатор':''}</div></div>${o.is_owner?'':`<button class="danger small" data-action="remove-organizer" data-id="${o.telegram_id}">Удалить</button>`}</div>`).join('');
  html+=`<button class="back" data-action="admin">‹ Назад</button><h1>Организаторы</h1><p class="muted">Назначать и удалять организаторов может только главный организатор.</p><form id="organizer-form"><label class="field">Telegram ID нового организатора</label><input class="control" type="text" name="telegram_id" inputmode="numeric" pattern="[0-9]+" placeholder="Например, 123456789" required><button class="primary" type="submit">Добавить организатора</button></form><div class="panel">${rows||'<div class="empty">Организаторов пока нет</div>'}</div>${nav()}`;
}
else if(state.view==='admin-stats'){
  html+=`<button class="back" data-action="admin">‹ Назад</button>
    <section class="hero"><div class="hero-emoji">🏆</div><h1>Статистика посещений</h1>
    <p class="muted">1 посещение = 33 Club coin · Баллы видны всем организаторам</p></section>
    <div class="panel">${state.adminStats.length?state.adminStats.map(u=>`
      <div class="person" style="align-items:flex-start">
        ${safeUser(u)}
        <div class="person-info">
          <div class="person-name">${esc([u.first_name,u.last_name].filter(Boolean).join(' ')||'Участник')}</div>
          <div class="person-sub">${u.username?'@'+esc(u.username):'Telegram ID: '+esc(u.id)}</div>
          <div class="person-sub">${Number(u.visits??0)} 🏅 · ${toClubCoin(Number(u.visits??0))} 🪙</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
            <button type="button" class="secondary small" data-action="visit-history" data-id="${esc(u.id)}">История изменений</button>
            ${state.me?.is_owner?`<button type="button" class="secondary small" data-action="visit-edit" data-id="${esc(u.id)}">Изменить количество</button>`:''}
          </div>
        </div>
      </div>`).join(''):'<div class="empty">Участников пока нет</div>'}</div>${nav()}`;
}
else if(state.view==='visit-manage'){
  const u=state.adminStats.find(x=>String(x.id)===String(state.visitUser));
  const name=esc([u?.first_name,u?.last_name].filter(Boolean).join(' ')||'Участник');
  const history=Array.isArray(state.visitHistory)?state.visitHistory:[];
  html+=`<button class="back" data-action="admin-stats">‹ К статистике</button>
    <section class="hero"><div class="hero-emoji">🪙</div><h1>${name}</h1>
      <p class="muted">${Number(state.visitCount)} посещений · ${toClubCoin(Number(state.visitCount))} Club coin</p>
    </section>
    ${state.me?.is_owner?`<form id="visit-count-form" class="panel">
      <h3>Изменить количество</h3>
      <p class="muted">Посещения и баллы связаны: 1 посещение = 33 🪙. Записи о конкретных встречах останутся без изменений.</p>
      <label class="field" for="visit-count-input">Количество посещений</label>
      <input class="control" id="visit-count-input" type="number" min="0" max="1000000" step="1" name="visits" required value="${Number(state.visitCount)}">
      <button class="primary" type="submit">Сохранить количество</button>
    </form>`:''}
    <h2>История изменения баллов</h2>
    <div class="panel">${history.length?history.map(h=>`
      <div class="person"><div class="person-info">
        <div class="person-name">${Number(h.old_visits??0)} → ${Number(h.new_visits??0)} посещений</div>
        <div class="person-sub">${toClubCoin(Number(h.old_visits??0))} → ${toClubCoin(Number(h.new_visits??0))} 🪙</div>
        <div class="person-sub">${h.created_at?fmtDate(h.created_at):''} · ${esc(h.changed_by_name||'Главный организатор')}</div>
      </div></div>`).join(''):'<div class="empty">Ручных изменений пока нет</div>'}</div>
    ${nav()}`;
}

root.innerHTML = html;

if (state.view === 'my-stats') {
  const hints = root.querySelector('.clubcoin-hints');
  const menu = root.querySelector('.menu');

  if (hints && menu) {
    menu.before(hints);
  }
}

if (state.view === 'requests') {
  const cards = root.querySelectorAll('.admin-reg');

  cards.forEach((card, i) => {
    const participant = state.adminRegs[i];
    if (!participant) return;

    if (!['approved', 'pending'].includes(participant.status)) {
      return;
    }

    const event = state.events.find(
      e => e.id === state.selected
    );

    if (event?.status !== 'published') return;

    const button = document.createElement('button');
    button.className = 'danger small';
    button.dataset.action = 'admin-cancel';
    button.dataset.id = String(participant.user_id);
    button.textContent = 'Отменить запись';

    card.appendChild(button);
  });
}
}

/* Поиск участников и поиск по общему рейтингу */

let ratingSearchCache = null;

function searchName(person, term) {
  const name = [person.first_name, person.last_name]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е');

  return name.includes(
    term.trim().toLocaleLowerCase('ru').replace(/ё/g, 'е')
  );
}

async function loadRatingForSearch() {
  if (ratingSearchCache) return ratingSearchCache;

  ratingSearchCache = (async () => {
    const players = [];

    for (let offset = 0; offset < 10000; offset += 50) {
      const data = await api(
        `/api/leaderboard?offset=${offset}&limit=50`
      );

      players.push(...(data.players || []));

      if (!data.has_more) break;
    }

    return players;
  })();

  try {
    return await ratingSearchCache;
  } catch (error) {
    ratingSearchCache = null;
    throw error;
  }
}

function setupParticipantSearch() {
  if (state.view === 'admin-stats') {
    const panel = root.querySelector('.panel');
    if (!panel) return;

    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'control club-search';
    input.placeholder = '🔎 Поиск участника по имени';
    input.setAttribute('aria-label', 'Поиск участника');

    panel.before(input);

    const rows = [...panel.querySelectorAll('.person')];

    input.addEventListener('input', () => {
      const term = input.value;
      rows.forEach((row, index) => {
        row.hidden = !searchName(
          state.adminStats[index] || {},
          term
        );
      });
    });
  }

  if (state.view === 'my-stats') {
    const heading = [...root.querySelectorAll('h2')]
      .find(h => h.textContent.includes('Топ-5 участников'));

    if (!heading) return;

    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'control club-search';
    input.placeholder = '🔎 Найти участника в рейтинге';
    input.setAttribute('aria-label', 'Поиск в рейтинге');

    const results = document.createElement('div');
    results.className = 'panel club-search-results';
    results.hidden = true;

    heading.before(input);
    input.after(results);

    let version = 0;

    input.addEventListener('input', async () => {
      const term = input.value.trim();
      const currentVersion = ++version;

      if (!term) {
        results.hidden = true;
        results.innerHTML = '';
        return;
      }

      results.hidden = false;
      results.textContent = 'Ищем участника...';

      try {
        const players = await loadRatingForSearch();

        if (currentVersion !== version ||
            !root.contains(results)) return;

        const found = players.filter(
          p => searchName(p, term)
        );

        results.innerHTML = found.length
          ? found.map(p => `
              <div class="person">
                <div class="person-info">
                  <div class="person-name">
                    ${esc([
                      p.first_name,
                      p.last_name
                    ].filter(Boolean).join(' ') || 'Участник')}
                  </div>
                  <div class="person-sub">
                    Место №${Number(p.place)}
                  </div>
                </div>
                <b>${toClubCoin(Number(p.visits || 0))} 🪙</b>
              </div>
            `).join('')
          : '<div class="empty">Ничего не найдено</div>';

      } catch (error) {
        if (currentVersion === version &&
            root.contains(results)) {
          results.textContent =
            'Не удалось загрузить рейтинг: ' + error.message;
        }
      }
    });
  }
}

async function refresh(){const r=await api('/api/events');state.events=r.events;render()}
async function participants(){const data=await api(`/api/events/${state.selected}/participants`);state.participants=data.participants;state.tables=data.tables;state.filter='all';state.view='participants';render()}
async function requests(){state.adminRegs=(await api(`/api/admin/events/${state.selected}/registrations`)).registrations;state.view='requests';render()}
root.addEventListener('click',async ev=>{const b=ev.target.closest('[data-action]');if(!b)return;const action=b.dataset.action,id=Number(b.dataset.id);try{
 if(['all','mine','admin','detail'].includes(action)){state.view=action;render()}
 else if(action==='event'){state.selected=id;state.language='en';state.view='detail';render()}
 else if(action==='my-stats'){
   const [stats,ranking]=await Promise.all([api('/api/my/stats'),api('/api/leaderboard?offset=0&limit=5')]);
   state.stats=stats;state.leaderboard=ranking.players;state.leaderboardHasMore=ranking.has_more;state.leaderboardOpen=false;
   state.view='my-stats';render();
 }
 else if(action==='leaderboard-more'){
   const next=await api(`/api/leaderboard?offset=${state.leaderboard.length}&limit=50`);
   state.leaderboard.push(...next.players);state.leaderboardHasMore=next.has_more;state.leaderboardOpen=true;render();
 }
 else if(action==='leaderboard-hide'){state.leaderboardOpen=false;render()}
 else if(action==='organizers'){const r=await api('/api/admin/organizers');state.organizers=r.organizers;state.view='organizers';render()}
 else if(action==='remove-organizer'){if(confirm('Удалить этого организатора?')){await api(`/api/admin/organizers/${id}`,'DELETE');toast('Организатор удалён');const r=await api('/api/admin/organizers');state.organizers=r.organizers;render()}}
 else if(action==='admin-stats'){const r=await api('/api/admin/stats');state.adminStats=r.users;state.view='admin-stats';render()}
  else if(action==='visit-history'||action==='visit-edit'){
    if(!state.me?.is_admin)throw new Error('Доступно только организаторам');
    if(action==='visit-edit'&&!state.me?.is_owner)throw new Error('Изменять посещения может только главный организатор');
    const u=state.adminStats.find(x=>String(x.id)===String(b.dataset.id));
    if(!u)throw new Error('Участник не найден');
    const r=await api(`/api/admin/users/${encodeURIComponent(u.id)}/visit-adjustments`);
    state.visitUser=u.id;
    state.visitCount=Number(r.visits??u.visits??0);
    state.visitHistory=Array.isArray(r.history)?r.history:[];
    state.view='visit-manage';render();
  }
 else if(action==='complete'){if(confirm('Завершить встречу и засчитать посещение всем, кто остался записан? Это действие нельзя отменить.')){const r=await api(`/api/admin/events/${id}/complete`,'POST',{});toast(`Встреча завершена. Засчитано: ${r.counted}`);await refresh()}}
 else if(action==='participants')await participants();
 else if(action==='filter'){state.filter=b.dataset.filter;render()}
 else if(action==='select-lang'){state.language=b.dataset.lang;render()}
 else if(action==='register'){const result=await api(`/api/events/${state.selected}/register`,'POST',{language:state.language});toast(`Вы записаны! Стол №${result.table_number}`);await refresh()}
 else if(action==='change-lang'){await api(`/api/events/${state.selected}/language`,'PATCH',{language:b.dataset.lang});toast('Язык изменён');await refresh()}
 else if(action==='cancel'){if(confirm('Отменить свою запись?')){await api(`/api/events/${state.selected}/register`,'DELETE');toast('Запись отменена');await refresh()}}
 else if(action==='create'||action==='edit'){state.editId=action==='edit'?id:null;state.view='editor';render()}
 else if(action==='requests'){state.selected=id;await requests()}   

else if(action==='admin-cancel'){
  if(confirm('Отменить запись этого участника?')){
    await api(
      `/api/admin/events/${state.selected}/registrations/${id}`,
      'DELETE'
    );
    toast('Запись участника отменена');
    await refresh();
    await requests();
  }
}
else if(action==='shop'){
  state.view='shop';
  render();
}

 else if(action==='decide'){await api(`/api/admin/events/${state.selected}/registrations/${id}`,'PATCH',{status:b.dataset.status});toast(b.dataset.status==='approved'?'Участник одобрен':'Заявка отклонена');await refresh();await requests()}
 else if(action==='toggle-status'){const e=state.events.find(x=>x.id===id);const status=e.status==='cancelled'?'published':'cancelled';if(confirm(status==='cancelled'?'Отменить встречу для всех участников?':'Восстановить встречу?')){await api(`/api/admin/events/${id}/status`,'PATCH',{status});toast('Статус изменён');await refresh()}}
 }catch(e){toast(e.message)}});
root.addEventListener('submit',async ev=>{
 if(ev.target.id==='organizer-form'){
   ev.preventDefault();
   const id=String(new FormData(ev.target).get('telegram_id')||'').trim();
   if(!/^[0-9]+$/.test(id)){toast('Укажите числовой Telegram ID');return;}
   try{await api('/api/admin/organizers','POST',{telegram_id:id});toast('Организатор добавлен');const r=await api('/api/admin/organizers');state.organizers=r.organizers;render()}catch(e){toast(e.message)}
   return;
 }
  if(ev.target.id==='visit-count-form'){
    ev.preventDefault();
    if(!state.me?.is_owner){toast('Изменения доступны только главному организатору');return;}
    const raw=String(new FormData(ev.target).get('visits')??'').trim();
    const visits=Number(raw);
    if(!/^\d+$/.test(raw)||!Number.isSafeInteger(visits)||visits>1000000){toast('Введите целое число посещений от 0 до 1000000');return;}
    if(visits===state.visitCount){toast('Количество посещений не изменилось');return;}
    if(!confirm(`Установить ${visits} посещений (${toClubCoin(visits)} Club coin)?`))return;
    try{
      await api(`/api/admin/users/${encodeURIComponent(state.visitUser)}/visits`,'PUT',{visits});
      const [r,users]=await Promise.all([
        api(`/api/admin/users/${encodeURIComponent(state.visitUser)}/visit-adjustments`),
        api('/api/admin/stats')
      ]);
      state.visitCount=Number(r.visits??visits);
      state.visitHistory=Array.isArray(r.history)?r.history:[];
      state.adminStats=users.users;
      toast('Количество посещений изменено');render();
    }catch(e){toast(e.message)}
    return;
  }
 if(ev.target.id!=='event-form')return;ev.preventDefault();const f=new FormData(ev.target);const local=f.get('starts_at');const body={title:f.get('title'),description:f.get('description'),building:f.get('building'),room:f.get('room'),capacity:Number(f.get('capacity')),table_count:Number(f.get('table_count')),table_capacity:Number(f.get('table_capacity')),duration_minutes:Number(f.get('duration_minutes')),image_url:f.get('image_url'),starts_at:`${local}:00+03:00`};try{await api(state.editId?`/api/admin/events/${state.editId}`:'/api/admin/events',state.editId?'PUT':'POST',body);toast('Встреча сохранена');state.view='admin';await refresh()}catch(e){toast(e.message)}});
(async()=>{try{state.me=await api('/api/me');await refresh()}catch(e){root.innerHTML=`<div class="hero"><div class="hero-emoji">🔐</div><h1>Speaking Club</h1><p class="muted">${esc(e.message)}</p><div class="notice">Откройте приложение через кнопку меню вашего Telegram-бота. Для локального тестирования смотрите README.md.</div></div>`}})();

/* Скрываем отменённые встречи через 2 минуты, завершённые — через 30 минут.
   Данные о встречах и посещениях в Supabase НЕ удаляются. */
setInterval(() => {
  const now = Date.now();
  const expired = e =>
    (e.status === 'cancelled' && e.cancelled_at &&
      now >= Date.parse(e.cancelled_at) + 2 * 60 * 1000) ||
    (e.status === 'completed' && e.closed_at &&
      now >= Date.parse(e.closed_at) + 30 * 60 * 1000);

  if (!state.events.some(expired)) return;
  const current = state.events.find(e => e.id === state.selected);
  state.events = state.events.filter(e => !expired(e));

  // Если человек смотрит карточку уже скрытой встречи — вернём его в афишу.
  if (current && expired(current) && ['detail', 'participants', 'requests', 'editor'].includes(state.view)) {
    state.view = 'all';
  }
  if (['all', 'mine', 'admin', 'detail', 'participants', 'requests', 'editor'].includes(state.view)) render();
}, 5000);
