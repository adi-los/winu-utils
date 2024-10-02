import { Controller, Post, Body, Put } from '@nestjs/common';
import { CertService } from './certificate.service';

@Controller('cert')
export class CertController {
  constructor(private readonly certService: CertService) {}

  @Post('generate')
  async generateCert(@Body() generateCertDto: { ip: string, username: string, password: string, domain: string, path: string, nameserver: string, tenant: string }) {
    const { ip, username, password, domain, path, nameserver, tenant } = generateCertDto;
    
    // Call the service to generate and assign the certificate
    return this.certService.generateCertificate(ip, username, password, domain, path, nameserver, tenant);
  }
}


