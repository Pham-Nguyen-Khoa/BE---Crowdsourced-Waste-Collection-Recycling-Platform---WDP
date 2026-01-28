import { Module } from '@nestjs/common';
import { ProfileController } from './controllers/profile.controller';
import { ProfileService } from './services/profile.service';
import { PrismaModule } from 'src/libs/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';

const httpController = [
    ProfileController,
]

const Services = [
    ProfileService,
]

@Module({
    imports: [PrismaModule, AuthModule, SupabaseModule],
    controllers: [...httpController],
    providers: [...Services],
    exports: [ProfileService]
})
export class ProfileModule { }

