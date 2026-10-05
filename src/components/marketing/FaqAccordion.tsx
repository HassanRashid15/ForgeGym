"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const homePageFaqs: FaqItem[] = [
  {
    id: "home-1",
    question: "What is Forge?",
    answer: "Forge is a fitness platform that connects you with top-rated gyms and certified personal trainers. We help you find the perfect fitness environment based on your location, goals, and preferences."
  },
  {
    id: "home-2",
    question: "How do I get started?",
    answer: "Simply create a free account to browse gyms and trainers in your area. Once you find a gym that suits your needs, you can sign up directly through our platform and start your fitness journey."
  },
  {
    id: "home-3",
    question: "Is Forge free to use?",
    answer: "Yes! Browsing gyms, viewing trainer profiles, and creating an account are completely free. Membership fees are paid directly to the gym you choose to join."
  },
  {
    id: "home-4",
    question: "How are gyms vetted?",
    answer: "All partner gyms on Forge are carefully vetted and approved. We verify their facilities, equipment, and trainer certifications to ensure you have access to quality fitness environments."
  }
];

const gymsPageFaqs: FaqItem[] = [
  {
    id: "gyms-1",
    question: "How do I find gyms near me?",
    answer: "Use the 'Near me' button to sort gyms by distance from your current location. You can also filter by city and gym type to find exactly what you're looking for."
  },
  {
    id: "gyms-2",
    question: "What information is shown for each gym?",
    answer: "Each gym profile includes photos, facilities, services, pricing, member count, location, and trainer information. You'll have everything you need to make an informed decision."
  },
  {
    id: "gyms-3",
    question: "Can I visit a gym before joining?",
    answer: "Yes! We encourage you to visit gyms before committing. Contact the gym directly through their profile to schedule a tour or ask about trial memberships."
  },
  {
    id: "gyms-4",
    question: "How do gym memberships work?",
    answer: "Membership plans vary by gym. When you find a gym you like, you'll be connected directly with them to sign up for their membership plans. All payments and contracts are handled by the gym."
  }
];

const trainersPageFaqs: FaqItem[] = [
  {
    id: "trainers-1",
    question: "How do I choose a trainer?",
    answer: "Browse trainer profiles to see their specializations, certifications, experience, and the gym they work at. You can also read their bio and view their gym's facilities to find the right match."
  },
  {
    id: "trainers-2",
    question: "Are all trainers certified?",
    answer: "Yes, all trainers listed on Forge are certified professionals. We verify their certifications and require them to maintain current credentials."
  },
  {
    id: "trainers-3",
    question: "How do I book a training session?",
    answer: "Once you find a trainer you like, you can contact them directly through their profile to schedule sessions. Many trainers offer free initial consultations."
  },
  {
    id: "trainers-4",
    question: "Can I train with a trainer from any gym?",
    answer: "Trainers are affiliated with specific gyms. You'll need to join or have access to the gym where the trainer works to train with them. Some trainers may also offer virtual training options."
  }
];

interface FaqSectionProps {
  faqs: FaqItem[];
  title?: string;
  className?: string;
}

export function FaqSection({ faqs, title = "Frequently Asked Questions", className = "" }: FaqSectionProps) {
  return (
    <section className={`bg-background py-16 md:py-24 ${className}`}>
      <div className="container mx-auto px-4">
        <ScrollAnimate animation="fade-up" className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            {title}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollAnimate>
      </div>
    </section>
  );
}

export function HomePageFaq() {
  return <FaqSection faqs={homePageFaqs} />;
}

export function GymsPageFaq() {
  return <FaqSection faqs={gymsPageFaqs} title="Gym FAQ" />;
}

export function TrainersPageFaq() {
  return <FaqSection faqs={trainersPageFaqs} title="Trainer FAQ" />;
}
