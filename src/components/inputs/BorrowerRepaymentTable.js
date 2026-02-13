"use client";

import { useState } from "react";
import useSimulationStore from "@/store/simulationStore";

export default function BorrowerRepaymentTable() {
  const { tabs, activeTabId, addBorrower, updateBorrower, removeBorrower } =
    useSimulationStore();
  const borrowers = tabs[activeTabId]?.borrowers || [];

  const [form, setForm] = useState({
    borrowerId: "",
    schedule: "weekly",
    amount: "",
  });
  const [editingId, setEditingId] = useState(null);

  const handleAdd = () => {
    if (!form.borrowerId || !form.amount) return;
    addBorrower({
      borrowerId: form.borrowerId,
      schedule: form.schedule,
      amount: Number(form.amount),
    });
    setForm({ borrowerId: "", schedule: "weekly", amount: "" });
  };

  const handleUpdate = () => {
    if (!form.borrowerId || !form.amount) return;
    updateBorrower(editingId, {
      borrowerId: form.borrowerId,
      schedule: form.schedule,
      amount: Number(form.amount),
    });
    setEditingId(null);
    setForm({ borrowerId: "", schedule: "weekly", amount: "" });
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setForm({
      borrowerId: b.borrowerId,
      schedule: b.schedule,
      amount: String(b.amount),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ borrowerId: "", schedule: "weekly", amount: "" });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Borrower Repayments</h3>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <input
          type="text"
          placeholder="Borrower ID"
          className="border rounded px-2 py-1 text-sm"
          value={form.borrowerId}
          onChange={(e) => setForm({ ...form, borrowerId: e.target.value })}
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={form.schedule}
          onChange={(e) => setForm({ ...form, schedule: e.target.value })}
        >
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
        </select>
        <input
          type="number"
          placeholder="Repayment Amount"
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

      {borrowers.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-2 px-2">Borrower ID</th>
              <th className="text-left py-2 px-2">Schedule</th>
              <th className="text-right py-2 px-2">Amount</th>
              <th className="text-right py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {borrowers.map((b) => (
              <tr key={b.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-2">{b.borrowerId}</td>
                <td className="py-2 px-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                    {b.schedule}
                  </span>
                </td>
                <td className="py-2 px-2 text-right">
                  {b.amount.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right">
                  <button
                    onClick={() => startEdit(b)}
                    className="text-blue-600 hover:text-blue-800 mr-2 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeBorrower(b.id)}
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

      {borrowers.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">
          No borrowers added yet
        </p>
      )}
    </div>
  );
}
