import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rechargeRoutes from './routes/recharge.js';
import walletRoutes from './routes/wallet.js';
import paymentRoutes from './routes/payment.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Zora backend running');
});

/** Minimal stub so Flutter [RemoteTelecomService] does not 404 on the legacy hub. */
app.get('/catalog/airtime', (req, res) => {
  const operator = String(req.query.operator || 'roshan').replace(/[^a-z0-9]/gi, '');
  const safe = operator || 'roshan';
  const items = [
    { id: `${safe}_air_10m`, minutes: 10, retailUsdCents: 500 },
    { id: `${safe}_air_15m`, minutes: 15, retailUsdCents: 750 },
    { id: `${safe}_air_25m`, minutes: 25, retailUsdCents: 1000 },
  ];
  res.json({ items });
});

app.use('/api/recharge', rechargeRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);

app.listen(PORT, () => {
  console.log('Server running on port 3000');
});
