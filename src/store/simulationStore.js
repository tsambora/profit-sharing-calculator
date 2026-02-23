import { create } from "zustand";
import { persist } from "zustand/middleware";
import { runSimulation } from "@/engine/calculator";

let nextId = 1;
function genId() {
  return String(nextId++);
}

function createEmptyTab(name) {
  return {
    name: name || "",
    investments: [],
    borrowers: [],
    results: null,
    tenor: 12,
  };
}

function createDefaultTabs() {
  const tabs = {};

  function makeBorrowers(start, end, startDate, repaymentStopDate) {
    const borrowers = [];
    for (let i = start; i <= end; i++) {
      const num = String(i).padStart(3, "0");
      borrowers.push({
        id: genId(),
        borrowerId: `B-${num}`,
        schedule: "weekly",
        startDate,
        amount: 133000,
        loanAmount: 5000000,
        repaymentStopDate: repaymentStopDate || "",
      });
    }
    return borrowers;
  }

  // Helper: generate borrowers that follow each lender's investment
  function makeBorrowersForLenders(lenderInvestments) {
    let borrowerNum = 1;
    const allBorrowers = [];
    for (const inv of lenderInvestments) {
      const count = inv.amount / 5000000;
      const startDate = new Date(inv.date);
      startDate.setDate(startDate.getDate() + 7);
      const startStr = startDate.toISOString().split("T")[0];
      allBorrowers.push(...makeBorrowers(borrowerNum, borrowerNum + count - 1, startStr));
      borrowerNum += count;
    }
    return allBorrowers;
  }

  // Helper: 10 lenders each investing 1B IDR on Jan 1 2026
  function makeStressTestInvestments() {
    const investments = [];
    for (let i = 1; i <= 10; i++) {
      investments.push({
        id: genId(),
        lenderId: `L-${String(i).padStart(3, "0")}`,
        type: "topup",
        date: "2026-01-01",
        amount: 1000000000,
      });
    }
    return investments;
  }

  // Helper: 2000 borrowers with monthly waves of defaults
  // startDefaultCount borrowers stop in Feb 2026, increasing by increment each month through Nov 2027
  function makeStressTestBorrowers(startDefaultCount, increment) {
    const totalBorrowers = 2000;
    const allBorrowers = [];
    let borrowerNum = 1;
    let defaultCount = startDefaultCount;

    // Monthly stop dates on the 8th from Feb 2026 to Nov 2027
    const stopDates = [];
    for (let year = 2026; year <= 2027; year++) {
      const startMonth = year === 2026 ? 2 : 1;
      const endMonth = year === 2027 ? 11 : 12;
      for (let month = startMonth; month <= endMonth; month++) {
        stopDates.push(`${year}-${String(month).padStart(2, "0")}-08`);
      }
    }

    for (const stopDate of stopDates) {
      const remaining = totalBorrowers - borrowerNum + 1;
      if (remaining <= 0) break;
      const count = Math.min(defaultCount, remaining);
      allBorrowers.push(...makeBorrowers(borrowerNum, borrowerNum + count - 1, "2026-01-08", stopDate));
      borrowerNum += count;
      defaultCount += increment;
    }

    // Remaining healthy borrowers
    if (borrowerNum <= totalBorrowers) {
      allBorrowers.push(...makeBorrowers(borrowerNum, totalBorrowers, "2026-01-08"));
    }

    return allBorrowers;
  }

  // Happy Path 1
  tabs["1"] = {
    name: "Happy Path 1",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
    ],
    borrowers: makeBorrowers(1, 20, "2026-01-08"),
    results: null,
    tenor: 12,
  };

  // Divestment
  tabs["2"] = {
    name: "Divestment",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
      { id: genId(), lenderId: "L-002", type: "topup", date: "2026-02-01", amount: 100000000 },
      { id: genId(), lenderId: "L-001", type: "withdraw", date: "2026-07-01", amount: 50000000 },
      { id: genId(), lenderId: "L-003", type: "topup", date: "2026-07-01", amount: 50000000 },
    ],
    borrowers: [
      ...makeBorrowers(1, 20, "2026-01-08"),
      ...makeBorrowers(21, 40, "2026-02-08"),
    ],
    results: null,
    tenor: 12,
  };

  // Massive Write Off (6 borrowers default)
  tabs["3"] = {
    name: "Massive Write Off",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
    ],
    borrowers: [
      ...makeBorrowers(1, 14, "2026-01-08"),
      ...makeBorrowers(15, 20, "2026-01-08", "2026-01-08"),
    ],
    results: null,
    tenor: 12,
  };

  // NAV vs Avg: Late Whale
  const lateWhaleInvestments = [
    { lenderId: "L-001", date: "2026-01-01", amount: 100000000 },
    { lenderId: "L-002", date: "2026-01-25", amount: 1000000000 },
  ];
  tabs["4"] = {
    name: "NAV vs Avg: Late Whale",
    investments: lateWhaleInvestments.map((inv) => ({
      id: genId(), type: "topup", ...inv,
    })),
    borrowers: makeBorrowersForLenders(lateWhaleInvestments),
    results: null,
    tenor: 12,
  };

  // Stress Test 1: 1.4% default rate, +0.1%/month (28 borrowers, +2/month)
  tabs["5"] = {
    name: "Stress Test 1",
    investments: makeStressTestInvestments(),
    borrowers: makeStressTestBorrowers(28, 2),
    results: null,
    tenor: 36,
  };

  // Stress Test 2: 2.8% default rate, +0.1%/month (56 borrowers, +2/month)
  tabs["6"] = {
    name: "Stress Test 2",
    investments: makeStressTestInvestments(),
    borrowers: makeStressTestBorrowers(56, 2),
    results: null,
    tenor: 36,
  };

  // Stress Test 3: 5.6% default rate, +0.1%/month (112 borrowers, +2/month)
  tabs["7"] = {
    name: "Stress Test 3",
    investments: makeStressTestInvestments(),
    borrowers: makeStressTestBorrowers(112, 2),
    results: null,
    tenor: 36,
  };

  // Stress Test 4: 10.2% default rate, +0.1%/month (204 borrowers, +2/month)
  tabs["8"] = {
    name: "Stress Test 4",
    investments: makeStressTestInvestments(),
    borrowers: makeStressTestBorrowers(204, 2),
    results: null,
    tenor: 36,
  };

  return tabs;
}

const useSimulationStore = create(
  persist(
    (set, get) => ({
      // Tab management
      tabs: createDefaultTabs(),
      activeTabId: "1",
      tabCounter: 8,

      // NAV mode: 2 = Margin Rebidding NAV (Option 1), 1 = Margin Pool NAV (Option 2)
      navMode: 2,
      marginRebiddingPct: 50,

      setNavMode: (mode) => {
        const state = get();
        // Clear all tab results when NAV mode changes
        const newTabs = {};
        for (const [id, tab] of Object.entries(state.tabs)) {
          newTabs[id] = { ...tab, results: null };
        }
        set({ navMode: mode, tabs: newTabs });
      },

      setMarginRebiddingPct: (pct) => {
        const state = get();
        // Clear all tab results when percentage changes
        const newTabs = {};
        for (const [id, tab] of Object.entries(state.tabs)) {
          newTabs[id] = { ...tab, results: null };
        }
        set({ marginRebiddingPct: pct, tabs: newTabs });
      },

      addTab: () => {
        const state = get();
        const newId = String(state.tabCounter + 1);
        set({
          tabs: { ...state.tabs, [newId]: createEmptyTab() },
          activeTabId: newId,
          tabCounter: state.tabCounter + 1,
        });
      },

      removeTab: (tabId) => {
        const state = get();
        const tabIds = Object.keys(state.tabs);
        if (tabIds.length <= 1) return;
        const newTabs = { ...state.tabs };
        delete newTabs[tabId];
        const newActive =
          state.activeTabId === tabId ? Object.keys(newTabs)[0] : state.activeTabId;
        set({ tabs: newTabs, activeTabId: newActive });
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      // Get current tab data
      getCurrentTab: () => {
        const state = get();
        return state.tabs[state.activeTabId] || createEmptyTab();
      },

      setTenor: (months) => {
        const state = get();
        const tab = state.tabs[state.activeTabId];
        set({
          tabs: {
            ...state.tabs,
            [state.activeTabId]: { ...tab, tenor: months, results: null },
          },
        });
      },

      // Investment actions
      addInvestment: (investment) => {
        const state = get();
        const tab = state.tabs[state.activeTabId];
        set({
          tabs: {
            ...state.tabs,
            [state.activeTabId]: {
              ...tab,
              investments: [...tab.investments, { ...investment, id: genId() }],
              results: null,
            },
          },
        });
      },

      updateInvestment: (id, updates) => {
        const state = get();
        const tab = state.tabs[state.activeTabId];
        set({
          tabs: {
            ...state.tabs,
            [state.activeTabId]: {
              ...tab,
              investments: tab.investments.map((inv) =>
                inv.id === id ? { ...inv, ...updates } : inv
              ),
              results: null,
            },
          },
        });
      },

      removeInvestment: (id) => {
        const state = get();
        const tab = state.tabs[state.activeTabId];
        set({
          tabs: {
            ...state.tabs,
            [state.activeTabId]: {
              ...tab,
              investments: tab.investments.filter((inv) => inv.id !== id),
              results: null,
            },
          },
        });
      },

      // Borrower actions
      addBorrower: (borrower) => {
        const state = get();
        const tab = state.tabs[state.activeTabId];
        set({
          tabs: {
            ...state.tabs,
            [state.activeTabId]: {
              ...tab,
              borrowers: [...tab.borrowers, { ...borrower, id: genId() }],
              results: null,
            },
          },
        });
      },

      updateBorrower: (id, updates) => {
        const state = get();
        const tab = state.tabs[state.activeTabId];
        set({
          tabs: {
            ...state.tabs,
            [state.activeTabId]: {
              ...tab,
              borrowers: tab.borrowers.map((b) =>
                b.id === id ? { ...b, ...updates } : b
              ),
              results: null,
            },
          },
        });
      },

      removeBorrower: (id) => {
        const state = get();
        const tab = state.tabs[state.activeTabId];
        set({
          tabs: {
            ...state.tabs,
            [state.activeTabId]: {
              ...tab,
              borrowers: tab.borrowers.filter((b) => b.id !== id),
              results: null,
            },
          },
        });
      },

      clearBorrowers: () => {
        const state = get();
        const tab = state.tabs[state.activeTabId];
        set({
          tabs: {
            ...state.tabs,
            [state.activeTabId]: { ...tab, borrowers: [], results: null },
          },
        });
      },

      // Run simulation
      runSimulation: () => {
        const state = get();
        const tab = state.tabs[state.activeTabId];
        const results = runSimulation(tab.investments, tab.borrowers, tab.tenor || 12, state.navMode, state.marginRebiddingPct);
        set({
          tabs: {
            ...state.tabs,
            [state.activeTabId]: { ...tab, results },
          },
        });
      },

      // Check if all inputs are filled
      canGenerate: () => {
        const state = get();
        const tab = state.tabs[state.activeTabId];
        if (!tab) return false;
        return (
          tab.investments.length > 0 &&
          tab.borrowers.length > 0
        );
      },
    }),
    {
      name: "simulation-store",
      partialize: (state) => ({
        tabs: Object.fromEntries(
          Object.entries(state.tabs).map(([id, tab]) => [
            id,
            {
              name: tab.name,
              investments: tab.investments,
              borrowers: tab.borrowers,
              tenor: tab.tenor,
            },
          ])
        ),
        activeTabId: state.activeTabId,
        tabCounter: state.tabCounter,
        navMode: state.navMode,
        marginRebiddingPct: state.marginRebiddingPct,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Migration: default navMode and marginRebiddingPct
        if (state.navMode === undefined) state.navMode = 2;
        if (state.marginRebiddingPct === undefined) state.marginRebiddingPct = 50;
        // Restore nextId to be higher than any existing item id
        let maxId = 0;
        for (const tab of Object.values(state.tabs)) {
          // Migration: remove old writeOffs array, default loanAmount for existing borrowers
          if (tab.writeOffs) delete tab.writeOffs;
          if (tab.tenor === undefined) tab.tenor = 12;
          for (const b of tab.borrowers) {
            if (b.loanAmount === undefined) b.loanAmount = 5000000;
            if (b.repaymentStopDate === undefined) b.repaymentStopDate = "";
          }
          for (const item of [...tab.investments, ...tab.borrowers]) {
            const num = Number(item.id);
            if (num > maxId) maxId = num;
          }
        }
        nextId = maxId + 1;
      },
    }
  )
);

export default useSimulationStore;
