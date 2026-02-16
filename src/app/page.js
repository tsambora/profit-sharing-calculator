"use client";

import { useState } from "react";
import SimulationTabs from "@/components/SimulationTabs";
import LenderInvestmentTable from "@/components/inputs/LenderInvestmentTable";
import BorrowerRepaymentTable from "@/components/inputs/BorrowerRepaymentTable";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [guideOpen, setGuideOpen] = useState(true);
  const [tablesOpen, setTablesOpen] = useState(true);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Profit Sharing Simulator</h1>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-semibold text-green-900">How to Use This Simulator</h3>
          <span className="text-green-600 text-sm">{guideOpen ? "▲" : "▼"}</span>
        </button>
        {guideOpen && (
          <div className="mt-3 space-y-2 text-sm text-green-900">
            <div>
              <span className="font-bold">1. Set Up Lenders</span> — In the Lender Investment table, add one or more lenders. Adjust the <em>investment amount</em> and <em>start date</em> for each. Try adding multiple lenders with different amounts to see how payouts are distributed proportionally based on units held.
            </div>
            <div>
              <span className="font-bold">2. Set Up Borrowers</span> — In the Borrower Repayment table, add borrowers with different <em>loan amounts</em>, <em>weekly repayment values</em>, and <em>start dates</em>. More borrowers or higher repayments mean faster fund returns and more frequent rebidding.
            </div>
            <div>
              <span className="font-bold">3. Run the Simulation</span> — Click the <em>Run Simulation</em> button. The dashboard will show charts for AUM movement, NAV, payouts, and more.
            </div>
            <div>
              <span className="font-bold">4. Things to Experiment With</span>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li><strong>Large vs small investments</strong> — Compare a single 100M lender vs multiple smaller lenders to see how unit allocation affects payout distribution.</li>
                <li><strong>Repayment speed</strong> — Increase weekly repayment amounts to see how faster borrower repayments accelerate rebidding and compound lender returns.</li>
                <li><strong>Staggered timing</strong> — Set different start dates for lenders and borrowers to observe how late entries affect NAV and unit pricing.</li>
                <li><strong>Multiple borrowers</strong> — Add several borrowers to see how a diversified loan book impacts the repayment pool and overall returns.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

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
            <div>
              <span className="font-bold">Write-Off Absorption Waterfall</span> — When a borrower defaults (stops repaying), the outstanding loan amount becomes a write-off at the 1st of the following month. The write-off is absorbed in this order:
              <ol className="list-decimal ml-5 mt-1 space-y-1">
                <li><strong>Lender Margin (15%)</strong> — absorbs first from the monthly accumulated margin pool.</li>
                <li><strong>Platform Provision (1%)</strong> — absorbs next from the cumulative provision pool.</li>
                <li><strong>Platform Revenue (17%)</strong> — absorbs next from the cumulative revenue pool.</li>
                <li><strong>Lender Principal (67%)</strong> — absorbs last from the cumulative principal pool.</li>
              </ol>
              <div className="mt-1">If all four pools are exhausted and a remainder still exists, that <strong>unabsorbed</strong> amount permanently reduces the fund&apos;s AUM. This is visible in the AUM Movement table.</div>
            </div>
            <div>
              <span className="font-bold">AUM Recovery Mechanism</span> — When an unabsorbed write-off reduces AUM, a recovery mode activates to gradually restore the deficit. During recovery:
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li><strong>83% of each repayment</strong> (Lender Margin 15% + Lender Principal 67% + Platform Provision 1%) is funneled back into AUM to close the deficit.</li>
                <li><strong>Platform Revenue (17%)</strong> always flows normally — the platform is always paid regardless of recovery mode.</li>
                <li><strong>Lender payouts are paused</strong> — margin is funneled to AUM recovery instead of being distributed as payouts.</li>
                <li><strong>Rebidding is paused</strong> — no new rebidding loans are created while the deficit exists, since principal is being funneled to recovery.</li>
                <li><strong>Immediate resume</strong> — as soon as the deficit is fully recovered (reaches 0), normal distribution resumes. If the deficit clears mid-repayment, the remainder is proportionally distributed to pools.</li>
              </ul>
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
