import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { GraphNodeId, Ownership } from '@arch-lens/rules';

interface OwnershipRule {
  pattern: string;
  owners: string[];
  regexp: RegExp;
}

const CODEOWNERS_LOCATIONS = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'];

/**
 * Converts a CODEOWNERS/gitignore-style pattern into a RegExp matched against root-relative
 * POSIX paths. Supports `*` (within a segment), `**` (across segments), `?`, a leading `/`
 * anchor, and a trailing `/` directory marker. A pattern matches the entry and anything nested
 * beneath it.
 */
export function codeownersToRegExp(pattern: string): RegExp {
  let body = pattern.trim();
  const anchored = body.startsWith('/');
  body = body.replace(/^\/+/, '').replace(/\/+$/, '');

  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char === '*') {
      if (body[i + 1] === '*') {
        out += '.*';
        i += 1;
        if (body[i + 1] === '/') {
          i += 1;
        }
      } else {
        out += '[^/]*';
      }
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += (char as string).replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }

  const prefix = anchored ? '^' : '(?:^|/)';
  // Match the entry itself and anything nested beneath it (directory semantics).
  return new RegExp(`${prefix}${out}(?:/.*)?$`);
}

/** Parses CODEOWNERS content into ordered ownership rules (comments/blank lines ignored). */
export function parseCodeowners(content: string): OwnershipRule[] {
  const rules: OwnershipRule[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (line.length === 0) {
      continue;
    }

    const [pattern, ...owners] = line.split(/\s+/);
    if (!pattern) {
      continue;
    }

    rules.push({ pattern, owners, regexp: codeownersToRegExp(pattern) });
  }

  return rules;
}

export function buildOwnership(rules: OwnershipRule[]): Ownership {
  const normalize = (path: GraphNodeId): string => path.replace(/\\/g, '/');

  const ownersOf = (path: GraphNodeId): string[] => {
    const target = normalize(path);
    // Last matching rule wins (GitHub CODEOWNERS semantics).
    for (let i = rules.length - 1; i >= 0; i -= 1) {
      if (rules[i]!.regexp.test(target)) {
        return [...rules[i]!.owners];
      }
    }
    return [];
  };

  return {
    ownersOf,
    hasOwner: (path, owner) => ownersOf(path).includes(owner),
    entries: () => rules.map((rule) => ({ pattern: rule.pattern, owners: [...rule.owners] })),
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Loads and parses the first CODEOWNERS file found under `root`, or an empty Ownership. */
export async function loadOwnership(root: string): Promise<Ownership> {
  for (const location of CODEOWNERS_LOCATIONS) {
    const path = resolve(root, location);
    if (await exists(path)) {
      return buildOwnership(parseCodeowners(await readFile(path, 'utf8')));
    }
  }

  return buildOwnership([]);
}
