import { describe, expect, it } from 'vitest';

import {
  buildOwnership,
  codeownersToRegExp,
  parseCodeowners,
} from '../src/ownership/codeowners.js';

describe('codeownersToRegExp', () => {
  it('matches an unanchored extension pattern at any depth', () => {
    const re = codeownersToRegExp('*.ts');
    expect(re.test('a.ts')).toBe(true);
    expect(re.test('src/nested/a.ts')).toBe(true);
    expect(re.test('a.js')).toBe(false);
  });

  it('anchors a leading-slash pattern to the root', () => {
    const re = codeownersToRegExp('/src/app.ts');
    expect(re.test('src/app.ts')).toBe(true);
    expect(re.test('lib/src/app.ts')).toBe(false);
  });

  it('treats a trailing slash as a directory prefix', () => {
    const re = codeownersToRegExp('src/legacy/');
    expect(re.test('src/legacy/db.ts')).toBe(true);
    expect(re.test('src/legacyish/db.ts')).toBe(false);
  });
});

describe('parseCodeowners + buildOwnership', () => {
  const ownership = buildOwnership(
    parseCodeowners(
      `# owners
* @team-default

*.ts        @team-ts
/src/legacy/ @team-legacy @alice
`,
    ),
  );

  it('parses entries ignoring comments and blanks', () => {
    expect(ownership.entries().map((e) => e.pattern)).toEqual([
      '*',
      '*.ts',
      '/src/legacy/',
    ]);
  });

  it('applies last-matching-wins semantics', () => {
    // both `*` and `*.ts` match, last one wins
    expect(ownership.ownersOf('src/app/x.ts')).toEqual(['@team-ts']);
    // `/src/legacy/` is last and wins over `*` and `*.ts`
    expect(ownership.ownersOf('src/legacy/db.ts')).toEqual(['@team-legacy', '@alice']);
    // only `*` matches
    expect(ownership.ownersOf('README.md')).toEqual(['@team-default']);
  });

  it('answers hasOwner', () => {
    expect(ownership.hasOwner('src/legacy/db.ts', '@alice')).toBe(true);
    expect(ownership.hasOwner('src/legacy/db.ts', '@team-ts')).toBe(false);
  });

  it('returns an empty Ownership for no rules', () => {
    const empty = buildOwnership([]);
    expect(empty.ownersOf('anything.ts')).toEqual([]);
  });
});
