import { create } from "zustand";
import { persist } from "zustand/middleware";
import { runSimulation } from "@/engine/calculator";

// Custom storage that silently handles QuotaExceededError
// (stress test tabs with thousands of borrowers can exceed the ~5MB localStorage limit)
const safeStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      // QuotaExceededError — silently skip persistence
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
};

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

  // Helper: rolling monthly stress test with configurable parameters
  // investmentAmount: IDR per lender, borrowersPerLender: count, rateMultiplier: scales default rates
  function makeRollingStressTestData(investmentAmount, borrowersPerLender, rateMultiplier) {
    const investments = [];
    const allBorrowers = [];
    let borrowerNum = 1;

    // Base default rates by months since investment
    const baseRates = [
      { monthOffset: 2, rate: 0.0136 },  // 1.36%
      { monthOffset: 3, rate: 0.0145 },  // 1.45%
      { monthOffset: 4, rate: 0.0153 },  // 1.53%
      { monthOffset: 5, rate: 0.0162 },  // 1.62%
      { monthOffset: 6, rate: 0.0171 },  // 1.71%
      { monthOffset: 7, rate: 0.0197 },  // 1.97%
      { monthOffset: 8, rate: 0.0320 },  // 3.20%
    ];

    // 36 monthly investments: Jan 2026 to Dec 2028
    for (let i = 0; i < 36; i++) {
      const year = 2026 + Math.floor(i / 12);
      const month = (i % 12) + 1;
      const dateStr = `${year}-${String(month).padStart(2, "0")}-01`;
      const lenderNum = i + 1;

      investments.push({
        id: genId(),
        lenderId: `L-${String(lenderNum).padStart(3, "0")}`,
        type: "topup",
        date: dateStr,
        amount: investmentAmount,
      });

      // Repayment start: 1 week after investment
      const investDate = new Date(dateStr);
      const repayStart = new Date(investDate);
      repayStart.setDate(repayStart.getDate() + 7);
      const repayStartStr = repayStart.toISOString().split("T")[0];

      // Create defaulting borrowers for this cohort
      let cohortDefaulted = 0;
      for (const { monthOffset, rate } of baseRates) {
        const count = Math.round(borrowersPerLender * rate * rateMultiplier);
        if (count === 0) continue;
        const stopDate = new Date(investDate);
        stopDate.setMonth(stopDate.getMonth() + monthOffset);
        const stopDateStr = stopDate.toISOString().split("T")[0];

        allBorrowers.push(
          ...makeBorrowers(borrowerNum, borrowerNum + count - 1, repayStartStr, stopDateStr)
        );
        borrowerNum += count;
        cohortDefaulted += count;
      }

      // Remaining healthy borrowers (no default)
      const healthyCount = borrowersPerLender - cohortDefaulted;
      if (healthyCount > 0) {
        allBorrowers.push(
          ...makeBorrowers(borrowerNum, borrowerNum + healthyCount - 1, repayStartStr)
        );
        borrowerNum += healthyCount;
      }
    }

    return { investments, borrowers: allBorrowers };
  }

  // Happy Path 1
  tabs["1"] = {
    name: "Happy Path",
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

  // Stress Test 1: 36 monthly 1B investments (Jan 2026–Dec 2028), 200 borrowers each,
  // cohort-based defaults at months 2–8 (1.36%–3.20%)
  const st1 = makeRollingStressTestData(1000000000, 200, 1);
  tabs["5"] = {
    name: "Stress Test 1",
    investments: st1.investments,
    borrowers: st1.borrowers,
    results: null,
    tenor: 36,
  };

  // Stress Test 2: 36 monthly 2B investments (Jan 2026–Dec 2028), 400 borrowers each,
  // 2x default rates (2.72%–6.40%)
  const st2 = makeRollingStressTestData(2000000000, 400, 2);
  tabs["6"] = {
    name: "Stress Test 2",
    investments: st2.investments,
    borrowers: st2.borrowers,
    results: null,
    tenor: 36,
  };

  // Stress Test 3: 36 monthly 4B investments (Jan 2026–Dec 2028), 800 borrowers each,
  // 4x default rates (5.44%–12.80%)
  const st3 = makeRollingStressTestData(4000000000, 800, 4);
  tabs["7"] = {
    name: "Stress Test 3",
    investments: st3.investments,
    borrowers: st3.borrowers,
    results: null,
    tenor: 36,
  };

  // Stress Test 4: 36 monthly 8B investments (Jan 2026–Dec 2028), 1600 borrowers each,
  // 8x default rates (10.88%–25.60%)
  const st4 = makeRollingStressTestData(8000000000, 1600, 8);
  tabs["8"] = {
    name: "Stress Test 4",
    investments: st4.investments,
    borrowers: st4.borrowers,
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
      storage: safeStorage,
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
