const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));

app.options('*', cors());

app.use(express.json());

app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// ============================================
// MULTER CONFIGURATION
// ============================================

// Option 1: Disk Storage (untuk local development)
// Uncomment ini untuk development lokal.

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const uploadDir = path.join(__dirname, 'uploads');
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//     cb(null, uploadDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });


// Option 2: Memory Storage (untuk Vercel/Production)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Memory cache untuk memory storage
const fileCache = new Map();
const DATA_DIR = path.join(__dirname, 'data');

const USERS_FILE = 'users.json';
function getUsers() {
  try {
    const filePath = path.join(DATA_DIR, USERS_FILE);
    if (!fs.existsSync(filePath)) {
      console.error(`Users file not found: ${filePath}`);
      return { users: [] };
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('Error reading users file:', e.message);
    return { users: [] };
  }
}
// --- LOGIN ENDPOINT ---
app.post('/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role required' });
  }
  const users = getUsers().users;
  const user = users.find(u => u.email === email && u.password === password && u.role === role);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials or role' });
  }
  res.json({ message: 'Login successful', user: { email: user.email, role: user.role, name: user.name } });
});

function readJson(file) {
  try {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      if (file === 'jobs.json') return { jobs: [] };
      if (file === 'candidates.json') return { data: [] };
      if (file === 'job_config.json') return { application_form: [] };
      return {};
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${file}:`, error.message);
    if (file === 'jobs.json') return { jobs: [] };
    if (file === 'candidates.json') return { data: [] };
    if (file === 'job_config.json') return { application_form: [] };
    return {};
  }
}

function writeJson(file, data) {
  try {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`Creating directory: ${DATA_DIR}`);
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${file}:`, error.message);

  }
}

// --- JOBS CRUD ---
app.get('/jobs', (req, res) => {
  const jobs = readJson('jobs.json');
  const jobConfig = readJson('job_config.json');
  res.json({
    ...jobs,
    config: jobConfig.application_form
  });
});

// Get job by id (with config)
app.get('/jobs/:id', (req, res) => {
  const jobs = readJson('jobs.json');
  const jobConfig = readJson('job_config.json');
  const job = jobs.data.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    ...job,
    config: jobConfig.application_form
  });
});

// Create job (return with config)
app.post('/jobs', (req, res) => {
  const jobs = readJson('jobs.json');
  const jobConfig = readJson('job_config.json');
  const newJob = req.body;
  jobs.data.push(newJob);
  writeJson('jobs.json', jobs);
  res.status(201).json({
    ...newJob,
    config: jobConfig.application_form
  });
});

// Update job (return with config)
app.put('/jobs/:id', (req, res) => {
  const jobs = readJson('jobs.json');
  const jobConfig = readJson('job_config.json');
  const idx = jobs.data.findIndex(j => j.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Job not found' });
  jobs.data[idx] = { ...jobs.data[idx], ...req.body };
  writeJson('jobs.json', jobs);
  res.json({
    ...jobs.data[idx],
    config: jobConfig.application_form
  });
});

// Delete job (return with config)
app.delete('/jobs/:id', (req, res) => {
  const jobs = readJson('jobs.json');
  const jobConfig = readJson('job_config.json');
  const idx = jobs.data.findIndex(j => j.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Job not found' });
  const deleted = jobs.data.splice(idx, 1);
  writeJson('jobs.json', jobs);
  res.json({
    ...deleted[0],
    config: jobConfig.application_form
  });
});

// --- FILE UPLOAD ENDPOINT ---
app.post('/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.file.path) {
      const fileUrl = `/uploads/${req.file.filename}`;
      return res.json({ 
        success: true, 
        url: fileUrl,
        filename: req.file.filename,
        message: 'File uploaded successfully (disk storage)'
      });
    }

    const fileId = crypto.randomUUID();
    const fileExtension = path.extname(req.file.originalname);
    const filename = `profile-${fileId}${fileExtension}`;
    
    fileCache.set(filename, {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      uploadedAt: new Date().toISOString()
    });

    const fileUrl = `/uploads/${filename}`;
    return res.json({ 
      success: true, 
      url: fileUrl,
      filename: filename,
      message: 'File uploaded successfully (memory storage)'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/uploads/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const fileData = fileCache.get(filename);
    
    if (!fileData) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.set('Content-Type', fileData.mimetype);
    res.set('Content-Length', fileData.buffer.length);
    res.send(fileData.buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- JOB CONFIG CRUD ---
app.get('/job-config', (req, res) => {
  res.json(readJson('job_config.json'));
});

// Update job config (replace whole config)
app.put('/job-config', (req, res) => {
  writeJson('job_config.json', req.body);
  res.json(req.body);
});

// --- CANDIDATES CRUD ---
app.get('/candidates', (req, res) => {
  res.json(readJson('candidates.json'));
});

// Get candidate by id
app.get('/candidates/:id', (req, res) => {
  const candidates = readJson('candidates.json');
  const cand = candidates.data.find(c => c.id === req.params.id);
  if (!cand) return res.status(404).json({ error: 'Candidate not found' });
  res.json(cand);
});

// Create candidate
app.post('/candidates', (req, res) => {
  const candidates = readJson('candidates.json');
  const newCand = req.body;
  candidates.data.push(newCand);
  writeJson('candidates.json', candidates);
  res.status(201).json(newCand);
});

// Update candidate
app.put('/candidates/:id', (req, res) => {
  const candidates = readJson('candidates.json');
  const idx = candidates.data.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Candidate not found' });
  candidates.data[idx] = { ...candidates.data[idx], ...req.body };
  writeJson('candidates.json', candidates);
  res.json(candidates.data[idx]);
});

// Delete candidate
app.delete('/candidates/:id', (req, res) => {
  const candidates = readJson('candidates.json');
  const idx = candidates.data.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Candidate not found' });
  const deleted = candidates.data.splice(idx, 1);
  writeJson('candidates.json', candidates);
  res.json(deleted[0]);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
