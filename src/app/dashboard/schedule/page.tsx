"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

const scheduleData = [
  {
    id: 1,
    time: "6:00 AM",
    class: "Yoga Flow",
    instructor: "Mike Chen",
    location: "Studio A",
    duration: "60 min",
    day: "Monday"
  },
  {
    id: 2,
    time: "7:00 AM",
    class: "Pilates",
    instructor: "Lisa Brown",
    location: "Studio B",
    duration: "50 min",
    day: "Monday"
  },
  {
    id: 3,
    time: "5:00 PM",
    class: "HIIT Training",
    instructor: "Sarah Johnson",
    location: "Main Floor",
    duration: "45 min",
    day: "Monday"
  },
  {
    id: 4,
    time: "6:00 PM",
    class: "Strength Training",
    instructor: "Emma Davis",
    location: "Weight Room",
    duration: "60 min",
    day: "Monday"
  },
  {
    id: 5,
    time: "6:30 PM",
    class: "Spin Class",
    instructor: "James Wilson",
    location: "Cycling Studio",
    duration: "45 min",
    day: "Monday"
  }
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SchedulePage() {
  const [currentDay, setCurrentDay] = useState(0);
  const [bookedClasses, setBookedClasses] = useState<number[]>([]);

  const handleBook = (classId: number) => {
    if (bookedClasses.includes(classId)) {
      setBookedClasses(bookedClasses.filter(id => id !== classId));
    } else {
      setBookedClasses([...bookedClasses, classId]);
    }
  };

  const nextDay = () => {
    setCurrentDay((prev) => (prev + 1) % days.length);
  };

  const prevDay = () => {
    setCurrentDay((prev) => (prev - 1 + days.length) % days.length);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your class schedule
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Badge variant="outline" className="px-4 py-2">
                {days[currentDay]}
              </Badge>
              <Button variant="outline" size="icon" onClick={nextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduleData.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[80px]">
                    <p className="text-lg font-bold">{item.time}</p>
                    <p className="text-xs text-muted-foreground">{item.duration}</p>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div>
                    <p className="font-semibold">{item.class}</p>
                    <p className="text-sm text-muted-foreground">{item.instructor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{item.location}</span>
                  </div>
                  <Button
                    variant={bookedClasses.includes(item.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleBook(item.id)}
                  >
                    {bookedClasses.includes(item.id) ? "Booked" : "Book"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-3">Your Booked Classes</h3>
            {bookedClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes booked yet</p>
            ) : (
              <div className="space-y-2">
                {bookedClasses.map((id) => {
                  const cls = scheduleData.find((c) => c.id === id);
                  return cls ? (
                    <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                      <div>
                        <p className="font-medium">{cls.class}</p>
                        <p className="text-sm text-muted-foreground">{cls.time} - {cls.location}</p>
                      </div>
                      <Badge>Confirmed</Badge>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}