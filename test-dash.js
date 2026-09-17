
const { MongoClient } = require('mongodb');
const uri = 'mongodb://propnex_admin:Propnexai%40123@200.234.34.240:27017/propnex?authSource=admin&replicaSet=rs0';
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('propnex');
    
    const sampleLog = await db.collection('CallLog').findOne({ direction: 'OUTBOUND' });
    const cId = sampleLog.companyId;

    const failedCalls = await db.collection('CallLog').find({ companyId: cId, direction: 'OUTBOUND' }).sort({ startedAt: -1 }).toArray();
    
    console.log('Total outbound calls for company:', failedCalls.length);
    
    // Filter like the Prisma query
    const filtered = failedCalls.filter(c => {
       const isFailed = ['FAILED', 'MISSED', 'BUSY', 'NO_ANSWER', 'CANCELLED'].includes(c.status) || c.durationSeconds === 0;
       const isInitial = !c.correlationId || !c.correlationId.startsWith('reactivation-');
       return isFailed && isInitial;
    });
    
    console.log('Filtered initial failed calls:', filtered.length);
    if (filtered.length > 0) {
      console.log('Sample filtered:', filtered[0].startedAt, filtered[0].status);
    }
  } finally {
    await client.close();
  }
}
run().catch(console.error);

