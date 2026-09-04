"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function RevenueChart({ data }: { data: { day: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#4a5b78", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "#eaf2fc" }}
          formatter={((value: unknown) => [
            `₱${Number(value ?? 0).toLocaleString("en-PH")}`,
            "Revenue",
          ]) as never}
          contentStyle={{ borderRadius: 8, border: "1px solid #dbe4f0", fontSize: 13 }}
        />
        <Bar dataKey="revenue" fill="#174ea6" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
