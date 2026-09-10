export interface Trainer {
  id: string;
  name: string;
  role: string;
  image: string;
  bio: string;
  longBio: string;
  certifications: string[];
  specialties: string[];
  experience: string;
  clients: string;
  rating: string;
  instagram: string;
  email: string;
  schedule: string[];
}

export const allTrainers: Trainer[] = [
  {
    id: "marcus-johnson",
    name: "Marcus Johnson",
    role: "Head Trainer & HIIT Specialist",
    image: "/images/trainer-1.jpg",
    bio: "With 12 years of experience, Marcus specializes in high-intensity training and functional fitness. He's helped hundreds of clients achieve their body transformation goals.",
    longBio:
      "Marcus began his fitness career as a competitive athlete before transitioning to coaching. Over 12 years, he has trained everyone from beginners to professional athletes, developing signature HIIT programs that maximize fat loss while preserving lean muscle. He believes fitness is 20% training, 80% consistency and mindset.",
    certifications: ["NASM-CPT", "CrossFit Level 2", "TRX Certified"],
    specialties: ["HIIT", "Weight Loss", "Strength Training"],
    experience: "12 years",
    clients: "500+",
    rating: "4.9",
    instagram: "#",
    email: "marcus@forgegym.com",
    schedule: ["Mon 6:00 AM", "Wed 6:00 AM", "Fri 6:00 AM", "Sat 9:00 AM"],
  },
  {
    id: "sarah-miller",
    name: "Sarah Miller",
    role: "Strength & Conditioning Coach",
    image: "/images/trainer-2.jpg",
    bio: "Sarah is a former competitive powerlifter who now dedicates her expertise to helping clients build strength safely and effectively.",
    longBio:
      "A national-level powerlifter with over a decade under the bar, Sarah brings unmatched technical precision to strength coaching. She specializes in progressive overload programming and helps clients smash plateaus while staying injury-free.",
    certifications: ["CSCS", "USAW Level 1", "Precision Nutrition L1"],
    specialties: ["Powerlifting", "Olympic Lifting", "Muscle Building"],
    experience: "10 years",
    clients: "350+",
    rating: "5.0",
    instagram: "#",
    email: "sarah@forgegym.com",
    schedule: ["Tue 6:00 PM", "Thu 6:00 PM", "Sat 10:00 AM"],
  },
  {
    id: "james-wilson",
    name: "James Wilson",
    role: "Cardio & Endurance Specialist",
    image: "/images/trainer-3.jpg",
    bio: "A former marathon runner, James brings his passion for endurance sports to our spin and cardio classes. He makes cardio fun and challenging.",
    longBio:
      "Boston Marathon finisher turned certified coach, James blends endurance science with high-energy group instruction. His spin sessions are legendary — expect hills, sprints, and a soundtrack that pushes you past your limit.",
    certifications: ["ACE-CPT", "Spinning Certified", "First Aid/CPR"],
    specialties: ["Spin Classes", "Running Programs", "Cardio Training"],
    experience: "8 years",
    clients: "400+",
    rating: "4.8",
    instagram: "#",
    email: "james@forgegym.com",
    schedule: ["Mon 5:30 PM", "Wed 5:30 PM", "Sat 10:00 AM"],
  },
  {
    id: "lisa-chen",
    name: "Lisa Chen",
    role: "Yoga & Mindfulness Instructor",
    image: "/images/trainer-4.jpg",
    bio: "Lisa trained in India and brings an authentic approach to yoga and meditation. She specializes in helping clients find balance between physical and mental wellness.",
    longBio:
      "Trained in Rishikesh and Mysore, Lisa teaches yoga that honors tradition while meeting modern bodies where they are. Her classes weave breathwork, movement, and meditation into a single grounding practice.",
    certifications: ["RYT-500", "Meditation Teacher", "Breathwork Certified"],
    specialties: ["Vinyasa Yoga", "Meditation", "Stress Reduction"],
    experience: "9 years",
    clients: "600+",
    rating: "5.0",
    instagram: "#",
    email: "lisa@forgegym.com",
    schedule: ["Daily 7:00 AM", "Tue 7:00 AM", "Thu 7:00 AM"],
  },
];

export const getTrainerById = (id: string): Trainer | undefined =>
  allTrainers.find((t) => t.id === id);
