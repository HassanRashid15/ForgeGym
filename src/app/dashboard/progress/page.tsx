"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Target, Award, Calendar, Flame, Dumbbell, Clock } from "lucide-react";

const workoutData = [
  { date: "Mon", workouts: 2, calories: 450, duration: 90 },
  { date: "Tue", workouts: 1, calories: 300, duration: 45 },
  { date: "Wed", workouts: 3, calories: 600, duration: 120 },
  { date: "Thu", workouts: 1, calories: 350, duration: 50 },
  { date: "Fri", workouts: 2, calories: 500, duration: 85 },
  { date: "Sat", workouts: 1, calories: 400, duration: 60 },
  { date: "Sun", workouts: 0, calories: 0, duration: 0 },
];

const personalRecords = [
  { exercise: "Bench Press", weight: "225 lbs", date: "2024-11-15", improvement: "+10 lbs" },
  { exercise: "Deadlift", weight: "315 lbs", date: "2024-11-10", improvement: "+15 lbs" },
  { exercise: "Squat", weight: "275 lbs", date: "2024-11-05", improvement: "+20 lbs" },
  { exercise: "5K Run", weight: "24:30", date: "2024-11-01", improvement: "-1:30" },
];

const goals = [
  { id: 1, name: "Weekly Workouts", current: 12, target: 15, unit: "sessions" },
  { id: 2, name: "Calories Burned", current: 2600, target: 3000, unit: "kcal" },
  { id: 3, name: "Workout Time", current: 450, target: 600, unit: "minutes" },
];

export default function ProgressPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("week");

  const totalWorkouts = workoutData.reduce((sum, day) => sum + day.workouts, 0);
  const totalCalories = workoutData.reduce((sum, day) => sum + day.calories, 0);
  const totalDuration = workoutData.reduce((sum, day) => sum + day.duration, 0);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
        <p className="text-muted-foreground mt-2">
          Track your fitness journey and achievements
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={selectedPeriod === "week" ? "default" : "outline"}
          onClick={() => setSelectedPeriod("week")}
        >
          This Week
        </Button>
        <Button
          variant={selectedPeriod === "month" ? "default" : "outline"}
          onClick={() => setSelectedPeriod("month")}
        >
          This Month
        </Button>
        <Button
          variant={selectedPeriod === "year" ? "default" : "outline"}
          onClick={() => setSelectedPeriod("year")}
        >
          This Year
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totalWorkouts}</div>
              <Dumbbell className="h-5 w-5 text-primary opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +15% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Calories Burned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totalCalories.toLocaleString()}</div>
              <Flame className="h-5 w-5 text-primary opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +8% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totalDuration}m</div>
              <Clock className="h-5 w-5 text-primary opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">7 days</div>
              <Award className="h-5 w-5 text-primary opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Personal best!</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Activity
          </CardTitle>
          <CardDescription>Your workout activity over the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-48">
            {workoutData.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-primary rounded-t-lg transition-all hover:bg-primary/80"
                  style={{ 
                    height: `${(day.calories / Math.max(...workoutData.map(d => d.calories))) * 100}%`,
                    minHeight: day.workouts > 0 ? '20px' : '4px'
                  }}
                />
                <div className="text-xs text-center">
                  <p className="font-medium">{day.date}</p>
                  <p className="text-muted-foreground">{day.calories} kcal</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goals Progress
            </CardTitle>
            <CardDescription>Track your fitness goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {goals.map((goal) => {
              const progress = (goal.current / goal.target) * 100;
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {goal.current}/{goal.target} {goal.unit}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {progress.toFixed(0)}% complete
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Personal Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Personal Records
            </CardTitle>
            <CardDescription>Your recent achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {personalRecords.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{record.exercise}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {record.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{record.weight}</p>
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      {record.improvement}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}