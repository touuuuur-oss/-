const DATA = window.OKINAWA_TECHO_DATA || [];
let currentMonthIndex = 0;
let selectedDay = null;

const monthSelect = document.getElementById("monthSelect");
const monthTitle = document.getElementById("monthTitle");
const monthMeta = document.getElementById("monthMeta");
const seasonText = document.getElementById("seasonText");
const calendarGrid = document.getElementById("calendarGrid");

DATA.forEach((m, idx) => {
  const opt = document.createElement("option");
  opt.value = idx;
  opt.textContent = `${m.month}月`;
  monthSelect.appendChild(opt);
});

function memoKey(month, day){
  return `okinawa_techo_memo_2027_${month}_${day}`;
}
function getMemo(month, day){
  return localStorage.getItem(memoKey(month, day)) || "";
}
function setMemo(month, day, value){
  localStorage.setItem(memoKey(month, day), value);
}

function weekdayMondayFirst(year, month, day){
  const js = new Date(year, month - 1, day).getDay(); // 0 Sun
  return (js + 6) % 7; // 0 Mon
}

function renderMonth(){
  const m = DATA[currentMonthIndex];
  if(!m) return;

  monthSelect.value = currentMonthIndex;
  monthTitle.textContent = `${m.month}月`;
  monthMeta.textContent = `${m.dialect || ""} / ${m.english || ""}`;
  seasonText.textContent = m.season || "季節暦情報を表示します。";

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
    const d = byDay[day] || { day, lunar:"", rokuyo:"", zodiac:"", events:[] };
    const cell = document.createElement("button");
    const wd = new Date(m.year, m.month-1, day).getDay();
    cell.className = "dayCell" + (wd===0 ? " sun" : wd===6 ? " sat" : "");
    cell.innerHTML = `
      <span class="dayNum">${day}</span>
      <span class="lunarMini">${d.lunar || ""}</span>
      ${(d.events && d.events.length) ? '<span class="eventDot"></span>' : ''}
      ${getMemo(m.month, day) ? '<span class="memoDot"></span>' : ''}
    `;
    cell.onclick = () => openDetail(d);
    calendarGrid.appendChild(cell);
  }
}

function openDetail(d){
  const m = DATA[currentMonthIndex];
  selectedDay = d;
  document.getElementById("detailTitle").textContent = `${m.month}月${d.day}日`;
  document.getElementById("detailLunar").textContent = d.lunar || "-";
  document.getElementById("detailRokuyo").textContent = d.rokuyo || "-";
  document.getElementById("detailZodiac").textContent = d.zodiac || "-";

  const ev = document.getElementById("detailEvents");
  ev.innerHTML = "";
  const events = d.events && d.events.length ? d.events : ["行事情報はありません。"];
  events.forEach(e => {
    const li = document.createElement("li");
    li.textContent = e;
    ev.appendChild(li);
  });

  document.getElementById("memo").value = getMemo(m.month, d.day);
  document.getElementById("detailPanel").classList.add("open");
}

document.getElementById("closeDetail").onclick = () => {
  document.getElementById("detailPanel").classList.remove("open");
};

document.getElementById("saveMemo").onclick = () => {
  const m = DATA[currentMonthIndex];
  if(!selectedDay) return;
  setMemo(m.month, selectedDay.day, document.getElementById("memo").value);
  renderMonth();
  alert("この端末に保存しました");
};

monthSelect.onchange = () => {
  currentMonthIndex = Number(monthSelect.value);
  renderMonth();
};

document.getElementById("prevMonth").onclick = () => {
  currentMonthIndex = Math.max(0, currentMonthIndex - 1);
  renderMonth();
};
document.getElementById("nextMonth").onclick = () => {
  currentMonthIndex = Math.min(DATA.length - 1, currentMonthIndex + 1);
  renderMonth();
};
document.getElementById("todayBtn").onclick = () => {
  currentMonthIndex = 0;
  renderMonth();
};

renderMonth();
