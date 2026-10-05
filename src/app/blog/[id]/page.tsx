import { notFound } from "next/navigation";
import BlogDetailClient from "@/components/marketing/BlogDetailClient";
import { buildPageMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/blog/${id}`, {
    cache: "no-store",
  });
  const post = await response.json();

  if (!post || post.error) {
    return buildPageMetadata({
      title: "Blog Post Not Found",
      description: "This blog post does not exist.",
      path: `/blog/${id}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${id}`,
    image: post.imageUrl,
  });
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { id } = await params;
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/blog/${id}`, {
    cache: "no-store",
  });
  const post = await response.json();

  if (!post || post.error) {
    notFound();
  }

  return <BlogDetailClient post={post} />;
}
