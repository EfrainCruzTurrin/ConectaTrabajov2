import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    // Módulos de dominio (AuthModule, CategoriesModule, etc.)
    // se agregan a partir de la Fase 3 en adelante.
  ],
})
export class AppModule {}
