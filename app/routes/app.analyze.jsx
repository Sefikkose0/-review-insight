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
        content: `Sen bir e-ticaret yorum analiz uzmanısın.
        Verilen yorumu analiz et ve JSON formatında şunu döndür:
        {
          "sentiment": "positive" veya "negative" veya "neutral",
          "score": -100 ile 100 arası puan,
          "categories": ["kargo", "kalite", "fiyat", "musteri hizmetleri", "urun"],
          "summary": "kısa özet Türkçe",
          "action": "mağaza sahibi ne yapmalı"
        }`,
      },
      {
        role: "user",
        content: reviewText,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0].message.content);
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Veritabanından bu mağazanın yorumlarını çek
    const reviews = await db.review.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (reviews.length === 0) {
      return data({
        success: false,
        error: "Henüz yorum yok. Ürün sayfanıza yorum widget'ı eklendikten sonra müşteriler yorum bıraktığında burada görünecek.",
      });
    }

    // Her yorumu AI ile analiz et
    const results = await Promise.all(
      reviews.map(async (review) => {
        const analysis = await analyzeReview(review.body, openai);
        return {
          product: review.productTitle,
          text: review.body,
          rating: review.rating,
          author: review.author,
          analysis,
        };
      })
    );

    // İstatistikleri hesapla
    const negative = results.filter((r) => r.analysis.sentiment === "negative");
    const positive = results.filter((r) => r.analysis.sentiment === "positive");

    const categoryCounts = {};
    negative.forEach((r) => {
      r.analysis.categories.forEach((cat) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

    return data({
      success: true,
      stats: {
        total: results.length,
        negative: negative.length,
        positive: positive.length,
        topComplaint: topCategory ? topCategory[0] : "—",
      },
      reviews: results,
    });
  } catch (error) {
    return data({ success: false, error: error.message }, { status: 500 });
  }
};
