"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SeoManager = () => {
  const pathname = usePathname();

  useEffect(() => {
    const pageTitle = getTitleByPath(pathname);
    const pageDescription = getDescriptionByPath(pathname);
    
    document.title = pageTitle;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", pageDescription);
    }
    
    // Update Open Graph title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", pageTitle);
    }
    
    // Update Open Graph description
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute("content", pageDescription);
    }
  }, [pathname]);

  return null;
};

function getTitleByPath(pathname: string): string {
  const baseTitle = "Gym Journey Hub";
  
  const titles: Record<string, string> = {
    "/": `${baseTitle} - Your Fitness Journey Starts Here`,
    "/classes": `${baseTitle} - Fitness Classes`,
    "/equipment": `${baseTitle} - Gym Equipment`,
    "/membership": `${baseTitle} - Membership Plans`,
    "/trainers": `${baseTitle} - Expert Trainers`,
    "/about": `${baseTitle} - About Us`,
    "/contact": `${baseTitle} - Contact Us`,
    "/login": `${baseTitle} - Login`,
    "/register": `${baseTitle} - Register`,
    "/dashboard": `${baseTitle} - Dashboard`,
  };

  // Handle dynamic routes
  if (pathname.startsWith("/classes/")) {
    return `${baseTitle} - Class Details`;
  }
  if (pathname.startsWith("/equipment/")) {
    return `${baseTitle} - Equipment Details`;
  }
  if (pathname.startsWith("/trainers/")) {
    return `${baseTitle} - Trainer Profile`;
  }

  return titles[pathname] || baseTitle;
}

function getDescriptionByPath(pathname: string): string {
  const descriptions: Record<string, string> = {
    "/": "Transform your fitness journey with Gym Journey Hub. Access classes, equipment, trainers, and personalized workout plans.",
    "/classes": "Explore our diverse fitness classes including HIIT, Yoga, Spin, and more. Find the perfect workout for your goals.",
    "/equipment": "Discover our state-of-the-art gym equipment. From cardio machines to strength training gear, we have it all.",
    "/membership": "Choose the perfect membership plan for your fitness goals. Flexible options for every budget and schedule.",
    "/trainers": "Meet our expert personal trainers. Get personalized guidance and achieve your fitness goals faster.",
    "/about": "Learn about Gym Journey Hub's mission to transform lives through fitness and wellness.",
    "/contact": "Get in touch with Gym Journey Hub. We're here to help you start your fitness journey.",
    "/login": "Access your Gym Journey Hub account to track your progress and manage your membership.",
    "/register": "Join Gym Journey Hub today and start your fitness journey with exclusive member benefits.",
    "/dashboard": "Manage your fitness journey, track progress, and access personalized workouts in your dashboard.",
  };

  // Handle dynamic routes
  if (pathname.startsWith("/classes/")) {
    return "View detailed information about this fitness class including schedule, instructor, and requirements.";
  }
  if (pathname.startsWith("/equipment/")) {
    return "Learn more about this gym equipment, including features, benefits, and proper usage instructions.";
  }
  if (pathname.startsWith("/trainers/")) {
    return "Get to know our trainer's expertise, certifications, and training philosophy.";
  }

  return descriptions[pathname] || "Transform your fitness journey with Gym Journey Hub.";
}

export default SeoManager;
