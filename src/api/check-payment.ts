
import Stripe from 'stripe';
import crypto from 'crypto';

function hash(val: string | undefined): string | undefined {
  if (!val) return undefined;
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { paymentId, gateway, pixelId, accessToken, amount, campaignTitle, email, originUrl } = req.body;
    const userAgent = req.headers['user-agent'] || '';
    
    const cookies = req.headers.cookie || '';
    const fbp = cookies.split('; ').find((row: string) => row.startsWith('_fbp='))?.split('=')[1];
    const fbc = cookies.split('; ').find((row: string) => row.startsWith('_fbc='))?.split('=')[1];

    let isPaid = false;

    const activeGateway = (gateway || 'sigilopay').toString().toLowerCase().trim();

    if (activeGateway === 'sigilopay') {
      const publicKey = process.env.SIGILOPAY_PUBLIC_KEY?.trim();
      const secretKey = process.env.SIGILOPAY_SECRET_KEY?.trim();
      if (publicKey && secretKey && paymentId) {
        const response = await fetch(`https://app.sigilopay.com.br/api/v1/payments/${paymentId}`, {
          headers: { 
            'x-public-key': publicKey,
            'x-secret-key': secretKey
          }
        });
        if (response.ok) {
          try {
            const data = await response.json();
            isPaid = data.status === 'paid' || data.status === 'completed';
          } catch(e) {}
        }
      }
    }

    if (isPaid && pixelId && accessToken) {
      const event = {
        event_name: 'Purchase',
        event_id: paymentId,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: originUrl,
        user_data: { 
          client_user_agent: userAgent, 
          em: email ? [hash(email)] : undefined,
          fbp: fbp,
          fbc: fbc
        },
        custom_data: { 
          currency: 'BRL', 
          value: Number(amount) || 0, 
          content_name: campaignTitle,
          content_type: 'product'
        }
      };

      await fetch(`https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [event] })
      }).catch(() => {});
    }

    return res.status(200).json({ paid: isPaid });
  } catch (err: any) {
    return res.status(200).json({ paid: false, error: err.message });
  }
}
