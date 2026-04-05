import { useLoaderData } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return data({ shop: session.shop });
};

export default function SettingsPage() {
  const { shop } = useLoaderData();

  const widgetCode = `<!-- Review Insight Widget -->
<div id="review-insight-widget" data-product-id="{{ product.id }}" data-product-title="{{ product.title | escape }}"></div>
<script>
(function() {
  var shop = "${shop}";
  var apiUrl = "https://YOUR_APP_URL/api/reviews?shop=" + shop;

  var container = document.getElementById("review-insight-widget");
  if (!container) return;

  var productId = container.getAttribute("data-product-id");
  var productTitle = container.getAttribute("data-product-title");

  container.innerHTML = \`
    <div style="margin-top:24px;font-family:sans-serif;">
      <h3 style="margin-bottom:12px;">Yorum Yaz</h3>
      <div id="ri-form">
        <input id="ri-author" placeholder="Adınız" style="display:block;width:100%;padding:8px;margin-bottom:8px;border:1px solid #ddd;border-radius:4px;" />
        <select id="ri-rating" style="display:block;width:100%;padding:8px;margin-bottom:8px;border:1px solid #ddd;border-radius:4px;">
          <option value="5">⭐⭐⭐⭐⭐ Mükemmel</option>
          <option value="4">⭐⭐⭐⭐ İyi</option>
          <option value="3">⭐⭐⭐ Orta</option>
          <option value="2">⭐⭐ Kötü</option>
          <option value="1">⭐ Çok Kötü</option>
        </select>
        <textarea id="ri-body" placeholder="Yorumunuz..." rows="4" style="display:block;width:100%;padding:8px;margin-bottom:8px;border:1px solid #ddd;border-radius:4px;resize:vertical;"></textarea>
        <button id="ri-submit" style="background:#008060;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:14px;">Yorum Gönder</button>
        <p id="ri-msg" style="margin-top:8px;color:green;display:none;">Yorumunuz alındı, teşekkürler!</p>
      </div>
    </div>
  \`;

  document.getElementById("ri-submit").addEventListener("click", function() {
    var author = document.getElementById("ri-author").value.trim();
    var rating = document.getElementById("ri-rating").value;
    var body = document.getElementById("ri-body").value.trim();

    if (!author || !body) {
      alert("Lütfen adınızı ve yorumunuzu girin.");
      return;
    }

    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: productId, productTitle: productTitle, author: author, rating: rating, reviewBody: body })
    }).then(function() {
      document.getElementById("ri-form").style.display = "none";
      document.getElementById("ri-msg").style.display = "block";
    }).catch(function() {
      alert("Bir hata oluştu, lütfen tekrar deneyin.");
    });
  });
})();
</script>`;

  return (
    <s-page heading="Kurulum">
      <s-section heading="Widget Kurulumu">
        <s-paragraph>
          Aşağıdaki kodu kopyalayın ve Shopify temanızdaki ürün sayfasına ekleyin.
          Müşteriler yorum bıraktığında otomatik olarak sisteminize kaydedilecek.
        </s-paragraph>
        <s-stack direction="block" gap="tight">
          <s-text>1. Shopify Admin → Online Store → Themes → Edit code</s-text>
          <s-text>2. sections/main-product.liquid dosyasını açın</s-text>
          <s-text>3. Dosyanın en altına aşağıdaki kodu yapıştırın</s-text>
          <s-text>4. Kaydet</s-text>
        </s-stack>
      </s-section>

      <s-section heading="Widget Kodu">
        <s-box padding="base" background="subdued" borderRadius="base">
          <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
            {widgetCode}
          </pre>
        </s-box>
        <s-paragraph>
          NOT: "YOUR_APP_URL" kısmını uygulamanızın gerçek URL'siyle değiştirin.
          Uygulama yayına alındığında bu otomatik ayarlanacaktır.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
