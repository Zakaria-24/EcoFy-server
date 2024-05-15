const express = require('express')
const cors = require('cors')

const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const port = process.env.PORT || 5000
const app = express()

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://ecofy-dfbef.web.app',
    'https://ecofy-dfbef.firebaseapp.com',
  ],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// create jwt middleware for verify data
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'Unauthorized Access' })
  if (token) {
    jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
      if (err) {
        // console.log(err)
        return res.status(401).send({ message: 'Unauthorized Access' })
      }
      // console.log(decoded)

      req.user = decoded
      next()
    })
  }
}




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


// jwt create/generate
app.post('/jwt', async (req, res) => {
  const email = req.body
  const token = jwt.sign(email, process.env.TOKEN_SECRET, {
    expiresIn: '7d',
  })
  res
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    })
    .send({ success: true })
})

  // Clear token on logout
  app.get('/logout', (req, res) => {
    res
      .clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 0,
      })
      .send({ success: true })
  })


// get all queries
app.get("/queries", async (req, res) =>{

  // for search functionality
      const search = req.query.search  
      let query = {
        // product_name: { $regex: search, $options: 'i' },
      }
      if(search) { query = {product_name: { $regex: search, $options: 'i' }}}
      
  const result= await queriesCollection.find(query).sort({dateTime: -1}).toArray();
  res.send(result);
})
// get all query/myQuery by a specific user
app.get("/query/:email", verifyToken, async (req, res) =>{
  const email= req.params.email;
  // email verification
  const tokenEmail = req.user.email
  if (tokenEmail !== email) {
    return res.status(403).send({ message: 'Forbidden Access' })
  }

  const query = {email: email}
  const result= ((await queriesCollection.find(query).sort({dateTime: -1}).toArray()));
  res.send(result);
})
// get query by a specific id for default value of update
app.get("/UpdateQuery/:id", async (req, res) =>{
  const id= req.params.id;
  const filter = {_id: new ObjectId(id)}
  const result= await queriesCollection.findOne(filter);
  res.send(result);
})
// get query by a specific id for details
app.get("/details/:id", async (req, res) =>{
  const id= req.params.id;
  const filter = {_id: new ObjectId(id)}
  const result= await queriesCollection.findOne(filter);
  res.send(result);
})



// get all recommendation related to specific query........
  app.get("/queryRelatedRecommendaton/:queryId", async (req, res) =>{
    const queryId= req.params.queryId;
    const filter = {queryId: queryId }
    const result= ((await recommendsCollection.find(filter).sort({dateTime: -1}).toArray()));
    res.send(result);
  })

  // get all recommendations by specific user
  app.get("/myRecommendations/:recommenderEmail", async (req, res) =>{
    const recommenderEmail= req.params.recommenderEmail;
    // console.log(recommenderEmail)
    const filter = {recommenderEmail: recommenderEmail}
    const result= await recommendsCollection.find(filter).toArray();
    res.send(result);
  })




  // get recommendations for me without my recommendations
  app.get("/recommendationsForMe/:email", async (req, res) =>{
    const email= req.params.email;
    const query = {email: email}
    const result= await recommendsCollection.find(query).sort({dateTime: -1}).toArray();
    res.send(result);
  })
// add a query
app.post("/query", verifyToken, async(req,res)=>{
  const addQuery= req.body;
  const result = await queriesCollection.insertOne(addQuery);
  res.send(result);
})

// add a recommendation 
  app.post("/recommendation/:queryId", async(req,res)=>{
    // for post recommendation
  const recommendData= req.body;
  const result = await recommendsCollection.insertOne(recommendData);

  // update recommendation count
  const id = { _id: new ObjectId( req.params.queryId ) }
const updateCount = {
   $inc: { recommendationCount: 1 },
}
const updateRecommendationCount = await queriesCollection.updateOne( id, updateCount );

  res.send(result);
  })




    // update a my Query
    app.put('/query/:id',  async (req, res) => {
      const id = req.params.id
      const queryData = req.body
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...queryData,
        },
      }
      const result = await queriesCollection.updateOne(filter, updateDoc, options)
      res.send(result)
    })

    // Delete a my query
    app.delete('/query/:id',  async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const result = await queriesCollection.deleteOne(filter)
      res.send(result)
    })

    // Delete a my Recommendation
    app.delete('/recommendation/:id',  async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const data = await recommendsCollection.findOne(filter)
      const result = await recommendsCollection.deleteOne(filter)

      // for decreases a recommendation count
      const queryId = { _id: new ObjectId( data.queryId ) }
      const updateCount = {
         $inc: { recommendationCount: -1 },
      }
      const updateRecommendationCount = await queriesCollection.updateOne( queryId, updateCount );
      console.log(updateRecommendationCount) 

      res.send(result)
    })


    // Send a ping to confirm a successful connection
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('EcoFy Server is Running....')
  })
  
  app.listen(port, () => console.log(`Server running on port ${port}`))