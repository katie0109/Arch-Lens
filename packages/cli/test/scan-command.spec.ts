// @ts-nocheck

import { afterEach, describe, expect, it, vi } from 'vitest';
import cac from 'cac';

const { scanMock, createOrchestratorMock } = vi.hoisted(() => {
  const scanMock = vi.fn(async () => ({ violations: [], files: [], durationMs: 0 }));
  const createOrchestratorMock = vi.fn(async () => ({
    scan: (args) => scanMock(args),
  }));
  return { scanMock, createOrchestratorMock };
});

vi.mock('@arch-lens/core', () => ({
  createArchLensOrchestrator: createOrchestratorMock,
}));

vi.mock('../src/utils/rule-loader.js', () => ({
  gatherRules: vi.fn(async () => []),
}));

import { registerScanCommand, normalizeReportMode } from '../src/commands/scan.js';

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

    // 옵션 정규화가 기대대로 동작하는지 확인
    expect(normalizeReportMode('list')).toBe('list');
  });
});
