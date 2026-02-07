// js/utils/export-pdf.js

/**
 * GENERADOR DE REPORTES PDF - COMFAMILIAR RISARALDA
 * Crea documentos oficiales con el inventario seleccionado o filtrado.
 */

export const exportToPdf = (data) => {
    if (!data || data.length === 0) {
        alert("No hay datos seleccionados para exportar.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Orientación Horizontal (Landscape)

    // --- 1. ENCABEZADO INSTITUCIONAL ---
    const logoUrl = "https://www.ssf.gov.co/documents/20127/107472/comfamiliar+risaralda+supersubsidio.jpeg/508fb8c5-e8a4-a34e-3d5a-db473df17743?version=1.0&t=1671123816125";
    
    // Añadir Logo
    doc.addImage(logoUrl, 'JPEG', 14, 10, 40, 15);
    
    // Título y Metadatos
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 86, 179); // Azul Comfamiliar (#0056b3)
    doc.text("REPORTE TÉCNICO DE INVENTARIO - DISCOS", 60, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    const fecha = new Date().toLocaleString();
    doc.text(`Generado el: ${fecha}`, 60, 24);
    doc.text(`Total de registros: ${data.length}`, 60, 29);

    // --- 2. CONFIGURACIÓN DE TABLA ---
    const columns = [
        { header: 'CÓDIGO', dataKey: 'codigoInterno' },
        { header: 'EQUIPO', dataKey: 'equipoId' },
        { header: 'TIPO', dataKey: 'tipo' },
        { header: 'MARCA', dataKey: 'marca' },
        { header: 'CAPACIDAD', dataKey: 'capacidad' },
        { header: 'SERIAL', dataKey: 'serial' },
        { header: 'ESTADO', dataKey: 'estado' }
    ];

    const rows = data.map(disk => ({
        ...disk,
        capacidad: `${disk.capacidad} GB`,
        estado: disk.estado.toUpperCase()
    }));

    // --- 3. GENERACIÓN CON AUTOTABLE ---
    doc.autoTable({
        columns: columns,
        body: rows,
        startY: 40,
        margin: { top: 40 },
        styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [0, 86, 179], // Azul Institucional
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250]
        },
        columnStyles: {
            codigoInterno: { fontStyle: 'bold' },
            capacidad: { halign: 'right' },
            serial: { fontStyle: 'italic' }
        }
    });

    // --- 4. PIE DE PÁGINA ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Comfamiliar Risaralda - Departamento de TI - Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }

    // Guardar archivo
    const fileName = `Inventario_Discos_Comfamiliar_${new Date().getTime()}.pdf`;
    doc.save(fileName);
};