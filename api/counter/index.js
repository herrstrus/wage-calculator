const crypto = require("crypto");

// Parse connection string
function parseConnectionString(connStr) {
  const parts = {};
  connStr.split(";").forEach(part => {
    if (!part) return;
    const [key, ...rest] = part.split("=");
    parts[key] = rest.join("=");
  });
  return parts;
}

// Create SharedKey authorization header for Azure Storage
function createAuthHeader(method, accountName, accountKey, containerName, blobName, contentLength = 0, contentType = "") {
  const dateString = new Date().toUTCString();
  const version = "2021-06-08";
  
  // String to sign format for Blob service
  const stringToSign = [
    method,                      // HTTP Verb
    "",                          // Content-Encoding
    "",                          // Content-Language
    contentLength || "",         // Content-Length (empty for GET)
    "",                          // Content-MD5
    contentType,                 // Content-Type
    "",                          // Date
    "",                          // If-Modified-Since
    "",                          // If-Match
    "",                          // If-None-Match
    "",                          // If-Unmodified-Since
    "",                          // Range
    `x-ms-blob-type:BlockBlob`,  // Canonicalized headers (only for PUT)
    `x-ms-date:${dateString}`,
    `x-ms-version:${version}`,
    `/${accountName}/${containerName}/${blobName}` // Canonicalized resource
  ].filter(line => method === 'GET' ? !line.startsWith('x-ms-blob-type') : true).join("\n");
  
  const hmac = crypto.createHmac("sha256", Buffer.from(accountKey, "base64"));
  const signature = hmac.update(stringToSign, "utf8").digest("base64");
  
  const headers = {
    "Authorization": `SharedKey ${accountName}:${signature}`,
    "x-ms-version": version,
    "x-ms-date": dateString
  };
  
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  
  if (method === "PUT") {
    headers["x-ms-blob-type"] = "BlockBlob";
  }
  
  return headers;
}

module.exports = async function (context, req) {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING not configured");
    }
    
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
        const errorText = await readResponse.text();
        context.log("Read error:", readResponse.status, errorText);
      }
    } catch (e) {
      context.log("Could not read blob:", e.message);
    }
    
    // Increment counter
    count++;
    const data = JSON.stringify({ count, timestamp: new Date().toISOString() });
    
    // Write updated count
    const writeHeaders = createAuthHeader("PUT", AccountName, AccountKey, containerName, blobName, data.length, "application/json");
    
    const writeResponse = await fetch(blobUrl, {
      method: "PUT",
      headers: writeHeaders,
      body: data
    });
    
    if (!writeResponse.ok) {
      const errorText = await writeResponse.text();
      context.log.error("Write failed:", writeResponse.status, errorText);
      throw new Error(`Failed to write blob: ${writeResponse.status}`);
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
    context.log.error("Error in counter function:", error.message, error.stack);
    return {
      status: 500,
      body: { error: error.message }
    };
  }
};

