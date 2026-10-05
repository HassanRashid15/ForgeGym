import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    // Fetch fitness-related articles from Dev.to
    const response = await fetch(
      "https://dev.to/api/articles?tag=fitness&per_page=9&top=7",
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch articles from Dev.to");
    }

    const devToArticles = await response.json();

    // Transform Dev.to data to our BlogPost format
    const blogPosts: BlogPost[] = devToArticles.map((article: any) => ({
      id: article.id.toString(),
      title: article.title,
      excerpt: article.description || article.title,
      content: article.body_html || article.body_markdown || "",
      author: article.user.name,
      publishedAt: article.published_at,
      imageUrl: article.cover_image || article.social_image || null,
      category: article.tag_list[0] || "Fitness",
      readTime: `${article.reading_time_minutes || 5} min read`,
    }));

    return NextResponse.json(blogPosts);
  } catch (error) {
    console.error("Error fetching Dev.to articles:", error);
    return NextResponse.json([], { status: 500 });
  }
}
