import { data } from "react-router";
import { authenticate } from "../shopify.server";
import OpenAI from "openai";
import db from "../db.server";

async function analyzeReview(reviewText, openai) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Sen bir e-ticaret yorum analiz uzmanısın. Verilen yorumu analiz et ve SADECE JSON formatında döndür:
{
  "sentiment": "positive" veya "negative" veya "neutral",
  "score": -100 ile 100 arası tam sayı,
  "categories": ["kargo", "kalite", "fiyat", "musteri_hizmetleri", "urun", "ambalaj"] listesinden uygun olanlar,
  "summary": "maksimum 10 kelimelik Türkçe özet",
  "action": "mağaza sahibine 1 cümle öneri"
}`,
      },
      { role: "user", content: reviewText },
    ],
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices[0].message.content);
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!process.env.OPENAI_API_KEY) {
    return data(
      {
        success: false,
        error:
          "OPENAI_API_KEY ayarlanmamış. Railway ortam değişkenlerini kontrol edin.",
      },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const reviews = await db.review.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (reviews.length === 0) {
      return data({
        success: false,
        error:
          "Henüz yorum yok. Ayarlar sayfasındaki widget kodunu ürün sayfanıza ekleyin.",
      });
    }

    // 5'li batch'ler halinde işle — OpenAI rate limit koruması
    const BATCH_SIZE = 5;
    const results = [];

    for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
      const batch = reviews.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (review) => {
          try {
            const analysis = await analyzeReview(review.body, openai);
            return {
              product: review.productTitle,
              text: review.body,
              rating: review.rating,
              author: review.author,
              analysis,
            };
          } catch {
            return {
              product: review.productTitle,
              text: review.body,
              rating: review.rating,
              author: review.author,
              analysis: {
                sentiment: "neutral",
                score: 0,
                categories: [],
                summary: "Analiz başarısız",
                action: "—",
              },
            };
          }
        })
      );
      results.push(...batchResults);
    }

    const negative = results.filter((r) => r.analysis.sentiment === "negative");
    const positive = results.filter((r) => r.analysis.sentiment === "positive");

    const categoryCounts = {};
    negative.forEach((r) => {
      (r.analysis.categories || []).forEach((cat) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });
    const topCategory = Object.entries(categoryCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return data({
      success: true,
      stats: {
        total: results.length,
        negative: negative.length,
        positive: positive.length,
        neutral: results.length - negative.length - positive.length,
        negativeRate: Math.round((negative.length / results.length) * 100),
        topComplaint: topCategory ? topCategory[0] : "—",
      },
      reviews: results,
    });
  } catch (error) {
    console.error("Analiz hatası:", error);
    return data(
      { success: false, error: `Analiz başarısız: ${error.message}` },
      { status: 500 }
    );
  }
};
