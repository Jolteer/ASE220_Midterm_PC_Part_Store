// Import required Node.js modules and dependencies
const express = require('express'); // Web framework for creating the server
const bodyParser = require('body-parser'); // Middleware to parse request bodies (JSON, URL-encoded)
const jwt = require('jsonwebtoken'); // Library for generating and verifying JSON Web Tokens (JWT)
const cors = require('cors'); // Middleware to enable Cross-Origin Resource Sharing
const path = require('path'); // Utility for handling file paths
const fs = require('fs'); // File system module for reading/writing files
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb'); // MongoDB driver for database operations
require('dotenv').config(); // Load environment variables from .env file

// Initialize Express application
const app = express(); // Create an Express app instance
const PORT = process.env.PORT || 3000; // Set port from environment variable or default to 3000
const USERS_FILE = path.join(__dirname, '/static/auth/users.json'); // Path to users.json file for user data
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // JWT secret key from environment or fallback

// Configure middleware
app.use(cors()); // Enable CORS for all routes to allow cross-origin requests
app.use(bodyParser.json()); // Parse incoming JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies
app.use(express.static('public')); // Serve static files from the 'public' directory
app.use('/auth', express.static('static/auth')); // Serve static files for authentication pages from 'static/auth'

// Redirect root route to public.html
// Handles requests to the root URL by redirecting to the public page
app.get('/', (req, res) => {
  res.redirect('/public.html'); // Redirect to public.html
});

// MongoDB connection setup
// Connection string for MongoDB Atlas cluster
const uri = "mongodb+srv://Jolteer:Password@cluster0.ez9w3cm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 }); // Initialize MongoDB client with stable API version
let db; // Variable to hold the database instance

// Connect to MongoDB and start server
// Establishes connection to MongoDB and starts the Express server
async function connectDB() {
  await client.connect(); // Connect to MongoDB
  db = client.db('pc_store'); // Select the 'pc_store' database
  console.log("Connected to MongoDB"); // Log successful connection
}

// Execute database connection and start server
connectDB().then(() => {
  // Start the Express server once MongoDB is connected
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`); // Log server start
  });
}).catch(err => {
  // Handle MongoDB connection errors
  console.error("Failed to connect to MongoDB:", err);
  process.exit(1); // Exit process with failure code
});

// User management with JSON file
// Load users from a JSON file for authentication
let users = [];
try {
  // Attempt to read and parse users.json
  users = JSON.parse(fs.readFileSync(USERS_FILE));
} catch (err) {
  // Handle errors (e.g., file not found or invalid JSON)
  console.error("Error loading users.json:", err);
  users = []; // Initialize as empty array if loading fails
}

// Save users to JSON file
// Writes the users array to users.json with formatted JSON
function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); // Write with 2-space indentation
}

// Authentication routes
// Handle user login and JWT generation
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body; // Extract email and password from request body
  // Find user with matching email and password
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    // Generate JWT with user ID and email, expiring in 1 hour
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ jwt: token }); // Return token to client
  } else {
    // Return 401 if credentials are invalid
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Handle user registration
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body; // Extract email and password from request body

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists' });
  }

  // Create new user with incremental ID
  const newUser = {
    id: users.length > 0 ? users[users.length - 1].id + 1 : 1, // Increment last ID or start at 1
    email,
    password
  };

  // Add user to array and save to file
  users.push(newUser);
  saveUsers();
  res.status(201).json({ message: 'User registered successfully' }); // Return success response
});

// Handle user signout
// Instructs client to remove token (server is stateless)
app.get('/api/auth/signout', (req, res) => {
  res.json({ message: 'Client should remove token' }); // No server-side action needed
});

// JWT verification middleware
// Verifies JWT in the Authorization header for protected routes
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization']; // Get Authorization header
  if (!authHeader) return res.sendStatus(403); // Return 403 if header is missing

  const token = authHeader.split(' ')[1]; // Extract token (format: "Bearer <token>")
  // Verify token using JWT_SECRET
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Return 403 if token is invalid
    req.user = user; // Attach decoded user data to request
    next(); // Proceed to next middleware/route
  });
}

// Get user profile
// Returns user details for authenticated users
app.get('/api/auth/profile', verifyToken, (req, res) => {
  // Find user by ID from JWT
  const user = users.find(u => u.id === req.user.id);
  if (user) {
    res.json({ id: user.id, email: user.email }); // Return user ID and email
  } else {
    res.status(404).json({ error: 'User not found' }); // Return 404 if user not found
  }
});

// Dynamic CRUD route generator for MongoDB collections
// Creates CRUD routes for a given MongoDB collection
function registerCRUDRoutes(collectionName) {
  const base = `/api/${collectionName}`; // Base URL for the collection (e.g., /api/CPUs)

  // Create new item
  // Handles POST requests to create a new document in the collection
  app.post(base, verifyToken, async (req, res) => {
    try {
      const collection = db.collection(collectionName); // Access the MongoDB collection
      const result = await collection.insertOne(req.body); // Insert the request body as a document
      // Return the inserted document (if available) or the request body
      res.status(201).json(result.ops ? result.ops[0] : req.body);
    } catch (err) {
      // Handle errors during insertion
      res.status(500).json({ error: 'Create failed', details: err });
    }
  });

  // Get all items
  // Handles GET requests to retrieve all documents in the collection
  app.get(base, async (req, res) => {
    try {
      const collection = db.collection(collectionName); // Access the MongoDB collection
      const result = await collection.find({}).toArray(); // Fetch all documents as an array
      res.json(result); // Return the documents
    } catch (err) {
      // Handle errors during fetching
      console.error(`Error in GET ${base}:`, err);
      res.status(500).json({ error: 'Fetch failed', details: err.toString() });
    }
  });

  // Get single item by ID
  // Handles GET requests to retrieve a single document by ID
  app.get(`${base}/:id`, async (req, res) => {
    try {
      const collection = db.collection(collectionName); // Access the MongoDB collection
      // Find document by MongoDB ObjectId
      const result = await collection.findOne({ _id: new ObjectId(req.params.id) });
      if (!result) return res.status(404).json({ error: 'Item not found' }); // Return 404 if not found
      res.json(result); // Return the document
    } catch (err) {
      // Handle errors (e.g., invalid ObjectId)
      res.status(500).json({ error: 'Fetch failed', details: err });
    }
  });

  // Update item by ID
  // Handles PUT requests to update a document by ID
  app.put(`${base}/:id`, verifyToken, async (req, res) => {
    try {
      const collection = db.collection(collectionName); // Access the MongoDB collection
      // Update document with request body, using $set to update fields
      const result = await collection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      // Check if document was found and updated
      result.matchedCount === 0
        ? res.status(404).json({ error: 'Item not found' })
        : res.json({ message: 'Item updated' });
    } catch (err) {
      // Handle errors during update
      res.status(500).json({ error: 'Update failed', details: err });
    }
  });

  // Delete item by ID
  // Handles DELETE requests to remove a document by ID
  app.delete(`${base}/:id`, verifyToken, async (req, res) => {
    try {
      const collection = db.collection(collectionName); // Access the MongoDB collection
      // Delete document by MongoDB ObjectId
      const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
      // Check if document was found and deleted
      result.deletedCount === 0
        ? res.status(404).json({ error: 'Item not found' })
        : res.json({ message: 'Item deleted' });
    } catch (err) {
      // Handle errors during deletion
      res.status(500).json({ error: 'Delete failed', details: err });
    }
  });
}

// Register CRUD routes for specified collections
// Generate CRUD routes for product collections (CPUs, GPUs, RAM, Storage)
['CPUs', 'GPUs', 'RAM', 'Storage'].forEach(registerCRUDRoutes);