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
const filterBrand = document.getElementById("filter-brand");     // Nuevo
const filterCapacity = document.getElementById("filter-capacity"); // Nuevo
const btnClearFilters = document.getElementById("btn-clear-filters");

// Controles de Gráfico
const chartGroupBy = document.getElementById("chart-group-by");
const chartMetric = document.getElementById("chart-metric");
const chartType = document.getElementById("chart-type");

// Botones de Acción Masiva
const btnBulkDelete = document.getElementById("btn-bulk-delete");
const btnBulkExcel = document.getElementById("btn-bulk-excel");
const btnBulkPdf = document.getElementById("btn-bulk-pdf");

// Botón Tema
const btnTheme = document.getElementById("btn-theme-toggle");
const themeIcon = document.getElementById("theme-icon");

// --- VARIABLES DE ESTADO ---
let currentInventory = [];  
let filteredInventory = []; 
let currentDiskId = null;

// =================================================================
// 1. INICIALIZACIÓN Y AUTH
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
    
    // A. Cargar Tema Guardado
    initTheme();

    // B. Auth Observer
    subscribeToAuth((user) => {
        if (user) {
            // LOGIN EXITOSO
            loginScreen.style.display = "none";
            userControls.style.display = "flex";
            systemStatus.style.display = "none";
            
            userAvatar.src = user.photoURL;
            userName.textContent = user.displayName.split(" ")[0];

            initAppLogic(); 
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
        populateBrandFilter(data); // Llenar select de marcas dinámicamente
        applyFilters(); 
    });
}

// =================================================================
// 2. SISTEMA DE FILTRADO (EL CEREBRO)
// =================================================================

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusVal = filterStatus.value;
    const typeVal = filterType.value;
    const brandVal = filterBrand.value;
    const capacityVal = filterCapacity.value;

    filteredInventory = currentInventory.filter(disk => {
        // 1. Texto (Buscador)
        const matchText = (
            (disk.serial || '').toLowerCase().includes(searchTerm) ||
            (disk.codigoInterno || '').toLowerCase().includes(searchTerm) ||
            (disk.marca || '').toLowerCase().includes(searchTerm) ||
            (disk.equipoId || '').toLowerCase().includes(searchTerm)
        );

        // 2. Selectores Exactos
        const matchStatus = statusVal === "all" || disk.estado === statusVal;
        const matchType = typeVal === "all" || disk.tipo === typeVal;
        
        // 3. Marca (Case insensitive y flexible)
        const matchBrand = brandVal === "all" || 
                           (disk.marca || '').toLowerCase().includes(brandVal.toLowerCase());

        // 4. Capacidad (Lógica de Rangos)
        let matchCapacity = true;
        if (capacityVal !== "all") {
            const cap = Number(disk.capacidad);
            if (capacityVal === "240") matchCapacity = (cap >= 230 && cap <= 260); // 240, 250, 256
            else if (capacityVal === "480") matchCapacity = (cap >= 470 && cap <= 520); // 480, 500, 512
            else if (capacityVal === "1000") matchCapacity = (cap >= 900 && cap <= 1100); // 1TB
            else if (capacityVal === "2000") matchCapacity = (cap >= 1900 && cap <= 2100); // 2TB
            else matchCapacity = (cap == Number(capacityVal));
        }

        return matchText && matchStatus && matchType && matchBrand && matchCapacity;
    });

    renderTable(filteredInventory);
    updateKpiCounter(filteredInventory.length);
    updateChart();
}

// Función auxiliar para llenar el select de marcas con las que existen
function populateBrandFilter(data) {
    const brands = new Set(data.map(d => d.marca).filter(Boolean));
    // Guardamos la selección actual para no perderla al recargar
    const currentVal = filterBrand.value;
    
    // Limpiamos opciones (dejando la primera "Todas")
    while (filterBrand.options.length > 1) {
        filterBrand.remove(1);
    }

    // Ordenamos y agregamos
    Array.from(brands).sort().forEach(brand => {
        const option = document.createElement("option");
        option.value = brand;
        option.textContent = brand;
        filterBrand.appendChild(option);
    });

    // Restauramos selección si existe
    if (Array.from(filterBrand.options).some(o => o.value === currentVal)) {
        filterBrand.value = currentVal;
    }
}

// Actualizar Gráfico
function updateChart() {
    const groupBy = chartGroupBy.value;
    const metric = chartMetric.value;
    const type = chartType.value;
    renderDynamicChart(filteredInventory, groupBy, metric, type);
}

// LISTENERS DE FILTROS
[searchInput, filterStatus, filterType, filterBrand, filterCapacity].forEach(el => {
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
});

[chartGroupBy, chartMetric, chartType].forEach(el => {
    el.addEventListener("change", updateChart);
});

btnClearFilters.addEventListener("click", () => {
    searchInput.value = "";
    filterStatus.value = "all";
    filterType.value = "all";
    filterBrand.value = "all";
    filterCapacity.value = "all";
    applyFilters();
});


// =================================================================
// 3. MODO OSCURO (PERSISTENTE)
// =================================================================
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.body.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
}

btnTheme.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme");
    const newTheme = current === "light" ? "dark" : "light";
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    themeIcon.className = theme === "dark" ? "ph-bold ph-sun" : "ph-bold ph-moon";
}


// =================================================================
// 4. ACCIONES MASIVAS
// =================================================================
btnBulkDelete.addEventListener("click", async () => {
    const ids = getSelectedIds();
    if (ids.length === 0) return;
    if (confirm(`⚠ ¿Eliminar ${ids.length} discos seleccionados?`)) {
        const originalText = btnBulkDelete.innerHTML;
        btnBulkDelete.innerHTML = "Eliminando...";
        btnBulkDelete.disabled = true;
        
        await Promise.all(ids.map(id => deleteDisk(id)));
        
        clearSelection();
        btnBulkDelete.innerHTML = originalText;
        btnBulkDelete.disabled = false;
        alert("Discos eliminados.");
    }
});

btnBulkExcel.addEventListener("click", () => {
    const ids = getSelectedIds();
    const data = currentInventory.filter(d => ids.includes(d.id));
    exportToExcel(data);
    clearSelection();
});

btnBulkPdf.addEventListener("click", () => {
    const ids = getSelectedIds();
    const data = currentInventory.filter(d => ids.includes(d.id));
    exportToPdf(data);
    clearSelection();
});


// =================================================================
// 5. MODALES Y FORMULARIOS
// =================================================================
const closeModal = (modalToClose) => {
    modalToClose.close();
    overlay.style.display = "none";
    if(modalToClose === modal) {
        form.reset();
        document.getElementById("disk-id").value = "";
        document.getElementById("modal-title").textContent = "Registrar Activo";
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


// DETALLES Y EDICIÓN (Globales)
window.openDetailModal = (disk) => {
    currentDiskId = disk.id;
    const content = document.getElementById("detail-content");
    content.innerHTML = `
        <div class="detail-item"><strong>Código:</strong> ${disk.codigoInterno}</div>
        <div class="detail-item"><strong>Estado:</strong> <span class="status-badge ${disk.estado === 'Bueno' ? 'bueno' : disk.estado === 'Malo' ? 'malo' : 'revisar'}">${disk.estado}</span></div>
        <div class="detail-item"><strong>Marca:</strong> ${disk.marca}</div>
        <div class="detail-item"><strong>Tipo:</strong> ${disk.tipo}</div>
        <div class="detail-item"><strong>Capacidad:</strong> ${disk.capacidad} GB</div>
        <div class="detail-item"><strong>N° Serie:</strong> ${disk.serial}</div>
        <div class="detail-item full"><strong>Ubicación:</strong> ${disk.equipoId}</div>
        <div class="detail-item full" style="background:var(--bg-color); padding:10px; border:1px solid var(--border-color); border-radius:8px;">
            <strong>Observaciones:</strong><br>${disk.observaciones || '---'}
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
    document.getElementById("modal-title").textContent = "Editar Activo";
    showModal(modal);
}

document.getElementById("btn-detail-edit").addEventListener("click", () => {
    closeModal(detailModal);
    window.openEditModal(currentDiskId);
});

document.getElementById("btn-detail-delete").addEventListener("click", async () => {
    if(confirm("⚠ ¿Dar de baja este activo?")) {
        await deleteDisk(currentDiskId);
        closeModal(detailModal);
    }
});


// GUARDAR FORMULARIO
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const diskId = document.getElementById("disk-id").value;
    const btn = form.querySelector("button[type='submit']");
    btn.textContent = "Procesando...";
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
    
    btn.textContent = "Guardar Cambios";
    btn.disabled = false;
});


// IMPORTACIÓN
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
    btn.textContent = "Cargando...";
    const count = await saveSelectedImport();
    if (count > 0) {
        alert(`¡Importación exitosa de ${count} registros!`);
        closeModal(importModal);
    }
    btn.textContent = "Confirmar Importación";
});