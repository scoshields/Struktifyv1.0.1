import React, { useState, useEffect } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { Question, Decision, DecisionOutcome, DecisionType, DecisionTypeCode } from '../types';

const DECISION_OUTCOMES: DecisionOutcome[] = ['ACCEPT', 'DECLINE', 'REFER', 'POSTPONE'];
const TIME_UNITS = ['DAYS', 'MONTHS', 'YEARS'];
const INTEGER_OPERATORS = ['<', '>', '=', '<=', '>='];
const DECISION_TYPES: DecisionType[] = ['Support', 'Requirement', 'Exclusion', 'Definitions'];
const ADDITIONAL_TYPES = ['FEP', 'EM'] as const;

type AdditionalType = typeof ADDITIONAL_TYPES[number];

interface DecisionTypeState {
  type: DecisionType;
  selected: boolean;
  code: string;
}

interface DecisionMappingProps {
  question: Question;
  onUpdate: (decisions: Decision[]) => void;
}

export default function DecisionMapping({ question, onUpdate }: DecisionMappingProps) {
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [newCondition, setNewCondition] = useState('');
  const [newOutcome, setNewOutcome] = useState<DecisionOutcome>('ACCEPT');
  const [dateOperator, setDateOperator] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [dateUnit, setDateUnit] = useState('DAYS');
  const [decisionTypes, setDecisionTypes] = useState<DecisionTypeState[]>(
    DECISION_TYPES.map(type => ({ type, selected: false, code: '' }))
  );
  const [additionalType, setAdditionalType] = useState<AdditionalType | ''>('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    resetForm();
  }, [question.id]);

  const resetForm = () => {
    setEditingDecisionId(null);
    setNewCondition('');
    setNewOutcome('ACCEPT');
    setDateOperator('');
    setDateValue('');
    setDateUnit('DAYS');
    setDecisionTypes(DECISION_TYPES.map(type => ({ type, selected: false, code: '' })));
    setAdditionalType('');
    setAmount('');
  };

  const getDecisionColor = (outcome: DecisionOutcome) => {
    switch (outcome) {
      case 'ACCEPT': return 'text-green-600';
      case 'DECLINE': return 'text-red-600';
      case 'REFER': return 'text-yellow-600';
      case 'POSTPONE': return 'text-purple-600';
      default: return '';
    }
  };

  const parseDecision = (condition: string) => {
    const match = condition.match(/\((.*?)\)/);
    if (!match) return { decisionTypes: [], additionalInfo: {} };

    const parts = match[1].split(',');
    const result: { 
      decisionTypes: DecisionTypeCode[];
      additionalInfo: { additionalType?: AdditionalType; amount?: string };
    } = {
      decisionTypes: [],
      additionalInfo: {}
    };

    parts.forEach(part => {
      const [key, value] = part.split('=');
      if (DECISION_TYPES.includes(key as DecisionType)) {
        result.decisionTypes.push({ type: key as DecisionType, code: value });
      } else if (ADDITIONAL_TYPES.includes(key as AdditionalType)) {
        result.additionalInfo.additionalType = key as AdditionalType;
        result.additionalInfo.amount = value;
      }
    });

    return result;
  };

  const formatDecisionString = () => {
    const selectedTypes = decisionTypes.filter(dt => dt.selected && dt.code);
    let result = selectedTypes.map(dt => `${dt.type}=${dt.code}`).join(',');
    
    if (additionalType && amount) {
      if (result) result += ',';
      result += `${additionalType}=${amount}`;
    }
    
    return result ? ` (${result})` : '';
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void, allowDecimals = false) => {
    const value = e.target.value;
    if (allowDecimals) {
      // Allow decimals for FEP
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setter(value);
      }
    } else {
      // Only integers for other numeric inputs
      if (value === '' || /^\d+$/.test(value)) {
        setter(value);
      }
    }
  };

  const toggleDecisionType = (type: DecisionType) => {
    setDecisionTypes(prev => prev.map(dt => 
      dt.type === type ? { ...dt, selected: !dt.selected } : dt
    ));
  };

  const updateDecisionTypeCode = (type: DecisionType, code: string) => {
    setDecisionTypes(prev => prev.map(dt => 
      dt.type === type ? { ...dt, code } : dt
    ));
  };

  const addOrUpdateDecision = () => {
    const selectedDecisionTypes = decisionTypes
      .filter(dt => dt.selected && dt.code)
      .map(dt => ({ type: dt.type, code: dt.code }));

    let condition: string;

    if (question.type === 'date') {
      if (dateValue.trim() && dateOperator && dateUnit) {
        condition = `${dateOperator} ${dateValue} ${dateUnit}${formatDecisionString()}`;
      } else {
        return;
      }
    } else if (newCondition.trim()) {
      condition = `${newCondition.trim()}${formatDecisionString()}`;
    } else {
      return;
    }

    const newDecision: Decision = {
      id: editingDecisionId || Date.now().toString(),
      condition,
      outcome: newOutcome,
      decisionTypes: selectedDecisionTypes.length > 0 ? selectedDecisionTypes : undefined,
      additionalType: additionalType || undefined,
      amount: additionalType ? amount : undefined
    };

    if (editingDecisionId) {
      onUpdate(question.decisions.map(d => d.id === editingDecisionId ? newDecision : d));
    } else {
      onUpdate([...question.decisions, newDecision]);
    }

    resetForm();
  };

  const removeDecision = (id: string) => {
    onUpdate(question.decisions.filter(d => d.id !== id));
  };

  const editDecision = (decision: Decision) => {
    const { decisionTypes: parsedTypes, additionalInfo } = parseDecision(decision.condition);
    
    setEditingDecisionId(decision.id);
    setDecisionTypes(DECISION_TYPES.map(type => {
      const matchingType = parsedTypes.find(dt => dt.type === type);
      return {
        type,
        selected: !!matchingType,
        code: matchingType?.code || ''
      };
    }));
    
    setAdditionalType(additionalInfo.additionalType || '');
    setAmount(additionalInfo.amount || '');
    setNewOutcome(decision.outcome);

    if (question.type === 'date') {
      const parts = decision.condition.split(' ');
      setDateOperator(parts[0]);
      setDateValue(parts[1]);
      setDateUnit(parts[2]);
    } else {
      setNewCondition(decision.condition.split('(')[0].trim());
    }
  };

  const renderConditionInput = () => {
    switch (question.type) {
      case 'date':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <select
              value={dateOperator}
              onChange={(e) => setDateOperator(e.target.value)}
              className="w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 text-base"
            >
              <option value="">Select operator</option>
              {INTEGER_OPERATORS.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              value={dateValue}
              onChange={(e) => handleNumberInput(e, setDateValue)}
              placeholder="Enter value"
              className="w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 text-base"
            />
            <select
              value={dateUnit}
              onChange={(e) => setDateUnit(e.target.value)}
              className="w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 text-base"
            >
              {TIME_UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        );
      case 'single-picklist':
      case 'multi-picklist':
        return (
          <select
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            className="w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 text-base"
          >
            <option value="">Select option</option>
            {question.options?.map((option) => (
              <option key={option} value={`= ${option}`}>{option}</option>
            ))}
          </select>
        );
      case 'integer':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <select
              value={newCondition.split(' ')[0] || ''}
              onChange={(e) => setNewCondition(`${e.target.value} ${newCondition.split(' ')[1] || ''}`)}
              className="w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 text-base"
            >
              <option value="">Select operator</option>
              {INTEGER_OPERATORS.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              value={newCondition.split(' ')[1] || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  setNewCondition(`${newCondition.split(' ')[0] || ''} ${value}`);
                }
              }}
              placeholder="Enter value"
              className="w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 text-base"
            />
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            placeholder="Enter condition"
            className="w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 text-base"
          />
        );
    }
  };

  return (
    <div className="space-y-6 mt-8 bg-gray-50 p-6 rounded-lg">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h4 className="text-lg font-medium text-gray-900">Decision Mapping</h4>
      </div>
      
      <div className="space-y-3">
        {question.decisions.map((decision) => (
          <div key={decision.id} className="flex items-center gap-4 bg-white p-4 rounded-md shadow-sm">
            <div className="flex-1 break-words">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                If {decision.condition.split('(')[0].trim()}
                Then <span className={`font-medium ${getDecisionColor(decision.outcome)}`}>{decision.outcome}</span>
                {decision.decisionTypes && decision.decisionTypes.length > 0 && (
                  '\n' + decision.decisionTypes.map(dt => `${dt.type}=${dt.code}`).join(', ')
                )}
                {decision.additionalType && decision.amount && (
                  `\n${decision.additionalType}=${decision.amount}`
                )}
              </pre>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => editDecision(decision)}
                className="text-indigo-600 hover:text-indigo-700 p-2"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => removeDecision(decision.id)}
                className="text-red-600 hover:text-red-700 p-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {renderConditionInput()}
        <select
          value={newOutcome}
          onChange={(e) => setNewOutcome(e.target.value as DecisionOutcome)}
          className="w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 text-base"
        >
          {DECISION_OUTCOMES.map(outcome => (
            <option key={outcome} value={outcome}>{outcome}</option>
          ))}
        </select>

        <div className="space-y-4">
          {/* Decision Types */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Decision Types</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {decisionTypes.map((dt) => (
                <div key={dt.type} className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dt.selected}
                      onChange={() => toggleDecisionType(dt.type)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{dt.type}</span>
                  </label>
                  {dt.selected && (
                    <input
                      type="text"
                      value={dt.code}
                      onChange={(e) => updateDecisionTypeCode(dt.type, e.target.value)}
                      placeholder={`Enter ${dt.type} code`}
                      className="w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 text-base"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Additional Types */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Additional Type (Optional)</h5>
            <div className="flex flex-wrap items-center gap-6">
              {ADDITIONAL_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="additionalType"
                    value={type}
                    checked={additionalType === type}
                    onChange={(e) => setAdditionalType(e.target.value as AdditionalType)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{type}</span>
                </label>
              ))}
              {additionalType && (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="additionalType"
                    value=""
                    checked={false}
                    onChange={() => {
                      setAdditionalType('');
                      setAmount('');
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">None</span>
                </label>
              )}
            </div>
          </div>

          {/* Amount Field */}
          {additionalType && (
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => handleNumberInput(e, setAmount, additionalType === 'FEP')}
              placeholder={`Enter ${additionalType} amount`}
              className="w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 text-base"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={addOrUpdateDecision}
            disabled={
              (question.type === 'date' ? !dateValue || !dateOperator || !dateUnit : !newCondition) ||
              (decisionTypes.some(dt => dt.selected && !dt.code)) ||
              (additionalType && !amount)
            }
            className="flex-1 h-12 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 text-base"
          >
            <PlusCircle size={20} />
            {editingDecisionId ? 'Update Decision' : 'Add Decision'}
          </button>
          {editingDecisionId && (
            <button
              type="button"
              onClick={resetForm}
              className="h-12 px-4 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}