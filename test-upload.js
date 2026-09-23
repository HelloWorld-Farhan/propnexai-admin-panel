const fs = require("fs");
fs.writeFileSync("test.txt", "Hello World!");

async function main() {
  const formData = new FormData();
  const fileBlob = new Blob(["Hello World!"], { type: "text/plain" });
  formData.append("file", fileBlob, "test.txt");

  const res = await fetch("http://localhost:3000/api/upload-audio", {
    method: "POST",
    body: formData
  });

  const text = await res.text();
  console.log("Response:", text);
}
main();

