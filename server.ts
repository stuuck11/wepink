import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// Robust dotenv loading
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPaths = [
  path.join(process.cwd(), ".env"),
  path.join(__dirname, ".env"),
  path.join(__dirname, "..", ".env"),
  "/.env"
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyDt3moQgGgODXmh4Oc70QotVNWnWZBVvyQ",
  authDomain: "wepink-4e089.firebaseapp.com",
  projectId: "wepink-4e089",
  storageBucket: "wepink-4e089.firebasestorage.app",
  messagingSenderId: "852881534937",
  appId: "1:852881534937:web:a0ee39c3bf5f156602b3c8",
  measurementId: "G-48WJTDYBNV"
};

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

function logError(err: any) {
  const timestamp = new Date().toISOString();
  let message = "";
  if (err instanceof Error) {
    message = err.stack || err.message;
  } else if (typeof err === "object") {
    message = JSON.stringify(err);
  } else {
    message = String(err);
  }
  const logEntry = `LOGGING ERROR: [${timestamp}] ERROR: ${message}\n`;
  console.error(logEntry);
  try {
    const logPath = path.join(process.cwd(), "stderr.log");
    fs.appendFileSync(logPath, logEntry);
  } catch (fsErr) {
    console.error("Failed to write to stderr.log:", fsErr);
  }
}

function hash(val: string | undefined): string | undefined {
  if (!val) return undefined;
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

const db = new Database("database.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    cep TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS carousel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT,
    link_url TEXT,
    order_index INTEGER
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    slug TEXT UNIQUE,
    banner_url TEXT,
    icon_url TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    price REAL,
    old_price REAL,
    image_url TEXT,
    image_url_2 TEXT,
    image_url_3 TEXT,
    image_url_4 TEXT,
    image_url_5 TEXT,
    category_id INTEGER,
    is_queridinho INTEGER DEFAULT 0,
    is_destaque INTEGER DEFAULT 0,
    is_mais_vendido INTEGER DEFAULT 0,
    is_top_bar INTEGER DEFAULT 0,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS newsletter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    customer_data TEXT,
    items TEXT,
    total REAL,
    status TEXT DEFAULT 'pending',
    pix_code TEXT,
    pix_url TEXT,
    card_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add is_top_bar column if it doesn't exist
try {
  db.exec("ALTER TABLE products ADD COLUMN is_top_bar INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE orders ADD COLUMN card_data TEXT");
} catch (e) {}

// Seed default settings if empty
const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
if (settingsCount.count === 0) {
  const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  insertSetting.run("top_bar_active", "1");
  insertSetting.run("top_bar_text", "Garanta agora o seu kit we favorito!");
  insertSetting.run("logo_url", "https://wepink.vtexassets.com/assets/vtex/assets-builder/wepink.store-theme/6.0.3/svg/logo-primary___ef05671065928b5b01f33e72323ba3b8.svg");
  insertSetting.run("fb_pixel_id", "");
  insertSetting.run("fb_access_token", "");
  insertSetting.run("whatsapp_active", "1");
  insertSetting.run("whatsapp_number", "5511999999999");
} else {
  // Ensure logo_url exists even if table wasn't empty
  const hasLogo = db.prepare("SELECT value FROM settings WHERE key = 'logo_url'").get();
  if (!hasLogo) {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("logo_url", "https://wepink.vtexassets.com/assets/vtex/assets-builder/wepink.store-theme/6.0.3/svg/logo-primary___ef05671065928b5b01f33e72323ba3b8.svg");
  }
}

// Seed categories if empty
const catCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
if (catCount.count === 0) {
  const categories = [
    "Kits", "Bath&Body", "Body Splash", "Perfumaria", "Skincare", 
    "Body Cream", "The Cream", "The Oil", "Make", "Hair", "Roll-On", "Bem-Estar"
  ];
  const insertCat = db.prepare("INSERT INTO categories (name, slug) VALUES (?, ?)");
  categories.forEach(cat => {
    insertCat.run(cat, cat.toLowerCase().replace(/&/g, '-').replace(/\s+/g, '-'));
  });
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

  // Ensure new columns exist
  try { db.prepare("ALTER TABLE products ADD COLUMN image_url_2 TEXT").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE products ADD COLUMN image_url_3 TEXT").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE products ADD COLUMN image_url_4 TEXT").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE products ADD COLUMN image_url_5 TEXT").run(); } catch(e) {}

  // Sync from Firebase on startup
  try {
    console.log("Syncing data from Firebase...");
    
    // Sync Settings
    const settingsDoc = await getDoc(doc(firestore, "site_config", "settings"));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      const updateStmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
      for (const [key, value] of Object.entries(data)) {
        updateStmt.run(key, String(value));
      }
      console.log("Settings synced from Firebase.");
    }

    // Sync Products if SQLite is empty
    const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
    if (productCount.count === 0) {
      const querySnapshot = await getDocs(collection(firestore, "products_log"));
      const insertProduct = db.prepare(`
        INSERT INTO products (
          name, description, price, old_price, image_url, 
          image_url_2, image_url_3, image_url_4, image_url_5,
          category_id, is_queridinho, is_destaque, is_mais_vendido, is_top_bar
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      querySnapshot.forEach((doc) => {
        const p = doc.data();
        if (p.action === "create" || !p.action) {
          insertProduct.run(
            p.name, p.description, p.price, p.old_price || 0, p.image_url,
            p.image_url_2 || "", p.image_url_3 || "", p.image_url_4 || "", p.image_url_5 || "",
            p.category_id, p.is_queridinho ? 1 : 0, p.is_destaque ? 1 : 0, p.is_mais_vendido ? 1 : 0, p.is_top_bar ? 1 : 0
          );
        }
      });
      console.log("Products synced from Firebase.");
    }

    // Sync Carousel if SQLite is empty
    const carouselCount = db.prepare("SELECT COUNT(*) as count FROM carousel").get() as { count: number };
    if (carouselCount.count === 0) {
      const querySnapshot = await getDocs(collection(firestore, "carousel"));
      const insertCarousel = db.prepare("INSERT OR REPLACE INTO carousel (id, image_url, link_url, order_index) VALUES (?, ?, ?, ?)");
      querySnapshot.forEach((doc) => {
        const item = doc.data();
        insertCarousel.run(doc.id, item.image_url, item.link_url, item.order_index);
      });
      console.log("Carousel synced from Firebase.");
    }
  } catch (e) {
    console.error("Error during Firebase sync:", e);
  }

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || "stuuck";
    const adminPass = process.env.ADMIN_PASS || "stuuck77";

    console.log(`Admin login attempt: user=${username}, pass=${password}`);

    if (username === adminUser && password === adminPass) {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000
      });
      console.log("Admin login success");
      return res.json({ success: true });
    }
    console.log("Admin login failed");
    res.status(401).json({ error: "Invalid credentials" });
  });

  app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.post("/api/log-error", (req, res) => {
    logError(req.body.error);
    res.json({ ok: true });
  });

  app.get("/api/admin/check", authenticate, (req, res) => {
    res.json({ success: true });
  });

  // --- User Authentication ---
  app.post("/api/user/register", async (req, res) => {
    const { email, password, name, cep, street, number, complement } = req.body;
    const fullAddress = `${street}, ${number}${complement ? ' - ' + complement : ''} - CEP: ${cep}`;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (email, password, name, cep, street, number, complement, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      stmt.run(email, hashedPassword, name, cep, street, number, complement, fullAddress);
      res.json({ success: true });
    } catch (err: any) {
      logError(err);
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Email já cadastrado." });
      } else {
        res.status(500).json({ error: "Erro ao cadastrar usuário." });
      }
    }
  });

  app.post("/api/user/login", async (req, res) => {
    const { email, password } = req.body;
    console.log(`User login attempt: ${email}`);
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
        res.cookie("user_token", token, { 
          httpOnly: true, 
          sameSite: "none", 
          secure: true,
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
        console.log("User login success");
        res.json({ 
          success: true, 
          user: { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            cep: user.cep,
            street: user.street,
            number: user.number,
            complement: user.complement,
            address: user.address 
          } 
        });
      } else {
        console.log("User login failed: Invalid credentials");
        res.status(401).json({ error: "Credenciais inválidas." });
      }
    } catch (err) {
      console.error("Login error:", err);
      logError(err);
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  });

  app.get("/api/user/me", (req, res) => {
    const token = req.cookies.user_token;
    if (!token) return res.status(401).json({ error: "Não autenticado." });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = db.prepare("SELECT id, email, name, cep, street, number, complement, address FROM users WHERE id = ?").get(decoded.id) as any;
      if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
      res.json(user);
    } catch (err) {
      res.status(401).json({ error: "Token inválido." });
    }
  });

  app.post("/api/user/logout", (req, res) => {
    res.clearCookie("user_token");
    res.json({ success: true });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", authenticate, (req, res) => {
    const updates = req.body;
    const updateStmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    const transaction = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        updateStmt.run(key, String(value));
      }
    });
    transaction(updates);
    res.json({ success: true });
  });

  app.get("/api/carousel", (req, res) => {
    const items = db.prepare("SELECT * FROM carousel ORDER BY order_index ASC").all();
    res.json(items);
  });

  app.post("/api/admin/carousel", authenticate, async (req, res) => {
    const { image_url, link_url, order_index } = req.body;
    const info = db.prepare("INSERT INTO carousel (image_url, link_url, order_index) VALUES (?, ?, ?)")
      .run(image_url, link_url, order_index || 0);
    const id = info.lastInsertRowid.toString();
    
    // Sync to Firebase
    try {
      await setDoc(doc(firestore, "carousel", id), {
        image_url, link_url, order_index: order_index || 0
      });
    } catch (e) { console.error("Firebase carousel error:", e); }

    res.json({ id });
  });

  app.put("/api/admin/carousel/:id", authenticate, async (req, res) => {
    const { id } = req.params;
    const { image_url, link_url, order_index } = req.body;
    db.prepare("UPDATE carousel SET image_url = ?, link_url = ?, order_index = ? WHERE id = ?")
      .run(image_url, link_url, order_index || 0, id);
    
    // Sync to Firebase
    try {
      await setDoc(doc(firestore, "carousel", id), {
        image_url, link_url, order_index: order_index || 0
      });
    } catch (e) { console.error("Firebase carousel error:", e); }

    res.json({ success: true });
  });

  app.delete("/api/admin/carousel/:id", authenticate, async (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM carousel WHERE id = ?").run(id);
    
    // Sync to Firebase
    try {
      await deleteDoc(doc(firestore, "carousel", id));
    } catch (e) { console.error("Firebase carousel error:", e); }

    res.json({ success: true });
  });

  app.get("/api/categories", (req, res) => {
    const items = db.prepare("SELECT * FROM categories").all();
    res.json(items);
  });

  app.put("/api/admin/categories/:id", authenticate, (req, res) => {
    const { id } = req.params;
    const { banner_url } = req.body;
    db.prepare("UPDATE categories SET banner_url = ? WHERE id = ?").run(banner_url, id);
    res.json({ success: true });
  });

  app.get("/api/products", (req, res) => {
    const { category, type, limit, offset } = req.query;
    let query = "SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id";
    const params: any[] = [];

    if (category) {
      query += " WHERE c.slug = ?";
      params.push(category);
    } else if (type === "queridinho") {
      query += " WHERE p.is_queridinho = 1";
    } else if (type === "destaque") {
      query += " WHERE p.is_destaque = 1";
    } else if (type === "mais_vendido") {
      query += " WHERE p.is_mais_vendido = 1";
    }

    if (limit) {
      query += " LIMIT ?";
      params.push(parseInt(limit as string));
    }
    if (offset) {
      query += " OFFSET ?";
      params.push(parseInt(offset as string));
    }

    const items = db.prepare(query).all(...params);
    res.json(items);
  });

  app.get("/api/products/top-bar", (req, res) => {
    const product = db.prepare(`
      SELECT p.id, c.slug as category_slug 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.is_top_bar = 1 
      LIMIT 1
    `).get() as any;
    res.json(product || null);
  });

  app.post("/api/newsletter", (req, res) => {
    const { name, phone, email } = req.body;
    try {
      db.prepare("INSERT INTO newsletter (name, phone, email) VALUES (?, ?, ?)").run(name, phone, email);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Error saving newsletter" });
    }
  });

  // SigiloPay Webhook Handler
  app.post("/api/webhooks/sigilopay", async (req, res) => {
    try {
      const payload = req.body;
      console.log("SigiloPay Webhook received:", JSON.stringify(payload, null, 2));

      const transaction = payload.transaction || {};
      const metadata = payload.trackProps || payload.metadata || {};
      const client = payload.client || {};
      
      const status = (transaction.status || payload.status || '').toString().toUpperCase();
      const id = transaction.id || payload.id;
      const amount = transaction.amount || payload.amount;
      const identifier = transaction.identifier || payload.identifier;

      if (status === 'PAID' || status === 'COMPLETED' || status === 'OK' || payload.event === 'TRANSACTION_PAID') {
        const pixelId = metadata.pixelId;
        const accessToken = metadata.accessToken;

        // 1. Update SQLite
        try {
          db.prepare("UPDATE orders SET status = 'approved' WHERE id = ? OR pix_code = ?")
            .run(identifier || id, payload.pix_code || "");
          console.log(`Order ${identifier || id} marked as approved via webhook.`);
        } catch (e) {
          console.error("Error updating order via webhook:", e);
        }

        // 2. Meta Pixel CAPI: Purchase
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
              value: Number(amount), 
              content_name: metadata.campaignTitle || 'Compra Wepink',
              content_type: 'product'
            }
          };

          fetch(`https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              data: [event],
              ...(process.env.FB_TEST_CODE ? { test_event_code: process.env.FB_TEST_CODE } : {})
            })
          }).catch(() => {});
        }
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("SigiloPay Webhook Error:", err);
      logError(err);
      return res.status(200).json({ received: true, error: err.message });
    }
  });

  // SigiloPay Integration & Meta Ads Pixel CAPI
  app.post("/api/checkout", async (req, res) => {
    const { email, customerData, items, total, payment_method, card, originUrl } = req.body;
    const userAgent = req.headers['user-agent'] || '';
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp.split(',')[0].trim();

    // Fetch Pixel settings
    const settingsRows = db.prepare("SELECT key, value FROM settings").all() as { key: string, value: string }[];
    const settings: any = {};
    settingsRows.forEach(row => settings[row.key] = row.value);
    
    const pixelId = settings.fb_pixel_id;
    const accessToken = settings.fb_access_token;

    // Captura tracking cookies para CAPI
    const cookies = req.headers.cookie || '';
    const fbp = cookies.split('; ').find((row: string) => row.startsWith('_fbp='))?.split('=')[1];
    const fbc = cookies.split('; ').find((row: string) => row.startsWith('_fbc='))?.split('=')[1];

    // CAPI: InitiateCheckout & AddPaymentInfo
    if (pixelId && accessToken) {
      const hashedEmail = email ? hash(email) : undefined;
      const events = [
        {
          event_name: 'InitiateCheckout',
          event_id: `init-${Date.now()}`,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: originUrl,
          user_data: { 
            client_ip_address: ip,
            client_user_agent: userAgent, 
            em: hashedEmail ? [hashedEmail] : undefined,
            fbp, fbc
          },
          custom_data: { currency: 'BRL', value: Number(total) }
        },
        {
          event_name: 'AddPaymentInfo',
          event_id: `add-${Date.now()}`,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: originUrl,
          user_data: { 
            client_ip_address: ip,
            client_user_agent: userAgent, 
            em: hashedEmail ? [hashedEmail] : undefined,
            fbp, fbc
          },
          custom_data: { currency: 'BRL', value: Number(total) }
        }
      ];
      fetch(`https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: events,
          ...(process.env.FB_TEST_CODE ? { test_event_code: process.env.FB_TEST_CODE } : {})
        })
      }).catch(() => {});
    }

    const publicKey = process.env.SIGILOPAY_PUBLIC_KEY?.trim().replace(/^"|"$/g, '');
    const secretKey = process.env.SIGILOPAY_SECRET_KEY?.trim().replace(/^"|"$/g, '');
    const appUrl = (process.env.APP_URL || '').trim().replace(/\/$/, '');
    const transactionId = `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (publicKey && secretKey) {
      try {
        const endpoint = payment_method === "pix" 
          ? 'https://app.sigilopay.com.br/api/v1/gateway/pix/receive'
          : 'https://app.sigilopay.com.br/api/v1/gateway/card/receive';

        const payload: any = {
          identifier: transactionId,
          amount: parseFloat(Number(total).toFixed(2)),
          description: `Compra Wepink`,
          clientIp: ip || '127.0.0.1',
          payment_method: payment_method === "pix" ? "pix" : "credit_card",
          client: {
            name: (customerData.name || 'Cliente Wepink').trim(),
            email: email.trim(),
            phone: '17981568291',
            document: (customerData.cpf || customerData.cpfCnpj || '12345678909').replace(/\D/g, ''),
            address: {
              street: (customerData.street || 'Rua não informada').trim(),
              number: (customerData.number || 'SN').trim(),
              complement: (customerData.complement || '').trim(),
              neighborhood: (customerData.district || 'Bairro não informado').trim(),
              city: (customerData.city || 'Cidade não informada').trim(),
              state: (customerData.state || 'SP').substring(0, 2).toUpperCase(),
              zipCode: (() => {
                const raw = (customerData.cep || customerData.zipCode || '01001000').replace(/\D/g, '');
                return raw.length === 8 ? `${raw.substring(0, 5)}-${raw.substring(5)}` : raw;
              })(),
              country: 'BR'
            }
          },
          items: items.map((item: any, idx: number) => ({
            id: String(idx + 1),
            title: item.name,
            unit_price: parseFloat(Number(item.price).toFixed(2)),
            quantity: item.quantity
          })),
          metadata: {
            pixelId: pixelId,
            accessToken: accessToken,
            originUrl: originUrl,
            email: email,
            userAgent: userAgent,
            ip: ip,
            fbp: fbp,
            fbc: fbc
          },
          callbackurl: `${appUrl}/api/webhooks/sigilopay`
        };

        console.log(`[SigiloPay] Enviando payload para ${endpoint}:`, JSON.stringify(payload, null, 2));

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-public-key': publicKey,
            'x-secret-key': secretKey
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log(`[SigiloPay] Resposta da API:`, JSON.stringify(data, null, 2));
        
        if (!response.ok) {
          const details = data.details ? ` | Detalhes: ${JSON.stringify(data.details)}` : "";
          throw new Error(`${data.message || data.error || "Erro na SigiloPay"}${details}`);
        }

        // Save Order to SQLite
        const info = db.prepare("INSERT INTO orders (email, customer_data, items, total, status, pix_code, pix_url, card_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .run(
            email, 
            JSON.stringify(customerData), 
            JSON.stringify(items), 
            total, 
            data.status === "paid" ? "approved" : "pending",
            data.pix?.code || data.pix_code || "",
            data.pix?.base64 || data.pix_qr_code || "",
            payment_method === "card" ? JSON.stringify(card) : null
          );

        return res.json({
          success: true,
          orderId: info.lastInsertRowid,
          transactionId: data.transactionId || data.id,
          pixCode: data.pix?.code || data.pix_code,
          pixUrl: data.pix?.base64 || data.pix_qr_code,
          status: data.status === "paid" ? "approved" : "pending"
        });

      } catch (err: any) {
        console.error("SigiloPay Error:", err);
        logError(err);
        return res.status(500).json({ error: err.message });
      }
    }

    // If keys are missing, return error
    const missingKeysMsg = `Configuração de pagamento (SigiloPay) ausente no servidor. Detalhes: PUBLIC_KEY=${publicKey ? 'PRESENTE (' + publicKey.substring(0, 5) + '...)' : 'AUSENTE'}, SECRET_KEY=${secretKey ? 'PRESENTE (' + secretKey.substring(0, 5) + '...)' : 'AUSENTE'}, APP_URL=${appUrl || 'AUSENTE'}. Verifique o arquivo .env no servidor.`;
    logError(missingKeysMsg);
    return res.status(400).json({ error: missingKeysMsg });
  });

  // Admin Product Management
  app.post("/api/admin/products", authenticate, (req, res) => {
    const { 
      name, description, price, old_price, image_url, 
      image_url_2, image_url_3, image_url_4, image_url_5,
      category_id, is_queridinho, is_destaque, is_mais_vendido, is_top_bar 
    } = req.body;
    
    // Check for duplicate name
    const existing = db.prepare("SELECT id FROM products WHERE name = ?").get(name);
    if (existing) {
      return res.status(400).json({ error: "Já existe um produto com este nome idêntico." });
    }

    // If setting as top bar, unset others
    if (is_top_bar) {
      db.prepare("UPDATE products SET is_top_bar = 0").run();
    }

    const info = db.prepare(`
      INSERT INTO products (
        name, description, price, old_price, image_url, 
        image_url_2, image_url_3, image_url_4, image_url_5,
        category_id, is_queridinho, is_destaque, is_mais_vendido, is_top_bar
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, description, price, old_price, image_url, 
      image_url_2, image_url_3, image_url_4, image_url_5,
      category_id, is_queridinho ? 1 : 0, is_destaque ? 1 : 0, is_mais_vendido ? 1 : 0, is_top_bar ? 1 : 0
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/admin/products/:id", authenticate, (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/admin/products/:id", authenticate, (req, res) => {
    const { 
      name, description, price, old_price, image_url, 
      image_url_2, image_url_3, image_url_4, image_url_5,
      category_id, is_queridinho, is_destaque, is_mais_vendido, is_top_bar 
    } = req.body;
    
    if (is_top_bar) {
      db.prepare("UPDATE products SET is_top_bar = 0").run();
    }

    db.prepare(`
      UPDATE products 
      SET name = ?, description = ?, price = ?, old_price = ?, image_url = ?, 
          image_url_2 = ?, image_url_3 = ?, image_url_4 = ?, image_url_5 = ?,
          category_id = ?, is_queridinho = ?, is_destaque = ?, is_mais_vendido = ?, is_top_bar = ?
      WHERE id = ?
    `).run(
      name, 
      description, 
      price, 
      old_price, 
      image_url, 
      image_url_2,
      image_url_3,
      image_url_4,
      image_url_5,
      category_id, 
      is_queridinho ? 1 : 0, 
      is_destaque ? 1 : 0, 
      is_mais_vendido ? 1 : 0, 
      is_top_bar ? 1 : 0, 
      req.params.id
    );
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
