// js/app.js

// 1. IMPORTACIONES
import { subscribeToInventory, addDisk, deleteDisk, updateDisk } from "./services/inventory.js";
import { loginWithGoogle, logout, subscribeToAuth } from "./services/auth.js";
import { renderTable, updateKpiCounter, getSelectedIds, clearSelection } from "./ui/dom.js";
import { renderDynamicChart } from "./ui/charts.js";
import { exportToExcel } from "./utils/export-excel.js";
import { exportToPdf } from "./utils/export-pdf.js";
import { handleFileSelect, renderImportPreview, saveSelectedImport, updateSelectionCount } from "./utils/import-excel.js";

// --- REFERENCIAS DOM GLOBALES ---
const loginScreen = document.getElementById("login-screen");
const userControls = document.getElementById("user-controls");
const systemStatus = document.getElementById("system-status-badge");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");

// Modales
const modal = document.getElementById("disk-modal");
const detailModal = document.getElementById("details-modal");
const importModal = document.getElementById("import-modal");
const overlay = document.getElementById("modal-overlay");

// Formularios
const form = document.getElementById("disk-form");
const excelInput = document.getElementById("excel-input");

// Filtros y Buscadores
const searchInput = document.getElementById("search-input");
const filterStatus = document.getElementById("filter-status");
const filterType = document.getElementById("filter-type");
const btnClearFilters = document.getElementById("btn-clear-filters");

// Controles de Gráfico
const chartGroupBy = document.getElementById("chart-group-by");
const chartMetric = document.getElementById("chart-metric");
const chartType = document.getElementById("chart-type");

// Botones de Acción Masiva
const btnBulkDelete = document.getElementById("btn-bulk-delete");
const btnBulkExcel = document.getElementById("btn-bulk-excel");
const btnBulkPdf = document.getElementById("btn-bulk-pdf");

// --- VARIABLES DE ESTADO ---
let currentInventory = [];  // Todos los datos crudos de Firebase
let filteredInventory = []; // Los datos que se ven actualmente en pantalla
let currentDiskId = null;

// =================================================================
// 1. INICIALIZACIÓN Y AUTH
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
    
    subscribeToAuth((user) => {
        if (user) {
            // LOGIN EXITOSO
            loginScreen.style.display = "none";
            userControls.style.display = "flex";
            systemStatus.style.display = "none";
            
            userAvatar.src = user.photoURL;
            userName.textContent = user.displayName.split(" ")[0];

            initAppLogic(); // Arrancar la app
        } else {
            // NO LOGUEADO
            loginScreen.style.display = "flex";
            userControls.style.display = "none";
            systemStatus.style.display = "flex";
            currentInventory = [];
            filteredInventory = [];
        }
    });

    document.getElementById("btn-login").addEventListener("click", loginWithGoogle);
    document.getElementById("btn-logout").addEventListener("click", logout);
});

function initAppLogic() {
    subscribeToInventory((data) => {
        currentInventory = data;
        applyFilters(); // Esto actualiza la tabla y los gráficos
    });
}

// =================================================================
// 2. SISTEMA DE FILTRADO Y GRÁFICOS (EL CEREBRO VISUAL)
// =================================================================

function applyFilters() {
    // 1. Obtener valores de los inputs
    const searchTerm = searchInput.value.toLowerCase();
    const statusVal = filterStatus.value;
    const typeVal = filterType.value;

    // 2. Filtrar el array principal
    filteredInventory = currentInventory.filter(disk => {
        // Filtro de Texto
        const matchText = (
            (disk.serial || '').toLowerCase().includes(searchTerm) ||
            (disk.codigoInterno || '').toLowerCase().includes(searchTerm) ||
            (disk.marca || '').toLowerCase().includes(searchTerm) ||
            (disk.equipoId || '').toLowerCase().includes(searchTerm)
        );

        // Filtro de Estado
        const matchStatus = statusVal === "all" || disk.estado === statusVal;

        // Filtro de Tipo
        const matchType = typeVal === "all" || disk.tipo === typeVal;

        return matchText && matchStatus && matchType;
    });

    // 3. Actualizar UI
    renderTable(filteredInventory);
    updateKpiCounter(filteredInventory.length);
    
    // 4. Actualizar Gráfico Dinámico con los datos filtrados
    updateChart();
}

// Función para redibujar el gráfico según selectores
function updateChart() {
    const groupBy = chartGroupBy.value;
    const metric = chartMetric.value;
    const type = chartType.value;

    renderDynamicChart(filteredInventory, groupBy, metric, type);
}

// LISTENERS DE FILTROS (Se activan al cambiar cualquier cosa)
[searchInput, filterStatus, filterType].forEach(el => {
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
});

// LISTENERS DE GRÁFICO (Se activan al cambiar configuración del chart)
[chartGroupBy, chartMetric, chartType].forEach(el => {
    el.addEventListener("change", updateChart);
});

// Botón Limpiar Filtros
btnClearFilters.addEventListener("click", () => {
    searchInput.value = "";
    filterStatus.value = "all";
    filterType.value = "all";
    applyFilters();
});


// =================================================================
// 3. ACCIONES MASIVAS (BARRA FLOTANTE)
// =================================================================

// ELIMINAR SELECCIONADOS
btnBulkDelete.addEventListener("click", async () => {
    const ids = getSelectedIds();
    if (ids.length === 0) return;

    if (confirm(`⚠ ¿Estás seguro de eliminar ${ids.length} discos seleccionados? Esta acción no tiene vuelta atrás.`)) {
        const btnOriginalText = btnBulkDelete.innerHTML;
        btnBulkDelete.innerHTML = "Eliminando...";
        btnBulkDelete.disabled = true;

        // Eliminar en paralelo (rápido)
        const promises = ids.map(id => deleteDisk(id));
        await Promise.all(promises);

        clearSelection(); // Limpiar checkboxes y ocultar barra
        btnBulkDelete.innerHTML = btnOriginalText;
        btnBulkDelete.disabled = false;
        
        alert("Discos eliminados correctamente.");
    }
});

// EXPORTAR SELECCIONADOS (EXCEL)
btnBulkExcel.addEventListener("click", () => {
    const ids = getSelectedIds();
    // Filtramos solo los objetos que coinciden con los IDs seleccionados
    const selectedData = currentInventory.filter(d => ids.includes(d.id));
    exportToExcel(selectedData);
    clearSelection();
});

// EXPORTAR SELECCIONADOS (PDF)
btnBulkPdf.addEventListener("click", () => {
    const ids = getSelectedIds();
    const selectedData = currentInventory.filter(d => ids.includes(d.id));
    exportToPdf(selectedData);
    clearSelection();
});


// =================================================================
// 4. GESTIÓN DE MODALES (Igual que antes)
// =================================================================

const closeModal = (modalToClose) => {
    modalToClose.close();
    overlay.style.display = "none";
    if(modalToClose === modal) {
        form.reset();
        document.getElementById("disk-id").value = "";
        document.getElementById("modal-title").textContent = "Registrar Disco";
    }
};

const showModal = (modalToShow) => {
    modalToShow.showModal();
    overlay.style.display = "block";
};

document.querySelectorAll(".close-btn, #btn-cancel, #btn-cancel-import").forEach(btn => {
    btn.addEventListener("click", (e) => closeModal(e.target.closest("dialog")));
});

overlay.addEventListener("click", () => document.querySelectorAll("dialog[open]").forEach(d => closeModal(d)));
document.getElementById("btn-open-modal").addEventListener("click", () => showModal(modal));


// =================================================================
// 5. DETALLES Y EDICIÓN (Exposed to Window)
// =================================================================

window.openDetailModal = (disk) => {
    currentDiskId = disk.id;
    const content = document.getElementById("detail-content");
    content.innerHTML = `
        <div class="detail-item"><strong>Código:</strong> ${disk.codigoInterno}</div>
        <div class="detail-item"><strong>Estado:</strong> ${disk.estado}</div>
        <div class="detail-item"><strong>Marca:</strong> ${disk.marca}</div>
        <div class="detail-item"><strong>Tipo:</strong> ${disk.tipo}</div>
        <div class="detail-item"><strong>Capacidad:</strong> ${disk.capacidad} GB</div>
        <div class="detail-item"><strong>N° Serie:</strong> ${disk.serial}</div>
        <div class="detail-item full"><strong>Equipo:</strong> ${disk.equipoId}</div>
        <div class="detail-item full" style="background:#f4f4f4; padding:10px; border:2px solid black; border-radius:8px;">
            <strong>Observaciones:</strong><br>${disk.observaciones || 'Sin observaciones.'}
        </div>
    `;
    showModal(detailModal);
};

window.openEditModal = (id) => {
    const disk = currentInventory.find(d => d.id === id);
    if (!disk) return;
    document.getElementById("disk-id").value = disk.id;
    document.getElementById("internal-code").value = disk.codigoInterno;
    document.getElementById("host-id").value = disk.equipoId;
    document.getElementById("disk-type").value = disk.tipo;
    document.getElementById("capacity").value = disk.capacidad;
    document.getElementById("brand").value = disk.marca;
    document.getElementById("serial-number").value = disk.serial;
    document.getElementById("disk-status").value = disk.estado;
    document.getElementById("purchase-date").value = disk.fechaCompra;
    document.getElementById("install-date").value = disk.fechaInstalacion;
    document.getElementById("observations").value = disk.observaciones;
    document.getElementById("modal-title").textContent = "Editar Disco";
    showModal(modal);
}

document.getElementById("btn-detail-edit").addEventListener("click", () => {
    closeModal(detailModal);
    window.openEditModal(currentDiskId);
});

document.getElementById("btn-detail-delete").addEventListener("click", async () => {
    if(confirm("⚠ ¿Eliminar este disco?")) {
        await deleteDisk(currentDiskId);
        closeModal(detailModal);
    }
});


// =================================================================
// 6. GUARDAR FORMULARIO
// =================================================================
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const diskId = document.getElementById("disk-id").value;
    const btn = form.querySelector("button[type='submit']");
    btn.textContent = "Guardando...";
    btn.disabled = true;

    const formData = {
        codigoInterno: document.getElementById("internal-code").value,
        equipoId: document.getElementById("host-id").value,
        tipo: document.getElementById("disk-type").value,
        capacidad: Number(document.getElementById("capacity").value),
        marca: document.getElementById("brand").value,
        serial: document.getElementById("serial-number").value,
        estado: document.getElementById("disk-status").value,
        fechaCompra: document.getElementById("purchase-date").value,
        fechaInstalacion: document.getElementById("install-date").value,
        observaciones: document.getElementById("observations").value
    };

    try {
        if (diskId) await updateDisk(diskId, formData);
        else await addDisk(formData);
        closeModal(modal);
    } catch (err) { alert(err.message); }
    
    btn.textContent = "Guardar";
    btn.disabled = false;
});


// =================================================================
// 7. IMPORTACIÓN EXCEL
// =================================================================
document.getElementById("btn-import-excel").addEventListener("click", () => excelInput.click());
excelInput.addEventListener("change", (e) => {
    handleFileSelect(e, (data) => {
        renderImportPreview(data);
        showModal(importModal);
        excelInput.value = "";
    });
});
document.getElementById("select-all-import").addEventListener("change", (e) => {
    document.querySelectorAll(".import-checkbox").forEach(cb => cb.checked = e.target.checked);
    updateSelectionCount();
});
document.getElementById("btn-save-import").addEventListener("click", async () => {
    const btn = document.getElementById("btn-save-import");
    btn.textContent = "Guardando...";
    const count = await saveSelectedImport();
    if (count > 0) {
        alert(`¡Importados ${count} discos!`);
        closeModal(importModal);
    }
    btn.textContent = "Guardar Selección";
});