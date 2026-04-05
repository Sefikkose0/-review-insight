import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const [reviews, productsResponse] = await Promise.all([
    db.review.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    admin.graphql(`
      #graphql
      query {
        products(first: 30) {
          edges { node { id title } }
        }
      }
    `),
  ]);

  const productsJson = await productsResponse.json();
  const products = productsJson.data.products.edges.map((e) => ({
    id: e.node.id,
    title: e.node.title,
  }));

  return data({ reviews, products });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "add_review") {
    const productId = formData.get("productId");
    const productTitle = formData.get("productTitle");
    const author = formData.get("author");
    const rating = parseInt(formData.get("rating"));
    const body = formData.get("body");

    if (!author?.trim() || !body?.trim()) {
      return data({ error: "Yazar ve yorum alanları zorunludur." }, { status: 400 });
    }

    await db.review.create({
      data: {
        shop: session.shop,
        productId: String(productId),
        productTitle: productTitle || "Bilinmeyen Ürün",
        author: author.trim(),
        rating,
        body: body.trim(),
      },
    });
    return data({ success: true, message: "Test yorumu eklendi!" });
  }

  if (intent === "delete_review") {
    const id = formData.get("id");
    await db.review.delete({ where: { id } });
    return data({ success: true });
  }

  if (intent === "delete_all") {
    await db.review.deleteMany({ where: { shop: session.shop } });
    return data({ success: true, message: "Tüm yorumlar silindi." });
  }

  return data({ error: "Geçersiz işlem." }, { status: 400 });
};

export default function ReviewsPage() {
  const { reviews, products } = useLoaderData();
  const fetcher = useFetcher();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isSubmitting = fetcher.state === "submitting";

  return (
    <s-page heading="Yorum Yönetimi">
      <s-section heading="Test Yorumu Ekle">
        <s-paragraph>
          Widget kurmadan önce analizi test etmek için buradan manuel yorum ekleyebilirsiniz.
        </s-paragraph>
        <fetcher.Form method="POST">
          <input type="hidden" name="intent" value="add_review" />
          <input type="hidden" name="productTitle" value={selectedProduct?.title || "Bilinmeyen Ürün"} />
          <s-stack direction="block" gap="base">
            {products.length > 0 ? (
              <s-select
                label="Ürün"
                name="productId"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </s-select>
            ) : (
              <s-banner tone="warning">
                <s-paragraph>Mağazanızda ürün bulunamadı.</s-paragraph>
              </s-banner>
            )}
            <s-text-field
              label="Yazar Adı"
              name="author"
              placeholder="Örn: Ahmet K."
              required
            />
            <s-select label="Puan" name="rating">
              <option value="1">⭐ 1 — Çok Kötü</option>
              <option value="2">⭐⭐ 2 — Kötü</option>
              <option value="3">⭐⭐⭐ 3 — Orta</option>
              <option value="4">⭐⭐⭐⭐ 4 — İyi</option>
              <option value="5">⭐⭐⭐⭐⭐ 5 — Mükemmel</option>
            </s-select>
            <s-text-field
              label="Yorum Metni"
              name="body"
              multiline={3}
              placeholder="Yorum metnini buraya girin..."
              required
            />
            <s-button
              variant="primary"
              submit
              {...(isSubmitting ? { loading: true } : {})}
            >
              {isSubmitting ? "Ekleniyor..." : "Yorum Ekle"}
            </s-button>
          </s-stack>
        </fetcher.Form>

        {fetcher.data?.success && fetcher.data?.message && (
          <s-banner tone="success">
            <s-paragraph>{fetcher.data.message}</s-paragraph>
          </s-banner>
        )}
        {fetcher.data?.error && (
          <s-banner tone="critical">
            <s-paragraph>{fetcher.data.error}</s-paragraph>
          </s-banner>
        )}
      </s-section>

      <s-section heading={`Tüm Yorumlar (${reviews.length})`}>
        {reviews.length === 0 ? (
          <s-paragraph>
            Henüz yorum yok. Widget'ı ürün sayfanıza ekleyin veya yukarıdan test yorumu ekleyin.
          </s-paragraph>
        ) : (
          <>
            <fetcher.Form method="POST">
              <input type="hidden" name="intent" value="delete_all" />
              <s-button variant="plain" tone="critical" submit>
                Tümünü Sil
              </s-button>
            </fetcher.Form>
            <s-stack direction="block" gap="tight">
              {reviews.map((review) => (
                <s-box
                  key={review.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <s-stack direction="inline" align="space-between">
                    <s-stack direction="block" gap="extraTight">
                      <s-text>
                        <strong>
                          {"⭐".repeat(review.rating)} {review.author}
                        </strong>{" "}
                        — {review.productTitle}
                      </s-text>
                      <s-text>{review.body}</s-text>
                      <s-text>
                        {new Date(review.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </s-text>
                    </s-stack>
                    <fetcher.Form method="POST">
                      <input type="hidden" name="intent" value="delete_review" />
                      <input type="hidden" name="id" value={review.id} />
                      <s-button variant="plain" tone="critical" submit size="slim">
                        Sil
                      </s-button>
                    </fetcher.Form>
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          </>
        )}
      </s-section>
    </s-page>
  );
}
