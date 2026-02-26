const { TableClient } = require("@azure/data-tables");

const TABLE_NAME = "visitCounter";
const PARTITION_KEY = "counter";
const ROW_KEY = "global";

module.exports = async function (context, req) {
  context.log("Counter API called", { method: req.method });
  
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    context.log.error("AZURE_STORAGE_CONNECTION_STRING is missing");
    context.res = {
      status: 500,
      body: { error: "Connection string not configured" }
    };
    return;
  }

  context.log("Connection string found, length:", connectionString.length);

  try {
    const tableClient = TableClient.fromConnectionString(connectionString, TABLE_NAME);
    context.log("Table client created");

    await tableClient.createTable().catch((error) => {
      if (error.statusCode !== 409) {
        context.log.error("Table creation error:", error.statusCode, error.message);
        throw error;
      }
      context.log("Table already exists");
    });

    let count = 0;

    try {
      const entity = await tableClient.getEntity(PARTITION_KEY, ROW_KEY);
      count = typeof entity.count === "number" ? entity.count : parseInt(entity.count || "0", 10);
      context.log("Entity found, current count:", count);
    } catch (error) {
      if (error.statusCode !== 404) {
        context.log.error("Get entity error:", error.statusCode, error.message);
        throw error;
      }
      context.log("Entity not found, creating new");
      count = 0;
    }

    if (req.method !== "OPTIONS") {
      count += 1;
      context.log("Incrementing count to:", count);
      await tableClient.upsertEntity({
        partitionKey: PARTITION_KEY,
        rowKey: ROW_KEY,
        count
      });
      context.log("Entity upserted successfully");
    }

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      },
      body: { count, success: true }
    };
    context.log("Response sent:", { count });
  } catch (error) {
    context.log.error("Counter API error:", error.message, error.statusCode);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: error.message || "Internal server error" }
    };
  }
};
