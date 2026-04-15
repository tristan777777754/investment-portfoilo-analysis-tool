export function LandingPage({ onStart }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(212,180,131,0.12),_transparent_20%),radial-gradient(circle_at_82%_18%,_rgba(168,139,181,0.10),_transparent_18%),linear-gradient(180deg,_#090A0F_0%,_#12141B_48%,_#171922_100%)] text-white">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8D4AF]/80">Midnight Edition</p>
            <h1 className="mt-1 text-lg font-semibold">Portfolio Intelligence Workspace</h1>
          </div>
          <span className="rounded-full border border-[#D4B483]/20 bg-[#D4B483]/10 px-3 py-1 text-xs font-semibold text-[#F2DFC0]">
            AI + Finance + Risk
          </span>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 backdrop-blur">
              Build your portfolio. Stress it. Explain it.
            </div>
            <div className="max-w-3xl">
              <h2 className="text-5xl font-semibold leading-[1.05] md:text-7xl">
                Build your portfolio and read it like a real analytics desk.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                This workspace helps you construct a portfolio, compare it against a benchmark, inspect risk, run scenarios, and translate financial indicators into language a normal user can actually understand.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">Analytics</p>
                <p className="mt-3 text-3xl font-semibold">20+</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Returns, drawdown, tail risk, factor model, and concentration signals.</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">Scenario Lab</p>
                <p className="mt-3 text-3xl font-semibold">2</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Market and technology shock presets to reveal weak points quickly.</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">Interpretation</p>
                <p className="mt-3 text-3xl font-semibold">AI</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Hover help and plain-English explanations for non-professional users.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-2xl backdrop-blur">
            <div className="rounded-[30px] border border-white/10 bg-[#0F172A] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Workspace Preview</p>
                  <h3 className="mt-2 text-2xl font-semibold">Deep-night dashboard</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">Live workflow</span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
                <aside className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Modules</p>
                  <div className="mt-4 space-y-2">
                    {["Overview", "Risk Analytics", "Scenario Lab", "Factor Model", "Index Guide"].map((item, index) => (
                      <div key={item} className={`rounded-2xl px-4 py-3 text-sm font-medium ${index === 0 ? "bg-[#D4B483]/15 text-[#F2DFC0] ring-1 ring-[#D4B483]/20" : "bg-white/[0.03] text-white/65"}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                </aside>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[["Return", "+18.4%"], ["VaR (95%)", "-1.07%"], ["Beta", "0.94"]].map(([label, value]) => (
                      <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white/55">{label}</p>
                        <p className="mt-3 text-2xl font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold">Portfolio Overview</h4>
                        <p className="text-sm text-white/55">Performance, benchmark, and holdings.</p>
                      </div>
                      <span className="rounded-full bg-[#D4B483]/15 px-3 py-1 text-xs font-semibold text-[#F2DFC0]">Ready</span>
                    </div>
                    <div className="mt-5 h-44 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
                      <div className="flex h-full items-end gap-3">
                        {[32, 46, 38, 62, 58, 74, 68, 81].map((height, index) => (
                          <div key={index} className="flex-1 rounded-t-2xl bg-[linear-gradient(180deg,#E8D4AF_0%,#C88C7A_100%)]" style={{ height: `${height}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 pb-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between rounded-[30px] border border-white/10 bg-black/30 px-5 py-4 shadow-2xl backdrop-blur">
            <div>
              <p className="text-sm font-semibold text-white">Start with the workspace</p>
              <p className="text-sm text-slate-400">Build your portfolio, then move through analytics tabs step by step.</p>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="rounded-full bg-[linear-gradient(135deg,#E8D4AF_0%,#D4B483_48%,#B68562_100%)] px-6 py-3 text-sm font-semibold text-[#1A140E] transition hover:scale-[1.02]"
            >
              Start Analysis
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
