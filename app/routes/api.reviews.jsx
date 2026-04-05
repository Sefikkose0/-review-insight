import { data } from "react-router";
import db from "../db.server";

// CORS headers — storefront'tan istek gelecek
function corsHeaders(shop) {
  return {
    "Access-Control-Allow-Origin": `https://${shop}`,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// OPTIONS preflight
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  return new Response(null, { status: 204, headers: corsHeaders(shop) });
};

// POST — yeni yorum kaydet
export const action = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return data({ error: "Shop parametresi eksik." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { productId, productTitle, author, rating, reviewBody } = body;

    if (!productId || !author || !rating || !reviewBody) {
      return data({ error: "Eksik alan." }, { status: 400 });
    }

    await db.review.create({
      data: {
        shop,
        productId: String(productId),
        productTitle: productTitle || "Bilinmeyen Ürün",
        author,
        rating: parseInt(rating),
        body: reviewBody,
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(shop),
        },
      }
    );
  } catch (error) {
    return data({ error: error.message }, { status: 500 });
  }
};
