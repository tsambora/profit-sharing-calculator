"use client";

import { useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

export default function NavChart({ data }) {
  const [left, setLeft] = useState(null);
  const [right, setRight] = useState(null);
  const [refLeft, setRefLeft] = useState("");
  const [refRight, setRefRight] = useState("");
  const [selecting, setSelecting] = useState(false);

  const resetZoom = useCallback(() => {
    setLeft(null);
    setRight(null);
    setRefLeft("");
    setRefRight("");
  }, []);

  if (!data || data.length === 0) return null;

  // Determine visible slice based on zoom
  let visibleData = data;
  if (left !== null && right !== null) {
    const li = Math.min(left, right);
    const ri = Math.max(left, right);
    visibleData = data.slice(li, ri + 1);
  }

  const onMouseDown = (e) => {
    if (!e) return;
    const idx = data.findIndex((d) => d.date === e.activeLabel);
    if (idx >= 0) {
      setRefLeft(e.activeLabel);
      setRefRight("");
      setSelecting(true);
    }
  };

  const onMouseMove = (e) => {
    if (selecting && e && e.activeLabel) {
      setRefRight(e.activeLabel);
    }
  };

  const onMouseUp = () => {
    if (!selecting) return;
    setSelecting(false);

    if (!refLeft || !refRight || refLeft === refRight) {
      setRefLeft("");
      setRefRight("");
      return;
    }

    let li = data.findIndex((d) => d.date === refLeft);
    let ri = data.findIndex((d) => d.date === refRight);

    if (li > ri) [li, ri] = [ri, li];

    // Require at least 3 data points in selection
    if (ri - li < 2) {
      setRefLeft("");
      setRefRight("");
      return;
    }

    // If already zoomed, adjust indices relative to full data
    if (left !== null) {
      li += left;
      ri += left;
    }

    setLeft(li);
    setRight(ri);
    setRefLeft("");
    setRefRight("");
  };

  const isZoomed = left !== null && right !== null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">NAV Movement</h3>
        <div className="flex items-center gap-2">
          {isZoomed && (
            <button
              onClick={resetZoom}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
            >
              Reset Zoom
            </button>
          )}
          <span className="text-xs text-gray-400">
            {isZoomed ? `${visibleData.length} days` : "Drag to zoom"}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={visibleData}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            allowDataOverflow
          />
          <YAxis
            tick={{ fontSize: 10 }}
            domain={["auto", "auto"]}
            allowDataOverflow
            tickFormatter={(v) => v.toLocaleString("id-ID")}
          />
          <Tooltip formatter={(v) => v.toLocaleString("id-ID")} />
          <Legend />
          <Line
            type="monotone"
            dataKey="nav"
            stroke="#2563eb"
            name="NAV"
            dot={false}
            strokeWidth={1.5}
            animationDuration={300}
          />
          {selecting && refLeft && refRight && (
            <ReferenceArea
              x1={refLeft}
              x2={refRight}
              strokeOpacity={0.3}
              fill="#2563eb"
              fillOpacity={0.1}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
