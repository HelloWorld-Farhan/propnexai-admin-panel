async function test() {
  const res = await fetch("http://localhost:3003/api/companies/6a86f276cc43528d28d018db/credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 5000, description: "Approved credit request" })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}
test();
