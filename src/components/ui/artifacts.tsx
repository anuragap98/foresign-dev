import { ExternalLink, FileText, GitBranch, GitCommitHorizontal, GitPullRequest, Rocket, TestTube, type LucideIcon } from 'lucide-react'
import type { Artifact, ArtifactKind } from '@/data/types'

const ARTIFACT_ICON: Record<ArtifactKind, LucideIcon> = {
  branch: GitBranch,
  commit: GitCommitHorizontal,
  pull_request: GitPullRequest,
  test_report: TestTube,
  deploy: Rocket,
  doc: FileText,
}

/** What agents produced: branches, commits, PRs, reports. Links open in a new tab. */
export function ArtifactList({ artifacts }: { artifacts: Artifact[] }) {
  return (
    <ul className="flex flex-col">
      {artifacts.map((a) => {
        const Icon = ARTIFACT_ICON[a.kind]
        const body = (
          <>
            <Icon className="size-4 shrink-0 text-ink-2" />
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{a.title}</span>
            {a.status && <span className="shrink-0 rounded-full bg-fill-2 px-2 py-px text-[12px] text-ink-2">{a.status}</span>}
            {a.url && <ExternalLink className="size-3.5 shrink-0 text-ink-3" />}
          </>
        )
        return (
          <li key={a.id} className="border-t border-sep first:border-t-0">
            {a.url ? (
              <a href={a.url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2.5 rounded-[12px] px-1 py-2 hover:bg-fill-hover">
                {body}
              </a>
            ) : (
              <div className="flex items-center gap-2.5 px-1 py-2">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
