export function InfoTooltip({ text }) {
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-surface text-xs font-bold text-slate ring-1 ring-mist">
        i
      </span>
      <span className="pointer-events-none absolute right-0 top-7 z-20 w-72 rounded-2xl bg-[#101828] px-4 py-3 text-xs font-medium leading-6 text-white opacity-0 shadow-2xl transition duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
