// Demo cách sử dụng SupabaseService

import { SupabaseService } from './services/supabase.service';

export class ExampleService {
    constructor(private supabaseService: SupabaseService) { }

    // Upload 1 ảnh
    async uploadAvatar(file: Express.Multer.File) {
        try {
            const imageUrl = await this.supabaseService.uploadImage(file, 'avatars');
            // imageUrl sẽ là: https://your-project.supabase.co/storage/v1/object/public/uploads/avatars/123456789-image.jpg
            return imageUrl;
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    // Upload nhiều ảnh
    async uploadGallery(files: Express.Multer.File[]) {
        try {
            const imageUrls = await this.supabaseService.uploadImages(files, 'gallery');
            // imageUrls sẽ là array URLs
            return imageUrls;
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }
}

/*
// Trong Controller (tự implement)
@Post('upload-avatar')
@UseInterceptors(FileInterceptor('file'))
async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  const url = await this.exampleService.uploadAvatar(file);
  return { success: true, url };
}

@Post('upload-gallery')
@UseInterceptors(FilesInterceptor('files'))
async uploadGallery(@UploadedFiles() files: Express.Multer.File[]) {
  const urls = await this.exampleService.uploadGallery(files);
  return { success: true, urls };
}
*/
