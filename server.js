const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const SUPABASE_URL = "https://vlbjbpotsxssihebodyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYmpicG90c3hzc2loZWJvZHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjI0MjksImV4cCI6MjA5MDEzODQyOX0.xWN9LO5_Rl6JIKZpVOpm-YOSoEwfVwH8FwN3T8I30wE";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Products ---
app.post("/product", async (req, res) => {
  const { code, name, price } = req.body;
  if (!code || !name || !price) return res.status(400).json({ error: "All fields required" });

  const { data: existing } = await supabase.from("products").select("*").eq("code", code);
  if (existing.length) return res.status(400).json({ error: "Code exists" });

  const { error } = await supabase.from("products").insert([{ code, name, price }]);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Product added" });
});


app.get("/products", async (req, res) => {
  const { data, error } = await supabase.from("products").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/update-product", async (req, res) => {
  const { code, price } = req.body;

  if (!code || !price) {
    return res.status(400).json({ error: "Code and price required" });
  }

  const { error } = await supabase
    .from("products")
    .update({ price })
    .eq("code", code);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Price updated" });
});


// --- Clients ---
app.post("/client", async (req, res) => {
  const { fullName, phone } = req.body;
  if (!fullName || !phone) return res.status(400).json({ error: "Full name and phone required" });

  const { data: existing } = await supabase.from("clients").select("*").eq("fullName", fullName).eq("phone", phone);
  if (existing.length) return res.status(400).json({ error: "Client exists" });

  const { error } = await supabase.from("clients").insert([{ fullName, phone }]);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Client added" });
});

app.get("/clients", async (req, res) => {
  const { data, error } = await supabase.from("clients").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- Orders ---
app.post("/order", async (req, res) => {
  const { client, items, paid } = req.body;
  if (!client || !items || items.length === 0) return res.status(400).json({ error: "Invalid order" });

  // Ensure client exists
  const { data: existingClients } = await supabase.from("clients").select("*").eq("fullName", client.fullName).eq("phone", client.phone);
  if (existingClients.length === 0) {
    await supabase.from("clients").insert([client]);
  }

  // Fetch products
  const { data: allProducts } = await supabase.from("products").select("*");
  let total = 0;
  const detailedItems = items.map(i => {
    const product = allProducts.find(p => p.code === i.code);
    if (!product) throw new Error(`Product ${i.code} not found`);
    const subtotal = product.price * i.qty;
    total += subtotal;
    return { ...i, name: product.name, subtotal };
  });

  const order = { client, items: detailedItems, total, paid: paid || 0, remaining: total - (paid || 0), date: new Date().toISOString() };
  const { error } = await supabase.from("orders").insert([order]);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Order added" });
});

app.get("/orders", async (req, res) => {
  const { data, error } = await supabase.from("orders").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));