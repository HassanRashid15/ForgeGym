"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Clock, Flame, Users, Calendar, Dumbbell } from "lucide-react";
import { allClasses, categories } from "@/data/classes";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";
import { ComingSoonOverlay } from "@/components/ComingSoonOverlay";

const scheduleData = [
  { time: "6:00 AM", mon: "Power HIIT", tue: "Yoga Flow", wed: "Power HIIT", thu: "Yoga Flow", fri: "Power HIIT", sat: "Boot Camp" },
  { time: "7:00 AM", mon: "Spin Class", tue: "Power Yoga", wed: "Spin Class", thu: "Power Yoga", fri: "Spin Class", sat: "HIIT" },
  { time: "12:00 PM", mon: "Cardio Blast", tue: "Strength", wed: "Cardio Blast", thu: "Strength", fri: "Cardio Blast", sat: "-" },
  { time: "5:30 PM", mon: "Spin Revolution", tue: "-", wed: "Spin Revolution", thu: "-", fri: "-", sat: "Spin Revolution" },
  { time: "6:00 PM", mon: "Yoga", tue: "Sculpt", wed: "Yoga", thu: "Sculpt", fri: "Yoga", sat: "-" },
];

export default function ClassesPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [view, setView] = useState<"classes" | "schedule">("classes");

  const filteredClasses =
    activeCategory === "All"
      ? allClasses
      : allClasses.filter((c) => c.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <ComingSoonOverlay
        title="Class booking coming soon"
        description="Preview our class experience below. Booking and schedules unlock next — join now for early access."
        icon={Dumbbell}
      >
        <section className="relative overflow-hidden bg-card pb-16 pt-32">
          <InteractiveBackground variant="gradient" />
          <div className="container relative z-10 mx-auto px-4">
            <h1 className="font-display mb-4 text-6xl md:text-8xl">
              OUR <span className="text-gradient">CLASSES</span>
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              From high-intensity training to mindful yoga, classes for every fitness level.
            </p>
          </div>
        </section>

        <section className="sticky top-16 z-40 border-b border-border bg-background/80 py-8 backdrop-blur-lg">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div className="flex gap-2">
                <Button
                  variant={view === "classes" ? "default" : "secondary"}
                  onClick={() => setView("classes")}
                >
                  Classes
                </Button>
                <Button
                  variant={view === "schedule" ? "default" : "secondary"}
                  onClick={() => setView("schedule")}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule
                </Button>
              </div>

              {view === "classes" ? (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={activeCategory === category ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {view === "classes" ? (
          <section className="py-16">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredClasses.map((classItem, index) => (
                  <ScrollAnimate
                    key={classItem.id}
                    animation="fade-up"
                    delay={index * 0.1}
                  >
                    <div className="glass-card group flex h-full flex-col overflow-hidden rounded-xl hover-lift">
                      <div className="relative h-48 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={classItem.image}
                          alt={classItem.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute left-4 top-4 flex gap-2">
                          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                            {classItem.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <h3 className="font-display mb-2 text-2xl">{classItem.name}</h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                          {classItem.description}
                        </p>
                        <div className="mb-4 flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4 text-primary" />
                            {classItem.duration}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Flame className="h-4 w-4 text-primary" />
                            {classItem.intensity}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-4 w-4 text-primary" />
                            {classItem.spots} spots left
                          </div>
                        </div>
                        <div className="mb-4 flex flex-wrap gap-2">
                          {classItem.schedule.slice(0, 3).map((time, i) => (
                            <span
                              key={i}
                              className="rounded bg-secondary px-2 py-1 text-xs"
                            >
                              {time}
                            </span>
                          ))}
                        </div>
                        <p className="mb-4 text-sm text-muted-foreground">
                          Instructor:{" "}
                          <span className="text-foreground">{classItem.trainer}</span>
                        </p>
                        <Button className="mt-auto w-full" disabled>
                          Book Class
                        </Button>
                      </div>
                    </div>
                  </ScrollAnimate>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {view === "schedule" ? (
          <section className="py-16">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-4 text-left font-display text-lg">Time</th>
                      <th className="px-4 py-4 text-left font-display text-lg">Monday</th>
                      <th className="px-4 py-4 text-left font-display text-lg">Tuesday</th>
                      <th className="px-4 py-4 text-left font-display text-lg">Wednesday</th>
                      <th className="px-4 py-4 text-left font-display text-lg">Thursday</th>
                      <th className="px-4 py-4 text-left font-display text-lg">Friday</th>
                      <th className="px-4 py-4 text-left font-display text-lg">Saturday</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleData.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-border transition-colors hover:bg-secondary/20"
                      >
                        <td className="px-4 py-4 font-semibold text-primary">{row.time}</td>
                        <td className="px-4 py-4 text-sm">{row.mon}</td>
                        <td className="px-4 py-4 text-sm">{row.tue}</td>
                        <td className="px-4 py-4 text-sm">{row.wed}</td>
                        <td className="px-4 py-4 text-sm">{row.thu}</td>
                        <td className="px-4 py-4 text-sm">{row.fri}</td>
                        <td className="px-4 py-4 text-sm">{row.sat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}
      </ComingSoonOverlay>

      <Footer />
    </div>
  );
}
