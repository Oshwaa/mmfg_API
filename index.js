// index.js
require('dotenv').config();
const express = require('express');
const db = require('./connection'); 
const nonMemberRouter = require('./routes/nonMemberRouter');
const inventoryRouter = require('./routes/inventoryRouter')
const transactionRouter = require('./routes/transactionRouter')
const memberRouter = require('./routes/MemberRouter')
const bodyParser = require('body-parser'); 
const app = express();
var cors = require('cors')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

//non-member endpoint
app.use('/api/non-member', nonMemberRouter);

//inventory endpoint
app.use('/api/inventory', inventoryRouter);

app.use('/api/transaction', transactionRouter);

app.use('/api/member', memberRouter);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

