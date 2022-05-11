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

async function run() {
  try {
    await client.connect();
    const appointmentCollections = client.db("doctorPortal").collection("services");
  //all service get
  app.get('/services', async(req, res) => {
    const cursor = appointmentCollections.find({});
    const services = await cursor.toArray();
    res.send(services);
  })

  } finally {
    // await client.close();
  }
}
run().catch(console.dir)



app.get('/', (req, res) => {
    res.send('Doctor Portal Running..')
});
app.listen(port, ()=> {
    console.log('Server running on port: ', port);
});