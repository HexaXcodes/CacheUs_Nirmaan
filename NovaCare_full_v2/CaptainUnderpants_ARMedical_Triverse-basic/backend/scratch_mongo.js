// Temporary throwaway in-memory MongoDB for local testing only.
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27017, dbName: 'novacare' }
  });
  console.log('MONGO_READY ' + mongod.getUri());
  process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0); });
})();
