// js/ui/dom.js

const tableBody = document.getElementById("table-body");
const totalDisplay = document.getElementById("total-disks-display");

export function renderTable(data) {
    tableBody.innerHTML = "";
    
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem;">No hay discos registrados.</td></tr>`;
        return;
    }

    data.forEach(disk => {
        const tr = document.createElement("tr");
        
        // Clase para CSS (cursor pointer y hover)
        tr.className = "interactive-row"; 
        
        // Evento: Al hacer click en CUALQUIER parte de la fila, abre detalles
        tr.onclick = (e) => {
            // Evitamos que se abra si el usuario hizo click en un botón específico (como borrar)
            if (e.target.closest('button')) return; 
            
            // Llamamos a la función global de app.js
            window.openDetailModal(disk);
        };

        tr.innerHTML = `
            <td><strong>${disk.codigoInterno}</strong></td>
            <td>${disk.equipoId || '-'}</td>
            <td>${disk.tipo}</td>
            <td>${disk.marca}</td>
            <td>${disk.capacidad} GB</td>
            <td><small>${disk.serial}</small></td>
            <td><span class="status-badge ${getStatusClass(disk.estado)}">${disk.estado}</span></td>
            
            <td style="text-align: right;">
                 <button class="neo-btn small ghost btn-edit" data-id="${disk.id}">
                    <i class="ph-bold ph-pencil-simple"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Reactivar listeners para los botones pequeños de la tabla (Edición directa)
    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); // Evita que se abra el modal de detalles
            window.openEditModal(btn.dataset.id); // Llama directo a editar
        });
    });
}

export function updateKpiCounter(count) {
    if(totalDisplay) totalDisplay.textContent = count;
}

function getStatusClass(status) {
    if (status === "Bueno") return "bueno";
    if (status === "Malo") return "malo";
    return "revisar";
}