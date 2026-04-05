import { useLoaderData } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  // eslint-disable-next-line no-undef
  const appUrl = process.env.SHOPIFY_APP_URL || "";
  return data({ shop: session.shop, appUrl });
};

export default function SettingsPage() {
  const { shop, appUrl } = useLoaderData();

  const widgetCode = `<!-- Review Insight Widget -->
<div id="review-insight-widget"
     data-product-id="{{ product.id }}"
     data-product-title="{{ product.title | escape }}">
</div>
<script>
(function() {
  var shop = "${shop}";
  var apiUrl = "${appUrl}/api/reviews?shop=" + shop;
  var container = document.getElementById("review-insight-widget");
  if (!container) return;

  var productId = container.getAttribute("data-product-id");
  var productTitle = container.getAttribute("data-product-title");

  container.innerHTML = [
    '<div style="margin:24px 0;font-family:sans-serif;">',
    '<h3 style="margin-bottom:12px;font-size:18px;font-weight:600;">Yorum Yaz</h3>',
    '<input id="ri-author" placeholder="Adınız" style="display:block;width:100%;max-width:480px;padding:8px 12px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;" />',
    '<select id="ri-rating" style="display:block;width:100%;max-width:480px;padding:8px 12px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">',
    '  <option value="5">⭐⭐⭐⭐⭐ Mükemmel</option>',
    '  <option value="4">⭐⭐⭐⭐ İyi</option>',
    '  <option value="3">⭐⭐⭐ Orta</option>',
    '  <option value="2">⭐⭐ Kötü</option>',
    '  <option value="1">⭐ Çok Kötü</option>',
    '</select>',
    '<textarea id="ri-body" placeholder="Yorumunuz..." rows="4" style="display:block;width:100%;max-width:480px;padding:8px 12px;margin-bottom:12px;border:1px solid #ddd;border-radius:6px;font-size:14px;resize:vertical;"></textarea>',
    '<button id="ri-submit" style="background:#008060;color:#fff;border:none;padding:10px 28px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;">Yorum Gönder</button>',
    '<p id="ri-msg" style="margin-top:12px;color:#008060;font-size:14px;display:none;">Yorumunuz alındı, teşekkürler!</p>',
    '</div>'
  ].join("");

  document.getElementById("ri-submit").addEventListener("click", function() {
    var author = document.getElementById("ri-author").value.trim();
    var rating = document.getElementById("ri-rating").value;
    var body = document.getElementById("ri-body").value.trim();
    if (!author || !body) {
      alert("Lütfen adınızı ve yorumunuzu girin.");
      return;
    }
    var btn = document.getElementById("ri-submit");
    btn.disabled = true;
    btn.textContent = "Gönderiliyor...";
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: productId,
        productTitle: productTitle,
        author: author,
        rating: rating,
        reviewBody: body
      })
    }).then(function(res) {
      if (res.ok) {
        document.getElementById("ri-author").style.display = "none";
        document.getElementById("ri-rating").style.display = "none";
        document.getElementById("ri-body").style.display = "none";
        btn.style.display = "none";
        document.getElementById("ri-msg").style.display = "block";
      } else {
        btn.disabled = false;
        btn.textContent = "Yorum Gönder";
        alert("Bir hata oluştu, lütfen tekrar deneyin.");
      }
    }).catch(function() {
      btn.disabled = false;
      btn.textContent = "Yorum Gönder";
      alert("Bağlantı hatası, lütfen tekrar deneyin.");
    });
  });
})();
</script>`;

  return (
    <s-page heading="Kurulum & Ayarlar">
      <s-section heading="Widget Nasıl Kurulur?">
        <s-stack direction="block" gap="base">
          <s-text>
            1. Shopify Admin → <strong>Online Store → Themes → Edit code</strong>
          </s-text>
          <s-text>
            2. <strong>sections/main-product.liquid</strong> dosyasını açın.
          </s-text>
          <s-text>3. Dosyanın en altına aşağıdaki kodu yapıştırın.</s-text>
          <s-text>
            4. <strong>Kaydet</strong> — Artık ürün sayfalarında yorum formu görünür.
          </s-text>
        </s-stack>
      </s-section>

      <s-section heading="Widget Kodu">
        {!appUrl && (
          <s-banner tone="warning">
            <s-paragraph>
              Uygulama URL'si henüz ayarlanmamış. Railway deploy sonrası
              SHOPIFY_APP_URL ortam değişkenini girin; bu kod otomatik güncellenir.
            </s-paragraph>
          </s-banner>
        )}
        <s-box padding="base" background="subdued" borderRadius="base">
          <pre
            style={{
              fontSize: "12px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              margin: 0,
              lineHeight: "1.6",
            }}
          >
            {widgetCode}
          </pre>
        </s-box>
      </s-section>
    </s-page>
  );
}
