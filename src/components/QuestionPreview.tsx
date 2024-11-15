import React, { useState, useEffect } from 'react';
import { differenceInDays, differenceInMonths, differenceInYears, parseISO, startOfDay } from 'date-fns';
import { Question } from '../types';
import { RotateCw } from 'lucide-react';

interface QuestionPreviewProps {
  questions: Question[];
}

export default function QuestionPreview({ questions }: QuestionPreviewProps) {
  const [answers, setAnswers] = useState<{ [key: string]: string | number | string[] | undefined }>({});
  const [decisions, setDecisions] = useState<{ [key: string]: string }>({});
  const [visibleQuestions, setVisibleQuestions] = useState<Question[]>([]);
  const [worstDecision, setWorstDecision] = useState<string | null>(null);

  const evaluateDateCondition = (condition: string, value: string): boolean => {
    const [operator, amount, unit] = condition.split(' ');
    if (!operator || !amount || !unit) return false;

    const numAmount = parseInt(amount);
    if (isNaN(numAmount)) return false;

    const currentDate = startOfDay(new Date());
    const inputDate = startOfDay(parseISO(value));
    let difference;

    switch (unit.toUpperCase()) {
      case 'DAYS':
        difference = differenceInDays(currentDate, inputDate);
        break;
      case 'MONTHS':
        difference = differenceInMonths(currentDate, inputDate);
        break;
      case 'YEARS':
        difference = differenceInYears(currentDate, inputDate);
        break;
      default:
        return false;
    }

    switch (operator) {
      case '<': return difference < numAmount;
      case '>': return difference > numAmount;
      case '=': return difference === numAmount;
      case '<=': return difference <= numAmount;
      case '>=': return difference >= numAmount;
      default: return false;
    }
  };

  const evaluateCondition = (condition: { attributeName: string, expression: string }): boolean => {
    const dependentValue = answers[condition.attributeName];
    if (dependentValue === undefined) return false;

    const dependentQuestion = questions.find(q => q.attribute === condition.attributeName);
    if (!dependentQuestion) return false;

    if (dependentQuestion.type === 'date') {
      return evaluateDateCondition(condition.expression, dependentValue.toString());
    }

    if (condition.expression.startsWith('= ')) {
      if (Array.isArray(dependentValue)) {
        return dependentValue.includes(condition.expression.substring(2));
      }
      return dependentValue === condition.expression.substring(2);
    }

    const numericValue = Number(dependentValue);
    const [operator, threshold] = condition.expression.split(' ');
    const numericThreshold = Number(threshold);

    switch (operator) {
      case '>': return numericValue > numericThreshold;
      case '<': return numericValue < numericThreshold;
      case '=': return numericValue === numericThreshold;
      case '>=': return numericValue >= numericThreshold;
      case '<=': return numericValue <= numericThreshold;
      default: return false;
    }
  };

  const getDecisionPriority = (decision: string) => {
    const priorities = {
      'DECLINE': 1,
      'POSTPONE': 2,
      'REFER': 3,
      'ACCEPT': 4
    };
    return priorities[decision] || 5;
  };

  const updateWorstDecision = () => {
    const activeDecisions = Object.values(decisions).filter(d => d);
    if (activeDecisions.length === 0) {
      setWorstDecision(null);
      return;
    }

    const worst = activeDecisions.reduce((prev, current) => {
      const prevPriority = getDecisionPriority(prev.split('\n')[0].trim());
      const currentPriority = getDecisionPriority(current.split('\n')[0].trim());
      return prevPriority <= currentPriority ? prev : current;
    });

    setWorstDecision(worst);
  };

  useEffect(() => {
    updateWorstDecision();
  }, [decisions]);

  const evaluateQuestionVisibility = (question: Question): boolean => {
    if (!question.conditionGroup) return true;

    const { conditions, logic } = question.conditionGroup;
    if (conditions.length === 0) return true;

    if (logic === 'AND') {
      return conditions.every(evaluateCondition);
    } else {
      return conditions.some(evaluateCondition);
    }
  };

  useEffect(() => {
    const visible = questions.filter(evaluateQuestionVisibility);
    setVisibleQuestions(visible);
  }, [answers, questions]);

  const handleAnswerChange = (question: Question, value: string | string[]) => {
    let newValue: string | number | string[] | undefined;

    if (question.type === 'integer') {
      newValue = parseInt(value as string) || undefined;
    } else if (question.type === 'multi-picklist') {
      newValue = value;
    } else {
      newValue = value;
    }

    setAnswers(prev => ({
      ...prev,
      [question.attribute]: newValue
    }));

    const decision = question.decisions?.find(d => {
      const cleanCondition = d.condition.split('(')[0].trim();
      
      if (question.type === 'date' && value) {
        return evaluateDateCondition(cleanCondition, value as string);
      } else if (question.type === 'single-picklist') {
        return cleanCondition === `= ${value}`;
      } else if (question.type === 'multi-picklist') {
        const selectedValues = value as string[];
        return selectedValues.some(v => cleanCondition === `= ${v}`);
      } else if (question.type === 'integer') {
        const [operator, threshold] = cleanCondition.split(' ');
        const numValue = parseInt(value as string);
        const numThreshold = parseInt(threshold);
        
        switch (operator) {
          case '>': return numValue > numThreshold;
          case '<': return numValue < numThreshold;
          case '=': return numValue === numThreshold;
          case '>=': return numValue >= numThreshold;
          case '<=': return numValue <= numThreshold;
          default: return false;
        }
      }
      return false;
    });

    if (decision) {
      let decisionText = decision.outcome;
      if (decision.decisionTypes && decision.decisionTypes.length > 0) {
        decisionText += '\n' + decision.decisionTypes
          .map(dt => `${dt.type}=${dt.code}`)
          .join(', ');
      }
      if (decision.additionalType && decision.amount) {
        decisionText += `\n${decision.additionalType}=${decision.amount}`;
      }
      setDecisions(prev => ({
        ...prev,
        [question.id]: decisionText
      }));
    } else {
      setDecisions(prev => {
        const newDecisions = { ...prev };
        delete newDecisions[question.id];
        return newDecisions;
      });
    }
  };

  const handleMultiPicklistChange = (question: Question, option: string, checked: boolean) => {
    const currentValues = (answers[question.attribute] as string[]) || [];
    let newValues: string[];
    
    if (checked) {
      newValues = [...currentValues, option];
    } else {
      newValues = currentValues.filter(v => v !== option);
    }
    
    handleAnswerChange(question, newValues);
  };

  const resetForm = () => {
    setAnswers({});
    setDecisions({});
    setWorstDecision(null);
  };

  const getDecisionColor = (decision: string) => {
    const outcome = decision.split('\n')[0].trim();
    switch (outcome) {
      case 'ACCEPT': return 'text-green-600';
      case 'DECLINE': return 'text-red-600';
      case 'REFER': return 'text-yellow-600';
      case 'POSTPONE': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getDecisionBorderColor = (decision: string) => {
    const outcome = decision.split('\n')[0].trim();
    switch (outcome) {
      case 'ACCEPT': return 'border-green-500';
      case 'DECLINE': return 'border-red-500';
      case 'REFER': return 'border-yellow-500';
      case 'POSTPONE': return 'border-purple-500';
      default: return 'border-gray-500';
    }
  };

  const renderInput = (question: Question) => {
    const decision = decisions[question.id];
    const decisionClass = decision ? `border-l-4 ${getDecisionBorderColor(decision)}` : '';

    switch (question.type) {
      case 'single-picklist':
        return (
          <select
            value={answers[question.attribute]?.toString() || ''}
            onChange={(e) => handleAnswerChange(question, e.target.value)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border ${decisionClass}`}
            required={question.required}
          >
            <option value="">Select an option</option>
            {question.options?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'multi-picklist':
        return (
          <div className={`mt-1 space-y-2 ${decisionClass}`}>
            {question.options?.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(answers[question.attribute] as string[] || []).includes(option)}
                  onChange={(e) => handleMultiPicklistChange(question, option, e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      case 'date':
        return (
          <input
            type="date"
            value={answers[question.attribute]?.toString() || ''}
            onChange={(e) => handleAnswerChange(question, e.target.value)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border ${decisionClass}`}
            required={question.required}
          />
        );
      case 'integer':
        return (
          <input
            type="number"
            value={answers[question.attribute]?.toString() || ''}
            onChange={(e) => handleAnswerChange(question, e.target.value)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border ${decisionClass}`}
            required={question.required}
          />
        );
      default:
        return (
          <input
            type="text"
            value={answers[question.attribute]?.toString() || ''}
            onChange={(e) => handleAnswerChange(question, e.target.value)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border ${decisionClass}`}
            required={question.required}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Preview Form</h2>
        <button
          onClick={resetForm}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <RotateCw className="h-4 w-4 mr-2" />
          Reset Form
        </button>
      </div>

      {visibleQuestions.map((question) => (
        <div key={question.id} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {question.wording}
            {!question.required && <span className="text-gray-500 ml-1">(Optional)</span>}
          </label>
          {renderInput(question)}
          {decisions[question.id] && (
            <div className={`text-sm font-medium ${getDecisionColor(decisions[question.id])}`}>
              <pre className="whitespace-pre-wrap font-sans">
                Decision: {decisions[question.id]}
              </pre>
            </div>
          )}
        </div>
      ))}
      {visibleQuestions.length === 0 && (
        <p className="text-gray-500 text-center">No questions to display</p>
      )}

      {worstDecision && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Worst Decision</h3>
          <p className={`font-medium ${getDecisionColor(worstDecision)}`}>
            {worstDecision}
          </p>
        </div>
      )}
    </div>
  );
}