import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ArchLensRule, RuleContext, RuleViolation } from '../../index.js';

const FEATURE_ROOT = 'src/features';
const REQUIRED_ENTRY = 'index.ts';

function toPosix(value: string): string {
  return value.split(path.sep).join(path.posix.sep);
}

function getFeatureRoot(filePath: string): string | null {
  const normalized = toPosix(filePath);
  const segments = normalized.split(path.posix.sep);
  const featureIndex = segments.indexOf('features');

  if (featureIndex === -1) {
    return null;
  }

  const featureName = segments[featureIndex + 1];

  if (!featureName) {
    return null;
  }

  return path.posix.join(FEATURE_ROOT, featureName);
}

function collectFeatureDirectories(files: string[]): Set<string> {
  const featureDirectories = new Set<string>();

  for (const file of files) {
    const featureDir = getFeatureRoot(file);

    if (featureDir) {
      featureDirectories.add(featureDir);
    }
  }

  return featureDirectories;
}

function findMissingEntries(files: string[]): RuleViolation[] {
  const featureDirectories = collectFeatureDirectories(files);
  const missing: RuleViolation[] = [];

  for (const featureDir of featureDirectories) {
    const entryFile = path.posix.join(featureDir, REQUIRED_ENTRY);

    if (files.includes(entryFile)) {
      continue;
    }

    missing.push({
      ruleId: 'structure/required-feature-index',
      message: `Missing "${REQUIRED_ENTRY}" in ${featureDir}.`,
      file: entryFile,
      fixable: true,
      suggestedFix: `Create ${entryFile} to define the public entry point for this feature (run arch-lens scan --fix to scaffold).`,
    });
  }

  return missing;
}

async function scaffoldEntryFile(root: string, featureDir: string): Promise<void> {
  const filePath = path.join(root, featureDir, REQUIRED_ENTRY);
  const banner = '/**\n * Arch-Lens가 자동 생성한 파일입니다.\n * 이 기능의 공개 API를 정의하세요.\n */\n';
  const content = `${banner}export {};// TODO: 이 기능의 모듈을 export 하세요\n`;

  await writeFile(filePath, content, { encoding: 'utf8', flag: 'wx' });
}

async function applyFixes(context: RuleContext, violations: RuleViolation[]): Promise<void> {
  for (const violation of violations) {
    if (!violation.file) {
      continue;
    }

    const featureDir = getFeatureRoot(violation.file);

    if (!featureDir) {
      continue;
    }

    try {
      await scaffoldEntryFile(context.root, featureDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        continue;
      }

      throw error;
    }
  }
}

export const requiredFeatureIndexRule: ArchLensRule = {
  id: 'structure/required-feature-index',
  meta: {
    description: 'Ensure each feature exposes an index.ts entry point.',
    severity: 'warning',
    type: 'structure',
  },
  async check(context: RuleContext) {
    return findMissingEntries(context.files);
  },
  async fix(context: RuleContext) {
    const violations = findMissingEntries(context.files);

    if (!violations.length) {
      return;
    }

    await applyFixes(context, violations);

    context.report?.(
      violations.map((violation) => ({
        ...violation,
        message: `Created ${violation.file}`,
      })),
    );
  },
};
