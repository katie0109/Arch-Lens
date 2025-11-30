import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRule } from '../createRule.js';
import { definePlugin } from '../definePlugin.js';
const DEFAULT_ALIAS = '@shared/';
function normalizeAlias(rawAlias) {
    return rawAlias.endsWith('/') ? rawAlias : `${rawAlias}/`;
}
function computeLocation(source, index) {
    const prefix = source.slice(0, index);
    const line = prefix.split(/\r?\n/).length;
    const lastNewline = prefix.lastIndexOf('\n');
    const column = index - lastNewline;
    return { line, column };
}
function isSupportedFile(file) {
    return /(\.[cm]?[jt]s|\.[jt]sx)$/.test(file);
}
const importPattern = /from\s+(?<quote>['"])(?<path>[^'"\n]+)\1/g;
function analyzeFile(source, file, alias) {
    const replacements = [];
    let firstMatchIndex = null;
    let match;
    while ((match = importPattern.exec(source))) {
        const importPath = match.groups?.path ?? '';
        const quote = match.groups?.quote ?? "'";
        if (!importPath.includes('shared')) {
            continue;
        }
        if (importPath.startsWith(alias)) {
            continue;
        }
        const sharedIndex = importPath.indexOf('shared');
        if (sharedIndex === -1) {
            continue;
        }
        const suffix = importPath.slice(sharedIndex + 'shared'.length).replace(/^\//, '');
        const replacementPath = `${alias}${suffix}`;
        replacements.push({
            original: importPath,
            replacement: replacementPath,
            quote,
        });
        if (firstMatchIndex === null) {
            firstMatchIndex = match.index;
        }
    }
    if (replacements.length === 0) {
        return null;
    }
    const { line, column } = computeLocation(source, firstMatchIndex ?? 0);
    const violation = {
        ruleId: 'lint/enforce-shared-imports',
        message: `shared 모듈 참조 시 ${alias} alias를 사용해야 합니다.`,
        file,
        line,
        column,
        fixable: true,
        suggestedFix: `import 경로를 ${alias} 기준으로 변경하세요.`,
        data: { replacements },
    };
    return { violation, replacements };
}
function createEnforceSharedImportsRule(options = {}) {
    const alias = normalizeAlias(options.alias ?? DEFAULT_ALIAS);
    async function scanProject(context) {
        const findings = [];
        for (const file of context.files) {
            if (!isSupportedFile(file)) {
                continue;
            }
            const absolutePath = join(context.root, file);
            let source;
            try {
                source = await readFile(absolutePath, 'utf8');
            }
            catch {
                continue;
            }
            const issue = analyzeFile(source, file, alias);
            if (!issue) {
                continue;
            }
            findings.push({ issue, absolutePath, source });
        }
        return findings;
    }
    return createRule({
        id: 'lint/enforce-shared-imports',
        meta: {
            description: 'shared 디렉터리 접근 시 상대 경로 대신 지정된 alias 사용을 강제합니다.',
            severity: 'error',
            type: 'dependency',
            docsUrl: 'https://arch-lens.dev/docs/plugins/enforce-shared-imports',
        },
        async check(context) {
            const findings = await scanProject(context);
            return findings.map(({ issue }) => issue.violation);
        },
        async fix(context) {
            const findings = await scanProject(context);
            for (const { issue, absolutePath, source } of findings) {
                let updated = source;
                for (const { original, replacement, quote } of issue.replacements) {
                    const search = `${quote}${original}${quote}`;
                    const target = `${quote}${replacement}${quote}`;
                    if (updated.includes(search)) {
                        updated = updated.replaceAll(search, target);
                    }
                }
                if (updated !== source) {
                    await writeFile(absolutePath, updated, 'utf8');
                    if (context.verbose) {
                        console.log(`[arch-lens] Replaced shared import in ${issue.violation.file} -> ${alias}*`);
                    }
                    context.report?.(issue.violation);
                }
            }
        },
    });
}
const enforceSharedImportsRule = createEnforceSharedImportsRule();
const enforceSharedImportsPlugin = definePlugin({
    meta: {
        name: 'arch-lens-plugin-enforce-shared-imports',
        version: '0.1.0',
        description: 'Relative shared import를 alias 기반으로 교체하는 샘플 플러그인',
    },
    rules: [enforceSharedImportsRule],
});
export default enforceSharedImportsPlugin;
export { enforceSharedImportsPlugin, enforceSharedImportsRule, createEnforceSharedImportsRule, };
//# sourceMappingURL=enforce-shared-imports.js.map