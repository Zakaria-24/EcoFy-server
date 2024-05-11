const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb')
require('dotenv').config()
const port = process.env.PORT || 5000
const app = express()

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rfjtmur.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

const queriesCollection= client.db("EcoFy").collection("queries");
const recommendsCollection= client.db("EcoFy").collection("recommends");

// get all queries
app.get("/queries", async (req, res) =>{
  const result= await queriesCollection.find().toArray();
  res.send(result);
  // console.log(result)
})
// get all query by a specific user
app.get("/query/:email", async (req, res) =>{
  const email= req.params.email;
  const query = {email: email}
  // console.log(query)
  const result= await queriesCollection.find(query).toArray();
  res.send(result);
})

// add a query
app.post("/query", async(req,res)=>{
  const addQuery= req.body;
  const result = await queriesCollection.insertOne(addQuery);
  res.send(result);
})

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('EcoFy Server is Running....')
  })
  
  app.listen(port, () => console.log(`Server running on port ${port}`))