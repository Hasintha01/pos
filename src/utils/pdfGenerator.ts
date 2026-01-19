import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReceiptData {
  saleId: number;
  date: string;
  cashier: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  notes?: string;
}

interface ReportData {
  title: string;
  dateRange: string;
  data: any[];
  columns: string[];
  summary?: { [key: string]: any };
}

export const generateReceipt = (data: ReceiptData): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200], // Thermal printer size
  });

  let y = 10;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('POS SYSTEM', 40, y, { align: 'center' });
  
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Receipt', 40, y, { align: 'center' });
  
  y += 10;
  doc.setFontSize(8);
  doc.text(`Sale #: ${data.saleId}`, 5, y);
  y += 4;
  doc.text(`Date: ${data.date}`, 5, y);
  y += 4;
  doc.text(`Cashier: ${data.cashier}`, 5, y);
  y += 4;
  doc.text(`Payment: ${data.paymentMethod.toUpperCase()}`, 5, y);
  
  y += 6;
  doc.line(5, y, 75, y);
  y += 4;

  // Items
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 5, y);
  doc.text('Qty', 50, y);
  doc.text('Price', 60, y);
  doc.text('Total', 70, y, { align: 'right' });
  y += 4;
  doc.line(5, y, 75, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  data.items.forEach(item => {
    const lines = doc.splitTextToSize(item.name, 40);
    doc.text(lines, 5, y);
    doc.text(item.quantity.toString(), 50, y);
    doc.text(`$${item.price.toFixed(2)}`, 60, y);
    doc.text(`$${item.total.toFixed(2)}`, 75, y, { align: 'right' });
    y += lines.length * 4;
  });

  y += 2;
  doc.line(5, y, 75, y);
  y += 4;

  // Totals
  doc.text('Subtotal:', 5, y);
  doc.text(`$${data.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
  y += 4;

  if (data.discount > 0) {
    doc.text('Discount:', 5, y);
    doc.text(`-$${data.discount.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;
  }

  if (data.tax > 0) {
    doc.text('Tax:', 5, y);
    doc.text(`$${data.tax.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', 5, y);
  doc.text(`$${data.total.toFixed(2)}`, 75, y, { align: 'right' });
  y += 6;

  if (data.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.line(5, y, 75, y);
    y += 4;
    const noteLines = doc.splitTextToSize(`Notes: ${data.notes}`, 70);
    doc.text(noteLines, 5, y);
    y += noteLines.length * 4;
  }

  y += 6;
  doc.line(5, y, 75, y);
  y += 4;
  doc.setFontSize(8);
  doc.text('Thank you for your business!', 40, y, { align: 'center' });

  // Save or print
  doc.save(`receipt-${data.saleId}.pdf`);
};

export const generateSalesReport = (data: ReportData): void => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, 105, 15, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dateRange, 105, 22, { align: 'center' });

  // Table
  autoTable(doc, {
    startY: 30,
    head: [data.columns],
    body: data.data,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  });

  // Summary
  if (data.summary) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, finalY);

    let summaryY = finalY + 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    Object.entries(data.summary).forEach(([key, value]) => {
      doc.text(`${key}:`, 14, summaryY);
      doc.text(String(value), 200, summaryY, { align: 'right' });
      summaryY += 6;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
  }

  doc.save(`${data.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`);
};

export const generateInventoryReport = (products: any[]): void => {
  const data = products.map(p => [
    p.name,
    p.sku,
    p.category_name || 'N/A',
    p.stock_quantity,
    `$${p.price.toFixed(2)}`,
    `$${(p.stock_quantity * p.price).toFixed(2)}`,
    p.is_active ? 'Active' : 'Inactive',
  ]);

  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0);
  const lowStock = products.filter(p => p.stock_quantity <= (p.min_stock_level || 5)).length;

  generateSalesReport({
    title: 'Inventory Report',
    dateRange: `Generated on ${new Date().toLocaleDateString()}`,
    columns: ['Product', 'SKU', 'Category', 'Stock', 'Price', 'Value', 'Status'],
    data,
    summary: {
      'Total Products': products.length,
      'Low Stock Items': lowStock,
      'Total Inventory Value': `$${totalValue.toFixed(2)}`,
    },
  });
};

export const generateAuditReport = (logs: any[]): void => {
  const data = logs.map(log => [
    new Date(log.created_at).toLocaleString(),
    log.username,
    log.entity_type,
    log.action.toUpperCase(),
    `#${log.entity_id}`,
  ]);

  generateSalesReport({
    title: 'Audit Log Report',
    dateRange: `Generated on ${new Date().toLocaleDateString()}`,
    columns: ['Timestamp', 'User', 'Entity', 'Action', 'ID'],
    data,
    summary: {
      'Total Logs': logs.length,
      'Creates': logs.filter(l => l.action === 'create').length,
      'Updates': logs.filter(l => l.action === 'update').length,
      'Deletes': logs.filter(l => l.action === 'delete').length,
    },
  });
};
