const STORAGE_KEY = 'minhaslistas:v1'
let state = { items: [], type: 'movies', editingId: null }

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) state = JSON.parse(raw)
    } catch (e) { state = { items: [], type: 'movies', editingId: null } }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

function qs(sel) { return document.querySelector(sel) }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)) }

function openModal(editItem) {
    const modal = qs('#modal')
    modal.classList.remove('hidden')
    if (editItem) {
        state.editingId = editItem.id
        qs('#formTitle').textContent = 'Editar item'
        qs('#typeSelect').value = editItem.type
        qs('#nameInput').value = editItem.name
        qs('#yearInput').value = editItem.year || ''
        qs('#ratingInput').value = editItem.rating || 5
    } else {
        state.editingId = null
        qs('#formTitle').textContent = 'Adicionar item'
        qs('#typeSelect').value = state.type
        qs('#nameInput').value = ''
        qs('#yearInput').value = ''
        qs('#ratingInput').value = 5
        qs('#imageInput').value = ''
    }
}

function closeModal() {
    qs('#modal').classList.add('hidden')
    state.editingId = null
}

function renderList() {
    const list = qs('#itemsList')
    list.innerHTML = ''
    const items = state.items.filter(i => i.type === state.type)
    for (const it of items) {
        const template = qs('#itemTemplate')
        const node = template.content.firstElementChild.cloneNode(true)
        node.dataset.id = it.id
        node.querySelector('.name').textContent = it.name
        node.querySelector('.year').textContent = it.year || ''
        node.querySelector('.rating').textContent = `Vontade: ${it.rating || 5}/10`
        const img = node.querySelector('.thumb')
        if (it.image) img.src = it.image
        else img.removeAttribute('src')
        node.querySelector('.edit').addEventListener('click', () => openModal(it))
        node.querySelector('.delete').addEventListener('click', () => { deleteItem(it.id) })
        addDragHandlers(node)
        list.appendChild(node)
    }
}

function addItem(data) {
    const item = { ...data, id: uid() }
    state.items.push(item)
    saveState()
    renderList()
}

function updateItem(id, data) {
    const idx = state.items.findIndex(i => i.id === id)
    if (idx === -1) return
    state.items[idx] = { ...state.items[idx], ...data }
    saveState(); renderList()
}

function deleteItem(id) {
    state.items = state.items.filter(i => i.id !== id)
    saveState(); renderList()
}

async function fileToDataUrl(file) {
    return new Promise((res, rej) => {
        const fr = new FileReader()
        fr.onload = () => res(fr.result)
        fr.onerror = rej
        fr.readAsDataURL(file)
    })
}

function setupUI() {
    qsa('.tab-button').forEach(btn => btn.addEventListener('click', e => {
        qsa('.tab-button').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        state.type = btn.dataset.type
        saveState()
        renderList()
    }))

    qs('#addItemBtn').addEventListener('click', () => openModal())
    qs('#cancelBtn').addEventListener('click', () => closeModal())

    qs('#itemForm').addEventListener('submit', async (e) => {
        e.preventDefault()
        const type = qs('#typeSelect').value
        const name = qs('#nameInput').value.trim()
        const year = qs('#yearInput').value.trim()
        const rating = Number(qs('#ratingInput').value) || 5
        const file = qs('#imageInput').files[0]
        let image = null
        if (file) image = await fileToDataUrl(file)

        if (state.editingId) {
            updateItem(state.editingId, { type, name, year, rating, image })
        } else {
            addItem({ type, name, year, rating, image })
        }
        closeModal()
    })

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal() })
}

function addDragHandlers(node) {
    node.addEventListener('dragstart', e => {
        node.classList.add('dragging')
        e.dataTransfer.setData('text/plain', node.dataset.id)
        e.dataTransfer.effectAllowed = 'move'
    })
    node.addEventListener('dragend', () => {
        node.classList.remove('dragging')
    })
    const list = qs('#itemsList')
    list.addEventListener('dragover', e => {
        e.preventDefault()
        const after = getDragAfterElement(list, e.clientY)
        const dragging = qs('.dragging')
        if (!dragging) return
        if (after == null) list.appendChild(dragging)
        else list.insertBefore(dragging, after)
    })
    list.addEventListener('drop', () => {
        const ids = Array.from(qs('#itemsList').children).map(li => li.dataset.id)
        const all = state.items.filter(i => i.type === state.type)
        const others = state.items.filter(i => i.type !== state.type)
        const reordered = ids.map(id => all.find(a => a.id === id)).filter(Boolean)
        state.items = [...others, ...reordered]
        saveState(); renderList()
    })
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.item:not(.dragging)')]
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect()
        const offset = y - box.top - box.height / 2
        if (offset < 0 && offset > closest.offset) return { offset, element: child }
        return closest
    }, { offset: Number.NEGATIVE_INFINITY }).element
}

loadState()
setupUI()
renderList()
