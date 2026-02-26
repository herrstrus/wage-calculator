const crypto = require("crypto");

// Parse connection string
function parseConnectionString(connStr) {
  const parts = {};
  connStr.split(";").forEach(part => {
    if (!part) return;
    const [key, value] = part.split("=");
    parts[key] = value;
  });
  return parts;
}

// Create SharedKey authorization header for Azure Storage
function createAuthHeader(method, accountName, accountKey, containerName, blobName, contentLength = 0) {
  const canonicalResource = `/${accountName}/${containerName}/${blobName}`;
  const dateString = new Date().toUTCString();
  
  const stringToSign = [
    method,
    "", // Content-MD5
    "application/json", // Content-Type
    "", // Date (empty, we use x-ms-date)
    `x-ms-date:${dateString}`,
    `x-ms-version:2021-06-08`,
    canonicalResource
  ].join("\n");
  
  const hmac = crypto.createHmac("sha256", Buffer.from(accountKey, "base64"));
  const signature = hmac.update(stringToSign).digest("base64");
  
  return {
    "Authorization": `SharedKey ${accountName}:${signature}`,
    "x-ms-version": "2021-06-08",
    "x-ms-date": dateString,
    "Content-Type": "application/json"
  };
}

module.exports = async function (context, req) {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const { AccountName, AccountKey } = parseConnectionString(connectionString);
    
    const containerName = "counter";
    const blobName = "count.json";
    const blobUrl = `https://${AccountName}.blob.core.windows.net/${containerName}/${blobName}`;
    
    let count = 0;
    
    // Try to read existing count
    try {
      const readHeaders = createAuthHeader("GET", AccountName, AccountKey, containerName, blobName);
      const readResponse = await fetch(blobUrl, {
        method: "GET",
        headers: readHeaders
      });
      
      if (readResponse.ok) {
        const text = await readResponse.text();
        const data = JSON.parse(text);
        count = data.count || 0;
        context.log("Read count from blob:", count);
      } else if (readResponse.status !== 404) {
        context.log("Read response status:", readResponse.status);
      }
    } catch (e) {
      context.log("First read attempt:", e.message);
    }
    
    // Increment counter
    count++;
    const data = JSON.stringify({ count, timestamp: new Date().toISOString() });
    
    // Write updated count
    const writeHeaders = createAuthHeader("PUT", AccountName, AccountKey, containerName, blobName, data.length);
    writeHeaders["x-ms-blob-type"] = "BlockBlob";
    
    const writeResponse = await fetch(blobUrl, {
      method: "PUT",
      headers: writeHeaders,
      body: data
    });
    
    if (!writeResponse.ok) {
      const errorText = await writeResponse.text();
      throw new Error(`Failed to write blob: ${writeResponse.status} ${errorText}`);
    }
    
    context.log("Successfully wrote count:", count);
    
    return {
      status: 200,
      body: { 
        count,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    context.log.error("Error in counter function:", error.message);
    return {
      status: 500,
      body: { error: error.message }
    };
  }
};

