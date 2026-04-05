import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  await db.review.createMany({
    data: [
      { shop: 'seffy-8727.myshopify.com', productId: '1', productTitle: 'Test Urun', author: 'Ahmet K.', rating: 1, body: 'Kargo cok gec geldi, urun hasarli geldi. Hic memnun kalmadim.' },
      { shop: 'seffy-8727.myshopify.com', productId: '1', productTitle: 'Test Urun', author: 'Ayse T.', rating: 5, body: 'Mukemmel urun, cok hizli kargo. Kesinlikle tavsiye ederim!' },
      { shop: 'seffy-8727.myshopify.com', productId: '2', productTitle: 'Diger Urun', author: 'Mehmet S.', rating: 2, body: 'Kalite cok dusuk, fotograftaki gibi degil. Para israfi.' },
      { shop: 'seffy-8727.myshopify.com', productId: '2', productTitle: 'Diger Urun', author: 'Fatma Y.', rating: 3, body: 'Musteri hizmetleri cok ilgisizdi, soruma cevap vermediler.' },
    ]
  });
  console.log('Yorumlar eklendi!');
  await db.$disconnect();
}

main();
