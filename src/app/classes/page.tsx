"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Clock, Flame, Users, Calendar } from "lucide-react";
import { allClasses, categories } from "@/data/classes";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
// import { usePageLoading } from "@/hooks/usePageLoading";
// import PageSkeleton from "@/components/skeletons/PageSkeleton";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";

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
  // const isLoading = usePageLoading(500);

  const filteredClasses = activeCategory === "All"
    ? allClasses
    : allClasses.filter((c) => c.category === activeCategory);

  // Preloader commented out for now
  // if (isLoading) {
  //   return <PageSkeleton variant="classes" />;
  // }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-16 bg-card">
        <InteractiveBackground variant="gradient" />
        <div className="container mx-auto px-4 relative z-10">

          <ScrollAnimate animation="fade-up">
            <h1 className="font-display text-6xl md:text-8xl mb-4">
              OUR <span className="text-gradient">CLASSES</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              From high-intensity training to mindful yoga, we offer classes for every fitness level and goal.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* View Toggle & Filters */}
      <section className="py-8 border-b border-border sticky top-16 bg-background/80 backdrop-blur-lg z-40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            </div>
            
            {view === "classes" && (
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
            )}
          </div>
        </div>
      </section>

      {/* Classes Grid */}
      {view === "classes" && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredClasses.map((classItem, index) => (
                <ScrollAnimate
                  key={classItem.id}
                  animation="fade-up"
                  delay={index * 0.1}
                >
                  <div className="glass-card rounded-xl overflow-hidden hover-lift group h-full flex flex-col">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={classItem.image}
                        alt={classItem.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                          {classItem.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="font-display text-2xl mb-2">{classItem.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4">{classItem.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm mb-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4 text-primary" />
                          {classItem.duration}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Flame className="w-4 h-4 text-primary" />
                          {classItem.intensity}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4 text-primary" />
                          {classItem.spots} spots left
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {classItem.schedule.slice(0, 3).map((time, i) => (
                          <span key={i} className="px-2 py-1 bg-secondary text-xs rounded">
                            {time}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">
                        Instructor: <span className="text-foreground">{classItem.trainer}</span>
                      </p>

                      <Button className="w-full mt-auto" asChild>
                        <Link href={`/classes/${classItem.id}`}>Book Class</Link>
                      </Button>
                    </div>
                  </div>
                </ScrollAnimate>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Schedule View */}
      {view === "schedule" && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <ScrollAnimate animation="fade-up">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-4 px-4 font-display text-lg">Time</th>
                      <th className="text-left py-4 px-4 font-display text-lg">Monday</th>
                      <th className="text-left py-4 px-4 font-display text-lg">Tuesday</th>
                      <th className="text-left py-4 px-4 font-display text-lg">Wednesday</th>
                      <th className="text-left py-4 px-4 font-display text-lg">Thursday</th>
                      <th className="text-left py-4 px-4 font-display text-lg">Friday</th>
                      <th className="text-left py-4 px-4 font-display text-lg">Saturday</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleData.map((row, index) => (
                      <tr key={index} className="border-b border-border hover:bg-secondary/20 transition-colors">
                        <td className="py-4 px-4 font-semibold text-primary">{row.time}</td>
                        <td className="py-4 px-4 text-sm">{row.mon}</td>
                        <td className="py-4 px-4 text-sm">{row.tue}</td>
                        <td className="py-4 px-4 text-sm">{row.wed}</td>
                        <td className="py-4 px-4 text-sm">{row.thu}</td>
                        <td className="py-4 px-4 text-sm">{row.fri}</td>
                        <td className="py-4 px-4 text-sm">{row.sat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollAnimate>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}