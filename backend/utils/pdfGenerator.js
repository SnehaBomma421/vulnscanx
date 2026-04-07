const PDFDocument = require('pdfkit');

/**
 * Generates a stylized PDF report from scan data.
 * Returns a Promise that resolves with a Buffer.
 */
function generatePDFReport(scanData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, bufferPages: true });
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

      // --- Analytics Dashboard (PDF Rendering) ---
      doc
        .fillColor('#00aaff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Security Posture Analytics');
        
      doc.moveDown(0.5);

      const highRiskCount = scanData.issues.filter(i => i.risk === 'High').length;
      const medRiskCount = scanData.issues.filter(i => i.risk === 'Medium').length;
      const lowRiskCount = scanData.issues.filter(i => i.risk === 'Low').length;
      const totalIssues = scanData.issues.length;

      // Draw Summary Boxes
      const boxY = doc.y;
      const boxWidth = 100;
      const boxSpacing = 20;
      const startX = 50;

      const stats = [
        { label: 'TOTAL', value: totalIssues, color: '#00aaff' },
        { label: 'HIGH', value: highRiskCount, color: '#ff003c' },
        { label: 'MEDIUM', value: medRiskCount, color: '#ffaa00' },
        { label: 'LOW', value: lowRiskCount, color: '#00ff41' }
      ];

      stats.forEach((stat, index) => {
        const xPos = startX + index * (boxWidth + boxSpacing);
        doc.lineWidth(1).strokeColor(stat.color).rect(xPos, boxY, boxWidth, 50).stroke();
        doc.fillColor('#cccccc').fontSize(10).font('Helvetica').text(stat.label, xPos, boxY + 8, { width: boxWidth, align: 'center' });
        doc.fillColor(stat.color).fontSize(20).font('Helvetica-Bold').text(stat.value.toString(), xPos, boxY + 22, { width: boxWidth, align: 'center' });
      });

      doc.y = boxY + 70;

      if (totalIssues > 0) {
        // Horizontal Stacked Bar Chart
        doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('Risk Distribution:');
        doc.moveDown(0.5);

        const chartY = doc.y;
        const maxBarWidth = 460;
        
        const highWidth = (highRiskCount / totalIssues) * maxBarWidth;
        const medWidth = (medRiskCount / totalIssues) * maxBarWidth;
        const lowWidth = (lowRiskCount / totalIssues) * maxBarWidth;

        let currentX = 50;
        if (highRiskCount > 0) { doc.fillColor('#ff003c').rect(currentX, chartY, highWidth, 20).fill(); currentX += highWidth; }
        if (medRiskCount > 0) { doc.fillColor('#ffaa00').rect(currentX, chartY, medWidth, 20).fill(); currentX += medWidth; }
        if (lowRiskCount > 0) { doc.fillColor('#00ff41').rect(currentX, chartY, lowWidth, 20).fill(); }

        doc.y = chartY + 25;
        doc.x = 50;
        doc.fontSize(10).font('Helvetica');
        
        const legendItems = [];
        if (highRiskCount > 0) legendItems.push({ label: `High (${Math.round((highRiskCount/totalIssues)*100)}%)`, color: '#ff003c' });
        if (medRiskCount > 0) legendItems.push({ label: `Medium (${Math.round((medRiskCount/totalIssues)*100)}%)`, color: '#ffaa00' });
        if (lowRiskCount > 0) legendItems.push({ label: `Low (${Math.round((lowRiskCount/totalIssues)*100)}%)`, color: '#00ff41' });

        legendItems.forEach((item, index) => {
          doc.fillColor(item.color).text(item.label + '     ', { continued: index < legendItems.length - 1 });
        });
        
        // No explicit line end is needed because the last item has `continued: false`
      }

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
            .text('MITIGATION: ', { continued: true })
            .fillColor('#00ff41')
            .text(`${issue.mitigation}`);

          if (issue.cwe) {
            doc.moveDown(0.3);
            doc
              .fillColor('#dddddd')
              .fontSize(10)
              .font('Helvetica-Bold')
              .text('CWE REFERENCE: ', { continued: true })
              .fillColor('#bbbbbb')
              .text(`${issue.cwe}`);
          }

          if (issue.technicalDetails) {
            doc.moveDown(0.3);
            doc
              .fillColor('#dddddd')
              .fontSize(10)
              .font('Helvetica-Bold')
              .text('TECHNICAL DETAILS: ', { continued: true })
              .fillColor('#bbbbbb')
              .text(`${issue.technicalDetails}`);
          }

          doc.moveDown(1.5);

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
            doc.page.height - 40,
            { align: 'center', width: 500, lineBreak: false }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePDFReport };
