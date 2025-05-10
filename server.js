const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { cloudinary } = require('cloudinary').v2;

const app = express();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
const corsOptions = {
  origin: ['https://your-frontend.onrender.com', 'http://192.168.1.100:19006', 'http://localhost:19006'],
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from the uploads directory (optional, can be removed if using Cloudinary)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  privacy: { type: String, default: 'public' },
  profile_picture: String,
});
const User = mongoose.model('User', userSchema);

// Event Schema
const eventSchema = new mongoose.Schema({
  name: String,
  date: String,
  location: String,
  agenda: String,
});
const Event = mongoose.model('Event', eventSchema);

// Media Schema
const mediaSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  url: String,
  privacy: String,
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: false },
  albumId: String,
});
const Media = mongoose.model('Media', mediaSchema);

// Tips Schema
const tipsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: String,
  content: String,
});
const Tip = mongoose.model('Tip', tipsSchema);

// Messages Schema
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// Routes
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error });
  }
});

app.put('/api/users/:id', upload.single('profile_picture'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      user.profile_picture = result.secure_url;
    }
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events', error });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error creating event', error });
  }
});

app.get('/api/media', async (req, res) => {
  try {
    const media = await Media.find();
    res.json(media);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching media', error });
  }
});

app.post('/api/media', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const media = new Media({
      user_id: req.body.user_id,
      description: req.body.description,
      url: result.secure_url,
      privacy: req.body.privacy,
      event_id: req.body.event_id || null,
      albumId: req.body.albumId,
    });
    await media.save();
    res.status(201).json(media);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading media', error });
  }
});

app.get('/api/tips', async (req, res) => {
  try {
    const tips = await Tip.find();
    res.json(tips);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tips', error });
  }
});

app.post('/api/tips', async (req, res) => {
  try {
    const tip = new Tip(req.body);
    await tip.save();
    res.status(201).json(tip);
  } catch (error) {
    res.status(500).json({ message: 'Error creating tip', error });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));