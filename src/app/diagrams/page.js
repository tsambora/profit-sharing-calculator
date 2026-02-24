export default function DiagramsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">NAV Mechanics — Visual Reference</h1>
        <p className="text-sm text-gray-500">
          How repayments flow, NAV is calculated, rebidding works, and write-offs are absorbed.
        </p>
        <a href="/" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
          &larr; Back to Simulator
        </a>
      </div>

      {/* ─── Section 1: Repayment Split ─── */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
        <h2 className="text-lg font-bold text-blue-900 mb-3">1. Repayment Split</h2>
        <p className="text-sm text-blue-800 mb-4">
          Each borrower repays <strong>Rp 133,000 / week</strong> on a Rp 5,000,000 loan (50 installments = 133% of principal).
          Every repayment is split into 4 pools:
        </p>

        {/* Proportional bar */}
        <div className="mb-4">
          <div className="flex rounded-lg overflow-hidden h-12 text-xs font-bold text-white">
            <div className="bg-green-600 flex items-center justify-center" style={{ width: "75.19%" }}>
              Lender Principal — Rp 100,000
            </div>
            <div className="bg-blue-600 flex items-center justify-center" style={{ width: "11.28%" }}>
              <span className="hidden sm:inline">Margin — 15K</span>
              <span className="sm:hidden text-[10px]">15K</span>
            </div>
            <div className="bg-orange-500 flex items-center justify-center" style={{ width: "12.78%" }}>
              <span className="hidden sm:inline">Platform — 17K</span>
              <span className="sm:hidden text-[10px]">17K</span>
            </div>
            <div className="bg-gray-500 flex items-center justify-center" style={{ width: "0.75%" }}>
            </div>
          </div>
          <div className="flex text-[11px] text-gray-600 mt-1 gap-4 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600 inline-block"></span> Lender Principal (75.2%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 inline-block"></span> Lender Margin (11.3%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block"></span> Platform Margin (12.8%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-500 inline-block"></span> Provision (0.75%)</span>
          </div>
        </div>

        {/* Pool cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-green-100 border border-green-300 rounded-lg p-3">
            <div className="font-bold text-green-800">Rp 100,000</div>
            <div className="text-green-700 text-xs mt-1">Lender Principal</div>
            <div className="text-green-600 text-xs mt-1">Returns to AUM. Accumulates toward rebidding threshold (Rp 5M).</div>
          </div>
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
            <div className="font-bold text-blue-800">Rp 15,000</div>
            <div className="text-blue-700 text-xs mt-1">Lender Margin</div>
            <div className="text-blue-600 text-xs mt-1">Lender profit. Distributed monthly or redirected to margin rebidding.</div>
          </div>
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
            <div className="font-bold text-orange-800">Rp 17,000</div>
            <div className="text-orange-700 text-xs mt-1">Platform Margin</div>
            <div className="text-orange-600 text-xs mt-1">Platform revenue. Always flows to platform regardless of recovery mode.</div>
          </div>
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
            <div className="font-bold text-gray-800">Rp 1,000</div>
            <div className="text-gray-700 text-xs mt-1">Provision</div>
            <div className="text-gray-600 text-xs mt-1">Loss reserve. Absorbs write-offs before touching principal.</div>
          </div>
        </div>
      </section>

      {/* ─── Section 2: Option 2 — Margin Pool NAV ─── */}
      <section className="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-6">
        <h2 className="text-lg font-bold text-purple-900 mb-3">2. Option 2: Margin Pool NAV</h2>
        <p className="text-sm text-purple-800 mb-4">
          NAV = (Accumulated Lender Margin + Total AUM) / Total Units. Margin accumulates daily,
          resets monthly on payout. This creates a <strong>sawtooth</strong> pattern.
        </p>

        {/* Flowchart */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <div className="bg-white border-2 border-purple-400 rounded-lg px-4 py-2 text-sm font-semibold text-purple-900">
            Daily Repayment (Rp 133K)
          </div>
          <ArrowDown color="purple" />
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="bg-green-100 border border-green-400 rounded px-3 py-1.5 text-xs font-medium text-green-800">
              Principal &rarr; AUM
            </div>
            <div className="bg-blue-100 border border-blue-400 rounded px-3 py-1.5 text-xs font-medium text-blue-800">
              Margin &rarr; Margin Pool
            </div>
            <div className="bg-orange-100 border border-orange-400 rounded px-3 py-1.5 text-xs font-medium text-orange-800">
              Platform &rarr; Revenue
            </div>
            <div className="bg-gray-100 border border-gray-400 rounded px-3 py-1.5 text-xs font-medium text-gray-700">
              Provision &rarr; Reserve
            </div>
          </div>
          <ArrowDown color="purple" />
          <div className="bg-purple-200 border border-purple-400 rounded-lg px-4 py-2 text-sm font-semibold text-purple-900">
            Daily NAV = (Margin Pool + AUM) / Units
          </div>
          <div className="text-xs text-purple-600 italic">margin accumulates &rarr; NAV rises daily</div>
          <ArrowDown color="purple" />
          <div className="bg-purple-300 border border-purple-500 rounded-lg px-4 py-2 text-sm font-bold text-purple-900">
            Month-End Payout
          </div>
          <div className="text-xs text-purple-600 italic">margin distributed to lenders &rarr; pool resets to 0 &rarr; NAV drops</div>
        </div>

        {/* Sawtooth SVG */}
        <div className="bg-white rounded-lg border border-purple-200 p-4">
          <div className="text-xs font-semibold text-purple-700 mb-2">NAV Over Time (Sawtooth Pattern)</div>
          <svg viewBox="0 0 600 150" className="w-full h-auto" role="img" aria-label="Sawtooth NAV chart">
            {/* Grid lines */}
            <line x1="50" y1="20" x2="50" y2="130" stroke="#e9d5ff" strokeWidth="1" />
            <line x1="50" y1="130" x2="580" y2="130" stroke="#e9d5ff" strokeWidth="1" />
            <line x1="50" y1="80" x2="580" y2="80" stroke="#e9d5ff" strokeWidth="1" strokeDasharray="4" />
            {/* Axis labels */}
            <text x="24" y="84" fontSize="9" fill="#7c3aed" textAnchor="middle">1.00</text>
            <text x="24" y="34" fontSize="9" fill="#7c3aed" textAnchor="middle">1.02</text>
            <text x="24" y="134" fontSize="9" fill="#7c3aed" textAnchor="middle">0.98</text>
            <text x="315" y="148" fontSize="9" fill="#7c3aed" textAnchor="middle">Time (months)</text>
            {/* Sawtooth line — 5 months */}
            <polyline
              points="50,80 155,35 156,78 260,33 261,76 365,31 366,74 470,29 471,72 575,27"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Drop lines */}
            {[155, 260, 365, 470].map((x, i) => (
              <line key={i} x1={x + 1} y1={80 - (i + 1) * 2} x2={x + 1} y2={35 - i * 2} stroke="#7c3aed" strokeWidth="1" strokeDasharray="3" opacity="0.4" />
            ))}
            {/* Month labels */}
            {["M1", "M2", "M3", "M4", "M5"].map((label, i) => (
              <text key={label} x={50 + i * 105 + 52} y="142" fontSize="9" fill="#7c3aed" textAnchor="middle">{label}</text>
            ))}
            {/* Annotations */}
            <text x="110" y="28" fontSize="8" fill="#9333ea">payout</text>
            <text x="105" y="16" fontSize="8" fill="#9333ea">&darr; drop</text>
          </svg>
          <div className="text-xs text-purple-600 mt-1">
            NAV rises as margin accumulates during the month, then drops when margin is paid out to lenders.
            Overall trend is upward as principal rebidding grows AUM.
          </div>
        </div>
      </section>

      {/* ─── Section 3: Option 1 — Margin Rebidding NAV ─── */}
      <section className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mb-6">
        <h2 className="text-lg font-bold text-indigo-900 mb-3">3. Option 1: Margin Rebidding NAV</h2>
        <p className="text-sm text-indigo-800 mb-4">
          A configured % of lender margin goes to a <strong>rebidding accumulator</strong> instead of payout.
          Since rebidding margin is immediately counted as AUM, NAV = Total AUM / Total Units — no sawtooth.
        </p>

        {/* Flowchart */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <div className="bg-white border-2 border-indigo-400 rounded-lg px-4 py-2 text-sm font-semibold text-indigo-900">
            Lender Margin (Rp 15,000 per repayment)
          </div>
          <ArrowDown color="indigo" />
          <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center gap-1">
              <div className="bg-indigo-200 border border-indigo-400 rounded px-3 py-1.5 text-xs font-bold text-indigo-900">
                Rebidding %
              </div>
              <div className="text-[10px] text-indigo-600">(e.g. 70%)</div>
              <ArrowDown color="indigo" size="sm" />
              <div className="bg-indigo-100 border border-indigo-400 rounded px-3 py-1.5 text-xs text-indigo-800">
                Margin Rebidding Accumulator
              </div>
              <div className="text-[10px] text-indigo-600">counted as AUM immediately</div>
              <ArrowDown color="indigo" size="sm" />
              <div className="bg-indigo-300 border border-indigo-500 rounded px-3 py-1.5 text-xs font-semibold text-indigo-900">
                When accumulator &ge; 5M &rarr; new loan
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="bg-blue-200 border border-blue-400 rounded px-3 py-1.5 text-xs font-bold text-blue-900">
                Payout %
              </div>
              <div className="text-[10px] text-blue-600">(e.g. 30%)</div>
              <ArrowDown color="blue" size="sm" />
              <div className="bg-blue-100 border border-blue-400 rounded px-3 py-1.5 text-xs text-blue-800">
                Lender Payout Pool
              </div>
              <div className="text-[10px] text-blue-600">distributed monthly</div>
            </div>
          </div>
        </div>

        {/* Smooth NAV SVG */}
        <div className="bg-white rounded-lg border border-indigo-200 p-4">
          <div className="text-xs font-semibold text-indigo-700 mb-2">NAV Over Time (Smooth Growth)</div>
          <svg viewBox="0 0 600 150" className="w-full h-auto" role="img" aria-label="Smooth NAV chart">
            <line x1="50" y1="20" x2="50" y2="130" stroke="#c7d2fe" strokeWidth="1" />
            <line x1="50" y1="130" x2="580" y2="130" stroke="#c7d2fe" strokeWidth="1" />
            <line x1="50" y1="80" x2="580" y2="80" stroke="#c7d2fe" strokeWidth="1" strokeDasharray="4" />
            <text x="24" y="84" fontSize="9" fill="#4f46e5" textAnchor="middle">1.00</text>
            <text x="24" y="34" fontSize="9" fill="#4f46e5" textAnchor="middle">1.06</text>
            <text x="315" y="148" fontSize="9" fill="#4f46e5" textAnchor="middle">Time (months)</text>
            {/* Smooth curve */}
            <path
              d="M50,80 C150,72 200,62 280,52 C360,42 440,34 580,25"
              fill="none"
              stroke="#4f46e5"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Comparison dashed sawtooth */}
            <polyline
              points="50,80 155,55 156,73 260,48 261,66 365,41 366,59 470,34 471,52 575,27"
              fill="none"
              stroke="#a78bfa"
              strokeWidth="1.5"
              strokeDasharray="5,3"
            />
            {["M1", "M2", "M3", "M4", "M5"].map((label, i) => (
              <text key={label} x={50 + i * 105 + 52} y="142" fontSize="9" fill="#4f46e5" textAnchor="middle">{label}</text>
            ))}
            {/* Legend */}
            <line x1="400" y1="12" x2="430" y2="12" stroke="#4f46e5" strokeWidth="2.5" />
            <text x="435" y="15" fontSize="8" fill="#4f46e5">Margin Rebidding NAV</text>
            <line x1="400" y1="24" x2="430" y2="24" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5,3" />
            <text x="435" y="27" fontSize="8" fill="#a78bfa">Margin Pool NAV (comparison)</text>
          </svg>
          <div className="text-xs text-indigo-600 mt-1">
            Because margin committed to rebidding is immediately counted in AUM, NAV grows smoothly.
            The dashed line shows the sawtooth pattern from Option 2 for comparison.
          </div>
        </div>
      </section>

      {/* ─── Section 4: Rebidding Mechanics ─── */}
      <section className="bg-green-50 border border-green-200 rounded-lg p-5 mb-6">
        <h2 className="text-lg font-bold text-green-900 mb-3">4. Rebidding Mechanics</h2>
        <p className="text-sm text-green-800 mb-4">
          Rebidding is the compounding engine. When accumulated funds hit <strong>Rp 5,000,000</strong>,
          a new loan is created — generating additional repayment streams.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Principal Rebidding */}
          <div className="bg-white border border-green-300 rounded-lg p-4">
            <h3 className="font-bold text-green-800 text-sm mb-3">Principal Rebidding</h3>
            <div className="flex flex-col items-center gap-1">
              <div className="bg-green-100 border border-green-400 rounded px-3 py-2 text-xs font-medium text-green-800 w-full text-center">
                Rp 100,000 / repayment &rarr; Principal Pool
              </div>
              <ArrowDown color="green" size="sm" />
              <div className="bg-green-200 border border-green-400 rounded px-3 py-2 text-xs text-green-800 w-full text-center">
                Accumulates from all active loans (original + rebidding)
              </div>
              <ArrowDown color="green" size="sm" />
              <div className="bg-green-300 border border-green-500 rounded px-3 py-2 text-xs font-bold text-green-900 w-full text-center">
                Pool &ge; Rp 5,000,000?
              </div>
              <div className="flex gap-4 mt-1">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-green-600 font-bold">YES</span>
                  <ArrowDown color="green" size="sm" />
                  <div className="bg-green-600 text-white rounded px-3 py-1.5 text-xs font-bold text-center">
                    New Rebidding Loan Created
                  </div>
                  <div className="text-[10px] text-green-600 text-center">
                    5M loan, 133K/week, 50 installments
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400 font-bold">NO</span>
                  <ArrowDown color="gray" size="sm" />
                  <div className="bg-gray-100 border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-600 text-center">
                    Keep accumulating
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 bg-green-50 rounded p-2 text-[11px] text-green-700">
              <strong>Key:</strong> Multiple loans can trigger at once if principal accumulates fast enough.
              Each rebidding loan feeds the same 4-pool split, creating compounding cycles.
            </div>
          </div>

          {/* Margin Rebidding */}
          <div className="bg-white border border-indigo-300 rounded-lg p-4">
            <h3 className="font-bold text-indigo-800 text-sm mb-3">Margin Rebidding <span className="text-xs font-normal text-indigo-500">(Option 1 only)</span></h3>
            <div className="flex flex-col items-center gap-1">
              <div className="bg-indigo-100 border border-indigo-400 rounded px-3 py-2 text-xs font-medium text-indigo-800 w-full text-center">
                Rebidding % of Rp 15,000 &rarr; Margin Accumulator
              </div>
              <ArrowDown color="indigo" size="sm" />
              <div className="bg-indigo-200 border border-indigo-400 rounded px-3 py-2 text-xs text-indigo-800 w-full text-center">
                Immediately counted as AUM (no NAV impact on loan creation)
              </div>
              <ArrowDown color="indigo" size="sm" />
              <div className="bg-indigo-300 border border-indigo-500 rounded px-3 py-2 text-xs font-bold text-indigo-900 w-full text-center">
                Accumulator &ge; Rp 5,000,000?
              </div>
              <div className="flex gap-4 mt-1">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-indigo-600 font-bold">YES</span>
                  <ArrowDown color="indigo" size="sm" />
                  <div className="bg-indigo-600 text-white rounded px-3 py-1.5 text-xs font-bold text-center">
                    Margin-Rebidding Loan Created
                  </div>
                  <div className="text-[10px] text-indigo-600 text-center">
                    Already in AUM &rarr; no NAV jump
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400 font-bold">NO</span>
                  <ArrowDown color="gray" size="sm" />
                  <div className="bg-gray-100 border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-600 text-center">
                    Keep accumulating
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 bg-indigo-50 rounded p-2 text-[11px] text-indigo-700">
              <strong>Key difference:</strong> Margin rebidding funds are already in AUM before the loan is created,
              so loan creation doesn&apos;t move NAV. Principal from margin-rebidding loan repayments feeds into the
              principal rebidding accumulator.
            </div>
          </div>
        </div>

        {/* Compounding diagram */}
        <div className="mt-4 bg-white border border-green-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-green-700 mb-2">Compounding Flow</div>
          <svg viewBox="0 0 700 120" className="w-full h-auto" role="img" aria-label="Compounding flow diagram">
            {/* Original loans */}
            <rect x="10" y="10" width="130" height="40" rx="6" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" />
            <text x="75" y="27" fontSize="10" fill="#166534" textAnchor="middle" fontWeight="bold">Original Loans</text>
            <text x="75" y="40" fontSize="8" fill="#166534" textAnchor="middle">133K/week repayments</text>

            {/* Arrow to split */}
            <line x1="140" y1="30" x2="175" y2="30" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />

            {/* Split */}
            <rect x="175" y="5" width="100" height="50" rx="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1" />
            <text x="225" y="22" fontSize="9" fill="#166534" textAnchor="middle" fontWeight="bold">4-Pool Split</text>
            <text x="225" y="34" fontSize="8" fill="#166534" textAnchor="middle">100K + 15K</text>
            <text x="225" y="44" fontSize="8" fill="#166534" textAnchor="middle">+ 17K + 1K</text>

            {/* Arrow to principal pool */}
            <line x1="275" y1="20" x2="320" y2="20" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />

            {/* Principal pool */}
            <rect x="320" y="5" width="110" height="30" rx="6" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.5" />
            <text x="375" y="24" fontSize="9" fill="#166534" textAnchor="middle" fontWeight="bold">Principal Pool</text>

            {/* Arrow to check */}
            <line x1="430" y1="20" x2="470" y2="20" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />

            {/* Threshold */}
            <rect x="470" y="5" width="80" height="30" rx="6" fill="#16a34a" stroke="#166534" strokeWidth="1" />
            <text x="510" y="24" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">&ge; 5M?</text>

            {/* Arrow to new loan */}
            <line x1="550" y1="20" x2="590" y2="20" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />

            {/* New loan */}
            <rect x="590" y="5" width="100" height="30" rx="6" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" />
            <text x="640" y="24" fontSize="9" fill="#166534" textAnchor="middle" fontWeight="bold">New Loan!</text>

            {/* Feedback arrow */}
            <path d="M640,35 L640,100 L75,100 L75,50" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="6,3" markerEnd="url(#arrowGreen)" />
            <text x="360" y="95" fontSize="8" fill="#16a34a" textAnchor="middle">repayments feed back into the same cycle</text>

            {/* Arrow marker */}
            <defs>
              <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" fill="#16a34a" />
              </marker>
            </defs>
          </svg>
        </div>
      </section>

      {/* ─── Section 5: Write-Off & Recovery ─── */}
      <section className="bg-red-50 border border-red-200 rounded-lg p-5 mb-6">
        <h2 className="text-lg font-bold text-red-900 mb-3">5. Write-Off &amp; Recovery</h2>
        <p className="text-sm text-red-800 mb-4">
          When a borrower stops repaying, the loan goes through a default process — declaration, absorption, and potentially recovery.
        </p>

        {/* Timeline */}
        <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
          <div className="text-xs font-semibold text-red-700 mb-3">Default Timeline</div>
          <div className="relative">
            {/* Timeline bar */}
            <div className="h-2 bg-red-100 rounded-full mx-4"></div>
            <div className="flex justify-between mx-2 mt-2">
              <div className="flex flex-col items-center text-center max-w-[120px]">
                <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-600 -mt-5 mb-1"></div>
                <div className="text-[10px] font-bold text-yellow-700">Last Repayment</div>
                <div className="text-[9px] text-gray-500">Borrower stops paying</div>
              </div>
              <div className="flex flex-col items-center text-center max-w-[140px]">
                <div className="w-4 h-4 rounded-full bg-orange-400 border-2 border-orange-600 -mt-5 mb-1"></div>
                <div className="text-[10px] font-bold text-orange-700">+180 Days</div>
                <div className="text-[9px] text-gray-500">Write-off declared</div>
              </div>
              <div className="flex flex-col items-center text-center max-w-[140px]">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-700 -mt-5 mb-1"></div>
                <div className="text-[10px] font-bold text-red-700">1st of Next Month</div>
                <div className="text-[9px] text-gray-500">Write-off absorbed</div>
              </div>
              <div className="flex flex-col items-center text-center max-w-[140px]">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-700 -mt-5 mb-1"></div>
                <div className="text-[10px] font-bold text-green-700">Recovery Complete</div>
                <div className="text-[9px] text-gray-500">If AUM deficit exists</div>
              </div>
            </div>
          </div>
        </div>

        {/* Absorption Waterfall */}
        <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
          <div className="text-xs font-semibold text-red-700 mb-3">Absorption Waterfall</div>
          <p className="text-xs text-red-600 mb-3">
            Outstanding loan amount is absorbed in this priority order. Each layer absorbs as much as it can before passing the remainder down.
          </p>
          <div className="flex flex-col gap-1">
            {[
              { label: "1. Lender Margin", sublabel: "Monthly accumulated margin pool", color: "blue", width: "100%" },
              { label: "2. Platform Provision", sublabel: "Cumulative provision reserve", color: "gray", width: "85%" },
              { label: "3. Platform Margin", sublabel: "Cumulative platform revenue", color: "orange", width: "65%" },
              { label: "4. Lender Principal", sublabel: "Cumulative principal pool", color: "green", width: "40%" },
            ].map((layer) => (
              <div key={layer.label} className="flex items-center gap-3">
                <div
                  className={`h-10 rounded flex items-center px-3 text-white text-xs font-bold ${
                    layer.color === "blue" ? "bg-blue-600" :
                    layer.color === "gray" ? "bg-gray-500" :
                    layer.color === "orange" ? "bg-orange-500" :
                    "bg-green-600"
                  }`}
                  style={{ width: layer.width }}
                >
                  {layer.label}
                </div>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">{layer.sublabel}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-1">
              <div className="h-10 bg-red-600 rounded flex items-center px-3 text-white text-xs font-bold" style={{ width: "20%" }}>
                5. Unabsorbed
              </div>
              <span className="text-[10px] text-red-500 whitespace-nowrap font-semibold">Permanently reduces AUM &rarr; triggers Recovery Mode</span>
            </div>
          </div>
        </div>

        {/* Recovery Mode */}
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-red-700 mb-3">AUM Recovery Mode</div>
          <p className="text-xs text-red-600 mb-3">
            When an unabsorbed write-off reduces AUM, recovery mode activates to close the deficit.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-red-200 rounded-lg p-3 bg-red-50">
              <div className="text-xs font-bold text-red-800 mb-1">During Recovery</div>
              <ul className="text-[11px] text-red-700 space-y-1">
                <li className="flex items-start gap-1">
                  <span className="text-red-400 mt-0.5">&#9679;</span>
                  <span><strong>Rp 116K of each 133K</strong> repayment funneled to AUM recovery (principal + margin + provision)</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-red-400 mt-0.5">&#9679;</span>
                  <span><strong>Platform margin (17K)</strong> always flows normally</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-red-400 mt-0.5">&#9679;</span>
                  <span><strong>Lender payouts paused</strong></span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-red-400 mt-0.5">&#9679;</span>
                  <span><strong>All rebidding paused</strong> (principal + margin)</span>
                </li>
              </ul>
            </div>
            <div className="border border-green-200 rounded-lg p-3 bg-green-50">
              <div className="text-xs font-bold text-green-800 mb-1">After Recovery</div>
              <ul className="text-[11px] text-green-700 space-y-1">
                <li className="flex items-start gap-1">
                  <span className="text-green-400 mt-0.5">&#9679;</span>
                  <span><strong>Immediate resume</strong> when deficit reaches 0</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-green-400 mt-0.5">&#9679;</span>
                  <span><strong>Mid-repayment split</strong> — if deficit clears partway through, remainder goes to normal pools</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-green-400 mt-0.5">&#9679;</span>
                  <span><strong>Rebidding resumes</strong> — principal and margin accumulation restart</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-green-400 mt-0.5">&#9679;</span>
                  <span><strong>Payouts resume</strong> — lenders receive margin again</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Recovery SVG */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-red-700 mb-2">AUM During Write-Off &amp; Recovery</div>
            <svg viewBox="0 0 600 130" className="w-full h-auto" role="img" aria-label="AUM recovery chart">
              <line x1="50" y1="10" x2="50" y2="110" stroke="#fecaca" strokeWidth="1" />
              <line x1="50" y1="110" x2="580" y2="110" stroke="#fecaca" strokeWidth="1" />
              {/* Normal AUM line */}
              <polyline points="50,40 150,38 200,36 250,34" fill="none" stroke="#16a34a" strokeWidth="2" />
              {/* Write-off drop */}
              <line x1="250" y1="34" x2="260" y2="85" stroke="#dc2626" strokeWidth="2.5" />
              {/* Recovery climb */}
              <polyline points="260,85 320,72 380,60 440,48 500,38 540,34" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,3" />
              {/* Resume normal */}
              <polyline points="540,34 580,32" fill="none" stroke="#16a34a" strokeWidth="2" />
              {/* Annotations */}
              <text x="150" y="30" fontSize="8" fill="#16a34a">Normal growth</text>
              <text x="240" y="98" fontSize="8" fill="#dc2626" textAnchor="middle">Write-off</text>
              <text x="245" y="106" fontSize="8" fill="#dc2626" textAnchor="middle">absorbed</text>
              <text x="400" y="50" fontSize="8" fill="#f59e0b" textAnchor="middle">Recovery mode (116K/repayment &rarr; AUM)</text>
              <text x="555" y="28" fontSize="8" fill="#16a34a" textAnchor="middle">Resume</text>
              {/* Deficit bracket */}
              <line x1="270" y1="34" x2="270" y2="85" stroke="#dc2626" strokeWidth="1" strokeDasharray="3" />
              <text x="280" y="62" fontSize="8" fill="#dc2626">deficit</text>
            </svg>
          </div>
        </div>
      </section>

      {/* ─── Section 6: Lender Payout Calculation ─── */}
      <section className="bg-teal-50 border border-teal-200 rounded-lg p-5 mb-6">
        <h2 className="text-lg font-bold text-teal-900 mb-3">6. Lender Payout Calculation</h2>
        <p className="text-sm text-teal-800 mb-4">
          Payouts are distributed <strong>proportionally by units held</strong>. Units are issued at investment time
          based on the current NAV — so timing matters.
        </p>

        {/* Unit Allocation */}
        <div className="bg-white border border-teal-200 rounded-lg p-4 mb-4">
          <div className="text-xs font-semibold text-teal-700 mb-3">Step 1: Unit Allocation (at investment time)</div>
          <div className="flex flex-col items-center gap-1 mb-4">
            <div className="bg-teal-100 border-2 border-teal-400 rounded-lg px-4 py-2 text-sm font-semibold text-teal-900">
              Lender Invests Amount
            </div>
            <ArrowDown color="teal" />
            <div className="bg-teal-200 border border-teal-400 rounded-lg px-5 py-3 text-center">
              <div className="text-lg font-bold text-teal-900">Units = Investment &divide; NAV</div>
              <div className="text-xs text-teal-600 mt-1">Initial NAV = Rp 100,000</div>
            </div>
            <ArrowDown color="teal" />
            <div className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-bold">
              Units locked — never change after issuance
            </div>
          </div>

          {/* Example */}
          <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
            <div className="text-xs font-bold text-teal-800 mb-2">Example: Two lenders, different timing</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white rounded border border-teal-200 p-3">
                <div className="font-bold text-teal-800">Lender A — Early entry</div>
                <div className="mt-1 space-y-0.5 text-teal-700">
                  <div>Invests: <strong>Rp 10,000,000</strong></div>
                  <div>NAV at entry: <strong>Rp 100,000</strong></div>
                  <div>Units received: <strong>10M &divide; 100K = 100 units</strong></div>
                </div>
              </div>
              <div className="bg-white rounded border border-teal-200 p-3">
                <div className="font-bold text-teal-800">Lender B — Later entry</div>
                <div className="mt-1 space-y-0.5 text-teal-700">
                  <div>Invests: <strong>Rp 10,000,000</strong></div>
                  <div>NAV at entry: <strong>Rp 105,000</strong> (NAV grew)</div>
                  <div>Units received: <strong>10M &divide; 105K &asymp; 95.2 units</strong></div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-teal-600 mt-2">
              Same investment amount, but Lender B gets fewer units because NAV is higher — they&apos;re buying into a fund that has already grown.
            </div>
          </div>
        </div>

        {/* Monthly Payout Distribution */}
        <div className="bg-white border border-teal-200 rounded-lg p-4 mb-4">
          <div className="text-xs font-semibold text-teal-700 mb-3">Step 2: Monthly Payout Distribution</div>
          <div className="flex flex-col items-center gap-1 mb-4">
            <div className="bg-blue-100 border border-blue-400 rounded-lg px-4 py-2 text-sm font-medium text-blue-800">
              Lender Margin accumulates all month (Rp 15,000 per repayment)
            </div>
            <ArrowDown color="teal" />
            <div className="bg-teal-200 border border-teal-400 rounded-lg px-5 py-3 text-center">
              <div className="text-lg font-bold text-teal-900">Payout = (My Units &divide; Total Units) &times; Margin Pool</div>
            </div>
            <ArrowDown color="teal" />
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center gap-1">
                <div className="bg-teal-100 border border-teal-300 rounded px-3 py-1.5 text-xs font-medium text-teal-800">
                  Lender A: 100 units
                </div>
                <div className="text-[10px] text-teal-600">100 / 195.2 = <strong>51.2%</strong></div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="bg-teal-100 border border-teal-300 rounded px-3 py-1.5 text-xs font-medium text-teal-800">
                  Lender B: 95.2 units
                </div>
                <div className="text-[10px] text-teal-600">95.2 / 195.2 = <strong>48.8%</strong></div>
              </div>
            </div>
          </div>

          {/* Worked example */}
          <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
            <div className="text-xs font-bold text-teal-800 mb-2">Worked Example: Month-end payout</div>
            <div className="text-xs text-teal-700 space-y-1">
              <div>Total margin accumulated this month: <strong>Rp 750,000</strong></div>
              <div>Total units outstanding: <strong>195.2</strong></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-xs">
              <div className="bg-white rounded border border-teal-200 p-2">
                <div className="font-bold text-teal-800">Lender A</div>
                <div className="text-teal-700">(100 &divide; 195.2) &times; 750K = <strong>Rp 384,016</strong></div>
              </div>
              <div className="bg-white rounded border border-teal-200 p-2">
                <div className="font-bold text-teal-800">Lender B</div>
                <div className="text-teal-700">(95.2 &divide; 195.2) &times; 750K = <strong>Rp 365,984</strong></div>
              </div>
            </div>
            <div className="text-[10px] text-teal-600 mt-2">
              Both get a proportional share. Lender A gets more because they hold more units (entered at a lower NAV).
            </div>
          </div>
        </div>

        {/* Full flow SVG */}
        <div className="bg-white border border-teal-200 rounded-lg p-4 mb-4">
          <div className="text-xs font-semibold text-teal-700 mb-2">Complete Payout Flow</div>
          <svg viewBox="0 0 700 200" className="w-full h-auto" role="img" aria-label="Lender payout flow diagram">
            <defs>
              <marker id="arrowTeal" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" fill="#0d9488" />
              </marker>
              <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" fill="#2563eb" />
              </marker>
            </defs>

            {/* Investment */}
            <rect x="5" y="10" width="110" height="40" rx="6" fill="#ccfbf1" stroke="#0d9488" strokeWidth="1.5" />
            <text x="60" y="27" fontSize="10" fill="#134e4a" textAnchor="middle" fontWeight="bold">Investment</text>
            <text x="60" y="40" fontSize="8" fill="#134e4a" textAnchor="middle">e.g. Rp 10M</text>

            {/* Arrow */}
            <line x1="115" y1="30" x2="145" y2="30" stroke="#0d9488" strokeWidth="1.5" markerEnd="url(#arrowTeal)" />

            {/* NAV */}
            <rect x="145" y="10" width="90" height="40" rx="6" fill="#f0fdfa" stroke="#0d9488" strokeWidth="1" />
            <text x="190" y="27" fontSize="10" fill="#134e4a" textAnchor="middle" fontWeight="bold">&divide; NAV</text>
            <text x="190" y="40" fontSize="8" fill="#134e4a" textAnchor="middle">e.g. Rp 100K</text>

            {/* Arrow */}
            <line x1="235" y1="30" x2="265" y2="30" stroke="#0d9488" strokeWidth="1.5" markerEnd="url(#arrowTeal)" />

            {/* Units */}
            <rect x="265" y="10" width="100" height="40" rx="6" fill="#0d9488" stroke="#134e4a" strokeWidth="1" />
            <text x="315" y="27" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">100 Units</text>
            <text x="315" y="40" fontSize="8" fill="#ccfbf1" textAnchor="middle">issued to lender</text>

            {/* Repayments flowing into margin pool */}
            <rect x="5" y="80" width="130" height="40" rx="6" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
            <text x="70" y="97" fontSize="10" fill="#1e40af" textAnchor="middle" fontWeight="bold">Weekly Repayments</text>
            <text x="70" y="110" fontSize="8" fill="#1e40af" textAnchor="middle">Rp 15K margin each</text>

            <line x1="135" y1="100" x2="165" y2="100" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#arrowBlue)" />

            <rect x="165" y="80" width="140" height="40" rx="6" fill="#bfdbfe" stroke="#2563eb" strokeWidth="1.5" />
            <text x="235" y="97" fontSize="10" fill="#1e40af" textAnchor="middle" fontWeight="bold">Margin Pool</text>
            <text x="235" y="110" fontSize="8" fill="#1e40af" textAnchor="middle">accumulates all month</text>

            {/* Month end trigger */}
            <line x1="305" y1="100" x2="335" y2="100" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#arrowBlue)" />

            <rect x="335" y="75" width="100" height="50" rx="6" fill="#2563eb" stroke="#1e40af" strokeWidth="1" />
            <text x="385" y="95" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">Month-End</text>
            <text x="385" y="108" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">Payout</text>

            {/* Arrow to formula */}
            <line x1="435" y1="100" x2="460" y2="100" stroke="#0d9488" strokeWidth="1.5" markerEnd="url(#arrowTeal)" />

            {/* Formula */}
            <rect x="460" y="70" width="230" height="60" rx="6" fill="#f0fdfa" stroke="#0d9488" strokeWidth="1.5" />
            <text x="575" y="92" fontSize="10" fill="#134e4a" textAnchor="middle" fontWeight="bold">Lender Payout =</text>
            <text x="575" y="108" fontSize="11" fill="#0d9488" textAnchor="middle" fontWeight="bold">(Units / Total Units) &times; Pool</text>
            <text x="575" y="122" fontSize="8" fill="#134e4a" textAnchor="middle">(100 / 195.2) &times; 750K = 384,016</text>

            {/* NAV impact section */}
            <rect x="5" y="150" width="690" height="40" rx="6" fill="#fefce8" stroke="#ca8a04" strokeWidth="1" />
            <text x="350" y="167" fontSize="10" fill="#854d0e" textAnchor="middle" fontWeight="bold">
              NAV Impact: After payout, margin pool resets to 0 &rarr; NAV drops back to AUM / Units (sawtooth in Option 2)
            </text>
            <text x="350" y="182" fontSize="9" fill="#a16207" textAnchor="middle">
              In Option 1: only the payout % of margin is distributed — the rebidding % stays in AUM, keeping NAV smooth
            </text>
          </svg>
        </div>

        {/* NAV and Payout relationship */}
        <div className="bg-white border border-teal-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-teal-700 mb-3">How NAV Affects Returns</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border border-teal-200 rounded-lg p-3 bg-teal-50">
              <div className="text-xs font-bold text-teal-800 mb-1">Early Investor (Low NAV)</div>
              <ul className="text-[11px] text-teal-700 space-y-1">
                <li className="flex items-start gap-1">
                  <span className="text-teal-400 mt-0.5">&#9679;</span>
                  <span>Buys at NAV = 100K</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-teal-400 mt-0.5">&#9679;</span>
                  <span><strong>More units</strong> per IDR invested</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-teal-400 mt-0.5">&#9679;</span>
                  <span>Larger share of every future payout</span>
                </li>
              </ul>
            </div>
            <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
              <div className="text-xs font-bold text-amber-800 mb-1">Late Investor (High NAV)</div>
              <ul className="text-[11px] text-amber-700 space-y-1">
                <li className="flex items-start gap-1">
                  <span className="text-amber-400 mt-0.5">&#9679;</span>
                  <span>Buys at NAV = 110K</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-amber-400 mt-0.5">&#9679;</span>
                  <span><strong>Fewer units</strong> per IDR invested</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-amber-400 mt-0.5">&#9679;</span>
                  <span>Smaller share — but buying into a larger, proven fund</span>
                </li>
              </ul>
            </div>
            <div className="border border-purple-200 rounded-lg p-3 bg-purple-50">
              <div className="text-xs font-bold text-purple-800 mb-1">Why This Is Fair</div>
              <ul className="text-[11px] text-purple-700 space-y-1">
                <li className="flex items-start gap-1">
                  <span className="text-purple-400 mt-0.5">&#9679;</span>
                  <span>NAV reflects <strong>real AUM growth</strong> from rebidding</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-purple-400 mt-0.5">&#9679;</span>
                  <span>Early investors earned the growth — new investors shouldn&apos;t dilute it</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-purple-400 mt-0.5">&#9679;</span>
                  <span>Each unit always gets the <strong>same payout</strong> regardless of when it was issued</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        These diagrams are a static reference. Run the{" "}
        <a href="/" className="text-blue-500 hover:underline">simulator</a>{" "}
        to see these mechanics in action with real numbers.
      </div>
    </main>
  );
}

/** Reusable SVG arrow-down component */
function ArrowDown({ color = "gray", size = "md" }) {
  const h = size === "sm" ? 16 : 24;
  const colors = {
    purple: "#7c3aed",
    indigo: "#4f46e5",
    green: "#16a34a",
    blue: "#2563eb",
    teal: "#0d9488",
    gray: "#9ca3af",
  };
  const c = colors[color] || colors.gray;
  return (
    <svg width="16" height={h} viewBox={`0 0 16 ${h}`} className="shrink-0">
      <line x1="8" y1="0" x2="8" y2={h - 4} stroke={c} strokeWidth="2" />
      <polygon points={`4,${h - 6} 8,${h} 12,${h - 6}`} fill={c} />
    </svg>
  );
}
