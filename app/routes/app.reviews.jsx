import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    #graphql
    query {
      products(first: 20) {
        edges {
          node {
            id
            title
            metafield(namespace: "custom", key: "reviews") {
              value
            }
          }
        }
      }
    }
  `);

  const responseJson = await response.json();
  const products = responseJson.data.products.edges.map((edge) => ({
    id: edge.node.id,
    title: edge.node.title,
    reviews: edge.node.metafield
      ? JSON.parse(edge.node.metafield.value)
      : [],
  }));

  return data({ products });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const intent = formData.get("intent");

  if (intent === "add_review") {
    const productId = formData.get("productId");
    const author = formData.get("author");
    const rating = parseInt(formData.get("rating"));
    const body = formData.get("body");

    // Önce mevcut yorumları çek
    const response = await admin.graphql(`
      #graphql
      query GetProduct($id: ID!) {
        product(id: $id) {
          metafield(namespace: "custom", key: "reviews") {
            id
            value
          }
        }
      }
    `, { variables: { id: productId } });

    const responseJson = await response.json();
    const existingMetafield = responseJson.data.product.metafield;
    const existingReviews = existingMetafield
      ? JSON.parse(existingMetafield.value)
      : [];

    const newReview = {
      author,
      rating,
      body,
      date: new Date().toISOString(),
    };

    const updatedReviews = [...existingReviews, newReview];

    // Metafield güncelle
    const mutation = await admin.graphql(`
      #graphql
      mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        metafields: [
          {
            ownerId: productId,
            namespace: "custom",
            key: "reviews",
            value: JSON.stringify(updatedReviews),
            type: "json",
          },
        ],
      },
    });

    const mutationJson = await mutation.json();
    const errors = mutationJson.data.metafieldsSet.userErrors;

    if (errors.length > 0) {
      return data({ success: false, error: errors[0].message }, { status: 400 });
    }

    return data({ success: true, message: "Yorum eklendi!" });
  }

  if (intent === "delete_reviews") {
    const productId = formData.get("productId");

    const mutation = await admin.graphql(`
      #graphql
      mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        metafields: [
          {
            ownerId: productId,
            namespace: "custom",
            key: "reviews",
            value: "[]",
            type: "json",
          },
        ],
      },
    });

    return data({ success: true, message: "Yorumlar silindi." });
  }

  return data({ success: false, error: "Geçersiz işlem." }, { status: 400 });
};

export default function ReviewsPage() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id || "");
  const [rating, setRating] = useState("3");

  const isSubmitting = fetcher.state === "submitting";
  const result = fetcher.data;

  return (
    <s-page heading="Yorum Yönetimi">
      <s-section heading="Yeni Yorum Ekle">
        <s-paragraph>
          Ürünlerinize test yorumları ekleyin. Bu yorumlar Shopify metafield'larında saklanır
          ve Analiz sayfasında kullanılır.
        </s-paragraph>

        <fetcher.Form method="POST">
          <input type="hidden" name="intent" value="add_review" />
          <s-stack direction="block" gap="base">
            <s-select
              label="Ürün"
              name="productId"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </s-select>

            <s-text-field
              label="Yazar Adı"
              name="author"
              placeholder="Örn: Ahmet K."
              required
            />

            <s-select
              label="Puan (1-5)"
              name="rating"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            >
              <option value="1">⭐ 1 - Çok Kötü</option>
              <option value="2">⭐⭐ 2 - Kötü</option>
              <option value="3">⭐⭐⭐ 3 - Orta</option>
              <option value="4">⭐⭐⭐⭐ 4 - İyi</option>
              <option value="5">⭐⭐⭐⭐⭐ 5 - Mükemmel</option>
            </s-select>

            <s-text-field
              label="Yorum"
              name="body"
              multiline={4}
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

        {result?.success && (
          <s-banner tone="success">
            <s-paragraph>{result.message}</s-paragraph>
          </s-banner>
        )}
        {result?.error && (
          <s-banner tone="critical">
            <s-paragraph>{result.error}</s-paragraph>
          </s-banner>
        )}
      </s-section>

      <s-section heading="Mevcut Yorumlar">
        {products.map((product) => (
          <s-box key={product.id} padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="tight">
              <s-heading>{product.title} ({product.reviews.length} yorum)</s-heading>
              {product.reviews.length === 0 ? (
                <s-text>Henüz yorum yok.</s-text>
              ) : (
                product.reviews.map((r, i) => (
                  <s-box key={i} padding="tight" background="subdued" borderRadius="base">
                    <s-text>{"⭐".repeat(r.rating)} {r.author}: "{r.body}"</s-text>
                  </s-box>
                ))
              )}
              {product.reviews.length > 0 && (
                <fetcher.Form method="POST">
                  <input type="hidden" name="intent" value="delete_reviews" />
                  <input type="hidden" name="productId" value={product.id} />
                  <s-button variant="plain" tone="critical" submit>
                    Tüm Yorumları Sil
                  </s-button>
                </fetcher.Form>
              )}
            </s-stack>
          </s-box>
        ))}
      </s-section>
    </s-page>
  );
}
