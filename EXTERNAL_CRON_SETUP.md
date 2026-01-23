# 🔄 External Cron Setup - Thay thế NestJS Cron Jobs

## 🎯 Ý tưởng

Thay vì dùng `@Cron()` decorator trong NestJS, chúng ta tạo 2 API endpoints và dùng **external cron services** để gọi định kỳ.

**Ưu điểm:**
- ✅ Không phụ thuộc vào server có cron không
- ✅ Dễ thay đổi tần suất từ bên ngoài
- ✅ Có thể monitor và logs dễ dàng
- ✅ Phù hợp với deployment trên các platform free

## 🚀 API Endpoints

### **1. Process Pending Reports**
```http
POST /citizen/cron/process-pending-reports
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 5 reports successfully, 0 errors in 1250ms",
  "data": {
    "processedCount": 5,
    "errorCount": 0,
    "duration": 1250
  }
}
```

### **2. Handle Timeout Attempts**
```http
POST /citizen/cron/handle-timeout-attempts
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Timeout attempts handled successfully"
}
```

## 🌐 External Cron Services (Free)

### **Option 1: Cron-Job.org (Khuyến nghị)**
```bash
# 1. Đăng ký: https://cron-job.org
# 2. Tạo 2 cron jobs:
#    - URL: https://your-api.com/citizen/cron/process-pending-reports
#    - Method: POST
#    - Schedule: Every 1 minute
#
#    - URL: https://your-api.com/citizen/cron/handle-timeout-attempts
#    - Method: POST
#    - Schedule: Every 5 minutes
```

### **Option 2: GitHub Actions**
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
      - name: Process Pending Reports
        run: |
          curl -X POST https://your-api.com/citizen/cron/process-pending-reports

  handle-timeout:
    runs-on: ubuntu-latest
    if: github.event.schedule == '*/5 * * * *'
    steps:
      - name: Handle Timeout Attempts
        run: |
          curl -X POST https://your-api.com/citizen/cron/handle-timeout-attempts
```

### **Option 3: Webcron.org**
```bash
# 1. Đăng ký: https://webcron.org
# 2. Tạo URLs:
#    - https://your-api.com/citizen/cron/process-pending-reports
#    - https://your-api.com/citizen/cron/handle-timeout-attempts
# 3. Set schedule như trên
```

### **Option 4: VPS Cron (Nếu dùng VPS)**
```bash
# Trong crontab:
crontab -e

# Add these lines:
* * * * * curl -X POST https://your-api.com/citizen/cron/process-pending-reports
*/5 * * * * curl -X POST https://your-api.com/citizen/cron/handle-timeout-attempts
```

## 🧪 Testing

### **Manual Test:**
```bash
# Test API 1:
curl -X POST http://localhost:3000/citizen/cron/process-pending-reports

# Test API 2:
curl -X POST http://localhost:3000/citizen/cron/handle-timeout-attempts
```

### **Postman Test:**
- Import `WDP_Postman_Collection.json`
- Test 2 endpoints trong folder "Cron Jobs"

## 📊 Monitoring

### **Logs:**
- Cron services sẽ log mỗi lần gọi API
- API response sẽ có thông tin chi tiết về việc xử lý

### **Health Check:**
```bash
# Kiểm tra API hoạt động:
curl http://localhost:3000/health
```

## 🔧 Configuration

### **Environment Variables:**
```env
ENABLE_CRON=true          # Bật cron jobs
NODE_ENV=production       # Production mode
```

### **Security (Optional):**
Nếu muốn bảo mật, có thể thêm API key:

```typescript
// Trong controller:
@Post('process-pending-reports')
async processPendingReports(@Headers('x-api-key') apiKey: string) {
    if (apiKey !== process.env.CRON_API_KEY) {
        throw new UnauthorizedException();
    }
    // ...
}
```

## 🎯 Migration Steps

### **Step 1: Deploy API**
```bash
# Deploy như bình thường
npm run build
# ... deploy to Render/Fly.io/VPS
```

### **Step 2: Disable NestJS Cron**
```env
ENABLE_CRON=false  # Tắt cron trong NestJS
```

### **Step 3: Setup External Cron**
```bash
# Chọn 1 trong các options ở trên
# Setup để gọi 2 API endpoints
```

### **Step 4: Test & Monitor**
```bash
# Test manual trước
# Setup monitoring
# Verify cron jobs hoạt động
```

## ✅ Advantages

| Aspect | NestJS Cron | External API Cron |
|--------|-------------|-------------------|
| **Dependency** | Server phải support cron | Không phụ thuộc |
| **Flexibility** | Code changes required | Thay đổi dễ dàng |
| **Monitoring** | Limited | Detailed logs |
| **Deployment** | Platform dependent | Universal |
| **Scaling** | Single server | Multiple callers |

## 🚀 Quick Start

1. **Deploy API** với `ENABLE_CRON=false`
2. **Test 2 endpoints** locally
3. **Setup external cron** (cron-job.org recommended)
4. **Monitor logs** để đảm bảo hoạt động

**🎉 Không cần lo lắng về cron jobs nữa!** 🚀
