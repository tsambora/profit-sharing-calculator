// Compute write-off date: 1st of the month following repaymentStopDate
export function computeWriteOffDate(repaymentStopDate) {
  if (!repaymentStopDate) return null;
  const d = new Date(repaymentStopDate);
  // Move to 1st of next month
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().split("T")[0];
}

// Count repayments between startDate and stopDate (exclusive of stopDate)
export function countRepaymentsInRange(startDate, schedule, stopDate) {
  const start = new Date(startDate);
  const stop = new Date(stopDate);
  const repaymentDay = start.getDay();
  let count = 0;
  let current = new Date(start);

  while (current < stop) {
    if (schedule === "daily") {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
    } else if (schedule === "weekly") {
      if (current.getDay() === repaymentDay) count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Compute write-off outstanding amount: max(0, loanAmount - totalRepaid)
// Repayment count is capped at 133% completion threshold
export function computeWriteOffOutstanding(startDate, schedule, stopDate, repaymentAmount, loanAmount) {
  const maxRepaymentTotal = loanAmount * 1.33;
  const maxRepayments = Math.floor(maxRepaymentTotal / repaymentAmount);
  const actualRepayments = countRepaymentsInRange(startDate, schedule, stopDate);
  const repayments = Math.min(actualRepayments, maxRepayments);
  const totalRepaid = repayments * repaymentAmount;
  return Math.max(0, loanAmount - totalRepaid);
}
