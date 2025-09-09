// Your complete new and updated JavaScript code

const state = {
    // Current state of the application
    query: "",
    category: "All",
    sort: "score-desc",
    onlyBookmarks: false,
    data: [],
    bookmarks: new Set(JSON.parse(localStorage.getItem("sustainify.bookmarks") || "[]")),
    // Pagination settings
    currentPage: 1,
    itemsPerPage: 6, // Number of items to show per page
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => root.querySelectorAll(s);

// --- HELPER FUNCTIONS ---
function saveBookmarks() {
    localStorage.setItem("sustainify.bookmarks", JSON.stringify([...state.bookmarks]));
}

function loadContributions() {
    try {
        return JSON.parse(localStorage.getItem("sustainify.contributions") || "[]");
    } catch {
        return [];
    }
}

function saveContributions(contributions) {
    localStorage.setItem("sustainify.contributions", JSON.stringify(contributions));
}

// Function to calculate a score for a new user contribution
function calculateScore(item) {
    let score = 50; // Base score
    if (item.materials) score += item.materials.length * 5;
    if (item.certifications) score += item.certifications.length * 10;
    if (item.tags) score += item.tags.length * 2;
    return Math.min(score, 100); // Score cannot exceed 100
}

// --- RENDERING LOGIC ---
function renderChips(categories) {
    const wrap = $("#chip-wrap");
    wrap.innerHTML = "";
    ["All", ...categories].forEach(cat => {
        const el = document.createElement("button");
        el.className = "chip";
        el.textContent = cat;
        if (state.category === cat) el.classList.add("active");
        el.addEventListener("click", () => {
            state.category = cat;
            state.currentPage = 1;
            render();
        });
        wrap.appendChild(el);
    });
}

function filterAndSort(items) {
    const q = state.query.trim().toLowerCase();
    let out = items.filter(p => {
        const matchesQuery = !q || [p.name, p.category, p.replaces, ...(p.tags || [])].join(" ").toLowerCase().includes(q);
        const matchesCat = state.category === "All" || p.category === state.category;
        const matchesBookmark = !state.onlyBookmarks || state.bookmarks.has(p.id);
        return matchesQuery && matchesCat && matchesBookmark;
    });

    switch (state.sort) {
        case "score-desc": out.sort((a, b) => b.score - a.score); break;
        case "score-asc": out.sort((a, b) => a.score - b.score); break;
        case "name-asc": out.sort((a, b) => a.name.localeCompare(b.name)); break;
        case "name-desc": out.sort((a, b) => b.name.localeCompare(a.name)); break;
    }
    return out;
}

function renderCards(items) {
    const grid = $("#grid");
    grid.innerHTML = "";
    if (!items.length) {
        grid.innerHTML = `<div class="empty">No results found.</div>`;
        return;
    }
    const frag = document.createDocumentFragment();
    items.forEach(p => {
        const card = document.createElement("article");
        card.className = "card fade-in";
        const isUserContribution = p.id.toString().startsWith('p');

        card.innerHTML = `
            <div class="badge-score">Score ${p.score}</div>
            <div class="content">
                <div class="title">
                    <img class="icon" src="assets/img/leaf.svg" alt="leaf icon">
                    <span>${p.name}</span>
                </div>
                <p class="desc">${p.description}</p>
                <div class="pills">
                    ${(p.tags || []).map(t => `<span class="pill">#${t}</span>`).join("")}
                </div>
                <div class="meta">
                    ${p.category ? `<span class="tooltip" data-tip="Category">Category: ${p.category}</span>` : ''}
                    ${p.replaces ? `<span class="tooltip" data-tip="Replaces">Replaces: ${p.replaces}</span>` : ''}
                    ${p.impact?.co2 ? `<span class="tooltip" data-tip="CO₂ saved">CO₂ saved: ${p.impact.co2} kg</span>` : ''}
                    ${p.impact?.waste ? `<span class="tooltip" data-tip="Waste avoided">Waste avoided: ${p.impact.waste} g</span>` : ''}
                </div>
                <div class="cta-row">
                    <button class="btn primary" data-id="${p.id}" data-action="details">Details</button>
                    <button class="btn" data-id="${p.id}" data-action="bookmark">${state.bookmarks.has(p.id) ? "Bookmarked" : "Bookmark"}</button>
                    ${isUserContribution ? `<button class="btn" data-id="${p.id}" data-action="delete" style="color:var(--danger);">Delete</button>` : ''}
                </div>
            </div>
        `;
        frag.appendChild(card);
    });
    grid.appendChild(frag);
}

function renderPagination(totalItems) {
    const wrap = $("#pagination-wrap");
    wrap.innerHTML = "";
    const totalPages = Math.ceil(totalItems / state.itemsPerPage);

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        if (i === state.currentPage) {
            btn.className = "active";
        }
        btn.addEventListener("click", () => {
            state.currentPage = i;
            render();
            window.scrollTo(0, 0);
        });
        wrap.appendChild(btn);
    }
}

function showModal(item) {
    const modal = $("#modal");
    const modalBody = $("#modal-body");
    
    modal.style.display = 'block';
    modal.style.opacity = '1';

    modalBody.innerHTML = `
        <h3 style="font-size: 24px; margin-bottom: 8px;">${item.name} <span class="badge-score" style="position: static; font-size: 14px; margin-left: 10px;">Score ${item.score}</span></h3>
        <p style="color: var(--muted); margin-bottom: 20px;">${item.description}</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div>
                <p style="font-weight: bold; color: var(--text);">Category:</p>
                <p>${item.category}</p>
            </div>
            <div>
                <p style="font-weight: bold; color: var(--text);">Replaces:</p>
                <p>${item.replaces || 'N/A'}</p>
            </div>
            <div>
                <p style="font-weight: bold; color: var(--text);">Materials:</p>
                <p>${item.materials.join(', ') || 'N/A'}</p>
            </div>
            <div>
                <p style="font-weight: bold; color: var(--text);">Certifications:</p>
                <p>${item.certifications.join(', ') || 'N/A'}</p>
            </div>
        </div>
        <div class="pills" style="margin-top: 20px;">
            ${(item.tags || []).map(tag => `<span class="pill">${tag}</span>`).join('')}
        </div>
    `;
}

function hideModal() {
    const modal = $("#modal");
    const modalBody = $("#modal-body");
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
    }, 300);
}

// Main render function
function render() {
    $("#bookmark-toggle").textContent = state.onlyBookmarks ? "Showing Bookmarks" : "All Items";
    const filteredAndSortedItems = filterAndSort(state.data);
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedItems = filteredAndSortedItems.slice(startIndex, endIndex);
    renderCards(paginatedItems);
    renderPagination(filteredAndSortedItems.length);
}

// --- EVENT LISTENERS & INITIALIZATION ---
function attachEvents() {
    $("#q").addEventListener("input", (e) => {
        state.query = e.target.value;
        state.currentPage = 1;
        render();
    });
    $("#sort").addEventListener("change", (e) => {
        state.sort = e.target.value;
        state.currentPage = 1;
        render();
    });
    $("#bookmark-toggle").addEventListener("click", () => {
        state.onlyBookmarks = !state.onlyBookmarks;
        state.currentPage = 1;
        render();
    });
    $("#close-modal").addEventListener("click", hideModal);

    // Event delegation for card buttons
    $("#grid").addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === "details") {
            const item = state.data.find(p => p.id === id);
            if (item) showModal(item);
        } else if (action === "bookmark") {
            if (state.bookmarks.has(id)) {
                state.bookmarks.delete(id);
                btn.textContent = "Bookmark";
            } else {
                state.bookmarks.add(id);
                btn.textContent = "Bookmarked";
            }
            saveBookmarks();
            if (state.onlyBookmarks) render();
        } else if (action === "delete") {
            const isConfirmed = window.confirm("Are you sure you want to delete this item?");
            if (isConfirmed) {
                state.data = state.data.filter(item => item.id !== id);
                let contributions = loadContributions();
                contributions = contributions.filter(item => item.id !== id);
                saveContributions(contributions);
                render();
            }
        }
    });

    $("#contribForm").addEventListener("submit", e => {
        e.preventDefault();
        const form = e.target;
        const newIdea = {
            id: `p${Date.now()}`,
            name: $("#c_name", form).value.trim(),
            category: $("#c_category", form).value.trim(),
            replaces: $("#c_replaces", form).value.trim(),
            tags: $("#c_tags", form).value.split(",").map(t => t.trim()).filter(Boolean),
            materials: $("#c_materials", form).value.split(",").map(m => m.trim()).filter(Boolean),
            certifications: $("#c_certifications", form).value.split(",").map(c => c.trim()).filter(Boolean),
            description: $("#c_description", form).value.trim(),
            impact: { co2: 0, water: 0, waste: 0 },
            links: []
        };
        newIdea.score = calculateScore(newIdea);
        let contributions = loadContributions();
        contributions.unshift(newIdea);
        saveContributions(contributions);
        state.data.unshift(newIdea);
        state.currentPage = 1;
        render();
        form.reset();
    });
}

async function init() {
    try {
        const res = await fetch("assets/data/products.json");
        const productsFromJson = await res.json();
        const contributions = loadContributions();
        // The core data is a combination of user contributions and the initial JSON data.
        state.data = [...contributions, ...productsFromJson];
        const categories = [...new Set(state.data.map(p => p.category).filter(Boolean))].sort();
        renderChips(categories);
        attachEvents();
        render();
    } catch (error) {
        console.error("Failed to initialize app:", error);
        // Fallback to only show user contributions if JSON fetch fails.
        const contributions = loadContributions();
        state.data = contributions;
        const categories = [...new Set(state.data.map(p => p.category).filter(Boolean))].sort();
        renderChips(categories);
        attachEvents();
        render();
    }
}

document.addEventListener("DOMContentLoaded", init);

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $("#modal").style.display === 'block') {
        hideModal();
    }
});
