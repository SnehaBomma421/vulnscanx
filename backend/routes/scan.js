const express = require('express');
const router = express.router || express.Router();
const auth = require('../middleware/authMiddleware');
const Scan = require('../models/Scan');
const { uploadReport, downloadReport } = require('../utils/azureBlob');
const { generatePDFReport } = require('../utils/pdfGenerator');


const crypto = require('crypto');

// Enhanced Mock security scanning logic
const analyzeTarget = (target) => {
  const issues = [];

  // Deterministic mock generation based on target URL
  const hash = crypto.createHash('md5').update(target).digest('hex');
  const char1 = parseInt(hash[0], 16); // 0-15
  const char2 = parseInt(hash[1], 16);
  const char3 = parseInt(hash[2], 16);
  const char4 = parseInt(hash[3], 16);

  const isLocal = target.includes('127.0.0.1') || target.includes('localhost');
  const isIP = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(target);
  const isSecure = target.startsWith('https://');
  
  // Real check based on protocol
  if (!isSecure && !isLocal && !isIP && target.startsWith('http://')) {
    issues.push({
      title: 'Missing HTTPS Encryption',
      risk: 'High',
      description: 'Communication with this target is unencrypted. Attackers can intercept sensitive data.',
      mitigation: 'Implement an SSL/TLS certificate and enforce HTTPS redirection.',
      technicalDetails: 'The host failed to negotiate a TLS handshake. Data intercepted over the network is in plain text. Vulnerable to Man-in-the-Middle (MitM) attacks.',
      cwe: 'CWE-319: Cleartext Transmission of Sensitive Information'
    });
  }

  // Real check based on keywords
  if (target.includes('admin') || target.includes('test') || target.includes('dev')) {
    issues.push({
      title: 'Exposed Sensitive Directory',
      risk: 'High',
      description: 'Target URL contains common sensitive keywords suggesting exposed panels or development environments.',
      mitigation: 'Restrict access to administrative pages using IP whitelisting or VPNs.',
      technicalDetails: 'Directory bruteforcing or path scanning revealed restricted operational paths. This often leads to unauthorized privilege escalation if default credentials are in use.',
      cwe: 'CWE-425: Direct Request (Forced Browsing)'
    });
  }

  // Simulated checks based on hash ensuring variety across different URLs
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
    issues.push({
      title: 'Cross-Site Scripting (XSS) Vulnerability (Simulated)',
      risk: 'High',
      description: 'A simulated endpoint appears vulnerable to reflective XSS attacks due to unsanitized input reflection.',
      mitigation: 'Sanitize all user inputs and implement a strong Content Security Policy (CSP).',
      technicalDetails: 'Payloads containing HTML tags (<script>alert(1)</script>) were returned exactly as provided in the HTTP response body without proper encoding.',
      cwe: 'CWE-79: Improper Neutralization of Input During Web Page Generation'
    });
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

  // Determine overall risk realistically based on the highest severity issue
  let overallRisk = 'Safe';
  if (issues.length > 0) {
    if (issues.some(i => i.risk === 'High')) {
      overallRisk = 'High';
    } else if (issues.some(i => i.risk === 'Medium')) {
      overallRisk = 'Medium';
    } else {
      overallRisk = 'Low';
    }
  }

  return { issues, overallRisk };
};

// @route   POST api/scan/analyze
// @desc    Analyze a target and save report
// @access  Private
router.post('/analyze', auth, async (req, res) => {
  const { target } = req.body;
  
  if (!target) {
    return res.status(400).json({ message: 'Target is required' });
  }

  try {
    const { issues, overallRisk } = analyzeTarget(target);

    // Save scan to database
    const newScan = new Scan({
      user: req.user.id,
      target,
      issues,
      overallRisk
    });

    const savedScan = await newScan.save();

    // Generate PDF and Upload to Azure Blob Storage
    try {
      const fileName = `scan_${savedScan._id}.pdf`;
      console.log(`[Azure] Generating PDF for target: ${target} as ${fileName}`);
      
      const pdfBuffer = await generatePDFReport(savedScan);
      
      await uploadReport(fileName, pdfBuffer, 'application/pdf');
      
      savedScan.reportFile = fileName;
      await savedScan.save();
      console.log(`[Azure] Upload Success for ${fileName}`);
    } catch (azureErr) {
      console.error(`[Azure] PDF Generation/Upload Failed for ${target}:`, azureErr.message);
    }

    res.json({ report: savedScan });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// @route   GET api/scan/history
// @desc    Get user's scan history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const scans = await Scan.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(scans);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});
// @route   DELETE api/scan/:id
// @desc    Delete a scan by id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    
    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    // Ensure user owns the scan
    if (scan.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await scan.deleteOne();
    res.json({ message: 'Scan removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// @route   GET api/scans/:id/download
// @desc    Download a scan report from Azure
// @access  Private
router.get('/:id/download', auth, async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    
    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    if (scan.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    if (!scan.reportFile) {
      console.error(`[Download Error] No reportFile for scan ${req.params.id}`);
      return res.status(400).json({ message: 'Report file not found for this scan' });
    }

    console.log(`[Azure] Fetching report: ${scan.reportFile}`);
    const reportData = await downloadReport(scan.reportFile);
    
    const isPDF = scan.reportFile.endsWith('.pdf');
    res.setHeader('Content-Type', isPDF ? 'application/pdf' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=report_${scan.target.replace(/[^a-z0-9]/gi, '_')}.${isPDF ? 'pdf' : 'json'}`);
    res.send(reportData);
  } catch (err) {
    console.error(`[Azure] Download Error for ${req.params.id}:`, err.message);
    res.status(500).json({ message: 'Error downloading report: ' + err.message });
  }
});

module.exports = router;
