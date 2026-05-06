import { Command } from 'commander';
import chalk from 'chalk';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();
const API_URL = process.env.API_URL || 'http://localhost:4000/api';

program
  .name('deployflow')
  .description('CLI for DeployFlow PaaS')
  .version('1.0.0');

program
  .command('login')
  .description('Login to DeployFlow')
  .action(() => {
    console.log(chalk.blue('Authenticating with DeployFlow...'));
    // Simulation
    console.log(chalk.green('✓ Successfully logged in as elango'));
  });

program
  .command('deploy')
  .description('Deploy the current project')
  .option('-p, --project <id>', 'Project ID')
  .action(async (options) => {
    console.log(chalk.cyan('🚀 Starting deployment...'));
    try {
      const { data } = await axios.post(`${API_URL}/projects/${options.project}/deploy`);
      console.log(chalk.green(`✓ Deployment queued: ${data.id}`));
      console.log(chalk.gray(`View logs: http://deployflow.app/dashboard/deployments/${data.id}`));
    } catch (error: any) {
      console.error(chalk.red('Deployment failed:'), error.message);
    }
  });

program
  .command('logs <deploymentId>')
  .description('Stream logs for a deployment')
  .action((deploymentId) => {
    console.log(chalk.yellow(`Streaming logs for ${deploymentId}...`));
    // In real CLI we would use socket.io-client here
    console.log(chalk.gray('[10:01:23] Starting build...'));
    console.log(chalk.gray('[10:01:25] Installing dependencies...'));
  });

program.parse();
