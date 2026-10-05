"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, ArrowLeft, ArrowRight } from "lucide-react";
import type { BlogPost } from "@/app/api/blog/route";

type BlogDetailClientProps = {
  post: BlogPost;
};

export default function BlogDetailClient({ post }: BlogDetailClientProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Image */}
      {post.imageUrl && (
        <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      {/* Content */}
      <article className="container mx-auto px-4 py-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          {/* Back Button */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          {/* Category Badge */}
          <span className="inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground mb-4">
            {post.category}
          </span>

          {/* Title */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-border pb-8">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <div className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {post.content}
            </div>
          </div>

          {/* Related Posts */}
          <div className="mt-16 pt-12 border-t border-border">
            <h2 className="font-display text-2xl mb-6">More Articles</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" asChild>
                <Link href="/blog">
                  View All Posts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
