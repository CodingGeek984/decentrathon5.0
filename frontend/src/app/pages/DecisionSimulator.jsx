import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const DecisionSimulator = () => {
  const [simulators, setSimulators] = useState([]);
  const [selected, setSelected] = useState(null);
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSimulators();
  }, []);

  const fetchSimulators = async () => {
    try {
      const response = await fetch('/api/explainable/simulators');
      const data = await response.json();
      if (data.success) {
        setSimulators(data.simulators);
      }
    } catch (err) {
      console.error('Failed to load simulators', err);
    }
  };

  const selectScenario = (s) => {
    setSelected(s);
    setChoice(null);
    setResult(null);
  };

  const completeChoice = async (selectedChoice) => {
    setChoice(selectedChoice);
    setLoading(true);

    try {
      const response = await fetch(`/api/explainable/simulators/${selected.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '1', // TODO: заменить реальным пользователем
          score: selectedChoice.score_impact,
          choices: [{ scenarioId: selected.scenarios[0].id, choiceId: selectedChoice.id }],
          feedback: selectedChoice.consequence
        })
      });
      const data = await response.json();
      if (data.success) {
        setResult({
          ...selectedChoice,
          resultId: data.resultId,
          totalScore: selectedChoice.score_impact
        });
      }
    } catch (err) {
      console.error('Simulation save error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Decision Simulator</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Выберите ситуацию, примите решение и посмотрите последствия.</p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {simulators.map((sim) => (
            <Card key={sim.id} className={`cursor-pointer ${selected?.id === sim.id ? 'ring-2 ring-blue-500' : ''}`} onClick={() => selectScenario(sim)}>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">{sim.title}</span>
                  <Badge>{sim.difficulty}</Badge>
                </div>
                <p className="text-sm text-gray-700">{sim.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>{selected.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {selected.scenarios.map((scenario) => (
                <div key={scenario.id} className="mb-6">
                  <h4 className="font-semibold">{scenario.title}</h4>
                  <p className="text-gray-600 mb-3">{scenario.description}</p>

                  {scenario.choices.map((c) => (
                    <Button
                      key={c.id}
                      className="mr-2 mb-2"
                      onClick={() => completeChoice(c)}
                      disabled={loading}
                    >
                      {c.text}
                    </Button>
                  ))}
                </div>
              ))}

              {result && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                  <h5 className="font-medium">Результат</h5>
                  <p>{result.consequence}</p>
                  <p className="mt-2">Начислено: {result.score_impact} баллов</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DecisionSimulator;
