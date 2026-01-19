# Hướng dẫn cấu hình Supabase Upload

## 1. Tạo Supabase Project

1. Truy cập https://supabase.com
2. Tạo project mới
3. Chờ project setup xong

## 2. Cấu hình Storage Bucket

1. Vào **Storage** tab trong Dashboard
2. Tạo bucket mới:
   - Name: `images` (hoặc tên tùy ý)
   - Public bucket: ✅ Enable

3. Trong bucket settings:
   - **Allowed MIME types**: `image/*`
   - **File size limit**: 10MB

## 3. Cấu hình Environment Variables

Thêm vào file `.env`:

```bash
# Supabase Configuration
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_BUCKET="images"
```

### Lấy thông tin:

- **SUPABASE_URL**: Từ Project Settings > API > Project URL
- **SUPABASE_ANON_KEY**: Từ Project Settings > API > Project API keys > anon public
- **SUPABASE_BUCKET**: Tên bucket đã tạo (default: `images`)

## 4. Test Upload

### Upload 1 ảnh:
```bash
POST /api/v1/upload/image
Content-Type: multipart/form-data

file: [select image file]
folder: uploads (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://your-project.supabase.co/storage/v1/object/public/images/uploads/123456789-image.jpg"
  }
}
```

### Upload nhiều ảnh:
```bash
POST /api/v1/upload/images
Content-Type: multipart/form-data

files: [select multiple image files]
folder: uploads (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "urls": [
      "https://...",
      "https://...",
      "https://..."
    ]
  }
}
```

## 5. Sử dụng trong Service

Inject SupabaseService vào service khác:

```typescript
import { SupabaseService } from '../supabase/services/supabase.service';

@Injectable()
export class YourService {
  constructor(private supabaseService: SupabaseService) {}

  async uploadAvatar(file: Express.Multer.File) {
    // Upload 1 ảnh
    const url = await this.supabaseService.uploadImage(file, 'avatars');
    return url;
  }

  async uploadGallery(files: Express.Multer.File[]) {
    // Upload nhiều ảnh
    const urls = await this.supabaseService.uploadImages(files, 'gallery');
    return urls;
  }
}
```

## 6. Validation Options

```typescript
// Upload với validation
const url = await this.supabaseService.uploadImageWithValidation(file, {
  folder: 'avatars',
  maxSize: 2 * 1024 * 1024, // 2MB
  allowedTypes: ['image/jpeg', 'image/png']
});
```

## 7. Lưu ý

- **File size limit**: 10MB (có thể config trong multer)
- **Allowed types**: JPEG, PNG, WebP
- **Max files**: 10 files per request
- **URLs**: Public URLs, accessible directly từ browser

## 8. Troubleshooting

### Lỗi "Bucket not found"
- Kiểm tra tên bucket trong env
- Đảm bảo bucket đã tạo và public

### Lỗi "File too large"
- Kiểm tra file size limit trong multer config
- Kiểm tra maxSize trong validation

### Lỗi "Invalid file type"
- Kiểm tra allowedTypes trong validation
- Đảm bảo file MIME type đúng

## 9. Security

- Bucket nên để **private** cho production
- Sử dụng signed URLs cho private files
- Validate file types và sizes phía server
