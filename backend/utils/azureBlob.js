const { BlobServiceClient } = require('@azure/storage-blob');

const CONTAINER_NAME = 'reports';

// ✅ FIX 1: Correct way to read connection string from .env
function getBlobServiceClient() {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connStr) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set in .env');
  }

  return BlobServiceClient.fromConnectionString(connStr);
}

/**
 * Upload a report (JSON or PDF) to Azure Blob Storage.
 */
async function uploadReport(blobName, content, contentType = 'application/json') {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);

  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: contentType }
  });

  return blobName;
}

/**
 * Download a blob and return its content as a Buffer
 */
async function downloadReport(blobName) {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTAINER_NAME);

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const downloadResponse = await blockBlobClient.download(0);

  const chunks = [];
  for await (const chunk of downloadResponse.readableStreamBody) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

module.exports = { uploadReport, downloadReport };