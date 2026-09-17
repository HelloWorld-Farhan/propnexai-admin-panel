
const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb://propnex_admin:Propnexai%40123@200.234.34.240:27017/propnex?authSource=admin&replicaSet=rs0';
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('propnex');
    
    const cId = new ObjectId('6a8bed4d3f5b7c2eea48418e');
    const failedCalls = await db.collection('CallLog').find({ companyId: cId, direction: 'OUTBOUND' }).sort({ startedAt: -1 }).toArray();
    
    // Filter like the Prisma query
    const filtered = failedCalls.filter(c => {
       const isFailed = ['FAILED', 'MISSED', 'BUSY', 'NO_ANSWER', 'CANCELLED'].includes(c.status) || c.durationSeconds === 0;
       const isInitial = !c.correlationId || !c.correlationId.startsWith('reactivation-');
       return isFailed && isInitial;
    });
    
    console.log('Filtered initial failed calls for Test1:', filtered.length);
    for (const c of filtered) {
       const lead = await db.collection('Lead').findOne({ _id: c.leadId });
       console.log('Call on', c.startedAt, c.status, 'leadPhone:', lead ? lead.phone : 'No lead phone');
    }
  } finally {
    await client.close();
  }
}
run().catch(console.error);

