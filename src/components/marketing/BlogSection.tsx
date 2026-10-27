"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorAvatar: string | null;
  publishedAt: string;
  imageUrl: string | null;
  category: string;
  readTime: string;
}

const PAGE_SIZE = 6;

type BlogSectionProps = {
  /** Cap posts for homepage preview; omit to show all (paginated) */
  limit?: number;
  showViewAll?: boolean;
  /** Extra top padding when page already has a hero */
  compact?: boolean;
  /** Paginate full listing (6 per page). Ignored when `limit` is set. */
  paginate?: boolean;
};

function BlogCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="aspect-[16/10] bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-2/5 rounded bg-muted" />
        <div className="h-5 w-full rounded bg-muted" />
        <div className="h-5 w-4/5 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="mt-4 h-10 border-t border-border/40 pt-4">
          <div className="h-4 w-1/2 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.id}`} className="group flex h-full">
      <article className="glass-card hover-lift flex h-full w-full flex-col overflow-hidden rounded-2xl bg-card transition-all duration-300">
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-muted/40">
          {post.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.imageUrl}
              alt={post.title}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-muted to-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/forgeicon.png"
                alt=""
                className="h-12 w-12 opacity-40"
              />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />

          <div className="absolute left-3 top-3 z-10 max-w-[45%]">
            <span className="inline-block truncate rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {post.category}
            </span>
          </div>

          <div className="absolute right-3 top-3 z-10 max-w-[50%]">
            <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {post.authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.authorAvatar}
                  alt=""
                  className="h-5 w-5 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <span className="truncate">{post.author}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5 md:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {post.readTime}
            </span>
          </div>

          <h3 className="font-display mb-2 line-clamp-2 min-h-[2.75rem] text-xl font-bold leading-snug transition-colors group-hover:text-primary">
            {post.title}
          </h3>

          <p className="mb-5 line-clamp-2 min-h-[2.5rem] flex-1 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/forgeicon.png"
                alt="Forge"
                className="h-7 w-7 shrink-0 rounded-full border border-border/80 object-contain p-1"
              />
              <span className="truncate">Blogs by Forge</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
              Read more
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function BlogSection({
  limit,
  showViewAll = false,
  compact = false,
  paginate = false,
}: BlogSectionProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch("/api/blog");
        const data: BlogPost[] = await response.json();
        if (!Array.isArray(data)) {
          setPosts([]);
          return;
        }
        // Homepage preview: shuffle a few. Full page: keep API order.
        if (limit != null && limit > 0) {
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          setPosts(shuffled.slice(0, limit));
        } else {
          setPosts(data);
        }
        setPage(1);
      } catch (error) {
        console.error("Failed to fetch blog posts:", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, [limit]);

  const usePagination = paginate && !(limit != null && limit > 0);
  const totalPages = usePagination
    ? Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
    : 1;
  const visiblePosts = usePagination
    ? posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : posts;

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    setPage(clamped);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  let pageNumbers: number[];
  if (totalPages <= 7) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    const pages = new Set<number>([1, totalPages, page]);
    for (let i = page - 1; i <= page + 1; i++) {
      if (i >= 1 && i <= totalPages) pages.add(i);
    }
    pageNumbers = Array.from(pages).sort((a, b) => a - b);
  }

  const sectionPad = compact ? "pb-24 pt-8" : "py-24";
  const skeletonCount =
    limit != null && limit > 0 ? Math.min(limit, PAGE_SIZE) : PAGE_SIZE;

  if (loading) {
    return (
      <section className={`bg-background ${sectionPad}`}>
        <div className="container mx-auto px-4">
          {!compact && (
            <div className="mb-12 space-y-3">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-10 w-72 max-w-full animate-pulse rounded bg-muted" />
              <div className="h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 md:items-stretch">
            {Array.from({ length: skeletonCount }, (_, i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`bg-background ${sectionPad}`}>
      <div className="container mx-auto px-4">
        {!compact && (
          <ScrollAnimate animation="fade-up" className="mb-12">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
              Blog
            </p>
            <h2 className="font-display mb-4 text-4xl md:text-5xl">
              Latest Fitness Tips
            </h2>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Stay updated with the latest fitness advice, nutrition tips, and
              workout strategies from our expert team.
            </p>
          </ScrollAnimate>
        )}

        {posts.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            No posts available right now. Check back soon.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visiblePosts.map((post, index) => (
                <ScrollAnimate
                  key={`${post.id}-${page}`}
                  animation="fade-up"
                  delay={Math.min(index, 5) * 0.06}
                  className="h-full"
                >
                  <BlogCard post={post} />
                </ScrollAnimate>
              ))}
            </div>

            {usePagination && totalPages > 1 && (
              <div className="mt-12 flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                  <span className="mx-2 text-border">·</span>
                  {posts.length} posts
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>

                  {pageNumbers.map((n, idx) => {
                    const prev = pageNumbers[idx - 1];
                    const showEllipsis = prev != null && n - prev > 1;
                    return (
                      <span key={n} className="flex items-center gap-2">
                        {showEllipsis && (
                          <span className="px-1 text-muted-foreground">…</span>
                        )}
                        <Button
                          type="button"
                          variant={n === page ? "default" : "outline"}
                          size="sm"
                          className="min-w-9"
                          onClick={() => goToPage(n)}
                          aria-current={n === page ? "page" : undefined}
                        >
                          {n}
                        </Button>
                      </span>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {showViewAll && (
          <ScrollAnimate animation="fade-up" className="mt-12 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              View All Posts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </ScrollAnimate>
        )}
      </div>
    </section>
  );
}
