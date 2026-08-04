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
  return `/**\n * Arch-Lens가 생성한 기본 설정입니다.\n * 규칙은 'off' | 'warn' | 'error' 또는 [severity, options] 형태로 조정하세요.\n * root를 생략하면 이 설정 파일이 위치한 디렉터리가 기준이 됩니다.\n */\nimport type { ArchLensConfig } from 'arch-lens';\n\nconst config: ArchLensConfig = {\n  include: ${formatArray(include)},\n  exclude: ${formatArray(exclude)},\n  // plugins: ['@your-scope/arch-lens-rules'],\n  rules: {\n    'structure/required-feature-index': 'warn',\n    'structure/required-files': 'error',\n    'structure/filename-case': 'warn',\n    'structure/no-loose-files': 'warn',\n    'dependency/no-cross-feature-import': 'error',\n    'dependency/no-cross-layer': 'error',\n    'dependency/no-circular': 'error',\n    'dependency/allow-list': 'off',\n  },\n};\n\nexport default config;\n`;
}
