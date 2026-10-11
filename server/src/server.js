require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const AIWorkerService = require('./workers/AIWorkerService');

const PORT = process.env.PORT || 5000;
const worker = new AIWorkerService();

const start = async () => {
  try {
    await connectDB();
    
    worker.start();

    const server = app.listen(PORT, () => {
      console.log(`SmartAudit server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      worker.stop();
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
