const { generatePDFReport } = require('./utils/pdfGenerator');

const mockScanData = {
  _id: "test12345",
  target: "https://chatgpt.com/c/69d39cfd-e7a4-8323-a83b-62746a9d0b93",
  overallRisk: "Medium",
  createdAt: new Date(),
  issues: [
    { risk: "Low", title: "Low issue", description: "desc", mitigation: "mit" },
    { risk: "Medium", title: "Med issue", description: "desc", mitigation: "mit" }
  ]
};

async function run() {
  try {
    const buf = await generatePDFReport(mockScanData);
    console.log("Success! size:", buf.length);
  } catch (err) {
    console.error("Crash details:");
    console.error(err);
  }
}

run();
