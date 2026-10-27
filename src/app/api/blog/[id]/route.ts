import { NextResponse } from "next/server";
import type { BlogPost } from "../route";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Fetch the specific article from Dev.to
    const response = await fetch(`https://dev.to/api/articles/${id}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const article = await response.json();

    // Transform Dev.to data to our BlogPost format
    const blogPost: BlogPost = {
      id: article.id.toString(),
      title: article.title,
      excerpt: article.description || article.title,
      content: article.body_html || article.body_markdown || "",
      author: article.user?.name || "Unknown",
      authorAvatar: article.user?.profile_image || null,
      publishedAt: article.published_at,
      imageUrl: article.cover_image || article.social_image || null,
      category: article.tag_list?.[0] || "Fitness",
      readTime: `${article.reading_time_minutes || 5} min read`,
    };

    return NextResponse.json(blogPost);
  } catch (error) {
    console.error("Error fetching Dev.to article:", error);
    return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
  }
}
