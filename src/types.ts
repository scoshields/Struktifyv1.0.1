export type QuestionType = 'single-picklist' | 'multi-picklist' | 'integer' | 'date' | 'text';

export type DecisionOutcome = 'ACCEPT' | 'DECLINE' | 'REFER' | 'POSTPONE';

export type DecisionType = 'Support' | 'Requirement' | 'Exclusion' | 'Definitions';

export type ConditionLogic = 'AND' | 'OR';

export type Operator = '<' | '>' | '=' | '<=' | '>=';

export interface Condition {
  attributeName: string;
  expression: string;
}

export interface ConditionGroup {
  conditions: Condition[];
  logic: ConditionLogic;
}

export interface DecisionTypeCode {
  type: DecisionType;
  code: string;
}

export interface Decision {
  id: string;
  condition: string;
  outcome: DecisionOutcome;
  decisionTypes?: DecisionTypeCode[];
  additionalType?: 'FEP' | 'EM';
  amount?: string;
}

export interface Question {
  id: string;
  wording: string;
  type: QuestionType;
  attribute: string;
  conditionGroup?: ConditionGroup;
  options?: string[];
  required: boolean;
  decisions: Decision[];
}