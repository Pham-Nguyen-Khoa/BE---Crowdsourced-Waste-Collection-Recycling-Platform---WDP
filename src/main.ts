import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { setupSwagger } from './configs/swagger.config';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Env 
  const configService = app.get(ConfigService);
  const port = process.env.PORT || configService.get<number>('PORT', 3000);
  const hostname = '0.0.0.0';

  // Cấu hình validate
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Socket 
  app.useWebSocketAdapter(new IoAdapter(app));

  // Tăng giới hạn kích thước payload
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: false
  });


  // Setup Swagger
  setupSwagger(app);


  // Start prooject
  await app.listen(port, hostname);
  console.log(`Server is running on http://localhost:${port}`);

}
bootstrap();
