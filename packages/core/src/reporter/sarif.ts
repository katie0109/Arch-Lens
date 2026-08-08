import type { RuleViolation } from '@moth-tools/arch-lens-rules';

/** Minimal SARIF 2.1.0 shape we emit (enough for GitHub Code Scanning ingestion). */
interface SarifLog {
  $schema: string;
  version: '2.1.0';
  runs: Array<{
    tool: {
      driver: {
        name: string;
        informationUri?: string;
        rules: Array<{ id: string; name?: string }>;
      };
    };
    results: Array<{
      ruleId: string;
      level: 'error' | 'warning' | 'note';
      message: { text: string };
      locations?: Array<{
        physicalLocation: {
          artifactLocation: { uri: string };
          region?: { startLine: number; startColumn?: number };
        };
      }>;
    }>;
  }>;
}

function toLevel(severity: RuleViolation['severity']): 'error' | 'warning' {
  return severity === 'warning' ? 'warning' : 'error';
}

/** Builds a SARIF 2.1.0 log from Arch-Lens violations. */
export function buildSarif(violations: RuleViolation[]): SarifLog {
  const ruleIds = [...new Set(violations.map((v) => v.ruleId))].sort();

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Arch-Lens',
            informationUri: 'https://github.com/katie0109/Arch-Lens',
            rules: ruleIds.map((id) => ({ id, name: id })),
          },
        },
        results: violations.map((violation) => ({
          ruleId: violation.ruleId,
          level: toLevel(violation.severity),
          message: { text: violation.message },
          locations: violation.file
            ? [
                {
                  physicalLocation: {
                    artifactLocation: { uri: violation.file.replace(/\\/g, '/') },
                    ...(typeof violation.line === 'number'
                      ? {
                          region: {
                            startLine: violation.line,
                            ...(typeof violation.column === 'number'
                              ? { startColumn: violation.column }
                              : {}),
                          },
                        }
                      : {}),
                  },
                },
              ]
            : undefined,
        })),
      },
    ],
  };
}
