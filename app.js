const STORAGE_KEY = "seohyun_timetable_v1";

// 09:00~22:00
const START_MIN = 9 * 60;
const END_MIN = 22 * 60;
const MINUTES_PER_HOUR = 60;
const PX_PER_HOUR = 60; // 1시간 = 60px (index.html과 맞춰둠)

const DAYS = ["월","화","수","목","금","토","일"];

function toMinutes(hhmm){
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if(!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if(h<0 || h>23 || min<0 || min>59) return null;
  return h*60 + min;
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return defaultData();
  try{
    const arr = JSON.parse(raw);
    if(Array.isArray(arr)) return arr;
  }catch(e){}
  return defaultData();
}

function saveData(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function defaultData(){
  // 예시(원하면 지우셔도 됨)
  return [
    { id: crypto.randomUUID(), title:"문헌정보학개론", day:0, start:"09:00", end:"10:30", place:"", color:"#7c5cff" },
    { id: crypto.randomUUID(), title:"세미나", day:2, start:"19:00", end:"22:00", place:"온라인", color:"#00c2a8" }
  ];
}

// UI elements
const timeCol = document.getElementById("timeCol");
const weekHead = document.getElementById("weekHead");
const weekBody = document.getElementById("weekBody");

const addBtn = document.getElementById("addBtn");
const resetBtn = document.getElementById("resetBtn");

const editor = document.getElementById("editor");
const modalTitle = document.getElementById("modalTitle");
const closeBtn = document.getElementById("closeBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");

const fTitle = document.getElementById("fTitle");
const fDay = document.getElementById("fDay");
const fPlace = document.getElementById("fPlace");
const fStart = document.getElementById("fStart");
const fEnd = document.getElementById("fEnd");
const fColor = document.getElementById("fColor");

let data = loadData();
let editingId = null;

function render(){
  // time labels
  timeCol.innerHTML = "";
  for(let h=9; h<=21; h++){
    const div = document.createElement("div");
    div.className = "timeLabel";
    div.textContent = String(h).padStart(2,"0") + ":00";
    timeCol.appendChild(div);
  }

  // week head
  weekHead.innerHTML = "";
  for(const d of DAYS){
    const div = document.createElement("div");
    div.className = "dayHead";
    div.textContent = d;
    weekHead.appendChild(div);
  }

  // week body columns
  weekBody.innerHTML = "";
  const cols = [];
  for(let i=0;i<7;i++){
    const col = document.createElement("div");
    col.className = "dayCol";
    weekBody.appendChild(col);
    cols.push(col);
  }

  // blocks
  for(const item of data){
    const startMin = toMinutes(item.start);
    const endMin = toMinutes(item.end);
    if(startMin===null || endMin===null) continue;
    if(item.day<0 || item.day>6) continue;

    const s = clamp(startMin, START_MIN, END_MIN);
    const e = clamp(endMin, START_MIN, END_MIN);
    if(e <= s) continue;

    const top = ((s - START_MIN) / MINUTES_PER_HOUR) * PX_PER_HOUR;
    const height = ((e - s) / MINUTES_PER_HOUR) * PX_PER_HOUR;

    const block = document.createElement("div");
    block.className = "block";
    block.style.top = `${top}px`;
    block.style.height = `${height}px`;
    block.style.background = `linear-gradient(180deg, ${item.color}cc, ${item.color}66)`;

    block.innerHTML = `
      <div class="title">${escapeHtml(item.title)}</div>
      ${item.place ? `<div class="sub">${escapeHtml(item.place)}</div>` : ``}
      <div class="meta">${escapeHtml(item.start)}–${escapeHtml(item.end)}</div>
    `;

    block.addEventListener("click", () => openEditor(item.id));
    cols[item.day].appendChild(block);
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function openEditor(id=null){
  editingId = id;
  const item = id ? data.find(x => x.id===id) : null;

  modalTitle.textContent = item ? "수업 수정" : "수업 추가";
  deleteBtn.style.display = item ? "block" : "none";

  fTitle.value = item?.title ?? "";
  fDay.value = String(item?.day ?? 0);
  fPlace.value = item?.place ?? "";
  fStart.value = item?.start ?? "09:00";
  fEnd.value = item?.end ?? "10:00";
  fColor.value = item?.color ?? "#7c5cff";

  editor.showModal();
}

function closeEditor(){
  editor.close();
  editingId = null;
}

function saveEditor(){
  const title = fTitle.value.trim();
  const day = Number(fDay.value);
  const place = fPlace.value.trim();
  const start = fStart.value.trim();
  const end = fEnd.value.trim();
  const color = fColor.value.trim() || "#7c5cff";

  if(!title){
    alert("과목명을 입력해주세요.");
    return;
  }
  const s = toMinutes(start);
  const e = toMinutes(end);
  if(s===null || e===null){
    alert("시간 형식은 HH:MM 입니다. 예: 09:00");
    return;
  }
  if(e <= s){
    alert("종료 시간이 시작 시간보다 늦어야 합니다.");
    return;
  }
  // 범위는 09:00~22:00 기준으로 보여주지만, 입력은 자유롭게 두고 화면에서 clamp 처리.

  if(editingId){
    const idx = data.findIndex(x => x.id===editingId);
    if(idx>=0){
      data[idx] = { ...data[idx], title, day, place, start, end, color };
    }
  }else{
    data.push({ id: crypto.randomUUID(), title, day, place, start, end, color });
  }

  saveData(data);
  render();
  closeEditor();
}

function deleteEditor(){
  if(!editingId) return;
  if(!confirm("삭제할까요?")) return;
  data = data.filter(x => x.id!==editingId);
  saveData(data);
  render();
  closeEditor();
}

addBtn.addEventListener("click", () => openEditor(null));
resetBtn.addEventListener("click", () => {
  if(!confirm("모든 데이터를 초기화할까요?")) return;
  data = defaultData();
  saveData(data);
  render();
});

closeBtn.addEventListener("click", closeEditor);
saveBtn.addEventListener("click", saveEditor);
deleteBtn.addEventListener("click", deleteEditor);

render();
