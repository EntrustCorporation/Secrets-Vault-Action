const { run } = require('./action');

// Execute the action
run().catch(error => {
  console.error('Action failed:', error);
  process.exit(1);
});
