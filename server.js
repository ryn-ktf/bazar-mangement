const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PRODUCTS_FILE = "products.json";
const ORDERS_FILE = "orders.json";
const CLIENTS_FILE = "clients.json";

// --- Helper functions ---
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- 1️⃣ Add a product ---
app.post("/product", (req, res) => {
  const { code, name, price } = req.body;
  const products = readJSON(PRODUCTS_FILE);

  if (products.find(p => p.code === code)) {
    return res.status(400).json({ error: "Product code already exists" });
  }

  products.push({ code, name, price });
  writeJSON(PRODUCTS_FILE, products);
  res.json({ message: "Product added", product: { code, name, price } });
});

// --- 2️⃣ Add a client ---
app.post("/client", (req, res) => {
  const { fullName, phone } = req.body;
  if (!fullName || !phone) return res.status(400).json({ error: "Full name and phone required" });

  const clients = readJSON(CLIENTS_FILE);
  if (clients.find(c => c.fullName === fullName && c.phone === phone)) {
    return res.status(400).json({ error: "Client already exists" });
  }

  clients.push({ fullName, phone });
  writeJSON(CLIENTS_FILE, clients);
  res.json({ message: "Client added", client: { fullName, phone } });
});

// --- 3️⃣ List all clients ---
app.get("/clients", (req, res) => {
  const clients = readJSON(CLIENTS_FILE);
  const orders = readJSON(ORDERS_FILE);

  // Attach orders to each client
  const result = clients.map(c => {
    const clientOrders = orders.filter(o => o.client.fullName === c.fullName && o.client.phone === c.phone);
    return { ...c, orders: clientOrders };
  });

  res.json(result);
});

// --- 4️⃣ Add an order ---
app.post("/order", (req, res) => {
  let { client, items, paid } = req.body;

  if (!client || !client.fullName || !client.phone) return res.status(400).json({ error: "Client info required" });
  if (!items || items.length === 0) return res.status(400).json({ error: "At least one item required" });

  // Auto-add client if new
  const clients = readJSON(CLIENTS_FILE);
  if (!clients.find(c => c.fullName === client.fullName && c.phone === client.phone)) {
    clients.push({ fullName: client.fullName, phone: client.phone });
    writeJSON(CLIENTS_FILE, clients);
  }

  const products = readJSON(PRODUCTS_FILE);
  let total = 0;
  const detailedItems = items.map(i => {
    const product = products.find(p => p.code === i.code);
    if (!product) throw new Error(`Product code ${i.code} not found`);
    const subtotal = product.price * i.qty;
    total += subtotal;
    return { code: i.code, name: product.name, qty: i.qty, subtotal };
  });

  const order = {
    client,
    items: detailedItems,
    total,
    paid: paid || 0,
    remaining: total - (paid || 0),
    date: new Date()
  };

  const orders = readJSON(ORDERS_FILE);
  orders.push(order);
  writeJSON(ORDERS_FILE, orders);

  res.json({ message: "Order added", order });
});

// --- 5️⃣ List products ---
app.get("/products", (req, res) => {
  res.json(readJSON(PRODUCTS_FILE));
});

// --- 6️⃣ List orders ---
app.get("/orders", (req, res) => {
  res.json(readJSON(ORDERS_FILE));
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));