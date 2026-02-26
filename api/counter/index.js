module.exports = async function (context, req) {
  context.log("Counter API called with method:", req.method);
  
  // Simple test response - no external dependencies
  context.res = {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    },
    body: { 
      count: 42, 
      message: "API is working",
      timestamp: new Date().toISOString()
    }
  };
  
  context.log("Response sent:", context.res.body);
};

