// js/utils/export-pdf.js

export function exportToPdf(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text("Inventario de Discos - Reporte", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 28);
    
    const tableColumn = ["Código", "Equipo", "Marca", "Capacidad", "Serie", "Estado"];
    const tableRows = [];

    data.forEach(disk => {
        const row = [
            disk.codigoInterno,
            disk.equipoId,
            disk.marca,
            disk.capacidad + " GB",
            disk.serial,
            disk.estado
        ];
        tableRows.push(row);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid', // Estilo de rejilla
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] } // Cabecera negra estilo Neo
    });
    
    doc.save("Reporte_Discos.pdf");
}