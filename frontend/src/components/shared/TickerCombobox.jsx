import { useRef, useState } from "react";
import { stockOptions } from "../../constants.jsx";

export function TickerCombobox({ value, onChange, isDisabled }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef(null);

  const filtered = stockOptions.filter(
    (opt) => opt.includes(query.toUpperCase()) && !isDisabled(opt)
  );

  function handleInputChange(event) {
    const raw = event.target.value.toUpperCase();
    setQuery(raw);
    onChange(raw);
    setOpen(true);
  }

  function handleSelect(option) {
    setQuery("");
    onChange(option);
    setOpen(false);
  }

  function handleFocus() {
    clearTimeout(blurTimeout.current);
    setQuery("");
    setOpen(true);
  }

  function handleBlur() {
    blurTimeout.current = setTimeout(() => {
      setOpen(false);
      setQuery("");
    }, 150);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={open ? "Search ticker…" : value}
        className="w-full rounded-2xl border border-white/10 bg-[#20273A] px-4 py-3 uppercase outline-none transition focus:border-white/40"
        autoComplete="off"
        spellCheck={false}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#161D2E] shadow-lg">
          {filtered.map((option) => (
            <li
              key={option}
              onMouseDown={() => handleSelect(option)}
              className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
