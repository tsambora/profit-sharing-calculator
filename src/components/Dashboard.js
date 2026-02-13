"use client";

import useSimulationStore from "@/store/simulationStore";
import NavChart from "./charts/NavChart";
import PayoutChart from "./charts/PayoutChart";
import ReturnRateChart from "./charts/ReturnRateChart";
import PrincipalReturnedChart from "./charts/PrincipalReturnedChart";
import NavUnitsChart from "./charts/NavUnitsChart";
import LenderUnitsChart from "./charts/LenderUnitsChart";
import AumChart from "./charts/AumChart";

export default function Dashboard() {
  const { tabs, activeTabId, runSimulation, canGenerate } = useSimulationStore();
  const results = tabs[activeTabId]?.results;
  const canRun = canGenerate();

  const handleGenerate = () => {
    runSimulation();
  };

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
            Add at least one entry to each input table to generate graphs
          </span>
        )}
      </div>

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
      )}
    </div>
  );
}
