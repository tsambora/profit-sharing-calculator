"use client";

import { useState } from "react";
import useSimulationStore from "@/store/simulationStore";

export default function LenderInvestmentTable() {
  const { tabs, activeTabId, addInvestment, updateInvestment, removeInvestment } =
    useSimulationStore();
  const investments = tabs[activeTabId]?.investments || [];

  const [form, setForm] = useState({
    lenderId: "",
    type: "topup",
    date: "",
    amount: "",
  });
  const [editingId, setEditingId] = useState(null);

  const handleAdd = () => {
    if (!form.lenderId || !form.date || !form.amount) return;
    addInvestment({
      lenderId: form.lenderId,
      type: form.type,
      date: form.date,
      amount: Number(form.amount),
    });
    setForm({ lenderId: "", type: "topup", date: "", amount: "" });
  };

  const handleUpdate = () => {
    if (!form.lenderId || !form.date || !form.amount) return;
    updateInvestment(editingId, {
      lenderId: form.lenderId,
      type: form.type,
      date: form.date,
      amount: Number(form.amount),
    });
    setEditingId(null);
    setForm({ lenderId: "", type: "topup", date: "", amount: "" });
  };

  const startEdit = (inv) => {
    setEditingId(inv.id);
    setForm({
      lenderId: inv.lenderId,
      type: inv.type,
      date: inv.date,
      amount: String(inv.amount),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ lenderId: "", type: "topup", date: "", amount: "" });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Lender Investments</h3>

      <div className="grid grid-cols-5 gap-2 mb-3">
        <input
          type="text"
          placeholder="Lender ID"
          className="border rounded px-2 py-1 text-sm"
          value={form.lenderId}
          onChange={(e) => setForm({ ...form, lenderId: e.target.value })}
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="topup">Investment (Top-up)</option>
          <option value="withdraw">Divestment (Withdraw)</option>
        </select>
        <input
          type="date"
          className="border rounded px-2 py-1 text-sm"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <input
          type="number"
          placeholder="Amount"
          className="border rounded px-2 py-1 text-sm"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <div className="flex gap-1">
          {editingId ? (
            <>
              <button
                onClick={handleUpdate}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Update
              </button>
              <button
                onClick={cancelEdit}
                className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {investments.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-2 px-2">Lender ID</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-left py-2 px-2">Date</th>
              <th className="text-right py-2 px-2">Amount</th>
              <th className="text-right py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {investments.map((inv) => (
              <tr key={inv.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-2">{inv.lenderId}</td>
                <td className="py-2 px-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      inv.type === "topup"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {inv.type === "topup" ? "Top-up" : "Withdraw"}
                  </span>
                </td>
                <td className="py-2 px-2">{inv.date}</td>
                <td className="py-2 px-2 text-right">
                  {inv.amount.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right">
                  <button
                    onClick={() => startEdit(inv)}
                    className="text-blue-600 hover:text-blue-800 mr-2 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeInvestment(inv.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {investments.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">
          No investments added yet
        </p>
      )}
    </div>
  );
}
