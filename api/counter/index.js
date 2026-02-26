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
function createAuthHeader(method, accountName, accountKey, containerName, blobName, contentLength = 0, contentType = "", context) {
  const dateString = new Date().toUTCString();
  const version = "2021-06-08";
  
  // Build canonicalized headers (all x-ms-* headers, sorted alphabetically)
  const canonicalizedHeaders = method === "PUT" 
    ? `x-ms-blob-type:BlockBlob\nx-ms-date:${dateString}\nx-ms-version:${version}\n`
    : `x-ms-date:${dateString}\nx-ms-version:${version}\n`;
  
  // Build canonicalized resource
  const canonicalizedResource = `/${accountName}/${containerName}/${blobName}`;
  
  // String to sign format for Blob service (exactly as Azure expects)
  const stringToSign = 
    method + "\n" +                      // HTTP Verb
    "" + "\n" +                          // Content-Encoding
    "" + "\n" +                          // Content-Language
    (contentLength || "") + "\n" +       // Content-Length
    "" + "\n" +                          // Content-MD5
    contentType + "\n" +                 // Content-Type
    "" + "\n" +                          // Date
    "" + "\n" +                          // If-Modified-Since
    "" + "\n" +                          // If-Match
    "" + "\n" +                          // If-None-Match
    "" + "\n" +                          // If-Unmodified-Since
    "" + "\n" +                          // Range
    canonicalizedHeaders +               // x-ms-* headers
    canonicalizedResource;               // /{account}/{container}/{blob}
  
  if (context) {
    context.log(`[${method}] String to sign:`, JSON.stringify(stringToSign));
  }
  
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
    if (contentLength) {
      headers["Content-Length"] = contentLength.toString();
    }
  }
  
  return headers;
}

module.exports = async function (context, req) {
  try {
    context.log("=== Counter function started ===");
    
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING not configured");
    }
    
    context.log("Connection string found, parsing...");
    const { AccountName, AccountKey } = parseConnectionString(connectionString);
    context.log(`Account: ${AccountName}, Key length: ${AccountKey ? AccountKey.length : 0}`);
    
    const containerName = "counter";
    const blobName = "count.json";
    const blobUrl = `https://${AccountName}.blob.core.windows.net/${containerName}/${blobName}`;
    
    let count = 0;
    
    // Try to read existing count
    try {
      context.log(`Attempting to read blob: ${blobUrl}`);
      const readHeaders = createAuthHeader("GET", AccountName, AccountKey, containerName, blobName, 0, "", context);
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
    context.log(`Writing count ${count} to blob`);
    const writeHeaders = createAuthHeader("PUT", AccountName, AccountKey, containerName, blobName, data.length, "application/json", context);
    
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        count,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    context.log.error("=== ERROR in counter function ===");
    context.log.error("Message:", error.message);
    context.log.error("Stack:", error.stack);
    return {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      })
    };
  }
};

