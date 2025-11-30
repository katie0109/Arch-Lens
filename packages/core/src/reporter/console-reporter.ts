import type { RuleViolation } from '@arch-lens/rules';

export type ReportFormat = 'table' | 'json' | 'list' | 'html' | 'markdown';

export interface ReportSettings {
  format?: ReportFormat;
  pretty?: boolean;
}

function toSerializableViolation(violation: RuleViolation) {
  return {
    ruleId: violation.ruleId,
    message: violation.message,
    file: violation.file ?? null,
    line: violation.line ?? null,
    column: violation.column ?? null,
    fixable: Boolean(violation.fixable),
    suggestedFix: violation.suggestedFix ?? null,
  };
}

export function reportViolations(
  violations: RuleViolation[],
  settings: ReportSettings = {},
): void {
  const format = settings.format ?? 'table';

  if (format === 'json') {
    const payload = {
      count: violations.length,
      violations: violations.map(toSerializableViolation),
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload, null, settings.pretty ? 2 : undefined));
    return;
  }

  if (violations.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[Arch-Lens] ✅ No violations detected.');
    return;
  }

  if (format === 'markdown') {
    // eslint-disable-next-line no-console
    console.log('| Rule | Location | Message | Fixable | Suggested Fix |');
    // eslint-disable-next-line no-console
    console.log('| --- | --- | --- | --- | --- |');

    for (const violation of violations) {
      const locationParts: string[] = [];

      if (violation.file) {
        locationParts.push(violation.file);
      }
      if (typeof violation.line === 'number') {
        locationParts.push(`line ${violation.line}`);
      }
      if (typeof violation.column === 'number') {
        locationParts.push(`col ${violation.column}`);
      }

      const location = locationParts.join(' · ') || 'n/a';
      const fixable = violation.fixable ? 'yes' : 'no';
      const fix = violation.suggestedFix ? violation.suggestedFix.replace(/\n/g, ' ') : '-';
      const message = violation.message.replace(/\n/g, ' ');

      // eslint-disable-next-line no-console
      console.log(`| ${violation.ruleId} | ${location} | ${message} | ${fixable} | ${fix} |`);
    }
    return;
  }

  if (format === 'html') {
    const rows = violations
      .map((violation) => {
        const location = [
          violation.file ?? 'n/a',
          typeof violation.line === 'number' ? `:${violation.line}` : '',
          typeof violation.column === 'number' ? `:${violation.column}` : '',
        ]
          .join('')
          .replace(/:+$/, '');

        return `    <tr>
      <td>${violation.ruleId}</td>
      <td>${location || 'n/a'}</td>
      <td>${violation.message.replace(/\n/g, '<br />')}</td>
      <td>${violation.fixable ? 'yes' : 'no'}</td>
      <td>${(violation.suggestedFix ?? '-').replace(/\n/g, '<br />')}</td>
    </tr>`;
      })
      .join('\n');

    const html = `<table>
  <thead>
    <tr>
      <th>Rule</th>
      <th>Location</th>
      <th>Message</th>
      <th>Fixable</th>
      <th>Suggested Fix</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>`;

    // eslint-disable-next-line no-console
    console.log(html);
    return;
  }

  if (format === 'table' && typeof console.table === 'function') {
    // eslint-disable-next-line no-console
    console.log('[Arch-Lens] ❌ Detected architecture violations:');
    // eslint-disable-next-line no-console
    console.table(
      violations.map((violation) => ({
        rule: violation.ruleId,
        file: violation.file ?? 'n/a',
        message: violation.message,
        line: violation.line ?? '-',
        column: violation.column ?? '-',
        fixable: violation.fixable ? 'yes' : 'no',
        suggestedFix: violation.suggestedFix ?? '-',
      })),
    );
    return;
  }

  for (const violation of violations) {
    const locationParts: string[] = [];

    if (violation.file) {
      locationParts.push(violation.file);
    }

    if (typeof violation.line === 'number') {
      locationParts.push(`line ${violation.line}`);
    }

    if (typeof violation.column === 'number') {
      locationParts.push(`column ${violation.column}`);
    }

    const location = locationParts.length > 0 ? ` (${locationParts.join(': ')})` : '';
    // eslint-disable-next-line no-console
    console.log(`[Arch-Lens] ❌ [${violation.ruleId}] ${violation.message}${location}`);

    if (violation.suggestedFix) {
      // eslint-disable-next-line no-console
      console.log(`    ↳ Suggested fix: ${violation.suggestedFix}`);
    }
  }
}
