const { TableClient } = require("@azure/data-tables");

const TABLE_NAME = "visitCounter";
const PARTITION_KEY = "counter";
const ROW_KEY = "global";

module.exports = async function (context, req) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    context.res = {
      status: 500,
      body: { error: "AZURE_STORAGE_CONNECTION_STRING is missing" }
    };
    return;
  }

  try {
    const tableClient = TableClient.fromConnectionString(connectionString, TABLE_NAME);

    await tableClient.createTable().catch((error) => {
      if (error.statusCode !== 409) {
        throw error;
      }
    });

    let count = 0;

    try {
      const entity = await tableClient.getEntity(PARTITION_KEY, ROW_KEY);
      count = typeof entity.count === "number" ? entity.count : parseInt(entity.count || "0", 10);
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }

    if (req.method === "POST") {
      count += 1;
      await tableClient.upsertEntity({
        partitionKey: PARTITION_KEY,
        rowKey: ROW_KEY,
        count
      });
    }

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: { count }
    };
  } catch (error) {
    context.log.error("Counter API error:", error.message);
    context.res = {
      status: 500,
      body: { error: error.message || "Internal server error" }
    };
  }
};
