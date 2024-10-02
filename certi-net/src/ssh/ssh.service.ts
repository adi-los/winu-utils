import { Injectable, Logger } from '@nestjs/common';
import { Client as SSHClient, SFTPWrapper } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);

  async executeSshCommand(host: string, command: string, username = 'root', password = 'KVM'): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const ssh = new SSHClient();
      console.log(`Connecting to SFTP server at ${host} as ${username}`);
      this.logger.log(`Connecting to ${host} and executing command: ${command}`);

      ssh
        .on('ready', () => {
          ssh.exec(command, (err, stream) => {
            if (err) {
              this.logger.error(`Error executing command: ${err.message}`);
              reject(err);
              ssh.end();
              return;
            }

            let result = '';
            let error = '';

            stream
              .on('close', (code, signal) => {
                ssh.end();
                if (error) {
                  // Check for specific warnings to ignore
                  if (!this.isIgnorableWarning(error)) {
                    this.logger.error(`Command error from ${host}: ${error}`);
                    reject(error);
                  } else {
                    this.logger.log(`Ignored warning from ${host}: ${error}`);
                    resolve(result); // Resolve with the result even if there was an ignored warning
                  }
                } else {
                  this.logger.log(`Command output from ${host}: ${result}`);
                  resolve(result);
                }
              })
              .on('data', (data: Buffer) => {
                result += data.toString();
              })
              .stderr.on('data', (data: Buffer) => {
                error += data.toString();
              });
          });
        })
        .on('error', (err) => {
          this.logger.error(`SSH connection error: ${err.message}`);
          reject(err);
        })
        .connect({
          host,
          port: 22,
          username,
          password,
        });
    });
  }

  private isIgnorableWarning(error: string): boolean {
    // Check for specific warnings that you want to ignore
    const ignorableWarnings = [
      'Kubernetes configuration file is group-readable',
      'Kubernetes configuration file is world-readable',
      'server.dev.enabled=true',
      'Created symlink /etc/systemd/system/multi-user.target.wants/nfs-server.service → /usr/lib/systemd/system/nfs-server.service',
      'generating a new CA key and certificate from CSR',
    ];

    return ignorableWarnings.some(warning => error.includes(warning));
  }

  async kubectlApply(fileOrDirectory: string, masterIp: string): Promise<string | null> {
    const command = `kubectl apply -f ${fileOrDirectory}`;
    return this.executeSshCommand(masterIp, command);
  }

  async helmInstall(releaseName: string, chartPath: string, masterIp: string, options = ''): Promise<string | null> {
    const command = `helm install ${releaseName} ${chartPath} ${options}`;
    return this.executeSshCommand(masterIp, command);
  }

  async initResources(ip: string): Promise<string | null> {
    const command = `
    echo "" > /etc/systemd/system/docker.service.d/proxy.conf && \
    echo '{ "insecure-registries": ["dev-winu.artifact.winu.fr"] }' | tee /etc/docker/daemon.json > /dev/null && \
    update-ca-trust && \
    chmod 777 /etc/pki/ca-trust/source/anchors/* && \
    systemctl daemon-reload && \
    systemctl restart docker && \
    sleep 10
    `;
    return this.executeSshCommand(ip, command);
  }

  async sftpUpload(host: string, localPath: string, remotePath: string, username = 'root', password = 'KVM'): Promise<void> {
    return new Promise((resolve, reject) => {
      const ssh = new SSHClient();
      console.log(`Connecting to SFTP server at ${host} as ${username}`);
      this.logger.log(`Starting SFTP upload from ${localPath} to ${host}:${remotePath}`);

      ssh
        .on('ready', () => {
          ssh.sftp((err, sftp: SFTPWrapper) => {
            if (err) {
              this.logger.error(`SFTP session error: ${err.message}`);
              reject(err);
              ssh.end();
              return;
            }

            this.uploadDirectoryOrFile(sftp, localPath, remotePath)
              .then(() => {
                this.logger.log(`Upload complete`);
                resolve();
                ssh.end();
              })
              .catch((uploadErr) => {
                this.logger.error(`Error during SFTP upload: ${uploadErr.message}`);
                reject(uploadErr);
                ssh.end();
              });
          });
        })
        .on('error', (err) => {
          this.logger.error(`SSH connection error during SFTP upload: ${err.message}`);
          reject(err);
        })
        .connect({
          host,
          port: 22,
          username,
          password,
        });
    });
  }

  private async uploadDirectoryOrFile(sftp: SFTPWrapper, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.stat(localPath, async (err, stats) => {
        if (err) {
          return reject(err);
        }

        if (stats.isDirectory()) {
          // Handle directory upload
          sftp.mkdir(remotePath, (mkdirErr) => {
            if (mkdirErr && mkdirErr.message !== 'EEXIST') {
              return reject(mkdirErr);
            }

            fs.readdir(localPath, (readDirErr, items) => {
              if (readDirErr) {
                return reject(readDirErr);
              }

              Promise.all(
                items.map((item) => {
                  const localItem = path.join(localPath, item);
                  const remoteItem = path.join(remotePath, item);
                  return this.uploadDirectoryOrFile(sftp, localItem, remoteItem);
                }),
              )
                .then(() => resolve())
                .catch((e) => reject(e));
            });
          });
        } else {
          // Handle file upload
          sftp.fastPut(localPath, remotePath, (putErr) => {
            if (putErr) {
              return reject(putErr);
            }
            this.logger.log(`Uploaded ${localPath} to ${remotePath}`);
            resolve();
          });
        }
      });
    });
  }
}
