const express = require('express');
const cors = require('cors'); 
const connectDB = require('./config/db');
require('dotenv').config();

const gateRoutes = require('./routes/gateRoutes');

const app = express();

connectDB();

app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request Body:', req.body);
  next();
});

app.use('/api', gateRoutes);


app.get('/', (req, res) => {
  res.json({ status: 'Service is running' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
