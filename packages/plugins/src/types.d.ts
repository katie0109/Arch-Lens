export type PluginRuleSeverity = 'error' | 'warning';
export type PluginRuleType = 'structure' | 'dependency';
export interface PluginRuleMeta {
    description: string;
    type: PluginRuleType;
    severity: PluginRuleSeverity;
    docsUrl?: string;
}
export interface PluginRuleContext {
    /** 플러그인에 전달된 프로젝트 루트 경로. */
    root: string;
    /** include/exclude가 적용된 스캔 대상 파일 목록. */
    files: string[];
    /** 이번 실행이 --fix로 호출되었는지 여부. */
    fix: boolean;
    /** CLI에서 상세 로그를 활성화했는지 여부. */
    verbose: boolean;
    /** 코어에서 전달된 의존성 그래프(선택 사항). */
    dependencyGraph?: unknown;
    /** fix 단계에서 구조화된 리포트를 출력할 때 사용하는 헬퍼. */
    report?: (violation: PluginRuleViolation) => void;
}
export interface PluginRuleViolation {
    ruleId: string;
    message: string;
    file?: string;
    line?: number;
    column?: number;
    fixable?: boolean;
    suggestedFix?: string;
    /** 추가 후처리에 활용할 임의의 메타데이터. */
    data?: Record<string, unknown>;
}
export interface PluginRule {
    id: string;
    meta: PluginRuleMeta;
    check(context: PluginRuleContext): Promise<PluginRuleViolation[]> | PluginRuleViolation[];
    fix?(context: PluginRuleContext): Promise<void> | void;
}
export type RuleCreator<Rule extends PluginRule = PluginRule> = (rule: Rule) => Rule;
export interface PluginMeta {
    name: string;
    version: string;
    description?: string;
    homepage?: string;
}
export interface PluginModule<Rule extends PluginRule = PluginRule> {
    meta: PluginMeta;
    rules: Rule[];
}
//# sourceMappingURL=types.d.ts.map