// js/utils/import-excel.js
import { addDisk } from "../services/inventory.js";

/**
 * GESTOR DE IMPORTACIÓN - COMFAMILIAR RISARALDA
 * Traduce formatos de Excel externos al esquema institucional.
 */

let importedDataCache = []; // Cache temporal para previsualización

// 1. PROCESAMIENTO DEL ARCHIVO EXCEL
export const handleFileSelect = (event, callback) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convertimos a JSON plano
        const rawData = XLSX.utils.sheet_to_json(sheet);
        
        // Mapeo inteligente de columnas institucionales
        importedDataCache = rawData.map((row, index) => {
            let marca = row['Marca'] || 'Genérico';
            let capacidad = row['Capacidad'] || 0;
            
            // Lógica para columnas combinadas tipo "HGST 1TB"
            if (row['Marca y capacidad']) {
                const parsed = parseMarcaCapacidad(row['Marca y capacidad']);
                marca = parsed.marca;
                capacidad = parsed.capacidad;
            }

            // Traducción de estados operativos
            let estadoRaw = row['Estado del disco'] || row['Estado'] || 'Bueno';
            let estado = 'Bueno';
            if (estadoRaw === 'A' || estadoRaw === 'Operativo') estado = 'Bueno';
            else if (estadoRaw === 'M' || estadoRaw === 'Baja') estado = 'Malo';
            else estado = 'Por revisar';

            return {
                tempId: index,
                codigoInterno: row['D /Código interno de la aplicación'] || row['Codigo'] || 'S/N',
                equipoId: row['ID del equipo donde se almacena físicamente las unidades de disco'] || row['Equipo'] || '',
                tipo: row['Tipo'] || 'HDD',
                marca: marca,
                capacidad: capacidad,
                serial: row['No. de Serie'] || row['Serie'] || 'S/N',
                estado: estado,
                observaciones: row['Observaciones'] || '',
                fechaCompra: new Date().toISOString().split('T')[0],
                fechaInstalacion: ''
            };
        });

        callback(importedDataCache);
    };
    
    reader.readAsArrayBuffer(file);
};

// 2. RENDERIZADO DE PREVISUALIZACIÓN (Compatible con Modo Oscuro)
export const renderImportPreview = (data) => {
    const tbody = document.getElementById("import-table-body");
    if (!tbody) return;
    
    tbody.innerHTML = "";

    data.forEach(disk => {
        const tr = document.createElement("tr");
        // Estilos dinámicos para que se vea bien en cualquier tema
        tr.style.borderBottom = "1px solid var(--border-color)";
        
        tr.innerHTML = `
            <td style="text-align: center; padding: 10px;">
                <input type="checkbox" class="import-checkbox" data-id="${disk.tempId}" checked 
                       style="transform: scale(1.4); cursor: pointer; accent-color: var(--primary);">
            </td>
            <td style="color: var(--text-color); font-weight: 500;">${disk.codigoInterno}</td>
            <td style="color: var(--text-color);">${disk.marca}</td>
            <td style="color: var(--text-color); font-family: monospace;">${disk.serial}</td>
            <td style="color: var(--primary); font-weight: bold;">${disk.capacidad} GB</td>
        `;
        tbody.appendChild(tr);
    });

    updateSelectionCount();
};

// 3. GUARDAR SELECCIÓN EN FIREBASE
export const saveSelectedImport = async () => {
    const checkboxes = document.querySelectorAll(".import-checkbox:checked");
    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
    
    const disksToSave = importedDataCache.filter(d => selectedIds.includes(d.tempId));
    
    if (disksToSave.length === 0) {
        alert("Selecciona al menos un registro para importar.");
        return 0;
    }

    const promises = disksToSave.map(disk => {
        const { tempId, ...diskData } = disk; // Limpiamos ID temporal antes de subir
        return addDisk(diskData);
    });

    await Promise.all(promises);
    return disksToSave.length;
};

// --- UTILIDADES ---

export const updateSelectionCount = () => {
    const count = document.querySelectorAll(".import-checkbox:checked").length;
    const counter = document.getElementById("import-count");
    if (counter) counter.textContent = `${count} seleccionados`;
};

function parseMarcaCapacidad(texto) {
    const str = String(texto).trim();
    const match = str.match(/(\d+)\s*(TB|GB)/i);
    
    if (match) {
        let num = parseInt(match[1]);
        let unidad = match[2].toUpperCase();
        let totalGB = (unidad === 'TB') ? num * 1000 : num;
        let marcaLimpia = str.replace(match[0], '').trim() || 'Genérico';
        return { marca: marcaLimpia, capacidad: totalGB };
    }
    return { marca: str, capacidad: 0 };
}