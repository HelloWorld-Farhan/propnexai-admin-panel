const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  const script = `
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
cd /root/propnex-server && pm2 start npm --name propnex-server -- run start:prod
cd /root/propnexai-main-server && pm2 start npm --name propnexai-main-server -- run start:prod
cd /root/propnexai-admin-panel && pm2 start npm --name propnexai-admin -- run start
pm2 save
pm2 list
`;
  conn.exec(script, (err, stream) => { 
    if (err) throw err; 
    stream.on('close', () => conn.end()).on('data', (d) => process.stdout.write(d)).stderr.on('data', (d) => process.stderr.write(d)); 
  }); 
}).connect({ host: '200.234.34.240', port: 22, username: 'root', password: 'Propnexai@123' });
