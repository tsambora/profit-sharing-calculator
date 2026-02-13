"use client";

import { useState } from "react";
import useSimulationStore from "@/store/simulationStore";

export default function WriteOffTable() {
  const { tabs, activeTabId, addWriteOff, updateWriteOff, removeWriteOff } =
    useSimulationStore();
  const writeOffs = tabs[activeTabId]?.writeOffs || [];

  const [form, setForm] = useState({
    borrowerId: "",
    writeOffDate: "",
    outstandingAmount: "",
  });
  const [editingId, setEditingId] = useState(null);

  const handleAdd = () => {
    if (!form.borrowerId || !form.writeOffDate || !form.outstandingAmount) return;
    addWriteOff({
      borrowerId: form.borrowerId,
      writeOffDate: form.writeOffDate,
      outstandingAmount: Number(form.outstandingAmount),
    });
    setForm({ borrowerId: "", writeOffDate: "", outstandingAmount: "" });
  };

  const handleUpdate = () => {
    if (!form.borrowerId || !form.writeOffDate || !form.outstandingAmount) return;
    updateWriteOff(editingId, {
      borrowerId: form.borrowerId,
      writeOffDate: form.writeOffDate,
      outstandingAmount: Number(form.outstandingAmount),
    });
    setEditingId(null);
    setForm({ borrowerId: "", writeOffDate: "", outstandingAmount: "" });
  };

  const startEdit = (wo) => {
    setEditingId(wo.id);
    setForm({
      borrowerId: wo.borrowerId,
      writeOffDate: wo.writeOffDate,
      outstandingAmount: String(wo.outstandingAmount),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ borrowerId: "", writeOffDate: "", outstandingAmount: "" });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Loan Write-Offs</h3>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <input
          type="text"
          placeholder="Borrower ID"
          className="border rounded px-2 py-1 text-sm"
          value={form.borrowerId}
          onChange={(e) => setForm({ ...form, borrowerId: e.target.value })}
        />
        <input
          type="date"
          className="border rounded px-2 py-1 text-sm"
          value={form.writeOffDate}
          onChange={(e) => setForm({ ...form, writeOffDate: e.target.value })}
        />
        <input
          type="number"
          placeholder="Outstanding Amount"
          className="border rounded px-2 py-1 text-sm"
          value={form.outstandingAmount}
          onChange={(e) =>
            setForm({ ...form, outstandingAmount: e.target.value })
          }
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

      {writeOffs.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-2 px-2">Borrower ID</th>
              <th className="text-left py-2 px-2">Write-Off Date</th>
              <th className="text-right py-2 px-2">Outstanding Amount</th>
              <th className="text-right py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {writeOffs.map((wo) => (
              <tr key={wo.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-2">{wo.borrowerId}</td>
                <td className="py-2 px-2">{wo.writeOffDate}</td>
                <td className="py-2 px-2 text-right">
                  {wo.outstandingAmount.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right">
                  <button
                    onClick={() => startEdit(wo)}
                    className="text-blue-600 hover:text-blue-800 mr-2 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeWriteOff(wo.id)}
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

      {writeOffs.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">
          No write-offs added yet
        </p>
      )}
    </div>
  );
}
