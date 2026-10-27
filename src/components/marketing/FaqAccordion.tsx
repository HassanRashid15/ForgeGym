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
    answer:
      "Create a free account, browse partner gyms and trainers, then request to join a gym. After the gym approves you, you can use member tools like progress tracking. Class booking and online checkout are coming in a later phase.",
  },
  {
    id: "home-3",
    question: "Is Forge free to use?",
    answer:
      "Browsing gyms, trainers, and creating an account are free. Membership fees are set by the partner gym you join and are usually paid at the gym during soft launch.",
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
    answer:
      "Join the trainer's gym through Forge first. After you're a member, you can request that trainer from your dashboard. In-app session booking ships in a later phase.",
  },
  {
    id: "trainers-4",
    question: "Can I train with a trainer from any gym?",
    answer: "Trainers are affiliated with specific gyms. You'll need to join or have access to the gym where the trainer works to train with them. Some trainers may also offer virtual training options."
  }
];

const membershipPageFaqs: FaqItem[] = [
  {
    id: "membership-1",
    question: "Can I change my plan later?",
    answer:
      "Yes — plan changes are handled with your partner gym. During soft launch, talk to the gym desk or your gym owner on Forge; online plan switches ship in a later phase.",
  },
  {
    id: "membership-2",
    question: "Is there a contract or cancellation fee?",
    answer:
      "Forge itself doesn’t lock you into a platform contract. Each partner gym sets its own membership terms — ask them before you join.",
  },
  {
    id: "membership-3",
    question: "What's included in every membership?",
    answer:
      "What’s included depends on the partner gym you join (floor access, trainers, classes, hours). Check the gym’s profile on Forge for facilities and fees.",
  },
  {
    id: "membership-4",
    question: "Do you offer yearly billing?",
    answer:
      "Some partner gyms offer monthly or longer plans. Choose a gym on Forge and confirm pricing with them — platform yearly checkout isn’t live yet.",
  },
  {
    id: "membership-5",
    question: "How do I pay and get started?",
    answer:
      "Online checkout is coming soon. For now, pick a plan, join a partner gym through Forge, and complete payment at the front desk to activate your membership.",
  },
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
        <ScrollAnimate animation="fade-up" className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            {title}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item) => (
              <AccordionItem key={item.id} value={item.id} className="border-border">
                <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline hover:text-primary">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
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
  return <FaqSection faqs={gymsPageFaqs} />;
}

export function TrainersPageFaq() {
  return <FaqSection faqs={trainersPageFaqs} />;
}

export function MembershipPageFaq() {
  return <FaqSection faqs={membershipPageFaqs} />;
}
