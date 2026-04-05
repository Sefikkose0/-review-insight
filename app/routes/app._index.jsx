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
  const result = fetcher.data;

  return (
    <s-page heading="Review Insight — Yorum Analizi">
      <s-section heading="AI ile Yorum Analizi">
        <s-paragraph>
          Mağazanızdaki müşteri yorumlarını yapay zeka ile analiz edin.
          Olumsuz yorumları, şikayet kategorilerini ve aksiyon önerilerini anında görün.
        </s-paragraph>
        <fetcher.Form method="POST" action="/app/analyze">
          <s-button
            variant="primary"
            submit
            {...(isLoading ? { loading: true } : {})}
          >
            {isLoading ? "Analiz Ediliyor..." : "Analizi Başlat"}
          </s-button>
        </fetcher.Form>
      </s-section>

      {result?.error && (
        <s-section>
          <s-banner tone="critical">
            <s-paragraph>{result.error}</s-paragraph>
            {result.error.includes("widget") && (
              <s-button url="/app/settings" variant="plain">
                Kurulum Sayfasına Git
              </s-button>
            )}
          </s-banner>
        </s-section>
      )}

      {result?.stats && (
        <s-section heading="Analiz Özeti">
          <s-stack direction="inline" gap="base" wrap>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-text>Toplam Yorum</s-text>
                <s-heading>{result.stats.total}</s-heading>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-text>Olumlu</s-text>
                <s-heading>{result.stats.positive}</s-heading>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-text>Olumsuz</s-text>
                <s-heading>{result.stats.negative}</s-heading>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-text>Olumsuzluk Oranı</s-text>
                <s-heading>%{result.stats.negativeRate}</s-heading>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-text>En Çok Şikayet</s-text>
                <s-heading>{result.stats.topComplaint}</s-heading>
              </s-stack>
            </s-box>
          </s-stack>
        </s-section>
      )}

      {result?.reviews && (
        <s-section heading="Olumsuz Yorumlar">
          {result.reviews.filter((r) => r.analysis.sentiment === "negative").length === 0 ? (
            <s-banner tone="success">
              <s-paragraph>Olumsuz yorum bulunamadı!</s-paragraph>
            </s-banner>
          ) : (
            result.reviews
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
                    <s-stack direction="inline" align="space-between">
                      <s-heading>{review.product}</s-heading>
                      <s-badge tone="critical">
                        {"⭐".repeat(review.rating)} {review.rating}/5
                      </s-badge>
                    </s-stack>
                    <s-text>
                      <em>"{review.text}"</em>
                    </s-text>
                    <s-text>— {review.author}</s-text>
                    <s-divider />
                    <s-text>Özet: {review.analysis.summary}</s-text>
                    <s-text>
                      Kategoriler:{" "}
                      {review.analysis.categories?.join(", ") || "—"}
                    </s-text>
                    <s-text>Öneri: {review.analysis.action}</s-text>
                  </s-stack>
                </s-box>
              ))
          )}
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
