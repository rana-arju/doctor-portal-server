const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
//middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const e = require('express');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sptt8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];
    if (!authHeader) {
      return res.status(404).send({message: "Unauthorize access"})
    }
    if (token) {
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
        if (err) {
          return res.status(403).send({message: "Forbidden access"})
        }
   req.decoded= decoded;
   next();
});
    }
    
}
async function run() {
  try {
    await client.connect();
    //Colection
    const serviceCollections = client.db("doctorPortal").collection("services");
    const bookingCollections = client.db("doctorPortal").collection("booking");
    const userCollections = client.db("doctorPortal").collection("users");
    const doctorsCollections = client.db("doctorPortal").collection("doctor");
    const paymentCollections = client.db("doctorPortal").collection("payments");
    const verifyAdmin = async (req, res, next) => {
       const requester = req.decoded.email;
      const requesterAccount = await userCollections.findOne({email: requester});
      if (requesterAccount.role === 'admin') {
        next();
      }else{
        res.status(403).send({message: 'forbidden access'})
      }
    }
    //Payment process
    app.post('/create-payment-intent',verifyJWT, async(req, res) => {
      const {price} = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ['card']
         
        });
        res.send({clientSecret: paymentIntent.client_secret})
      })

  //user PUT
  app.put('/user/:email', async(req, res) => {
    const email = req.params.email;
    const user = req.body;
    const filter = {email: email};
    const options = { upsert: true };
     const updateDoc = {
      $set: user,
    };
    const result = await userCollections.updateOne(filter, updateDoc, options);
    const token = jwt.sign(filter, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'});
    res.send({result, token});
  });
  app.get('/admin/:email', async(req, res) => {
    const email = req.params.email;
    const user = await userCollections.findOne({email: email});
    const isAdmin = user.role === 'admin';
    res.send({admin: isAdmin});
  })
    //Make Admin PUT
  app.put('/user/admin/:email',verifyJWT,verifyAdmin, async(req, res) => {
    const email = req.params.email;
    const filter = {email: email};
    const updateDoc = {
        $set: {role: 'admin'},
    };
    const result = await userCollections.updateOne(filter, updateDoc);
    res.send(result);
  });
    // All User
    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollections.find({}).toArray();
      res.send(users)
    });
    //Specipic booking list find
    app.get('/booking',verifyJWT, async(req, res)=> {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = {patient: patient};
        const bookings = await bookingCollections.find(query).toArray();
        res.send(bookings)
      }
      else{
        return res.status(403).send('Forbiddent Access')
      }
    })
    //Get
    app.get('/booking/:id',verifyJWT, async(req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const booking = await bookingCollections.findOne(query);
      res.send(booking)
    })
    //post
    app.post('/booking', async(req, res) => {
      const booking = req.body;
      const query = {treatment: booking.treatment, date: booking.date, patient: booking.patient};
      const exist = await bookingCollections.findOne(query);
      if (exist) {
        return res.send({success:false, message: exist});
      }
      const result = await bookingCollections.insertOne(booking);
      res.send({success: true, result});
    });

    //Patch
    app.patch('/booking/:id',verifyJWT, async(req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = {_id: ObjectId(id)};
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        }
      }
      const result  = await paymentCollections.insertOne(payment);
      const updatedBooking = await bookingCollections.updateOne(filter, updatedDoc);
      res.send(updatedDoc)
    })
    //all service get
    app.get('/services', async(req, res) => {
      const cursor = serviceCollections.find({}).project({name: 1});
      const services = await cursor.toArray();
      res.send(services);
    });
    app.get('/available', async(req, res) => {
      const date = req.query.date;
      const services = await serviceCollections.find().toArray();
      const query = {date: date};
      const bookings = await bookingCollections.find(query).toArray();
      services.forEach(service => {
        const serviceBooking = bookings.filter(b => b.treatment === service.name);
        const booked = serviceBooking.map(s => s.slot);
        const available = service.slots.filter(slot => !booked.includes(slot));
        service.slots = available;
      })
      res.send(services);
    });
  ///Doctor Collection

  //post
  app.post('/doctor',verifyJWT,verifyAdmin, async(req, res) => {
    const doctor = req.body;
    const result = await doctorsCollections.insertOne(doctor);
    res.send(result);
  });
  //Get ALl Doctors
  app.get('/doctor',verifyJWT, verifyAdmin, async(req, res) => {
    const doctor = await doctorsCollections.find().toArray();
    res.send(doctor);
  });
  app.delete('/doctor/:email',verifyJWT, verifyAdmin, async(req, res) => {
    const email = req.params.email;
    const doctor = await doctorsCollections.deleteOne({email: email});
    res.send(doctor);
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