#!/usr/bin/env node
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const [, , targetArg, countArg] = process.argv;
  const target = targetArg ? resolve(process.cwd(), targetArg) : resolve(__dirname, '../../tmp/fixtures');
  const featureCount = Number.parseInt(countArg ?? '500', 10);

  if (Number.isNaN(featureCount) || featureCount <= 0) {
    throw new Error('생성할 feature 개수는 양의 정수여야 합니다.');
  }

  return { target, featureCount };
}

async function resetWorkspace(root) {
  await rm(root, { recursive: true, force: true });
  await mkdir(join(root, 'src/shared'), { recursive: true });
  await mkdir(join(root, 'src/app'), { recursive: true });
}

function padFeature(index) {
  return String(index).padStart(5, '0');
}

async function writeFeature(root, index) {
  const id = padFeature(index);
  const dir = join(root, 'src/features', `Feature${id}`);
  await mkdir(dir, { recursive: true });

  const serviceName = `Feature${id}Service`;
  const servicePath = join(dir, `${serviceName}.ts`);
  const indexPath = join(dir, 'index.ts');

  const serviceContent = `export const ${serviceName} = () => 'feature-${id}';
`;
  const indexContent = `export * from './${serviceName}';
`;

  await writeFile(servicePath, serviceContent, 'utf8');
  await writeFile(indexPath, indexContent, 'utf8');
}

async function bootstrapShared(root) {
  const sharedPath = join(root, 'src/shared/currency.ts');
  const content = `export const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
}).format(value);
`;
  await writeFile(sharedPath, content, 'utf8');

  const appEntry = join(root, 'src/app/main.ts');
  const appContent = `import { formatCurrency } from '../shared/currency';

export function bootstrapApp() {
  return formatCurrency(1000);
}
`;
  await writeFile(appEntry, appContent, 'utf8');
}

async function main() {
  const { target, featureCount } = parseArgs();
  await resetWorkspace(target);

  const tasks = [];
  for (let i = 0; i < featureCount; i += 1) {
    tasks.push(writeFeature(target, i));
  }

  // 순차 실행로 바꾸려면 Promise.all 대신 for-await 사용
  await Promise.all(tasks);
  await bootstrapShared(target);

  const totalFiles = featureCount * 2 + 2; // feature index/service + shared + app entry
  console.log(`[Arch-Lens] Synthetic 워크스페이스 생성 완료: ${target}`);
  console.log(`[Arch-Lens] Feature ${featureCount}개, 총 파일 ${totalFiles}개 작성`);
}

main().catch((error) => {
  console.error('[Arch-Lens] Synthetic 워크스페이스 생성 실패:', error);
  process.exitCode = 1;
});
