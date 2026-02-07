// js/ui/dom.js

// --- ESTADO DE SELECCIÓN ---
// Usamos un Set para guardar IDs únicos de forma eficiente
let selectedIds = new Set();

// --- REFERENCIAS DOM ---
const tableBody = document.getElementById("table-body");
const totalDisplay = document.getElementById("total-disks-display");
const floatingBar = document.getElementById("floating-actions");
const selectedCountSpan = document.getElementById("selected-count");
const selectAllCheckbox = document.getElementById("select-all-main");

// ==========================================
// 1. RENDERIZADO DE TABLA (CON CHECKBOXES)
// ==========================================
export function renderTable(data) {
    tableBody.innerHTML = "";
    
    // Si no hay datos, mostramos estado vacío
    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state-container">
                        <i class="ph-bold ph-ghost empty-state-icon"></i>
                        <p>No se encontraron discos con los filtros actuales.</p>
                    </div>
                </td>
            </tr>`;
        updateFloatingBar(); // Aseguramos que se oculte la barra si no hay nada
        return;
    }

    data.forEach(disk => {
        const tr = document.createElement("tr");
        tr.className = "interactive-row";
        
        // Verificamos si este disco ya estaba seleccionado previamente
        const isChecked = selectedIds.has(disk.id) ? "checked" : "";

        tr.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="row-checkbox" data-id="${disk.id}" ${isChecked} style="transform: scale(1.2); cursor: pointer;">
            </td>
            <td><strong>${disk.codigoInterno}</strong></td>
            <td>${disk.equipoId || '-'}</td>
            <td>${disk.tipo}</td>
            <td>${disk.marca}</td>
            <td>${disk.capacidad} GB</td>
            <td><small>${disk.serial}</small></td>
            <td><span class="status-badge ${getStatusClass(disk.estado)}">${disk.estado}</span></td>
            <td style="text-align: right;">
                 <button class="neo-btn small ghost btn-edit-row" data-id="${disk.id}">
                    <i class="ph-bold ph-pencil-simple"></i>
                </button>
            </td>
        `;

        // --- MANEJO DE CLICS INTELIGENTE ---
        
        // 1. Clic en el Checkbox (Seleccionar/Deseleccionar)
        const checkbox = tr.querySelector(".row-checkbox");
        checkbox.addEventListener("click", (e) => {
            e.stopPropagation(); // Evita que se abra el modal de detalles
            toggleSelection(disk.id);
        });

        // 2. Clic en botón editar (Editar directo)
        const btnEdit = tr.querySelector(".btn-edit-row");
        btnEdit.addEventListener("click", (e) => {
            e.stopPropagation();
            window.openEditModal(disk.id);
        });

        // 3. Clic en la fila (Ver Detalles)
        tr.addEventListener("click", (e) => {
            // Si el clic NO fue en un input o botón, abrimos detalles
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                window.openDetailModal(disk);
            }
        });

        tableBody.appendChild(tr);
    });
}

// ==========================================
// 2. LÓGICA DE SELECCIÓN Y BARRA FLOTANTE
// ==========================================

// Función para agregar/quitar ID del Set
function toggleSelection(id) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
    } else {
        selectedIds.add(id);
    }
    updateFloatingBar();
    syncSelectAllCheckbox(); // Verificar si debemos marcar/desmarcar el "Select All"
}

// Actualizar visualmente la barra negra flotante
function updateFloatingBar() {
    const count = selectedIds.size;
    selectedCountSpan.textContent = count;

    if (count > 0) {
        floatingBar.classList.add("active"); // Mostrar
    } else {
        floatingBar.classList.remove("active"); // Ocultar
    }
}

// Manejo del Checkbox Maestro "Seleccionar Todos"
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        const allCheckboxes = document.querySelectorAll(".row-checkbox");
        
        allCheckboxes.forEach(cb => {
            cb.checked = isChecked;
            const id = cb.dataset.id;
            if (isChecked) selectedIds.add(id);
            else selectedIds.delete(id);
        });
        
        updateFloatingBar();
    });
}

// Sincronizar el checkbox maestro (si desmarco uno manual, el maestro se desmarca)
function syncSelectAllCheckbox() {
    const allCheckboxes = document.querySelectorAll(".row-checkbox");
    if (allCheckboxes.length === 0) return;
    
    // Si todos los checkboxes visibles están marcados, marca el maestro
    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
    selectAllCheckbox.checked = allChecked;
}

// ==========================================
// 3. EXPORTAR UTILIDADES PARA APP.JS
// ==========================================

// Para obtener los IDs seleccionados desde app.js (para borrar/exportar)
export function getSelectedIds() {
    return Array.from(selectedIds);
}

// Para limpiar la selección después de una acción (ej: después de borrar)
export function clearSelection() {
    selectedIds.clear();
    updateFloatingBar();
    if(selectAllCheckbox) selectAllCheckbox.checked = false;
    // Nota: Deberíamos re-renderizar la tabla externamente o desmarcar inputs manualmente
    document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = false);
}

// Actualizar el contador grande del dashboard
export function updateKpiCounter(count) {
    if(totalDisplay) totalDisplay.textContent = count;
}

// Helper de colores
function getStatusClass(status) {
    if (status === "Bueno") return "bueno";
    if (status === "Malo") return "malo";
    return "revisar";
}