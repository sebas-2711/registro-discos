// js/ui/dom.js

/**
 * GESTOR DEL DOM - COMFAMILIAR RISARALDA
 * Maneja la renderización de tablas, selección múltiple y estados visuales.
 */

// --- ESTADO LOCAL DE SELECCIÓN ---
let selectedIds = new Set();

// --- REFERENCIAS AL DOM ---
const tableBody = document.getElementById("table-body");
const totalDisplay = document.getElementById("total-disks-display");
const floatingBar = document.getElementById("floating-actions");
const selectedCountSpan = document.getElementById("selected-count");
const selectAllCheckbox = document.getElementById("select-all-main");

/**
 * Renderiza la tabla de inventario principal
 * @param {Array} data - Lista de discos filtrados o totales
 */
export function renderTable(data) {
    tableBody.innerHTML = "";
    
    // 1. Manejo de Estado Vacío
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state-container" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        <i class="ph-bold ph-magnifying-glass" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem; display: block;"></i>
                        <p style="font-weight: 500;">No se encontraron activos con estos filtros.</p>
                        <small>Intenta ajustar la búsqueda o los filtros de marca/capacidad.</small>
                    </div>
                </td>
            </tr>`;
        updateFloatingBar();
        return;
    }

    // 2. Construcción de Filas
    data.forEach(disk => {
        const tr = document.createElement("tr");
        tr.className = "interactive-row";
        
        // Verificar si el ID ya estaba seleccionado (para persistencia visual al filtrar)
        const isChecked = selectedIds.has(disk.id) ? "checked" : "";

        tr.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="row-checkbox" data-id="${disk.id}" ${isChecked} 
                       style="transform: scale(1.2); cursor: pointer; accent-color: var(--primary);">
            </td>
            <td><strong style="color: var(--primary);">${disk.codigoInterno}</strong></td>
            <td>${disk.equipoId || '<span style="opacity:0.3">---</span>'}</td>
            <td><small>${disk.tipo}</small></td>
            <td>${disk.marca}</td>
            <td><strong>${disk.capacidad} GB</strong></td>
            <td><code style="font-size: 0.8rem;">${disk.serial}</code></td>
            <td>
                <span class="status-badge ${getStatusClass(disk.estado)}">
                    ${disk.estado}
                </span>
            </td>
            <td style="text-align: right;">
                 <button class="neo-btn small ghost icon-only btn-edit-row" data-id="${disk.id}" title="Editar Registro">
                    <i class="ph-bold ph-pencil-simple"></i>
                </button>
            </td>
        `;

        // --- EVENTOS DE INTERACCIÓN ---

        // A. Selección Individual (Checkbox)
        const checkbox = tr.querySelector(".row-checkbox");
        checkbox.addEventListener("click", (e) => {
            e.stopPropagation(); // Evita abrir detalles al marcar el cuadro
            toggleSelection(disk.id);
        });

        // B. Botón Editar Rápido
        const btnEdit = tr.querySelector(".btn-edit-row");
        btnEdit.addEventListener("click", (e) => {
            e.stopPropagation();
            if (window.openEditModal) window.openEditModal(disk.id);
        });

        // C. Clic en Fila (Ver Ficha Técnica)
        tr.addEventListener("click", (e) => {
            // No abrir si el clic fue en un botón o input
            if (e.target.tagName !== 'INPUT' && e.target.closest('button') === null) {
                if (window.openDetailModal) window.openDetailModal(disk);
            }
        });

        tableBody.appendChild(tr);
    });

    // Sincronizar el checkbox maestro tras renderizar
    syncSelectAllCheckbox();
}

/**
 * Agrega o quita un ID del set de selección
 */
function toggleSelection(id) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
    } else {
        selectedIds.add(id);
    }
    updateFloatingBar();
    syncSelectAllCheckbox();
}

/**
 * Muestra u oculta la barra de acciones masivas según la selección
 */
function updateFloatingBar() {
    const count = selectedIds.size;
    if (selectedCountSpan) selectedCountSpan.textContent = count;

    if (count > 0) {
        floatingBar.classList.add("active");
    } else {
        floatingBar.classList.remove("active");
    }
}

/**
 * Escucha el checkbox maestro para seleccionar/desmarcar todo lo VISIBLE
 */
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        const visibleCheckboxes = document.querySelectorAll(".row-checkbox");
        
        visibleCheckboxes.forEach(cb => {
            cb.checked = isChecked;
            const id = cb.dataset.id;
            if (isChecked) selectedIds.add(id);
            else selectedIds.delete(id);
        });
        
        updateFloatingBar();
    });
}

/**
 * Verifica si todos los elementos visibles están marcados para activar el maestro
 */
function syncSelectAllCheckbox() {
    const visibleCheckboxes = document.querySelectorAll(".row-checkbox");
    if (visibleCheckboxes.length === 0) {
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        return;
    }
    
    const allVisibleChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
    if (selectAllCheckbox) selectAllCheckbox.checked = allVisibleChecked;
}

// --- EXPORTS DE UTILIDAD ---

/**
 * Retorna Array con IDs seleccionados
 */
export function getSelectedIds() {
    return Array.from(selectedIds);
}

/**
 * Limpia la selección actual (usar después de borrar o exportar)
 */
export function clearSelection() {
    selectedIds.clear();
    updateFloatingBar();
    const visibleCheckboxes = document.querySelectorAll(".row-checkbox");
    visibleCheckboxes.forEach(cb => cb.checked = false);
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
}

/**
 * Actualiza el contador KPI central
 */
export function updateKpiCounter(count) {
    if (totalDisplay) {
        totalDisplay.textContent = count;
        // Pequeña animación de escala al cambiar
        totalDisplay.style.transform = "scale(1.1)";
        setTimeout(() => totalDisplay.style.transform = "scale(1)", 200);
    }
}

/**
 * Mapea el texto del estado a clases CSS corporativas
 */
function getStatusClass(status) {
    const s = String(status).toLowerCase();
    if (s.includes("bueno") || s.includes("operativo")) return "bueno";
    if (s.includes("malo") || s.includes("baja")) return "malo";
    return "revisar"; // Para "Por revisar" o "En revisión"
}