"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, ArrowRight, User } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  imageUrl: string | null;
  category: string;
  readTime: string;
}

export function BlogSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch("/api/blog");
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        console.error("Failed to fetch blog posts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-2xl mb-4" />
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <ScrollAnimate animation="fade-up" className="mb-12">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            Blog
          </p>
          <h2 className="font-display text-4xl md:text-5xl mb-4">
            Latest Fitness Tips
          </h2>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Stay updated with the latest fitness advice, nutrition tips, and workout
            strategies from our expert team.
          </p>
        </ScrollAnimate>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <ScrollAnimate
              key={post.id}
              animation="fade-up"
              delay={index * 0.1}
            >
              <Link
                href={`/blog/${post.id}`}
                className="group block h-full"
              >
                <article className="glass-card hover-lift h-full overflow-hidden rounded-2xl bg-card transition-all duration-300">
                  {post.imageUrl && (
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                          {post.category}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-6">
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="font-display mb-2 text-xl font-bold leading-tight transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>
                    <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between border-t border-border/60 pt-4">
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        {post.author}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                        Read more
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            </ScrollAnimate>
          ))}
        </div>

        <ScrollAnimate animation="fade-up" className="mt-12 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            View All Posts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </ScrollAnimate>
      </div>
    </section>
  );
}
