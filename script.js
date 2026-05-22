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
  return `okinawa_techo_plus_memo_2027_${month}_${day}`;
}
function getMemo(month, day){
  return localStorage.getItem(memoKey(month, day)) || "";
}
function setMemo(month, day, value){
  localStorage.setItem(memoKey(month, day), value);
}
function weekdayMondayFirst(year, month, day){
  const js = new Date(year, month - 1, day).getDay();
  return (js + 6) % 7;
}
function isHolidayLike(d){
  const text = ((d.events || []).join(" "));
  return /元日|成人の日|建国記念の日|天皇誕生日|春分の日|昭和の日|憲法記念日|みどりの日|こどもの日|海の日|山の日|敬老の日|秋分の日|スポーツの日|文化の日|勤労感謝の日|振替休日/.test(text);
}
function renderMonth(){
  const m = DATA[currentMonthIndex];
  if(!m) return;

  monthSelect.value = currentMonthIndex;
  monthTitle.textContent = `${m.month}月`;
  monthMeta.textContent = `${m.dialect || ""} / ${m.english || ""}`;

  seasonText.innerHTML = "";
  const list = [];

  (m.days || []).forEach(d => {
    if (d.events && d.events.length) {
      d.events.forEach(e => list.push(`${m.month}/${d.day}　${e}`));
    }
  });

  const seasons = Array.isArray(m.season) ? m.season : (m.season ? [m.season] : []);
  seasons.forEach(s => {
    const text = String(s).replace(/\s+/g, " ").trim();
    if (text && !/^[\d〜～\/\-\(\)（）]+$/.test(text)) {
      list.push(`季節暦　${text}`);
    }
  });

  (list.length ? list : ["今月の行事・季節暦情報はありません。"]).forEach(s => {
    const li = document.createElement("li");
    li.textContent = s;
    seasonText.appendChild(li);
  });

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
    cell.className = "dayCell" + (wd===0 || isHolidayLike(d) ? " sun" : wd===6 ? " sat" : "");
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


// Detail panel UX: backdrop tap + swipe/down drag to close
(function(){
  const panel = document.getElementById("detailPanel");
  const backdrop = document.getElementById("detailBackdrop");
  if(!panel || !backdrop) return;

  const originalOpen = window.openDetail;
  if (typeof openDetail === "function") {
    window.openDetail = function(d){
      originalOpen(d);
      backdrop.classList.add("open");
    }
  }

  function closeDetailPanel(){
    panel.classList.remove("open");
    backdrop.classList.remove("open");
  }

  backdrop.addEventListener("click", closeDetailPanel);
  const closeBtn = document.getElementById("closeDetail");
  if(closeBtn) closeBtn.addEventListener("click", closeDetailPanel);

  let startY = 0;
  let currentY = 0;
  let dragging = false;

  panel.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
    currentY = startY;
    dragging = true;
  }, {passive:true});

  panel.addEventListener("touchmove", (e) => {
    if(!dragging) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if(diff > 0 && panel.scrollTop <= 0){
      panel.style.transform = `translateY(${Math.min(diff, 160)}px)`;
    }
  }, {passive:true});

  panel.addEventListener("touchend", () => {
    const diff = currentY - startY;
    panel.style.transform = "";
    dragging = false;
    if(diff > 90 && panel.scrollTop <= 4){
      closeDetailPanel();
    }
  });
})();
