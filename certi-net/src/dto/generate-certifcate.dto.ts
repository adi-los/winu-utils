import { IsString } from 'class-validator';

export class GenerateCertificateDto {
  @IsString()
  domain: string;
}
