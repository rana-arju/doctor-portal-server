const express = require('express');
require('dotenv').config();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
//middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sptt8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  console.log('running...');
  // perform actions on the collection object
  client.close();
});



app.get('/', (req, res) => {
    res.send('Doctor Portal Running..')
});
app.listen(port, ()=> {
    console.log('Server running on port: ', port);
});