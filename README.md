# Hiring App Backend

Backend API untuk aplikasi hiring menggunakan Express.js dengan JSON file storage.

## Features

- ✅ CORS enabled untuk semua origin
- ✅ File upload dengan memory storage (Vercel compatible)
- ✅ User authentication
- ✅ Jobs management
- ✅ Candidates management
- ✅ Error handling untuk file operations

## Deployment ke Vercel

### Setup
1. Push repository ke GitHub
2. Import project di Vercel Dashboard
3. Deploy otomatis akan berjalan

### Catatan Penting untuk Vercel

1. **File Upload**: Menggunakan memory storage karena Vercel memiliki read-only filesystem
   - File disimpan di RAM server
   - File akan hilang saat server restart
   - Untuk production, sebaiknya gunakan cloud storage (Vercel Blob, S3, Cloudinary)

2. **Data Storage**: File JSON dapat dibaca dari folder `data/` tapi tidak bisa di-write
   - Operasi READ: ✅ Berfungsi
   - Operasi WRITE: ⚠️ Akan gagal di Vercel (tapi tidak crash)
   - Untuk production, sebaiknya gunakan database (MongoDB, PostgreSQL, dll)

3. **CORS**: Sudah dikonfigurasi untuk allow all origins

## Local Development

```bash
npm install
npm start
```

Server akan berjalan di `http://localhost:3001`

## Environment Variables

- `PORT`: Port number (default: 3001)
- `NODE_ENV`: Environment mode (development/production)

## API Endpoints

### Authentication
- `POST /login` - User login

### Jobs
- `GET /jobs` - Get all jobs
- `GET /jobs/:id` - Get job by ID
- `POST /jobs` - Create new job
- `PUT /jobs/:id` - Update job
- `DELETE /jobs/:id` - Delete job

### Candidates
- `GET /candidates` - Get all candidates
- `GET /candidates/:id` - Get candidate by ID
- `POST /candidates` - Create new candidate
- `PUT /candidates/:id` - Update candidate
- `DELETE /candidates/:id` - Delete candidate

### Upload
- `POST /upload` - Upload profile photo
- `GET /uploads/:filename` - Get uploaded file

## Migration ke Database (Recommended)

Untuk production yang serius, disarankan untuk migrate ke database:
1. MongoDB Atlas (Free tier available)
2. PostgreSQL (Vercel Postgres, Supabase)
3. MySQL (PlanetScale)
