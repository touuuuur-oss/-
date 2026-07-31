// Ver.1.0.2: remove any service worker/cache left by earlier prototypes.
(async function clearLegacyAppCache(){
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }
  } catch (error) {
    console.warn("Legacy cache cleanup skipped:", error);
  }
})();

const DATA = (window.OKINAWA_TECHO_DATA || [])
  .slice()
  .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
let currentMonthIndex = 0;
let selectedDay = null;

const monthSelect = document.getElementById("monthSelect");
const monthTitle = document.getElementById("monthTitle");
const monthMeta = document.getElementById("monthMeta");
const monthBrandLine = document.getElementById("monthBrandLine");
const seasonText = document.getElementById("seasonText");
const calendarGrid = document.getElementById("calendarGrid");
const detailPanel = document.getElementById("detailPanel");
const detailBackdrop = document.getElementById("detailBackdrop");

const STORAGE = {
  lastMonth: "okinawa_techo_plus_last_month_v2",
  visited: "okinawa_techo_plus_has_visited"
};

function pad2(value){
  return String(value).padStart(2, "0");
}

function fullDateKey(year, month, day){
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/*
  Full-date keys prevent collisions when future months/years are added.
  GitHub updates do not clear localStorage as long as the same origin/domain is used.
*/
function memoKey(year, month, day){
  return `okinawa_techo_plus_memo_${fullDateKey(year, month, day)}`;
}

function legacyMemo(year, month, day){
  // Migrate old prototype data only for 2027, whose old keys hard-coded 2027.
  if(year !== 2027) return "";
  return (
    localStorage.getItem(`okinawa_techo_plus_memo_2027_${month}_${day}`) ||
    localStorage.getItem(`okinawa_techo_memo_2027_${month}_${day}`) ||
    ""
  );
}

function getMemo(year, month, day){
  const key = memoKey(year, month, day);
  const current = localStorage.getItem(key);
  if(current !== null) return current;

  const old = legacyMemo(year, month, day);
  if(old){
    localStorage.setItem(key, old);
    return old;
  }
  return "";
}

function setMemo(year, month, day, value){
  localStorage.setItem(memoKey(year, month, day), value);
}

function monthId(m){
  return `${m.year}-${pad2(m.month)}`;
}


function validateCalendarData(){
  const expected = [
    "2026-08", "2026-09", "2026-10", "2026-11",
    "2026-12", "2027-01", "2027-02", "2027-03"
  ];
  const actual = DATA.map(monthId);
  const missing = expected.filter(id => !actual.includes(id));
  if(missing.length){
    console.error("不足している月データ:", missing.join(", "));
  }
  return missing;
}

function findMonthIndex(year, month){
  return DATA.findIndex(m => m.year === year && m.month === month);
}

function nearestTodayIndex(){
  const now = new Date();
  const exact = findMonthIndex(now.getFullYear(), now.getMonth() + 1);
  if(exact >= 0) return exact;

  if(!DATA.length) return 0;
  const todayValue = now.getFullYear() * 12 + now.getMonth();
  let best = 0;
  let bestDistance = Infinity;
  DATA.forEach((m, i) => {
    const value = m.year * 12 + (m.month - 1);
    const distance = Math.abs(value - todayValue);
    if(distance < bestDistance){
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}

function initialMonthIndex(){
  const saved = localStorage.getItem(STORAGE.lastMonth);
  if(saved){
    const idx = DATA.findIndex(m => monthId(m) === saved);
    if(idx >= 0) return idx;
  }
  return nearestTodayIndex();
}

validateCalendarData();

DATA.forEach((m, idx) => {
  const opt = document.createElement("option");
  opt.value = idx;
  opt.textContent = `${m.year}年${m.month}月`;
  monthSelect.appendChild(opt);
});

function weekdayMondayFirst(year, month, day){
  const js = new Date(year, month - 1, day).getDay();
  return (js + 6) % 7;
}

function isHolidayLike(d){
  const text = [...(d.events || []), ...(d.seasons || [])].join(" ");
  return /元日|元旦|成人の日|建国記念の日|天皇誕生日|春分の日|昭和の日|憲法記念日|みどりの日|こどもの日|海の日|山の日|敬老の日|秋分の日|スポーツの日|文化の日|勤労感謝の日|振替休日/.test(text);
}

function openPanel(){
  detailPanel.classList.add("open");
  detailBackdrop.classList.add("open");
}

function closePanel(){
  detailPanel.classList.remove("open");
  detailBackdrop.classList.remove("open");
  detailPanel.style.transform = "";
}

function renderMonthlyMemoList(m){
  const listEl = document.getElementById("monthlyMemoList");
  if(!listEl) return;
  listEl.innerHTML = "";

  const items = [];
  const daysInMonth = new Date(m.year, m.month, 0).getDate();

  for(let day=1; day<=daysInMonth; day++){
    const memo = getMemo(m.year, m.month, day).trim();
    if(memo) items.push({day, memo});
  }

  if(!items.length){
    const li = document.createElement("li");
    li.innerHTML = '<span class="emptyText">【予定なし】</span>';
    listEl.appendChild(li);
    return;
  }

  items.forEach(item => {
    const li = document.createElement("li");
    const safeMemo = item.memo.replace(/\n/g, " / ");
    li.innerHTML = `<span class="listDate">${m.month}/${item.day}</span><span>${safeMemo}</span>`;
    listEl.appendChild(li);
  });
}

function addCompactListItem(listEl, dateLabel, text, type){
  const li = document.createElement("li");
  const badge = type === "season" ? '<span class="seasonBadge">季節暦</span>' : "";
  li.innerHTML = `<span class="listDate">${dateLabel}</span><span>${badge}${text}</span>`;
  listEl.appendChild(li);
}

function renderMonth(){
  const m = DATA[currentMonthIndex];
  if(!m) return;

  localStorage.setItem(STORAGE.lastMonth, monthId(m));
  monthSelect.value = currentMonthIndex;
  monthTitle.textContent = `${m.year}年${m.month}月`;
  monthBrandLine.textContent = `${m.year} / OKINAWA TECHO＋`;
  monthMeta.textContent = `${m.dialect || ""} / ${m.english || ""}`;

  // The product title remains the 2026 edition even when viewing Jan–Mar 2027.
  document.title = "沖縄手帳＋ 2026｜社内運用版";
  document.querySelectorAll(".brandMini span, .hero h1 span").forEach(el => {
    el.textContent = "2026";
  });

  document.getElementById("prevMonth").disabled = currentMonthIndex === 0;
  document.getElementById("nextMonth").disabled = currentMonthIndex === DATA.length - 1;
  renderMonthlyMemoList(m);

  seasonText.innerHTML = "";
  let count = 0;
  (m.days || []).forEach(d => {
    (d.events || []).forEach(event => {
      addCompactListItem(seasonText, `${m.month}/${d.day}`, event, "event");
      count++;
    });
    (d.seasons || []).forEach(season => {
      addCompactListItem(seasonText, `${m.month}/${d.day}`, season, "season");
      count++;
    });
  });

  if(!count){
    const li = document.createElement("li");
    li.textContent = "今月の沖縄行事・季節暦情報はありません。";
    seasonText.appendChild(li);
  }

  calendarGrid.innerHTML = "";
  const firstBlank = weekdayMondayFirst(m.year, m.month, 1);
  for(let i=0; i<firstBlank; i++){
    const empty = document.createElement("div");
    empty.className = "dayCell empty";
    calendarGrid.appendChild(empty);
  }

  const daysInMonth = new Date(m.year, m.month, 0).getDate();
  const byDay = {};
  (m.days || []).forEach(d => byDay[d.day] = d);

  for(let day=1; day<=daysInMonth; day++){
    const d = byDay[day] || {
      day, lunar:"", rokuyo:"", zodiac:"", events:[], seasons:[]
    };
    const cell = document.createElement("button");
    const wd = new Date(m.year, m.month - 1, day).getDay();
    cell.className = "dayCell" +
      (wd === 0 || isHolidayLike(d) ? " sun" : wd === 6 ? " sat" : "");

    const hasOfficialInfo = (d.events && d.events.length) || (d.seasons && d.seasons.length);
    const hasMemo = Boolean(getMemo(m.year, m.month, day));

    cell.innerHTML = `
      <span class="dayNum">${day}</span>
      <span class="lunarMini">${d.lunar || ""}</span>
      ${hasOfficialInfo ? '<span class="eventDot"></span>' : ''}
      ${hasMemo ? '<span class="memoDot"></span>' : ''}
    `;
    cell.onclick = () => openDetail(d);
    calendarGrid.appendChild(cell);
  }
}

function openDetail(d){
  const m = DATA[currentMonthIndex];
  selectedDay = d;

  document.getElementById("detailTitle").textContent =
    `${m.year}年${m.month}月${d.day}日`;
  document.getElementById("detailLunar").textContent = d.lunar || "-";
  document.getElementById("detailRokuyo").textContent = d.rokuyo || "-";
  document.getElementById("detailZodiac").textContent = d.zodiac || "-";

  const ev = document.getElementById("detailEvents");
  ev.innerHTML = "";
  const information = [
    ...(d.events || []).map(text => ({label:"行事", text})),
    ...(d.seasons || []).map(text => ({label:"季節暦", text}))
  ];

  if(!information.length){
    const li = document.createElement("li");
    li.textContent = "行事情報はありません。";
    ev.appendChild(li);
  }else{
    information.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.label}：${item.text}`;
      ev.appendChild(li);
    });
  }

  document.getElementById("memo").value =
    getMemo(m.year, m.month, d.day);
  openPanel();
}

document.getElementById("closeDetail").onclick = closePanel;
detailBackdrop.addEventListener("click", closePanel);

document.getElementById("saveMemo").onclick = () => {
  const m = DATA[currentMonthIndex];
  if(!selectedDay) return;
  setMemo(m.year, m.month, selectedDay.day, document.getElementById("memo").value);
  renderMonth();
  closePanel();
};

monthSelect.onchange = () => {
  currentMonthIndex = Number(monthSelect.value);
  renderMonth();
};

document.getElementById("prevMonth").onclick = () => {
  if(currentMonthIndex > 0){
    currentMonthIndex--;
    renderMonth();
  }
};

document.getElementById("nextMonth").onclick = () => {
  if(currentMonthIndex < DATA.length - 1){
    currentMonthIndex++;
    renderMonth();
  }
};

document.getElementById("todayBtn").onclick = () => {
  currentMonthIndex = nearestTodayIndex();
  renderMonth();
};

let startY = 0;
let lastY = 0;
let dragging = false;

detailPanel.addEventListener("touchstart", e => {
  if(!detailPanel.classList.contains("open")) return;
  startY = e.touches[0].clientY;
  lastY = startY;
  dragging = true;
}, {passive:true});

detailPanel.addEventListener("touchmove", e => {
  if(!dragging) return;
  lastY = e.touches[0].clientY;
  const diff = lastY - startY;
  if(diff > 0 && detailPanel.scrollTop <= 2){
    detailPanel.style.transform = `translateY(${Math.min(diff, 180)}px)`;
  }
}, {passive:true});

detailPanel.addEventListener("touchend", () => {
  if(!dragging) return;
  const diff = lastY - startY;
  dragging = false;
  detailPanel.style.transform = "";
  if(diff > 80 && detailPanel.scrollTop <= 6) closePanel();
});

// First visit / returning-user banner mode.
if(localStorage.getItem(STORAGE.visited) === "1"){
  document.body.classList.add("returning-user");
}else{
  localStorage.setItem(STORAGE.visited, "1");
}

// Home screen instructions.
const installButton = document.querySelector(".installMini button");
if(installButton){
  installButton.onclick = () => {
    alert(
      "ホーム画面への追加方法\n\n" +
      "【iPhone】Safari下部の共有アイコン → 下へスクロール →「ホーム画面に追加」\n\n" +
      "【Android】Chrome右上の「︙」→「ホーム画面に追加」"
    );
  };
}

currentMonthIndex = initialMonthIndex();
renderMonth();
