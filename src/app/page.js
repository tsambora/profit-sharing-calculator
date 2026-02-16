"use client";

import { useState } from "react";
import SimulationTabs from "@/components/SimulationTabs";
import LenderInvestmentTable from "@/components/inputs/LenderInvestmentTable";
import BorrowerRepaymentTable from "@/components/inputs/BorrowerRepaymentTable";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [tablesOpen, setTablesOpen] = useState(true);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Profit Sharing Simulator</h1>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <button
          onClick={() => setTutorialOpen(!tutorialOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-semibold text-blue-900">How This Simulation Works</h3>
          <span className="text-blue-600 text-sm">{tutorialOpen ? "▲" : "▼"}</span>
        </button>
        {tutorialOpen && (
          <div className="mt-3 space-y-2 text-sm text-blue-900">
            <div>
              <span className="font-bold">Repayment Pool Split</span> — Each repayment is split into 4 pools: Lender Margin (15%), Lender Principal (67%), Platform Margin (17%), Platform Provision (1%).
            </div>
            <div>
              <span className="font-bold">Rebidding (Loan Re-addition)</span> — Whenever accumulated Lender Principal reaches 5,000,000 IDR, a new rebidding loan is created (5M loan, 133K/week repayment). This can trigger multiple times as principal accumulates. Repayments from rebidding loans flow through the same 4-pool split, compounding returns over time.
            </div>
            <div>
              <span className="font-bold">133% Loan Cap</span> — Each borrower repays up to 133% of their loan amount, then stops.
            </div>
            <div>
              <span className="font-bold">NAV Calculation</span> — NAV = (Accumulated Lender Margin + Total AUM) / Total Units. Recalculated daily. Resets after monthly payout.
            </div>
            <div>
              <span className="font-bold">Monthly Payout Cycle</span> — At month-end: write-offs are absorbed from pools, lender margin is distributed as payouts proportional to units held, then margin pool resets.
            </div>
          </div>
        )}
      </div>

      <SimulationTabs />

      <div className="mb-6">
        <button
          onClick={() => setTablesOpen(!tablesOpen)}
          className="flex items-center gap-2 mb-2"
        >
          <span className="text-sm text-gray-500">{tablesOpen ? "▲" : "▼"}</span>
          <p className="text-sm text-gray-500">
            Input lender investments and borrower repayments to simulate profit
            distribution.
          </p>
        </button>
        {tablesOpen && (
          <div className="space-y-4">
            <LenderInvestmentTable />
            <BorrowerRepaymentTable />
          </div>
        )}
      </div>

      <Dashboard />
    </main>
  );
}
