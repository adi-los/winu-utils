import { Controller, Post, Body } from '@nestjs/common';
import { SshService } from './ssh.service';



@Controller('ssh')
export class SshController {
  constructor(private readonly sshService: SshService) {}

  @Post('kubectl-apply')
  async kubectlApply(@Body() body: { fileOrDirectory: string; masterIp: string }) {
    const { fileOrDirectory, masterIp } = body;
    return this.sshService.kubectlApply(fileOrDirectory, masterIp);
  }

  @Post('helm-install')
  async helmInstall(@Body() body: { releaseName: string; chartPath: string; masterIp: string; options?: string }) {
    const { releaseName, chartPath, masterIp, options = '' } = body;
    return this.sshService.helmInstall(releaseName, chartPath, masterIp, options);
  }

  @Post('init-resources')
  async initResources(@Body() body: { ip: string }) {
    const { ip } = body;
    return this.sshService.initResources(ip);
  }
  @Post('execute')
  async executeCommand(@Body() body: { host: string; command: string }) {
    const { host, command } = body;
    return this.sshService.executeSshCommand(host, command);
  }

  @Post('upload')
  async uploadFile(@Body() body: { host: string; localPath: string; remotePath: string }) {
    const { host, localPath, remotePath } = body;
    return this.sshService.sftpUpload(host, localPath, remotePath);
  }
}




