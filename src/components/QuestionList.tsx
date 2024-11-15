import React from 'react';
import { Question } from '../types';
import { Trash2, Edit2 } from 'lucide-react';

interface QuestionListProps {
  questions: Question[];
  onDelete: (id: string) => void;
  onEdit: (question: Question) => void;
}

export default function QuestionList({ questions, onDelete, onEdit }: QuestionListProps) {
  const formatDecision = (decision: { 
    condition: string, 
    outcome: string, 
    decisionTypes?: Array<{ type: string; code: string }>,
    additionalType?: 'FEP' | 'EM',
    amount?: string
  }) => {
    // Remove any existing type/code from the condition
    const cleanCondition = decision.condition.split('(')[0].trim();
    let decisionText = `If ${cleanCondition} Then ${decision.outcome}`;
    
    if (decision.decisionTypes && decision.decisionTypes.length > 0) {
      decisionText += '\n' + decision.decisionTypes
        .map(dt => `${dt.type}=${dt.code}`)
        .join(', ');
    }
    
    if (decision.additionalType && decision.amount) {
      decisionText += `\n${decision.additionalType}=${decision.amount}`;
    }
    
    return decisionText;
  };

  const formatConditions = (question: Question) => {
    if (!question.conditionGroup || !question.conditionGroup.conditions.length) return null;

    return question.conditionGroup.conditions.map((condition, index) => (
      <span key={index}>
        {index > 0 && ` ${question.conditionGroup?.logic} `}
        {condition.attributeName} {condition.expression}
      </span>
    ));
  };

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <div key={question.id} className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1 mr-4">
              <h3 className="font-medium text-lg">{question.wording}</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Type: <span className="font-medium">{question.type}</span></p>
                <p>Attribute: <span className="font-medium">{question.attribute}</span></p>
                {question.conditionGroup && question.conditionGroup.conditions.length > 0 && (
                  <p>Conditions: <span className="font-medium">
                    {formatConditions(question)}
                  </span></p>
                )}
                <p>Optional: <span className="font-medium">{question.required ? 'No' : 'Yes'}</span></p>
                {(question.type === 'single-picklist' || question.type === 'multi-picklist') && question.options && (
                  <div>
                    <p>Options:</p>
                    <ul className="list-disc list-inside pl-4">
                      {question.options.map((option, index) => (
                        <li key={index}>{option}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {question.decisions && question.decisions.length > 0 && (
                  <div>
                    <p>Decisions:</p>
                    <ul className="list-none space-y-2 mt-2">
                      {question.decisions.map((decision) => (
                        <li key={decision.id} className="bg-gray-50 p-3 rounded-md break-words">
                          <pre className="whitespace-pre-wrap font-sans text-sm">
                            {formatDecision(decision)}
                          </pre>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => onEdit(question)}
                className="text-indigo-600 hover:text-indigo-700 p-1"
              >
                <Edit2 size={20} />
              </button>
              <button
                onClick={() => onDelete(question.id)}
                className="text-red-600 hover:text-red-700 p-1"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}