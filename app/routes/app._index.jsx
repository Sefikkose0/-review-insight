import { useState } from "react";
import { useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const fetcher = useFetcher();
  const isLoading = fetcher.state === "submitting";
  const data = fetcher.data;

  const startAnalysis = () => {
    fetcher.submit({}, { method: "POST", action: "/app/analyze" });
  };

  return (
    <s-page heading="Review Insight — Yorum Analizi">

      <s-section heading="Olumsuz Yorumları Tespit Et">
        <s-paragraph>
          Mağazanızdaki ürün yorumlarını AI ile analiz edin.
          Hangi ürünlerin olumsuz yorum aldığını, şikayet konularını
          ve trend değişikliklerini tek bakışta görün.
        </s-paragraph>
        <s-button
          variant="primary"
          onClick={startAnalysis}
          {...(isLoading ? { loading: true } : {})}
        >
          {isLoading ? "Analiz Ediliyor..." : "Analizi Başlat"}
        </s-button>
      </s-section>

      {data?.stats && (
        <s-section heading="Özet">
          <s-stack direction="inline" gap="base">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-heading>Toplam Yorum</s-heading>
                <s-text>{data.stats.total}</s-text>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-heading>Olumsuz Yorum</s-heading>
                <s-text>{data.stats.negative}</s-text>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-heading>En Çok Şikayet</s-heading>
                <s-text>{data.stats.topComplaint}</s-text>
              </s-stack>
            </s-box>
          </s-stack>
        </s-section>
      )}

      {data?.reviews && (
        <s-section heading="Yorum Analizi Sonuçları">
          {data.reviews
            .filter((r) => r.analysis.sentiment === "negative")
            .map((review, i) => (
              <s-box
                key={i}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <s-stack direction="block" gap="tight">
                  <s-heading>{review.product} — ⭐ {review.rating}/5</s-heading>
                  <s-text>"{review.text}"</s-text>
                  <s-text>🔍 Özet: {review.analysis.summary}</s-text>
                  <s-text>📂 Kategoriler: {review.analysis.categories.join(", ")}</s-text>
                  <s-text>✅ Öneri: {review.analysis.action}</s-text>
                </s-stack>
              </s-box>
            ))}
        </s-section>
      )}

      {data?.error && (
        <s-section heading="Hata">
          <s-banner tone="critical">
            <s-paragraph>{data.error}</s-paragraph>
            {data.error.includes("Ayarlar") && (
              <s-button url="/app/settings" variant="plain">Ayarlara Git</s-button>
            )}
          </s-banner>
        </s-section>
      )}

    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
