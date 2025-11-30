import type { ArchLensConfig } from '@arch-lens/core';
import { loadBuiltInRules } from '@arch-lens/rules';

const config: ArchLensConfig = {
  root: __dirname,
  // 빌트인 규칙은 비활성화하고 플러그인만 사용
  rules: loadBuiltInRules({ include: [] }),
};

export default config;
