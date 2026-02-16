"use client";

import useSimulationStore from "@/store/simulationStore";
import NavChart from "./charts/NavChart";
import PayoutChart from "./charts/PayoutChart";
import ReturnRateChart from "./charts/ReturnRateChart";
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

function buildPoolTableColumns(poolLabel, percentage, accessor) {
  return [
    { header: "Date", accessor: (r) => r.date, format: "string" },
    {
      header: "Daily Repayment",
      accessor: (r) => r.dailyRepayment,
      format: "number",
    },
    {
      header: `Daily ${poolLabel}`,
      accessor: (r) => r.dailyRepayment * percentage,
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
        const pct = `${Math.round(percentage * 100)}%`;
        return `${pct} \u00D7 ${fmtId(r.dailyRepayment)} = ${fmtId(r.dailyRepayment * percentage)}`;
      },
      format: "formula",
    },
  ];
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
    header: "Total Invested",
    accessor: (r) => r.totalInvested,
    format: "number",
  },
  {
    header: "Total Repaid",
    accessor: (r) => r.totalRepaid,
    format: "number",
  },
  {
    header: "How to Calculate",
    accessor: (r, prev) => {
      if (!prev) return `Investment: +${fmtId(r.totalInvested)}`;
      const aumDiff = r.totalAum - prev.totalAum;
      const investDiff = r.totalInvested - prev.totalInvested;
      const repaidDiff = r.totalRepaid - prev.totalRepaid;
      const parts = [];
      if (investDiff > 0) parts.push(`Investment: +${fmtId(investDiff)}`);
      if (repaidDiff > 0) parts.push(`Repayment day`);
      if (aumDiff < 0 && investDiff === 0)
        parts.push(`AUM change: ${fmtId(aumDiff)}`);
      return parts.length > 0 ? parts.join(", ") : `No change`;
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
    0.15,
    (r) => r.lenderMargin
  );
  const lenderPrincipalColumns = buildPoolTableColumns(
    "Principal",
    0.67,
    (r) => r.lenderPrincipal
  );
  const platformMarginColumns = buildPoolTableColumns(
    "Platform Margin",
    0.17,
    (r) => r.platformRevenue
  );
  const platformProvisionColumns = buildPoolTableColumns(
    "Provision",
    0.01,
    (r) => r.platformProvision
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
              data={results.totalRepaymentData}
              dataKey="totalRepaid"
              title="Total Repayment Amount"
              strokeColor="#0d9488"
              fillColor="#ccfbf1"
            />
            <RepaymentPoolChart
              data={results.poolsData}
              dataKey="lenderMargin"
              title="Lenders Margin (15% of repayment)"
              strokeColor="#2563eb"
              fillColor="#dbeafe"
            />
            <RepaymentPoolChart
              data={results.poolsData}
              dataKey="lenderPrincipal"
              title="Lenders Principal (67% of repayment)"
              strokeColor="#16a34a"
              fillColor="#dcfce7"
            />
            <RepaymentPoolChart
              data={results.poolsData}
              dataKey="platformRevenue"
              title="Platform Margin (17% of repayment)"
              strokeColor="#ca8a04"
              fillColor="#fef9c3"
            />
            <RepaymentPoolChart
              data={results.poolsData}
              dataKey="platformProvision"
              title="Platform Provision (1% of repayment)"
              strokeColor="#dc2626"
              fillColor="#fee2e2"
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
          </div>

          {results.tableData && (
            <div className="mt-8">
              <h2 className="text-lg font-bold mb-4">Calculation Tables</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CalculationTable
                  title="Lenders Margin (15% of repayment — resets monthly)"
                  columns={lenderMarginColumns}
                  data={results.tableData}
                  filterFn={(r) => r.dailyRepayment > 0}
                />
                <CalculationTable
                  title="Lenders Principal (67% of repayment)"
                  columns={lenderPrincipalColumns}
                  data={results.tableData}
                  filterFn={(r) => r.dailyRepayment > 0}
                />
                <CalculationTable
                  title="Platform Margin (17% of repayment)"
                  columns={platformMarginColumns}
                  data={results.tableData}
                  filterFn={(r) => r.dailyRepayment > 0}
                />
                <CalculationTable
                  title="Platform Provision (1% of repayment)"
                  columns={platformProvisionColumns}
                  data={results.tableData}
                  filterFn={(r) => r.dailyRepayment > 0}
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
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
