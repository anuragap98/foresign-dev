import type { Person, Project, Task } from '@/data/types'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/data/types'

/** Quotes a cell when needed and defuses spreadsheet formulas (=, +, -, @). */
function cell(value: string | number | undefined) {
  let s = value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function tasksCsv(tasks: Task[], projects: Project[], people: Record<string, Person>) {
  const header = ['Title', 'Project', 'Assignee', 'Status', 'Priority', 'Due', 'Estimate (h)', 'Subtasks done', 'Created', 'Completed']
  const rows = tasks.map((t) => [
    t.title,
    projects.find((p) => p.id === t.projectId)?.name ?? t.projectId,
    people[t.assignee]?.name ?? t.assignee,
    STATUS_LABEL[t.status],
    PRIORITY_LABEL[t.priority],
    t.due,
    t.estH,
    t.subtasks.length ? `${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length}` : '',
    t.createdAt.slice(0, 10),
    t.doneAt?.slice(0, 10),
  ])
  return toCsv([header, ...rows])
}

export const toCsv = (rows: (string | number | undefined)[][]) => rows.map((r) => r.map(cell).join(',')).join('\r\n')

/** Hands the browser a text file to save. */
export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  // The BOM makes Excel read the file as UTF-8 (names like "Inés").
  const url = URL.createObjectURL(new Blob(['﻿', text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
