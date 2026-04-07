const { generatePDFReport } = require('./utils/pdfGenerator');
const mongoose = require('mongoose');

// We simulate analyzeTarget exactly to get a Medium issue
const crypto = require('crypto');
const analyzeTarget = (target) => {
  const issues = [];
  const hash = crypto.createHash('md5').update(target).digest('hex');
  const char1 = parseInt(hash[0], 16);
  const char2 = parseInt(hash[1], 16);
  const char3 = parseInt(hash[2], 16);
  const char4 = parseInt(hash[3], 16);

  if (char1 < 7) {
    issues.push({
      title: 'Missing Security Headers (HSTS, X-Frame-Options)',
      risk: 'Low',
      description: 'The target lacks modern HTTP security headers, increasing susceptibility to clickjacking or downgrade attacks.',
      mitigation: 'Configure the web server to append strict security headers to all responses.',
      technicalDetails: 'HTTP response analysis showed absence of Strict-Transport-Security, X-XSS-Protection, and X-Content-Type-Options headers.',
      cwe: 'CWE-693: Protection Mechanism Failure'
    });
  }
  if (char2 > 12) {
    // High
  }
  if (char3 % 3 === 0) {
    issues.push({
      title: 'Simulated Open Port: 22 (SSH)',
      risk: 'Medium',
      description: 'SSH service appears accessible from the external network, inviting brute force attempts.',
      mitigation: 'Disable password authentication, mandate key-based auth, and restrict port 22 access.',
      technicalDetails: 'Nmap TCP SYN scan identified port 22 open. The SSH banner implies an outdated OpenSSH version might be running.',
      cwe: 'CWE-284: Improper Access Control'
    });
  }
  if (char4 === 7 || char4 === 14) {
    issues.push({
      title: 'Outdated Server Software Version',
      risk: 'Medium',
      description: 'The web server is broadcasting an older software version header in its HTTP responses.',
      mitigation: 'Update the server software and configure it to omit version headers.',
      technicalDetails: 'The Server header (e.g. Server: Apache/2.4.1) leaks specific version data which can be cross-referenced with public CVE databases.',
      cwe: 'CWE-200: Exposure of Sensitive Information to an Unauthorized Actor'
    });
  }
  
  let overallRisk = 'Safe';
  if (issues.length > 0) {
    if (issues.some(i => i.risk === 'High')) overallRisk = 'High';
    else if (issues.some(i => i.risk === 'Medium')) overallRisk = 'Medium';
    else overallRisk = 'Low';
  }
  return { issues, overallRisk };
};

async function testPdf() {
  try {
    let mockUrl = "https://chatgpt.com/c/69d39cfd-e7a4-8323-a83b-62746a9d0b93"; 
    // Wait, the user url was exactly this.
    const { issues, overallRisk } = analyzeTarget(mockUrl);
    console.log("Mock result for this URL:", overallRisk, issues.length, "issues");
    
    const mockScanData = {
      _id: new mongoose.Types.ObjectId(),
      target: mockUrl,
      issues: issues,
      overallRisk: overallRisk,
      createdAt: new Date()
    };
    
    const buf = await generatePDFReport(mockScanData);
    console.log("PDF BUILT SUCCESSFULLY. SIZE:", buf.length);
  } catch (err) {
    console.error("PDF GENERATION CRASHED. Dumping to error_dump.txt");
    require('fs').writeFileSync('error_dump.txt', err.stack || err.toString());
  }
}

testPdf();
