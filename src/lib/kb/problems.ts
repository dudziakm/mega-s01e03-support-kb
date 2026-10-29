// Which problem a report is about. causes.ts places a report by its tenant; a report the desk read
// as a one-day move (desk-notes.json) is a different bug, whatever its tenant.
import notes from '#lib/data/desk-notes.json';
import { causeOf, type Cause, type Report } from '#lib/kb/causes';
import { tenantOf } from '#lib/kb/locales';

export type Problem = Cause | 'one-day move' | 'unplaced';

export function problemOf(r: Report): Problem {
  if (notes.oneDayMove.includes(r.id)) return 'one-day move';
  return causeOf(r, tenantOf(r)) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // How these reports came in: channel → count.
  channels: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
};

export function groupByProblem(reports: Report[]): ProblemGroup[] {
  const byProblem = new Map<Problem, Report[]>();
  for (const r of reports) {
    const p = problemOf(r);
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}

// Decision 0001's key: the subject, lowercased, punctuation stripped.
export function subjectKey(subject: string): string {
  return subject.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
}

// Subject lines that came in under more than one problem: matching on them merges those problems.
export function sharedSubjects(groups: ProblemGroup[]): { shared: number; total: number } {
  const problemsOf = new Map<string, Set<Problem>>();
  for (const g of groups) {
    for (const r of g.reports) {
      const key = subjectKey(r.subject);
      problemsOf.set(key, (problemsOf.get(key) ?? new Set()).add(g.problem));
    }
  }
  return { shared: [...problemsOf.values()].filter((ps) => ps.size > 1).length, total: problemsOf.size };
}
