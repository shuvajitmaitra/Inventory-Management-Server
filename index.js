const express = require("express");
require('dotenv').config()
const cors = require("cors");
const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wyy6auz.mongodb.net/?retryWrites=true&w=majority`;

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
        const usersCollection = client.db("TreeTreasuresDB").collection("users");
        const shopCollection = client.db("TreeTreasuresDB").collection("shop");
        const productCollection = client.db("TreeTreasuresDB").collection("product");


        // check manager
         
    app.get("/users/:email", async (req, res) => {
        const email = req.params.email
        // if(email !== res?.decoded?.email){
        //   return res.status(403).send({message: "Forbidden access"})
        // }
        const query = { email: email }
        const user = await usersCollection.findOne(query)
        let manager = false
        if (user) {
          manager = user?.role === "manager"
        }
        res.send({ manager })
      })
    app.get("/manager/:email", async (req, res) => {
        const email = req.params.email
        // if(email !== res?.decoded?.email){
        //   return res.status(403).send({message: "Forbidden access"})
        // }
        const query = { email: email }
        const manager = await usersCollection.findOne(query)
       
        res.send(manager)
      })
        // user related api
        app.post("/users", async (req, res) => {
            const users = req.body
            const query = { email: users.email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exist", insertedId: null })
            }
            const result = await usersCollection.insertOne(users)
            res.send(result)
        })

        app.patch('/users/manager/:email', async (req, res) => {
            const email = req.params.email
            const shopManager = req.body
            const query = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    shopName: shopManager.shopName,
                    shopLogo: shopManager.shopLogo,
                    shopId: shopManager.shopId,
                    role: shopManager.role,
                    productLimit: 3,
                }
            }

            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })
        app.patch('/newProductLimit/:email', async (req, res) => {
            const email = req.params.email
            const newProductLimit = req.body
            const query = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    productLimit: newProductLimit.newProductLimit,
                }
            }

            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        //   shop related api
        app.post("/shopData", async (req, res) => {
            const shopData = req.body
            const query = {shopOwnerEmail: shopData.shopOwnerEmail}
            const existingUser = await shopCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "Shop already exist", insertedId: null })
            }
            const result = await shopCollection.insertOne(shopData)
            res.send(result)
        })

        // Product related api
        app.post("/products", async (req, res) => {
            const products = req.body
            const result = await productCollection.insertOne(products)
            res.send(result)
        })

        app.get("/products", async(req, res)=>{
            const email = req.params.email
            const query = {shopOwnerEmail: email}
            const result = await productCollection.find(query).toArray()
            res.send(result)
        })

        app.get("/singleProduct/:id", async(req, res)=>{
            const id = req.params.id
            console.log(id);
            const query = {_id: new ObjectId(id)}
            const result = await productCollection.findOne(query)
            res.send(result)
        })
        app.patch('/productUpdate/:id', async (req, res) => {
            const id = req.params.id
            const data = req.body
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    productName:data?.productName,
                    productImage:data?.productImage,
                    productQuantity:data?.productQuantity,
                    productLocation:data?.productLocation,
                    profitMargin:data?.profitMargin,
                    makingCost:data?.makingCost,
                    productPrice:data?.productPrice,
                    productDiscount:data?.productDiscount,
                    productDescription:data?.productDescription,
                }
            }

            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        app.delete('/productDelete/:id',  async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query)
            res.send(result)
          })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally { }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Crud is running...");
});

app.listen(port, () => {
    console.log(`Simple Crud is Running on port ${port}`);
});
