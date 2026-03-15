import { useEffect, useRef, useState } from "react";

function useCountUp(target, duration = 1600, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(id);
      } else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [active, target, duration]);
  return value;
}

const STATS = [
  { label: "DOT Streamed", suffix: "M+", decimals: 1, target: 42, prefix: "$" },
  {
    label: "Agent Transactions",
    suffix: "+",
    decimals: 0,
    target: 18400,
    prefix: "",
  },
  {
    label: "Min Stream Rate",
    suffix: "",
    decimals: 0,
    target: 0,
    prefix: "",
    fixed: "0.000001 DOT/s",
  },
  {
    label: "Polkadot Parachains",
    suffix: "",
    decimals: 0,
    target: 12,
    prefix: "",
  },
];

export default function LandingStats() {
  const v0 = useCountUp(42, 1600, true);
  const v1 = useCountUp(18400, 1600, true);
  const v3 = useCountUp(12, 1600, true);

  const values = [
    `$${(v0 / 10).toFixed(1)}M+`,
    `${v1.toLocaleString()}+`,
    "0.000001 dot/s",
    `${v3}`,
  ];

  return (
    <section className="w-full bg-surface-900 border-y border-surface-700 py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <div key={i} className="space-y-1">
              <p className="text-3xl md:text-4xl font-mono font-bold text-flowpay-400 tabular-nums">
                {values[i]}
              </p>
              <p className="text-xs text-surface-400 uppercase tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
