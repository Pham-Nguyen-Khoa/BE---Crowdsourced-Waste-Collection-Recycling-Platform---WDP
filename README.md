# 🚀 WDP Backend - Crowdsourced Waste Collection Platform

## 📋 Mục lục
- [Cài đặt Local](#cài-đặt-local)
- [API Documentation](#api-documentation)
- [Cron Jobs Setup](#cron-jobs-setup)
- [Database Setup](#database-setup)
- [Testing](#testing)
- [Deployment](#deployment)

## 🛠️ Cài đặt Local

### **Prerequisites:**
- Node.js 22+
- PostgreSQL
- Git

### **Step 1: Clone & Install**
```bash
git clone <your-repo-url>
cd WDP_BE
npm install
```

### **Step 2: Environment Setup**
```bash
# Copy template
cp .env.example .env

# Edit .env file:
NODE_ENV=development
PORT=3000
ENABLE_CRON=true
DATABASE_URL="postgresql://user:pass@localhost:5432/wdp_db"
JWT_SECRET="your_jwt_secret"
```

### **Step 3: Database**
```bash
# Generate Prisma client
npx prisma generate

# Push schema to DB
npx prisma db push
```

### **Step 4: Run Development**
```bash
# Development with hot reload
npm run dev

# API will be available at: http://localhost:3000
```
