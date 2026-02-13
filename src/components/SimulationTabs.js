"use client";

import useSimulationStore from "@/store/simulationStore";

export default function SimulationTabs() {
  const { tabs, activeTabId, setActiveTab, addTab, removeTab } =
    useSimulationStore();

  const tabIds = Object.keys(tabs);

  return (
    <div className="flex items-center gap-1 border-b mb-4">
      {tabIds.map((id) => (
        <div
          key={id}
          className={`flex items-center gap-1 px-4 py-2 text-sm cursor-pointer border-b-2 ${
            id === activeTabId
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span onClick={() => setActiveTab(id)}>Simulation {id}</span>
          {tabIds.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTab(id);
              }}
              className="ml-1 text-gray-400 hover:text-red-500 text-xs"
            >
              x
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addTab}
        className="px-3 py-2 text-sm text-gray-400 hover:text-blue-600"
      >
        + New
      </button>
    </div>
  );
}
