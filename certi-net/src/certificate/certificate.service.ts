// import { Injectable, Logger } from '@nestjs/common';
// import { SshService } from '../ssh/ssh.service'; // Import the SshService
// import { PrismaService } from '../prisma/prisma.service'; // Import Prisma Service
// import { v4 as uuidv4 } from 'uuid'; // For generating UUIDs

// @Injectable()
// export class CertService {
//   private readonly logger = new Logger(CertService.name);

//   constructor(
//     private readonly sshService: SshService,
//     private readonly prisma: PrismaService // Inject Prisma Service
//   ) {}

//   async generateCertificate(
//     ip: string,
//     username: string,
//     password: string,
//     domain: string,
//     path: string,
//     nameserver: string,
//     tenant: string
//   ): Promise<any> {
//     this.logger.log(`Starting certificate generation for domain: ${domain}`);

//     const domainName = domain.split('.')[0]; // Get the first part of the domain
//     const certDir = `/tmp/${domainName}/certs/${domain}`;

//     this.logger.log(`Creating certificate directory on PKI server at: ${certDir}`);

//     // Command to create the necessary directory on the PKI server
//     const createDirCmd = `mkdir -p ${certDir}`;
//     await this.sshService.executeSshCommand('10.0.0.15', createDirCmd);

//     // Create csr.json content
//     const csrContent = JSON.stringify(
//       {
//         CN: domain,
//         hosts: [domain, `www.${domain}`],
//         key: {
//           algo: 'rsa',
//           size: 2048,
//         },
//       },
//       null,
//       2
//     ); // Pretty print JSON

//     // Command to create the csr.json file
//     const createCsrCmd = `echo '${csrContent}' > ${certDir}/csr.json`;
//     this.logger.log(`Creating CSR JSON file at: ${certDir}/csr.json`);
//     await this.sshService.executeSshCommand('10.0.0.15', createCsrCmd);

//     this.logger.log(`Generating SSL certificate using CFSSL on PKI server`);

//     // Command to generate SSL certificate (example using CFSSL)
//     const certGenCmd = `
//       cd ${certDir} &&
//       cfssl gencert -initca csr.json | cfssljson -bare ${domain}
//     `;

//     // Execute the command to generate the certificate on the PKI server
//     await this.sshService.executeSshCommand('10.0.0.15', certGenCmd);

//     // Paths to the generated certificates on the PKI server
//     const certPathOnPki = `${certDir}/${domain}.pem`;
//     const keyPathOnPki = `${certDir}/${domain}-key.pem`;

//     this.logger.log(`Reading the generated certificate and key from PKI server`);
//     const certContent = await this.readFileContentRemote('10.0.0.15', certPathOnPki);
//     const keyContent = await this.readFileContentRemote('10.0.0.15', keyPathOnPki);

//     // Path on the user's machine where the certificate and key will be stored
//     const userCertDir = `${path}/${domain}`;

//     this.logger.log(`Creating certificate directory on user machine at: ${userCertDir}`);

//     // Command to create the directory on the user's machine
//     const createUserDirCmd = `mkdir -p ${userCertDir}`;
//     await this.sshService.executeSshCommand(ip, createUserDirCmd, username, password);

//     // Command to save the certificate on the user's machine
//     const saveCertCmd = `echo '${certContent}' > ${userCertDir}/${domain}.pem`;
//     this.logger.log(`Saving the certificate to: ${userCertDir}/${domain}.pem`);
//     await this.sshService.executeSshCommand(ip, saveCertCmd, username, password);

//     // Command to save the key on the user's machine
//     const saveKeyCmd = `echo '${keyContent}' > ${userCertDir}/${domain}-key.pem`;
//     this.logger.log(`Saving the key to: ${userCertDir}/${domain}-key.pem`);
//     await this.sshService.executeSshCommand(ip, saveKeyCmd, username, password);

//     this.logger.log(`Successfully assigned certificate and key to user machine for domain: ${domain}`);

//     // Insert data into the Prisma database
//     const uuid = uuidv4();
//     const currentDate = new Date();
//     await this.prisma.certifcate_db.create({
//       data: {
//         uuid_cert: uuid,
//         domain: domain,
//         date_creation: currentDate,
//         status: 'Generated', // Or another status indicating success
//         client_ip: ip,
//         client_auth: [username, password],
//         cert_client_path: `${userCertDir}/${domain}.pem`,
//         cert_server_path: certPathOnPki,
//         nameserver: nameserver,
//         tenant: tenant,
//       },
//     });

//     this.logger.log(`Certificate information successfully saved in the database for domain: ${domain}`);

//     // Return a success message
//     return {
//       message: `Your Domain ${domain} certificate assigned successfully. You can find it in ${userCertDir} on IP ${ip}.`,
//     };
//   }

//   // Function to read file content from a remote server using SSH
//   private async readFileContentRemote(host: string, filePath: string): Promise<string> {
//     const catFileCmd = `cat ${filePath}`;
//     this.logger.log(`Executing command to read file content: ${catFileCmd}`);
//     const fileContent = await this.sshService.executeSshCommand(host, catFileCmd);
//     return fileContent;
//   }
// }






import { Injectable, Logger } from '@nestjs/common';
import { SshService } from '../ssh/ssh.service'; // Import the SshService
import { PrismaService } from '../prisma/prisma.service'; // Import Prisma Service
import { v4 as uuidv4 } from 'uuid'; // For generating UUIDs
import { Base64 } from 'js-base64'; // For encoding the certificate and key to base64

@Injectable()
export class CertService {
  private readonly logger = new Logger(CertService.name);

  constructor(
    private readonly sshService: SshService,
    private readonly prisma: PrismaService // Inject Prisma Service
  ) {}

  async generateCertificate(
    ip: string,
    username: string,
    password: string,
    domain: string,
    path: string,
    nameserver: string,
    tenant: string
  ): Promise<any> {
    this.logger.log(`Starting certificate generation for domain: ${domain}`);

    const domainName = domain.split('.')[0]; // Get the first part of the domain
    const certDir = `/tmp/${domainName}/certs/${domain}`;

    this.logger.log(`Creating certificate directory on PKI server at: ${certDir}`);

    // Command to create the necessary directory on the PKI server
    const createDirCmd = `mkdir -p ${certDir}`;
    await this.sshService.executeSshCommand('10.0.0.15', createDirCmd);

    // Create csr.json content
    const csrContent = JSON.stringify(
      {
        CN: domain,
        hosts: [domain, `www.${domain}`],
        key: {
          algo: 'rsa',
          size: 2048,
        },
      },
      null,
      2
    ); // Pretty print JSON

    // Command to create the csr.json file
    const createCsrCmd = `echo '${csrContent}' > ${certDir}/csr.json`;
    this.logger.log(`Creating CSR JSON file at: ${certDir}/csr.json`);
    await this.sshService.executeSshCommand('10.0.0.15', createCsrCmd);

    this.logger.log(`Generating SSL certificate using CFSSL on PKI server`);

    // Command to generate SSL certificate (example using CFSSL)
    const certGenCmd = `
      cd ${certDir} &&
      cfssl gencert -initca csr.json | cfssljson -bare ${domain}
    `;

    // Execute the command to generate the certificate on the PKI server
    await this.sshService.executeSshCommand('10.0.0.15', certGenCmd);

    // Paths to the generated certificates on the PKI server
    const certPathOnPki = `${certDir}/${domain}.pem`;
    const keyPathOnPki = `${certDir}/${domain}-key.pem`;

    this.logger.log(`Reading the generated certificate and key from PKI server`);
    const certContent = await this.readFileContentRemote('10.0.0.15', certPathOnPki);
    const keyContent = await this.readFileContentRemote('10.0.0.15', keyPathOnPki);

    // Encode certificate and key in base64 format
    const certBase64 = Base64.encode(certContent);
    const keyBase64 = Base64.encode(keyContent);

    this.logger.log(`Certificate and key for domain ${domain} generated and encoded in base64`);

    // Insert data into the Prisma database
    const uuid = uuidv4();
    const currentDate = new Date();
    await this.prisma.certifcate_db.create({
      data: {
        uuid_cert: uuid,
        domain: domain,
        date_creation: currentDate,
        status: 'Generated', // Or another status indicating success
        client_ip: ip,
        client_auth: [username, password],
        cert_client_path: `${path}/${domain}.pem`,
        cert_server_path: certPathOnPki,
        nameserver: nameserver,
        tenant: tenant,
      },
    });

    this.logger.log(`Certificate information successfully saved in the database for domain: ${domain}`);

    // Return a success message with base64 encoded certificate and key
    return {
      message: `Certificate and key for domain ${domain} generated successfully.`,
      certBase64: certBase64,
      keyBase64: keyBase64,
    };
  }

  // Function to read file content from a remote server using SSH
  private async readFileContentRemote(host: string, filePath: string): Promise<string> {
    const catFileCmd = `cat ${filePath}`;
    this.logger.log(`Executing command to read file content: ${catFileCmd}`);
    const fileContent = await this.sshService.executeSshCommand(host, catFileCmd);
    return fileContent;
  }
}
