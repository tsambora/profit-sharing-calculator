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

export default function RepaymentPoolChart({
  data,
  dataKey,
  title,
  strokeColor,
  fillColor,
  noSample = false,
  secondDataKey,
  secondStrokeColor = "#f97316",
  secondFillColor = "#fed7aa",
  secondName = "Rebidding",
}) {
  if (!data || data.length === 0) return null;

  let sampled = data;
  if (!noSample) {
    const step = Math.max(1, Math.floor(data.length / 60));
    sampled = data.filter(
      (_, i) => i % step === 0 || i === data.length - 1
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={sampled}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v.toLocaleString("id-ID")} />
          <Tooltip formatter={(v) => v.toLocaleString("id-ID")} />
          <Legend />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={strokeColor}
            fill={fillColor}
            name={title}
            strokeWidth={2}
          />
          {secondDataKey && (
            <Area
              type="monotone"
              dataKey={secondDataKey}
              stroke={secondStrokeColor}
              fill={secondFillColor}
              name={secondName}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
