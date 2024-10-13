import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Crypto Alerts API')
    .setDescription('API documentation for the Crypto Alerts application')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Swagger UI will be available at /api-docs

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove fields that are not in the DTO
      forbidNonWhitelisted: true, // Throw an error if any non-whitelisted fields are provided
      forbidUnknownValues: true, // Prevent unknown values from being passed
    }),
  ); //

  await app.listen(3000);
  console.log(`App running on Port http://localhost:3000`);
}
bootstrap();
