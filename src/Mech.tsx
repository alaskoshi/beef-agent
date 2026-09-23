import type { Side } from "./domain";
export function Mech({ side, pose }: { side: Side; pose: string }) {
  const a = side === "a";
  return (
    <svg
      className={`mech pose-${pose}`}
      viewBox="0 0 360 390"
      role="img"
      aria-label={`${a ? "Jules, RIVET" : "Rowan, FORGE"} mech: ${pose}`}
    >
      <defs>
        <linearGradient id={`metal-${side}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={a ? "#b5bb9a" : "#bbafa0"} />
          <stop offset=".48" stopColor={a ? "#696f52" : "#776859"} />
          <stop offset="1" stopColor="#292d27" />
        </linearGradient>
      </defs>
      <ellipse cx="178" cy="366" rx="125" ry="15" fill="#070b08" opacity=".6" />
      <g
        className="body"
        stroke="#141b15"
        strokeWidth="5"
        strokeLinejoin="round"
      >
        <g className="legs">
          <path
            d="M128 227 168 230 158 298 147 340 99 340 106 303Z"
            fill={`url(#metal-${side})`}
          />
          <path
            d="M194 230 238 227 252 305 265 340 213 342 197 299Z"
            fill={`url(#metal-${side})`}
          />
          <path
            d="m96 334 56 0 5 28-83 0 3-16Z M211 335h53l22 25h-82Z"
            fill="#444d3c"
          />
          <path d="M115 265h40v28h-46Z M207 265h35l8 28h-42Z" fill="#b4b7a2" />
          <path
            d="m117 302 27 0-4 24h-29Z M219 302h23l8 24h-29Z"
            fill="#30372c"
          />
        </g>
        <path d="m131 205 103 0-7 44-88 0Z" fill="#313a2c" />
        <path
          d="M118 104 241 104 260 147 232 221 130 222 102 147Z"
          fill={`url(#metal-${side})`}
        />
        <path
          d={
            a
              ? "M128 112h102l-10 41-42 26-42-26Z"
              : "M130 114h101v42l-52 24-48-24Z"
          }
          fill={a ? "#d0d1b6" : "#d1b58e"}
        />
        <path
          d="m133 170 40 23-9 21-30-8Z M186 194l42-24-3 36-31 8Z"
          fill="#424b37"
        />
        <g stroke="#8d957a" strokeWidth="3">
          <path d="M150 123h58 M150 134h58 M153 145h52" />
        </g>
        <path d="M156 69h49v37h-49Z" fill="#343e2d" />
        <path
          d={
            a
              ? "M146 35h66l16 22-8 35h-76l-8-35Z"
              : "M155 31h54l19 22-11 38h-70l-8-40Z"
          }
          fill={`url(#metal-${side})`}
        />
        <path
          className="visor"
          d="M149 58h65v14h-65Z"
          fill={a ? "#e7f798" : "#ffc987"}
          strokeWidth="3"
        />
        <path d="M162 82h41" stroke="#b5bea2" strokeWidth="3" />
        <g className="back-arm">
          <path
            d="M111 110 72 99 44 126 52 163 92 169 116 145Z"
            fill={`url(#metal-${side})`}
          />
          <path d="m60 161 33 5-8 52-36-5Z" fill="#566047" />
          <path
            d="m48 205 44 4 7 43-29 19-35-20Z"
            fill={`url(#metal-${side})`}
          />
          <path d="m47 224 40 5" stroke="#bbc3a6" strokeWidth="3" />
        </g>
        <g className="fist-arm">
          <path
            d="m243 106 40-5 29 28-9 37-42 4-26-25Z"
            fill={`url(#metal-${side})`}
          />
          <path d="m267 166 34-3 17 36-28 26-24-28Z" fill="#566047" />
          <path
            d="m274 196 15-42 40-8 20 33-17 41-41 5Z"
            fill={`url(#metal-${side})`}
          />
          <path
            d="m292 170 36-8 M290 182l43-9 M291 196l38-9"
            stroke="#c8cfb5"
            strokeWidth="3"
          />
        </g>
        {[
          [126, 116],
          [233, 116],
          [145, 211],
          [218, 211],
          [76, 124],
          [281, 124],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="4"
            fill="#d2d5bd"
            strokeWidth="2"
          />
        ))}
      </g>
      <text
        x="179"
        y="205"
        textAnchor="middle"
        fill="#d8dec9"
        stroke="none"
        fontSize="13"
        fontFamily="monospace"
      >
        {a ? "RV–01" : "FG–02"}
      </text>
    </svg>
  );
}
