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

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2"];

export default function ReturnRateChart({ data, lenderIds, title = "Accumulated Return Rate per Lender (%)" }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} unit="%" />
          <Tooltip />
          <Legend />
          {lenderIds.map((lid, i) => (
            <Line
              key={lid}
              type="monotone"
              dataKey={lid}
              stroke={COLORS[i % COLORS.length]}
              name={`Lender ${lid}`}
              dot={{ r: 2 }}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
