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

export default function PrincipalReturnedChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold mb-2">
        Principal Returned vs Invested per Lender
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="lenderId" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v.toLocaleString("id-ID")} />
          <Tooltip formatter={(v) => v.toLocaleString("id-ID")} />
          <Legend />
          <Bar dataKey="totalInvested" fill="#94a3b8" name="Total Invested" />
          <Bar dataKey="totalPayout" fill="#2563eb" name="Total Payout" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
