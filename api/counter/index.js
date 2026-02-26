const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = "counter";
    const blobName = "count.json";
    
    // Create blob service client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    let count = 0;
    
    // Try to read existing count
    try {
      const downloadBlockBlobResponse = await blockBlobClient.download(0);
      const text = await downloadBlockBlobResponse.blobBody.text();
      const data = JSON.parse(text);
      count = data.count || 0;
    } catch (e) {
      context.log("Counter file not found, starting at 0");
    }
    
    // Increment counter
    count++;
    
    // Write updated count back to blob
    const data = JSON.stringify({ count, timestamp: new Date().toISOString() });
    await blockBlobClient.upload(data, data.length, { overwrite: true });
    
    return {
      status: 200,
      body: { count, timestamp: new Date().toISOString() }
    };
  } catch (error) {
    context.log.error("Error in counter function:", error);
    return {
      status: 500,
      body: { error: error.message }
    };
  }
};

