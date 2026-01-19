import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './services/supabase.service';

@Module({
    imports: [ConfigModule],
    providers: [SupabaseService],
    exports: [SupabaseService], // Export để các module khác có thể sử dụng
})
export class SupabaseModule { }
