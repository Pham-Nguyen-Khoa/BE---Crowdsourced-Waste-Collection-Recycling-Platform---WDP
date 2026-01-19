import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private supabase: SupabaseClient;
    private bucketName: string;

    constructor(private configService: ConfigService) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
        this.bucketName = this.configService.get<string>('SUPABASE_BUCKET', 'uploads');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_KEY environment variables.');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Upload một file ảnh lên Supabase Storage
     * @param file File từ multer
     * @param folder Thư mục lưu trữ (default: 'wdp')
     * @returns URL của ảnh đã upload
     */
    async uploadImage(file: Express.Multer.File, folder: string = 'wdp'): Promise<string> {
        try {
            // Tạo tên file unique
            const fileExt = file.originalname.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;

            // Upload file lên Supabase
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Supabase upload error:', error);
                throw new Error(`Upload failed: ${error.message}`);
            }

            // Lấy URL public của file
            const { data: urlData } = this.supabase.storage
                .from(this.bucketName)
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    /**
     * Upload nhiều file ảnh cùng lúc
     * @param files Array các file từ multer
     * @param folder Thư mục lưu trữ (default: 'wdp')
     * @returns Array URLs của các ảnh đã upload
     */
    async uploadImages(files: Express.Multer.File[], folder: string = 'wdp'): Promise<string[]> {
        try {
            const uploadPromises = files.map(file => this.uploadImage(file, folder));
            return await Promise.all(uploadPromises);
        } catch (error) {
            console.error('Error uploading multiple images:', error);
            throw error;
        }
    }
}
