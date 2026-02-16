# Profit Sharing Simulator Requirement

## Context

We need to build a web-based simulator of profit calculation for lenders investing money in a loan pool (we can call it "fund").

### Inputs

1. Investment schedule and amount of every lender
2. Repayment schedule and amount of every borrower
3. Loan write off schedule and the outstanding amount of the written off loans

### Outputs

1. Time series graph of payout schedule and amount for every lender
2. Time series graph of percentage return rate for every lender
3. Principal amount returned for every lender on the tenor of the loan pool
4. Time series graph of the net asset value (NAV) of the fund
5. Time series graph of the NAV total unit of the fund
6. Time series graph of the number unit owned for every lender
7. Time series graph of the AUM movement for the fund

---

## User Stories (High Priority)

### 1. Accept user input for investment schedule and amount of every lender in the pool

**Acceptance Criteria:**

Users can input, edit, and delete multiple lender investments with below attributes:

1. Lender ID
2. Transaction type: investment (topup) / divestment (withdraw)
3. Transaction date
4. Transaction amount

### 2. Accept user input for repayment schedule and amount of every borrower

**Acceptance Criteria:**

User can input, edit, and delete multiple borrower repayment schedules with below attributes:

1. Borrower ID
2. Repayment schedule: weekly / daily
3. Repayment start date
4. Repayment amount
5. How many borrowers? (This is used to create multiple borrower at once. If users fill this in, borrower IDs will be automatically filled.)

### 3. ~~Accept user input for loan write off schedule~~ (Superseded by #24)

*This requirement has been replaced. Write-off data is now part of the borrower input form. See requirement #24.*

### 4. Allow user to start generating graphs and refresh graphs based on all input

**Acceptance Criteria:**

- Users can't generate if any of the input fields (investment schedule, number of loans, repayment schedule, write off schedule) is not filled.
- Once all is filled then users can generate the graphs.
- Once the graphs are generated and there's a change in the input, the user can refresh the graphs.

### 5. Calculate repayment distribution to lender margin, lender principal, platform margin, and platform provision on every repayment

**Acceptance Criteria:**

- Lenders margin portion from repayment: **0.15**
- Platform provision portion from repayment: **0.01**
- Platform revenue portion from repayment: **0.17**
- Lenders principal portion from repayment: **0.67**

### 6. Calculate the total amount of outstanding payment in the fund

**Acceptance Criteria:**

Total outstanding amount = total amount of invested principal money - total amount of money already repaid by borrowers

### 7. Calculate how written off loans affect calculation of lender margin, lender principal, platform margin, and platform provision at every end of the month

**Acceptance Criteria:**

Whenever there are multiple loans declared written off in a month, the total outstanding amount of these loans will be accumulated.

This total outstanding amount will decrease the amount of money distributed from borrower repayment to lender margin, lender principal, platform margin, and platform provision.

The "absorption" will be done in this particular order:

1. Lender margin pool will take the loss first
2. Platform provision pool will take the loss next
3. Platform margin will take the loss next
4. Lender principal pool will take the loss last

### 8. Calculate net asset value (NAV) for the fund at every end of day

**Acceptance Criteria:**

Initial net asset value for the fund: **100,000 IDR**

**What happens whenever a lender invests:**

1. This lender will get fund units where number of units = investment amount / current NAV
2. The total unit of the fund will increase with the number of units given to this new lender

**What happens whenever there's a repayment from borrower:**

1. At the end of the day the lender margin portion from all repayment in a day will be accumulated
2. At the end of the day NAV price will be adjusted with the following formula: `(total accumulated margin + total fund AUM) / total number of unit in the fund`
3. On the next day, the new lender will purchase the fund units (invest) using this new NAV price

### 9. Calculate the monthly payout amount (coupon) for every lender at every end of the month

**Acceptance Criteria:**

This fund will pay the margin for every lender at the end of every month using the accumulated lender margin from repayments throughout the month.

The proportion of payout amount for each lender is calculated with the following formula:

```
Lender portion = (number of unit owned / total number of unit in the fund) * total amount of accumulated lender margin
```

**Important:**

- Because each month the lender margin pool will be emptied to be paid to lenders AND NAV calculation depends on margin, NAV will change on every payout day.
- If because of write offs, there's no money in the lender margin pool, then no lenders will get any payout.

### 10. Recalculate NAV after write offs are consolidated at the end of the month

**Acceptance Criteria:**

NAV after payout day:

- If written off amount < lender margin, then NAV after payout will be `total fund AUM / total number of unit in the fund`
- If written off amount > lender margin, then NAV after payout would be `(total fund AUM - total outstanding amount of written off loans) / total number of units in the fund`

### 11. Display / refresh time series graph of the net asset value (NAV) of the fund

**Acceptance Criteria:**

- The graph will have 2 axes: time and NAV.
- The graph shows a single continuous line where the NAV on payout days reflects the post-payout value (no separate scatter points).

### 12. Bulk creation for borrowers and write-offs

**Acceptance Criteria:**

- Borrower form has a "How many borrowers?" field. When filled with a number > 1, it creates that many borrowers with auto-generated IDs (B-001, B-002, ...) sharing the same schedule, start date, and amount.
- Write-off form has a "How many borrowers?" field. When filled with a number > 1, it randomly picks that many borrower IDs from the existing borrower list and creates write-offs for each.
- The "How many borrowers?" field is hidden when editing an existing record.
- The Borrower ID input is disabled when bulk mode is active.

### 13. Delete all functionality for borrowers and write-offs

**Acceptance Criteria:**

- Both the borrower and write-off tables have a "Delete All" button visible when there are items in the table.
- Clicking "Delete All" removes all records from the respective table.

### 14. Data persistence across page refreshes

**Acceptance Criteria:**

- All input data (investments, borrowers, write-offs) and tab state are persisted to localStorage.
- Simulation results are not persisted (they are recomputed on demand).
- Item IDs are restored correctly after rehydration to avoid duplicates.

### 15. Write-offs are permanent losses

**Acceptance Criteria:**

- When a write-off causes AUM to drop (unabsorbed loss after the waterfall), the loss is permanent.
- AUM is reduced by the unabsorbed amount and stays at the lower level.
- Lender principal repayments are not used to recover the deficit — they were already counted in AUM as outstanding loans, so using them would be double-counting.
- NAV reflects the permanently reduced AUM going forward.

### 16. ~~Written-off borrowers stop making repayments (180-day backdate)~~ (Superseded by #24)

*This requirement has been replaced. The repayment stop date is now set directly on the borrower form instead of being back-computed from a write-off date. See requirement #24.*

### 17. ~~Prevent duplicate write-offs for the same borrower~~ (Superseded by #24)

*This requirement is no longer needed. Write-off data is now part of the borrower record itself, so duplicates are structurally impossible.*

### 18. NAV after payout uses adjusted AUM directly

**Acceptance Criteria:**

- Write-off absorption reduces the repayment pools via the waterfall, and any unabsorbed amount reduces AUM directly.
- NAV after payout is calculated as `total fund AUM / total number of units` since AUM is already correctly adjusted. No additional write-off subtraction is applied to avoid double-counting.

### 19. Unique borrower IDs across multiple bulk creations

**Acceptance Criteria:**

- When bulk-creating borrowers, the auto-generated IDs (B-001, B-002, ...) continue numbering from the highest existing B-### ID rather than always starting from B-001.
- This prevents ID collisions when users create multiple batches of borrowers.

### 20. Accessible date picker labels

**Acceptance Criteria:**

- All date picker inputs across the application (investment, borrower, write-off forms) have visible labels associated with them for accessibility.

### 21. Graphs for all portion from repayment (lenders margin, lenders principal, platform margin, platform provision)

- As described in the previous requirement, every repayment is funneled into 4 buckets: lenders margin, lenders principal, platform margin, and platform provision.
- Lenders margin, lenders principal, platform margin, and platform provision each should have a graph visualizing their movements.
- The graph should have 2 axes for time and amount of money in the bucket. The graphs should visualize the time series movement of the amounts.
- These are the number that makes the NAV and profit sharing so it should appear before NAV graph.

### 22. Graph for daily repayment amount

- Based on the borrowers repayment schedule, there should be a graph to represent the movement in the repayment amount.
- The graph should have 2 axes for time and the repayment amount.
- Whenever there's a repayment from several borrowers in a day, the total repayment amount for that day will be represented in a graph. This graph is NOT to indicate or track the total amount of repayment.
- This graph should come before the portion graphs.

### 23. Graph to track total repayment amount

- Based on the borrowers repayment schedule, there should be a graph to track total amount of repayment that has been accumulated.
- The graph should have 2 axes for time and the total repaid amount.
- Whenever there's a repayment from several borrowers in a day, the total repaid amount shall be incremented. This graph is TO to indicate or track the total amount of repayment.
- This graph should come before the portion graphs.
- The numbers in the graph to track total repayment amount and the graph for daily repayment amount SHOULD TALLY with the numbers in the graphs for lenders margin, lenders principal, platform margin, and platform principal.

### 24. Write-off fields merged into borrower input

**Acceptance Criteria:**

- The standalone write-off input table has been removed. Write-off information is now part of the borrower form.
- Each borrower has two new optional fields:
  1. **Repayment Stop Date** — the date the borrower stops making repayments (replaces the old 180-day backdate from write-off date).
  2. **Write-Off Date** — automatically computed as the 1st of the month following the stop date (read-only, displayed in form and table).
- When a repayment stop date is set, the **write-off outstanding amount** is automatically computed as `max(0, loanAmount - totalRepaid)` where totalRepaid counts repayments from start date to stop date.
- The write-off outstanding amount is displayed in both the form (as a preview) and the table (as a computed column).
- Borrowers without a repayment stop date behave normally with no write-off.
- The "Generate Graphs" button now only requires at least one investment and one borrower (write-offs are no longer a separate prerequisite).
- Existing localStorage data migrates gracefully: old `writeOffs` arrays are ignored, and borrowers without `loanAmount` or `repaymentStopDate` receive default values.

### 25. Loan amount field with default value

**Acceptance Criteria:**

- Each borrower has a **Loan Amount** field, defaulting to **5,000,000 IDR**.
- The loan amount is editable in the borrower form and persisted with the borrower record.
- The loan amount is used to compute the write-off outstanding amount and the 133% completion cap.
- Bulk-created borrowers all share the same loan amount value from the form.

### 26. 133% loan completion logic

**Acceptance Criteria:**

- A borrower automatically stops making repayments once their cumulative repaid amount reaches **133% of their loan amount** (`loanAmount * 1.33`).
- This applies to all borrowers, regardless of whether they have a repayment stop date.
- The 133% cap is enforced during simulation: each repayment increments a per-borrower cumulative counter, and once the threshold is reached, no further repayments are processed for that borrower.
- The write-off outstanding calculation also respects the 133% cap when counting repayments between start and stop dates.

### 27. Repayment portion labels on pool graphs

**Acceptance Criteria:**

- The 4 repayment pool graphs include the portion percentage in their title labels:
  - "Lenders Margin (15% of repayment)"
  - "Lenders Principal (67% of repayment)"
  - "Platform Margin (17% of repayment)"
  - "Platform Provision (1% of repayment)"

### 28. Indonesian locale number formatting in graphs

**Acceptance Criteria:**

- All monetary graphs use Indonesian locale formatting with dots as thousand separators (e.g., `2.660.000` instead of `2660000`) for both Y-axis ticks and tooltip values.
- This applies to: the 4 repayment pool graphs, Daily Repayment, Total Repayment, NAV, AUM, Monthly Payout, and Principal vs Payout charts.

### 29. Calculation tables below graphs

**Acceptance Criteria:**

- Below all graphs, a "Calculation Tables" section displays 6 data tables showing daily computation details with a "How to Calculate" formula column.
- The 6 tables are:
  1. **Lenders Margin** — Date, Daily Repayment, Daily Margin (`15% × repayment`), Cumulative Margin (resets monthly), formula.
  2. **Lenders Principal** — Date, Daily Repayment, Daily Principal (`67% × repayment`), Cumulative Principal, formula.
  3. **Platform Margin** — Date, Daily Repayment, Daily Platform Margin (`17% × repayment`), Cumulative, formula.
  4. **Platform Provision** — Date, Daily Repayment, Daily Provision (`1% × repayment`), Cumulative, formula.
  5. **NAV Movement** — Date, NAV, Accumulated Margin, Total AUM, Total Units, formula showing `(margin + AUM) / units`.
  6. **AUM Movement** — Date, AUM, Total Invested, Total Repaid, formula describing what changed.
- Tables only show rows where activity occurred (repayment > 0, or investment/AUM change) to keep them manageable.
- Each table is scrollable with a max height and has a sticky header row.
- Numbers are formatted with Indonesian locale (dot thousand separators).
- Tables are rendered in a 2-column grid layout matching the graphs grid.