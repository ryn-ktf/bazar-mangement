const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));  // serve frontend files

const PRODUCTS_FILE = "products.json";
const ORDERS_FILE = "orders.json";
const CLIENTS_FILE = "clients.json";

// Helper functions
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Routes ---
app.post("/product", (req, res) => {
  const { code, name, price } = req.body;
  if (!code || !name || !price) return res.status(400).json({ error: "All fields required" });

  const products = readJSON(PRODUCTS_FILE);
  if (products.find(p => p.code === code)) return res.status(400).json({ error: "Code exists" });

  products.push({ code, name, price });
  writeJSON(PRODUCTS_FILE, products);
  res.json({ message: "Product added" });
});

app.post("/client", (req, res) => {
  const { fullName, phone } = req.body;
  if (!fullName || !phone) return res.status(400).json({ error: "Full name and phone required" });

  const clients = readJSON(CLIENTS_FILE);
  if (clients.find(c => c.fullName === fullName && c.phone === phone))
    return res.status(400).json({ error: "Client exists" });

  clients.push({ fullName, phone });
  writeJSON(CLIENTS_FILE, clients);
  res.json({ message: "Client added" });
});

app.get("/clients", (req, res) => {
  res.json(readJSON(CLIENTS_FILE));
});

app.post("/order", (req, res) => {
  const { client, items, paid } = req.body;
  if (!client || !items || items.length === 0) return res.status(400).json({ error: "Invalid order" });

  const clients = readJSON(CLIENTS_FILE);
  if (!clients.find(c => c.fullName === client.fullName && c.phone === client.phone)) {
    clients.push(client);
    writeJSON(CLIENTS_FILE, clients);
  }

  const products = readJSON(PRODUCTS_FILE);
  let total = 0;
  const detailedItems = items.map(i => {
    const product = products.find(p => p.code === i.code);
    if (!product) throw new Error(`Product ${i.code} not found`);
    const subtotal = product.price * i.qty;
    total += subtotal;
    return { ...i, name: product.name, subtotal };
  });

  const order = { client, items: detailedItems, total, paid: paid || 0, remaining: total - (paid || 0), date: new Date() };
  const orders = readJSON(ORDERS_FILE);
  orders.push(order);
  writeJSON(ORDERS_FILE, orders);

  res.json({ message: "Order added" });
});

app.get("/products", (req, res) => res.json(readJSON(PRODUCTS_FILE)));
app.get("/orders", (req, res) => res.json(readJSON(ORDERS_FILE)));

app.listen(process.env.PORT || 3000, () => console.log("Server running"));