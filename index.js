const express = require("express");
var jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_SK);
const cors = require("cors");
const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
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
        const paymentCollection = client.db("TreeTreasuresDB").collection("payments");
        const checkOutCollection = client.db("TreeTreasuresDB").collection("checkOut");
        const salesCollection = client.db("TreeTreasuresDB").collection("sales");



// ---------------------------------------
// jwt related api
// ---------------------------------------


 app.post('/jwt', async (req, res) => {
    const userEmail = req.body;
    const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    res.send({ token })
  })

//   verifyToken token.....................
  const verifyToken = (req, res, next) => {
    if (!req?.headers?.authorization) {
      return res.status(401).send({ message: "Unauthorized Access" })
    }
    const token = req.headers.authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
      if (error) {
        return res.status(401).send({ message: "Unauthorized Access" })
      }
      req.decoded = decoded
      next()
    })
  }

   // verify Manager 
   const verifyManager = async (req, res, next) => {
    const email = req.decoded.email
    const query = { email: email }
    const user = await usersCollection.findOne(query)
    isManager = user?.role === "manager"
    if (!isManager) {
      return res.status(403).send({ message: "Forbidden access" })
    }
    next()
  }


        // check manager
        //  isUser
        app.get("/users/:email", verifyToken, async (req, res) => {
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

        //   Is admin
        app.get("/users/admin/:email",verifyToken, async (req, res) => {
            const email = req.params.email
            // if(email !== res?.decoded?.email){
            //   return res.status(403).send({message: "Forbidden access"})
            // }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === "Admin"
            }
            res.send({ admin })
        })
        app.get("/manager/:email", verifyToken, async (req, res) => {
            const email = req.params.email
            // if(email !== res?.decoded?.email){
            //   return res.status(403).send({message: "Forbidden access"})
            // }
            const query = { email: email }
            const manager = await usersCollection.findOne(query)

            res.send(manager)
        })



        // ---------------------------------------
        // user related api
        // ---------------------------------------


        app.post("/users",  async (req, res) => {
            const users = req.body
            const query = { email: users.email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exist", insertedId: null })
            }
            const result = await usersCollection.insertOne(users)
            res.send(result)
        })

        app.patch('/users/manager/:email', verifyToken,  async (req, res) => {
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
                    shopInfo:shopManager.shopInfo,
                    shopLocation:shopManager.shopLocation,
                    productLimit: 3,
                    subscriptionType: "Free"
                }
            }

            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        app.patch('/newProductLimit/:email', verifyToken,  async (req, res) => {
            const email = req.params.email
            const newProductLimit = req.body
            const query = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    productLimit: newProductLimit.newProductLimit,
                    subscriptionType: newProductLimit.subscriptionType,
                }
            }

            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })
        app.get("/all-shop", verifyToken,  async(req, res) => {
            const query = { role: 'manager' }
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })
        app.get("/admin-sell-summary", verifyToken,  async(req, res) => {
            const page = req.query.page
            const query = { role: {$ne: "Admin"} }///
            const adminQuery = {role: {$eq: "Admin"}}
            const users = await usersCollection.find(query).toArray()///
            const adminResult = await usersCollection.findOne(adminQuery)
            const totalProduct = await productCollection.countDocuments()
            const totalSale = await salesCollection.countDocuments()
            const payStats = await paymentCollection.find(query).toArray()
            const pageNumber = parseInt(page);
            const perPage = 2;
            const skip = perPage * pageNumber;
            const totalUser = users.length
            const  result = await usersCollection.find(query).skip(skip).limit(perPage).toArray()

            res.send({result,totalUser,adminResult, totalProduct,totalSale, payStats })
        })

        app.patch("/system-admin-income", verifyToken,  async(req, res)=>{
            const price = parseInt(req.query.price)
            const query = {role: "Admin"}
            const result = await usersCollection.findOne(query)
            const income = result?.income + price
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    income: income
                }
            }

            const adminIncome  = await usersCollection.updateOne(query, updateDoc, options)
            res.send(adminIncome)
        })

        // ---------------------------------------
        //   shop related api
        // ---------------------------------------


        app.post("/shopData", verifyToken, async (req, res) => {
            const shopData = req.body;
            const shopId = shopData.shopId;
            const shopInfo = await shopCollection.findOne({shopId:shopId})
            const shopOwnerEmail= shopInfo.email;
        
            if (shopInfo.shopId = shopId) {
                    const subAdminInfo = { role: "shopAdmin", email: shopData.shopOwnerEmail };
        
                    const updateShopAdmin = await usersCollection.updateOne(
                        { email : shopOwnerEmail },
                        { $addToSet: { subAdmin: subAdminInfo } },
                        { upsert: true }
                    );
        
                    return {massge: 'sub admin added successfully',updateShopAdmin}
            }
        
            const result = await shopCollection.insertOne(shopData);
        
            res.send(result);
        });


        // ---------------------------------------
        // Product related api
        // ---------------------------------------


        app.post("/products", verifyToken,  async (req, res) => {
            const products = req.body
            const result = await productCollection.insertOne(products)
            res.send(result)
        })

        app.get("/products/:email", verifyToken,  async (req, res) => {
            const email = req.params.email
            const shopId = await usersCollection.findOne({email: email})
            console.log(shopId);
            const productInfo=shopId.email

            const query = { email: email, shopId: productInfo }
            console.log(productInfo, query);
            const result = await productCollection.find(query).toArray()
            res.send(result)
        })

        app.get("/singleProduct/:id", verifyToken,  async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send(result)
        })
        app.patch('/productUpdate/:id', verifyToken,  async (req, res) => {
            const id = req.params.id
            const data = req.body
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    productName: data?.productName,
                    productImage: data?.productImage,
                    productQuantity: data?.productQuantity,
                    productLocation: data?.productLocation,
                    profitMargin: data?.profitMargin,
                    makingCost: data?.makingCost,
                    productPrice: data?.productPrice,
                    productDiscount: data?.productDiscount,
                    productDescription: data?.productDescription,
                }
            }

            const result = await productCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        app.delete('/productDelete/:id', verifyToken,  async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/product/:id', verifyToken,  async (req, res) => {
            const id = req.params.id
            const data = req.body
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    productQuantity: data?.productQuantity,
                    saleCount: data?.saleCount
                }
            }

            const result = await productCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })
        // ---------------------------------------
        // check out related api
        // ---------------------------------------
        app.post("/product-check-out", verifyToken,  async (req, res) => {
            const product = req.body
            const result = await checkOutCollection.insertOne(product)
            res.send(result)
        })

        app.get('/product-check-out/:email', verifyToken,  async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await checkOutCollection.find(query).toArray()
            res.send(result)

        })

        app.delete('/sold-product-delete/:id', verifyToken,  async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await checkOutCollection.deleteOne(query)
            res.send(result)


        })

        // ---------------------------------------
        // sell collection 
        // ---------------------------------------
        app.post('/sold-product', verifyToken,  async (req, res) => {
            const product = req.body
            const result = await salesCollection.insertOne(product)
            res.send(result)

        })

        app.get('/sell-summary/:email', verifyToken,  async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const page = req.query.page

            const salesResult = await productCollection.find(query).toArray()
            const productResult = await salesCollection.find(query).toArray()
            const totalInvest = Math.floor(productResult?.reduce(
                (total, item) => total + parseFloat(item?.makingCost),
                0
            ));
            const totalIncome = productResult?.reduce(
                (total, item) => total + parseFloat(item?.productPrice),
                0
            );
            const totalProfit = Math.floor(totalIncome - totalInvest);
            //////////
            const totalProduct = productResult.length;
            const pageNumber = parseInt(page);
            const perPage = 5;
            const skip = perPage * pageNumber;
            
            const  result = await salesCollection.find(query).sort({ soldTime: -1 }).skip(skip).limit(perPage).toArray()


            res.send({ result,totalIncome,salesResult, totalProduct, totalInvest, totalProfit })
        })

        // ................................
        // payment related api
        // .................................
        // payment intents er jonno post request korte hobe
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100)

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.put("/payment", async (req, res) => {
            const item = req.body
            const paymentResult = await paymentCollection.insertOne(item)


            res.send(paymentResult)
        })



        app.get('/paymentStatus/:email', verifyToken,  async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await paymentCollection.findOne(query)
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
