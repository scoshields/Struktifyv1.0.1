import React, { useState, useRef } from 'react';
import { Download, RefreshCw, Upload, FileSpreadsheet, ListTree, Eye } from 'lucide-react';
import { Question } from './types';
import QuestionForm from './components/QuestionForm';
import QuestionList from './components/QuestionList';
import QuestionPreview from './components/QuestionPreview';
import PasswordGate from './components/PasswordGate';
import { utils, writeFile } from 'xlsx';

const APP_VERSION = '1.0.1';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [formName, setFormName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>();
  const [activeTab, setActiveTab] = useState<'build' | 'preview'>('build');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewForm = () => {
    if (confirm('Are you sure you want to start a new form? All current questions will be cleared.')) {
      setFormName('');
      setQuestions([]);
      setEditingQuestion(undefined);
      setActiveTab('build');
    }
  };

  const handleAddQuestion = (question: Question) => {
    setQuestions([...questions, question]);
  };

  const handleUpdateQuestion = (updatedQuestion: Question) => {
    setQuestions(questions.map(q => 
      q.id === updatedQuestion.id ? updatedQuestion : q
    ));
    setEditingQuestion(undefined);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const exportToJson = () => {
    const data = {
      formName,
      questions
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formName.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        setFormName(data.formName);
        setQuestions(data.questions);
      } catch (error) {
        alert('Error importing file. Please make sure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const exportToExcel = () => {
    if (!formName || questions.length === 0) return;

    const workbook = utils.book_new();
    const headers = ['Question', 'Type', 'Attribute', 'Condition', 'Required', 'Option/Value', 'Decision'];
    const rows = [
      ['Form Name', formName],
      [],
      headers
    ];

    questions.forEach((question) => {
      const baseRow = [
        question.wording,
        question.type,
        question.attribute,
        question.conditionGroup ? 
          question.conditionGroup.conditions.map(c => 
            `${c.attributeName} ${c.expression}`
          ).join(` ${question.conditionGroup.logic} `) : '',
        question.required ? 'Yes' : 'No'
      ];

      if (question.type === 'date') {
        question.decisions.forEach(decision => {
          const [operator, value] = decision.condition.split(' ');
          rows.push([
            ...baseRow,
            `${operator} ${value}`,
            formatDecision(decision)
          ]);
        });
      } else if ((question.type === 'single-picklist' || question.type === 'multi-picklist') && question.options?.length) {
        question.options.forEach((option) => {
          const matchingDecisions = question.decisions
            .filter(d => d.condition.startsWith(`= ${option}`));
          
          if (matchingDecisions.length > 0) {
            matchingDecisions.forEach(decision => {
              rows.push([
                ...baseRow,
                option,
                formatDecision(decision)
              ]);
            });
          } else {
            rows.push([...baseRow, option, '']);
          }
        });
      } else {
        question.decisions.forEach(decision => {
          const conditionParts = decision.condition.split(' ');
          const operator = conditionParts[0];
          const value = conditionParts.slice(1).join(' ').split('(')[0].trim();
          rows.push([
            ...baseRow,
            `${operator} ${value}`,
            formatDecision(decision)
          ]);
        });
      }
    });

    const sheet = utils.aoa_to_sheet(rows);
    utils.book_append_sheet(workbook, sheet, 'Questions');
    writeFile(workbook, `${formName.toLowerCase().replace(/\s+/g, '-')}-questions.xlsx`);
  };

  const formatDecision = (decision: { outcome: string, decisionTypes?: Array<{ type: string, code: string }>, additionalType?: string, amount?: string }) => {
    let result = decision.outcome;
    if (decision.decisionTypes && decision.decisionTypes.length > 0) {
      result += '\n' + decision.decisionTypes.map(dt => `${dt.type}=${dt.code}`).join(', ');
    }
    if (decision.additionalType && decision.amount) {
      result += `\n${decision.additionalType}=${decision.amount}`;
    }
    return result;
  };

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="max-w-[1920px] mx-auto relative min-h-screen pb-12">
        <div className="bg-gradient-to-r from-white via-indigo-100/50 to-white bg-opacity-90 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <img 
                      src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMiAyaDIwdjIwSDJ6IiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjgiIGN5PSI4IiByPSIyIiBmaWxsPSIjMDAwIi8+PGNpcmNsZSBjeD0iOCIgY3k9IjE2IiByPSIyIiBmaWxsPSIjMDAwIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSI4IiByPSIyIiBmaWxsPSIjMDAwIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMiIgZmlsbD0iIzAwMCIvPjxsaW5lIHgxPSI4IiB5MT0iOCIgeDI9IjE2IiB5Mj0iMTYiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PGxpbmUgeDE9IjgiIHkxPSIxNiIgeDI9IjE2IiB5Mj0iOCIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4="
                      alt="Struktify Logo" 
                      className="h-12 w-12"
                    />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">Struktify</h1>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter form name"
                    className="w-full px-4 py-2 rounded-md border border-gray-300 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all duration-200"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleNewForm}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  New Form
                </button>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={importJson}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import JSON
                  </button>
                  <button
                    onClick={exportToJson}
                    disabled={!formName || questions.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </button>
                  <button
                    onClick={exportToExcel}
                    disabled={!formName || questions.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4">
            <nav className="flex space-x-8" aria-label="Form Sections">
              <button
                onClick={() => setActiveTab('build')}
                className={`flex items-center gap-2 py-4 px-6 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === 'build'
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50 backdrop-blur-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ListTree className={`h-5 w-5 ${
                  activeTab === 'build' ? 'text-indigo-500' : 'text-gray-400'
                }`} />
                Drilldown Form
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 py-4 px-6 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === 'preview'
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50 backdrop-blur-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Eye className={`h-5 w-5 ${
                  activeTab === 'preview' ? 'text-indigo-500' : 'text-gray-400'
                }`} />
                Preview Form
              </button>
            </nav>
          </div>
        </div>

        <div className="px-4 py-8">
          {activeTab === 'build' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="lg:col-span-1">
                <QuestionForm
                  onAdd={handleAddQuestion}
                  onUpdate={handleUpdateQuestion}
                  existingQuestions={questions}
                  formName={formName}
                  disabled={!formName}
                  editingQuestion={editingQuestion}
                  onCancelEdit={() => setEditingQuestion(undefined)}
                />
              </div>
              <div className="lg:col-span-1">
                <QuestionList
                  questions={questions}
                  onDelete={handleDeleteQuestion}
                  onEdit={setEditingQuestion}
                />
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
              <QuestionPreview questions={questions} />
            </div>
          )}
        </div>

        {/* Version number */}
        <div className="fixed bottom-4 right-4 text-sm text-gray-500 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
          Version: {APP_VERSION}
        </div>
      </div>
    </div>
  );
}