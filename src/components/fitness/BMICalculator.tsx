"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Scale, Ruler } from "lucide-react";

type Unit = "metric" | "imperial";

interface BMIResult {
  bmi: number;
  category: string;
  color: string;
}

const BMICalculator = () => {
  const [unit, setUnit] = useState<Unit>("metric");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [result, setResult] = useState<BMIResult | null>(null);

  const calculateBMI = () => {
    let bmi: number;

    if (unit === "metric") {
      const heightM = parseFloat(height) / 100;
      const weightKg = parseFloat(weight);
      if (!heightM || !weightKg) return;
      bmi = weightKg / (heightM * heightM);
    } else {
      const totalInches = parseFloat(heightFt) * 12 + parseFloat(heightIn || "0");
      const weightLbs = parseFloat(weight);
      if (!totalInches || !weightLbs) return;
      bmi = (weightLbs / (totalInches * totalInches)) * 703;
    }

    let category: string;
    let color: string;

    if (bmi < 18.5) {
      category = "Underweight";
      color = "text-blue-400";
    } else if (bmi < 25) {
      category = "Normal";
      color = "text-primary";
    } else if (bmi < 30) {
      category = "Overweight";
      color = "text-yellow-400";
    } else {
      category = "Obese";
      color = "text-red-400";
    }

    setResult({ bmi, category, color });
  };

  const resetCalculator = () => {
    setHeight("");
    setWeight("");
    setHeightFt("");
    setHeightIn("");
    setResult(null);
  };

  return (
    <div className="glass-card rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Calculator className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-2xl">BMI Calculator</h3>
          <p className="text-muted-foreground text-sm">Calculate your Body Mass Index</p>
        </div>
      </div>

      {/* Unit Toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={unit === "metric" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setUnit("metric");
            resetCalculator();
          }}
        >
          Metric (kg/cm)
        </Button>
        <Button
          variant={unit === "imperial" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setUnit("imperial");
            resetCalculator();
          }}
        >
          Imperial (lbs/ft)
        </Button>
      </div>

      <div className="space-y-4 mb-6">
        {unit === "metric" ? (
          <>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Ruler className="w-4 h-4 text-primary" />
                Height (cm)
              </Label>
              <Input
                type="number"
                placeholder="e.g., 175"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-primary" />
                Weight (kg)
              </Label>
              <Input
                type="number"
                placeholder="e.g., 70"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="bg-secondary/50 border-border"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Ruler className="w-4 h-4 text-primary" />
                Height
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Feet"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
                <Input
                  type="number"
                  placeholder="Inches"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-primary" />
                Weight (lbs)
              </Label>
              <Input
                type="number"
                placeholder="e.g., 154"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="bg-secondary/50 border-border"
              />
            </div>
          </>
        )}
      </div>

      <Button className="w-full mb-6" onClick={calculateBMI}>
        Calculate BMI
      </Button>

      {result && (
        <div className="bg-secondary/30 rounded-xl p-6 text-center animate-fade-in">
          <p className="text-muted-foreground mb-2">Your BMI</p>
          <p className={`font-display text-5xl mb-2 ${result.color}`}>
            {result.bmi.toFixed(1)}
          </p>
          <p className={`text-lg font-semibold ${result.color}`}>{result.category}</p>
          
          {/* BMI Scale */}
          <div className="mt-6">
            <div className="h-3 rounded-full bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-400 relative">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-foreground rounded-full border-2 border-background shadow-lg transition-all"
                style={{ 
                  left: `${Math.min(Math.max((result.bmi - 15) / 25 * 100, 0), 100)}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>15</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>40</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BMICalculator;
