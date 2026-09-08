const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  const script = `
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
pm2 startup systemd -u root --hp /root
pm2 save
`;
  conn.exec(script, (err, stream) => { 
    if (err) throw err; 
    stream.on('close', () => conn.end()).on('data', (d) => process.stdout.write(d)).stderr.on('data', (d) => process.stderr.write(d)); 
  }); 
}).connect({ host: '200.234.34.240', port: 22, username: 'root', password: 'Propnexai@123' });
