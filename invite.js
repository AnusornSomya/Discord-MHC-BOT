require("dotenv").config();
const config = require("./config.json");

const clientId = process.env.CLIENT_ID || config.clientId;

if (!clientId || clientId.includes("ใส่")) {
  console.log("กรุณาใส่ CLIENT_ID หรือ Application ID ใน .env หรือ config.json ก่อน");
  process.exit(1);
}

const permissions = "8";
const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&integration_type=0&scope=bot+applications.commands`;

console.log("\nลิงก์เชิญบอท Mode.[H]ardCore:");
console.log(url);
console.log("");
