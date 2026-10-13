async function testImports() {
  try {
    console.log("1. Testing recharts import...");
    const recharts = await import("recharts");
    console.log("recharts loaded successfully:", !!recharts.BarChart);
  } catch (err) {
    console.error("recharts import error:", err);
  }

  try {
    console.log("2. Testing xlsx import...");
    const xlsx = await import("xlsx");
    console.log("xlsx loaded successfully:", !!xlsx.utils);
  } catch (err) {
    console.error("xlsx import error:", err);
  }
}

testImports();
