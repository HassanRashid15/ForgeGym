"use client";

import { useState } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { TextType } from "@/components/marketing/TextType";

const images = [
  {
    name: "Image One",
    image: "/images/image_one.png"
  },
  {
    name: "Image Two", 
    image: "/images/image_two.png"
  },
  {
    name: "Image Three",
    image: "/images/image_three.png"
  },
  {
    name: "Image Four",
    image: "/images/image_four.png"
  },
  {
    name: "Image Five",
    image: "/images/image_five.png"
  },
  {
    name: "Image Six",
    image: "/images/image_six.png"
  }
];

const focusHeadings = [
  "Real Members",
  "Gym Owners",
  "Daily Grind",
  "Community Wins",
  "Partner Gyms",
];

const focusDescriptions = [
  "Stories from people training on Forge every week.",
  "How gym owners run memberships, approvals, and growth.",
  "Honest progress — not hype — from the floor up.",
  "A community that shows up, checks in, and levels up.",
  "Partner facilities shaping Forge with real feedback.",
];

export function TestimonialSection() {
  const [focusIndex, setFocusIndex] = useState(0);

  return (
    <section className="bg-gradient-to-b from-card/30 to-background py-16 md:py-24">
      <div className="px-0">
        <div className="mb-8 md:mb-12 px-4 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary md:text-sm">
            What we focus on
          </p>
          <h2 className="font-display mb-3 text-2xl font-bold text-foreground md:mb-4 md:text-3xl lg:text-4xl">
            <span className="block text-muted-foreground">Built around</span>
            <span className="relative mx-auto mt-1 block min-h-[1.15em] text-primary">
              <span className="invisible block whitespace-nowrap" aria-hidden>
                Community Wins
              </span>
              <span className="absolute inset-x-0 top-0">
                <TextType
                  as="span"
                  text={focusHeadings}
                  typingSpeed={48}
                  deletingSpeed={28}
                  pauseDuration={2600}
                  initialDelay={200}
                  loop
                  showCursor
                  cursorCharacter="|"
                  cursorClassName="text-primary"
                  className="inline whitespace-nowrap"
                  startOnVisible
                  onSentenceComplete={(_sentence, index) =>
                    setFocusIndex((index + 1) % focusHeadings.length)
                  }
                />
              </span>
            </span>
          </h2>
          <p
            key={focusIndex}
            className="mx-auto max-w-2xl animate-in fade-in duration-500 text-sm text-muted-foreground md:text-base lg:text-lg"
          >
            {focusDescriptions[focusIndex]}
          </p>
        </div>

        <div className="relative">
          <Carousel
            plugins={[
              Autoplay({
                delay: 3000,
                stopOnInteraction: false,
              }),
            ]}
            opts={{
              align: "start",
              loop: true,
              duration: 20,
            }}
            className="w-full"
          >
            <CarouselContent>
              {images.map((image) => (
                <CarouselItem key={image.name} className="basis-full">
                  <div className="relative aspect-video overflow-hidden shadow-sm hover:shadow-md transition-shadow max-h-[500px] w-full">
                    <Image
                    className="w-full"
                      src={image.image}
                      alt={image.name}
                      fill
                      sizes="100vw"
                    />
                    <div className="absolute top-3 left-3 z-10 sm:top-4 sm:left-4">
                      <Image
                        src="/preloader_logo.png"
                        alt="Forge"
                        width={176}
                        height={44}
                        className="h-9 w-11 object-contain sm:h-9 sm:w-36 md:h-11 md:w-44"
                      />
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
}
