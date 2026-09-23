const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  conn.exec("sed -i \"/http {/a \\\tclient_max_body_size 50M;\" /etc/nginx/nginx.conf && nginx -t && systemctl restart nginx", (err, stream) => {
    if (err) throw err;
    stream.on("close", (code, signal) => {
      conn.end();
    }).on("data", (data) => {
      console.log(data.toString());
    }).stderr.on("data", (data) => {
      console.error(data.toString());
    });
  });
}).connect({
  host: "200.234.34.240",
  port: 22,
  username: "root",
  password: "Propnexai@123"
});
