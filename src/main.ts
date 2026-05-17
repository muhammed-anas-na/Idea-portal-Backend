import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));
  const config = app.get(ConfigService);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  const adminOrigin = config.get<string>('ADMIN_ORIGIN', 'https://idea-portal-admin.onrender.com');
  const portalOrigin = config.get<string>('PORTAL_ORIGIN', 'https://idea-portal-frontend-d55q.onrender.com');
  // app.enableCors({
  //   origin: [adminOrigin, portalOrigin, "http://localhost:4200", "http://localhost:4201"],
  //   credentials: true,
  // });
  app.enableCors({
  origin: (requestOrigin, callback) => {
    callback(null, requestOrigin);
  },
  credentials: true,
});
  app.setGlobalPrefix('api');

    const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (req, res) => {
    res.status(200).json({ status: 'Njan Adipoli aayittu oodandu', timestamp: new Date().toISOString() });
  });
    httpAdapter.get('/', (req, res) => {
    res.status(200).send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h1>Feebak IDEA Portal API</h1>
          <p>Server is up and running...</p>
          <p><a href="/health">Check my health </a></p>
          <p style="color:#888;font-size:12px;">v1.0.0 · ${new Date().toISOString()}</p>
        </body>
      </html>
    `);
  });

  const port = Number(config.get<string>('PORT', '3000'));
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}/api`);
}

bootstrap();
