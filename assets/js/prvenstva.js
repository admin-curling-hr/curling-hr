const BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '' : '/curling-hr';




const DIS_ORDER = ['M', 'Ž', 'MC', 'MP'];
const KAT_ORDER = ['S', 'J', 'V'];
const DIS_LABELS = {'M':'Muškarci','Ž':'Žene','MC':'Mješoviti curling','MP':'Mješoviti parovi'};
const KAT_LABELS = {'S':'Seniori','J':'Juniori','V':'Veterani'};

// Tabovi za koje "Disciplina" filter NIJE primjenjiv (prikazuju sve discipline u stupcima)
const NO_DIS_TABS = new Set([]);

const TAB_IDS = ['poretci','klubovi','ekipe','igraci','klubovih2h','ekipeh2h','igracih2h','rekordi','statistika'];
const TAB_STATE = {};
TAB_IDS.forEach(t => { TAB_STATE[t] = { kat: 'sve', dis: 'sve', seasonMode: 'sve', seasonFrom: null, seasonTo: null }; });

let DATA = { matches: [], tournaments: [], clubs: {} };
let WC_DATA = { entries: [], natLabels: {} };
let MIN_SEASON = null, MAX_SEASON = null;

fetch(BASE + '/assets/json/reprezentacija-data.json?v=' + Date.now(), { cache: 'no-store' })
  .then(r => r.json())
  .then(data => {
    WC_DATA = data;
    initReprezentacijaFilters();
    renderReprezentacija();
  })
  .catch(() => {
    const el = document.getElementById('repContent');
    if(el) el.innerHTML = '<div class="empty-state">Greška pri učitavanju wc-data.json (nastupi reprezentacije).</div>';
  });

fetch(BASE + '/assets/json/prvenstva-data.json?v=' + Date.now(), { cache: 'no-store' })
  .then(r => r.json())
  .then(data => {
    DATA = data;
    const seasons = data.tournaments.map(t => t.season);
    MIN_SEASON = Math.min(...seasons);
    MAX_SEASON = Math.max(...seasons);
    TAB_IDS.forEach(t => { TAB_STATE[t].seasonFrom = MIN_SEASON; TAB_STATE[t].seasonTo = MAX_SEASON; });

    // --- Statistika ---
    initUniversalFilters();
    updateFilterVisibility();
    syncFilterBarToState();
    renderActiveTab();

    // --- Prvenstva ---
    initFilters();
    render();

    // --- Postignuća (zasebna stranica, bez filtera) ---
    renderPostignuca();

    // --- URL rutiranje (npr. #statistika/igraci) ---
    applyHashRoute();
    if(!location.hash){
      history.replaceState(null, '', '#prvenstva');
    }
  })
  .catch(err => {
    console.error('PHC fetch/init error:', err, err && err.stack);
    document.querySelectorAll('.panel > div').forEach(p => {
      p.innerHTML = '<div class="empty-state">Greška: ' + (err && err.message || err) + '</div>';
    });
    const prvenstvaContent = document.getElementById('content');
    if(prvenstvaContent){
      prvenstvaContent.innerHTML = '<div class="empty-state">Greška: ' + (err && err.message || err) + '</div>';
    }
  });

function seasonLabel(season){ return typeof season === 'string' && season.includes('-') ? season : `${season-1}-${season}`; }
function escapeHtml(s){
  if(s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Dodaje sinkronizirani scrollbar IZNAD širokih tablica (isti mehanizam kao
// donji, prirodni scrollbar) — korisno kad je tablica preduga da bi se vidio
// donji scrollbar bez skrolanja cijele stranice.
function addTopScrollbar(containerEl, scrollWrapEl){
  const inner = scrollWrapEl.firstElementChild;
  if(!inner) return;
  const top = document.createElement('div');
  top.className = 'top-scrollbar';
  const spacer = document.createElement('div');
  spacer.className = 'top-scrollbar-spacer';
  spacer.style.width = inner.scrollWidth + 'px';
  top.appendChild(spacer);
  containerEl.insertBefore(top, scrollWrapEl);

  // Ako scrollWrapEl ima i okomiti scrollbar (npr. visoke tablice poput "Igrači" gdje se
  // pojavljuje i vertikalni scroll), taj scrollbar oduzima nekoliko piksela od njegove stvarne
  // vidljive širine (clientWidth < offsetWidth). Gornja traka (top) nema okomiti scrollbar pa
  // bez ovoga ima veću vidljivu širinu, a time i manji maksimalni scrollLeft — povlačenjem do
  // kraja ne bi se otkrio baš zadnji djelić zadnjeg stupca. Eksplicitno joj zato izjednačimo
  // vidljivu širinu sa stvarnom (usklađenom) širinom donjeg wrap-a.
  const vScrollbarWidth = scrollWrapEl.offsetWidth - scrollWrapEl.clientWidth;
  if(vScrollbarWidth > 0){
    top.style.width = scrollWrapEl.clientWidth + 'px';
  }

  let syncing = false;
  top.addEventListener('scroll', () => {
    if(syncing) return;
    syncing = true;
    scrollWrapEl.scrollLeft = top.scrollLeft;
    syncing = false;
  });
  scrollWrapEl.addEventListener('scroll', () => {
    if(syncing) return;
    syncing = true;
    top.scrollLeft = scrollWrapEl.scrollLeft;
    syncing = false;
  });
}

// ---------- tabs ----------
function switchToTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab));
  updateFilterVisibility();
  syncFilterBarToState();
  renderActiveTab();
}
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchToTab(btn.dataset.tab);
    updateHash();
  });
});

function activeTab(){ return document.querySelector('.tab-btn.active').dataset.tab; }
function currentState(){ return TAB_STATE[activeTab()]; }

function updateFilterVisibility(){
  const tab = activeTab();
  const disGroup = document.getElementById('globalDisGroup');
  if(disGroup) {
    disGroup.classList.toggle('is-inactive', NO_DIS_TABS.has(tab));
    disGroup.querySelectorAll('button').forEach(b => b.disabled = NO_DIS_TABS.has(tab));
  }
  const statFilterBar = document.querySelector('#phc-page-statistika .filter-bar');
  if(statFilterBar) statFilterBar.style.display = '';
}

// Odražava spremljeno stanje AKTIVNOG taba na kontrolama filtera (bez okidanja re-rendera)
function syncFilterBarToState(){
  const st = currentState();
  const _katSve = document.getElementById('katSveBtn'); if(_katSve) _katSve.classList.toggle('active', st.kat === 'sve');
  document.querySelectorAll('#globalKatRow .radio-btn').forEach(b => b.classList.toggle('active', b.dataset.kat === st.kat));
  const _disSve = document.getElementById('disSveBtn'); if(_disSve) _disSve.classList.toggle('active', st.dis === 'sve');
  document.querySelectorAll('#globalDisRow .radio-btn').forEach(b => b.classList.toggle('active', b.dataset.dis === st.dis));
  const _seaSve = document.getElementById('seasonSveBtn'); if(_seaSve) _seaSve.classList.toggle('active', st.seasonMode === 'sve');
  const _gsf = document.getElementById('globalSeasonFrom'); if(_gsf) _gsf.value = st.seasonMode === 'sve' ? MIN_SEASON : (st.seasonFrom ?? MIN_SEASON);
  const _gst = document.getElementById('globalSeasonTo'); if(_gst) _gst.value = st.seasonMode === 'sve' ? MAX_SEASON : (st.seasonTo ?? MAX_SEASON);
  const _sc = document.querySelector('.season-controls'); if(_sc) _sc.classList.toggle('season-is-range', st.seasonMode === 'range');
}

function renderActiveTab(){
  const tab = activeTab();
  if(tab === 'poretci') renderPoretci();
  else if(tab === 'statistika') renderStatistika();
  else if(tab === 'rekordi') renderRekordi();
  else if(tab === 'klubovi') renderKlubovi();
  else if(tab === 'ekipe') renderEkipe();
  else if(tab === 'igraci') renderIgraci();
  else if(tab === 'klubovih2h') renderKluboviH2h();
  else if(tab === 'ekipeh2h') renderEkipeH2h();
  else if(tab === 'igracih2h') renderIgraciH2h();
}

// ---------- univerzalni filteri (izgled dijeljen, stanje po tabu) ----------
function availableKats(){
  return [...new Set(DATA.tournaments.map(t => t.kat))].sort((a,b) => KAT_ORDER.indexOf(a) - KAT_ORDER.indexOf(b));
}

function initUniversalFilters(){
  // Kategorija
  const kats = availableKats();
  const katRow = document.getElementById('globalKatRow');
  const katSveBtn = document.getElementById('katSveBtn');
  katRow.innerHTML = kats.map(k => `<button class="radio-btn" data-kat="${k}"><span class="lbl-full">${KAT_LABELS[k]||k}</span><span class="lbl-short">${k}</span></button>`).join('');
  katSveBtn.addEventListener('click', () => {
    katRow.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
    katSveBtn.classList.add('active');
    currentState().kat = 'sve';
    renderActiveTab();
  });
  katRow.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      katRow.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      katSveBtn.classList.remove('active');
      btn.classList.add('active');
      currentState().kat = btn.dataset.kat;
      renderActiveTab();
    });
  });

  // Disciplina
  const disRow = document.getElementById('globalDisRow');
  const disSveBtn = document.getElementById('disSveBtn');
  disRow.innerHTML = DIS_ORDER.map(d => `<button class="radio-btn" data-dis="${d}"><span class="lbl-full">${DIS_LABELS[d]}</span><span class="lbl-short">${d}</span></button>`).join('');
  disSveBtn.addEventListener('click', () => {
    if(disSveBtn.disabled) return;
    disRow.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
    disSveBtn.classList.add('active');
    currentState().dis = 'sve';
    renderActiveTab();
  });
  disRow.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if(btn.disabled) return;
      disRow.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      disSveBtn.classList.remove('active');
      btn.classList.add('active');
      currentState().dis = btn.dataset.dis;
      renderActiveTab();
    });
  });

  // Sezona
  const seasons = [...new Set(DATA.tournaments.map(t => t.season))].sort((a,b) => a-b);
  const fromSel = document.getElementById('globalSeasonFrom');
  const toSel = document.getElementById('globalSeasonTo');
  const optsDesc = [...seasons].sort((a,b) => b-a).map(s => `<option value="${s}">${seasonLabel(s)}</option>`).join('');
  fromSel.innerHTML = optsDesc;
  toSel.innerHTML = optsDesc;
  fromSel.value = seasons[0];
  toSel.value = seasons[seasons.length - 1];

  const sveBtn = document.getElementById('seasonSveBtn');
  sveBtn.addEventListener('click', () => {
    const st = currentState();
    st.seasonMode = 'sve';
    st.seasonFrom = MIN_SEASON;
    st.seasonTo = MAX_SEASON;
    fromSel.value = MIN_SEASON;
    toSel.value = MAX_SEASON;
    sveBtn.classList.add('active');
    document.querySelector('.season-controls').classList.remove('season-is-range');
    renderActiveTab();
  });
  function onRangeChange(){
    const st = currentState();
    st.seasonMode = 'range';
    let from = Number(fromSel.value), to = Number(toSel.value);
    if(from > to){ to = from; toSel.value = to; }
    st.seasonFrom = from;
    st.seasonTo = to;
    sveBtn.classList.remove('active');
    document.querySelector('.season-controls').classList.add('season-is-range');
    renderActiveTab();
  }
  fromSel.addEventListener('change', onRangeChange);
  toSel.addEventListener('change', onRangeChange);
}

function getSeasonRange(){
  const st = currentState();
  if(st.seasonMode === 'sve') return [MIN_SEASON, MAX_SEASON];
  return [st.seasonFrom, st.seasonTo];
}

// Logotipi klubova (logo-data.js, CLUB_LOGOS) — ključ je naziv KLUBA, ne ekipe (više ekipa
// može pripadati istom klubu kroz sezone). Ako klub nema logo (ili tim/klub nije prepoznat),
// vraća se null i logo se jednostavno ne prikazuje - bez greške.
function clubLogoDataUri(team, dis){
  if(!team || !dis || typeof CLUB_LOGOS === 'undefined') return null;
  const disCandidates = dis === 'sve' ? DIS_ORDER : [dis];
  for(const d of disCandidates){
    const clubMap = (DATA.clubs && DATA.clubs[d]) || {};
    const club = clubMap[team] || team;
    if(CLUB_LOGOS[club]) return CLUB_LOGOS[club];
  }
  return null;
}

function clubLogoImgHtml(team, dis, cls){
  const uri = clubLogoDataUri(team, dis);
  if(!uri) return '';
  return `<img class="club-logo${cls ? ' ' + cls : ''}" src="${uri}" alt="" loading="lazy">`;
}

// Veća verzija (CLUB_LOGOS_LG, logo-data.js) — koristi se u zaglavljima modala (sastav ekipe,
// postignuća kluba/ekipe) gdje je logo istaknutiji. Ista logika pronalaska kluba kao gore.
function clubLogoLgDataUri(team, dis){
  if(!team || !dis || typeof CLUB_LOGOS_LG === 'undefined') return null;
  const disCandidates = dis === 'sve' ? DIS_ORDER : [dis];
  for(const d of disCandidates){
    const clubMap = (DATA.clubs && DATA.clubs[d]) || {};
    const club = clubMap[team] || team;
    if(CLUB_LOGOS_LG[club]) return CLUB_LOGOS_LG[club];
  }
  return null;
}

// Mjesto i e-adresa kluba - iz DATA.clubMeta (phc-data.json, izvučeno iz DBEkipe u Excelu).
// 'name' može biti naziv ekipe (npr. "Vis 2"), pa se prvo razriješi pravi klub - ista logika
// kao za dohvat loga. Ako klub nema tih podataka, jednostavno se ne prikazuje ništa.
function clubMetaHtml(name, dis){
  if(!DATA.clubMeta) return '';
  const disCandidates = dis === 'sve' ? DIS_ORDER : [dis];
  let club = null;
  for(const d of disCandidates){
    const clubMap = (DATA.clubs && DATA.clubs[d]) || {};
    if(clubMap[name]){ club = clubMap[name]; break; }
  }
  if(!club) club = name;
  const meta = DATA.clubMeta[club];
  if(!meta) return '';
  let html = '<div class="entity-meta">';
  if(meta.mjesto) html += `<div>📍 ${escapeHtml(meta.mjesto)}</div>`;
  if(meta.email) html += `<div>📨 <a href="mailto:${escapeHtml(meta.email)}">${escapeHtml(meta.email)}</a></div>`;
  html += '</div>';
  return html;
}

// Zaglavlje modala s velikim logom lijevo. 'sideContent' ide desno od loga (uz naslov, uska
// kolona), 'belowContent' ide ISPOD cijelog retka logo+naslov, preko pune širine (bez uvlake).
// Ako klub/ekipa nema logo, naslov i sideContent jednostavno stoje bez loga, bez praznog prostora.
function entityHeaderHtml(name, dis, sideContent, belowContent){
  const uri = clubLogoLgDataUri(name, dis);
  const rightCol = `<div><h2 class="entity-title">${escapeHtml(name)}</h2>${sideContent || ''}</div>`;
  const top = uri
    ? `<div class="roster-header"><img class="club-logo-lg" src="${uri}" alt="">${rightCol}</div>`
    : `<h2 class="entity-title">${escapeHtml(name)}</h2>${sideContent || ''}`;
  return `${top}${belowContent || ''}`;
}



function renderDisGridHtml(season, katForBlock, disList, gridStyle, MEDALS){
  let html = `<div class="dis-grid"${gridStyle}>`;
  disList.forEach(d => {
    const tourn = DATA.tournaments.find(t => t.season === season && t.dis === d && t.kat === katForBlock);
    if(!tourn){
      html += `<div class="dis-col dis-col-empty"></div>`;
      return;
    }
    html += `<div class="dis-col"><h3>${DIS_LABELS[d]} (${tourn.p}.)</h3>`;
    if(tourn.standings.length){
      html += '<ol class="standing-list">' + tourn.standings.map(s => {
        const medal = MEDALS[s.place] || '';
        return `<li class="clickable-row" data-roster-team="${escapeHtml(s.team)}" data-roster-season="${season}" data-roster-dis="${d}" data-roster-kat="${katForBlock}"><span class="rank-num">${s.place}</span>${clubLogoImgHtml(s.team, d)}<span class="team-name">${escapeHtml(s.team)}</span><span class="medal-slot">${medal}</span></li>`;
      }).join('') + '</ol>';
    } else {
      html += '<div class="empty-mini">—</div>';
    }
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

function renderPoretci(){
  const kat = currentState().kat;
  const dis = currentState().dis;
  const disList = dis === 'sve' ? DIS_ORDER : [dis];
  const [from, to] = getSeasonRange();
  const seasons = [...new Set(DATA.tournaments.filter(t => (kat==='sve'||t.kat===kat) && disList.includes(t.dis) && t.season >= from && t.season <= to).map(t => t.season))].sort((a,b) => b-a);
  const content = document.getElementById('poretciContent');

  if(seasons.length === 0){
    content.innerHTML = '<div class="empty-state">Nema podataka za odabranu kategoriju/disciplinu.</div>';
    return;
  }

  const MEDALS = {1:'🥇', 2:'🥈', 3:'🥉'};
  const gridStyle = disList.length === 1 ? ' style="grid-template-columns:minmax(0,420px);"' : '';

  let html = '';
  seasons.forEach(season => {
    html += `<div class="season-block"><div class="season-title">Sezona ${seasonLabel(season)}</div>`;

    // koje kategorije uopće postoje ove sezone (u bilo kojoj od odabranih disciplina)?
    const katsThisSeason = kat === 'sve'
      ? KAT_ORDER.filter(k => DATA.tournaments.some(t => t.season === season && t.kat === k && disList.includes(t.dis)))
      : [kat];

    if(katsThisSeason.length > 1){
      katsThisSeason.forEach(k => {
        html += `<h4 class="kat-section-h">${KAT_LABELS[k] || k}</h4>`;
        html += renderDisGridHtml(season, k, disList, gridStyle, MEDALS);
      });
    } else {
      html += renderDisGridHtml(season, katsThisSeason[0], disList, gridStyle, MEDALS);
    }

    html += `</div>`;
  });
  content.innerHTML = html;

  content.querySelectorAll('[data-roster-team]').forEach(el => {
    el.addEventListener('click', () => {
      const s = Number(el.dataset.rosterSeason);
      const d = el.dataset.rosterDis;
      const k = el.dataset.rosterKat;
      const t = DATA.tournaments.find(x => x.season === s && x.dis === d && x.kat === k);
      if(t) openTeamRosterModal(el.dataset.rosterTeam, t, s, d, k);
    });
  });
}

function renderStatistika(){
  const kat = currentState().kat;
  const dis = currentState().dis;
  const disList = dis === 'sve' ? DIS_ORDER : [dis];
  const [from, to] = getSeasonRange();
  const content = document.getElementById('statContent');

  if(from > to){
    content.innerHTML = '<div class="empty-state">"Od sezone" mora biti prije ili jednako "Do sezone".</div>';
    return;
  }

  const perDis = {};
  disList.forEach(d => {
    const tourns = DATA.tournaments.filter(t => (kat==='sve'||t.kat===kat) && t.dis === d && t.season >= from && t.season <= to);
    // "Utakmica" broji SVE prijavljene utakmice (uklj. npr. diskvalifikacije) —
    // dok se endovi/poeni računaju samo iz stvarno odigranih (imaju podatke o endovima).
    const allMatches = DATA.matches.filter(m => (kat==='sve'||m.kat===kat) && m.dis === d && m.season >= from && m.season <= to);
    const playedMatches = allMatches.filter(m => m.played);
    let endsCount = 0, pointsTotal = 0;
    const hist = new Array(9).fill(0);
    playedMatches.forEach(m => {
      (m.ends || []).forEach(e => {
        endsCount++;
        const val = Math.abs(e);
        pointsTotal += val;
        hist[Math.min(val, 8)]++;
      });
    });
    perDis[d] = { prvenstava: tourns.length, utakmica: allMatches.length, endova: endsCount, poena: pointsTotal, hist };
  });

  const total = { prvenstava: 0, utakmica: 0, endova: 0, poena: 0, hist: new Array(9).fill(0) };
  disList.forEach(d => {
    total.prvenstava += perDis[d].prvenstava;
    total.utakmica += perDis[d].utakmica;
    total.endova += perDis[d].endova;
    total.poena += perDis[d].poena;
    for(let i=0;i<=8;i++) total.hist[i] += perDis[d].hist[i];
  });

  function ratio(a, b){
    return b > 0 ? (a / b).toFixed(1).replace('.', ',') : '–';
  }

  const showTotal = disList.length > 1;
  const cols = showTotal ? [...disList, '__total__'] : disList;
  const colVal = (d, val) => d === '__total__' ? total[val] : perDis[d][val];
  const colHist = (d, i) => d === '__total__' ? total.hist[i] : perDis[d].hist[i];

  function row(label, getter, opts){
    opts = opts || {};
    const cells = cols.map(d => {
      const cls = d === '__total__' ? ' class="total-col"' : '';
      return `<td${cls}>${getter(d)}</td>`;
    }).join('');
    return `<tr class="${opts.sub ? 'sub-row' : 'main-row'}"><td>${label}</td>${cells}</tr>`;
  }

  let html = `<table class="stats-table"><colgroup><col class="label-col">${cols.map(()=>'<col class="data-col">').join('')}</colgroup>`;
  html += `<thead><tr><th></th>${disList.map(d => `<th><span class="lbl-full">${DIS_LABELS[d]}</span><span class="lbl-short">${d}</span></th>`).join('')}${showTotal ? '<th class="total-col">Ukupno</th>' : ''}</tr></thead><tbody>`;

  html += row('Prvenstava', d => colVal(d,'prvenstava'));

  html += row('Utakmica', d => colVal(d,'utakmica'));
  html += row('Po prvenstvu', d => ratio(colVal(d,'utakmica'), colVal(d,'prvenstava')), {sub:true});

  html += row('Endova', d => colVal(d,'endova'));
  html += row('Po utakmici', d => ratio(colVal(d,'endova'), colVal(d,'utakmica')), {sub:true});

  html += row('Kamenova', d => colVal(d,'poena'));
  html += row('Po utakmici', d => ratio(colVal(d,'poena'), colVal(d,'utakmica')), {sub:true});
  html += row('Po endu', d => ratio(colVal(d,'poena'), colVal(d,'endova')), {sub:true});

  html += row('Poena', d => '');
  for(let i = 0; i <= 8; i++){
    const label = `${i}`;
    html += row(label, d => { const v = colHist(d, i); return v === 0 ? '-' : v; }, {sub:true});
  }

  html += `</tbody></table>`;
  content.innerHTML = html;
}

function countSteals(m){
  if(m.pk == null || !m.ends || !m.ends.length) return 0;
  let hammerTeam = m.pk;
  let steals = 0;
  m.ends.forEach(e => {
    if(e > 0){
      if(hammerTeam === 2) steals++;
      hammerTeam = 2;
    } else if(e < 0){
      if(hammerTeam === 1) steals++;
      hammerTeam = 1;
    }
  });
  return steals;
}

function formatDate(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}.${m}.${y}.`;
}

function recordsTableHtml(rows, valueLabel){
  if(rows.length === 0) return '<div class="empty-mini">Nema podataka.</div>';
  let h = `<div class="table-scroll-x"><table class="stats-table records-table"><thead><tr><th>Datum</th><th><span class="lbl-full">Disciplina</span><span class="lbl-short">Dis.</span></th><th><span class="lbl-full">Kategorija</span><span class="lbl-short">Kat.</span></th><th>Utakmica</th><th>Rezultat</th><th>${valueLabel}</th></tr></thead><tbody>`;
  rows.forEach(r => {
    const team1Html = `<span class="team-nowrap">${clubLogoImgHtml(r.team1, r.disRaw)}${r.winner === 1 ? `<strong>${escapeHtml(r.team1)}</strong>` : escapeHtml(r.team1)}</span>`;
    const team2Html = `<span class="team-nowrap">${clubLogoImgHtml(r.team2, r.disRaw)}${r.winner === 2 ? `<strong>${escapeHtml(r.team2)}</strong>` : escapeHtml(r.team2)}</span>`;
    h += `<tr class="clickable-cell" onclick="openMatchModal('${r.id}')"><td>${formatDate(r.date)}</td><td><span class="lbl-full">${escapeHtml(r.dis)}</span><span class="lbl-short">${escapeHtml(r.disRaw)}</span></td><td><span class="lbl-full">${escapeHtml(r.katLabel)}</span><span class="lbl-short">${escapeHtml(r.katRaw)}</span></td><td><span class="records-match-teams">${team1Html}<span class="vs-sep"> – </span>${team2Html}</span></td><td>${r.score1}:${r.score2}</td><td class="num-cell">${r.value}</td></tr>`;
  });
  h += '</tbody></table></div>';
  return h;
}

// Za svaku utakmicu koju je "winner" na kraju dobio, prati kumulativni rezultat nakon svakog enda
// i pronalazi najveći zaostatak koji je pobjednik u nekom trenutku imao.
// Poredak: primarno po veličini zaostatka; kod izjednačenja veći margin konačne pobjede je bolji;
// ako je i to isto, prednost ima kasniji trenutak najvećeg zaostatka.
function computeComebacks(matches, n){
  const results = [];
  matches.forEach(m => {
    const ends = m.ends || [];
    if(!ends.length) return;
    if(m.winner !== 1 && m.winner !== 2) return;

    let s1 = 0, s2 = 0;
    let maxDeficit = 0, maxDeficitEnd = null;
    ends.forEach((e, idx) => {
      if(e > 0) s1 += e;
      else if(e < 0) s2 += -e;
      const deficit = m.winner === 1 ? (s2 - s1) : (s1 - s2);
      if(deficit >= maxDeficit){
        maxDeficit = deficit;
        maxDeficitEnd = idx + 1;
      }
    });
    if(maxDeficit <= 0) return; // pobjednik nikad nije bio u zaostatku — nije preokret

    const margin = Math.abs(m.score1 - m.score2);
    results.push({ m, deficit: maxDeficit, deficitEnd: maxDeficitEnd, margin });
  });

  results.sort((a,b) => b.deficit - a.deficit || b.margin - a.margin || b.deficitEnd - a.deficitEnd || (b.m.date||'').localeCompare(a.m.date||''));
  return results.slice(0, n);
}

function renderRekordi(){
  const kat = currentState().kat;
  const dis = currentState().dis;
  const [from, to] = getSeasonRange();
  const content = document.getElementById('rekordiContent');

  const played = DATA.matches.filter(m => (kat==='sve'||m.kat===kat) && (dis==='sve'||m.dis===dis) && m.season >= from && m.season <= to && m.played && m.score1 != null && m.score2 != null);

  function topN(list, metricFn, n){
    const withMetric = list.map(m => ({ m, val: metricFn(m) })).filter(x => x.val != null);
    withMetric.sort((a,b) => b.val - a.val || (b.m.date || '').localeCompare(a.m.date || ''));
    return withMetric.slice(0, n);
  }

  function toRow(m, val){
    return {
      id: m.id, katLabel: m.katLabel, katRaw: m.kat, dis: m.disLabel, disRaw: m.dis, team1: m.team1, team2: m.team2,
      score1: m.score1.toFixed(0), score2: m.score2.toFixed(0), date: m.date, value: val, winner: m.winner
    };
  }

  let html = '';

  const margin = topN(played, m => Math.abs(m.score1 - m.score2), 5);
  html += `<div class="record-block"><h3 class="record-title">Najuvjerljivije pobjede</h3>`;
  html += recordsTableHtml(margin.map(x => toRow(x.m, x.val.toFixed(0))), 'Razlika');
  html += `</div>`;

  const steals = topN(played, m => countSteals(m), 5);
  html += `<div class="record-block"><h3 class="record-title">Utakmice s najviše ukradenih endova</h3>`;
  html += recordsTableHtml(steals.map(x => toRow(x.m, x.val)), 'Ukradenih endova');
  html += `</div>`;

  const comebacks = computeComebacks(played, 5);
  html += `<div class="record-block"><h3 class="record-title">Najveći preokreti</h3>`;
  html += recordsTableHtml(comebacks.map(c => toRow(c.m, c.deficit)), 'Najveći zaostatak');
  html += `</div>`;

  const endRecords = [];
  played.forEach(m => {
    (m.ends || []).forEach(e => { endRecords.push({ m, val: Math.abs(e) }); });
  });
  endRecords.sort((a,b) => b.val - a.val || (b.m.date||'').localeCompare(a.m.date||''));
  let topEnds = endRecords.slice(0,5);
  html += `<div class="record-block"><h3 class="record-title">Najviše kamena u jednom endu</h3>`;
  html += recordsTableHtml(topEnds.map(x => toRow(x.m, x.val)), 'Kamena u endu');
  html += `</div>`;

  const mostStones = topN(played, m => m.score1 + m.score2, 5);
  html += `<div class="record-block"><h3 class="record-title">Utakmice s najviše kamena</h3>`;
  html += recordsTableHtml(mostStones.map(x => toRow(x.m, x.val.toFixed(0))), 'Ukupno kamena');
  html += `</div>`;

  let leastStones = played.map(m => ({m, val: m.score1 + m.score2})).sort((a,b) => a.val - b.val || (b.m.date||'').localeCompare(a.m.date||'')).slice(0,5);
  html += `<div class="record-block"><h3 class="record-title">Utakmice s najmanje kamena</h3>`;
  html += recordsTableHtml(leastStones.map(x => toRow(x.m, x.val.toFixed(0))), 'Ukupno kamena');
  html += `</div>`;

  content.innerHTML = html;
}

// --- NHC bodovi ("Najbolji hrvatski curlingaši") ---
// bodovi(n,T) = 100 * ((T-n+1)/T)^2 ; zadnjih 5 sezona s težinama 100/80/60/40/20%
const NHC_WEIGHTS = [1, 0.8, 0.6, 0.4, 0.2];

function nhcSeasonWeight(season, anchorSeason){
  const offset = anchorSeason - season;
  if(offset < 0 || offset >= NHC_WEIGHTS.length) return 0;
  return NHC_WEIGHTS[offset];
}

function nhcPoints(place, teamsCount){
  if(!place || !teamsCount || teamsCount <= 0) return 0;
  const x = teamsCount - place + 1;
  if(x <= 0) return 0;
  return 100 * (x * x) / (teamsCount * teamsCount);
}

function nhcContribution(t, place, anchorSeason){
  const w = nhcSeasonWeight(t.season, anchorSeason);
  if(w === 0) return 0;
  const teamsCount = t.teamsCount || t.standings.length;
  return nhcPoints(place, teamsCount) * w;
}

// Skuplja SVA prvenstva koja su ušla u NHC izračun za dani entitet (klub/ekipa
// ili igrač), zajedno s međukoracima izračuna, radi transparentnog prikaza.
function getNhcBreakdown(name, groupByClub, kat, dis, isPlayer, anchorSeason){
  const disList = dis === 'sve' ? DIS_ORDER : [dis];
  let clubMap = {};
  if(!isPlayer) disList.forEach(d => Object.assign(clubMap, (DATA.clubs && DATA.clubs[d]) || {}));

  const rows = [];
  DATA.tournaments.forEach(t => {
    if(kat !== 'sve' && t.kat !== kat) return;
    if(!disList.includes(t.dis)) return;
    const weight = nhcSeasonWeight(t.season, anchorSeason);
    if(weight === 0) return; // izvan zadnjih 5 sezona (od odabrane "Do" sezone unazad) — ne ulazi u izračun

    if(isPlayer){
      t.standings.forEach(s => {
        const players = t.rosterPool[s.team] || [];
        if(!players.includes(name)) return;
        pushRow(t, s, weight);
      });
    } else {
      t.standings.forEach(s => {
        const entity = groupByClub ? (clubMap[s.team] || s.team) : s.team;
        if(entity !== name) return;
        pushRow(t, s, weight);
      });
    }
  });

  function pushRow(t, s, weight){
    const teamsCount = t.teamsCount || t.standings.length;
    const basePoints = nhcPoints(s.place, teamsCount);
    rows.push({
      season: t.season, dis: t.dis, kat: t.kat, p: t.p,
      place: s.place, teamsCount, team: s.team,
      basePoints, weightPct: Math.round(weight * 100), weighted: basePoints * weight,
    });
  }

  rows.sort((a,b) => b.season - a.season || (a.dis).localeCompare(b.dis));
  return rows;
}

function openNhcBreakdownModal(name, groupByClub, kat, dis, isPlayer, anchorSeason){
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  body.classList.add('modal-wide');

  const rows = getNhcBreakdown(name, groupByClub, kat, dis, isPlayer, anchorSeason);
  const total = rows.reduce((s, r) => s + r.weighted, 0);

  let tableHtml;
  if(rows.length === 0){
    tableHtml = '<div class="empty-mini">Nema prvenstava u zadnjih 5 sezona koja bi ulazila u izračun.</div>';
  } else {
    tableHtml = `<div class="achv-table-scroll"><table class="achv-table"><thead><tr>
      <th>Sezona</th><th>Disciplina</th><th>Kategorija</th><th>Ekipa</th><th class="num">Mjesto</th>
      <th class="num">Broj ekipa</th><th class="num">Bodovi</th><th class="num">Težinski faktor sezone</th><th class="num">NHC bodova</th>
    </tr></thead><tbody>`;
    rows.forEach(r => {
      tableHtml += `<tr>
        <td>${seasonLabel(r.season)}</td>
        <td>${DIS_LABELS[r.dis]||r.dis}</td>
        <td>${KAT_LABELS[r.kat]||r.kat}</td>
        <td>${escapeHtml(r.team)}</td>
        <td class="num">${r.place}.</td>
        <td class="num">${r.teamsCount}</td>
        <td class="num">${r.basePoints.toFixed(1).replace('.', ',')}</td>
        <td class="num">${r.weightPct}%</td>
        <td class="num">${r.weighted.toFixed(1).replace('.', ',')}</td>
      </tr>`;
    });
    tableHtml += `<tr><td colspan="8" style="text-align:right; font-weight:700;">Ukupno (zaokruženo)</td><td class="num" style="font-weight:700;">${Math.round(total)}</td></tr>`;
    tableHtml += '</tbody></table></div>';
  }

  body.innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    <h2 class="entity-title">NHC bodovi — ${escapeHtml(name)}</h2>
    <div class="info-block">
      <div>Formula za izračun NHC bodova: <span>100 × (1 − (mjesto−1)/broj&nbsp;ekipa)<sup>2</sup></span></div>
      <div>Računa se zadnjih 5 sezona od ${seasonLabel(anchorSeason)} unazad, s težinskim faktorima 100% / 80% / 60% / 40% / 20% (najnovija sezona prema najstarijoj)</div>
    </div>
    ${tableHtml}
  `;
  overlay.classList.add('open');
}

function computeTeamClubStats(kat, dis, groupByClub, seasonFrom, seasonTo){
  const disList = dis === 'sve' ? DIS_ORDER : [dis];
  let clubMap = {};
  disList.forEach(d => Object.assign(clubMap, (DATA.clubs && DATA.clubs[d]) || {}));
  const entityName = team => groupByClub ? (clubMap[team] || team) : team;

  // NHC bodovi uvijek gledaju SVA prvenstva (vlastiti prozor od 5 sezona, neovisan
  // o univerzalnom filteru sezone) — zato koristimo odvojen, nefiltriran skup za to.
  const allTournaments = DATA.tournaments.filter(t => (kat==='sve'||t.kat===kat) && disList.includes(t.dis));
  const tournaments = allTournaments.filter(t => t.season >= seasonFrom && t.season <= seasonTo);
  const matches = DATA.matches.filter(m => (kat==='sve'||m.kat===kat) && disList.includes(m.dis) && m.season >= seasonFrom && m.season <= seasonTo);

  const stats = {};
  function ensure(e){
    if(!stats[e]) stats[e] = {
      name: e,
      medals: {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0},
      tournamentsSet: new Set(),
      utakmica: 0, played: 0, endova: 0,
      w: 0, d: 0, l: 0,
      stonesFor: 0, stonesAgainst: 0,
      endsFor: 0, endsAgainst: 0,
      stolenBy: 0, stolenFrom: 0,
      asTeam1: 0, asTeam2: 0,
      pkWon: 0, pkLost: 0, lsdMatches: 0, lsdThrows: [],
      nhc: 0,
    };
    return stats[e];
  }

  tournaments.forEach(t => {
    t.standings.forEach(s => {
      const e = entityName(s.team);
      const acc = ensure(e);
      acc.tournamentsSet.add(`${t.season}-${t.dis}-${t.kat}-${t.p}`);
      if(s.place >= 1 && s.place <= 9) acc.medals[s.place]++;
    });
  });

  // NHC bodovi: uvijek iz NEFILTRIRANOG skupa (vlastiti prozor od zadnjih 5 sezona)
  allTournaments.forEach(t => {
    t.standings.forEach(s => {
      const e = entityName(s.team);
      const acc = ensure(e);
      acc.nhc += nhcContribution(t, s.place, seasonTo);
    });
  });

  matches.forEach(m => {
    const e1 = entityName(m.team1), e2 = entityName(m.team2);
    // Napomena: ako obje ekipe pripadaju istom klubu (npr. "Zagreb" protiv "Zagreb 2"), to se
    // namjerno broji kao DVIJE utakmice za taj klub - jedna pobjeda i jedan poraz (iz
    // perspektive kluba kao cjeline, obje njegove ekipe su odigrale po jednu utakmicu).
    const a1 = ensure(e1), a2 = ensure(e2);
    a1.utakmica++; a2.utakmica++;
    a1.asTeam1++; a2.asTeam2++;

    if(m.usesLSD){
      a1.lsdMatches++; a2.lsdMatches++;
      if(m.pk === 1) a1.pkWon++;
      if(m.pk === 2) a2.pkWon++;
      if(m.pk === 2) a1.pkLost++;
      if(m.pk === 1) a2.pkLost++;
      (m.throws1 || []).forEach(v => a1.lsdThrows.push(v));
      (m.throws2 || []).forEach(v => a2.lsdThrows.push(v));
    }

    if(m.winner === 1){ a1.w++; a2.l++; }
    else if(m.winner === 2){ a2.w++; a1.l++; }
    else if(m.played){ a1.d++; a2.d++; }

    if(m.played){
      a1.played++; a2.played++;
      if(m.score1 != null && m.score2 != null){
        a1.stonesFor += m.score1; a1.stonesAgainst += m.score2;
        a2.stonesFor += m.score2; a2.stonesAgainst += m.score1;
      }
      let hammerTeam = m.pk;
      (m.ends || []).forEach(e => {
        a1.endova++; a2.endova++;
        if(e > 0){
          a1.endsFor++; a2.endsAgainst++;
          if(hammerTeam === 2){ a1.stolenBy++; a2.stolenFrom++; }
          hammerTeam = 2;
        } else if(e < 0){
          a2.endsFor++; a1.endsAgainst++;
          if(hammerTeam === 1){ a2.stolenBy++; a1.stolenFrom++; }
          hammerTeam = 1;
        }
      });
    }
  });

  return stats;
}

function avg(sum, count){ return count > 0 ? sum / count : null; }
function fmtAvg(v){ return v == null ? '–' : v.toFixed(1).replace('.', ','); }

function renderKlubovi(){ renderEkipeOrKlubovi(true, 'kluboviContent'); }
function renderEkipe(){ renderEkipeOrKlubovi(false, 'ekipeContent'); }

function renderEkipeOrKlubovi(groupByClub, contentElId){
  const kat = currentState().kat;
  const dis = currentState().dis;
  const [seasonFrom, seasonTo] = getSeasonRange();
  const content = document.getElementById(contentElId);

  const statsMap = computeTeamClubStats(kat, dis, groupByClub, seasonFrom, seasonTo);
  const rows = Object.values(statsMap).map(a => {
    const medalsTotal = a.medals[1] + a.medals[2] + a.medals[3];
    const medalPoints = a.medals[1]*3 + a.medals[2]*2 + a.medals[3]*1;
    const points = a.w*2 + a.d;
    const maxPoints = (a.w+a.d+a.l)*2;
    const uspjeh = maxPoints > 0 ? Math.round((points/maxPoints)*100) : null;
    const lsdAvg = a.lsdThrows.length ? a.lsdThrows.reduce((s,v)=>s+v,0)/a.lsdThrows.length : null;
    return {
      name: a.name,
      nhc: Math.round(a.nhc * 10) / 10,
      medalsTotal, gold: a.medals[1], silver: a.medals[2], bronze: a.medals[3], medalPoints,
      p4: a.medals[4], p5: a.medals[5], p6: a.medals[6], p7: a.medals[7], p8: a.medals[8], p9: a.medals[9],
      prvenstava: a.tournamentsSet.size,
      utakmica: a.utakmica, endova: a.endova,
      w: a.w, d: a.d, l: a.l,
      points, uspjeh,
      stonesFor: a.stonesFor, stonesForAvg: avg(a.stonesFor, a.played),
      stonesAgainst: a.stonesAgainst, stonesAgainstAvg: avg(a.stonesAgainst, a.played),
      endsFor: a.endsFor, endsForAvg: avg(a.endsFor, a.played),
      endsAgainst: a.endsAgainst, endsAgainstAvg: avg(a.endsAgainst, a.played),
      stolenBy: a.stolenBy, stolenByAvg: avg(a.stolenBy, a.played),
      stolenFrom: a.stolenFrom, stolenFromAvg: avg(a.stolenFrom, a.played),
      asTeam1: a.asTeam1, asTeam2: a.asTeam2,
      pkWon: a.pkWon, lsdMatches: a.lsdMatches,
      lsdAvg,
    };
  });

  rows.sort((a,b) => b.nhc - a.nhc || b.medalPoints - a.medalPoints || b.w - a.w || a.l - b.l);

  if(rows.length === 0){
    content.innerHTML = '<div class="empty-state">Nema podataka za odabranu disciplinu/uzrast.</div>';
    return;
  }

  const numericKeys = ['nhc','medalsTotal','gold','silver','bronze','medalPoints','prvenstava','utakmica','endova','w','d','l','points','uspjeh','stonesFor','stonesForAvg','stonesAgainst','stonesAgainstAvg','endsFor','endsForAvg','endsAgainst','endsAgainstAvg','stolenBy','stolenByAvg','stolenFrom','stolenFromAvg'];
  const invertGood = new Set(['stonesAgainst','stonesAgainstAvg','endsAgainst','endsAgainstAvg','stolenFrom','stolenFromAvg','l']);
  const bounds = {};
  numericKeys.forEach(k => {
    const vals = rows.map(r => r[k]).filter(v => v != null);
    if(vals.length < 2) return;
    bounds[k] = { min: Math.min(...vals), max: Math.max(...vals) };
  });
  function cellClass(k, v){
    if(v == null || !bounds[k] || bounds[k].min === bounds[k].max) return '';
    const isBest = invertGood.has(k) ? v === bounds[k].min : v === bounds[k].max;
    if(isBest) return ' class="cell-best"';
    return '';
  }

  let cols = [
    {k:'nhc', label:'NHC bodovi', dec:true},
    {k:'medalPoints', label:'Bodova za medalje'},
    {k:'medalsTotal', label:'Ukupno medalja'},
    {k:'gold', label:'Zlatnih medalja'},
    {k:'silver', label:'Srebrnih medalja'},
    {k:'bronze', label:'Brončanih medalja'},
    {k:'p4', label:'4. mjesto'}, {k:'p5', label:'5. mjesto'}, {k:'p6', label:'6. mjesto'},
    {k:'p7', label:'7. mjesto'}, {k:'p8', label:'8. mjesto'}, {k:'p9', label:'9. mjesto'},
    {k:'prvenstava', label:'Odigrano prvenstava'},
    {k:'utakmica', label:'Odigrano utakmica'},
    {k:'endova', label:'Odigrano endova'},
    {k:'w', label:'Pobjeda'}, {k:'d', label:'Remija'}, {k:'l', label:'Poraza'},
    {k:'points', label:'Osvojeno bodova'},
    {k:'uspjeh', label:'Uspješnost', pct:true},
    {k:'stonesFor', label:'Osvojeno kamena'}, {k:'stonesForAvg', label:'Prosjek', avg:true},
    {k:'stonesAgainst', label:'Izgubljeno kamena'}, {k:'stonesAgainstAvg', label:'Prosjek', avg:true},
    {k:'endsFor', label:'Osvojeno endova'}, {k:'endsForAvg', label:'Prosjek', avg:true},
    {k:'endsAgainst', label:'Izgubljeno endova'}, {k:'endsAgainstAvg', label:'Prosjek', avg:true},
    {k:'stolenBy', label:'Ukrao endova'}, {k:'stolenByAvg', label:'Prosjek', avg:true},
    {k:'stolenFrom', label:'Ukradeno endova'}, {k:'stolenFromAvg', label:'Prosjek', avg:true},
  ];
  // sakrij "mjesto" stupce koji su posve nula (npr. 8./9. mjesto ako prvenstvo nema toliko ekipa)
  const placementKeys = new Set(['p4','p5','p6','p7','p8','p9']);
  cols = cols.filter(c => !placementKeys.has(c.k) || rows.some(r => r[c.k]));

  let html = `<div class="h2h-wrap scroll-limited"><table class="ekipe-table"><thead><tr><th class="ekipe-rank"></th><th class="ekipe-name">${groupByClub ? 'Klub' : 'Ekipa'}</th>`;
  html += cols.map(c => `<th>${c.label}</th>`).join('');
  html += '<th>Tamni/Svijetli kamenovi</th><th>Posljednji kamen prvog enda</th><th>Prosjek preciznih polaganja (cm)</th>';
  html += '</tr></thead><tbody>';

  rows.forEach((r, i) => {
    html += `<tr><td class="ekipe-rank">${i+1}.</td><td class="ekipe-name clickable-name" data-entity="${escapeHtml(r.name)}"><span class="team-nowrap">${clubLogoImgHtml(r.name, dis)}${escapeHtml(r.name)}</span></td>`;
    cols.forEach(c => {
      let v = r[c.k];
      let display = v == null || v === 0 ? '' : v;
      if(c.pct) display = v == null ? '' : `${v}%`;
      if(c.avg) display = fmtAvg(v);
      if(c.dec) display = (v == null || v === 0) ? '' : Math.round(v);
      let attrs = cellClass(c.k, v);
      if(c.k === 'nhc'){
        attrs = attrs ? attrs.replace('class="', 'class="clickable-cell ') : ' class="clickable-cell"';
        attrs += ` data-nhc-entity="${escapeHtml(r.name)}"`;
      }
      html += `<td${attrs}>${display}</td>`;
    });
    html += `<td>${r.asTeam1} / ${r.asTeam2}</td>`;
    html += `<td>${r.pkWon} / ${r.lsdMatches}</td>`;
    html += `<td>${fmtAvg(r.lsdAvg)}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  content.innerHTML = html;
  const wrapEl = content.querySelector(".h2h-wrap");
  if(wrapEl) addTopScrollbar(content, wrapEl);
  content.querySelectorAll("[data-entity]").forEach(el => {
    el.addEventListener("click", () => openEntityModal(el.dataset.entity, groupByClub, kat, dis, seasonFrom, seasonTo));
  });
  content.querySelectorAll("[data-nhc-entity]").forEach(el => {
    el.addEventListener("click", () => openNhcBreakdownModal(el.dataset.nhcEntity, groupByClub, kat, dis, false, seasonTo));
  });
}

function computePlayerStats(kat, dis, seasonFrom, seasonTo){
  const disList = dis === 'sve' ? DIS_ORDER : [dis];
  const allTournaments = DATA.tournaments.filter(t => (kat==='sve'||t.kat===kat) && disList.includes(t.dis));
  const tournaments = allTournaments.filter(t => t.season >= seasonFrom && t.season <= seasonTo);
  const matches = DATA.matches.filter(m => (kat==='sve'||m.kat===kat) && disList.includes(m.dis) && m.season >= seasonFrom && m.season <= seasonTo);

  const stats = {};
  function ensure(name){
    if(!stats[name]) stats[name] = {
      name,
      medals: {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0},
      tournamentsSet: new Set(),
      utakmica: 0, played: 0, endova: 0,
      w: 0, d: 0, l: 0,
      stonesFor: 0, stonesAgainst: 0,
      endsFor: 0, endsAgainst: 0,
      stolenBy: 0, stolenFrom: 0,
      posCount: {'Prvi':0,'Drugi':0,'Treći':0,'Četvrti':0,'Rezerva':0},
      skipCount: 0, viceCount: 0,
      pkWon: 0, pkLost: 0, lsdMatches: 0, lsdThrows: [],
      nhc: 0,
    };
    return stats[name];
  }

  tournaments.forEach(t => {
    t.standings.forEach(s => {
      const players = t.rosterPool[s.team] || [];
      players.forEach(p => {
        const acc = ensure(p);
        acc.tournamentsSet.add(`${t.season}-${t.dis}-${t.kat}-${t.p}`);
        if(s.place >= 1 && s.place <= 9) acc.medals[s.place]++;
      });
    });
  });

  // NHC bodovi: uvijek iz NEFILTRIRANOG skupa (vlastiti prozor od zadnjih 5 sezona)
  allTournaments.forEach(t => {
    t.standings.forEach(s => {
      const players = t.rosterPool[s.team] || [];
      players.forEach(p => { ensure(p).nhc += nhcContribution(t, s.place, seasonTo); });
    });
  });

  matches.forEach(m => {
    [[m.roster1, 1], [m.roster2, 2]].forEach(([roster, side]) => {
      const oppSide = side === 1 ? 2 : 1;
      (roster || []).forEach(p => {
        const acc = ensure(p.name);
        acc.utakmica++;

        if(p.position && acc.posCount[p.position] != null) acc.posCount[p.position]++;
        if(p.role === 'Skip') acc.skipCount++;
        else if(p.role === 'Vice-skip') acc.viceCount++;

        if(m.usesLSD){
          acc.lsdMatches++;
          if(p.lsd) acc.lsdThrows.push(p.lsd.distance);
          if(m.pk === side) acc.pkWon++;
          else if(m.pk === oppSide) acc.pkLost++;
        }

        if(m.winner === side) acc.w++;
        else if(m.winner === 1 || m.winner === 2) acc.l++;
        else if(m.played) acc.d++;

        if(m.played){
          acc.played++;
          const myScore = side === 1 ? m.score1 : m.score2;
          const oppScore = side === 1 ? m.score2 : m.score1;
          if(myScore != null && oppScore != null){
            acc.stonesFor += myScore; acc.stonesAgainst += oppScore;
          }
          let hammerTeam = m.pk;
          (m.ends || []).forEach(e => {
            acc.endova++;
            if(e > 0){
              if(side === 1){ acc.endsFor++; if(hammerTeam === 2) acc.stolenBy++; }
              else { acc.endsAgainst++; if(hammerTeam === 2) acc.stolenFrom++; }
              hammerTeam = 2;
            } else if(e < 0){
              if(side === 2){ acc.endsFor++; if(hammerTeam === 1) acc.stolenBy++; }
              else { acc.endsAgainst++; if(hammerTeam === 1) acc.stolenFrom++; }
              hammerTeam = 1;
            }
          });
        }
      });
    });
  });

  return stats;
}

function renderIgraci(){
  const kat = currentState().kat;
  const dis = currentState().dis;
  const [seasonFrom, seasonTo] = getSeasonRange();
  const content = document.getElementById('igraciContent');

  const statsMap = computePlayerStats(kat, dis, seasonFrom, seasonTo);
  const rows = Object.values(statsMap).map(a => {
    const medalsTotal = a.medals[1] + a.medals[2] + a.medals[3];
    const medalPoints = a.medals[1]*3 + a.medals[2]*2 + a.medals[3]*1;
    const points = a.w*2 + a.d;
    const maxPoints = (a.w+a.d+a.l)*2;
    const uspjeh = maxPoints > 0 ? Math.round((points/maxPoints)*100) : null;
    const lsdCount = a.lsdThrows.length;
    const lsdAvg = lsdCount ? a.lsdThrows.reduce((s,v)=>s+v,0)/lsdCount : null;
    return {
      name: a.name,
      nhc: Math.round(a.nhc * 10) / 10,
      medalsTotal, gold: a.medals[1], silver: a.medals[2], bronze: a.medals[3], medalPoints,
      prvenstava: a.tournamentsSet.size,
      utakmica: a.utakmica, endova: a.endova,
      w: a.w, d: a.d, l: a.l, points, uspjeh,
      lsdCount, lsdAvg,
      skip: a.skipCount, vice: a.viceCount,
      p1: a.posCount['Prvi'], p2: a.posCount['Drugi'], p3: a.posCount['Treći'], p4: a.posCount['Četvrti'], pr: a.posCount['Rezerva'],
    };
  });

  rows.sort((a,b) => b.nhc - a.nhc || b.medalPoints - a.medalPoints || b.w - a.w || a.l - b.l);

  if(rows.length === 0){
    content.innerHTML = '<div class="empty-state">Nema podataka za odabranu disciplinu/uzrast.</div>';
    return;
  }

  const numericKeys = ['nhc','medalsTotal','gold','silver','bronze','medalPoints','prvenstava','utakmica','endova','w','d','l','points','uspjeh','lsdCount','lsdAvg','skip','vice','p1','p2','p3','p4','pr'];
  const invertGood = new Set(['l','lsdAvg']);
  const bounds = {};
  numericKeys.forEach(k => {
    const vals = rows.map(r => r[k]).filter(v => v != null);
    if(vals.length < 2) return;
    bounds[k] = { min: Math.min(...vals), max: Math.max(...vals) };
  });
  function cellClass(k, v){
    if(v == null || !bounds[k] || bounds[k].min === bounds[k].max) return '';
    const isBest = invertGood.has(k) ? v === bounds[k].min : v === bounds[k].max;
    if(isBest) return ' class="cell-best"';
    return '';
  }

  let cols = [
    {k:'nhc', label:'NHC bodovi', dec:true},
    {k:'medalPoints', label:'Bodova za medalje'},
    {k:'medalsTotal', label:'Ukupno medalja'},
    {k:'gold', label:'Zlatnih medalja'},
    {k:'silver', label:'Srebrnih medalja'},
    {k:'bronze', label:'Brončanih medalja'},
    {k:'prvenstava', label:'Odigrano prvenstava'},
    {k:'utakmica', label:'Odigrano utakmica'},
    {k:'endova', label:'Odigrano endova'},
    {k:'w', label:'Pobjeda'}, {k:'d', label:'Remija'}, {k:'l', label:'Poraza'},
    {k:'points', label:'Osvojeno bodova'},
    {k:'uspjeh', label:'Uspješnost', pct:true},
    {k:'lsdCount', label:'Preciznih polaganja'},
    {k:'lsdAvg', label:'Prosjek preciznih polaganja (cm)', avg:true},
    {k:'skip', label:'Skip'}, {k:'vice', label:'Vice-skip'},
    {k:'p4', label:'Četvrti'}, {k:'p3', label:'Treći'}, {k:'p2', label:'Drugi'}, {k:'p1', label:'Prvi'}, {k:'pr', label:'Rezerva'},
  ];
  // MP (mješoviti parovi) igraju samo 2 igrača (Ž/M), nemaju Skip/Vice-skip ni 4 pozicije
  if(dis === 'MP'){
    const mpExclude = new Set(['skip','vice','p1','p2','p3','p4','pr']);
    cols = cols.filter(c => !mpExclude.has(c.k));
  }

  let html = `<div class="h2h-wrap scroll-limited"><table class="ekipe-table"><thead><tr><th class="ekipe-name-search" colspan="2">
    <div class="name-search-wrap">
      <input class="name-search-input" id="igraciNameSearch" placeholder="Traži igrača..." autocomplete="off">
      <button class="name-search-clear" id="igraciNameSearchClear" type="button" aria-label="Obriši">×</button>
      <div class="name-search-list" id="igraciNameSearchList"></div>
    </div>
  </th>`;
  html += cols.map(c => `<th>${c.label}</th>`).join('');
  html += '</tr></thead><tbody>';

  rows.forEach((r, i) => {
    html += `<tr><td class="ekipe-rank">${i+1}.</td><td class="ekipe-name clickable-name" data-player="${escapeHtml(r.name)}">${escapeHtml(r.name)}</td>`;
    cols.forEach(c => {
      let v = r[c.k];
      let display = v == null || v === 0 ? '' : v;
      if(c.pct) display = v == null ? '' : `${v}%`;
      if(c.avg) display = fmtAvg(v);
      if(c.dec) display = (v == null || v === 0) ? '' : Math.round(v);
      let attrs = cellClass(c.k, v);
      if(c.k === 'nhc'){
        attrs = attrs ? attrs.replace('class="', 'class="clickable-cell ') : ' class="clickable-cell"';
        attrs += ` data-nhc-player="${escapeHtml(r.name)}"`;
      }
      html += `<td${attrs}>${display}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  content.innerHTML = html;
  const wrapEl = content.querySelector(".h2h-wrap");
  if(wrapEl) addTopScrollbar(content, wrapEl);
  content.querySelectorAll("[data-player]").forEach(el => {
    el.addEventListener("click", () => openPlayerModal(el.dataset.player, kat, dis, seasonFrom, seasonTo));
  });
  content.querySelectorAll("[data-nhc-player]").forEach(el => {
    el.addEventListener("click", () => openNhcBreakdownModal(el.dataset.nhcPlayer, false, kat, dis, true, seasonTo));
  });

  // Pretraga u zaglavlju - filtrirajući dropdown, klik na igrača skoči na njegov redak (ne filtrira tablicu)
  const searchInput = document.getElementById('igraciNameSearch');
  const searchList = document.getElementById('igraciNameSearchList');
  const searchClear = document.getElementById('igraciNameSearchClear');
  const allNames = rows.map(r => r.name);

  function renderSearchList(query){
    const q = (query || '').trim().toLowerCase();
    const filtered = q ? allNames.filter(n => n.toLowerCase().includes(q)) : allNames;
    searchList.innerHTML = filtered.length
      ? filtered.map(n => `<div class="name-search-item" data-name="${escapeHtml(n)}">${escapeHtml(n)}</div>`).join('')
      : '<div class="name-search-empty">Nema rezultata.</div>';
    searchList.classList.add('open');
  }
  searchInput.addEventListener('focus', () => renderSearchList(searchInput.value));
  searchInput.addEventListener('input', () => renderSearchList(searchInput.value));
  searchInput.addEventListener('blur', () => setTimeout(() => searchList.classList.remove('open'), 150));
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchList.classList.remove('open');
    searchInput.focus();
  });
  searchList.addEventListener('mousedown', (e) => {
    const item = e.target.closest('[data-name]');
    if(!item) return;
    const name = item.dataset.name;
    searchList.classList.remove('open');
    searchInput.value = '';

    const cell = content.querySelector(`td.ekipe-name[data-player="${CSS.escape(name)}"]`);
    if(!cell) return;
    const row = cell.closest('tr');
    content.querySelectorAll('tr.row-highlight').forEach(r => r.classList.remove('row-highlight'));
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    requestAnimationFrame(() => row.classList.add('row-highlight'));
    setTimeout(() => row.classList.remove('row-highlight'), 1800);
  });
}

function renderKluboviH2h(){ renderH2h(true, 'klubovih2hContent'); }
function renderEkipeH2h(){ renderH2h(false, 'ekipeh2hContent'); }

function renderH2h(groupByClub, contentElId){
  const kat = currentState().kat;
  const dis = currentState().dis;
  const disList = dis === 'sve' ? DIS_ORDER : [dis];
  const [from, to] = getSeasonRange();
  const content = document.getElementById(contentElId);

  const matches = DATA.matches.filter(m => (kat==='sve'||m.kat===kat) && disList.includes(m.dis) && m.season >= from && m.season <= to && (m.winner === 1 || m.winner === 2 || m.played));
  let clubMap = {};
  disList.forEach(d => Object.assign(clubMap, (DATA.clubs && DATA.clubs[d]) || {}));
  const entityName = (team) => groupByClub ? (clubMap[team] || team) : team;

  const entitiesSet = new Set();
  matches.forEach(m => { entitiesSet.add(entityName(m.team1)); entitiesSet.add(entityName(m.team2)); });

  // Poredak po NHC bodovima (isti izračun kao na "Klubovi"/"Ekipe"), ovisno o trenutnom filteru -
  // NHC bodovi se ovdje ne prikazuju, samo određuju redoslijed. Kod izjednačenja koriste se isti
  // dodatni kriteriji kao u glavnoj tablici: bodovi za medalje, pa pobjede, pa porazi.
  const nhcStatsMap = computeTeamClubStats(kat, dis, groupByClub, from, to);
  function medalPoints(s){ return s ? (s.medals[1]*3 + s.medals[2]*2 + s.medals[3]*1) : 0; }
  const entities = [...entitiesSet].sort((a,b) => {
    const sa = nhcStatsMap[a], sb = nhcStatsMap[b];
    const nhcA = sa ? sa.nhc : 0, nhcB = sb ? sb.nhc : 0;
    if(nhcB !== nhcA) return nhcB - nhcA;
    const mpA = medalPoints(sa), mpB = medalPoints(sb);
    if(mpB !== mpA) return mpB - mpA;
    const wA = sa ? sa.w : 0, wB = sb ? sb.w : 0;
    if(wB !== wA) return wB - wA;
    const lA = sa ? sa.l : 0, lB = sb ? sb.l : 0;
    if(lA !== lB) return lA - lB;
    return a.localeCompare(b, 'hr');
  });

  if(entities.length === 0){
    content.innerHTML = '<div class="empty-state">Nema odigranih utakmica za odabranu disciplinu/kategoriju.</div>';
    return;
  }

  const record = {};
  entities.forEach(a => { record[a] = {}; entities.forEach(b => { record[a][b] = { w: 0, d: 0, l: 0 }; }); });

  matches.forEach(m => {
    const e1 = entityName(m.team1), e2 = entityName(m.team2);
    if(e1 === e2) return;
    if(m.winner === 1){ record[e1][e2].w++; record[e2][e1].l++; }
    else if(m.winner === 2){ record[e2][e1].w++; record[e1][e2].l++; }
    else if(m.played){ record[e1][e2].d++; record[e2][e1].d++; }
  });

  const h2hColWidth = 70;
  const h2hFirstColWidth = 175;
  const h2hTableWidth = h2hFirstColWidth + entities.length * h2hColWidth;
  const h2hColgroup = `<colgroup><col style="width:${h2hFirstColWidth}px">${`<col style="width:${h2hColWidth}px">`.repeat(entities.length)}</colgroup>`;
  let html = `<div class="h2h-wrap scroll-limited"><table class="h2h-table" style="width:${h2hTableWidth}px;">${h2hColgroup}<thead><tr><th>${groupByClub ? 'Klub' : 'Ekipa'}</th>`;
  html += entities.map(e => `<th class="clickable-name" data-entity="${escapeHtml(e)}">${escapeHtml(e)}</th>`).join('');
  html += '</tr></thead><tbody>';
  entities.forEach(rowE => {
    html += `<tr><th class="clickable-name" data-entity="${escapeHtml(rowE)}"><span class="team-nowrap">${clubLogoImgHtml(rowE, dis)}${escapeHtml(rowE)}</span></th>`;
    entities.forEach(colE => {
      if(rowE === colE){
        html += '<td class="diag"></td>';
      } else {
        const rec = record[rowE][colE];
        if(rec.w === 0 && rec.d === 0 && rec.l === 0){
          html += '<td class="h2h-empty">–</td>';
        } else {
          const totalGames = rec.w + rec.d + rec.l;
          const points = rec.w * 2 + rec.d * 1;
          const maxPoints = totalGames * 2;
          const pct = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;
          html += `<td class="h2h-cell clickable-cell" data-pair-a="${escapeHtml(rowE)}" data-pair-b="${escapeHtml(colE)}">${rec.w}-${rec.d}-${rec.l}<br><span class="h2h-pct">${pct}%</span></td>`;
        }
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  content.innerHTML = html;
  const wrapEl = content.querySelector(".h2h-wrap");
  if(wrapEl) addTopScrollbar(content, wrapEl);
  content.querySelectorAll('[data-entity]').forEach(el => {
    el.addEventListener('click', () => openEntityModal(el.dataset.entity, groupByClub, kat, dis, from, to));
  });
  content.querySelectorAll('[data-pair-a]').forEach(el => {
    el.addEventListener('click', () => openH2hMatchListModal(el.dataset.pairA, el.dataset.pairB, groupByClub, dis, kat));
  });
}
// ===================== Igrači međusobno (traži par, ne puna matrica) =====================
// Puna N×N matrica ovdje ne bi bila čitljiva (previše igrača, većina parova nikad nije igrala
// jedni protiv drugih), pa umjesto toga nudimo dva kombo-izbornika: prvi ponudi sve igrače u
// okviru filtera, drugi (nakon odabira prvog) ponudi samo stvarne protivnike tog igrača.
function playerNamesFromRoster(roster){
  return (roster || []).map(p => p.name).filter(Boolean);
}

function renderIgraciH2h(){
  const kat = currentState().kat;
  const dis = currentState().dis;
  const disList = dis === 'sve' ? DIS_ORDER : [dis];
  const [from, to] = getSeasonRange();
  const content = document.getElementById('igracih2hContent');

  const matches = DATA.matches.filter(m => (kat==='sve'||m.kat===kat) && disList.includes(m.dis) && m.season >= from && m.season <= to && (m.winner === 1 || m.winner === 2 || m.played));

  content.innerHTML = `
    <div class="note" style="margin-bottom:16px; font-size:12.5px; color:var(--text-muted);">Odaberi dva igrača da vidiš njihov međusobni omjer i popis susreta, u okviru gore odabranog filtera.</div>
    <div class="ph2h-picker-row">
      <div class="ph2h-col">
        <label class="ph2h-label">Igrač</label>
        <div class="ph2h-combo-wrap">
          <input class="ph2h-input" id="ph2hInputA" placeholder="Upiši ime…" autocomplete="off">
          <button class="ph2h-clear" id="ph2hClearA" type="button" aria-label="Obriši">×</button>
          <div class="ph2h-list" id="ph2hListA"></div>
        </div>
        <div class="ph2h-count" id="ph2hCountA"></div>
      </div>
      <div class="ph2h-vs"></div>
      <div class="ph2h-col">
        <label class="ph2h-label">protiv igrača</label>
        <div class="ph2h-combo-wrap">
          <input class="ph2h-input" id="ph2hInputB" placeholder="Prvo odaberi igrača…" autocomplete="off" disabled>
          <button class="ph2h-clear" id="ph2hClearB" type="button" aria-label="Obriši">×</button>
          <div class="ph2h-list" id="ph2hListB"></div>
        </div>
        <div class="ph2h-count" id="ph2hCountB"></div>
      </div>
    </div>
    <div id="ph2hResult"></div>
  `;

  function allPlayers(){
    const set = new Set();
    matches.forEach(m => {
      playerNamesFromRoster(m.roster1).forEach(p => set.add(p));
      playerNamesFromRoster(m.roster2).forEach(p => set.add(p));
    });
    return [...set].sort((a,b) => a.localeCompare(b, 'hr'));
  }

  function opponentsOf(player){
    const set = new Set();
    matches.forEach(m => {
      const r1 = playerNamesFromRoster(m.roster1), r2 = playerNamesFromRoster(m.roster2);
      if(r1.includes(player)) r2.forEach(p => set.add(p));
      else if(r2.includes(player)) r1.forEach(p => set.add(p));
    });
    return [...set].sort((a,b) => a.localeCompare(b, 'hr'));
  }

  let playerA = null, playerB = null;

  const inputA = document.getElementById('ph2hInputA');
  const listA = document.getElementById('ph2hListA');
  const countA = document.getElementById('ph2hCountA');
  const clearA = document.getElementById('ph2hClearA');
  const inputB = document.getElementById('ph2hInputB');
  const listB = document.getElementById('ph2hListB');
  const countB = document.getElementById('ph2hCountB');
  const clearB = document.getElementById('ph2hClearB');
  const resultEl = document.getElementById('ph2hResult');

  function setupCombo(inputEl, listEl, countEl, clearEl, getOptions, onSelect, onClear){
    function render(query){
      const options = getOptions();
      const q = (query || '').trim().toLowerCase();
      const filtered = q ? options.filter(o => o.toLowerCase().includes(q)) : options;
      countEl.textContent = `${options.length} igrača dostupno`;
      listEl.innerHTML = filtered.length
        ? filtered.map(o => `<div class="ph2h-item" data-val="${escapeHtml(o)}">${escapeHtml(o)}</div>`).join('')
        : '<div class="ph2h-empty">Nema rezultata.</div>';
      listEl.classList.add('open');
    }
    inputEl.addEventListener('focus', () => render(inputEl.value));
    inputEl.addEventListener('input', () => render(inputEl.value));
    inputEl.addEventListener('blur', () => setTimeout(() => listEl.classList.remove('open'), 150));
    listEl.addEventListener('mousedown', (e) => {
      const item = e.target.closest('[data-val]');
      if(!item) return;
      inputEl.value = item.dataset.val;
      listEl.classList.remove('open');
      onSelect(item.dataset.val);
    });
    clearEl.addEventListener('click', () => {
      inputEl.value = '';
      listEl.classList.remove('open');
      onClear();
      inputEl.focus();
    });
    return { refresh: () => { countEl.textContent = `${getOptions().length} igrača dostupno`; } };
  }

  const comboB = setupCombo(inputB, listB, countB, clearB, () => playerA ? opponentsOf(playerA) : [], (val) => {
    playerB = val;
    renderResult();
  }, () => {
    playerB = null;
    renderResult();
  });

  setupCombo(inputA, listA, countA, clearA, allPlayers, (val) => {
    playerA = val;
    playerB = null;
    inputB.value = '';
    inputB.disabled = false;
    inputB.placeholder = 'Upiši ime…';
    comboB.refresh();
    renderResult();
  }, () => {
    playerA = null; playerB = null;
    inputB.value = '';
    inputB.disabled = true;
    inputB.placeholder = 'Prvo odaberi igrača…';
    renderResult();
  });

  function renderResult(){
    if(!playerA || !playerB){ resultEl.innerHTML = ''; return; }

    const relevant = matches.filter(m => {
      const r1 = playerNamesFromRoster(m.roster1), r2 = playerNamesFromRoster(m.roster2);
      return (r1.includes(playerA) && r2.includes(playerB)) || (r2.includes(playerA) && r1.includes(playerB));
    });

    if(relevant.length === 0){
      resultEl.innerHTML = '<div class="empty-state">Nisu igrali jedan protiv drugoga u odabranom filteru.</div>';
      return;
    }

    let w=0,d=0,l=0;
    const rows = relevant.map(m => {
      const r1 = playerNamesFromRoster(m.roster1);
      const aInR1 = r1.includes(playerA);
      const aTeamNum = aInR1 ? 1 : 2;
      if(m.winner === aTeamNum) w++;
      else if(m.winner && m.winner !== aTeamNum) l++;
      else d++;
      return { m, aInR1 };
    });
    rows.sort((a,b) => (b.m.date||'').localeCompare(a.m.date||''));

    const total = w+d+l;
    const pct = total>0 ? Math.round(((w*2+d)/(total*2))*100) : 0;

    let html = `
      <div class="ph2h-summary">
        <div class="ph2h-names">${escapeHtml(playerA)}<span class="vs">protiv</span>${escapeHtml(playerB)}</div>
        <div><span class="ph2h-score">${w}-${d}-${l}</span><span class="ph2h-pct">${pct}%</span></div>
      </div>
      <div class="achv-table-scroll">
      <table class="achv-table">
        <thead><tr><th>Datum</th><th><span class="lbl-full">Disciplina</span><span class="lbl-short">Dis.</span></th><th><span class="lbl-full">Kategorija</span><span class="lbl-short">Kat.</span></th><th>Utakmica</th><th class="num">Rezultat</th></tr></thead>
        <tbody>
    `;
    rows.forEach(r => {
      const m = r.m;
      const teamA = r.aInR1 ? m.team1 : m.team2;
      const teamB = r.aInR1 ? m.team2 : m.team1;
      const winningTeamName = m.winner === 1 ? m.team1 : (m.winner === 2 ? m.team2 : null);
      const teamAHtml = (winningTeamName && teamA === winningTeamName) ? `<strong>${escapeHtml(teamA)}</strong>` : escapeHtml(teamA);
      const teamBHtml = (winningTeamName && teamB === winningTeamName) ? `<strong>${escapeHtml(teamB)}</strong>` : escapeHtml(teamB);
      let score;
      if(m.score1 != null && m.score2 != null){
        score = r.aInR1 ? `${m.score1.toFixed(0)}:${m.score2.toFixed(0)}` : `${m.score2.toFixed(0)}:${m.score1.toFixed(0)}`;
      } else if(m.winner === (r.aInR1 ? 1 : 2)){
        score = 'W:L';
      } else if(m.winner){
        score = 'L:W';
      } else {
        score = '–';
      }
      html += `<tr class="clickable-cell" data-match-id="${m.id}"><td>${formatDate(m.date)}</td><td><span class="lbl-full">${escapeHtml(m.disLabel)}</span><span class="lbl-short">${escapeHtml(m.dis)}</span></td><td><span class="lbl-full">${escapeHtml(m.katLabel)}</span><span class="lbl-short">${escapeHtml(m.kat)}</span></td><td>${teamAHtml} - ${teamBHtml}</td><td class="num">${score}</td></tr>`;
    });
    html += '</tbody></table></div>';
    resultEl.innerHTML = html;

    resultEl.querySelectorAll('[data-match-id]').forEach(row => {
      row.addEventListener('click', () => openMatchModal(row.dataset.matchId));
    });
  }
}

// ===================== Prozor s detaljima utakmice =====================
// (isti dizajn/logika kao na pregledu prvenstava — kopirano da bude dostupno i ovdje)

async function fileExists(url){
  try {
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok;
  } catch(e){
    return false;
  }
}

// Provjerava do maxCount numeriranih datoteka ISTOVREMENO (ne jednu za drugom), pa vrati
// samo one od 1. redom dok ne naiđe na prvu koja ne postoji (npr. 1.jpg, 2.jpg, ... do rupe)
async function findSequentialFiles(pathFn, maxCount){
  const checks = await Promise.all(
    Array.from({length: maxCount}, (_, idx) => fileExists(pathFn(idx + 1)))
  );
  const files = [];
  for(let i = 0; i < maxCount; i++){
    if(!checks[i]) break;
    files.push(pathFn(i + 1));
  }
  return files;
}

// Učitava tekstualnu datoteku s natpisima (npr. "foto.txt"), formata:
//   3: Brončana medalja: Vis
// Vraća objekt {3: "Brončana medalja: Vis", ...} ili prazan objekt ako datoteka ne postoji.
async function loadCaptions(url){
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) return {};
    const text = await res.text();
    const map = {};
    text.split('\n').forEach(line => {
      const m = line.match(/^\s*(\d+)\s*:\s*(.+?)\s*$/);
      if(m) map[Number(m[1])] = m[2];
    });
    return map;
  } catch(e){
    return {};
  }
}

const DATA_BASE = 'podaci';

function rawFaza(phase){
  const prefix = { group: 'K', playoff: 'D', placement: 'P' }[phase.type] || '?';
  return `${prefix}${phase.num}`;
}

function zapisnikPath(m){
  const seasonTag = `${m.season - 1}-${m.season}`;
  const group = m.group || 'A';
  const filename = `PHC-${seasonTag}-${m.dis}-${m.kat}-${group}-${rawFaza(m.phase)}-${m.matchNum}.pdf`;
  return `${DATA_BASE}/${seasonTag}/${m.dis}-${m.kat}/${filename}`;
}

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Renderira prvu stranicu PDF zapisnika kao statičnu sliku (canvas) unutar wrapEl,
// bez ikakvih PDF kontrola (zum, navigacija stranica i sl.) — širina prati širinu wrapEl-a.
async function renderZapisnikCanvas(pdfUrl, wrapEl){
  try {
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const cssWidth = wrapEl.clientWidth;
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = cssWidth / baseViewport.width;
    const outputScale = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * outputScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    wrapEl.innerHTML = '';
    wrapEl.appendChild(canvas);
  } catch(e){
    wrapEl.innerHTML = '<div class="zapisnik-loading">Zapisnik se trenutno ne može prikazati.</div>';
    console.error('Greška pri renderiranju zapisnika:', e);
  }
}

// Prvenstvo ima "prave" skupine samo ako postoji barem jedna utakmica s oznakom
// različitom od "A" (ili prazno) — samo "A"/prazno posvuda znači da skupina zapravo nema
function tournamentHasExplicitGroups(m){
  return DATA.matches.some(x =>
    x.season === m.season && x.dis === m.dis && x.kat === m.kat && x.p === m.p &&
    x.phase.type === 'group' && x.group !== null && x.group !== 'A'
  );
}

async function openMatchModal(id){
  const m = DATA.matches.find(x => x.id === id);
  if(!m) return;
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  body.classList.remove('modal-wide');

  const utakmicaLine = (m.group && tournamentHasExplicitGroups(m)) ? `Skupina ${m.group}, ${m.phase.label}` : m.phase.label;
  const timeShort = m.time ? m.time.slice(0,5) : '';
  const mjestoParts = [m.city, m.venue, m.rink ? `staza ${m.rink}` : null].filter(Boolean);

  const infoHtml = `
    <div class="info-block">
      <div>Sezona: <span>${seasonLabel(m.season)}</span></div>
      <div>Disciplina: <span>${m.disLabel} (${m.katLabel})</span></div>
      <div>Utakmica: <span>${utakmicaLine}</span></div>
      <div>Vrijeme: <span>${m.date ? formatDate(m.date) : '—'} ${timeShort}h</span></div>
      <div>Mjesto: <span>${escapeHtml(mjestoParts.join(', ') || '—')}</span></div>
    </div>
  `;

  const endsArr = m.ends || [];
  const scheduledEnds = m.scheduledEnds || 8;
  const extraEndAllowed = m.extraEndAllowed !== false;
  // koliko "redovnih" stupaca prikazati - najmanje koliko je planirano (En), ali nikad manje
  // od stvarno zabilježenih redovnih endova (rijetki povijesni slučajevi gdje ih ima i više)
  const regularCount = Math.max(scheduledEnds, endsArr.length - (extraEndAllowed ? 1 : 0));
  const TOTAL_SLOTS = regularCount + (extraEndAllowed ? 1 : 0);
  const cells1 = new Array(TOTAL_SLOTS).fill('');
  const cells2 = new Array(TOTAL_SLOTS).fill('');
  let hammerTeam = m.pk || null;
  const playedCount = Math.min(endsArr.length, TOTAL_SLOTS);
  for (let i = 0; i < playedCount; i++){
    const e = endsArr[i];
    if(e > 0){ cells1[i] = String(e); hammerTeam = 2; }
    else if(e < 0){ cells2[i] = String(Math.abs(e)); hammerTeam = 1; }
    else if(hammerTeam === 1){ cells2[i] = '0'; }
    else if(hammerTeam === 2){ cells1[i] = '0'; }
  }
  const firstUnplayedIdx = playedCount < TOTAL_SLOTS ? playedCount : null;

  function slotCell(i, cellsArr, pwEnd, pwClass){
    if(i === firstUnplayedIdx) return `<td class="na">X</td>`;
    const isPw = pwEnd != null && (i+1) === pwEnd;
    return `<td${isPw ? ` class="${pwClass}" title="Power play"` : ''}>${cellsArr[i]}</td>`;
  }

  const headerEndCells = Array.from({length:regularCount}, (_,i) => `<th>${i+1}</th>`).join('');
  const team1EndCells = Array.from({length:regularCount}, (_,i) => slotCell(i, cells1, m.powerPlay1, 'pw-cell-1')).join('');
  const team2EndCells = Array.from({length:regularCount}, (_,i) => slotCell(i, cells2, m.powerPlay2, 'pw-cell-2')).join('');
  const deCell1 = extraEndAllowed ? slotCell(regularCount, cells1, m.powerPlay1, 'pw-cell-1') : '';
  const deCell2 = extraEndAllowed ? slotCell(regularCount, cells2, m.powerPlay2, 'pw-cell-2') : '';
  const deHeaderCell = extraEndAllowed ? '<th>DE</th>' : '';

  const hammer = (teamNum) => m.pk === teamNum ? `<span class="pk-hammer">🔨</span>` : '';

  const endSlotCount = regularCount + (extraEndAllowed ? 1 : 0);
  const endColWidthPct = (58 / endSlotCount).toFixed(2);
  let scoreboardHtml;
  if(endsArr.length){
    const noFinalScore = m.score1 === null || m.score2 === null;
    const isForfeit = noFinalScore && (m.winner === 1 || m.winner === 2);
    const rezCell1 = m.score1 !== null ? m.score1.toFixed(0) : (isForfeit ? (m.winner === 1 ? 'W' : 'L') : '–');
    const rezCell2 = m.score2 !== null ? m.score2.toFixed(0) : (isForfeit ? (m.winner === 2 ? 'W' : 'L') : '–');
    const forfeitNote = isForfeit ? `<div class="note" style="font-size:11.5px; color:var(--text-muted); margin-top:6px;">Utakmica prekinuta nakon ${endsArr.length}. enda i odlučena predajom (istek vremena) — konačan rezultat po kamenovima se ne evidentira.</div>` : '';
    scoreboardHtml = `
    <table class="scoreboard-table">
      <colgroup>
        <col style="width:26%">
        <col style="width:6%">
        ${`<col style="width:${endColWidthPct}%">`.repeat(regularCount)}
        ${extraEndAllowed ? `<col style="width:${endColWidthPct}%">` : ''}
        <col style="width:10%">
      </colgroup>
      <thead><tr><th>Ekipa</th><th>PK</th>${headerEndCells}${deHeaderCell}<th>Rez.</th></tr></thead>
      <tbody>
        <tr class="team1-row"><td>${escapeHtml(m.team1)}</td><td>${hammer(1)}</td>${team1EndCells}${deCell1}<td>${rezCell1}</td></tr>
        <tr class="team2-row"><td>${escapeHtml(m.team2)}</td><td>${hammer(2)}</td>${team2EndCells}${deCell2}<td>${rezCell2}</td></tr>
      </tbody>
    </table>
    ${forfeitNote}
  `;
  } else if(m.played && (m.winner === 1 || m.winner === 2)){
    // odigrana utakmica prekinuta prije kraja (npr. istek vremena) — rezultat po endovima/kamenovima
    // se ne evidentira, prikazuje se samo konačna odluka W/L
    const s1 = m.winner === 1 ? 'W' : 'L';
    const s2 = m.winner === 2 ? 'W' : 'L';
    const endsNote = m.numEnds ? ` nakon ${m.numEnds}. enda` : '';
    scoreboardHtml = `
    <table class="scoreboard-table">
      <thead><tr><th>Ekipa</th><th>Rez.</th></tr></thead>
      <tbody>
        <tr class="team1-row"><td>${escapeHtml(m.team1)}</td><td>${s1}</td></tr>
        <tr class="team2-row"><td>${escapeHtml(m.team2)}</td><td>${s2}</td></tr>
      </tbody>
    </table>
    <div class="note" style="font-size:11.5px; color:var(--text-muted); margin-top:6px;">Utakmica prekinuta${endsNote} i odlučena predajom (istek vremena) — rezultat po endovima i kamenovima se ne evidentira.</div>
  `;
  } else {
    scoreboardHtml = `<div class="empty-state">Nema podataka o rezultatu po endovima.</div>`;
  }

  const CANONICAL_POSITIONS = [
    { position: 'Četvrti', label: '4' },
    { position: 'Treći', label: '3' },
    { position: 'Drugi', label: '2' },
    { position: 'Prvi', label: '1' },
    { position: 'Rezerva', label: 'R' },
  ];
  const MC_POSITIONS = [
    { position: 'Četvrti', label: '4' },
    { position: 'Treći', label: '3' },
    { position: 'Drugi', label: '2' },
    { position: 'Prvi', label: '1' },
  ];
  const MP_POSITIONS = [
    { position: 'Prvi', label: 'Ž' },
    { position: 'Drugi', label: 'M' },
  ];

  function fmtCm(n){
    return n.toFixed(1).replace('.', ',') + ' cm';
  }

  function rosterTableHtml(teamName, roster, dis){
    const total = roster.reduce((s,p) => s + (p.lsd ? p.lsd.distance : 0), 0);
    const totalDisplay = roster.some(p => p.lsd) ? fmtCm(total) : '';
    const positions = dis === 'MP' ? MP_POSITIONS : (dis === 'MC' ? MC_POSITIONS : CANONICAL_POSITIONS);
    const rows = positions.map(slot => {
      const p = roster.find(x => x.position === slot.position);
      if(!p){
        return `<tr><td><span class="order-circle">${slot.label}</span></td><td class="rot"></td><td>-</td><td class="rot"></td><td class="num"></td></tr>`;
      }
      const roleShort = p.role === 'Skip' ? 'S' : (p.role === 'Vice-skip' ? 'V' : '');
      const rotIcon = p.lsd ? (p.lsd.rotation === 'D' ? '↻' : '↺') : '';
      const dist = p.lsd ? fmtCm(p.lsd.distance) : '';
      return `<tr><td><span class="order-circle">${slot.label}</span></td><td class="rot">${roleShort ? `<span class="role-tag">${roleShort}</span>` : ''}</td><td class="clickable-cell" data-player-name="${escapeHtml(p.name)}">${escapeHtml(p.name)}</td><td class="rot">${rotIcon}</td><td class="num">${dist}</td></tr>`;
    }).join('');
    return `<table class="roster-table"><thead><tr><th colspan="4"><div class="roster-th-inner">${clubLogoImgHtml(teamName, dis)}<span class="roster-team-name">${escapeHtml(teamName)}</span></div></th><th class="num">${totalDisplay}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  const rosterHtml = `<div class="roster-cols">${rosterTableHtml(m.team1, m.roster1, m.dis)}${rosterTableHtml(m.team2, m.roster2, m.dis)}</div>`;

  const zapisnikHref = zapisnikPath(m);
  const zapisnikOk = await fileExists(zapisnikHref);
  const pdfBlockHtml = zapisnikOk ? `
    <div class="pdf-preview-block">
      <div class="pdf-preview-label">📄 Skenirani zapisnik s utakmice</div>
      <div class="zapisnik-static-wrap" id="zapisnikWrap"><div class="zapisnik-loading">Učitavanje zapisnika…</div></div>
      <a class="doc-link pdf-fallback-link" href="${zapisnikHref}" target="_blank" rel="noopener">Otvori u novom prozoru</a>
    </div>
  ` : '';

  body.innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    ${infoHtml}
    ${scoreboardHtml}
    ${rosterHtml}
    ${pdfBlockHtml}
  `;
  overlay.classList.add('open');

  body.querySelectorAll('[data-player-name]').forEach(el => {
    el.addEventListener('click', () => {
      _modalStack.push(() => openMatchModal(id));
      // puni raspon (sve sezone/discipline/kategorije) — utakmica nema svoj vlastiti filter
      // pa igračev prozor prikazuje cjelokupnu karijeru, neovisno o filteru stranice s koje se došlo
      openPlayerModal(el.dataset.playerName, 'sve', 'sve', MIN_SEASON, MAX_SEASON);
    });
  });

  if(zapisnikOk){
    const wrapEl = document.getElementById('zapisnikWrap');
    if(wrapEl) renderZapisnikCanvas(zapisnikHref, wrapEl);
  }
}

// Jednostavan "stack" za ugniježđene modale: kad se iz jednog modala otvori drugi (npr. sastav
// ekipe iz popisa postignuća), prethodni prikaz se sprema ovdje. closeModal() prvo pokuša vratiti
// na prethodni prikaz umjesto potpunog zatvaranja — potpuno se zatvara tek kad je stog prazan.
let _modalStack = [];

function closeModal(){
  if(_modalStack.length > 0){
    const restorePrevious = _modalStack.pop();
    restorePrevious();
    return;
  }
  document.getElementById('modalOverlay').classList.remove('open');
  _lightboxPhotos = [];
  _lightboxCaptions = {};
  _lightboxVideos = [];
  _lightboxVideoCaptions = {};
  const vid = document.querySelector('#modalBody video');
  if(vid) vid.pause();
}
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if(e.target.id === 'modalOverlay') closeModal();
});

// Tooltip bedža: na desktopu se prikazuje na hover (CSS :hover), a na dodir/klik (mobitel bez miša)
// prebacuje se klasa .tip-active koja isto pokazuje tooltip. Jedan delegirani listener na cijelom
// dokumentu — radi i za bedževe koji se tek naknadno pojave (npr. otvaranjem prozora igrača).
document.addEventListener('click', (e) => {
  const badge = e.target.closest('.badge-icon[data-tip]');
  document.querySelectorAll('.badge-icon.tip-active').forEach(el => {
    if(el !== badge) el.classList.remove('tip-active');
  });
  if(badge) badge.classList.toggle('tip-active');
});

// ===================== Detalji kluba / ekipe / igrača =====================

function getEntityTournamentHistory(name, groupByClub, kat, dis, seasonFrom, seasonTo){
  const rows = [];
  DATA.tournaments.forEach(t => {
    if(kat && kat !== 'sve' && t.kat !== kat) return;
    if(dis && dis !== 'sve' && t.dis !== dis) return;
    if(seasonFrom != null && (t.season < seasonFrom || t.season > seasonTo)) return;
    const clubMap = groupByClub ? ((DATA.clubs && DATA.clubs[t.dis]) || {}) : {};
    t.standings.forEach(s => {
      const entity = groupByClub ? (clubMap[s.team] || s.team) : s.team;
      if(entity === name){
        rows.push({ season: t.season, dis: t.dis, kat: t.kat, place: s.place, teamsCount: t.teamsCount, teamName: s.team, p: t.p });
      }
    });
  });
  rows.sort((a,b) => b.season - a.season || (a.dis).localeCompare(b.dis));
  return rows;
}

function getPlayerTournamentHistory(name, kat, dis, seasonFrom, seasonTo){
  const rows = [];
  DATA.tournaments.forEach(t => {
    if(kat && kat !== 'sve' && t.kat !== kat) return;
    if(dis && dis !== 'sve' && t.dis !== dis) return;
    if(seasonFrom != null && (t.season < seasonFrom || t.season > seasonTo)) return;
    t.standings.forEach(s => {
      const players = t.rosterPool[s.team] || [];
      if(players.includes(name)){
        rows.push({ season: t.season, dis: t.dis, kat: t.kat, place: s.place, team: s.team, p: t.p, teamsCount: t.teamsCount });
      }
    });
  });
  rows.sort((a,b) => b.season - a.season || (a.dis).localeCompare(b.dis));
  return rows;
}

const MEDAL_ICONS = {1:'🥇',2:'🥈',3:'🥉'};

function achvTableHtml(history, teamColLabel, clickableRoster){
  if(history.length === 0) return '<div class="empty-mini">Nema podataka o nastupima.</div>';
  let h = `<div class="achv-table-scroll"><table class="achv-table"><thead><tr><th>Sezona</th><th><span class="lbl-full">Disciplina</span><span class="lbl-short">Dis.</span></th><th><span class="lbl-full">Kategorija</span><span class="lbl-short">Kat.</span></th>${teamColLabel ? `<th>${teamColLabel}</th>` : ''}<th class="num">Mjesto</th></tr></thead><tbody>`;
  history.forEach(r => {
    const medal = MEDAL_ICONS[r.place] || '';
    const placeCell = r.place != null
      ? `<span class="place-cell"><span class="place-num">${r.place}.</span><span class="place-medal">${medal}</span></span>`
      : '–';
    const teamName = r.team || r.teamName;
    const rowAttrs = clickableRoster
      ? ` class="clickable-cell" data-roster-season="${r.season}" data-roster-dis="${escapeHtml(r.dis)}" data-roster-kat="${escapeHtml(r.kat)}" data-roster-p="${r.p}" data-roster-team="${escapeHtml(teamName)}"`
      : '';
    h += `<tr${rowAttrs}><td>${seasonLabel(r.season)}</td><td><span class="lbl-full">${DIS_LABELS[r.dis]||r.dis}</span><span class="lbl-short">${r.dis}</span></td><td><span class="lbl-full">${KAT_LABELS[r.kat]||r.kat}</span><span class="lbl-short">${r.kat}</span></td>${teamColLabel ? `<td><span class="lbl-full">${escapeHtml(teamName)}</span><span class="lbl-short">${escapeHtml(teamShortName(teamName, r.dis))}</span></td>` : ''}<td class="num">${placeCell}</td></tr>`;
  });
  h += '</tbody></table></div>';
  return h;
}

// "Klizni" NHC kroz sezone - za svaku sezonu u prikazanom rasponu izračuna se NHC kao da je
// TA sezona bila "zadnja" (isto pravilo kao za glavni NHC broj: zadnjih 5 sezona, težine
// 100/80/60/40/20%). Koristi CIJELU povijest (bez ograničenja donje granice sezone) jer svaka
// točka treba moći "gledati" do 4 sezone unazad od sebe, čak i ako je ta prošlost izvan
// trenutno prikazanog raspona.
function nhcHistoryFromRows(fullHistory, axisFrom, axisTo){
  const points = [];
  for(let y = axisFrom; y <= axisTo; y++){
    let sum = 0;
    fullHistory.forEach(r => {
      sum += nhcPoints(r.place, r.teamsCount) * nhcSeasonWeight(r.season, y);
    });
    points.push({ season: y, value: Math.round(sum * 10) / 10 });
  }
  return points;
}

function computeNhcHistory(name, groupByClub, kat, dis, axisFrom, axisTo){
  const fullHistory = getEntityTournamentHistory(name, groupByClub, kat, dis, null, null);
  return nhcHistoryFromRows(fullHistory, axisFrom, axisTo);
}

function computePlayerNhcHistory(name, kat, dis, axisFrom, axisTo){
  const fullHistory = getPlayerTournamentHistory(name, kat, dis, null, null);
  return nhcHistoryFromRows(fullHistory, axisFrom, axisTo);
}

function nhcHistoryChartSvg(points){
  const W = 700, H = 165, padL = 34, padR = 8, padT = 30, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(1, ...points.map(p => p.value));
  const maxIdx = points.reduce((best, p, i) => p.value > points[best].value ? i : best, 0);
  const n = points.length;
  const slotW = innerW / n;
  const barGap = 3;
  const barW = n > 0 ? Math.max(2, slotW - barGap) : innerW;

  // Dinamički preskoči neke godine na X osi ako je premalo prostora za četveroznamenkasti broj
  // (npr. "2020") bez preklapanja - što je uži prostor po sezoni, to se rjeđe ispisuje godina.
  const minLabelSpace = 32;
  const labelSkip = Math.max(1, Math.ceil(minLabelSpace / slotW));

  let bars = '';
  let labels = '';
  let maxAnnotation = '';
  points.forEach((p, i) => {
    const x = padL + i * slotW;
    const h = (p.value / maxVal) * innerH;
    const y = padT + innerH - h;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="var(--navy-2)"><title>${seasonLabel(p.season)}: ${Math.round(p.value)}</title></rect>`;
    if(i === maxIdx && p.value > 0){
      maxAnnotation = `<text x="${(x + barW/2).toFixed(1)}" y="${(y - 7).toFixed(1)}" font-size="14" font-weight="700" fill="var(--navy)" text-anchor="middle" font-family="'Space Grotesk', sans-serif">${Math.round(p.value)}</text>`;
    }
    if(i % labelSkip === 0){
      labels += `<text x="${(x + barW/2).toFixed(1)}" y="${H - 6}" font-size="9.5" fill="var(--text-muted)" text-anchor="middle" font-family="'IBM Plex Mono', monospace">${p.season}</text>`;
    }
  });

  const gridY = padT + innerH;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="overflow:visible;">
    <line x1="${padL}" y1="${gridY}" x2="${W-padR}" y2="${gridY}" stroke="var(--sheet-line)" stroke-width="1"/>
    ${bars}
    ${maxAnnotation}
    ${labels}
  </svg>`;
}

function medalSummaryText(history){
  const golds = history.filter(r => r.place===1).length;
  const silvers = history.filter(r => r.place===2).length;
  const bronzes = history.filter(r => r.place===3).length;
  const total = golds + silvers + bronzes;
  if(total === 0) return `${total}`;
  const parts = [];
  if(golds) parts.push(`🥇${golds}`);
  if(silvers) parts.push(`🥈${silvers}`);
  if(bronzes) parts.push(`🥉${bronzes}`);
  return `${total} (${parts.join(' ')})`;
}

function openEntityModal(name, groupByClub, kat, dis, seasonFrom, seasonTo){
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  body.classList.remove('modal-wide');

  const history = getEntityTournamentHistory(name, groupByClub, kat, dis, seasonFrom, seasonTo);
  const prvenstava = new Set(history.map(r => `${r.season}-${r.dis}-${r.kat}-${r.p}`)).size;

  // Detaljna statistika - isti izračun (i isti brojevi) kao glavna tablica Klubovi/Ekipe,
  // za ovaj konkretan entitet, u okviru trenutno primijenjenog filtera.
  const allStats = computeTeamClubStats(kat, dis, groupByClub, seasonFrom, seasonTo);
  const es = allStats[name];

  let statsRowsHtml = '';
  let chartHtml = '';

  if(es){
    // Prvenstava po disciplini - uvijek prikazano, neovisno o filteru discipline
    const disCounts = {};
    [...es.tournamentsSet].forEach(key => {
      const d = key.split('-')[1];
      disCounts[d] = (disCounts[d] || 0) + 1;
    });
    const prvenstavaDetail = DIS_ORDER.filter(d => disCounts[d]).map(d => `${d}-${disCounts[d]}`).join(', ');

    const total = es.w + es.d + es.l;
    const uspjeh = total > 0 ? Math.round(((es.w*2 + es.d) / (total*2)) * 100) : null;

    const played = es.played || 0;
    const endsForAvg = played ? (es.endsFor/played) : null;
    const endsAgainstAvg = played ? (es.endsAgainst/played) : null;
    const stolenByAvg = played ? (es.stolenBy/played) : null;
    const stolenFromAvg = played ? (es.stolenFrom/played) : null;
    const stonesForAvg = played ? (es.stonesFor/played) : null;
    const stonesAgainstAvg = played ? (es.stonesAgainst/played) : null;
    const lsdAvgVal = avg(es.lsdThrows.reduce((s,v)=>s+v,0), es.lsdThrows.length);

    // "Prazni" (blank) endovi - nitko nije osvojio bod tog enda - razlika između ukupnog broja
    // endova i zbroja endova za/protiv. (Precizna polaganja se NE tretiraju na isti način -
    // ako PK nije poznat u bazi, ta se utakmica jednostavno ne broji ni u pobjede ni u poraze.)
    const blankEnds = es.endova - es.endsFor - es.endsAgainst;

    function statRow(label, main, detail){
      return `<div class="entity-stat-row"><div class="entity-stat-row-label">${label}</div><div class="entity-stat-row-value">${main}</div><div class="entity-stat-row-detail">${detail || ''}</div></div>`;
    }

    statsRowsHtml = `
      <div class="entity-stat-rows">
        ${statRow('Medalja', es.medals[1]+es.medals[2]+es.medals[3], `🥇${es.medals[1]} 🥈${es.medals[2]} 🥉${es.medals[3]}`)}
        ${statRow('Prvenstava', prvenstava, prvenstavaDetail)}
        ${statRow('Utakmica', es.utakmica, `${es.w}-${es.d}-${es.l}${uspjeh != null ? ` (${uspjeh}%)` : ''}`)}
        ${statRow('Endova', es.endova, `${es.endsFor}-${blankEnds}-${es.endsAgainst}${endsForAvg!=null ? ` (${fmtAvg(endsForAvg)}-${fmtAvg(endsAgainstAvg)})` : ''}`)}
        ${statRow('<span class="lbl-full">Ukradenih endova</span><span class="lbl-short">Ukradenih</span>', es.stolenBy + es.stolenFrom, `${es.stolenBy}-${es.stolenFrom}${stolenByAvg!=null ? ` (${fmtAvg(stolenByAvg)}-${fmtAvg(stolenFromAvg)})` : ''}`)}
        ${statRow('Kamenova', Math.round(es.stonesFor + es.stonesAgainst), `${Math.round(es.stonesFor)}-${Math.round(es.stonesAgainst)}${stonesForAvg!=null ? ` (${fmtAvg(stonesForAvg)}-${fmtAvg(stonesAgainstAvg)})` : ''}`)}
        ${statRow('<span class="lbl-full">Preciznih polaganja</span><span class="lbl-short">PP</span>', es.lsdMatches, `${es.pkWon}-${es.pkLost}${lsdAvgVal!=null ? ` (${fmtAvg(lsdAvgVal)} cm)` : ''}`)}
      </div>
    `;

    const chartPoints = computeNhcHistory(name, groupByClub, kat, dis, seasonFrom, seasonTo);
    const hasAnyValue = chartPoints.some(p => p.value > 0);
    chartHtml = `
      <div class="nhc-chart-block">
        <div class="nhc-chart-title">NHC bodovi kroz sezone</div>
        ${hasAnyValue ? nhcHistoryChartSvg(chartPoints) : '<div class="nhc-chart-empty">Nema NHC bodova u odabranom razdoblju.</div>'}
      </div>
    `;
  }

  const belowContent = `${chartHtml}${statsRowsHtml}`;
  // Mjesto/e-adresa kluba - prikazuje se čim ti podaci budu dostupni u bazi (DBEkipe).
  const sideContent = clubMetaHtml(name, dis);

  const headerHtml = entityHeaderHtml(name, dis, sideContent, belowContent);

  body.innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    ${headerHtml}
    <h3 class="group-h" style="margin-top:0;">Plasmani kroz sezone</h3>
    ${achvTableHtml(history, 'Ekipa', true)}
  `;
  overlay.classList.add('open');

  body.querySelectorAll('[data-roster-team]').forEach(el => {
    el.addEventListener('click', () => {
      const s = Number(el.dataset.rosterSeason);
      const d = el.dataset.rosterDis;
      const k = el.dataset.rosterKat;
      const p = Number(el.dataset.rosterP);
      const tourn = DATA.tournaments.find(t => t.season === s && t.dis === d && t.kat === k && t.p === p);
      if(!tourn) return;
      _modalStack.push(() => openEntityModal(name, groupByClub, kat, dis, seasonFrom, seasonTo));
      openTeamRosterModal(el.dataset.rosterTeam, tourn, s, d, k);
    });
  });
}

const BADGE_TIER_LABELS = {zlatni: 'Zlatna značka', srebrni: 'Srebrna značka', broncani: 'Brončana značka'};

function openPlayerModal(name, kat, dis, seasonFrom, seasonTo){
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  body.classList.remove('modal-wide');

  const history = getPlayerTournamentHistory(name, kat, dis, seasonFrom, seasonTo);
  const prvenstava = history.length;

  const earnedBadges = playerBadges(name);
  const badgesHtml = earnedBadges.length
    ? `<div class="player-badge-row">${earnedBadges.map(e => `<span class="badge-icon" data-tip="${escapeHtml(e.badge)} - ${BADGE_TIER_LABELS[e.tier]}">${BADGE_ICONS[e.badge][e.tier]}</span>`).join('')}</div>`
    : '';

  // Detaljna statistika - isti izračun (i isti brojevi) kao glavna tablica Igrači, u okviru
  // trenutno primijenjenog filtera. Isti prikaz kao kod kluba/ekipe, uz dodatni red "Pozicije".
  const allStats = computePlayerStats(kat, dis, seasonFrom, seasonTo);
  const ps = allStats[name];

  let statsRowsHtml = '';
  let chartHtml = '';

  if(ps){
    const disCounts = {};
    [...ps.tournamentsSet].forEach(key => {
      const d = key.split('-')[1];
      disCounts[d] = (disCounts[d] || 0) + 1;
    });
    const prvenstavaDetail = DIS_ORDER.filter(d => disCounts[d]).map(d => `${d}-${disCounts[d]}`).join(', ');

    const total = ps.w + ps.d + ps.l;
    const uspjeh = total > 0 ? Math.round(((ps.w*2 + ps.d) / (total*2)) * 100) : null;

    const played = ps.played || 0;
    const endsForAvg = played ? (ps.endsFor/played) : null;
    const endsAgainstAvg = played ? (ps.endsAgainst/played) : null;
    const stolenByAvg = played ? (ps.stolenBy/played) : null;
    const stolenFromAvg = played ? (ps.stolenFrom/played) : null;
    const stonesForAvg = played ? (ps.stonesFor/played) : null;
    const stonesAgainstAvg = played ? (ps.stonesAgainst/played) : null;
    const lsdAvgVal = avg(ps.lsdThrows.reduce((s,v)=>s+v,0), ps.lsdThrows.length);
    const blankEnds = ps.endova - ps.endsFor - ps.endsAgainst;

    // Pozicije/uloge: S=Skip, V=Vice-skip, P=Prvi, D=Drugi, T=Treći, Č=Četvrti, R=Rezerva
    const posLabels = [
      ['S', ps.skipCount], ['V', ps.viceCount],
      ['P', ps.posCount['Prvi']], ['D', ps.posCount['Drugi']], ['T', ps.posCount['Treći']],
      ['Č', ps.posCount['Četvrti']], ['R', ps.posCount['Rezerva']],
    ];
    const pozicijeDetail = posLabels.filter(([,v]) => v > 0).map(([k,v]) => `${k}-${v}`).join(', ');

    function statRow(label, main, detail){
      return `<div class="entity-stat-row"><div class="entity-stat-row-label">${label}</div><div class="entity-stat-row-value">${main}</div><div class="entity-stat-row-detail">${detail || ''}</div></div>`;
    }

    statsRowsHtml = `
      <div class="entity-stat-rows">
        ${statRow('Medalja', ps.medals[1]+ps.medals[2]+ps.medals[3], `🥇${ps.medals[1]} 🥈${ps.medals[2]} 🥉${ps.medals[3]}`)}
        ${statRow('Prvenstava', prvenstava, prvenstavaDetail)}
        ${statRow('Utakmica', ps.utakmica, `${ps.w}-${ps.d}-${ps.l}${uspjeh != null ? ` (${uspjeh}%)` : ''}`)}
        ${statRow('Endova', ps.endova, `${ps.endsFor}-${blankEnds}-${ps.endsAgainst}${endsForAvg!=null ? ` (${fmtAvg(endsForAvg)}-${fmtAvg(endsAgainstAvg)})` : ''}`)}
        ${statRow('<span class="lbl-full">Ukradenih endova</span><span class="lbl-short">Ukradenih</span>', ps.stolenBy + ps.stolenFrom, `${ps.stolenBy}-${ps.stolenFrom}${stolenByAvg!=null ? ` (${fmtAvg(stolenByAvg)}-${fmtAvg(stolenFromAvg)})` : ''}`)}
        ${statRow('Kamenova', Math.round(ps.stonesFor + ps.stonesAgainst), `${Math.round(ps.stonesFor)}-${Math.round(ps.stonesAgainst)}${stonesForAvg!=null ? ` (${fmtAvg(stonesForAvg)}-${fmtAvg(stonesAgainstAvg)})` : ''}`)}
        ${statRow('<span class="lbl-full">Preciznih polaganja</span><span class="lbl-short">PP</span>', ps.lsdMatches, `${ps.pkWon}-${ps.pkLost}${lsdAvgVal!=null ? ` (${fmtAvg(lsdAvgVal)} cm)` : ''}`)}
      </div>
    `;

    const chartPoints = computePlayerNhcHistory(name, kat, dis, seasonFrom, seasonTo);
    const hasAnyValue = chartPoints.some(p => p.value > 0);
    chartHtml = `
      <div class="nhc-chart-block">
        <div class="nhc-chart-title">NHC bodovi kroz sezone</div>
        ${hasAnyValue ? nhcHistoryChartSvg(chartPoints) : '<div class="nhc-chart-empty">Nema NHC bodova u odabranom razdoblju.</div>'}
      </div>
    `;
  }

  // Igrači nemaju logo kluba - entityHeaderHtml se elegantno svede na samo naslov+sadržaj
  const headerHtml = entityHeaderHtml(name, null, badgesHtml, `${chartHtml}${statsRowsHtml}`);

  body.innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    ${headerHtml}
    <h3 class="group-h" style="margin-top:0;">Plasmani kroz sezone</h3>
    ${achvTableHtml(history, 'Ekipa', true)}
  `;
  overlay.classList.add('open');

  body.querySelectorAll('[data-roster-team]').forEach(el => {
    el.addEventListener('click', () => {
      const s = Number(el.dataset.rosterSeason);
      const d = el.dataset.rosterDis;
      const k = el.dataset.rosterKat;
      const p = Number(el.dataset.rosterP);
      const tourn = DATA.tournaments.find(t => t.season === s && t.dis === d && t.kat === k && t.p === p);
      if(!tourn) return;
      _modalStack.push(() => openPlayerModal(name, kat, dis, seasonFrom, seasonTo));
      openTeamRosterModal(el.dataset.rosterTeam, tourn, s, d, k);
    });
  });
}

function openH2hMatchListModal(entityA, entityB, groupByClub, dis, kat){
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  body.classList.remove('modal-wide');

  const disList = dis === 'sve' ? DIS_ORDER : [dis];
  const clubMapAll = {};
  disList.forEach(d => Object.assign(clubMapAll, (DATA.clubs && DATA.clubs[d]) || {}));
  const entityName = (team) => groupByClub ? (clubMapAll[team] || team) : team;

  const matches = DATA.matches.filter(m => (kat==='sve'||m.kat===kat) && disList.includes(m.dis) && (m.winner===1||m.winner===2||m.played))
    .filter(m => {
      const e1 = entityName(m.team1), e2 = entityName(m.team2);
      return (e1===entityA && e2===entityB) || (e1===entityB && e2===entityA);
    })
    .sort((a,b) => (b.date||'').localeCompare(a.date||''));

  let rowsHtml = matches.map(m => {
    let score;
    if(m.score1 != null && m.score2 != null){
      score = `${m.score1.toFixed(0)}:${m.score2.toFixed(0)}`;
    } else if(m.winner === 1 || m.winner === 2){
      score = m.winner === 1 ? 'W:L' : 'L:W';
    } else {
      score = '–';
    }
    const team1Html = m.winner === 1 ? `<strong>${escapeHtml(m.team1)}</strong>` : escapeHtml(m.team1);
    const team2Html = m.winner === 2 ? `<strong>${escapeHtml(m.team2)}</strong>` : escapeHtml(m.team2);
    return `<tr class="clickable-cell" data-match-id="${m.id}"><td>${formatDate(m.date)}</td><td><span class="lbl-full">${DIS_LABELS[m.dis]||m.dis}</span><span class="lbl-short">${m.dis}</span></td><td><span class="lbl-full">${KAT_LABELS[m.kat]||m.kat}</span><span class="lbl-short">${m.kat}</span></td><td><span class="records-match-teams">${team1Html}<span class="vs-sep"> – </span>${team2Html}</span></td><td class="num">${score}</td></tr>`;
  }).join('');
  if(!rowsHtml) rowsHtml = '<tr><td colspan="5" class="empty-mini">Nema pronađenih utakmica.</td></tr>';

  let winsA = 0, draws = 0, winsB = 0;
  matches.forEach(m => {
    const e1 = entityName(m.team1);
    const aIsTeam1 = e1 === entityA;
    if(m.winner === 1){ if(aIsTeam1) winsA++; else winsB++; }
    else if(m.winner === 2){ if(aIsTeam1) winsB++; else winsA++; }
    else if(m.played){ draws++; }
  });
  const totalGames = winsA + draws + winsB;
  const pct = totalGames > 0 ? Math.round(((winsA*2 + draws) / (totalGames*2)) * 100) : 0;
  const recordText = totalGames > 0 ? ` <span class="h2h-modal-record">${winsA}-${draws}-${winsB} (${pct}%)</span>` : '';

  body.innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    <h2 class="entity-title">${escapeHtml(entityA)} — ${escapeHtml(entityB)}${recordText}</h2>
    <div class="achv-table-scroll">
    <table class="achv-table"><thead><tr><th>Datum</th><th><span class="lbl-full">Disciplina</span><span class="lbl-short">Dis.</span></th><th><span class="lbl-full">Kategorija</span><span class="lbl-short">Kat.</span></th><th>Utakmica</th><th class="num">Rezultat</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    </div>
  `;
  body.querySelectorAll('[data-match-id]').forEach(row => {
    row.addEventListener('click', () => {
      _modalStack.push(() => openH2hMatchListModal(entityA, entityB, groupByClub, dis, kat));
      openMatchModal(row.dataset.matchId);
    });
  });
  overlay.classList.add('open');
}

// ===================== Page switcher (Prvenstva / Statistika) =====================
function switchToPage(pageId){
  document.querySelectorAll('.page-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pageId));
  document.querySelectorAll('.phc-page-section').forEach(s => s.classList.toggle('active', s.id === 'phc-page-' + pageId));
}
// page-nav handled by Jekyll routing

// ===================== URL rutiranje (npr. #statistika/igraci) =====================
// Hash format: #prvenstva | #postignuca | #statistika | #statistika/<tab>
// updateHash() se zove SAMO iz klika (kad korisnik sam nešto promijeni) - koristi pushState
// da tipke natrag/naprijed rade. applyHashRoute() se zove kad se hash promijeni izvana
// (link, natrag/naprijed) i NIKAD sama ne zove updateHash() - hash je već točan jer na
// njega reagiramo, a pozivanje updateHash() usred obrade natrag/naprijed bi pokvarilo
// povijest (dodalo bi pogrešan međukorak u sredinu stoga povijesti).
function updateHash(){
  const pageId = document.querySelector('.phc-subnav-btn.active')?.dataset.page || 'prvenstva';
  let h;
  if(pageId === 'statistika'){
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
    h = (tab && tab !== 'poretci') ? `#statistika/${tab}` : '#statistika';
  } else {
    h = `#${pageId}`;
  }
  if(location.hash !== h){
    history.pushState(null, '', h);
  }
}

function applyHashRoute(){
  const hash = location.hash.replace(/^#/, '');
  if(!hash) return;
  const [pageId, tab] = hash.split('/');
  if(!document.getElementById('phc-page-' + pageId)) return;
  switchToPage(pageId);

  if(pageId === 'statistika'){
    if(tab && document.getElementById('panel-' + tab)){
      switchToTab(tab);
    } else {
      switchToTab('poretci');
    }
  }
}

window.addEventListener('hashchange', applyHashRoute);

// ===================== Prvenstva (pregled pojedinog prvenstva) =====================

function getUzrast(){
  const active = document.querySelector('#uzrastRow .radio-btn.active');
  return active ? active.dataset.kat : null;
}
function getDis(){
  const active = document.querySelector('#disRow .radio-btn.active');
  return active ? active.dataset.dis : null;
}

function initFilters(){
  const seasonSel = document.getElementById('seasonSel');
  seasonSel.addEventListener('change', render);

  updateKatOptions();
  updateDisOptions();
  updateSeasonOptions();
}

function updateKatOptions(){
  const kats = [...new Set(DATA.tournaments.map(t => t.kat))].sort((a,b) => KAT_ORDER.indexOf(a) - KAT_ORDER.indexOf(b));
  const row = document.getElementById('uzrastRow');
  const prev = getUzrast();
  const selected = kats.includes(prev) ? prev : (kats.includes('S') ? 'S' : kats[0]);
  row.innerHTML = kats.map(k => `<button class="radio-btn${k===selected?' active':''}" data-kat="${k}"><span class="lbl-full">${KAT_LABELS[k] || k}</span><span class="lbl-short">${k}</span></button>`).join('');
  row.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      row.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateDisOptions();
      updateSeasonOptions();
      render();
    });
  });
}

function updateDisOptions(){
  const kat = getUzrast();
  const available = new Set(DATA.tournaments.filter(t => t.kat === kat).map(t => t.dis));
  const disList = DIS_ORDER.filter(d => available.has(d));
  const row = document.getElementById('disRow');
  const prev = getDis();
  const selected = disList.includes(prev) ? prev : (disList.includes('M') ? 'M' : disList[0]);
  row.innerHTML = disList.map(d => `<button class="radio-btn${d===selected?' active':''}" data-dis="${d}"><span class="lbl-full">${DIS_LABELS[d] || d}</span><span class="lbl-short">${d}</span></button>`).join('');
  row.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      row.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateSeasonOptions();
      render();
    });
  });
}

function updateSeasonOptions(){
  const kat = getUzrast();
  const dis = getDis();
  const seasons = [...new Set(DATA.tournaments.filter(t => t.dis === dis && t.kat === kat).map(t => t.season))].sort((a,b) => b-a);
  const seasonSel = document.getElementById('seasonSel');
  const prev = Number(seasonSel.value);
  seasonSel.innerHTML = seasons.map(s => `<option value="${s}">${seasonLabel(s)}</option>`).join('');
  seasonSel.value = seasons.includes(prev) ? prev : seasons[0];
}

async function render(){
  const kat = getUzrast();
  const season = Number(document.getElementById('seasonSel').value);
  const dis = getDis();
  const tourn = DATA.tournaments.find(t => t.season === season && t.dis === dis && t.kat === kat);
  const content = document.getElementById('content');

  if(!tourn){
    content.innerHTML = '<div class="empty-state">Nema podataka o prvenstvu za odabranu sezonu i disciplinu.</div>';
    return;
  }

  const matches = DATA.matches.filter(m => m.season === season && m.dis === dis && m.p === tourn.p && m.kat === kat);
  const hasExplicitGroups = matches.some(m => m.phase.type === 'group' && m.group !== null && m.group !== 'A');
  const groupKey = m => hasExplicitGroups ? (m.group || '—') : '__single__';
  const groups = hasExplicitGroups ? [...new Set(matches.map(m => m.group).filter(g => g !== null))].sort() : ['__single__'];
  const legacyMode = season <= 2013; // do sezone 2012-2013: bodovi -> endovi -> kamenovi (umjesto RPP)
  // Sezona 2017-2018, Mješoviti parovi: poredak se formira zajedno za svih 9 ekipa, ne po skupinama
  const combinedTableOverride = (season === 2018 && dis === 'MP');

  let html = '';
  html += `<div class="tourn-title">Sezona ${seasonLabel(season)}, ${tourn.p}. PHC ${DIS_LABELS[dis] || dis} (${(KAT_LABELS[kat] || kat).toLowerCase()})</div>`;

  const locMatch = matches.find(m => m.city);
  const dates = matches.map(m => m.date).filter(Boolean).sort();
  let locDateParts = [];
  if(locMatch) locDateParts.push([locMatch.city, locMatch.venue].filter(Boolean).join(', '));
  if(dates.length) locDateParts.push(`od ${formatDate(dates[0])} do ${formatDate(dates[dates.length-1])}`);
  if(locDateParts.length) html += `<div class="tourn-meta">${locDateParts.join(', ')}</div>`;
  if(tourn.sustav) html += `<div class="tourn-meta">Sustav natjecanja: ${escapeHtml(tourn.sustav)}</div>`;

  html += `<div class="tourn-meta">${tourn.teamsCount || '?'} ekipa &middot; ${matches.length} utakmica</div>`;

  // final standings — shown first
  const MEDALS = {1:'🥇', 2:'🥈', 3:'🥉'};
  html += `<section class="block"><h2 class="section-h">Konačni poredak</h2>`;
  html += `<table class="standings"><thead><tr><th>Ekipa</th><th></th></tr></thead><tbody>`;
  tourn.standings.forEach(s => {
    const medal = MEDALS[s.place] || '';
    html += `<tr class="clickable-row" data-team="${escapeHtml(s.team)}"><td><span class="rank">${s.place}</span>${clubLogoImgHtml(s.team, tourn.dis)}<span class="team-name">${escapeHtml(s.team)}</span></td><td class="medal-cell">${medal}</td></tr>`;
  });
  html += `</tbody></table></section>`;

  html += `<h2 class="section-h">Rezultati</h2>`;

  // groups + rounds
  groups.forEach(g => {
    const groupMatches = hasExplicitGroups
      ? matches.filter(m => m.group === g && m.phase.type === 'group')
      : matches.filter(m => m.phase.type === 'group');
    if(groupMatches.length === 0) return;

    html += `<section class="block">`;
    if(hasExplicitGroups){
      html += `<h2 class="section-h">Skupina ${g}</h2>`;
    }

    const rounds = [...new Set(groupMatches.map(m => m.phase.num))].sort((a,b)=>a-b);
    rounds.forEach(rn => {
      const roundMatches = groupMatches.filter(m => m.phase.num === rn).sort((a,b)=>a.matchNum-b.matchNum);
      html += `<h4 class="round-h">${rn}. kolo</h4><div class="match-list">`;
      html += roundMatches.map(matchRowHtml).join('');
      html += `</div>`;
    });

    html += `<h3 class="group-h">Tablica</h3>`;
    html += combinedTableOverride
      ? '<div class="note" style="font-size:12.5px; color:var(--text-muted); margin:4px 0 0;">Vidi zajednički poredak svih ekipa ispod.</div>'
      : standingsTableHtml(computeGroupStandings(groupMatches, legacyMode), legacyMode, tourn.dis);
    html += `</section>`;
  });

  if(combinedTableOverride){
    const allGroupMatches = matches.filter(m => m.phase.type === 'group');
    html += `<section class="block"><h2 class="section-h">Zajednički poredak (svih ${new Set(allGroupMatches.flatMap(m => [m.team1, m.team2])).size} ekipa)</h2>`;
    html += standingsTableHtml(computeGroupStandings(allGroupMatches, legacyMode, true), legacyMode, tourn.dis);
    html += `</section>`;
  }

  // playoff
  const playoffMatches = matches.filter(m => m.phase.type === 'playoff');
  if(playoffMatches.length){
    html += `<section class="block"><h2 class="section-h">Doigravanje</h2>`;
    const rounds = [...new Set(playoffMatches.map(m => m.phase.num))].sort((a,b)=>a-b);
    rounds.forEach(rn => {
      const rm = playoffMatches.filter(m => m.phase.num === rn).sort((a,b)=>a.matchNum-b.matchNum);
      html += `<h4 class="round-h">${rm[0].phase.label}</h4><div class="match-list">`;
      html += rm.map(matchRowHtml).join('');
      html += `</div>`;
    });
    html += `</section>`;
  }

  // placement — least important first, final (P1) last
  const placementMatches = matches.filter(m => m.phase.type === 'placement').sort((a,b)=>b.phase.num-a.phase.num);
  if(placementMatches.length){
    html += `<section class="block"><h2 class="section-h">Plasman</h2>`;
    html += placementMatches.map(m => `<h4 class="round-h">${m.phase.label}</h4><div class="match-list">${matchRowHtml(m)}</div>`).join('');
    html += `</section>`;
  }

  // documents
  let html2 = '';
  const seasonTag = `${season-1}-${season}`;
  const tournFolder = `podaci/${seasonTag}/${dis}-${kat}`;
  const sustavHref = `${tournFolder}/PHC-${seasonTag}-${dis}-${kat}-Sustav.pdf`;
  const sustavOk = await fileExists(sustavHref);
  if(sustavOk){
    html2 += `<section class="block"><h2 class="section-h">Dokumenti</h2>`;
    html2 += `<div class="doc-row">
      <a class="doc-link" href="${sustavHref}" target="_blank" rel="noopener"><span class="ic">📄</span> Sustav i raspored prvenstva</a>
    </div>
    </section>`;
  }

  // photos — numerirane 1.jpg, 2.jpg... u istoj mapi; sve provjere idu istovremeno pa
  // uzimamo redom od 1. dok ne naiđemo na prvu rupu
  const photos = await findSequentialFiles(i => `${tournFolder}/${i}.jpg`, 20);
  let photoCaptions = {};
  if(photos.length){
    photoCaptions = await loadCaptions(`${tournFolder}/foto.txt`);
    html2 += `<section class="block"><h2 class="section-h">Fotografije</h2>`;
    html2 += `<div class="photo-grid">`;
    photos.forEach((p, i) => {
      html2 += `<div class="photo-thumb" data-photo-index="${i}"><img src="${p}" alt="Fotografija ${i+1}" loading="lazy"></div>`;
    });
    html2 += `</div></section>`;
  }

  // videi — numerirani 1.mp4, 2.mp4... isti princip kao fotografije
  const videos = await findSequentialFiles(i => `${tournFolder}/${i}.mp4`, 10);
  let videoCaptions = {};
  if(videos.length){
    videoCaptions = await loadCaptions(`${tournFolder}/video.txt`);
    html2 += `<section class="block"><h2 class="section-h">Videozapisi</h2>`;
    html2 += `<div class="photo-grid">`;
    videos.forEach((v, i) => {
      html2 += `<div class="video-thumb" data-video-index="${i}"><video src="${v}#t=0.5" preload="metadata" muted playsinline></video><span class="video-play-icon">▶</span></div>`;
    });
    html2 += `</div></section>`;
  }

  content.innerHTML = html + html2;

  // attach click handlers
  content.querySelectorAll('.match-row').forEach(row => {
    row.addEventListener('click', () => openMatchModal(row.dataset.id));
  });
  content.querySelectorAll('[data-team]').forEach(el => {
    el.addEventListener('click', () => openTeamRosterModal(el.dataset.team, tourn, season, dis, kat));
  });
  content.querySelectorAll('[data-photo-index]').forEach(el => {
    el.addEventListener('click', () => openPhotoLightbox(photos, Number(el.dataset.photoIndex), photoCaptions));
  });
  content.querySelectorAll('[data-video-index]').forEach(el => {
    const idx = Number(el.dataset.videoIndex);
    el.addEventListener('click', () => openVideoModal(videos, idx, videoCaptions));
  });
}

function matchRowHtml(m){
  let scoreHtml;
  if(m.played && m.score1 !== null){
    scoreHtml = `<div class="match-score">${m.score1.toFixed(0)} : ${m.score2.toFixed(0)}</div>`;
  } else if(m.winner === 1 || m.winner === 2){
    // poznat pobjednik bez rezultata po kamenovima — bilo neodigrana utakmica s predajom prije početka,
    // bilo prekinuta usred utakmice (npr. istek vremena) — u oba slučaja pobjednik dobiva 2 boda
    const s1 = m.winner === 1 ? 'W' : 'L';
    const s2 = m.winner === 2 ? 'W' : 'L';
    scoreHtml = `<div class="match-score">${s1} : ${s2}</div>`;
  } else {
    scoreHtml = `<div class="match-score notplayed">nije odigrano</div>`;
  }
  return `
    <div class="match-row" data-id="${m.id}">
      <div class="match-date">${formatDate(m.date)}</div>
      <div class="match-team ${m.winner===1?'winner':'loser'}"><span class="team-name-txt"><span class="lbl-full">${escapeHtml(m.team1)}</span><span class="lbl-short">${escapeHtml(m.team1Short || m.team1)}</span></span>${clubLogoImgHtml(m.team1, m.dis)}</div>
      ${scoreHtml}
      <div class="match-team right ${m.winner===2?'winner':'loser'}">${clubLogoImgHtml(m.team2, m.dis)}<span class="team-name-txt"><span class="lbl-full">${escapeHtml(m.team2)}</span><span class="lbl-short">${escapeHtml(m.team2Short || m.team2)}</span></span></div>
      <div class="chevron">›</div>
    </div>
  `;
}

function trimmedAverage(throws){
  if(!throws.length) return null;
  const sorted = [...throws].sort((a,b) => a - b); // ascending: best (shortest) first
  const removeCount = sorted.length <= 10 ? 1 : 2;
  const kept = removeCount < sorted.length ? sorted.slice(0, sorted.length - removeCount) : sorted;
  return kept.reduce((s,v) => s+v, 0) / kept.length;
}

function formatRpp(v){
  if(v == null) return '–';
  return v.toFixed(1).replace('.', ',');
}

function computeGroupStandings(matches, legacyMode, skipH2H){
  const table = {};
  function ensure(team){
    if(!table[team]) table[team] = {team, played:0, points:0, throws:[], endsWon:0, stonesWon:0};
    return table[team];
  }
  const winsAgainst = {}; // winsAgainst[pobjednik] = Set poraženih
  matches.forEach(m => {
    if(m.winner !== 1 && m.winner !== 2 && !m.played) return; // stvarno neodigrano — ne broji se
    const t1 = ensure(m.team1), t2 = ensure(m.team2);
    t1.played++; t2.played++;
    if(m.winner === 1){
      t1.points += 2;
      (winsAgainst[m.team1] = winsAgainst[m.team1] || new Set()).add(m.team2);
    } else if(m.winner === 2){
      t2.points += 2;
      (winsAgainst[m.team2] = winsAgainst[m.team2] || new Set()).add(m.team1);
    } else { t1.points += 1; t2.points += 1; } // neriješeno — po 1 bod objema ekipama
    if(m.throws1 && m.throws1.length) t1.throws.push(...m.throws1);
    if(m.throws2 && m.throws2.length) t2.throws.push(...m.throws2);
    if(m.score1 != null) t1.stonesWon += m.score1;
    if(m.score2 != null) t2.stonesWon += m.score2;
    (m.ends || []).forEach(e => {
      if(e > 0) t1.endsWon++;
      else if(e < 0) t2.endsWon++;
    });
  });

  const teams = Object.values(table);
  teams.forEach(t => { t.rpp = trimmedAverage(t.throws); });

  const byPoints = {};
  teams.forEach(t => { (byPoints[t.points] = byPoints[t.points] || []).push(t); });
  const pointTiers = Object.keys(byPoints).map(Number).sort((a, b) => b - a);

  const ranked = [];
  pointTiers.forEach(pts => {
    const tier = byPoints[pts];
    if(tier.length > 1){
      if(legacyMode){
        // stare sezone (do 2012-2013): bodovi -> endova -> kamenova, bez međusobnog susreta i bez RPP-a
        tier.sort((a, b) => {
          if(b.endsWon !== a.endsWon) return b.endsWon - a.endsWon;
          if(b.stonesWon !== a.stonesWon) return b.stonesWon - a.stonesWon;
          return a.team.localeCompare(b.team);
        });
      } else if(skipH2H){
        // kombinirani poredak preko vise skupina - medusobni susret nije pouzdan
        // jer vecina parova uopce nije igrala jedni protiv drugih. Bodovi -> RPP izravno.
        tier.sort((a, b) => {
          const da = a.rpp == null ? Infinity : a.rpp;
          const db = b.rpp == null ? Infinity : b.rpp;
          if(da !== db) return da - db;
          return a.team.localeCompare(b.team);
        });
      } else {
        // Poredaj: 1) bodovi, 2) unutar izjednačenih po bodovima - broj pobjeda MEĐU NJIMA, 3) RPP.
        // Kad je izjednačenih 3+ ekipa, međusobni susret rješava poredak samo ako nije ciklički
        // (npr. A>B>C>A) — u tom slučaju broj "pod-pobjeda" ostane izjednačen pa se ide na RPP.
        tier.forEach(t => {
          t._subWins = tier.reduce((acc, other) => {
            if(other === t) return acc;
            return acc + ((winsAgainst[t.team] && winsAgainst[t.team].has(other.team)) ? 1 : 0);
          }, 0);
        });
        tier.sort((a, b) => {
          if(b._subWins !== a._subWins) return b._subWins - a._subWins;
          const da = a.rpp == null ? Infinity : a.rpp;
          const db = b.rpp == null ? Infinity : b.rpp;
          if(da !== db) return da - db;
          return a.team.localeCompare(b.team);
        });
      }
    }
    ranked.push(...tier);
  });
  return ranked;
}

// Skraćeni nazivi ekipa (npr. "Čunjaš 2", "LegZg") - iz kolone Ekipa1/Ekipa2 u Excelu, ugrađeno
// u phc-data.json kao team1Short/team2Short. Koristi se samo na malim ekranima (lbl-short),
// u popisu utakmica i tablicama po fazi - NE u "Konačnom poretku" (tamo ostaje puni naziv).
let TEAM_SHORT_CACHE = null;
function teamShortName(team, dis){
  if(!TEAM_SHORT_CACHE){
    TEAM_SHORT_CACHE = {};
    DATA.matches.forEach(m => {
      if(m.team1Short) TEAM_SHORT_CACHE[m.dis + '|' + m.team1] = m.team1Short;
      if(m.team2Short) TEAM_SHORT_CACHE[m.dis + '|' + m.team2] = m.team2Short;
    });
  }
  return TEAM_SHORT_CACHE[dis + '|' + team] || team;
}

function standingsTableHtml(rows, legacyMode, dis){
  if(rows.length === 0) return '<div class="empty-state">Nema odigranih utakmica.</div>';
  const lastCol = legacyMode
    ? '<th class="num"><span class="lbl-full">Endova</span><span class="lbl-short">End.</span></th><th class="num"><span class="lbl-full">Kamenova</span><span class="lbl-short">Kam.</span></th>'
    : '<th class="num">RPP</th>';
  let h = `<table class="standings"><thead><tr><th>Ekipa</th><th class="num"><span class="lbl-full">Utakmica</span><span class="lbl-short">Ut.</span></th><th class="num"><span class="lbl-full">Bodova</span><span class="lbl-short">Bod.</span></th>${lastCol}</tr></thead><tbody>`;
  rows.forEach((r,i) => {
    const lastCell = legacyMode ? `<td class="num">${r.endsWon}</td><td class="num">${r.stonesWon}</td>` : `<td class="num">${formatRpp(r.rpp)}</td>`;
    const teamNameHtml = `<span class="lbl-full">${escapeHtml(r.team)}</span><span class="lbl-short">${escapeHtml(teamShortName(r.team, dis))}</span>`;
    h += `<tr><td><span class="rank">${i+1}</span>${clubLogoImgHtml(r.team, dis)}${teamNameHtml}</td><td class="num">${r.played}</td><td class="num">${r.points}</td>${lastCell}</tr>`;
  });
  h += `</tbody></table>`;
  return h;
}








function openTeamRosterModal(team, tourn, season, dis, kat){
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  body.classList.remove('modal-wide');
  const players = tourn.rosterPool[team] || [];

  const rosterHtml = players.length
    ? `<ol class="standing-list">${players.map(p => `<li class="clickable-cell" data-player-name="${escapeHtml(p)}"><span class="team-name">${escapeHtml(p)}</span></li>`).join('')}</ol>`
    : '<div class="empty-state">Nema podataka o sastavu.</div>';

  const headerHtml = entityHeaderHtml(team, dis, `
    <div class="info-block">
      <div>Sezona: <span>${seasonLabel(season)}</span></div>
      <div>Prvenstvo: <span>${DIS_LABELS[dis]||dis} (${KAT_LABELS[kat]||kat})</span></div>
    </div>
  `);

  body.innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    ${headerHtml}
    <h3 class="group-h" style="margin-top:0;">Sastav ekipe</h3>
    ${rosterHtml}
  `;
  overlay.classList.add('open');

  body.querySelectorAll('[data-player-name]').forEach(li => {
    li.addEventListener('click', () => {
      _modalStack.push(() => openTeamRosterModal(team, tourn, season, dis, kat));
      // puni raspon (sve sezone/discipline/kategorije) — sastav ekipe nema svoj vlastiti filter
      // pa igračev prozor prikazuje cjelokupnu karijeru, neovisno o filteru stranice s koje se došlo
      openPlayerModal(li.dataset.playerName, 'sve', 'sve', MIN_SEASON, MAX_SEASON);
    });
  });
}

// ===================== Fotografije (lightbox s navigacijom lijevo/desno) =====================
let _lightboxPhotos = [];
let _lightboxIndex = 0;
let _lightboxCaptions = {};

function openPhotoLightbox(photos, index, captions){
  _lightboxPhotos = photos;
  _lightboxIndex = index;
  _lightboxCaptions = captions || {};
  renderLightbox();
  document.getElementById('modalOverlay').classList.add('open');
}

function renderLightbox(){
  const body = document.getElementById('modalBody');
  const n = _lightboxPhotos.length;
  const src = _lightboxPhotos[_lightboxIndex];
  const caption = _lightboxCaptions[_lightboxIndex + 1];

  // Ako je fullscreen aktivan, ne re-renderiramo cijeli #lightboxStage element (to bi ga
  // uklonilo iz DOM-a i preglednik bi automatski izašao iz fullscreena) - samo zamijenimo
  // sliku i natpis/brojač na mjestu, fullscreen ostaje aktivan dok se "vrti" kroz fotografije.
  const isFs = document.fullscreenElement || document.webkitFullscreenElement;
  const existingStage = document.getElementById('lightboxStage');
  if(existingStage && isFs){
    const img = existingStage.querySelector('.lightbox-image');
    if(img){ img.src = src; img.alt = `Fotografija ${_lightboxIndex+1}`; }
    const counterEl = document.querySelector('.lightbox-counter');
    if(counterEl) counterEl.textContent = `${_lightboxIndex+1}/${n}`;
    const captionEl = document.querySelector('.lightbox-caption');
    if(captionEl) captionEl.textContent = caption || '';
    return;
  }

  body.classList.remove('modal-wide');
  body.innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    <div class="lightbox" id="lightboxStage">
      <button class="lightbox-fullscreen-btn" onclick="toggleLightboxFullscreen()" title="Prikaži preko cijelog ekrana">⛶</button>
      <button class="lightbox-nav lightbox-prev" onclick="lightboxNav(-1)" ${n<=1?'disabled':''}>‹</button>
      <img class="lightbox-image" src="${src}" alt="Fotografija ${_lightboxIndex+1}">
      <button class="lightbox-nav lightbox-next" onclick="lightboxNav(1)" ${n<=1?'disabled':''}>›</button>
    </div>
    <div class="lightbox-footer">
      <div class="lightbox-caption">${caption ? escapeHtml(caption) : ''}</div>
      <div class="lightbox-counter">${_lightboxIndex+1}/${n}</div>
    </div>
  `;
}

function toggleLightboxFullscreen(){
  const el = document.getElementById('lightboxStage');
  if(!el) return;
  const isFs = document.fullscreenElement || document.webkitFullscreenElement;
  if(!isFs){
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if(req) req.call(el);
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if(exit) exit.call(document);
  }
}

function lightboxNav(delta){
  const n = _lightboxPhotos.length;
  _lightboxIndex = (_lightboxIndex + delta + n) % n;
  renderLightbox();
}

// ===================== Videozapisi (ista navigacija lijevo/desno) =====================
let _lightboxVideos = [];
let _lightboxVideoIndex = 0;
let _lightboxVideoCaptions = {};

function openVideoModal(videos, index, captions){
  _lightboxVideos = videos;
  _lightboxVideoIndex = index;
  _lightboxVideoCaptions = captions || {};
  renderVideoModal();
  document.getElementById('modalOverlay').classList.add('open');
}

function renderVideoModal(){
  const body = document.getElementById('modalBody');
  body.classList.remove('modal-wide');
  const n = _lightboxVideos.length;
  const src = _lightboxVideos[_lightboxVideoIndex];
  const caption = _lightboxVideoCaptions[_lightboxVideoIndex + 1];

  body.innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    <div class="lightbox">
      <button class="lightbox-nav lightbox-prev" onclick="videoNav(-1)" ${n<=1?'disabled':''}>‹</button>
      <video class="video-modal-player" src="${src}" controls autoplay playsinline></video>
      <button class="lightbox-nav lightbox-next" onclick="videoNav(1)" ${n<=1?'disabled':''}>›</button>
    </div>
    <div class="lightbox-footer">
      <div class="lightbox-caption">${caption ? escapeHtml(caption) : ''}</div>
      <div class="lightbox-counter">${_lightboxVideoIndex+1}/${n}</div>
    </div>
  `;
}

function videoNav(delta){
  const n = _lightboxVideos.length;
  _lightboxVideoIndex = (_lightboxVideoIndex + delta + n) % n;
  renderVideoModal();
}

document.addEventListener('keydown', (e) => {
  if(!document.getElementById('modalOverlay').classList.contains('open')) return;
  if(e.key === 'Escape'){ closeModal(); return; }
  if(_lightboxPhotos.length){
    if(e.key === 'ArrowLeft') lightboxNav(-1);
    else if(e.key === 'ArrowRight') lightboxNav(1);
  } else if(_lightboxVideos.length){
    if(e.key === 'ArrowLeft') videoNav(-1);
    else if(e.key === 'ArrowRight') videoNav(1);
  }
});

function playerBadges(name){
  const out = [];
  BADGE_ORDER.forEach(badge => {
    const tiers = BADGES[badge] || {broncani:[], srebrni:[], zlatni:[]};
    ['zlatni','srebrni','broncani'].forEach(tier => {
      if((tiers[tier]||[]).some(e => e[0] === name)){
        out.push({badge, tier});
      }
    });
  });
  return out;
}

function renderPostignuca(){
  const content = document.getElementById('postignucaContent');
  let html = '<div class="badge-grid">';
  BADGE_ORDER.forEach(name => {
    html += `<button class="badge-item" data-badge="${escapeHtml(name)}"><span class="badge-icon">${BADGE_ICONS[name].neutral}</span><span class="badge-label">${escapeHtml(name)}</span></button>`;
  });
  html += '</div><div id="badgeDetailArea"></div>';
  content.innerHTML = html;
  content.querySelectorAll('.badge-item').forEach(btn => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('.badge-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderBadgeDetail(btn.dataset.badge);
    });
  });
  const first = content.querySelector('.badge-item');
  if(first) first.click();
}

function renderBadgeDetail(name){
  const area = document.getElementById('badgeDetailArea');
  const meta = BADGE_META[name] || ['', null, null, null];
  const [, bcrit, scrit, gcrit] = meta;
  const tiers = BADGES[name] || {broncani:[], srebrni:[], zlatni:[]};

  function formatBadgeValue(v){
    if(v == null) return '';
    if(name === 'Kirurg') return ` (${v.toFixed(1).replace('.', ',')} cm)`;
    return ` (${v})`;
  }

  function col(tier, crit, label){
    const entries = tiers[tier] || [];
    const items = entries.length
      ? entries.map(e => `<div class="badge-tier-list-item">${escapeHtml(e[0])}${formatBadgeValue(e[1])}</div>`).join('')
      : '<div class="badge-tier-list-item" style="color:var(--text-muted);">-</div>';
    return `<div class="badge-tier-col">
      <div class="badge-tier-col-title"><span class="badge-icon badge-icon-lg">${BADGE_ICONS[name][tier]}</span><div><div>${escapeHtml(name)} - ${label}</div>${crit ? `<div class="badge-tier-crit">${crit}</div>` : ''}</div></div>
      <div class="badge-tier-list">${items}</div>
    </div>`;
  }

  area.innerHTML = `<div class="badge-detail">
    <div class="badge-tier-cols">
      ${col('zlatni', gcrit, 'Zlatna značka')}
      ${col('srebrni', scrit, 'Srebrna značka')}
      ${col('broncani', bcrit, 'Brončana značka')}
    </div>
  </div>`;
}

// ===================== Reprezentacija (nastupi na svjetskim/europskim prvenstvima) =====================
const REP_STATE = { kat: 'sve', dis: 'sve', seasonMode: 'sve', seasonFrom: null, seasonTo: null };

function initReprezentacijaFilters(){
  const seasons = WC_DATA.entries.map(e => e.season);
  const repMin = Math.min(...seasons), repMax = Math.max(...seasons);
  REP_STATE.seasonFrom = repMin;
  REP_STATE.seasonTo = repMax;

  const kats = [...new Set(WC_DATA.entries.map(e => e.kat))].sort((a,b) => KAT_ORDER.indexOf(a) - KAT_ORDER.indexOf(b));
  const disList = [...new Set(WC_DATA.entries.map(e => e.dis))].sort((a,b) => DIS_ORDER.indexOf(a) - DIS_ORDER.indexOf(b));

  const katRow = document.getElementById('repKatRow');
  const katSveBtn = document.getElementById('repKatSveBtn');
  katRow.innerHTML = kats.map(k => `<button class="radio-btn" data-kat="${k}"><span class="lbl-full">${KAT_LABELS[k]||k}</span><span class="lbl-short">${k}</span></button>`).join('');
  katSveBtn.addEventListener('click', () => {
    katRow.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
    katSveBtn.classList.add('active');
    REP_STATE.kat = 'sve';
    renderReprezentacija();
  });
  katRow.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      katRow.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      katSveBtn.classList.remove('active');
      btn.classList.add('active');
      REP_STATE.kat = btn.dataset.kat;
      renderReprezentacija();
    });
  });

  const disRow = document.getElementById('repDisRow');
  const disSveBtn = document.getElementById('repDisSveBtn');
  disRow.innerHTML = disList.map(d => `<button class="radio-btn" data-dis="${d}"><span class="lbl-full">${DIS_LABELS[d]}</span><span class="lbl-short">${d}</span></button>`).join('');
  disSveBtn.addEventListener('click', () => {
    disRow.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
    disSveBtn.classList.add('active');
    REP_STATE.dis = 'sve';
    renderReprezentacija();
  });
  disRow.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      disRow.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      disSveBtn.classList.remove('active');
      btn.classList.add('active');
      REP_STATE.dis = btn.dataset.dis;
      renderReprezentacija();
    });
  });

  const fromSel = document.getElementById('repSeasonFrom');
  const toSel = document.getElementById('repSeasonTo');
  let opts = '';
  for(let y = repMax; y >= repMin; y--) opts += `<option value="${y}">${seasonLabel(y)}</option>`;
  fromSel.innerHTML = opts;
  toSel.innerHTML = opts;
  fromSel.value = repMin;
  toSel.value = repMax;

  const seasonSveBtn = document.getElementById('repSeasonSveBtn');
  const seasonControlsEl = fromSel.closest('.season-controls');
  seasonSveBtn.addEventListener('click', () => {
    seasonSveBtn.classList.add('active');
    REP_STATE.seasonMode = 'sve';
    REP_STATE.seasonFrom = repMin;
    REP_STATE.seasonTo = repMax;
    fromSel.value = repMin; toSel.value = repMax;
    seasonControlsEl.classList.remove('season-is-range');
    renderReprezentacija();
  });
  function onRangeChange(){
    seasonSveBtn.classList.remove('active');
    REP_STATE.seasonMode = 'range';
    let from = Number(fromSel.value), to = Number(toSel.value);
    if(from > to){ to = from; toSel.value = to; }
    REP_STATE.seasonFrom = from;
    REP_STATE.seasonTo = to;
    seasonControlsEl.classList.add('season-is-range');
    renderReprezentacija();
  }
  fromSel.addEventListener('change', onRangeChange);
  toSel.addEventListener('change', onRangeChange);
}

function repRosterHtml(entry){
  const rows = entry.players.map(p => {
    const suffix = (p.role === 'Skip' && entry.dis !== 'MP') ? ' <span class="rep-roster-skip-tag">(skip)</span>' : '';
    return `<tr><td class="rep-roster-name clickable-name" data-rep-player="${escapeHtml(p.name)}">${escapeHtml(p.name)}${suffix}</td></tr>`;
  }).join('');
  return `<table class="rep-roster-table"><tbody>${rows}</tbody></table>`;
}

function repCardHtml(e){
  const wcdbUrl = e.wcdb ? `https://results.worldcurling.org/Championship/Details/${e.wcdb}` : null;
  const infoblockTag = wcdbUrl ? `a` : `div`;
  const infoblockAttrs = wcdbUrl ? `href="${wcdbUrl}" target="_blank" rel="noopener" class="rep-card-infoblock rep-card-infoblock--link"` : `class="rep-card-infoblock"`;
  return `
    <div class="rep-card">
      <${infoblockTag} ${infoblockAttrs}>
        <div class="rep-card-natlabel">${escapeHtml(e.natLabel)}</div>
        <div class="rep-card-loc">${escapeHtml(e.mjesto)}, ${escapeHtml(e.drzava)}${e.datum ? `, ${escapeHtml(e.datum)}` : ''}</div>
        <div class="rep-card-dis">${DIS_LABELS[e.dis]||e.dis}</div>
        <div class="rep-card-stats">
          <div><span class="rep-card-stats-label">Plasman</span> ${e.plasman != null ? `${e.plasman}${e.sudionika != null ? ` / ${e.sudionika}` : ''}` : '–'}</div>
          <div><span class="rep-card-stats-label">Skor</span> ${escapeHtml(e.skor || '–')}</div>
        </div>
      </${infoblockTag}>
      ${repRosterHtml(e)}
    </div>
  `;
}

// Isti obrazac kao renderDisGridHtml (Poretci) - fiksni redoslijed M/Ž/MC/MP stupaca, prazan
// stupac (bez podataka za tu disciplinu) sakriven ali i dalje zauzima mjesto u mreži (desktop).
function repDisGridHtml(season, katForBlock, disList){
  let html = '<div class="dis-grid">';
  disList.forEach(d => {
    const entries = filteredRepEntries().filter(e => e.season === season && e.dis === d && e.kat === katForBlock);
    if(!entries.length){
      html += `<div class="dis-col dis-col-empty"></div>`;
      return;
    }
    html += `<div class="dis-col rep-dis-col">${entries.map(repCardHtml).join('')}</div>`;
  });
  html += '</div>';
  return html;
}

let _repFilteredCache = null;
function filteredRepEntries(){
  return _repFilteredCache;
}

function renderReprezentacija(){
  const content = document.getElementById('repContent');
  if(!WC_DATA.entries.length){
    content.innerHTML = '<div class="empty-state">Nema podataka o nastupima reprezentacije.</div>';
    return;
  }

  const { kat, dis, seasonFrom, seasonTo } = REP_STATE;
  const disList = dis === 'sve' ? DIS_ORDER : [dis];
  const filtered = WC_DATA.entries.filter(e =>
    (kat === 'sve' || e.kat === kat) &&
    disList.includes(e.dis) &&
    (typeof e.season === 'string' ? parseInt(e.season.split('-')[1] || e.season) : e.season) >= seasonFrom && (typeof e.season === 'string' ? parseInt(e.season.split('-')[1] || e.season) : e.season) <= seasonTo
  );
  _repFilteredCache = filtered;

  if(!filtered.length){
    content.innerHTML = '<div class="empty-state">Nema nastupa za odabrani filter.</div>';
    return;
  }

  const seasons = [...new Set(filtered.map(e => e.season))].sort((a,b) => b - a);

  let html = '';
  seasons.forEach(season => {
    html += `<div class="season-block" style="max-width:none;"><div class="season-title">Sezona ${seasonLabel(season)}</div>`;

    const katsThisSeason = kat === 'sve'
      ? KAT_ORDER.filter(k => filtered.some(e => e.season === season && e.kat === k))
      : [kat];

    if(katsThisSeason.length > 1){
      katsThisSeason.forEach(k => {
        html += `<h4 class="kat-section-h">${KAT_LABELS[k] || k}</h4>`;
        html += repDisGridHtml(season, k, disList);
      });
    } else {
      html += repDisGridHtml(season, katsThisSeason[0], disList);
    }

    html += `</div>`;
  });

  content.innerHTML = html;

  content.querySelectorAll('[data-rep-player]').forEach(el => {
    el.addEventListener('click', () => openRepPlayerModal(el.dataset.repPlayer));
  });
}

// Modal s nastupima igrača na svjetskim/europskim prvenstvima (sezona, disciplina,
// kategorija, natjecanje, plasman).
function openRepPlayerModal(name){
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  body.classList.remove('modal-wide');

  const history = WC_DATA.entries
    .filter(e => e.players.some(p => p.name === name))
    .sort((a,b) => b.season - a.season);

  const rows = history.map(e => `
    <tr>
      <td>${seasonLabel(e.season)}</td>
      <td><span class="lbl-full">${DIS_LABELS[e.dis]||e.dis}</span><span class="lbl-short">${e.dis}</span></td>
      <td><span class="lbl-full">${KAT_LABELS[e.kat]||e.kat}</span><span class="lbl-short">${e.kat}</span></td>
      <td title="${escapeHtml(e.natLabel)}">${escapeHtml(e.nat)}</td>
      <td class="num">${e.plasman != null ? `${e.plasman}${e.sudionika != null ? ` / ${e.sudionika}` : ''}` : '–'}</td>
    </tr>
  `).join('');

  body.innerHTML = `
    <button class="modal-close" onclick="closeModal()">×</button>
    <h2 class="entity-title">${escapeHtml(name)}</h2>
    <h3 class="group-h" style="margin-top:0;">Reprezentativni nastupi</h3>
    <div class="achv-table-scroll"><table class="achv-table"><thead><tr><th>Sezona</th><th><span class="lbl-full">Disciplina</span><span class="lbl-short">Dis.</span></th><th><span class="lbl-full">Kategorija</span><span class="lbl-short">Kat.</span></th><th>Natjecanje</th><th class="num">Plasman</th></tr></thead><tbody>${rows}</tbody></table></div>
  `;
  overlay.classList.add('open');
}



