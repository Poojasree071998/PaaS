const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from DeployFlow Sample Test!',
    status: 'Ready',
    timestamp: new Date().toISOString(),
    env: {
      node_env: process.env.NODE_ENV,
      port: PORT
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Sample app listening at http://localhost:${PORT}`);
});
