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

// Create SharedKeyLite authorization header for Azure Table Storage
function createTableAuthHeader(method, accountName, accountKey, path) {
  const dateString = new Date().toUTCString();
  
  // SharedKeyLite string-to-sign for Table service
  const stringToSign = `${dateString}\n${path}`;
  
  const hmac = crypto.createHmac("sha256", Buffer.from(accountKey, "base64"));
  const signature = hmac.update(stringToSign, "utf8").digest("base64");
  
  return {
    "Authorization": `SharedKeyLite ${accountName}:${signature}`,
    "x-ms-date": dateString,
    "x-ms-version": "2019-02-02",
    "Accept": "application/json;odata=nometadata"
  };
}

module.exports = async function (context, req) {
  try {
    context.log("=== Counter function started ===");
    
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING not configured");
    }
    
    const { AccountName, AccountKey } = parseConnectionString(connectionString);
    context.log(`Account: ${AccountName}`);
    
    const tableName = "visitCounter"; // Match the actual table name (case-sensitive)
    const partitionKey = "counter";
    const rowKey = "visits";
    
    // Table Storage REST API endpoint
    const tableUrl = `https://${AccountName}.table.core.windows.net/${tableName}(PartitionKey='${partitionKey}',RowKey='${rowKey}')`;
    const path = `/${AccountName}/${tableName}(PartitionKey='${partitionKey}',RowKey='${rowKey}')`;
    
    let count = 0;
    let etag = null;
    
    // Try to read existing count from Table Storage
    try {
      const readHeaders = createTableAuthHeader("GET", AccountName, AccountKey, path);
      const readResponse = await fetch(tableUrl, {
        method: "GET",
        headers: readHeaders
      });
      
      if (readResponse.ok) {
        const data = await readResponse.json();
        count = parseInt(data.Count) || 0;
        etag = readResponse.headers.get("ETag");
        context.log("Read count from table:", count);
      } else if (readResponse.status !== 404) {
        const errorText = await readResponse.text();
        context.log("Read returned:", readResponse.status, errorText);
      }
    } catch (e) {
      context.log("Could not read table entity:", e.message);
    }
    
    // Increment counter
    count++;
    
    // Create or update entity in Table Storage
    const entity = {
      PartitionKey: partitionKey,
      RowKey: rowKey,
      Count: count,
      UpdatedAt: new Date().toISOString()
    };
    
    const entityJson = JSON.stringify(entity);
    
    // Use PUT to insert or replace (upsert)
    const upsertUrl = tableUrl;
    const upsertPath = path;
    const writeHeaders = createTableAuthHeader("PUT", AccountName, AccountKey, upsertPath);
    writeHeaders["Content-Type"] = "application/json";
    writeHeaders["Content-Length"] = entityJson.length.toString();
    writeHeaders["If-Match"] = "*";
    
    const writeResponse = await fetch(upsertUrl, {
      method: "PUT",
      headers: writeHeaders,
      body: entityJson
    });
    
    if (!writeResponse.ok) {
      const errorText = await writeResponse.text();
      context.log.error("Write failed:", writeResponse.status, errorText);
      throw new Error(`Failed to write table entity: ${writeResponse.status}`);
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

