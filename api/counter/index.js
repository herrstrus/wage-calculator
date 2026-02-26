// Simple in-memory counter (resets on function restart)
let globalCount = parseInt(process.env.GLOBAL_COUNTER_INIT || "0", 10);

module.exports = async function (context, req) {
  try {
    // Increment global counter
    globalCount++;
    
    return {
      status: 200,
      body: { 
        count: globalCount,
        timestamp: new Date().toISOString(),
        note: "Counter stored in memory - resets on deployment"
      }
    };
  } catch (error) {
    context.log.error("Error in counter function:", error);
    return {
      status: 500,
      body: { error: error.message }
    };
  }
};

