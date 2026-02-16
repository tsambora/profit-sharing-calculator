"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AumChart({ data }) {
  if (!data || data.length === 0) return null;

  const step = Math.max(1, Math.floor(data.length / 60));
  const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold mb-2">AUM Movement</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={sampled}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v.toLocaleString("id-ID")} />
          <Tooltip formatter={(v) => v.toLocaleString("id-ID")} />
          <Legend />
          <Area
            type="monotone"
            dataKey="aum"
            stroke="#0891b2"
            fill="#cffafe"
            name="AUM"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
