export interface DefaultTemplateOptions {
  include?: string[];
  exclude?: string[];
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "\\'");
}

function formatArray(values: string[]): string {
  if (values.length === 0) {
    return '[]';
  }

  if (values.length === 1) {
    const [value] = values;

    if (value === undefined) {
      return '[]';
    }

    return `['${escapeSingleQuotes(value)}']`;
  }

  const indented = values.map((value) => `  '${escapeSingleQuotes(value)}'`).join(',\n');
  return `[\n${indented}\n]`;
}

export function renderDefaultConfigTemplate({
  include = [],
  exclude = [],
}: DefaultTemplateOptions): string {
  return `/**\n * Arch-Lens가 생성한 기본 설정입니다.\n * 대상·규칙·심각도를 팀 정책에 맞게 조정하세요.\n */\nimport type { ArchLensConfig } from '@arch-lens/core';\nimport { loadBuiltInRules } from '@arch-lens/rules';\n\nconst config: ArchLensConfig = {\n  root: process.cwd(),\n  include: ${formatArray(include)},\n  exclude: ${formatArray(exclude)},\n  rules: loadBuiltInRules(),\n};\n\nexport default config;\n`;
}
