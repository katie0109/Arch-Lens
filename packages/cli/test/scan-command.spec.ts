// @ts-nocheck

import { afterEach, describe, expect, it, vi } from 'vitest';
import cac from 'cac';

const scanMock = vi.fn(async () => []);
const createOrchestratorMock = vi.fn(async () => ({ scan: scanMock }));

vi.mock('@arch-lens/core', () => ({
  createArchLensOrchestrator: createOrchestratorMock,
}));

import { registerScanCommand } from '../src/commands/scan.js';

describe('scan command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    scanMock.mockClear();
    createOrchestratorMock.mockClear();
  });

  it('accepts list reporter mode from CLI', async () => {
    const cli = cac('arch-lens');

    registerScanCommand(cli);

    // 테스트 중 도움말 출력 억제
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});

    await cli.parse(['node', 'test', 'scan', '--report', 'list']);

    expect(scanMock).toHaveBeenCalledTimes(1);
    expect(scanMock.mock.calls[0][0]?.reportFormat).toBe('list');
  });
});
