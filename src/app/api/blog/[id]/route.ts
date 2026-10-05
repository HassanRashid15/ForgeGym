import { NextResponse } from "next/server";
import type { BlogPost } from "../route";

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "5 Tips for Building Muscle Mass",
    excerpt: "Learn the most effective strategies for building lean muscle and increasing strength with these proven techniques.",
    content: `Building muscle requires a combination of proper nutrition, consistent training, and adequate recovery. Here are 5 essential tips to help you maximize your muscle growth:

## 1. Focus on Compound Movements
Compound exercises like squats, deadlifts, bench presses, and rows work multiple muscle groups simultaneously. These movements are more efficient and stimulate greater muscle growth compared to isolation exercises.

## 2. Progressive Overload
To build muscle, you must continually challenge your muscles. Gradually increase the weight, reps, or intensity of your workouts over time. This principle is known as progressive overload and is essential for continuous muscle development.

## 3. Prioritize Protein Intake
Protein is the building block of muscle tissue. Aim for 1.6-2.2 grams of protein per kilogram of body weight daily. Good sources include lean meats, eggs, dairy, legumes, and protein supplements.

## 4. Get Enough Rest
Muscles grow during rest, not during workouts. Aim for 7-9 hours of quality sleep each night and allow 48-72 hours of recovery between training the same muscle group.

## 5. Stay Consistent
Consistency is key to building muscle. Stick to a structured workout plan and nutrition regimen. Results take time, but consistent effort will pay off in the long run.`,
    author: "Forge Fitness Team",
    publishedAt: "2024-01-15",
    imageUrl: "/images/equipment-barbell.jpg",
    category: "Training",
    readTime: "5 min read"
  },
  {
    id: "2",
    title: "The Importance of Rest and Recovery",
    excerpt: "Discover why rest days are crucial for your fitness journey and how to optimize your recovery routine.",
    content: `Rest and recovery are often overlooked but are essential components of any fitness program. Here's why they matter and how to optimize your recovery:

## Why Recovery Matters
- **Muscle Growth**: Muscles repair and grow during rest, not during workouts
- **Injury Prevention**: Overtraining increases injury risk
- **Performance**: Adequate rest improves workout performance
- **Mental Health**: Prevents burnout and maintains motivation

## Recovery Strategies
1. **Sleep**: Aim for 7-9 hours of quality sleep
2. **Active Recovery**: Light activities like walking or yoga on rest days
3. **Nutrition**: Consume protein and carbs post-workout
4. **Hydration**: Drink plenty of water throughout the day
5. **Stretching**: Improve flexibility and reduce muscle tension

## Signs You Need More Rest
- Persistent fatigue
- Decreased performance
- Increased irritability
- Poor sleep quality
- Persistent muscle soreness

Listen to your body and don't hesitate to take extra rest days when needed.`,
    author: "Dr. Sarah Johnson",
    publishedAt: "2024-01-10",
    imageUrl: "/images/class-yoga.jpg",
    category: "Recovery",
    readTime: "4 min read"
  },
  {
    id: "3",
    title: "Nutrition Basics for Beginners",
    excerpt: "Get started with the fundamentals of nutrition and how to fuel your body for optimal performance.",
    content: `Proper nutrition is the foundation of any successful fitness journey. Here are the basics you need to know:

## Macronutrients
### Protein
- Essential for muscle repair and growth
- Aim for 1.6-2.2g per kg of body weight
- Sources: Chicken, fish, eggs, dairy, legumes

### Carbohydrates
- Primary energy source for workouts
- Focus on complex carbs (oats, rice, potatoes)
- Timing matters: consume around workouts

### Fats
- Essential for hormone production
- Choose healthy fats (avocado, nuts, olive oil)
- Aim for 20-35% of total calories

## Meal Timing
- **Pre-workout**: Carbs + protein 1-2 hours before
- **Post-workout**: Protein + carbs within 30 minutes
- **Throughout the day**: Regular meals every 3-4 hours

## Hydration
- Drink at least 8 glasses of water daily
- More if you're active or in hot weather
- Monitor urine color as a hydration indicator

## Supplements (Optional)
- Whey protein (convenience)
- Creatine (performance)
- Multivitamins (nutrient gaps)

Remember, consistency is more important than perfection. Start with the basics and build from there.`,
    author: "Forge Fitness Team",
    publishedAt: "2024-01-05",
    imageUrl: "/images/class-hiit.jpg",
    category: "Nutrition",
    readTime: "6 min read"
  }
];

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const post = blogPosts.find((p) => p.id === id);

  if (!post) {
    return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}
