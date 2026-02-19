"use client";

import { useState } from "react";
import useSimulationStore from "@/store/simulationStore";
import SimulationTabs from "@/components/SimulationTabs";
import LenderInvestmentTable from "@/components/inputs/LenderInvestmentTable";
import BorrowerRepaymentTable from "@/components/inputs/BorrowerRepaymentTable";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [guideOpen, setGuideOpen] = useState(true);
  const [tablesOpen, setTablesOpen] = useState(true);
  const { navMode, marginRebiddingPct, setNavMode, setMarginRebiddingPct } = useSimulationStore();

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Profit Sharing Simulator</h1>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-purple-900 mb-3">NAV Calculation Mode</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="navMode"
              value={2}
              checked={navMode === 2}
              onChange={() => setNavMode(2)}
              className="accent-purple-600"
            />
            <span className="text-sm text-purple-900">
              <strong>Option 1: Margin Rebidding NAV</strong> — A configured % of margin goes to rebidding instead of payout. NAV tracks the rebidding accumulator, so it stays smooth (no sawtooth).
            </span>
          </label>
          {navMode === 2 && (
            <div className="ml-6 flex items-center gap-2">
              <label className="text-sm text-purple-900 font-medium">Margin to Rebidding:</label>
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={marginRebiddingPct}
                onChange={(e) => setMarginRebiddingPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-20 px-2 py-1 border border-purple-300 rounded text-sm"
              />
              <span className="text-sm text-purple-700">%</span>
              <span className="text-xs text-purple-500 ml-2">
                ({100 - marginRebiddingPct}% goes to lender payout)
              </span>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="navMode"
              value={1}
              checked={navMode === 1}
              onChange={() => setNavMode(1)}
              className="accent-purple-600"
            />
            <span className="text-sm text-purple-900">
              <strong>Option 2: Margin Pool NAV</strong> — NAV = (Accumulated Margin + AUM) / Units. Margin resets monthly on payout.
            </span>
          </label>
        </div>
      </div>

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
              <span className="font-bold">2. Set Up Borrowers</span> — In the Borrower Repayment table, add borrowers with <em>start dates</em> and <em>schedules</em>. All borrowers have a fixed loan amount of Rp 5,000,000 and repayment of Rp 133,000. More borrowers mean faster fund returns and more frequent rebidding.
            </div>
            <div>
              <span className="font-bold">3. Run the Simulation</span> — Click the <em>Run Simulation</em> button. The dashboard will show charts for AUM movement, NAV, payouts, and more.
            </div>
            <div>
              <span className="font-bold">4. Things to Experiment With</span>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li><strong>Large vs small investments</strong> — Compare a single 100M lender vs multiple smaller lenders to see how unit allocation affects payout distribution.</li>
                <li><strong>Staggered timing</strong> — Set different start dates for lenders and borrowers to observe how late entries affect NAV and unit pricing.</li>
                <li><strong>Multiple borrowers</strong> — Add several borrowers to see how a diversified loan book impacts the repayment pool and overall returns.</li>
                <li><strong>NAV modes</strong> — Switch between Option 1 (Margin Rebidding) and Option 2 (Margin Pool) to compare smooth vs sawtooth NAV behavior. Try different rebidding percentages (0%, 50%, 100%) to see the trade-off between monthly payouts and NAV growth.</li>
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
              <span className="font-bold">Repayment Pool Split</span> — Each 133,000 IDR repayment is split into 4 pools: Lender Principal (Rp 100,000), Lender Margin (Rp 15,000), Platform Margin (Rp 17,000), Platform Provision (Rp 1,000). The loan amount is 5,000,000 IDR, repaid over 50 installments (133% of the loan).
            </div>
            <div>
              <span className="font-bold">Principal Rebidding (Loan Re-addition)</span> — Whenever accumulated Lender Principal reaches 5,000,000 IDR, a new rebidding loan is created (5M loan, 133K/week repayment). This can trigger multiple times as principal accumulates. Repayments from rebidding loans flow through the same 4-pool split, compounding returns over time.
            </div>
            {navMode === 2 && (
              <div>
                <span className="font-bold">Margin Rebidding (Option 1)</span> — {marginRebiddingPct}% of each repayment&apos;s lender margin is redirected to a margin rebidding accumulator and immediately counted as AUM. The remaining {100 - marginRebiddingPct}% goes to lender payout as usual. When the accumulator reaches 5,000,000 IDR, a new margin-rebidding loan is created — since the money is already in AUM, there is no NAV impact. Repayments from margin-rebidding loans follow the same 4-pool split, with their margin also split {marginRebiddingPct}%/{100 - marginRebiddingPct}% and their principal feeding into the principal rebidding accumulator.
              </div>
            )}
            <div>
              <span className="font-bold">133% Loan Cap</span> — Each borrower repays up to 133% of their loan amount, then stops. This applies to original, principal-rebidding, and margin-rebidding loans.
            </div>
            <div>
              <span className="font-bold">NAV Calculation</span> —{" "}
              {navMode === 2 ? (
                <>NAV = Total AUM / Total Units. Margin committed to rebidding is immediately counted as AUM, so NAV grows smoothly without the sawtooth pattern seen in Option 2.</>
              ) : (
                <>NAV = (Accumulated Lender Margin + Total AUM) / Total Units. Recalculated daily. Resets after monthly payout.</>
              )}
            </div>
            <div>
              <span className="font-bold">Monthly Payout Cycle</span> — At month-end: write-offs are absorbed from pools, lender margin is distributed as payouts proportional to units held, then margin pool resets.{" "}
              {navMode === 2 && <>In Option 1, only the payout portion ({100 - marginRebiddingPct}%) of margin is distributed — the rebidding portion ({marginRebiddingPct}%) stays in AUM.</>}
            </div>
            <div>
              <span className="font-bold">Write-Off Absorption Waterfall</span> — When a borrower defaults (stops repaying), the outstanding loan amount becomes a write-off at the 1st of the following month. The write-off is absorbed in this order:
              <ol className="list-decimal ml-5 mt-1 space-y-1">
                <li><strong>Lender Margin (Rp 15,000/repayment)</strong> — absorbs first from the monthly accumulated margin pool.</li>
                <li><strong>Platform Provision (Rp 1,000/repayment)</strong> — absorbs next from the cumulative provision pool.</li>
                <li><strong>Platform Margin (Rp 17,000/repayment)</strong> — absorbs next from the cumulative revenue pool.</li>
                <li><strong>Lender Principal (Rp 100,000/repayment)</strong> — absorbs last from the cumulative principal pool.</li>
              </ol>
              <div className="mt-1">If all four pools are exhausted and a remainder still exists, that <strong>unabsorbed</strong> amount permanently reduces the fund&apos;s AUM. This is visible in the AUM Movement table.</div>
              {navMode === 2 && <div className="mt-1">In Option 1, the margin rebidding accumulator is also available for write-off absorption (in addition to the payout margin pool). After absorption, the remaining margin is split back proportionally between payout and rebidding.</div>}
            </div>
            <div>
              <span className="font-bold">AUM Recovery Mechanism</span> — When an unabsorbed write-off reduces AUM, a recovery mode activates to gradually restore the deficit. During recovery:
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li><strong>Rp 116,000 of each Rp 133,000 repayment</strong> (Lender Margin Rp 15,000 + Lender Principal Rp 100,000 + Platform Provision Rp 1,000) is funneled back into AUM to close the deficit.</li>
                <li><strong>Platform Margin (Rp 17,000)</strong> always flows normally — the platform is always paid regardless of recovery mode.</li>
                <li><strong>Lender payouts are paused</strong> — margin is funneled to AUM recovery instead of being distributed as payouts.</li>
                <li><strong>Rebidding is paused</strong> — no new rebidding loans are created while the deficit exists, since principal is being funneled to recovery.{navMode === 2 && <> This applies to both principal rebidding and margin rebidding.</>}</li>
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
