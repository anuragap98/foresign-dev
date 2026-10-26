import type { ReactNode } from 'react'
import { Glass } from '@/components/glass/Glass'
import { CountUp } from '@/components/ui/count-up'
import { cn } from '@/lib/utils'

/** Green when the change is good news, red when it isn't. */
export function Delta({ value, unit, goodWhenUp = true, suffix }: { value: number; unit: string; goodWhenUp?: boolean; suffix?: string }) {
  if (!value) return <span className="text-[12px] font-semibold text-ink-3">No change{suffix && ` ${suffix}`}</span>
  const good = value > 0 === goodWhenUp
  return (
    <span className={cn('text-[12px] font-semibold', good ? 'text-[var(--delta-up)]' : 'text-[var(--delta-down)]')}>
      {value > 0 ? '+' : '−'}
      {Math.abs(value)}
      {unit}
      {suffix && <span className="font-normal text-ink-3"> {suffix}</span>}
    </span>
  )
}

export function Kpi({ label, value, unit, format, delta }: { label: string; value: number; unit?: string; format?: (n: number) => string; delta: ReactNode }) {
  return (
    <Glass data-enter className="rounded-panel px-5 py-4">
      <p className="text-[13px] font-medium text-ink-2">{label}</p>
      <p className="display tabular mt-1 text-[30px] leading-none font-bold">
        <CountUp value={value} format={format} />
        {unit && <span className="ml-1 text-[16px] font-semibold text-ink-3">{unit}</span>}
      </p>
      <p className="mt-2">{delta}</p>
    </Glass>
  )
}
