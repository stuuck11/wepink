
import { db } from '../../firebase';
import { doc, updateDoc, increment, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import crypto from 'crypto';

function hash(val: string | undefined): string | undefined {
  if (!val) return undefined;
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    // A SigiloPay envia os dados principais dentro de 'transaction' e metadados em 'trackProps' ou 'metadata'
    const payload = req.body;
    console.error("DEBUG: Webhook Payload Recebido:", JSON.stringify(payload, null, 2));

    const transaction = payload.transaction || {};
    const metadata = payload.trackProps || payload.metadata || {};
    const client = payload.client || {};
    
    const status = (transaction.status || payload.status || '').toString().toUpperCase();
    const id = transaction.id || payload.id;
    const amount = transaction.amount || payload.amount;

    console.error(`DEBUG: Status Identificado: ${status}, Evento: ${payload.event}, ID: ${id}`);

    // SigiloPay webhook event for payment confirmed
    if (status === 'PAID' || status === 'COMPLETED' || status === 'OK' || payload.event === 'TRANSACTION_PAID') {
      const internalId = metadata.internalId || metadata.campaignId;
      const pixelId = metadata.pixelId;
      const accessToken = metadata.accessToken;
      const donationAmount = Number(amount);

      console.error(`DEBUG: Processando Pagamento Confirmado. Pixel: ${pixelId}, Campaign: ${internalId}`);

      // 1. Atualiza Firestore
      if (internalId && db) {
        let campRef = doc(db, 'campaigns', internalId.toString());
        let found = false;

        try {
          const snap = await getDoc(campRef);
          if (snap.exists()) {
            found = true;
          } else {
            // Fallback: Busca pelo campo 'campaignId'
            const q = query(collection(db, 'campaigns'), where('campaignId', '==', internalId.toString()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              campRef = querySnapshot.docs[0].ref;
              found = true;
            }
          }

          if (found) {
            await updateDoc(campRef, {
              supportersCount: increment(1)
            });
            console.log(`Webhook: Campanha ${internalId} atualizada com sucesso.`);
          } else {
            console.error(`Webhook: Campanha ${internalId} não encontrada no Firestore.`);
          }
        } catch (err: any) {
          console.error("Erro ao processar Firestore no Webhook:", err);
        }
      }

      // 2. Envia para o Meta Pixel (CAPI)
      if (pixelId && accessToken) {
        const rawIp = metadata.ip || '';
        const cleanIp = Array.isArray(rawIp) ? rawIp[0] : rawIp.split(',')[0].trim();

        const event = {
          event_name: 'Purchase',
          event_id: id || metadata.transactionId || `pay_${Date.now()}`,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: metadata.originUrl || '',
          user_data: { 
            em: metadata.email ? [hash(metadata.email)] : (client.email ? [hash(client.email)] : undefined),
            ph: client.phone ? [hash(client.phone)] : undefined,
            client_ip_address: cleanIp,
            client_user_agent: metadata.userAgent,
            external_id: [hash(metadata.internalId || metadata.campaignId)],
            fbp: metadata.fbp,
            fbc: metadata.fbc
          },
          custom_data: { 
            currency: 'BRL', 
            value: donationAmount, 
            content_name: metadata.campaignTitle || 'Doação',
            content_type: 'product'
          }
        };

        console.error("DEBUG: Enviando para Facebook CAPI:", JSON.stringify(event, null, 2));

        const fbResponse = await fetch(`https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            data: [event],
            ...(process.env.FB_TEST_CODE ? { test_event_code: process.env.FB_TEST_CODE } : {})
          })
        });
        
        const fbData = await fbResponse.json();
        console.error("DEBUG: Resposta do Facebook CAPI:", JSON.stringify(fbData, null, 2));
      } else {
        console.error("DEBUG: Falha ao enviar CAPI - PixelID ou AccessToken ausentes nos metadados.");
      }
    } else {
      console.error(`DEBUG: Webhook ignorado - Status '${status}' não é de pagamento confirmado.`);
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("SigiloPay Webhook Error:", err);
    return res.status(200).json({ received: true, error: err.message });
  }
}
