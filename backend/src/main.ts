import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Prisma } from '@prisma/client';

console.log('ServiceScalarFieldEnum:', Prisma.ServiceScalarFieldEnum);
console.log('VendorScalarFieldEnum:', Prisma.VendorScalarFieldEnum);
console.log('OrderScalarFieldEnum:', Prisma.OrderScalarFieldEnum);
console.log('UserScalarFieldEnum:', Prisma.UserScalarFieldEnum);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:5173', // vite
      'http://localhost:3000',
    ],
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
