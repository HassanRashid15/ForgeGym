"use client";

import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const images = [
  {
    name: "Image One",
    image: "/images/image_one.png",
  },
  {
    name: "Image Two",
    image: "/images/image_two.png",
  },
  {
    name: "Image Three",
    image: "/images/image_three.png",
  },
  {
    name: "Image Four",
    image: "/images/image_four.png",
  },
  {
    name: "Image Five",
    image: "/images/image_five.png",
  },
  {
    name: "Image Six",
    image: "/images/image_six.png",
  },
];

export function TestimonialSection() {
  return (
    <section className="border-t border-border bg-background py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 text-left md:mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary md:text-sm">
            What we focus on
          </p>
          <div className="mb-3 flex items-center gap-3 md:mb-4">
            <span
              className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
              aria-hidden
            />
            <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
              <span className="text-foreground">BUILT AROUND </span>
              <span className="inline-block pr-[0.1em] text-primary">
                REAL TRAINING
              </span>
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base lg:text-lg">
            Honest progress from the floor up — members, coaches, and partner
            gyms shaping Forge with real feedback.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
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
                  <div className="relative aspect-[21/9] max-h-[420px] w-full overflow-hidden bg-card">
                    <Image
                      className="object-cover"
                      src={image.image}
                      alt={image.name}
                      fill
                      sizes="(max-width: 1280px) 100vw, 1280px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                    <div className="absolute left-3 top-3 z-10 sm:left-4 sm:top-4">
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
