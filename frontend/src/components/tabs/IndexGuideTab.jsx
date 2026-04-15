import { indexGuideSections } from "../../constants.jsx";

export function IndexGuideTab() {
  return (
    <>
      <section className="grid gap-6">
        <article className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur">
          <h2 className="text-3xl font-semibold">Index Guide</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate">
            This page explains the main portfolio analytics indexes used across the dashboard. Each card includes a plain-English definition, a formula, and a short interpretation so users can understand what the metric means before they react to the number.
          </p>
        </article>
      </section>

      <section className="grid gap-6">
        {indexGuideSections.map((section) => (
          <article key={section.title} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
            <div className="mb-5">
              <h3 className="text-2xl font-semibold">{section.title}</h3>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {section.items.map((item) => (
                <div key={item.name} className="rounded-[28px] border border-mist bg-surface p-5">
                  <h4 className="text-lg font-semibold text-ink">{item.name}</h4>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate">
                    <p><span className="font-semibold text-ink">Definition: </span>{item.definition}</p>
                    <div className="rounded-2xl bg-white px-4 py-4 font-serif text-[15px] text-ink ring-1 ring-mist">
                      {item.formula}
                    </div>
                    <p><span className="font-semibold text-ink">Interpretation: </span>{item.interpretation}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
