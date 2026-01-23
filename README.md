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

## 📚 API Documentation

### **Base URL:** `http://localhost:3000`

### **Health Check:** `GET /health`

### **Authentication:**
- **Type:** Bearer Token
- **Header:** `Authorization: Bearer <token>`

---

## 🔄 Cron Jobs Setup

### **🎯 External Cron Strategy**
Thay vì dùng NestJS cron, chúng ta expose cron jobs thành API endpoints và dùng **external cron services** để gọi định kỳ.

### **API Endpoints:**

#### **1. Process Pending Reports**
```http
POST /citizen/cron/process-pending-reports
```
**Response:**
```json
{
  "success": true,
  "message": "Processed 5 reports successfully, 0 errors in 1250ms",
  "data": { "processedCount": 5, "errorCount": 0, "duration": 1250 }
}
```

#### **2. Handle Timeout Attempts**
```http
POST /citizen/cron/handle-timeout-attempts
```
**Response:**
```json
{
  "success": true,
  "message": "Timeout attempts handled successfully"
}
```

### **🚀 Setup External Cron Services:**

#### **Option 1: Cron-Job.org (FREE - Khuyến nghị)**
```bash
# 1. Đăng ký: https://cron-job.org
# 2. Tạo 2 cron jobs:
#    - URL: https://your-api.com/citizen/cron/process-pending-reports
#    - Method: POST, Schedule: Every 1 minute
#    - URL: https://your-api.com/citizen/cron/handle-timeout-attempts
#    - Method: POST, Schedule: Every 5 minutes
```

#### **Option 2: GitHub Actions**
```yaml
# .github/workflows/cron-jobs.yml
name: Cron Jobs
on:
  schedule:
    - cron: '*/1 * * * *'    # Every minute
    - cron: '*/5 * * * *'    # Every 5 minutes
jobs:
  process-reports:
    runs-on: ubuntu-latest
    if: github.event.schedule == '*/1 * * * *'
    steps:
      - run: curl -X POST https://your-api.com/citizen/cron/process-pending-reports
  handle-timeout:
    runs-on: ubuntu-latest
    if: github.event.schedule == '*/5 * * * *'
    steps:
      - run: curl -X POST https://your-api.com/citizen/cron/handle-timeout-attempts
```

#### **Option 3: VPS Cron**
```bash
# Trong crontab:
* * * * * curl -X POST https://your-api.com/citizen/cron/process-pending-reports
*/5 * * * * curl -X POST https://your-api.com/citizen/cron/handle-timeout-attempts
```

### **🧪 Test Cron APIs:**
```bash
# Run test script:
node test-cron-apis.js

# Or manual test:
curl -X POST http://localhost:3000/citizen/cron/process-pending-reports
curl -X POST http://localhost:3000/citizen/cron/handle-timeout-attempts
```

---

## 🔐 **Auth APIs**

### **POST /auth/login**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "CITIZEN"
    }
  }
}
```

---

## 📝 **Citizen APIs**

### **POST /citizen/reports** - Tạo báo cáo
```json
{
  "description": "Rác thải tại ngã tư A",
  "latitude": 21.0285,
  "longitude": 105.8542,
  "provinceCode": "01",
  "districtCode": "01",
  "wardCode": "00001",
  "wasteItems": [
    {
      "wasteType": "PLASTIC",
      "weightKg": 5.5
    }
  ]
}
```

### **GET /citizen/reports** - Lấy danh sách báo cáo

### **GET /citizen/reports/:id** - Chi tiết báo cáo

---

## 🏢 **Enterprise APIs**

### **POST /enterprise/register** - Đăng ký doanh nghiệp
```json
{
  "name": "Công ty TNHH Rác thải Xanh",
  "email": "contact@company.com",
  "phone": "0123456789",
  "address": "123 Đường ABC, Quận 1, TP.HCM",
  "latitude": 10.8231,
  "longitude": 106.6297,
  "capacityKg": 1000,
  "subscriptionPlanConfigId": 1
}
```

### **PATCH /enterprise/reports/:reportId/accept** - Chấp nhận báo cáo

### **PATCH /enterprise/reports/:reportId/reject** - Từ chối báo cáo

---

## 🧪 Testing

### **Postman Collection:**
```bash
# Import file: WDP_Postman_Collection.json
# Set variables:
# - base_url: http://localhost:3000
# - token: (sẽ được set sau khi login)
```

### **Test Cron APIs:**
```bash
node test-cron-apis.js
```

### **Unit Tests:**
```bash
npm run test
npm run test:e2e
```

---

## 🚀 Deployment

### **Option 1: VPS (Recommended)**
```bash
# See VPS_DEPLOY.md
# Cost: ~$5/month
# Full control, reliable cron jobs
```

### **Option 2: Cloud Platforms**
- **Fly.io**: Free tier, good for cron APIs
- **Railway**: Paid, excellent performance
- **Render**: Limited cron support

### **Environment Setup:**
```env
NODE_ENV=production
ENABLE_CRON=true
DATABASE_URL=your_production_db_url
JWT_SECRET=your_secure_secret
```

---

## 📊 Database Schema

### **Core Tables:**
- `users` - Users (citizens & enterprises)
- `enterprises` - Enterprise profiles
- `reports` - Waste reports
- `report_enterprise_attempts` - Assignment attempts
- `report_assignments` - Final assignments

### **Lookup Tables:**
- `waste_types` - Types of waste
- `subscription_plans` - Pricing plans
- `service_areas` - Service coverage areas

---

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Hot reload development
npm run start:debug      # Debug mode

# Database
npx prisma studio        # Database GUI
npx prisma migrate dev   # Create migration
npx prisma db push       # Push schema

# Build & Production
npm run build            # Production build
npm run start:prod       # Production start
```

---

## 🆘 Troubleshooting

### **API not starting:**
```bash
# Check database connection
psql "your_database_url"

# Check environment variables
echo $DATABASE_URL
```

### **Cron APIs not working:**
```bash
# Test manually first
curl -X POST http://localhost:3000/citizen/cron/process-pending-reports

# Check ENABLE_CRON=true
echo $ENABLE_CRON
```

### **Database errors:**
```bash
# Reset database
npx prisma migrate reset

# Push schema
npx prisma db push
```

---

## 📞 Support

**API Base URL:** `http://localhost:3000`
**Swagger Docs:** `http://localhost:3000/api`
**Health Check:** `GET /health`

**Cron APIs:**
- `POST /citizen/cron/process-pending-reports`
- `POST /citizen/cron/handle-timeout-attempts`

---

**🎯 Happy coding! External cron strategy rocks!** 🚀