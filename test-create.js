const axios = require('axios');

async function testCreateCompany() {
  try {
    const res = await axios.post('http://localhost:3003/api/companies', {
      name: 'Hello4',
      cli: 'LNXXE',
      pendingUserEmail: 'farhankhalid.hello4@gmail.com'
    }, {
      headers: {
        // Need to simulate admin session or it will fail with Unauthorized.
        // Let's just see if it fails with 401. If so, I can't hit it directly.
      }
    });
    console.log("RESPONSE:", res.data);
  } catch (err) {
    console.error("ERROR:", err.response ? err.response.data : err.message);
  }
}

testCreateCompany();
