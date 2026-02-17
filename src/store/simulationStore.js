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

  // Write Off
  tabs["4"] = {
    name: "Write Off",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
    ],
    borrowers: [
      ...makeBorrowers(1, 17, "2026-01-08"),
      ...makeBorrowers(18, 20, "2026-01-08", "2026-01-08"),
    ],
    results: null,
  };

  // Gamification Scenario 1: Equal investment, staggered entry
  // 3 lenders invest 100M each at different times — shows avg balance rewards early investors
  tabs["5"] = {
    name: "NAV vs Avg: Staggered",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
      { id: genId(), lenderId: "L-002", type: "topup", date: "2026-01-15", amount: 100000000 },
      { id: genId(), lenderId: "L-003", type: "topup", date: "2026-01-25", amount: 100000000 },
    ],
    borrowers: makeDailyBorrowers(1, 10, "2026-01-01"),
    results: null,
  };

  // Gamification Scenario 2: Late whale
  // L-001 invests 100M on Jan 1, L-002 invests 1000M on Jan 25
  // Shows NAV "syphoning" — late big investment captures disproportionate profit
  tabs["6"] = {
    name: "NAV vs Avg: Late Whale",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
      { id: genId(), lenderId: "L-002", type: "topup", date: "2026-01-25", amount: 1000000000 },
    ],
    borrowers: makeDailyBorrowers(1, 10, "2026-01-01"),
    results: null,
  };

  // Gamification Scenario 3: Mid-month whale
  // L-001 100M Jan 1, L-002 1000M Jan 8 (whale), L-003 100M Jan 25
  // Shows that in NAV, L-003 entering late "syphons" the whale's profit
  tabs["7"] = {
    name: "NAV vs Avg: Mid Whale",
    investments: [
      { id: genId(), lenderId: "L-001", type: "topup", date: "2026-01-01", amount: 100000000 },
      { id: genId(), lenderId: "L-002", type: "topup", date: "2026-01-08", amount: 1000000000 },
      { id: genId(), lenderId: "L-003", type: "topup", date: "2026-01-25", amount: 100000000 },
    ],
    borrowers: makeDailyBorrowers(1, 10, "2026-01-01"),
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
      tabCounter: 7,

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
        const results = runSimulation(tab.investments, tab.borrowers);
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
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
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
