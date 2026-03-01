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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add is_top_bar column if it doesn't exist
try {
  db.exec("ALTER TABLE products ADD COLUMN is_top_bar INTEGER DEFAULT 0");
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

  app.post("/api/admin/carousel", authenticate, (req, res) => {
    const { image_url, link_url, order_index } = req.body;
    const info = db.prepare("INSERT INTO carousel (image_url, link_url, order_index) VALUES (?, ?, ?)")
      .run(image_url, link_url, order_index || 0);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/admin/carousel/:id", authenticate, (req, res) => {
    const { id } = req.params;
    const { image_url, link_url, order_index } = req.body;
    db.prepare("UPDATE carousel SET image_url = ?, link_url = ?, order_index = ? WHERE id = ?")
      .run(image_url, link_url, order_index || 0, id);
    res.json({ success: true });
  });

  app.delete("/api/admin/carousel/:id", authenticate, (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM carousel WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/categories", (req, res) => {
    const items = db.prepare("SELECT * FROM categories").all();
    res.json(items);
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
      
      const status = (transaction.status || payload.status || '').toString().toLowerCase();
      const id = transaction.id || payload.id;
      const amount = transaction.amount || payload.amount;
      const identifier = transaction.identifier || payload.identifier;

      if (status === 'paid' || status === 'completed' || payload.event === 'TRANSACTION_PAID') {
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
              client_ip_address: cleanIp,
              client_user_agent: metadata.userAgent,
              external_id: [hash(metadata.transactionId)],
            },
            custom_data: { 
              currency: 'BRL', 
              value: Number(amount), 
              content_type: 'product'
            }
          };

          fetch(`https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: [event] })
          }).catch(() => {});
        }
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("SigiloPay Webhook Error:", err);
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
          },
          custom_data: { currency: 'BRL', value: Number(total) }
        }
      ];
      fetch(`https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: events })
      }).catch(() => {});
    }

    const publicKey = process.env.SIGILOPAY_PUBLIC_KEY?.trim();
    const secretKey = process.env.SIGILOPAY_SECRET_KEY?.trim();
    const appUrl = (process.env.APP_URL || '').trim().replace(/\/$/, '');
    const transactionId = `don_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (publicKey && secretKey) {
      try {
        const endpoint = payment_method === "pix" 
          ? 'https://app.sigilopay.com.br/api/v1/gateway/pix/receive'
          : 'https://app.sigilopay.com.br/api/v1/gateway/card/receive';

        const payload: any = {
          identifier: transactionId,
          amount: Number(total),
          description: `Compra Wepink`,
          client: {
            name: customerData.name || 'Cliente',
            email: email || 'cliente@exemplo.com',
            phone: '11999999999',
            document: customerData.cpf?.replace(/\D/g, '') || '12345678909'
          },
          metadata: {
            transactionId: transactionId,
            pixelId: pixelId,
            accessToken: accessToken,
            originUrl: originUrl,
            email: email,
            userAgent: userAgent,
            ip: ip
          },
          callbackurl: `${appUrl}/api/webhooks/sigilopay`
        };

        if (payment_method === "card" && card) {
          payload.card = {
            number: card.number.replace(/\s/g, ""),
            holder_name: card.name,
            exp_month: card.expiry.split("/")[0],
            exp_year: "20" + card.expiry.split("/")[1],
            cvv: card.cvv,
            installments: 1
          };
        }

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

        if (response.ok) {
          if (payment_method === "pix") {
            const info = db.prepare("INSERT INTO orders (email, customer_data, items, total, pix_code, pix_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
              .run(email, JSON.stringify(customerData), JSON.stringify(items), total, data.pix?.code || data.pix_code, data.pix?.base64 || data.pix_qr_code, "pending");

            return res.json({ 
              orderId: info.lastInsertRowid,
              pixCode: data.pix?.code || data.pix_code,
              pixUrl: data.pix?.base64 || data.pix_qr_code,
              status: "pending"
            });
          } else {
            const info = db.prepare("INSERT INTO orders (email, customer_data, items, total, status) VALUES (?, ?, ?, ?, ?)")
              .run(email, JSON.stringify(customerData), JSON.stringify(items), total, data.status === "paid" ? "approved" : "pending");

            return res.json({ 
              orderId: info.lastInsertRowid,
              status: data.status === "paid" ? "approved" : "pending",
              transactionId: data.transactionId || data.id
            });
          }
        } else {
          console.error("SigiloPay API Error:", data);
          return res.status(400).json({ error: data.message || "Erro no processamento do pagamento." });
        }
      } catch (e) {
        console.error("SigiloPay Integration Error:", e);
        return res.status(500).json({ error: "Erro interno ao processar pagamento." });
      }
    }

    // Mock fallback if keys are missing
    if (payment_method === "pix") {
      const pixCode = "00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5913Wepink Store6009SAO PAULO62070503***6304E2B4";
      const pixUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(pixCode);
      const info = db.prepare("INSERT INTO orders (email, customer_data, items, total, pix_code, pix_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(email, JSON.stringify(customerData), JSON.stringify(items), total, pixCode, pixUrl, "pending");
      return res.json({ orderId: info.lastInsertRowid, pixCode, pixUrl, status: "pending" });
    } else {
      const info = db.prepare("INSERT INTO orders (email, customer_data, items, total, status) VALUES (?, ?, ?, ?, ?)")
        .run(email, JSON.stringify(customerData), JSON.stringify(items), total, "approved");
      return res.json({ orderId: info.lastInsertRowid, status: "approved" });
    }
  });

  // Admin Product Management
  app.post("/api/admin/products", authenticate, (req, res) => {
    const { 
      name, description, price, old_price, image_url, 
      image_url_2, image_url_3, image_url_4, image_url_5,
      category_id, is_queridinho, is_destaque, is_mais_vendido, is_top_bar 
    } = req.body;
    
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
