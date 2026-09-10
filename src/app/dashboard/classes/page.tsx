"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Flame, Zap, Heart, Dumbbell } from "lucide-react";

const classes = [
  {
    id: 1,
    name: "HIIT Training",
    description: "High-intensity interval training for maximum calorie burn",
    instructor: "Sarah Johnson",
    duration: "45 min",
    difficulty: "Advanced",
    capacity: 15,
    enrolled: 12,
    icon: Flame,
    color: "bg-red-500",
    schedule: "Mon, Wed, Fri - 5:00 PM"
  },
  {
    id: 2,
    name: "Yoga Flow",
    description: "Relaxing yoga session for flexibility and mindfulness",
    instructor: "Mike Chen",
    duration: "60 min",
    difficulty: "Beginner",
    capacity: 20,
    enrolled: 15,
    icon: Heart,
    color: "bg-green-500",
    schedule: "Tue, Thu - 7:00 AM"
  },
  {
    id: 3,
    name: "Strength Training",
    description: "Build muscle and increase strength with weights",
    instructor: "Emma Davis",
    duration: "60 min",
    difficulty: "Intermediate",
    capacity: 12,
    enrolled: 10,
    icon: Dumbbell,
    color: "bg-blue-500",
    schedule: "Mon, Wed - 6:00 PM"
  },
  {
    id: 4,
    name: "Spin Class",
    description: "High-energy cycling workout with motivating music",
    instructor: "James Wilson",
    duration: "45 min",
    difficulty: "Intermediate",
    capacity: 15,
    enrolled: 14,
    icon: Zap,
    color: "bg-yellow-500",
    schedule: "Tue, Thu - 6:30 PM"
  },
  {
    id: 5,
    name: "Pilates",
    description: "Core strengthening and body alignment exercises",
    instructor: "Lisa Brown",
    duration: "50 min",
    difficulty: "Beginner",
    capacity: 18,
    enrolled: 8,
    icon: Heart,
    color: "bg-purple-500",
    schedule: "Wed, Fri - 8:00 AM"
  },
  {
    id: 6,
    name: "CrossFit",
    description: "Intense functional fitness training",
    instructor: "Tom Anderson",
    duration: "60 min",
    difficulty: "Advanced",
    capacity: 10,
    enrolled: 9,
    icon: Flame,
    color: "bg-orange-500",
    schedule: "Sat - 9:00 AM"
  }
];

export default function ClassesPage() {
  const [filter, setFilter] = useState("all");

  const filteredClasses = classes.filter(cls => {
    if (filter === "all") return true;
    return cls.difficulty.toLowerCase() === filter;
  });

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
        <p className="text-muted-foreground mt-2">
          Browse and book gym classes
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All Classes
        </Button>
        <Button
          variant={filter === "beginner" ? "default" : "outline"}
          onClick={() => setFilter("beginner")}
        >
          Beginner
        </Button>
        <Button
          variant={filter === "intermediate" ? "default" : "outline"}
          onClick={() => setFilter("intermediate")}
        >
          Intermediate
        </Button>
        <Button
          variant={filter === "advanced" ? "default" : "outline"}
          onClick={() => setFilter("advanced")}
        >
          Advanced
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredClasses.map((cls) => (
          <Card key={cls.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className={`h-12 w-12 rounded-lg ${cls.color} flex items-center justify-center`}>
                  <cls.icon className="h-6 w-6 text-white" />
                </div>
                <Badge variant="outline">{cls.difficulty}</Badge>
              </div>
              <CardTitle className="mt-3">{cls.name}</CardTitle>
              <CardDescription>{cls.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{cls.instructor}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{cls.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{cls.schedule}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    {cls.enrolled}/{cls.capacity} enrolled
                  </span>
                  <Button size="sm" disabled={cls.enrolled >= cls.capacity}>
                    {cls.enrolled >= cls.capacity ? "Full" : "Book Now"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}