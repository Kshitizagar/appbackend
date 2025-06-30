const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const xlsx = require('xlsx');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 5001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb://mongo:MhoksKvxCNfbzFFKhLqMFnIcHCYTwsCy@switchback.proxy.rlwy.net:37637', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Product Schema & Model
const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  product_link: String,
  image_link: String,
  category: String
}));

// Multer setup for Excel upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.originalname)
});
// const upload = multer({ storage });
const upload = multer({ storage: multer.memoryStorage() });

// ✉️ Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'diamondking9239@gmail.com',
    pass: 'gqcfjgobsdrtqrsr' // Gmail App Password
  }
});

// 📦 CRUD APIs for Product
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
// app.post('/api/send-email-excel', upload.single('file'), async (req, res) => {
//   // const filePath = req.file.path;

//   try {
//     const workbook = xlsx.readFile(filePath);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const data = xlsx.utils.sheet_to_json(sheet);

//     const recipients = data.map(row => row.email).filter(Boolean);
//     if (recipients.length === 0) return res.status(400).json({ error: 'No valid emails found in file' });

//     const products = await Product.find();

//     const htmlBody = products.map((p, i) => `
//       <p>
//         <strong>${i + 1}. ${p.name}</strong><br/>
//         Price: ₹${p.price}<br/>
//         Category: ${p.category}<br/>
//         Description: ${p.description}<br/>
//         <a href="${p.product_link}">Product Link</a><br/>
//         <a href="${p.image_link}">Image Link</a>
//       </p><hr/>
//     `).join('');

//     const mailOptions = {
//       from: 'diamondking9239@gmail.com',
//       bcc: recipients,
//       subject: '📦 Product List',
//       html: htmlBody,
//     };

//     const result = await transporter.sendMail(mailOptions);
//     console.log("✅ Emails sent to:", recipients.length);
//     res.json({ message: 'Emails sent successfully!', result });
//   } catch (error) {
//     console.error("❌ Email send error:", error);
//     res.status(500).json({ error: 'Failed to send emails' });
//   }
// });

// 📩 Send product email to multiple users via Excel upload
app.post('/api/send-email-excel', upload.single('file'), async (req, res) => {
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
app.post('/api/send-email', async (req, res) => {
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
    to: 'kshitizdpr@gmail.com,sohailjm59@gmail.com,ayushtripathi4475@gmail.com,kshitiz.agarwal@gmail.com',
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

// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});






// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const nodemailer = require('nodemailer');
// // require('dotenv').config(); // Load .env variables

// const app = express();
// const PORT = 5000;

// // Middlewares
// app.use(cors());
// app.use(express.json());

// // MongoDB Connection
// mongoose.connect('mongodb://localhost:27017/productdb', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// }).then(() => console.log('✅ MongoDB connected----'))
//   .catch(err => console.error('❌ MongoDB connection error:', err));

// // Product Schema & Model
// const Product = mongoose.model('Product', new mongoose.Schema({
//   name: String,
//   price: Number,
//   description: String,
//   product_link: String,
//   image_link: String,
//   category: String
// }));

// // API Endpoints
// app.get('/api/products', async (req, res) => {
//   try {
//     const products = await Product.find();
//     res.json(products);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch products' });
//   }
// });

// app.post('/api/products', async (req, res) => {
//   try {
//     const product = new Product(req.body);
//     await product.save();
//     res.json(product);
//   } catch (err) {
//     res.status(400).json({ error: 'Failed to add product' });
//   }
// });

// app.put('/api/products/:id', async (req, res) => {
//   try {
//     const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!updated) return res.status(404).json({ message: 'Product not found' });
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to update product' });
//   }
// });

// app.delete('/api/products/:id', async (req, res) => {
//   try {
//     await Product.findByIdAndDelete(req.params.id);
//     res.sendStatus(204);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to delete product' });
//   }
// });

// // 📨 Send Email
// const bodyParser = require('body-parser');
// app.use(bodyParser.json());

// app.post('/api/send-email', async (req, res) => {
//   const { products } = req.body;
//  // console.log(products);
//   console.log("----------------------------------");

//   console.log("📦 Received product data:", products);

//   if (!products || !Array.isArray(products)) {
//     console.log("❌ Invalid product data received.");
//     return res.status(400).json({ error: 'Invalid product data' });
//   }

//   const htmlBody = products.map((p, i) => `
//     <p>
//       <strong>${i + 1}. ${p.name}</strong><br/>
//       Price: ₹${p.price}<br/>
//       Category: ${p.category}<br/>
//       Description: ${p.description}<br/>
//       <a href="${p.product_link}">Product Link</a><br/>
//       <a href="${p.image_link}">Image Link</a>
//     </p><hr/>
//   `).join('');

//   console.log("📧 Generated HTML body for email.");

//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: 'diamondking9239@gmail.com',     // Sender Gmail
//       pass: 'gqcfjgobsdrtqrsr'                    // Gmail App Password
//     }
//   });

//   const mailOptions = {
//     from: 'diamondking9239@gmail.com',
//     to: 'kshitizdpr@gmail.com,sohailjm59@gmail.com',             // Receiver email
//     subject: '📦 Product List',
//     html: htmlBody,
//   };

//   console.log("📨 Sending email...");

//   try {
//     const result = await transporter.sendMail(mailOptions);
//     console.log("✅ Email sent successfully:", result.response);
//     res.json({ message: '📨 Email sent successfully!' });
//   } catch (err) {
//     console.log("❌ Email send error------------------------------------------------:", err);
//     res.status(500).json({ error: 'Failed to send email---' });
//   }
// });


// // Start Server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });
