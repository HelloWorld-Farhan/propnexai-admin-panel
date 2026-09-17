
const { MongoClient } = require('mongodb');
const uri = 'mongodb://propnex_admin:Propnexai%40123@200.234.34.240:27017/propnex?authSource=admin&replicaSet=rs0';
async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to DB');
    const db = client.db('local');
    const oplog = db.collection('oplog.rs');
    const recentDeletes = await oplog.find({ op: 'd' }).sort({ '\': -1 }).limit(10).toArray();
    console.log('Recent Deletes:', recentDeletes.length);
    if (recentDeletes.length > 0) {
       console.log('Sample Delete Collection:', recentDeletes[0].ns);
       console.log('Sample Delete Document ID:', recentDeletes[0].o._id);
       
       // Can we recover the whole document from a delete op?
       // Oplog only stores the _id of the deleted document! NOT the full document!
       console.log(recentDeletes[0]);
    }
  } catch (e) {
    console.error(e.message);
  } finally {
    await client.close();
  }
}
run();

