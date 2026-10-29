<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { groupByProblem, sharedSubjects, type Problem, type ProblemGroup } from '#lib/kb/problems';

  type Link = { href: string; label: string };
  let { ticket, tickets = {} }: { ticket: number; tickets?: Partial<Record<Problem, Link>> } = $props();

  const rows = $derived((reports as Report[]).filter((r) => r.mergedInto === ticket));
  const merged = $derived(uniqueById(rows));
  const groups = $derived(groupByProblem(merged));
  const subjects = $derived(sharedSubjects(groups));
  const channels = (g: ProblemGroup) =>
    Object.entries(g.channels)
      .sort((a, b) => b[1] - a[1])
      .map(([channel, n]) => `${channel} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports in #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>came in by</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      {@const link = tickets[g.problem]}
      <tr>
        <td><code>{g.problem}</code></td>
        <td>{g.reports.length}</td>
        <td class="tags">{channels(g)}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if link}<a href={link.href}>{link.label}</a>{:else}<span class="none">no ticket</span>{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p class="note">
  The export lists {rows.length} rows for #{ticket}; {rows.length - merged.length} repeat a report already counted.
  {subjects.shared} of {subjects.total} subject lines came in under more than one problem.
</p>

<style>
  .sum { font-size: 1.1rem; }
  .tags { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
  .none { color: var(--warn); font-weight: 600; }
</style>
