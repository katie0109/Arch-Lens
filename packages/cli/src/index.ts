#!/usr/bin/env node
import { cac } from 'cac';

import { registerInitCommand } from './commands/init.js';
import { registerScanCommand } from './commands/scan.js';
import { getPackageInfo } from './utils/package-info.js';

const cli = cac('arch-lens');

registerScanCommand(cli);
registerInitCommand(cli);

const packageInfo = getPackageInfo();
const banner = `\nArch-Lens v${packageInfo.version ?? '0.0.0'}\nConventions should be enforced by tools, not by humans.\n`;

cli.help((sections) => {
  sections.unshift({ title: '', body: banner });
});
cli.version(packageInfo.version ?? '0.0.0');

if (process.argv.length <= 2) {
  // eslint-disable-next-line no-console
  console.log(banner.trimEnd());
  cli.outputHelp();
} else {
  cli.parse();
}
