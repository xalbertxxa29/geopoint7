/**
 * Sistema de Exportación de Reportes
 * Soporta PDF, Excel y CSV
 */

class ExportManager {
    constructor() {
        this.formats = ['pdf', 'excel', 'csv'];
    }

    /**
     * Exportar datos en el formato especificado
     */
    async export(data, format = 'csv') {
        if (!this.formats.includes(format)) {
            throw new Error(`Formato no soportado: ${format}`);
        }

        try {
            switch (format) {
                case 'pdf':
                    await this.exportPDF(data);
                    break;
                case 'excel':
                    await this.exportExcel(data);
                    break;
                case 'csv':
                    await this.exportCSV(data);
                    break;
            }
        } catch (error) {
            console.error(`[Export] Error exportando ${format}:`, error);
            throw error;
        }
    }

    /**
     * Exportar a CSV
     */
    async exportCSV(data) {
        const headers = ['ID', 'Tipo', 'Cliente', 'Unidad', 'Estado', 'Distancia (m)', 'Fecha'];
        const rows = data.map(task => [
            task.id,
            task.tipoTarea || '',
            task.cliente || '',
            task.unidad || '',
            task.estado || '',
            task.distancia ? Math.round(task.distancia) : '',
            task.fechaCreacion ? new Date(task.fechaCreacion.toDate()).toLocaleDateString() : ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        this.downloadFile(csvContent, 'reporte-tareas.csv', 'text/csv');
    }

    /**
     * Exportar a Excel (usando formato CSV compatible)
     */
    async exportExcel(data) {
        // Para una implementación completa, usar una librería como SheetJS (xlsx)
        // Por ahora, exportamos como CSV con extensión .xls
        const headers = ['ID', 'Tipo', 'Cliente', 'Unidad', 'Estado', 'Distancia (m)', 'Fecha', 'Observaciones'];
        const rows = data.map(task => [
            task.id,
            task.tipoTarea || '',
            task.cliente || '',
            task.unidad || '',
            task.estado || '',
            task.distancia ? Math.round(task.distancia) : '',
            task.fechaCreacion ? new Date(task.fechaCreacion.toDate()).toLocaleDateString() : '',
            task.descripcion || ''
        ]);

        const csvContent = [
            headers.join('\t'),
            ...rows.map(row => row.map(cell => `"${cell}"`).join('\t'))
        ].join('\n');

        this.downloadFile(csvContent, 'reporte-tareas.xls', 'application/vnd.ms-excel');
    }

    /**
     * Exportar a PDF
     */
    async exportPDF(data) {
        // Para una implementación completa, usar una librería como jsPDF
        // Por ahora, creamos un HTML simple y usamos window.print()

        const htmlContent = this.generatePDFHTML(data);

        // Crear ventana temporal para imprimir
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Esperar a que cargue y luego imprimir
        printWindow.onload = () => {
            printWindow.print();
            // No cerramos la ventana para que el usuario pueda guardar como PDF
        };
    }

    /**
     * Generar HTML para PDF
     */
    generatePDFHTML(data) {
        const now = new Date().toLocaleString('es-ES');

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Tareas - LiderControl</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          h1 {
            color: #00d4ff;
            border-bottom: 3px solid #00d4ff;
            padding-bottom: 10px;
          }
          .meta {
            color: #666;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #00d4ff;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>📊 Reporte de Tareas - LiderControl</h1>
        <div class="meta">
          <p><strong>Fecha de generación:</strong> ${now}</p>
          <p><strong>Total de tareas:</strong> ${data.length}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Cliente</th>
              <th>Unidad</th>
              <th>Estado</th>
              <th>Distancia</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(task => `
              <tr>
                <td>${task.tipoTarea || '-'}</td>
                <td>${task.cliente || '-'}</td>
                <td>${task.unidad || '-'}</td>
                <td>${task.estado || '-'}</td>
                <td>${task.distancia ? Math.round(task.distancia) + 'm' : '-'}</td>
                <td>${task.fechaCreacion ? new Date(task.fechaCreacion.toDate()).toLocaleDateString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generado por LiderControl - Sistema de Gestión de Tareas</p>
        </div>
      </body>
      </html>
    `;
    }

    /**
     * Descargar archivo
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Exportar gráficos del dashboard
     */
    async exportDashboardCharts() {
        // Capturar canvas de los gráficos y exportar como imágenes
        const charts = document.querySelectorAll('.chart-card canvas');
        const images = [];

        charts.forEach((canvas, index) => {
            const dataURL = canvas.toDataURL('image/png');
            images.push({
                name: `grafico-${index + 1}.png`,
                data: dataURL
            });
        });

        return images;
    }
}

// Instancia global
window.exportManager = new ExportManager();
