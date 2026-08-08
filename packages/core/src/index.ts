export { ArchLensOrchestrator, createArchLensOrchestrator } from './orchestrator/index.js';
export type { ArchLensOrchestratorOptions } from './orchestrator/index.js';
export type { ScanOptions, InitOptions, InitResult, LoadedConfig } from './types.js';
export { loadArchLensConfig } from './config/load-config.js';
export { scaffoldConfig } from './config/scaffold-config.js';
export { validateConfig, ConfigValidationError } from './config/validate-config.js';
export { initializeProject } from './init/init-service.js';
export type { InitializeProjectOptions } from './init/init-service.js';
export { scanWorkspaceFiles } from './fs/file-scanner.js';
export type { DependencyGraph, ImportReference } from './parser/ts-dependency-graph.js';
export { buildDependencyGraph, createDefaultResolver } from './parser/ts-dependency-graph.js';
export { buildArchitectureGraph } from './graph/architecture-graph.js';
export { buildProjectGraph } from './graph/project-graph.js';
export { createGraph } from './graph/create-graph.js';
export type { ArchitectureGraph, GraphNodeId, GraphEdge } from '@moth-tools/arch-lens-rules';
export type { ProjectDefinition } from './types.js';
export { loadPluginRules, resolvePluginUrl } from './plugins/load-plugins.js';
export { computeBaseline, applyBaseline, isBaselineData } from './baseline/baseline.js';
export type { BaselineData, AppliedBaseline } from './baseline/baseline.js';
export {
  loadOwnership,
  buildOwnership,
  parseCodeowners,
  codeownersToRegExp,
} from './ownership/codeowners.js';
export type { Ownership } from '@moth-tools/arch-lens-rules';
export { computeAffected } from './incremental/affected.js';
export { reportViolations } from './reporter/console-reporter.js';
export type { ArchLensConfig } from './types.js';
