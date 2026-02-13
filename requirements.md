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

### 3. Accept user input for loan write off schedule and the outstanding amount of the written off loans

**Acceptance Criteria:**

User can input, edit, and delete multiple write off of loans in the fund with below attributes:

1. Borrower ID
2. Write off date
3. Outstanding amount of the loan
4. How many borrowers? (This is used to create multiple write-offs at once. Borrower IDs will be randomly picked from the existing borrower list.)

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

### 15. Gradual NAV recovery after write-off losses

**Acceptance Criteria:**

- When a write-off causes AUM to drop (unabsorbed loss), the deficit is tracked.
- Each subsequent month, the lender principal pool from repayments is used to recover the deficit, gradually rebuilding AUM.
- Once the deficit is fully recovered, principal stops adding to AUM and NAV returns to normal levels.

### 16. Written-off borrowers stop making repayments

**Acceptance Criteria:**

- When a loan is written off, the borrower ID is recorded.
- From the day after the write-off date, that borrower no longer contributes repayments to the fund.
- This reduces the total repayment inflow proportionally to the number of written-off borrowers.