const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized Access' });
  }

  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'Unauthorized Access' })
    }
    req.decoded = decoded;
    next();
  })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xak6ecy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const usersCollection = client.db("SummerSchool").collection("users");
    const classesCollection = client.db("SummerSchool").collection('classes');
    const instructorCollection = client.db("SummerSchool").collection('instructor');
    const selectedClassCollection = client.db("SummerSchool").collection("selectedClass");
    const paymentCollection = client.db("SummerSchool").collection("payments");

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'Admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    // users
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'User already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'Admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'Admin' }
      res.send(result);
    })
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'Instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })
    
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'Instructor' }
      res.send(result);
    })
    // classes
    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });
    app.post('/classes', async (req, res) => {
      const newclasses = req.body;
      const result = await classesCollection.insertOne(newclasses);
      res.send(result);
    });
    app.put('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      console.log(filter)
      const updateData = {
        $inc: {
          Available_seats: -1,
          number_of_student: 1
        }
      };
    
      const result = await classesCollection.updateOne(filter, updateData);
      res.send(result);
    });
        
    app.put('/classes/approve/:id', async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      console.log(id, updateData);
    
      const filter = { _id: new ObjectId(id) };
      const updateClassData = {
        $set: {
          Status: 'approve'
        }
      };
    
      const result = await classesCollection.updateOne(filter, updateClassData);
      res.send(result);
    });
    
    app.put('/classes/deny/:id', async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      console.log(id, updateData);
    
      const filter = { _id: new ObjectId(id) };
      const updateClassData = {
        $set: {
          Status: 'denied'
        }
      };
    
      const result = await classesCollection.updateOne(filter, updateClassData);
      res.send(result);
    });
    app.put('/classes/feedback/:id', async (req, res) => {
      const id = req.params.id;
      const { feedback } = req.body;
    
      const filter = { _id: new ObjectId(id) };
      const updateData = {
        $set: {
          feedback: feedback,
        },
      };
    
      const result = await classesCollection.updateOne(filter, updateData);
      res.send(result);
    });        
    app.get('/popularClasses', async (req, res) => {
      const query = {};
      const options = {
        sort: { "number_of_student": -1 }
      };
      const cursor = classesCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/myclasses/:email", async (req, res) => {
      const myclasses = await classesCollection.find({
        instructor_email: req.params.email,
      }).toArray();
      res.send(myclasses)
    })
    // selected class
    app.get("/selectedClass/:email", async (req, res) => {
      const result = await selectedClassCollection.find({
        email: req.params.email,
      })
        .toArray();
      res.send(result)
    })
    app.delete("/selectedClass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    })
    app.post('/selectedClass', async (req, res) => {
      const classes = req.body;
      const result = await selectedClassCollection.insertOne(classes);
      res.send(result);
    })
    app.put('/selectedClass/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateSelectedData = {
        $set: {
          payment: 'paid'
        }
      };
    
      const result = await selectedClassCollection.updateOne(filter, updateSelectedData);
      res.send(result);
    });        
    // payment
    app.post('/create-payment-intent', async (req, res) => {
      try {
        const { Price } = req.body;
        const amount = parseInt(Price * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        });
    
        res.send({
          clientSecret: paymentIntent.client_secret
        });
      } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
      }
    });   
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
    
      res.send(insertResult);
    });
    app.get("/paymenthistory/:email", async (req, res) => {
      const result = await paymentCollection
        .find({ email: req.params.email })
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });    
    // instructor
    app.get('/instructor', async (req, res) => {
      const result = await instructorCollection.find().toArray()
      res.send(result);
    })
    app.get('/popularInstractor', async (req, res) => {
      const query = {};
      const options = {
        sort: { "number_of_students": -1 }
      };
      const result = await instructorCollection.find(query, options).limit(6).toArray();
      res.send(result);
    });    
    app.post('/addinstructor', async (req, res) => {
      const newinstructor = req.body;
      const result = await instructorCollection.insertOne(newinstructor);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Server is running')
})

app.listen(port, () => {
  console.log(`Summer Camp School Server is running on port ${port}`)
})