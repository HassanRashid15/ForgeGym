import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rateLimitedResponse, getRequestId } from "@/lib/api/errors";

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

type DevToArticle = {
  id: number;
  title: string;
  description: string;
  body_html?: string;
  body_markdown?: string;
  user: { name: string; profile_image: string };
  published_at: string;
  cover_image: string | null;
  social_image: string | null;
  tag_list: string[] | string;
  reading_time_minutes: number;
};

const BLOG_TAGS = [
  "fitness",
  "health",
  "wellness",
  "nutrition",
  "workout",
  "webdev",
  "javascript",
  "productivity",
];

function toBlogPost(article: DevToArticle): BlogPost {
  const tags = Array.isArray(article.tag_list)
    ? article.tag_list
    : String(article.tag_list || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

  return {
    id: article.id.toString(),
    title: article.title,
    excerpt: article.description || article.title,
    content: article.body_html || article.body_markdown || "",
    author: article.user?.name || "Author",
    authorAvatar: article.user?.profile_image || null,
    publishedAt: article.published_at,
    imageUrl: article.cover_image || article.social_image || null,
    category: tags[0] || "Article",
    readTime: `${article.reading_time_minutes || 5} min read`,
  };
}

export async function GET(request: Request) {
  const limited = await rateLimit(clientKey(request, "public:blog"), 30, 60_000);
  if (!limited.allowed) {
    return rateLimitedResponse(limited);
  }

  try {
    const responses = await Promise.all(
      BLOG_TAGS.map((tag) =>
        fetch(`https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=100`, {
          next: { revalidate: 3600 },
        })
      )
    );

    const articlesNested = await Promise.all(
      responses.map(async (res) => {
        if (!res.ok) return [] as DevToArticle[];
        return (await res.json()) as DevToArticle[];
      })
    );

    const seen = new Set<string>();
    const blogPosts: BlogPost[] = [];

    for (const article of articlesNested.flat()) {
      if (!article?.id) continue;
      const id = article.id.toString();
      if (seen.has(id)) continue;
      seen.add(id);
      blogPosts.push(toBlogPost(article));
    }

    blogPosts.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return NextResponse.json(blogPosts);
  } catch (error) {
    console.error("Error fetching Dev.to articles:", error);
    return NextResponse.json([], { status: 500 });
  }
}
