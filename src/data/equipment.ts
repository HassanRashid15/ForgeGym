export interface Equipment {
  id: string;
  name: string;
  category: string;
  image: string;
  shortDescription: string;
  longDescription: string;
  muscleGroups: string[];
  features: string[];
  howToUse: string[];
  tips: string[];
  quantity: number;
}

export const allEquipment: Equipment[] = [
  {
    id: "treadmill",
    name: "Technogym Treadmill",
    category: "Cardio",
    image: "/images/equipment-treadmill.jpg",
    shortDescription: "State-of-the-art treadmills with entertainment screens and performance tracking.",
    longDescription: "Our Technogym SKILLRUN treadmills are the gold standard in cardio equipment. Featuring a responsive running surface that adapts to your stride, built-in entertainment screens, and seamless connectivity with fitness apps. Whether you're walking, jogging, or sprinting, these machines provide a smooth, natural running experience.",
    muscleGroups: ["Quadriceps", "Hamstrings", "Calves", "Glutes", "Core"],
    features: [
      "Speed range: 0.5 - 30 km/h",
      "Incline range: -3% to 25%",
      "19-inch HD touchscreen display",
      "Heart rate monitoring",
      "Pre-programmed workouts",
      "Bluetooth connectivity"
    ],
    howToUse: [
      "Step onto the side rails before starting",
      "Attach the safety clip to your clothing",
      "Start at a slow walking pace",
      "Gradually increase speed and incline",
      "Maintain good posture throughout",
      "Cool down before stopping"
    ],
    tips: [
      "Look straight ahead, not at your feet",
      "Land midfoot, not on your heels",
      "Don't hold the handrails while running",
      "Start with interval training for better results"
    ],
    quantity: 15,
  },
  {
    id: "cable-machine",
    name: "Dual Cable Crossover",
    category: "Strength",
    image: "/images/equipment-cable.jpg",
    shortDescription: "Versatile cable machine for hundreds of exercises targeting every muscle group.",
    longDescription: "The Dual Cable Crossover is one of the most versatile pieces of equipment in our gym. With adjustable pulleys on both sides, you can perform hundreds of different exercises targeting virtually every muscle group. Perfect for both isolation exercises and functional training movements.",
    muscleGroups: ["Chest", "Back", "Shoulders", "Arms", "Core", "Legs"],
    features: [
      "Dual 200lb weight stacks",
      "17 height adjustments per side",
      "Wide variety of handle attachments",
      "Smooth, consistent resistance",
      "Built-in pull-up bar",
      "Integrated dip station"
    ],
    howToUse: [
      "Select appropriate weight on both stacks",
      "Adjust pulley height for your exercise",
      "Choose the correct handle attachment",
      "Maintain stable stance throughout movement",
      "Control the weight on both concentric and eccentric phases",
      "Return handles to starting position safely"
    ],
    tips: [
      "Start with lighter weight to master form",
      "Keep your core engaged throughout",
      "Don't let the weights crash down",
      "Experiment with different angles for muscle targeting"
    ],
    quantity: 4,
  },
  {
    id: "barbell-rack",
    name: "Olympic Barbell & Rack",
    category: "Strength",
    image: "/images/equipment-barbell.jpg",
    shortDescription: "Professional Olympic barbells and power racks for serious strength training.",
    longDescription: "Our Olympic barbell stations feature professional-grade equipment used by competitive athletes. The power racks include adjustable safety bars, multiple J-hook positions, and are paired with 20kg Olympic barbells and a full range of weight plates from 1.25kg to 25kg.",
    muscleGroups: ["Full Body", "Chest", "Back", "Legs", "Shoulders", "Arms"],
    features: [
      "20kg Olympic barbells (45lbs)",
      "Rubber-coated weight plates",
      "Adjustable safety spotter arms",
      "Multiple J-hook positions",
      "Built-in band pegs",
      "Weight plate storage"
    ],
    howToUse: [
      "Adjust rack height to appropriate level",
      "Set safety bars just below your lowest point",
      "Load plates evenly on both sides",
      "Secure weights with collars",
      "Unrack with control",
      "Re-rack weights after each set"
    ],
    tips: [
      "Always use a spotter for heavy lifts",
      "Master form with lighter weights first",
      "Grip the bar evenly using the knurling",
      "Breathe properly: exhale on exertion"
    ],
    quantity: 8,
  },
  {
    id: "rowing-machine",
    name: "Concept2 Rower",
    category: "Cardio",
    image: "/images/equipment-rowing.jpg",
    shortDescription: "The industry-standard rowing machine for full-body cardio workouts.",
    longDescription: "The Concept2 Model D is the world's most popular rowing machine, used by Olympic athletes and casual gym-goers alike. This full-body cardio machine provides a low-impact, high-calorie-burning workout that strengthens your entire body while improving cardiovascular fitness.",
    muscleGroups: ["Back", "Legs", "Arms", "Core", "Shoulders"],
    features: [
      "Air resistance (adjustable damper)",
      "PM5 performance monitor",
      "Bluetooth & ANT+ connectivity",
      "Nickel-plated chain",
      "Ergonomic handle",
      "Folds for storage"
    ],
    howToUse: [
      "Secure your feet in the footrests",
      "Adjust strap across the ball of your foot",
      "Start with legs bent, arms extended",
      "Drive through your legs first",
      "Then pull with your back and arms",
      "Return in reverse order: arms, body, legs"
    ],
    tips: [
      "Focus on leg drive, not arm pulling",
      "Keep your back straight, not rounded",
      "Damper setting 3-5 is ideal for most people",
      "Watch your stroke rate: 18-22 for endurance"
    ],
    quantity: 10,
  },
  {
    id: "kettlebells",
    name: "Competition Kettlebells",
    category: "Functional",
    image: "/images/equipment-kettlebell.jpg",
    shortDescription: "Full range of competition kettlebells for functional training and conditioning.",
    longDescription: "Our competition kettlebells range from 4kg to 48kg and feature a uniform size across all weights, making them ideal for learning proper technique. Kettlebells are perfect for dynamic, functional exercises that build strength, power, and cardiovascular endurance simultaneously.",
    muscleGroups: ["Full Body", "Core", "Shoulders", "Glutes", "Back"],
    features: [
      "Weight range: 4kg - 48kg",
      "Competition size (uniform dimensions)",
      "Color-coded by weight",
      "Steel construction",
      "Smooth, consistent handle",
      "Flat base for stability"
    ],
    howToUse: [
      "Start with a weight you can control",
      "Learn the hip hinge movement first",
      "Keep the weight close to your body",
      "Engage your core throughout",
      "Master the swing before advanced moves",
      "Progress gradually to heavier weights"
    ],
    tips: [
      "Power comes from your hips, not arms",
      "Keep your wrist straight",
      "Start with two-handed exercises",
      "Consider taking a kettlebell class first"
    ],
    quantity: 20,
  },
  {
    id: "leg-press",
    name: "Plate-Loaded Leg Press",
    category: "Strength",
    image: "/images/equipment-legpress.jpg",
    shortDescription: "Heavy-duty leg press machine for building serious lower body strength.",
    longDescription: "Our plate-loaded leg press allows you to safely train your legs with heavy loads. The 45-degree angle provides optimal resistance while reducing stress on your lower back. Perfect for building quadriceps, hamstrings, and glute strength without the balance requirements of squats.",
    muscleGroups: ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
    features: [
      "45-degree pressing angle",
      "800kg weight capacity",
      "Adjustable back support",
      "Multiple foot placement options",
      "Safety lock mechanism",
      "Smooth linear bearings"
    ],
    howToUse: [
      "Adjust the back pad for comfort",
      "Load plates evenly on both sides",
      "Place feet shoulder-width on platform",
      "Release the safety handles",
      "Lower weight until 90-degree knee bend",
      "Push through your heels to extend"
    ],
    tips: [
      "Don't lock out your knees at the top",
      "Keep your lower back pressed into the pad",
      "Adjust foot position to target different muscles",
      "Higher feet = more glute/hamstring emphasis"
    ],
    quantity: 3,
  },
];

export const getEquipmentById = (id: string): Equipment | undefined => {
  return allEquipment.find((e) => e.id === id);
};

export const equipmentCategories = ["All", "Cardio", "Strength", "Functional"];
