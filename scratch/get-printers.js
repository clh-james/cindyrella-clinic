import { execSync } from "child_process";

try {
  const output = execSync(
    'powershell -Command "Get-PnpDevice -Class Bluetooth | Select-Object FriendlyName, InstanceId, Status | ConvertTo-Json"',
    { encoding: "utf8" }
  );
  const devices = JSON.parse(output);
  const filtered = devices.filter(d => d.InstanceId && d.InstanceId.includes("DEV_"));
  console.log("=== PAIRED BLUETOOTH DEVICES WITH MAC ADDRESSES ===");
  filtered.forEach(d => {
    const match = d.InstanceId.match(/DEV_([0-9A-Fa-f]{12})/);
    if (match) {
      const rawMac = match[1];
      const formattedMac = rawMac.match(/.{1,2}/g).join(":").toUpperCase();
      console.log(`Device: ${d.FriendlyName}`);
      console.log(`MAC Address: ${formattedMac}`);
      console.log(`Instance ID: ${d.InstanceId}`);
      console.log(`Status: ${d.Status}`);
      console.log("--------------------------------------------------");
    }
  });
} catch (e) {
  console.error(e);
}
