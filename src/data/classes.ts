import classHiit from "@/assets/class-hiit.jpg";
import classYoga from "@/assets/class-yoga.jpg";
import classSpin from "@/assets/class-spin.jpg";
import type { StaticImageData } from "next/image";

export interface GymClass {
  id: string;
  name: string;
  category: string;
  image: string | StaticImageData;
  duration: string;
  intensity: "Low" | "Medium" | "High";
  trainer: string;
  schedule: string[];
  description: string;
  longDescription: string;
  spots: number;
  maxSpots: number;
  benefits: string[];
  requirements: string[];
  calories: string;
}

export const allClasses: GymClass[] = [
  {
    id: "power-hiit",
    name: "Power HIIT",
    category: "HIIT",
    image: classHiit,
    duration: "45 min",
    intensity: "High",
    trainer: "Marcus Johnson",
    schedule: ["Mon 6:00 AM", "Wed 6:00 AM", "Fri 6:00 AM"],
    description: "High-intensity interval training to maximize calorie burn and boost metabolism.",
    longDescription: "Power HIIT is our flagship high-intensity interval training class designed to push your limits and maximize results. This 45-minute session alternates between intense bursts of exercise and short recovery periods, keeping your heart rate elevated throughout. Perfect for those looking to burn maximum calories, improve cardiovascular fitness, and build lean muscle. Our certified trainers will guide you through a variety of movements including burpees, box jumps, kettlebell swings, and more.",
    spots: 8,
    maxSpots: 20,
    benefits: [
      "Burns up to 500 calories per session",
      "Improves cardiovascular endurance",
      "Boosts metabolism for hours after workout",
      "Builds lean muscle mass",
      "Increases mental toughness"
    ],
    requirements: [
      "Moderate fitness level recommended",
      "Comfortable athletic wear",
      "Water bottle",
      "Towel"
    ],
    calories: "400-600",
  },
  {
    id: "power-yoga",
    name: "Power Yoga",
    category: "Mind & Body",
    image: classYoga,
    duration: "60 min",
    intensity: "Medium",
    trainer: "Lisa Chen",
    schedule: ["Tue 7:00 AM", "Thu 7:00 AM", "Sat 9:00 AM"],
    description: "A vigorous, fitness-based approach to vinyasa-style yoga.",
    longDescription: "Power Yoga combines traditional yoga poses with strength training elements for a complete mind-body workout. This 60-minute class focuses on building strength, flexibility, and balance while incorporating breathwork and mindfulness. Unlike traditional yoga, Power Yoga moves at a faster pace and emphasizes holding challenging poses. Perfect for those who want the benefits of yoga with an added fitness component.",
    spots: 12,
    maxSpots: 25,
    benefits: [
      "Improves flexibility and balance",
      "Builds core strength",
      "Reduces stress and anxiety",
      "Enhances mind-body connection",
      "Promotes better posture"
    ],
    requirements: [
      "All fitness levels welcome",
      "Yoga mat (provided if needed)",
      "Comfortable, stretchy clothing",
      "Empty stomach recommended"
    ],
    calories: "200-400",
  },
  {
    id: "spin-revolution",
    name: "Spin Revolution",
    category: "Cardio",
    image: classSpin,
    duration: "50 min",
    intensity: "High",
    trainer: "James Wilson",
    schedule: ["Mon 5:30 PM", "Wed 5:30 PM", "Sat 10:00 AM"],
    description: "Indoor cycling class with music-driven workouts and immersive lighting.",
    longDescription: "Spin Revolution is an electrifying indoor cycling experience that combines high-energy music, immersive lighting, and motivating instruction. This 50-minute ride will take you through hills, sprints, and intervals designed to torch calories and build lower body strength. Our state-of-the-art bikes provide real-time metrics so you can track your progress and push your limits.",
    spots: 5,
    maxSpots: 30,
    benefits: [
      "Low impact, high results",
      "Strengthens legs and core",
      "Burns 500-700 calories",
      "Improves cardiovascular health",
      "Great for all fitness levels"
    ],
    requirements: [
      "Cycling shoes optional (we have clip-ins)",
      "Water bottle essential",
      "Arrive 10 min early for bike setup",
      "Towel recommended"
    ],
    calories: "500-700",
  },
  {
    id: "strength-sculpt",
    name: "Strength & Sculpt",
    category: "Strength",
    image: classHiit,
    duration: "55 min",
    intensity: "High",
    trainer: "Sarah Miller",
    schedule: ["Tue 6:00 PM", "Thu 6:00 PM"],
    description: "Build lean muscle and increase strength with this total-body workout.",
    longDescription: "Strength & Sculpt is a comprehensive strength training class that targets all major muscle groups. Using a combination of free weights, resistance bands, and bodyweight exercises, you'll build lean muscle, increase bone density, and boost your metabolism. Our experienced trainers ensure proper form and provide modifications for all fitness levels.",
    spots: 10,
    maxSpots: 20,
    benefits: [
      "Builds lean muscle mass",
      "Increases metabolism",
      "Improves bone density",
      "Enhances functional strength",
      "Tones and defines muscles"
    ],
    requirements: [
      "All fitness levels welcome",
      "Athletic footwear required",
      "Weights provided",
      "Water bottle"
    ],
    calories: "300-500",
  },
  {
    id: "meditation-flow",
    name: "Meditation Flow",
    category: "Mind & Body",
    image: classYoga,
    duration: "30 min",
    intensity: "Low",
    trainer: "Lisa Chen",
    schedule: ["Daily 7:00 AM"],
    description: "Start your day with guided meditation and gentle stretching.",
    longDescription: "Meditation Flow is a calming 30-minute session that combines guided meditation with gentle stretching and breathwork. Perfect for beginners or anyone looking to reduce stress, improve focus, and start their day with clarity. This class emphasizes mindfulness, relaxation, and mental wellness.",
    spots: 20,
    maxSpots: 30,
    benefits: [
      "Reduces stress and anxiety",
      "Improves mental clarity",
      "Enhances sleep quality",
      "Promotes emotional balance",
      "Increases self-awareness"
    ],
    requirements: [
      "No experience needed",
      "Comfortable clothing",
      "Open mind",
      "Yoga mat (optional)"
    ],
    calories: "50-100",
  },
  {
    id: "cardio-blast",
    name: "Cardio Blast",
    category: "Cardio",
    image: classSpin,
    duration: "45 min",
    intensity: "High",
    trainer: "Marcus Johnson",
    schedule: ["Mon 12:00 PM", "Wed 12:00 PM", "Fri 12:00 PM"],
    description: "Fast-paced cardio workout combining dance moves and aerobic exercises.",
    longDescription: "Cardio Blast is an exhilarating 45-minute cardio session that combines dance-inspired movements, kickboxing, and aerobic exercises. The constantly changing choreography keeps you engaged while the upbeat music motivates you to push harder. Perfect for those who find traditional cardio boring and want a fun, social workout experience.",
    spots: 15,
    maxSpots: 25,
    benefits: [
      "Burns 400-600 calories",
      "Improves coordination",
      "Boosts cardiovascular fitness",
      "Reduces stress through movement",
      "Fun, social atmosphere"
    ],
    requirements: [
      "No dance experience needed",
      "Supportive athletic shoes",
      "Water bottle",
      "Positive attitude!"
    ],
    calories: "400-600",
  },
];

export const getClassById = (id: string): GymClass | undefined => {
  return allClasses.find((c) => c.id === id);
};

export const categories = ["All", "Cardio", "Strength", "Mind & Body", "HIIT"];
