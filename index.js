const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



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
    const classesCollection = client.db("SummerSchool").collection('classes');
    const instructorCollection = client.db("SummerSchool").collection('instructor');
    const selectedClassCollection = client.db("SummerSchool").collection("selectedClass")


    // classes
    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    })
    app.get('/popularClasses', async (req, res) => {
      const query = {};
      const options = {
        sort: { "number_of_student": -1 }
      };
      const cursor = classesCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });
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
      const cursor = instructorCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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