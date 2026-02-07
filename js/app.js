// js/app.js

// 1. IMPORTACIONES DE SERVICIOS
import { subscribeToInventory, addDisk, deleteDisk, updateDisk } from "./services/inventory.js";
import { loginWithGoogle, logout, subscribeToAuth } from "./services/auth.js";

// 2. IMPORTACIONES DE UI Y UTILIDADES
import { renderTable, updateKpiCounter } from "./ui/dom.js";
import { renderBrandChart } from "./ui/charts.js";
import { exportToExcel } from "./utils/export-excel.js";
import { exportToPdf } from "./utils/export-pdf.js";
import { handleFileSelect, renderImportPreview, saveSelectedImport, updateSelectionCount } from "./utils/import-excel.js";

// --- REFERENCIAS GLOBALES DEL DOM ---
const loginScreen = document.getElementById("login-screen");
const userControls = document.getElementById("user-controls");
const systemStatus = document.getElementById("system-status-badge");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");

// Modales
const modal = document.getElementById("disk-modal");         // Crear/Editar
const detailModal = document.getElementById("details-modal"); // Ver Detalles
const importModal = document.getElementById("import-modal");  // Importar Excel
const overlay = document.getElementById("modal-overlay");

// Formularios e Inputs
const form = document.getElementById("disk-form");
const excelInput = document.getElementById("excel-input");
const searchInput = document.getElementById("search-input");

// Variables de Estado
let currentInventory = []; 
let currentDiskId = null; // ID del disco que estamos viendo/editando actualmente

// =================================================================
// 1. INICIALIZACIÓN Y SEGURIDAD (ENTRY POINT)
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
    
    // Escuchar cambios en la autenticación (Login/Logout)
    subscribeToAuth((user) => {
        if (user) {
            // === USUARIO AUTENTICADO ===
            console.log("Sesión iniciada:", user.displayName);
            
            // 1. UI: Quitar bloqueo y mostrar perfil
            loginScreen.style.display = "none";
            userControls.style.display = "flex";
            systemStatus.style.display = "none";
            
            // 2. Cargar datos del usuario
            userAvatar.src = user.photoURL;
            userName.textContent = user.displayName.split(" ")[0]; // Solo el primer nombre

            // 3. Cargar la App (Base de datos)
            initAppLogic();

        } else {
            // === USUARIO NO AUTENTICADO ===
            console.log("Esperando login...");
            
            // 1. UI: Poner muro de bloqueo
            loginScreen.style.display = "flex";
            userControls.style.display = "none";
            systemStatus.style.display = "flex";
            
            // 2. Limpiar datos sensibles de la memoria (opcional pero recomendado)
            currentInventory = [];
            renderTable([]);
        }
    });

    // Conectar botones de Auth
    document.getElementById("btn-login").addEventListener("click", loginWithGoogle);
    document.getElementById("btn-logout").addEventListener("click", logout);
});

// Función para arrancar la lógica de negocio (Solo si hay login)
function initAppLogic() {
    subscribeToInventory((data) => {
        currentInventory = data; // Guardamos copia local para buscar/exportar
        renderTable(data);
        updateKpiCounter(data.length);
        renderBrandChart(data);
    });
}

// =================================================================
// 2. GESTIÓN DE MODALES (ABRIR / CERRAR)
// =================================================================

// Función genérica para cerrar cualquier modal
const closeModal = (modalToClose) => {
    modalToClose.close(); // Método nativo del <dialog>
    overlay.style.display = "none";
    
    // Si cerramos el formulario de creación, limpiamos los campos
    if(modalToClose === modal) {
        form.reset();
        document.getElementById("disk-id").value = "";
        document.getElementById("modal-title").textContent = "Registrar Nuevo Disco";
    }
};

// Función genérica para abrir cualquier modal
const showModal = (modalToShow) => {
    modalToShow.showModal();
    overlay.style.display = "block";
};

// Listeners para botones de cerrar (X) y cancelar
document.querySelectorAll(".close-btn, #btn-cancel, #btn-cancel-import").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const modalElement = e.target.closest("dialog");
        closeModal(modalElement);
    });
});

// Cerrar al hacer click fuera (Overlay)
overlay.addEventListener("click", () => {
    document.querySelectorAll("dialog[open]").forEach(dialog => closeModal(dialog));
});

// Abrir Modal de "Añadir Disco"
document.getElementById("btn-open-modal").addEventListener("click", () => showModal(modal));


// =================================================================
// 3. LOGICA DE DETALLES Y EDICIÓN (FILAS INTERACTIVAS)
// =================================================================

// EXPOSE GLOBAL: Esta función se llama desde `dom.js` al hacer click en una fila
window.openDetailModal = (disk) => {
    currentDiskId = disk.id;
    
    const content = document.getElementById("detail-content");
    content.innerHTML = `
        <div class="detail-item"><strong>Código:</strong> ${disk.codigoInterno}</div>
        <div class="detail-item"><strong>Estado:</strong> <span class="status-badge ${getStatusClass(disk.estado)}">${disk.estado}</span></div>
        <div class="detail-item"><strong>Marca:</strong> ${disk.marca}</div>
        <div class="detail-item"><strong>Tipo:</strong> ${disk.tipo}</div>
        <div class="detail-item"><strong>Capacidad:</strong> ${disk.capacidad} GB</div>
        <div class="detail-item"><strong>N° Serie:</strong> ${disk.serial}</div>
        <div class="detail-item full"><strong>Ubicación / Equipo:</strong> ${disk.equipoId}</div>
        <div class="detail-item full" style="background:#f4f4f4; padding:10px; border:2px solid black; border-radius: 8px;">
            <strong>Observaciones:</strong><br>${disk.observaciones || 'Sin observaciones registradas.'}
        </div>
        <div class="detail-item" style="font-size: 0.8rem; color: #666; margin-top: 1rem;">
            Compra: ${disk.fechaCompra || '-'}
        </div>
        <div class="detail-item" style="font-size: 0.8rem; color: #666; margin-top: 1rem;">
            Instalación: ${disk.fechaInstalacion || '-'}
        </div>
    `;
    showModal(detailModal);
};

// EXPOSE GLOBAL: Función para abrir el formulario en modo "Editar"
window.openEditModal = (id) => {
    const disk = currentInventory.find(d => d.id === id);
    if (!disk) return;

    // Llenar el formulario con los datos existentes
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

    // Cambiar título del modal
    document.getElementById("modal-title").textContent = "Editar Información del Disco";
    
    // Mostrar modal
    showModal(modal);
}

// Botón "Editar" dentro del modal de detalles
document.getElementById("btn-detail-edit").addEventListener("click", () => {
    closeModal(detailModal); // Cerramos la ficha de detalles
    window.openEditModal(currentDiskId); // Abrimos el formulario de edición
});

// Botón "Eliminar" dentro del modal de detalles
document.getElementById("btn-detail-delete").addEventListener("click", async () => {
    if(confirm("⚠ ¿Estás seguro de ELIMINAR este disco permanentemente?")) {
        await deleteDisk(currentDiskId);
        closeModal(detailModal);
    }
});

// Helper para clases de color (necesario si renderizamos HTML manual aquí)
function getStatusClass(status) {
    if (status === "Bueno") return "bueno";
    if (status === "Malo") return "malo";
    return "revisar";
}

// =================================================================
// 4. GUARDAR DATOS (CREATE / UPDATE)
// =================================================================
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const diskId = document.getElementById("disk-id").value; // Si tiene ID, es editar. Si no, es crear.
    const submitBtn = form.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    
    // Feedback visual
    submitBtn.textContent = "Guardando...";
    submitBtn.disabled = true;

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
        if (diskId) {
            await updateDisk(diskId, formData);
        } else {
            await addDisk(formData);
        }
        closeModal(modal);
    } catch (error) {
        alert("Error al guardar: " + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});


// =================================================================
// 5. IMPORTACIÓN MASIVA (EXCEL)
// =================================================================
document.getElementById("btn-import-excel").addEventListener("click", () => excelInput.click());

excelInput.addEventListener("change", (e) => {
    handleFileSelect(e, (data) => {
        renderImportPreview(data);
        showModal(importModal);
        excelInput.value = ""; // Limpiar input para permitir recargar el mismo archivo
    });
});

document.getElementById("select-all-import").addEventListener("change", (e) => {
    const checkboxes = document.querySelectorAll(".import-checkbox");
    checkboxes.forEach(cb => cb.checked = e.target.checked);
    updateSelectionCount();
});

// Delegación de eventos para la tabla de importación (checkboxes dinámicos)
document.getElementById("import-table-body").addEventListener("change", (e) => {
    if (e.target.classList.contains("import-checkbox")) {
        updateSelectionCount();
    }
});

document.getElementById("btn-save-import").addEventListener("click", async () => {
    const btn = document.getElementById("btn-save-import");
    const originalText = btn.textContent;
    btn.textContent = "Guardando...";
    btn.disabled = true;

    const count = await saveSelectedImport();
    
    if (count > 0) {
        alert(`✅ Se importaron ${count} discos correctamente.`);
        closeModal(importModal);
    }
    
    btn.textContent = originalText;
    btn.disabled = false;
});


// =================================================================
// 6. HERRAMIENTAS (BUSCADOR Y EXPORTACIÓN)
// =================================================================

// Buscador en tiempo real
searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    
    const filtered = currentInventory.filter(d => 
        (d.serial || '').toLowerCase().includes(term) ||
        (d.codigoInterno || '').toLowerCase().includes(term) ||
        (d.marca || '').toLowerCase().includes(term) ||
        (d.equipoId || '').toLowerCase().includes(term)
    );
    
    renderTable(filtered);
});

// Botones de Exportar
document.getElementById("btn-export-excel").addEventListener("click", () => {
    if(currentInventory.length > 0) exportToExcel(currentInventory);
    else alert("No hay datos para exportar.");
});

document.getElementById("btn-export-pdf").addEventListener("click", () => {
    if(currentInventory.length > 0) exportToPdf(currentInventory);
    else alert("No hay datos para exportar.");
});