"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2"];

export default function PayoutChart({ data, lenderIds }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold mb-2">Monthly Payout per Lender</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          {lenderIds.map((lid, i) => (
            <Bar
              key={lid}
              dataKey={lid}
              fill={COLORS[i % COLORS.length]}
              name={`Lender ${lid}`}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
