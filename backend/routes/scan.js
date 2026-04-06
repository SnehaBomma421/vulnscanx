const express = require('express');
const router = express.router || express.Router();
const auth = require('../middleware/authMiddleware');
const Scan = require('../models/Scan');
const { uploadReport, downloadReport } = require('../utils/azureBlob');
const { generatePDFReport } = require('../utils/pdfGenerator');


// Mock security scanning logic
const analyzeTarget = (target) => {
  const issues = [];
  let riskScore = 0;

  const isLocal = target.includes('127.0.0.1') || target.includes('localhost');
  const isIP = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(target);
  const isSecure = target.startsWith('https://');
  
  if (!isSecure && !isLocal && !isIP && target.startsWith('http://')) {
    issues.push({
      title: 'Missing HTTPS',
      risk: 'High',
      description: 'Communication with this target is unencrypted. Attackers can intercept sensitive data.',
      mitigation: 'Implement an SSL/TLS certificate and enforce HTTPS redirection.'
    });
    riskScore += 3;
  }

  // Simulated open ports based on strings
  if (target.includes('admin') || target.includes('test')) {
    issues.push({
      title: 'Exposed Admin Panel / Sensitive Path',
      risk: 'Medium',
      description: 'Target contains common sensitive keywords suggesting exposed panels.',
      mitigation: 'Restrict access to admin pages using IP whitelisting or VPNs.'
    });
    riskScore += 2;
  }

  // Random simulation for realistic feel (based on target length to keep it deterministic per target run in a demo)
  if (target.length % 2 === 0) {
    issues.push({
      title: 'Missing Security Headers (HSTS, X-Frame-Options)',
      risk: 'Low',
      description: 'The target lacks modern HTTP security headers, making it vulnerable to clickjacking.',
      mitigation: 'Configure the web server to append strict security headers to all responses.'
    });
    riskScore += 1;
  }

  if (target.length % 3 === 0) {
    issues.push({
      title: 'Simulated Open Port: 22 (SSH)',
      risk: 'Medium',
      description: 'SSH service appears accessible from the external network.',
      mitigation: 'Disable password authentication, use key-based auth, and restrict port 22 access.'
    });
    riskScore += 2;
  }

  let overallRisk = 'Safe';
  if (riskScore >= 3) overallRisk = 'High';
  else if (riskScore > 0) overallRisk = 'Medium';
  else overallRisk = 'Low';

  // If no issues were added but score is 0
  if (issues.length === 0) {
    overallRisk = 'Safe';
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
