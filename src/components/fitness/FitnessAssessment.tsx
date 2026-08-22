"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Activity, Heart, Dumbbell, Brain, ChevronRight, RotateCcw } from "lucide-react";

interface Question {
  id: string;
  question: string;
  icon: React.ReactNode;
  options: { label: string; value: number }[];
}

const questions: Question[] = [
  {
    id: "activity",
    question: "How often do you exercise per week?",
    icon: <Activity className="w-5 h-5" />,
    options: [
      { label: "Never", value: 1 },
      { label: "1-2 times", value: 2 },
      { label: "3-4 times", value: 3 },
      { label: "5+ times", value: 4 },
    ],
  },
  {
    id: "cardio",
    question: "How would you rate your cardiovascular endurance?",
    icon: <Heart className="w-5 h-5" />,
    options: [
      { label: "Poor - I get winded easily", value: 1 },
      { label: "Fair - Can do light cardio", value: 2 },
      { label: "Good - Can run 20+ mins", value: 3 },
      { label: "Excellent - High endurance", value: 4 },
    ],
  },
  {
    id: "strength",
    question: "How would you rate your strength level?",
    icon: <Dumbbell className="w-5 h-5" />,
    options: [
      { label: "Beginner - Never lifted", value: 1 },
      { label: "Some experience", value: 2 },
      { label: "Intermediate", value: 3 },
      { label: "Advanced", value: 4 },
    ],
  },
  {
    id: "goals",
    question: "What is your primary fitness goal?",
    icon: <Brain className="w-5 h-5" />,
    options: [
      { label: "Lose weight", value: 1 },
      { label: "Build muscle", value: 2 },
      { label: "Improve endurance", value: 3 },
      { label: "Overall fitness", value: 4 },
    ],
  },
];

interface FitnessResult {
  level: string;
  score: number;
  recommendation: string;
  plan: string;
  color: string;
}

const FitnessAssessment = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<FitnessResult | null>(null);

  const handleAnswer = (questionId: string, value: number) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      calculateResult(newAnswers);
    }
  };

  const calculateResult = (finalAnswers: Record<string, number>) => {
    const totalScore = Object.values(finalAnswers).reduce((a, b) => a + b, 0);
    const maxScore = questions.length * 4;
    const percentage = (totalScore / maxScore) * 100;

    let level: string;
    let recommendation: string;
    let plan: string;
    let color: string;

    if (percentage <= 25) {
      level = "Beginner";
      recommendation = "Start with our Basic membership to build a foundation.";
      plan = "Basic";
      color = "text-blue-400";
    } else if (percentage <= 50) {
      level = "Intermediate";
      recommendation = "The Pro membership will help you reach your goals faster.";
      plan = "Pro";
      color = "text-yellow-400";
    } else if (percentage <= 75) {
      level = "Advanced";
      recommendation = "You're ready for our Pro or Elite membership with personal training.";
      plan = "Pro";
      color = "text-primary";
    } else {
      level = "Elite";
      recommendation = "Our Elite membership with unlimited training is perfect for you.";
      plan = "Elite";
      color = "text-purple-400";
    }

    setResult({ level, score: Math.round(percentage), recommendation, plan, color });
  };

  const resetAssessment = () => {
    setCurrentStep(0);
    setAnswers({});
    setResult(null);
  };

  const currentQuestion = questions[currentStep];

  return (
    <div className="glass-card rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-2xl">Fitness Assessment</h3>
          <p className="text-muted-foreground text-sm">Find your fitness level</p>
        </div>
      </div>

      {!result ? (
        <>
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Question {currentStep + 1} of {questions.length}</span>
              <span>{Math.round(((currentStep) / questions.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentStep) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="animate-fade-in" key={currentQuestion.id}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {currentQuestion.icon}
              </div>
              <h4 className="text-lg font-medium">{currentQuestion.question}</h4>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(currentQuestion.id, option.value)}
                  className={`w-full p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-all text-left flex items-center justify-between group ${
                    answers[currentQuestion.id] === option.value ? "border-primary bg-primary/10" : ""
                  }`}
                >
                  <span>{option.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="animate-fade-in text-center">
          <div className="mb-6">
            <div className={`font-display text-6xl mb-2 ${result.color}`}>
              {result.score}%
            </div>
            <p className={`text-2xl font-semibold ${result.color}`}>{result.level} Level</p>
          </div>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {questions.map((q) => (
              <div key={q.id} className="bg-secondary/30 rounded-lg p-3 text-left">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  {q.icon}
                  <span className="capitalize">{q.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${(answers[q.id] / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{answers[q.id]}/4</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
            <p className="text-primary font-medium mb-1">Recommended Plan: {result.plan}</p>
            <p className="text-muted-foreground text-sm">{result.recommendation}</p>
          </div>

          <Button onClick={resetAssessment} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Retake Assessment
          </Button>
        </div>
      )}
    </div>
  );
};

export default FitnessAssessment;
