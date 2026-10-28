"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, ArrowLeft, ArrowRight, Dumbbell } from "lucide-react";
import type { BlogPost } from "@/app/api/blog/route";

type BlogDetailClientProps = {
  post: BlogPost;
};

/** Remove cover/card image if Dev.to also embeds it as the first content image. */
function contentWithoutCoverImage(html: string, coverUrl: string | null | undefined) {
  if (!html || !coverUrl) return html;
  try {
    const coverPath = new URL(coverUrl).pathname;
    return html.replace(/<p>\s*<img\b[^>]*>\s*<\/p>/i, (block) => {
      const src = block.match(/src=["']([^"']+)["']/i)?.[1];
      if (!src) return block;
      try {
        if (new URL(src, coverUrl).pathname === coverPath) return "";
      } catch {
        if (src === coverUrl || src.includes(coverPath)) return "";
      }
      return block;
    }).replace(/^\s*<img\b[^>]*>\s*/i, (block) => {
      const src = block.match(/src=["']([^"']+)["']/i)?.[1];
      if (!src) return block;
      try {
        if (new URL(src, coverUrl).pathname === coverPath) return "";
      } catch {
        if (src === coverUrl || src.includes(coverPath)) return "";
      }
      return block;
    });
  } catch {
    return html;
  }
}

export default function BlogDetailClient({ post }: BlogDetailClientProps) {
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const articleHtml = contentWithoutCoverImage(post.content, post.imageUrl);

  useEffect(() => {
    async function fetchRelatedPosts() {
      try {
        const response = await fetch("/api/blog");
        const data: BlogPost[] = await response.json();
        // Filter out current post and get 3 related posts
        const related = data
          .filter((p) => p.id !== post.id)
          .slice(0, 3);
        setRelatedPosts(related);
      } catch (error) {
        console.error("Failed to fetch related posts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRelatedPosts();
  }, [post.id]);

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
      <article className="mx-auto max-w-7xl px-4 py-12 md:py-20">
        <div className="max-w-full">
          {/* Back Button */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          {/* Category Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <span className="inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
              {post.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-border pb-8">
            <span className="flex items-center gap-2">
              {post.authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.authorAvatar}
                  alt={post.author}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
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

          {/* Article body — inline images from content only (not the card cover) */}
          <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-display prose-p:text-muted-foreground prose-strong:text-red-600 prose-a:text-red-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline hover:prose-a:text-red-700 prose-img:mx-auto prose-img:my-8 prose-img:max-h-[32rem] prose-img:w-full prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:object-cover prose-figure:my-8">
            <div
              className="leading-relaxed"
              dangerouslySetInnerHTML={{ __html: articleHtml }}
            />
          </div>

          {/* Related Posts */}
          <div className="mt-16 pt-12 border-t border-border">
            <div className="mb-6 flex items-center gap-3">
              <span
                className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                More Articles
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-40 bg-muted rounded-lg mb-4" />
                    <div className="h-5 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : relatedPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/blog/${relatedPost.id}`}
                    className="group block h-full"
                  >
                    <article className="glass-card hover-lift h-full overflow-hidden rounded-lg bg-card transition-all duration-300">
                      {relatedPost.imageUrl && (
                        <div className="relative aspect-square bg-muted/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={relatedPost.imageUrl}
                            alt={relatedPost.title}
                            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute top-3 left-3">
                            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                              {relatedPost.category}
                            </span>
                          </div>
                          <div className="absolute top-3 right-3 flex items-center gap-2">
                            {relatedPost.authorAvatar ? (
                              <div className="flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-sm px-3 py-1">
                                <img
                                  src={relatedPost.authorAvatar}
                                  alt={relatedPost.author}
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                                <span className="text-xs font-semibold text-white">
                                  {relatedPost.author}
                                </span>
                              </div>
                            ) : (
                              <span className="rounded-full bg-black/50 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                                {relatedPost.author}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {!relatedPost.imageUrl && (
                        <div className="relative aspect-square bg-muted/30 flex items-center justify-between p-3">
                          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                            {relatedPost.category}
                          </span>
                          <span className="rounded-full bg-black/50 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                            {relatedPost.author}
                          </span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {relatedPost.readTime}
                        </div>
                        <h3 className="font-display mb-2 text-lg font-bold leading-tight transition-colors group-hover:text-primary">
                          {relatedPost.title}
                        </h3>
                        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                        <div className="flex items-center justify-between border-t border-border/60 pt-3">
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/navlogolight.png"
                              alt="Forge"
                              className="h-4 w-4 rounded-full object-cover"
                            />
                            Blogs by Forge
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                            Read more
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" asChild>
                  <Link href="/blog">
                    View All Posts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
