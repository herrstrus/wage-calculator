module.exports = async function (context, req) {
  context.log("Counter API called with method:", req.method);
  
  try {
    const responseBody = { 
      count: 42, 
      message: "API is working",
      timestamp: new Date().toISOString()
    };
    
    context.log("Sending response:", responseBody);
    
    // Azure Functions requires body to be a string for JSON responses
    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(responseBody)
    };
  } catch (error) {
    context.log.error("Error in counter function:", error);
    context.res = {
      status: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

