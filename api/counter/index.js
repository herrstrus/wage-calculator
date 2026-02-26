module.exports = async function (context, req) {
  context.log('Counter API invoked');
  
  // For Azure Static Web Apps managed functions, return simple object
  return {
    status: 200,
    body: {
      count: 42,
      message: "API is working",
      timestamp: new Date().toISOString()
    }
  };
};

