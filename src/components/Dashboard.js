"use client";

import useSimulationStore from "@/store/simulationStore";
import NavChart from "./charts/NavChart";
import PayoutChart from "./charts/PayoutChart";
import ReturnRateChart from "./charts/ReturnRateChart";
import ProfitComparisonChart from "./charts/ProfitComparisonChart";
import PrincipalReturnedChart from "./charts/PrincipalReturnedChart";
import NavUnitsChart from "./charts/NavUnitsChart";
import LenderUnitsChart from "./charts/LenderUnitsChart";
import AumChart from "./charts/AumChart";
import RepaymentPoolChart from "./charts/RepaymentPoolChart";
import CalculationTable, {
  formatNumber,
  formatDecimal,
} from "./tables/CalculationTable";

const fmtId = (n) => Math.round(n).toLocaleString("id-ID");

function buildPoolTableColumns(poolLabel, fixedAmount, accessor, rebiddingAccessor) {
  const REPAYMENT = 133000;
  const ratio = fixedAmount / REPAYMENT;
  const cols = [
    { header: "Date", accessor: (r) => r.date, format: "string" },
    {
      header: "Daily Repayment",
      accessor: (r) => r.dailyRepayment,
      format: "number",
    },
    {
      header: `Daily ${poolLabel}`,
      accessor: (r) => r.dailyRepayment * ratio,
      format: "number",
    },
    {
      header: `Cumulative ${poolLabel}`,
      accessor: (r) => accessor(r),
      format: "number",
    },
    {
      header: "How to Calculate",
      accessor: (r) => {
        const numRepayments = Math.round(r.dailyRepayment / REPAYMENT);
        return `${numRepayments} repayments \u00D7 Rp ${fmtId(fixedAmount)} = ${fmtId(r.dailyRepayment * ratio)}`;
      },
      format: "formula",
    },
  ];
  if (rebiddingAccessor) {
    cols.push({
      header: `Rebidding ${poolLabel}`,
      accessor: (r) => rebiddingAccessor(r),
      format: "number",
    });
    cols.push({
      header: "Rebidding Calculation",
      accessor: (r) => {
        const numRepayments = Math.round(r.dailyRebiddingRepayment / REPAYMENT);
        return `${numRepayments} repayments \u00D7 Rp ${fmtId(fixedAmount)} = ${fmtId(r.dailyRebiddingRepayment * ratio)}`;
      },
      format: "formula",
    });
  }
  return cols;
}

const navColumns = [
  { header: "Date", accessor: (r) => r.date, format: "string" },
  { header: "NAV", accessor: (r) => r.nav, format: "decimal" },
  {
    header: "Accumulated Margin",
    accessor: (r) => r.accumulatedMargin,
    format: "number",
  },
  { header: "Total AUM", accessor: (r) => r.totalAum, format: "number" },
  {
    header: "Total Units",
    accessor: (r) => r.totalUnits,
    format: "decimal",
  },
  {
    header: "How to Calculate",
    accessor: (r) => {
      if (r.totalUnits === 0) return "No units";
      return `(${fmtId(r.accumulatedMargin)} + ${fmtId(r.totalAum)}) / ${formatDecimal(r.totalUnits)} = ${formatDecimal(r.nav)}`;
    },
    format: "formula",
  },
];

const aumColumns = [
  { header: "Date", accessor: (r) => r.date, format: "string" },
  { header: "AUM", accessor: (r) => r.totalAum, format: "number" },
  {
    header: "Recovery",
    accessor: (r) => r.recoveryMode ? `Deficit: ${fmtId(r.writeOffDeficit)}` : "",
    format: "string",
  },
  {
    header: "How to Calculate",
    accessor: (r, prev) => {
      if (!prev) return `0 + ${fmtId(r.totalInvested)} (investment) = ${fmtId(r.totalAum)}`;
      const aumDiff = r.totalAum - prev.totalAum;
      const investDiff = r.totalInvested - prev.totalInvested;
      const withdrawDiff = (r.totalWithdrawn || 0) - (prev.totalWithdrawn || 0);
      if (aumDiff === 0 && !r.writeOffDetail) {
        return `No change`;
      }
      const parts = [];
      if (investDiff > 0) parts.push(`+ ${fmtId(investDiff)} (investment)`);
      if (withdrawDiff > 0) parts.push(`- ${fmtId(withdrawDiff)} (withdrawal)`);

      // Recovery funneling (AUM increase from repayment funnel)
      const recoveryDiff = (r.monthlyRecoveryFunneled || 0) - (prev.monthlyRecoveryFunneled || 0);
      if (recoveryDiff > 0) {
        parts.push(`+ ${fmtId(recoveryDiff)} (AUM recovery from 83% repayment funnel)`);
      }

      // Write-off loss
      const writeOffLoss = -aumDiff + investDiff - withdrawDiff + recoveryDiff;
      if (writeOffLoss > 0) {
        const wo = r.writeOffDetail || prev.writeOffDetail;
        if (wo) {
          parts.push(`- ${fmtId(writeOffLoss)} (unabsorbed write-off: total ${fmtId(wo.totalWriteOff)} − ${fmtId(wo.absorbed)} absorbed by pools)`);
        } else {
          parts.push(`- ${fmtId(writeOffLoss)} (unabsorbed write-off)`);
        }
      }
      return `${fmtId(prev.totalAum)} ${parts.join(" ")} = ${fmtId(r.totalAum)}`;
    },
    format: "formula",
  },
];

const payoutColumns = [
  { header: "Date", accessor: (r) => r.date, format: "string" },
  { header: "Lender ID", accessor: (r) => r.lenderId, format: "string" },
  { header: "Units Owned", accessor: (r) => r.units, format: "decimal" },
  { header: "Total Units", accessor: (r) => r.totalUnits, format: "decimal" },
  {
    header: "Total Margin",
    accessor: (r) => r.totalMargin,
    format: "number",
  },
  { header: "Payout", accessor: (r) => r.payout, format: "number" },
  {
    header: "How to Calculate",
    accessor: (r) => {
      if (r.recoveryMode && r.payout === 0) {
        return `Recovery mode — margin funneled to AUM recovery (${fmtId(r.monthlyRecoveryFunneled)} recovered this month)`;
      }
      return `(${formatDecimal(r.units)} / ${formatDecimal(r.totalUnits)}) \u00D7 ${fmtId(r.totalMargin)} = ${fmtId(r.payout)}`;
    },
    format: "formula",
  },
];

const profitComparisonColumns = [
  { header: "Date", accessor: (r) => r.date, format: "string" },
  { header: "Lender ID", accessor: (r) => r.lenderId, format: "string" },
  { header: "Units Owned", accessor: (r) => r.units, format: "decimal" },
  { header: "Total Units", accessor: (r) => r.totalUnits, format: "decimal" },
  { header: "NAV Payout", accessor: (r) => r.navPayout, format: "number" },
  { header: "Avg Balance", accessor: (r) => r.avgBalance, format: "number" },
  {
    header: "Total Avg Balance",
    accessor: (r) => r.totalAvgBalance,
    format: "number",
  },
  { header: "Avg Bal Payout", accessor: (r) => r.avgBalPayout, format: "number" },
  { header: "Total Margin", accessor: (r) => r.totalMargin, format: "number" },
  { header: "Difference", accessor: (r) => r.difference, format: "number" },
  {
    header: "How to Calculate",
    accessor: (r) => {
      const navCalc = `NAV: (${formatDecimal(r.units)} / ${formatDecimal(r.totalUnits)}) × ${fmtId(r.totalMargin)} = ${fmtId(r.navPayout)}`;
      const avgCalc = `Avg: (${fmtId(r.avgBalance)} / ${fmtId(r.totalAvgBalance)}) × ${fmtId(r.totalMargin)} = ${fmtId(r.avgBalPayout)}`;
      return `${navCalc} | ${avgCalc}`;
    },
    format: "formula",
  },
];

const returnRateColumns = [
  { header: "Date", accessor: (r) => r.date, format: "string" },
  { header: "Lender ID", accessor: (r) => r.lenderId, format: "string" },
  {
    header: "Total Payout",
    accessor: (r) => r.totalPayout,
    format: "number",
  },
  {
    header: "Total Invested",
    accessor: (r) => r.totalInvested,
    format: "number",
  },
  {
    header: "Return Rate",
    accessor: (r) => `${r.returnRate}%`,
    format: "string",
  },
  {
    header: "How to Calculate",
    accessor: (r) => {
      return `(${fmtId(r.totalPayout)} / ${fmtId(r.totalInvested)}) \u00D7 100 = ${r.returnRate}%`;
    },
    format: "formula",
  },
];

const hasActivity = (r, prev) => {
  if (r.dailyRepayment > 0) return true;
  if (!prev) return r.totalInvested > 0;
  if (r.totalInvested !== prev.totalInvested) return true;
  if (r.totalAum !== prev.totalAum) return true;
  return false;
};

export default function Dashboard() {
  const { tabs, activeTabId, runSimulation, canGenerate } = useSimulationStore();
  const results = tabs[activeTabId]?.results;
  const canRun = canGenerate();

  const handleGenerate = () => {
    runSimulation();
  };

  const lenderMarginColumns = buildPoolTableColumns(
    "Margin",
    15000,
    (r) => r.lenderMargin,
    (r) => r.rebiddingLenderMargin
  );
  const lenderPrincipalColumns = buildPoolTableColumns(
    "Principal",
    100000,
    (r) => r.lenderPrincipal,
    (r) => r.rebiddingLenderPrincipal
  );
  const platformMarginColumns = buildPoolTableColumns(
    "Platform Margin",
    17000,
    (r) => r.platformRevenue,
    (r) => r.rebiddingPlatformRevenue
  );
  const platformProvisionColumns = buildPoolTableColumns(
    "Provision",
    1000,
    (r) => r.platformProvision,
    (r) => r.rebiddingPlatformProvision
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleGenerate}
          disabled={!canRun}
          className={`px-6 py-2 rounded font-semibold text-sm ${
            canRun
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {results ? "Refresh Graphs" : "Generate Graphs"}
        </button>
        {!canRun && (
          <span className="text-sm text-gray-500">
            Add at least one investment and one borrower to generate graphs
          </span>
        )}
      </div>

      {results && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RepaymentPoolChart
              data={results.dailyRepaymentData}
              dataKey="dailyRepayment"
              title="Daily Repayment Amount"
              strokeColor="#7c3aed"
              fillColor="#ede9fe"
              noSample
            />
            <RepaymentPoolChart
              data={results.dailyRebiddingRepaymentData}
              dataKey="dailyRebiddingRepayment"
              title="Repayment from Rebidding"
              strokeColor="#f97316"
              fillColor="#fed7aa"
              noSample
            />
            <RepaymentPoolChart
              data={results.totalRepaymentData}
              dataKey="totalRepaid"
              title="Total Repayment Amount"
              strokeColor="#0d9488"
              fillColor="#ccfbf1"
              secondDataKey="totalRebiddingRepaid"
              secondName="Repayment from Rebidding"
            />
            <RepaymentPoolChart
              data={results.poolsData}
              dataKey="lenderMargin"
              title="Lenders Margin (Rp 15,000 per repayment)"
              strokeColor="#2563eb"
              fillColor="#dbeafe"
              secondDataKey="rebiddingLenderMargin"
              secondName="Rebidding Margin"
              noSample
            />
            <RepaymentPoolChart
              data={results.poolsData}
              dataKey="lenderPrincipal"
              title="Lenders Principal (Rp 100,000 per repayment)"
              strokeColor="#16a34a"
              fillColor="#dcfce7"
              secondDataKey="rebiddingLenderPrincipal"
              secondName="Rebidding Principal"
              noSample
            />
            <RepaymentPoolChart
              data={results.poolsData}
              dataKey="platformRevenue"
              title="Platform Margin (Rp 17,000 per repayment)"
              strokeColor="#ca8a04"
              fillColor="#fef9c3"
              secondDataKey="rebiddingPlatformRevenue"
              secondName="Rebidding Platform Margin"
              noSample
            />
            <RepaymentPoolChart
              data={results.poolsData}
              dataKey="platformProvision"
              title="Platform Provision (Rp 1,000 per repayment)"
              strokeColor="#dc2626"
              fillColor="#fee2e2"
              secondDataKey="rebiddingPlatformProvision"
              secondName="Rebidding Provision"
              noSample
            />
            <NavChart data={results.navData} />
            <AumChart data={results.aumData} />
            <PayoutChart data={results.payoutData} lenderIds={results.lenderIds} />
            <ReturnRateChart
              data={results.returnRateData}
              lenderIds={results.allLenderIds}
            />
            <NavUnitsChart data={results.navUnitsData} />
            <LenderUnitsChart
              data={results.lenderUnitsData}
              lenderIds={results.allLenderIds}
            />
            <PrincipalReturnedChart data={results.principalReturnedData} />
            <ProfitComparisonChart
              data={results.profitComparisonData}
              lenderIds={results.allLenderIds}
            />
          </div>

          {results.tableData && (
            <div className="mt-8">
              <h2 className="text-lg font-bold mb-4">Calculation Tables</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CalculationTable
                  title="Lenders Margin (Rp 15,000 per repayment — resets monthly)"
                  columns={lenderMarginColumns}
                  data={results.tableData}
                  filterFn={(r) => r.dailyRepayment > 0 || r.dailyRebiddingRepayment > 0}
                />
                <CalculationTable
                  title="Lenders Principal (Rp 100,000 per repayment)"
                  columns={lenderPrincipalColumns}
                  data={results.tableData}
                  filterFn={(r) => r.dailyRepayment > 0 || r.dailyRebiddingRepayment > 0}
                />
                <CalculationTable
                  title="Platform Margin (Rp 17,000 per repayment)"
                  columns={platformMarginColumns}
                  data={results.tableData}
                  filterFn={(r) => r.dailyRepayment > 0 || r.dailyRebiddingRepayment > 0}
                />
                <CalculationTable
                  title="Platform Provision (Rp 1,000 per repayment)"
                  columns={platformProvisionColumns}
                  data={results.tableData}
                  filterFn={(r) => r.dailyRepayment > 0 || r.dailyRebiddingRepayment > 0}
                />
                <CalculationTable
                  title="NAV Movement"
                  columns={navColumns}
                  data={results.tableData}
                  filterFn={(r, prev) => hasActivity(r, prev)}
                />
                <CalculationTable
                  title="AUM Movement"
                  columns={aumColumns}
                  data={results.tableData}
                  filterFn={(r, prev) => hasActivity(r, prev)}
                />
                <CalculationTable
                  title="Monthly Payout per Lender"
                  columns={payoutColumns}
                  data={results.payoutTableData}
                />
                <CalculationTable
                  title="Return Rate per Lender"
                  columns={returnRateColumns}
                  data={results.returnRateTableData}
                />
                <CalculationTable
                  title="Profit Comparison: NAV vs Average Balance"
                  columns={profitComparisonColumns}
                  data={results.profitComparisonTableData}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
