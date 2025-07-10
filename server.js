
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const xlsx = require('xlsx');
const bodyParser = require('body-parser');
const path = require('path');
require("uuid");
require("dotenv").config();
const useragent = require('express-useragent');

const app = express();
app.set('trust proxy', true);
const PORT = 5001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(useragent.express());


// MongoDB Connection
mongoose.connect('mongodb://mongo:MhoksKvxCNfbzFFKhLqMFnIcHCYTwsCy@switchback.proxy.rlwy.net:37637', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// mongoose.connect('mongodb://127.0.0.1:27017/visitorTest', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// }).then(() => console.log('✅ Local MongoDB connected'))
//   .catch(err => console.error('❌ MongoDB connection error:', err));

  
// Product Schema & Model
const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  product_link: String,
  image_link: String,
  category: String
}));


const visitSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
});

// const visitorSchema = new mongoose.Schema({
//   visitorId: { type: String, unique: true },
//   ipAddress: String, 
//   timestamp: { type: Date, default: Date.now },
// });

const visitorSchema = new mongoose.Schema({
  visitorId: { type: String, unique: true },
  ipAddress: String,
  browser: String,
  os: String,
  device: String,
  platform: String,
  timestamp: { type: Date, default: Date.now },
});


const Visit = mongoose.model("Visit", visitSchema);
const Visitor = mongoose.model("Visitor", visitorSchema);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage: multer.memoryStorage() });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'diamondking9239@gmail.com',
    pass: 'gqcfjgobsdrtqrsr' // Gmail App Password
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Failed to add product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Product not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});


// 📩 Send product email to multiple users via Excel upload
app.post('/api/sendEmailExcel', upload.single('file'), async (req, res) => {
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); // ⬅️ Read from memory
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const recipients = data.map(row => row.email).filter(Boolean);
    if (recipients.length === 0) return res.status(400).json({ error: 'No valid emails found in file' });

    const products = await Product.find();

    const htmlBody = products.map((p, i) => `
      <p>
        <strong>${i + 1}. ${p.name}</strong><br/>
        Price: ₹${p.price}<br/>
        Category: ${p.category}<br/>
        Description: ${p.description}<br/>
        <a href="${p.product_link}">Product Link</a><br/>
        <a href="${p.image_link}">Image Link</a>
      </p><hr/>
    `).join('');

    const mailOptions = {
      from: 'diamondking9239@gmail.com',
      bcc: recipients,
      subject: '📦 Product List',
      html: htmlBody,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Emails sent to:", recipients.length);
    res.json({ message: 'Emails sent successfully!', result });
  } catch (error) {
    console.error("❌ Email send error:", error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});


// 📨 Fallback email endpoint with static recipients
app.post('/api/sendEmail', async (req, res) => {
  const { products } = req.body;

  if (!products || !Array.isArray(products)) {
    return res.status(400).json({ error: 'Invalid product data' });
  }

  const htmlBody = products.map((p, i) => `
    <p>
      <strong>${i + 1}. ${p.name}</strong><br/>
      Price: ₹${p.price}<br/>
      Category: ${p.category}<br/>
      Description: ${p.description}<br/>
      <a href="${p.product_link}">Product Link</a><br/>
      <a href="${p.image_link}">Image Link</a>
    </p><hr/>
  `).join('');

  const mailOptions = {
    from: 'diamondking9239@gmail.com',
    to: 'kshitizdpr@gmail.com,kshitiz.agarwal@gmail.com',
    subject: '📦 Product List',
    html: htmlBody,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    res.json({ message: '📨 Email sent successfully!' });
  } catch (err) {
    console.log("❌ Email send error:", err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});
// 🟡 Count total visits
app.post("/api/visit", async (req, res) => {
  let record = await Visit.findOne();
  if (!record) {
    record = new Visit({ count: 1 });
  } else {
    record.count += 1;
  }
  await record.save();
  res.json({ totalVisits: record.count });
});

// 🟢 Count unique visitors
// app.post("/api/uniqueVisit", async (req, res) => {
//   const { visitorId } = req.body;
//   if (!visitorId) return res.status(400).json({ error: "Missing visitorId" });

//   // ✅ Get user's IP address
//   const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;


//   try {
//     let existing = await Visitor.findOne({ visitorId });
//     if (!existing) {
//     //   await Visitor.create({ visitorId });
//     await Visitor.create({ visitorId, ipAddress });
//     }
//     const uniqueCount = await Visitor.countDocuments();
//     res.json({ totalUniqueVisitors: uniqueCount });
//   } catch (err) {
//     res.status(500).json({ error: "Error tracking visitor" });
//   }
// });

// app.post("/api/uniqueVisit", async (req, res) => {
//   const { visitorId } = req.body;
//   if (!visitorId) return res.status(400).json({ error: "Missing visitorId" });

//   const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

//   const { browser, os, platform, isMobile, isDesktop } = req.useragent;
//   const device = isMobile ? 'Mobile' : isDesktop ? 'Desktop' : 'Other';

//   try {
//     let existing = await Visitor.findOne({ visitorId });
//     if (!existing) {
//       await Visitor.create({
//         visitorId,
//         ipAddress,
//         browser,
//         os,
//         device,
//         platform
//       });
//     }
//     const uniqueCount = await Visitor.countDocuments();
//     res.json({ totalUniqueVisitors: uniqueCount });
//   } catch (err) {
//     res.status(500).json({ error: "Error tracking visitor" });
//   }
// });

app.post("/api/uniqueVisit", async (req, res) => {
  const { visitorId } = req.body;
  if (!visitorId) return res.status(400).json({ error: "Missing visitorId" });

  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const { browser, os, platform, isMobile, isDesktop } = req.useragent;
  const device = isMobile ? 'Mobile' : isDesktop ? 'Desktop' : 'Other';

  const visitorInfo = {
    visitorId,
    ipAddress,
    browser,
    os,
    device,
    platform,
    timestamp: new Date().toISOString()
  };

  // 👇 Print to terminal
  // console.log("👤 New Visitor:", visitorInfo);

  try {
    let existing = await Visitor.findOne({ visitorId });
    if (!existing) {
      await Visitor.create(visitorInfo);
    }
    const uniqueCount = await Visitor.countDocuments();
    res.json({ totalUniqueVisitors: uniqueCount });
  } catch (err) {
    res.status(500).json({ error: "Error tracking visitor" });
  }
});



app.get("/api/stats", async (req, res) => {
  const total = (await Visit.findOne())?.count || 0;
  const unique = await Visitor.countDocuments();
  res.json({ totalVisits: total, totalUniqueVisitors: unique });
});

// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
