const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

dotenv.config();

const app = express();
const corsOptions = {
  origin: ['http://192.168.1.100:19006', 'http://localhost:19006', 'https://mac-backend-ftga.onrender.com'],
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));
app.use(express.json());

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mac-app',
    resource_type: 'auto', // Automatically detect file type (image, video, etc.)
  },
});
const upload = multer({ storage });

// Schemas
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  profile_picture: String,
  privacy: String,
});

const eventSchema = new mongoose.Schema({
  name: String,
  date: String,
  location: String,
  agenda: String,
});

const mediaSchema = new mongoose.Schema({
  user_id: String,
  description: String,
  url: String,
  event_id: String,
  privacy: String,
  albumId: String,
});

const tipSchema = new mongoose.Schema({
  user_id: String,
  category: String,
  content: String,
});

const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const Media = mongoose.model('Media', mediaSchema);
const Tip = mongoose.model('Tip', tipSchema);
const Message = mongoose.model('Message', messageSchema);

// Routes
// User Routes
app.post('/api/users/register', async (req, res) => {
  console.log('Register request body:', req.body);
  const { username, email, password } = req.body;
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    console.log('User already exists:', { username, email });
    return res.status(400).json({ message: 'Username or email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword, privacy: 'public' });
  await user.save();
  console.log('User registered:', user);
  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/api/users/login', async (req, res) => {
  console.log('Login request body:', req.body);
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) {
    console.log('Login failed for:', { username });
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    console.log('Login failed for:', { username });
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  console.log('Login successful:', user);
  res.json({
    _id: user._id.toString(),
    username: user.username,
    email: user.email,
    profile_picture: user.profile_picture,
    privacy: user.privacy,
  });
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      profile_picture: user.profile_picture,
      privacy: user.privacy,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/users/:id', upload.single('profile_picture'), async (req, res) => {
  try {
    const { privacy } = req.body;
    const update = { privacy };
    if (req.file) {
      update.profile_picture = req.file.path; // Cloudinary URL
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      profile_picture: user.profile_picture,
      privacy: user.privacy,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Event Routes
app.get('/api/events', async (req, res) => {
  const events = await Event.find();
  res.json(events);
});

app.post('/api/events', async (req, res) => {
  const event = new Event(req.body);
  await event.save();
  res.status(201).json(event);
});

// Media Routes
app.get('/api/media', async (req, res) => {
  const media = await Media.find();
  res.json(media);
});

app.post('/api/media', upload.single('media'), async (req, res) => {
  try {
    const { user_id, description, event_id, privacy, albumId } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const media = new Media({
      user_id,
      description,
      url: req.file.path, // Cloudinary URL
      event_id: event_id || null,
      privacy,
      albumId,
    });
    await media.save();
    res.status(201).json(media);
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Tip Routes
app.get('/api/tips', async (req, res) => {
  const tips = await Tip.find();
  res.json(tips);
});

app.post('/api/tips', async (req, res) => {
  const tip = new Tip(req.body);
  await tip.save();
  res.status(201).json(tip);
});

// Chat Routes
app.get('/api/messages', async (req, res) => {
  const messages = await Message.find();
  res.json(messages);
});

app.post('/api/messages', async (req, res) => {
  const message = new Message(req.body);
  await message.save();
  res.status(201).json(message);
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));