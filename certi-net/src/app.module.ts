import { Module } from '@nestjs/common';
import { CertController } from './certificate/certificate.controller';
import { CertService } from './certificate/certificate.service';
import { SshService } from './ssh/ssh.service';
import { PrismaService } from './prisma/prisma.service';
@Module({
  imports: [],
  controllers: [CertController],
  providers: [CertService, SshService, PrismaService],
})
export class AppModule {}
