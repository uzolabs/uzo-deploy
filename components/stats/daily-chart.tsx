"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { DayCount } from "@/lib/stats"

const H = 160
const PAD = { top: 12, right: 8, bottom: 24, left: 28 }
const FONT = 12
const GAP = 2

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })

/** A clean top for the y axis: the smallest of 1, 2, 5, 10, 20 and so on at or above the max. */
function niceMax(max: number) {
  if (max <= 1) return 1
  const step = 10 ** Math.floor(Math.log10(max))
  return [1, 2, 5, 10].map((m) => m * step).find((v) => v >= max) ?? 10 * step
}

type Props = {
  days: DayCount[]
  field: "deployments" | "tips"
  /** Shared across the charts of one network so their bars compare at a glance. */
  max: number
  title: string
  unit: [singular: string, plural: string]
}

/** One series of daily counts as columns, with a hover readout and the same numbers in a table. */
export function DailyChart({ days, field, max, title, unit }: Props) {
  const id = useId()
  const [hover, setHover] = useState<number>()
  // Drawn at its real pixel width so labels keep their size on a phone.
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(600)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setW(Math.max(200, Math.round(el.clientWidth)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const top = niceMax(max)
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const base = PAD.top + plotH
  const slot = plotW / days.length
  const barW = Math.min(24, slot - GAP)
  const y = (v: number) => base - (v / top) * plotH
  const total = days.reduce((n, d) => n + d[field], 0)
  const shown = hover !== undefined ? days[hover] : undefined
  const word = (n: number) => (n === 1 ? unit[0] : unit[1])

  return (
    <figure className="grid gap-2" aria-labelledby={`${id}-title`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span id={`${id}-title`} className="font-medium">
          {title}
        </span>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {shown
            ? `${dayLabel(shown.date)}: ${shown[field].toLocaleString("en-US")} ${word(shown[field])}`
            : `${total.toLocaleString("en-US")} ${word(total)} in 30 days`}
        </span>
      </figcaption>
      <div ref={box}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block max-w-full"
          role="img"
          aria-label={`${title}: ${total} in the last 30 days. Exact numbers are in the table below.`}
          onMouseLeave={() => setHover(undefined)}
        >
          {[0, top / 2, top].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--glass-border)" strokeWidth={1} />
              {Number.isInteger(v) ? (
                <text x={PAD.left - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={FONT} fill="var(--muted-foreground)">
                  {v}
                </text>
              ) : null}
            </g>
          ))}
          {days.map((d, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2
            const h = (d[field] / top) * plotH
            const r = Math.min(4, h, barW / 2)
            return (
              <g key={d.date}>
                {h > 0 ? (
                  // Rounded at the data end, square at the baseline.
                  <path
                    d={`M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barW - r} Q${x + barW},${base - h} ${x + barW},${base - h + r} V${base} Z`}
                    fill="var(--primary)"
                    opacity={hover === undefined || hover === i ? 1 : 0.45}
                  />
                ) : null}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH + PAD.bottom}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              </g>
            )
          })}
          <text x={PAD.left} y={H - 4} fontSize={FONT} fill="var(--muted-foreground)">
            {dayLabel(days[0].date)}
          </text>
          <text x={W - PAD.right} y={H - 4} fontSize={FONT} textAnchor="end" fill="var(--muted-foreground)">
            {dayLabel(days[days.length - 1].date)}
          </text>
        </svg>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Show as a table</summary>
        <table className="mt-2 w-full max-w-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-normal">Day (UTC)</th>
              <th className="py-1 text-right font-normal capitalize">{unit[1]}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {days.map((d) => (
              <tr key={d.date}>
                <td className="py-0.5">{dayLabel(d.date)}</td>
                <td className="py-0.5 text-right">{d[field]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
