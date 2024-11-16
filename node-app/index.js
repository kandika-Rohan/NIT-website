import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stringify } from 'querystring';
import axios from 'axios'; // For making API calls
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { getMaxListeners } from 'events';
import { Server } from 'socket.io';
import http from 'http';
// import { WebSocket } from 'http';



const app = express();

const port = 4000;


const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Replace with your client URL
        methods: ["GET", "POST"],
        credentials: true
    }
});

// const io=.listen(server);



  

// Message schema
// const messageSchema = new mongoose.Schema({
//     productId: mongoose.Schema.Types.ObjectId,
//     message: String,
//     createdAt: { type: Date, default: Date.now }
// });
//new implementation

const messageSchema = new mongoose.Schema({
    productId: mongoose.Schema.Types.ObjectId,
    message: String,
    sellerId: mongoose.Schema.Types.ObjectId, // Seller's ID
    createdAt: { type: Date, default: Date.now }
});


const Messages = mongoose.model('Messages', messageSchema);


  
io.on('connection', (socket) => {
    console.log('User connected');


    //new implementation
    socket.on('join_chat', ({ productId, sellerId }) => {
        console.log(`User joined chat for product: ${productId}, Seller: ${sellerId}`);
    
        // Fetch and send chat history to the client
        Messages.find({ productId }).sort({ createdAt: 1 })
            .then(messages => {
                socket.emit('chat_history', messages);
            })
            .catch(error => {
                console.error('Error fetching chat history:', error);
            });
    });
    

    // socket.on('join_chat', (productId) => {
    //     console.log(`User joined chat for product: ${productId}`);

    //     // Fetch and send chat history to the client
    //     Messages.find({ productId }).sort({ createdAt: 1 })
    //         .then(messages => {
    //             socket.emit('chat_history', messages);
    //         })
    //         .catch(error => {
    //             console.error('Error fetching chat history:', error);
    //         });
    // });

    // socket.on('send_message', async (data) => {
    //     const { productId, message } = data;

    //     // Save the message to the database
    //     const newMessage = new Messages({ productId, message });
    //     try {
    //         await newMessage.save();
    //         io.emit('receive_message', data); // Broadcast the message to all users
    //     } catch (error) {
    //         console.error('Error saving message:', error);
    //     }
    // });

    // socket.on('disconnect', () => {
    //     console.log('User disconnected');
    // });

    //new implementation

    socket.on('send_message', async (data) => {
        const { productId, message, sellerId } = data;
    
        // Save the message to the database with the seller's ID
        const newMessage = new Messages({ productId, message, sellerId });
        try {
            await newMessage.save();
            io.emit('receive_message', data); 
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });
    

});



// Chat history endpoint
app.get('/chat-history/:productId', async (req, res) => {
    try {
        const chatHistory = await Messages.find({ productId: req.params.productId }).sort({ createdAt: 1 });
        res.send({ success: true, chatHistory });
    } catch (error) {
        res.status(500).send({ message: "Server error", error });
    }
});


var transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user:'unknowni2k02@gmail.com',
      pass: 'hwij hifv upyq cfaj'
    },
    tls: {
      rejectUnauthorized: false
    }
  });




// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Database setup
mongoose.connect("mongodb://localhost/fullstack_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
    username: String,
    mobile: String,
    email: String,
    password: String,
    otp: String, // Add OTP field
    otpExpiration: Date,
    likedProducts: [{type: mongoose.Schema.Types.ObjectId, ref: 'Products'}]
});

const User = mongoose.model("User", userSchema);


const schema = new mongoose.Schema({
    pname: String,
    pdesc: String,
    price: String,
    category: String,
    pimage: String,
    addedBy: mongoose.Schema.Types.ObjectId,
    ploc: {
        type: {
            type: String,
            enum: ['Point'],  // Corrected enum value to 'Point'
            default: 'Point'
        },
        coordinates: {
            type: [Number]
        }
    }
});

schema.index({ ploc: '2dsphere' });

const Products = mongoose.model('Products', schema);

// Middleware
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get("/", (req, res) => {
    res.send('Hello, welcome');
});

function getFileName(filePath) {
    // Use path.basename to extract the filename from the full path
    return path.basename(filePath);
}

app.post('/like-product',(req,res)=>{
    let productId=req.body.productId;
    let userId=req.body.userId;
    console.log(req.body);
    
    User.updateOne({_id:userId},{$addToSet:{likedProducts:productId}})
    .then((result)=>{
        
        res.send({message:'liked success'});
        
    })
    .catch((e) => {
        
        res.status(500).send({ message: "Server error" });
    });

})

app.post('/add-product', upload.single('pimage'), (req, res) => {
    console.log(req.file);  // Changed from req.files to req.file as upload.single() provides req.file
    console.log(req.body);

    const plat = parseFloat(req.body.plat);  // Parse coordinates to numbers
    const plong = parseFloat(req.body.plong);

    const pname = req.body.pname;
    const pdesc = req.body.pdesc;
    const price = req.body.price;
    const category = req.body.category.toLowerCase();
    const pimage = getFileName(req.file.path);
    const addedBy = req.body.userId;

    const product = new Products({
        pname,
        pdesc,
        price,
        category,
        pimage,
        addedBy,
        ploc: {
            type: 'Point',
            coordinates: [plat, plong]
        }
    });

    product.save()
        .then(() => {
            res.send({ message: 'File uploaded successfully' });
        })
        .catch((err) => {
            console.error("Error adding product:", err);  // Log the error
            res.send({ message: "Server error" });
        });
});

app.get('/get-products',(req,res)=>{
    
    
    Products.find()
    .then((result)=>{
       
        res.send({message:'success',products:result});
        
    })
    .catch((e) => {
        
        res.status(500).send({ message: "Server error" });
    });
})

app.get('/get-product',(req,res)=>{
    
    console.log();
    const categoryName=req.query.categoryName.toLocaleLowerCase();
    Products.find({category:categoryName})
    .then((result)=>{
       
        res.send({message:'success',products:result});
        
    })
    .catch((e) => {
        
        res.status(500).send({ message: "Server error" });
    });
})


app.post('/send-otp', async (req, res) => {
    // console.log(req.body)
    // return;
    try {
      const { email } = req.body;
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);
  
      await User.updateOne({ email }, { otp, otpExpiration }, { upsert: true });
  
      const mailOptions = {
        from: '"Contact Support" <unknowni2k02@gmail.com>',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It is valid for 5 minutes.`
      };
  
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending OTP:", error);
          return res.status(500).send({ message: 'Error sending OTP', error });
        }
        res.send({ message: 'OTP sent successfully' });
      });
    } catch (e) {
      console.error("Error in send-otp route:", e);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });
  
  // Verify OTP endpoint
  app.post('/verify-otp', async (req, res) => {
    try {
        const { username, mobile, email, password, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            console.log("User not found");
            return res.status(400).send({ message: "Invalid or expired OTP" });
        }

        console.log("User OTP:", user.otp);
        console.log("Entered OTP:", otp);
        console.log("OTP Expiration:", new Date(user.otpExpiration).getTime());
        console.log("Current Time:", Date.now());

        // Convert otpExpiration to milliseconds and compare with Date.now()
        if (!user.otp || user.otp !== otp || new Date(user.otpExpiration).getTime() < Date.now()) {
            return res.status(400).send({ message: "Invalid or expired OTP" });
        }

        // user.otp = null;
        // user.otpExpiration = null;
        user.username = username;
        user.mobile = mobile;
        user.password = password;
        user.otp = null;
        user.otpExpiration = null;
        await user.save();

        res.send({ message: "OTP verified successfully" });
    } catch (e) {
        console.error("Error in verify-otp route:", e);
        res.status(500).send({ message: "Internal Server Error" });
    }
});


  app.post("/signup", async (req, res) => {
    try {
        const { username, mobile, email, password, otp } = req.body;

        // Check for missing fields
        if (!username || !mobile || !email || !password || !otp) {
            return res.status(400).send({ message: "All fields are required" });
        }

        const user = await User.findOne({ email });

        if (!user || !user.otp || user.otp !== otp || user.otpExpiration < Date.now()) {
            return res.status(400).send({ message: "Invalid or expired OTP" });
        }

        user.username = username;
        user.mobile = mobile;
        user.password = password;
        user.otp = null;
        user.otpExpiration = null;

        await user.save();
        console.log(user.username,user.mobile,user.password);
        res.send({ message: "User signed up successfully" });
    } catch (e) {
        console.error("Error in signup route:", e);
        res.status(500).send({ message: "Server error" });
    }
});






app.get('/get-user/:uId',(req,res)=>{
    const _userId=req.params.uId;
    User.findOne({_id:_userId})
    .then((result)=>{
        res.send({message:"user found successfully",user:{email:result.email,mobile:result.mobile,username:result.username}});
    })
    .catch(()=>{
        res.send({message:"server error"});
    })
})

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    User.findOne({ username })
        .then((user) => {
            if (!user) {
                return res.send({ message: "User not found" });
            }
            if (user.password !== password) {
                return res.send({ message: "Invalid password" });
            }
            const token = jwt.sign(
                { data: user },
                "MYKEY",
                { expiresIn: '1h' }
            );
            res.send({ message: "Login successful", token ,userId:user._id});
        })
        .catch((err) => {
           
            res.status(500).send({ message: "Server error" });
        });
});

app.post('/liked-products',(req,res)=>{
    User.findOne({_id:req.body.userId}).populate('likedProducts')
    .then((result)=>{
       
        res.send({message:'success',products:result.likedProducts});
        
    })
    .catch((e) => {
        
        res.status(500).send({ message: "Server error" });
    });
})



app.get('/get-product/:id',(req,res)=>{
 
    Products.findOne({_id:req.params.id })
    .then((result)=>{
       
        res.send({message: 'success', product:result});
        
    })
    .catch((e) => {
        res.status(500).send({ message: "Server error" });
    });
})


// Define a route to search products by location
app.get('/search-by-location', async (req, res) => {
    const { latitude, longitude, maxDistance } = req.query;
    
    try {
        const products = await Products.find({
            ploc: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(maxDistance) // Distance in meters
                }
            }
        });
        
        res.status(200).json({ products });
    } catch (error) {
        console.error('Error searching products by location:', error);
        res.status(500).json({ message: 'Server error' });
    }
});




// Start the server
server.listen(port, () => {
    console.log(`The server is listening at http://localhost:${port}`);
});
