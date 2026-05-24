export function printElement(elementId: string, title: string): void {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  const printWindow = window.open('', '_blank', 'width=1024,height=720');

  if (!printWindow) {
    return;
  }

  const cloned = element.cloneNode(true) as HTMLElement;
  const printedAt = new Date().toLocaleString();

  const styles = `
    * { box-shadow: none !important; }
    body {
      margin: 0;
      padding: 24px;
      background: #ffffff;
      color: #111827;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    }
    .print-header {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .print-header h1 {
      margin: 0;
      font-size: 18px;
      letter-spacing: 0.08em;
    }
    .print-header h2 {
      margin: 6px 0 0;
      font-size: 14px;
      font-weight: 600;
    }
    .print-header p {
      margin: 4px 0 0;
      font-size: 12px;
      color: #6b7280;
    }
    .print-hidden { display: none !important; }
  `;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="print-header">
          <h1>ALUMEX IMS</h1>
          <h2>${title}</h2>
          <p>Printed: ${printedAt}</p>
        </div>
        <div class="print-content"></div>
      </body>
    </html>`);
  printWindow.document.close();

  const printRoot = printWindow.document.querySelector('.print-content');
  if (printRoot) {
    printRoot.appendChild(cloned);
  }

  const handleAfterPrint = () => {
    printWindow.close();
  };

  printWindow.addEventListener('afterprint', handleAfterPrint);
  printWindow.focus();
  printWindow.print();
}
