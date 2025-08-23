
const state = {
  query: "",
  category: "All",
  sort: "score-desc",
  onlyBookmarks: false,
  data: [],
  bookmarks: new Set(JSON.parse(localStorage.getItem("sustainify.bookmarks") || "[]"))
};

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));

function saveBookmarks(){
  localStorage.setItem("sustainify.bookmarks", JSON.stringify([...state.bookmarks]));
}

function tag(template, vars){
  return template.replace(/\{\{(.*?)\}\}/g, (_, k) => (vars[k.trim()] ?? ""));
}

function renderChips(categories){
  const wrap = $("#chip-wrap");
  wrap.innerHTML = "";
  ["All", ...categories].forEach(cat => {
    const el = document.createElement("button");
    el.className = "chip";
    el.textContent = cat;
    if(state.category === cat) el.classList.add("active");
    el.addEventListener("click", () => { state.category = cat; render(); });
    wrap.appendChild(el);
  });
}

function filterAndSort(items){
  const q = state.query.trim().toLowerCase();
  let out = items.filter(p => {
    const matchesQuery = !q || [p.name, p.category, p.replaces, ...(p.tags||[])].join(" ").toLowerCase().includes(q);
    const matchesCat = state.category === "All" || p.category === state.category;
    const matchesBookmark = !state.onlyBookmarks || state.bookmarks.has(p.id);
    return matchesQuery && matchesCat && matchesBookmark;
  });
  switch(state.sort){
    case "score-desc": out.sort((a,b)=> b.score - a.score); break;
    case "score-asc": out.sort((a,b)=> a.score - b.score); break;
    case "name-asc": out.sort((a,b)=> a.name.localeCompare(b.name)); break;
    case "name-desc": out.sort((a,b)=> b.name.localeCompare(a.name)); break;
  }
  return out;
}

function renderCards(items){
  const grid = $("#grid");
  grid.innerHTML = "";
  if(!items.length){
    grid.innerHTML = `<div class="empty">No results. Try a different search or category.</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach(p => {
    const card = document.createElement("article");
    card.className = "card fade-in";
    card.innerHTML = `
      <div class="badge-score">Score ${p.score}</div>
      <div class="content">
        <div class="title">
          <img class="icon" src="assets/img/leaf.svg" alt="">
          <span>${p.name}</span>
        </div>
        <p class="desc">${p.description}</p>
        <div class="pills">
          ${(p.tags||[]).map(t=>`<span class="pill">#${t}</span>`).join("")}
        </div>
        <div class="meta">
          <span class="tooltip" data-tip="Category">${p.category}</span>
          <span class="tooltip" data-tip="Replaces">${p.replaces}</span>
          <span class="tooltip" data-tip="CO₂ saved">${p.impact.co2} kg CO₂</span>
          <span class="tooltip" data-tip="Waste avoided">${p.impact.waste} g</span>
        </div>
        <div class="cta-row">
          <button class="btn primary" data-id="${p.id}" data-action="details">Details</button>
          <button class="btn" data-id="${p.id}" data-action="bookmark">${state.bookmarks.has(p.id) ? "Bookmarked" : "Bookmark"}</button>
          <button class="btn" data-id="${p.id}" data-action="compare">Compare</button>
        </div>
      </div>
    `;
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

function openDetails(id){
  const p = state.data.find(x=>x.id===id);
  const body = $("#modal-body");
  body.innerHTML = `
    <h3 style="margin:0 0 8px 0">${p.name}</h3>
    <p style="color:var(--muted); margin: 0 0 12px 0">${p.description}</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      ${p.materials.map(m=>`<span class="pill">${m}</span>`).join("")}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      ${p.certifications.map(c=>`<span class="pill">✔ ${c}</span>`).join("")}
    </div>
    <div class="meta">
      <span>CO₂ saved: <b>${p.impact.co2} kg</b></span>
      <span>Water saved: <b>${p.impact.water} L</b></span>
      <span>Waste avoided: <b>${p.impact.waste} g</b></span>
    </div>
    <div class="pills" style="margin-top:12px">
      ${(p.links||[]).map(l=>`<a class="btn" href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join("")}
    </div>
  `;
  $("#modal").style.display = "block";
  requestAnimationFrame(()=> $("#modal").style.opacity = "1");
}

const compareSet = new Set();
function renderCompareBar(){
  const bar = $("#compare-bar");
  if(compareSet.size < 2){
    bar.style.display = "none";
    return;
  }
  bar.style.display = "flex";
  bar.innerHTML = [...compareSet].map(id=>{
    const p = state.data.find(x=>x.id===id);
    return `<span class="pill">${p.name}</span>`;
  }).join("") + `<button class="btn" id="do-compare">Compare Now</button>`;

  $("#do-compare").onclick = ()=>{
    const items = [...compareSet].map(id=> state.data.find(x=>x.id===id));
    const body = $("#modal-body");
    body.innerHTML = `
      <h3 style="margin:0 0 8px 0">Compare</h3>
      <div style="display:grid;gap:12px;grid-template-columns: repeat(${items.length}, 1fr)">
        ${items.map(p=>`
          <div class="card" style="border-color:rgba(124,242,199,0.4)">
            <div class="content">
             <div class="title">${p.name}</div>
             <div class="meta">
               <span>Score: <b>${p.score}</b></span>
               <span>CO₂: <b>${p.impact.co2} kg</b></span>
               <span>Water: <b>${p.impact.water} L</b></span>
               <span>Waste: <b>${p.impact.waste} g</b></span>
             </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
    $("#modal").style.display = "block";
    requestAnimationFrame(()=> $("#modal").style.opacity = "1");
  };
}

function render(){
  // header state
  $("#bookmark-toggle").textContent = state.onlyBookmarks ? "Showing Bookmarks" : "All Items";
  // grid
  const items = filterAndSort(state.data);
  renderCards(items);
  renderCompareBar();
}

function attachEvents(){
  $("#q").addEventListener("input", (e)=>{ state.query = e.target.value; render(); });
  $("#sort").addEventListener("change", (e)=>{ state.sort = e.target.value; render(); });
  $("#bookmark-toggle").addEventListener("click", ()=>{ state.onlyBookmarks = !state.onlyBookmarks; render(); });
  $("#close-modal").addEventListener("click", ()=>{
    $("#modal").style.opacity = "0";
    setTimeout(()=> $("#modal").style.display="none", 160);
  });
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-action]");
    if(!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if(action === "details") openDetails(id);
    if(action === "bookmark"){
      if(state.bookmarks.has(id)) state.bookmarks.delete(id); else state.bookmarks.add(id);
      saveBookmarks();
      render();
    }
    if(action === "compare"){
      if(compareSet.has(id)) compareSet.delete(id); else compareSet.add(id);
      renderCompareBar();
    }
  });
}

async function init(){
  const res = await fetch("assets/data/products.json");
  state.data = await res.json();
  const categories = [...new Set(state.data.map(p=>p.category))].sort();
  renderChips(categories);
  attachEvents();
  render();
}

document.addEventListener("DOMContentLoaded", init);
