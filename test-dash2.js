
const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb://propnex_admin:Propnexai%40123@200.234.34.240:27017/propnex?authSource=admin&replicaSet=rs0';
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('propnex');
    const companyId = new ObjectId('6a8bed4d3f5b7c2eea48418e');

    const failedCalls = await db.collection('CallLog').find({
      companyId,
      direction: 'OUTBOUND'
    }).sort({ startedAt: -1 }).toArray();

    const filtered = failedCalls.filter(c => {
       const isFailed = ['FAILED', 'MISSED', 'BUSY', 'NO_ANSWER', 'CANCELLED'].includes(c.status) || c.durationSeconds === 0;
       const isInitial = !c.correlationId || !c.correlationId.startsWith('reactivation-');
       return isFailed && isInitial;
    });

    // Let's mimic what route.ts does exactly
    const buckets = {};
    for (const call of filtered) {
       // fallbackCustomerNumber is empty because no webhooks in this local script, but we have leadId
       const lead = await db.collection('Lead').findOne({ _id: call.leadId });
       const leadPhone = lead ? lead.phone : '';
       if (!leadPhone) continue;
       const d = call.startedAt;
       const key = ${d.getFullYear()}--;
       
       if (!buckets[key]) {
         buckets[key] = { id: key, failedLeads: [] };
       }
       if (!buckets[key].failedLeads.find(l => l.phone === leadPhone)) {
         buckets[key].failedLeads.push({ phone: leadPhone });
       }
    }
    console.log('Buckets keys:', Object.keys(buckets));
    Object.keys(buckets).forEach(k => {
      console.log('Bucket', k, 'has', buckets[key = k].failedLeads.length, 'leads');
    });

  } finally {
    await client.close();
  }
}
run().catch(console.error);

