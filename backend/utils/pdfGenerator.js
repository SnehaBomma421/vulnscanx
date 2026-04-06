const PDFDocument = require('pdfkit');

/**
 * Generates a stylized PDF report from scan data.
 * Returns a Promise that resolves with a Buffer.
 */
function generatePDFReport(scanData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Header - Branding
      doc
        .fillColor('#00ff41')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('VulnScanX', { align: 'left' });
      
      doc
        .fillColor('#777777')
        .fontSize(10)
        .font('Helvetica')
        .text('Advanced Vulnerability Assessment Report', doc.x, doc.y - 5);

      doc.moveDown(2);

      // Horizontal Line
      doc
        .strokeColor('#333333')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();

      doc.moveDown(1.5);

      // Scan Information
      doc
        .fillColor('#ffffff')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('SCAN TARGET:', { continued: true })
        .fillColor('#00aaff')
        .text(` ${scanData.target}`);

      doc.moveDown(0.5);

      const riskColor = 
        scanData.overallRisk === 'High' ? '#ff003c' :
        scanData.overallRisk === 'Medium' ? '#ffaa00' :
        scanData.overallRisk === 'Low' ? '#00aaff' : '#00ff41';

      doc
        .fillColor('#ffffff')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('OVERALL RISK:', { continued: true })
        .fillColor(riskColor)
        .text(` ${scanData.overallRisk.toUpperCase()}`);

      doc.moveDown(0.5);

      doc
        .fillColor('#ffffff')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DATE:', { continued: true })
        .fillColor('#cccccc')
        .text(` ${new Date(scanData.createdAt).toUTCString()}`);

      doc.moveDown(2);

      // Vulnerabilities Section
      doc
        .fillColor('#ffffff')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Vulnerability Assessment Results');
      
      doc.moveDown(1);

      if (scanData.issues.length === 0) {
        doc
          .fillColor('#00ff41')
          .fontSize(12)
          .font('Helvetica')
          .text('[+] No vulnerabilities detected. Target security profile is optimal.');
      } else {
        scanData.issues.forEach((issue, index) => {
          const issueRiskColor = 
            issue.risk === 'High' ? '#ff003c' :
            issue.risk === 'Medium' ? '#ffaa00' :
            issue.risk === 'Low' ? '#00aaff' : '#cccccc';

          // Issue Box/Header
          doc
            .fillColor(issueRiskColor)
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(`${index + 1}. [${issue.risk.toUpperCase()}] ${issue.title}`);
          
          doc.moveDown(0.3);

          doc
            .fillColor('#dddddd')
            .fontSize(10)
            .font('Helvetica')
            .text('DESCRIPTION:', { continued: true })
            .fillColor('#bbbbbb')
            .text(` ${issue.description}`);
          
          doc.moveDown(0.3);

          doc
            .fillColor('#dddddd')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('MITIGATION:', { continued: true })
            .fillColor('#00ff41')
            .text(` ${issue.mitigation}`);

          doc.moveDown(1.5);

          // Add a page if we are near the bottom
          if (doc.y > 650) {
            doc.addPage();
          }
        });
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc
          .fillColor('#555555')
          .fontSize(8)
          .text(
            `VulnScanX Security Report - Confidential - Page ${i + 1} of ${pageCount}`,
            50,
            750,
            { align: 'center', width: 500 }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePDFReport };
