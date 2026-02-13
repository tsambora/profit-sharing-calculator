"use client";

import SimulationTabs from "@/components/SimulationTabs";
import LenderInvestmentTable from "@/components/inputs/LenderInvestmentTable";
import BorrowerRepaymentTable from "@/components/inputs/BorrowerRepaymentTable";
import WriteOffTable from "@/components/inputs/WriteOffTable";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Profit Sharing Simulator</h1>
      <p className="text-sm text-gray-500 mb-4">
        Input lender investments, borrower repayments, and loan write-offs to
        simulate profit distribution.
      </p>

      <SimulationTabs />

      <div className="space-y-4 mb-6">
        <LenderInvestmentTable />
        <BorrowerRepaymentTable />
        <WriteOffTable />
      </div>

      <Dashboard />
    </main>
  );
}
