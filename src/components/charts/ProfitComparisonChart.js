"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const NAV_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"];
const AVG_COLORS = ["#ea580c", "#f97316", "#fb923c", "#fdba74"];

export default function ProfitComparisonChart({ data, lenderIds }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4 col-span-1 lg:col-span-2">
      <h3 className="text-sm font-semibold mb-2">
        Profit Distribution Comparison: NAV vs Average Balance
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontSize: 10 }}
            width={80}
            tickFormatter={(v) => v.toLocaleString("id-ID")}
          />
          <Tooltip formatter={(v) => v.toLocaleString("id-ID")} />
          <Legend />
          {lenderIds.map((lid, i) => (
            <Line
              key={`nav_${lid}`}
              type="monotone"
              dataKey={`nav_${lid}`}
              stroke={NAV_COLORS[i % NAV_COLORS.length]}
              name={`${lid} NAV`}
              dot={{ r: 2 }}
              strokeWidth={2}
            />
          ))}
          {lenderIds.map((lid, i) => (
            <Line
              key={`avg_${lid}`}
              type="monotone"
              dataKey={`avg_${lid}`}
              stroke={AVG_COLORS[i % AVG_COLORS.length]}
              name={`${lid} Avg Bal`}
              dot={{ r: 2 }}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
