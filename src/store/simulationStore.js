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

  function makeDailyBorrowers(start, end, startDate) {
    const borrowers = [];
    for (let i = start; i <= end; i++) {
      const num = String(i).padStart(3, "0");
      borrowers.push({
        id: genId(),
        borrowerId: `B-${num}`,
        schedule: "daily",
        startDate,
        amount: 133000,
        loanAmount: 5000000,
        repaymentStopDate: "",
      });
    }
    return borrowers;
  }

  // Happy Path 1
  tabs["1"] = {
    name: "Happy Path 1",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
    ],
    borrowers: makeBorrowers(1, 20, "2026-01-08"),
    results: null,
  };

  // Happy Path 2
  tabs["2"] = {
    name: "Happy Path 2",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
      { id: genId(), lenderId: "L-002", type: "topup", date: "2026-02-01", amount: 100000000 },
    ],
    borrowers: [
      ...makeBorrowers(1, 20, "2026-01-08"),
      ...makeBorrowers(21, 40, "2026-02-08"),
    ],
    results: null,
  };

  // Divestment
  tabs["3"] = {
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
  };

  // Small Write Off (3 borrowers default)
  tabs["4"] = {
    name: "Small Write Off",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
    ],
    borrowers: [
      ...makeBorrowers(1, 17, "2026-01-08"),
      ...makeBorrowers(18, 20, "2026-01-08", "2026-01-08"),
    ],
    results: null,
  };

  // Massive Write Off (6 borrowers default)
  tabs["5"] = {
    name: "Massive Write Off",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
    ],
    borrowers: [
      ...makeBorrowers(1, 14, "2026-01-08"),
      ...makeBorrowers(15, 20, "2026-01-08", "2026-01-08"),
    ],
    results: null,
  };

  // Helper: generate borrowers that follow each lender's investment
  // Each lender brings (amount / 5M) borrowers, starting 1 week after investment date
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

  // Gamification Scenario 1: Equal investment, staggered entry
  // 3 lenders invest 100M each at different times — shows avg balance rewards early investors
  // Each brings 20 borrowers (100M/5M) starting 1 week later
  const staggeredInvestments = [
    { lenderId: "L-001", date: "2026-01-01", amount: 100000000 },
    { lenderId: "L-002", date: "2026-01-15", amount: 100000000 },
    { lenderId: "L-003", date: "2026-01-25", amount: 100000000 },
  ];
  tabs["6"] = {
    name: "NAV vs Avg: Staggered",
    investments: staggeredInvestments.map((inv) => ({
      id: genId(), type: "topup", ...inv,
    })),
    borrowers: makeBorrowersForLenders(staggeredInvestments),
    results: null,
  };

  // Gamification Scenario 2: Late whale
  // L-001 100M → 20 borrowers from Jan 8, L-002 1000M → 200 borrowers from Feb 1
  // Shows NAV "syphoning" — late big investment captures disproportionate profit
  const lateWhaleInvestments = [
    { lenderId: "L-001", date: "2026-01-01", amount: 100000000 },
    { lenderId: "L-002", date: "2026-01-25", amount: 1000000000 },
  ];
  tabs["7"] = {
    name: "NAV vs Avg: Late Whale",
    investments: lateWhaleInvestments.map((inv) => ({
      id: genId(), type: "topup", ...inv,
    })),
    borrowers: makeBorrowersForLenders(lateWhaleInvestments),
    results: null,
  };

  // Gamification Scenario 3: Mid-month whale
  // L-001 100M → 20 borrowers from Jan 8, L-002 1000M → 200 borrowers from Jan 15,
  // L-003 100M → 20 borrowers from Feb 1
  // Shows that in NAV, L-003 entering late "syphons" the whale's profit
  const midWhaleInvestments = [
    { lenderId: "L-001", date: "2026-01-01", amount: 100000000 },
    { lenderId: "L-002", date: "2026-01-08", amount: 1000000000 },
    { lenderId: "L-003", date: "2026-01-25", amount: 100000000 },
  ];
  tabs["8"] = {
    name: "NAV vs Avg: Mid Whale",
    investments: midWhaleInvestments.map((inv) => ({
      id: genId(), type: "topup", ...inv,
    })),
    borrowers: makeBorrowersForLenders(midWhaleInvestments),
    results: null,
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
        const results = runSimulation(tab.investments, tab.borrowers, 12, state.navMode, state.marginRebiddingPct);
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
