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

export function TestimonialSection() {
  return (
    <section className="bg-gradient-to-b from-card/30 to-background py-16 md:py-24">
      <div className="px-0a">
        <div className="mb-8 md:mb-12 text-center">
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4">
            What Our Members Says
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
            Real experiences from our growing community of fitness enthusiasts and gym owners
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
