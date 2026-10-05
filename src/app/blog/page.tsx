import { Suspense } from "react";
import { BlogSection } from "@/components/marketing/BlogSection";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Blog - Forge Gym",
  description: "Stay updated with the latest fitness advice, nutrition tips, and workout strategies from our expert team.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div>Loading...</div>}>
        <BlogSection />
      </Suspense>
    </div>
  );
}
