"use client";

import { useState } from "react";
import useSimulationStore from "@/store/simulationStore";
import { computeWriteOffDate, computeWriteOffOutstanding } from "@/engine/borrowerUtils";

const FIXED_REPAYMENT = 133000;
const FIXED_LOAN_AMOUNT = 5000000;

export default function BorrowerRepaymentTable() {
  const { tabs, activeTabId, addBorrower, updateBorrower, removeBorrower, clearBorrowers } =
    useSimulationStore();
  const borrowers = tabs[activeTabId]?.borrowers || [];

  const [form, setForm] = useState({
    borrowerId: "",
    schedule: "weekly",
    startDate: "",
    repaymentStopDate: "",
    count: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  const handleAdd = () => {
    const count = Number(form.count) || 1;

    if (count > 1) {
      if (!form.startDate) return;
      // Find the highest existing B-### number to continue from
      let maxNum = 0;
      for (const b of borrowers) {
        const match = b.borrowerId.match(/^B-(\d+)$/);
        if (match) maxNum = Math.max(maxNum, Number(match[1]));
      }
      for (let i = 1; i <= count; i++) {
        const id = `B-${String(maxNum + i).padStart(3, "0")}`;
        addBorrower({
          borrowerId: id,
          schedule: form.schedule,
          startDate: form.startDate,
          amount: FIXED_REPAYMENT,
          loanAmount: FIXED_LOAN_AMOUNT,
          repaymentStopDate: form.repaymentStopDate || "",
        });
      }
    } else {
      if (!form.borrowerId || !form.startDate) return;
      addBorrower({
        borrowerId: form.borrowerId,
        schedule: form.schedule,
        startDate: form.startDate,
        amount: FIXED_REPAYMENT,
        loanAmount: FIXED_LOAN_AMOUNT,
        repaymentStopDate: form.repaymentStopDate || "",
      });
    }

    setForm({ borrowerId: "", schedule: "weekly", startDate: "", repaymentStopDate: "", count: "" });
  };

  const handleUpdate = () => {
    if (!form.borrowerId || !form.startDate) return;
    updateBorrower(editingId, {
      borrowerId: form.borrowerId,
      schedule: form.schedule,
      startDate: form.startDate,
      amount: FIXED_REPAYMENT,
      loanAmount: FIXED_LOAN_AMOUNT,
      repaymentStopDate: form.repaymentStopDate || "",
    });
    setEditingId(null);
    setForm({ borrowerId: "", schedule: "weekly", startDate: "", repaymentStopDate: "", count: "" });
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setForm({
      borrowerId: b.borrowerId,
      schedule: b.schedule,
      startDate: b.startDate || "",
      repaymentStopDate: b.repaymentStopDate || "",
      count: "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ borrowerId: "", schedule: "weekly", startDate: "", repaymentStopDate: "", count: "" });
  };

  const bulkMode = !editingId && Number(form.count) > 1;

  // Compute write-off preview for the form
  const formWriteOffDate = form.repaymentStopDate ? computeWriteOffDate(form.repaymentStopDate) : null;
  const formOutstanding = (form.repaymentStopDate && form.startDate)
    ? computeWriteOffOutstanding(
        form.startDate,
        form.schedule,
        form.repaymentStopDate,
        FIXED_REPAYMENT,
        FIXED_LOAN_AMOUNT
      )
    : null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Borrower Repayments</h3>
        <div className="text-xs text-gray-500">
          Fixed: Rp {FIXED_REPAYMENT.toLocaleString()} repayment / Rp {FIXED_LOAN_AMOUNT.toLocaleString()} loan
        </div>
        {borrowers.length > 0 && (
          <button
            onClick={clearBorrowers}
            className="text-red-600 hover:text-red-800 text-xs"
          >
            Delete All
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        <input
          type="text"
          placeholder="Borrower ID"
          className="border rounded px-2 py-1 text-sm"
          value={bulkMode ? "" : form.borrowerId}
          disabled={bulkMode}
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
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Repayment Start Date</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm w-full"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Repayment Stop Date</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm w-full"
            value={form.repaymentStopDate}
            onChange={(e) => setForm({ ...form, repaymentStopDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {form.repaymentStopDate && (
          <div className="text-xs text-gray-500 flex flex-col justify-center">
            <div>Write-off: <span className="font-medium text-gray-700">{formWriteOffDate}</span></div>
            <div>Outstanding: <span className="font-medium text-gray-700">{formOutstanding !== null ? formOutstanding.toLocaleString() : "—"}</span></div>
          </div>
        )}
        {!form.repaymentStopDate && <div />}
        <div />
        <div />
        <div className="flex gap-1 items-end">
          {!editingId && (
            <input
              type="number"
              placeholder="How many borrowers?"
              className="border rounded px-2 py-1 text-sm w-44"
              min="1"
              value={form.count}
              onChange={(e) => setForm({ ...form, count: e.target.value })}
            />
          )}
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

      {borrowers.length > 0 && (() => {
        const totalPages = Math.ceil(borrowers.length / PAGE_SIZE);
        const safePage = Math.min(page, totalPages - 1);
        const startIdx = safePage * PAGE_SIZE;
        const pageRows = borrowers.slice(startIdx, startIdx + PAGE_SIZE);
        return (
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">
                Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, borrowers.length)} of {borrowers.length.toLocaleString()} borrowers
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-gray-100"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-gray-600">
                    Page {safePage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                    disabled={safePage >= totalPages - 1}
                    className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2">Borrower ID</th>
                  <th className="text-left py-2 px-2">Schedule</th>
                  <th className="text-left py-2 px-2">Start Date</th>
                  <th className="text-left py-2 px-2">Stop Date</th>
                  <th className="text-left py-2 px-2">Write-Off Date</th>
                  <th className="text-right py-2 px-2">Outstanding</th>
                  <th className="text-right py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((b) => {
                  const woDate = b.repaymentStopDate ? computeWriteOffDate(b.repaymentStopDate) : null;
                  const outstanding = b.repaymentStopDate
                    ? computeWriteOffOutstanding(b.startDate, b.schedule, b.repaymentStopDate, FIXED_REPAYMENT, FIXED_LOAN_AMOUNT)
                    : null;
                  return (
                    <tr key={b.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2">{b.borrowerId}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                          {b.schedule}
                        </span>
                      </td>
                      <td className="py-2 px-2">{b.startDate}</td>
                      <td className="py-2 px-2 text-gray-500">
                        {b.repaymentStopDate || "—"}
                      </td>
                      <td className="py-2 px-2 text-gray-500">
                        {woDate || "—"}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-500">
                        {outstanding !== null ? outstanding.toLocaleString() : "—"}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {borrowers.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">
          No borrowers added yet
        </p>
      )}
    </div>
  );
}
