
const { MongoClient } = require('mongodb');
const uri = 'mongodb://propnex_admin:Propnexai%40123@200.234.34.240:27017/propnex?authSource=admin&replicaSet=rs0';
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('propnex');
    
    // Find companies
    const companies = await db.collection('Company').find({}).toArray();
    console.log('Companies:', companies.map(c => c._id + ' ' + c.name));
    
    // Check calls for each company
    for (const c of companies) {
       const logs = await db.collection('CallLog').find({ companyId: c._id, direction: 'OUTBOUND' }).sort({ startedAt: -1 }).limit(5).toArray();
       console.log('Recent calls for', c.name, ':', logs.length > 0 ? logs[0].startedAt : 'None');
    }
  } finally {
    await client.close();
  }
}
run().catch(console.error);

