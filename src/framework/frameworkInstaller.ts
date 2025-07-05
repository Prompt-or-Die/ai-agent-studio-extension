import * as vscode from 'vscode';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { Framework } from './frameworkManager';

export class FrameworkInstaller {
    private outputChannel: vscode.OutputChannel;
    private workspaceRoot: string | undefined;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Studio - Installer');
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    async installFramework(framework: Framework): Promise<void> {
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder open. Please open a folder first.');
        }

        this.outputChannel.show();
        this.outputChannel.appendLine(`\n🚀 Installing ${framework.displayName}...`);

        try {
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Installing ${framework.displayName}`,
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Preparing installation...' });

                // Check prerequisites
                await this.checkPrerequisites(framework);
                progress.report({ increment: 20, message: 'Prerequisites checked' });

                // Install dependencies
                await this.installDependencies(framework, progress, token);
                progress.report({ increment: 70, message: 'Installing dependencies...' });

                // Post-installation setup
                await this.postInstallSetup(framework);
                progress.report({ increment: 90, message: 'Finalizing setup...' });

                // Verify installation
                await this.verifyInstallation(framework);
                progress.report({ increment: 100, message: 'Installation complete!' });
            });

            this.outputChannel.appendLine(`✅ ${framework.displayName} installed successfully!`);
            vscode.window.showInformationMessage(
                `${framework.displayName} installed successfully!`,
                'View Documentation',
                'Create Project'
            ).then(selection => {
                if (selection === 'View Documentation') {
                    vscode.env.openExternal(vscode.Uri.parse(framework.documentationUrl));
                } else if (selection === 'Create Project') {
                    vscode.commands.executeCommand('ai-agent-studio.createProject');
                }
            });

        } catch (error) {
            this.outputChannel.appendLine(`❌ Installation failed: ${error}`);
            vscode.window.showErrorMessage(`Failed to install ${framework.displayName}: ${error}`);
            throw error;
        }
    }

    private async checkPrerequisites(framework: Framework): Promise<void> {
        this.outputChannel.appendLine('🔍 Checking prerequisites...');

        // Check Node.js for TypeScript/JavaScript frameworks
        if (framework.languages.includes('typescript') || framework.languages.includes('javascript')) {
            await this.checkNodeJs();
            await this.checkNpm();
        }

        // Check Python for Python frameworks
        if (framework.languages.includes('python')) {
            await this.checkPython();
            await this.checkPip();
        }

        // Check framework-specific prerequisites
        await this.checkFrameworkSpecificPrerequisites(framework);
    }

    private async checkNodeJs(): Promise<void> {
        return new Promise((resolve, reject) => {
            exec('node --version', (error, stdout) => {
                if (error) {
                    reject(new Error('Node.js is not installed. Please install Node.js from https://nodejs.org/'));
                } else {
                    const version = stdout.trim();
                    this.outputChannel.appendLine(`✅ Node.js ${version} found`);
                    resolve();
                }
            });
        });
    }

    private async checkNpm(): Promise<void> {
        return new Promise((resolve, reject) => {
            exec('npm --version', (error, stdout) => {
                if (error) {
                    reject(new Error('npm is not installed. Please install npm.'));
                } else {
                    const version = stdout.trim();
                    this.outputChannel.appendLine(`✅ npm ${version} found`);
                    resolve();
                }
            });
        });
    }

    private async checkPython(): Promise<void> {
        return new Promise((resolve, reject) => {
            const pythonCommands = ['python3', 'python'];
            
            const checkCommand = (cmd: string): Promise<void> => {
                return new Promise((res, rej) => {
                    exec(`${cmd} --version`, (error, stdout) => {
                        if (error) {
                            rej(error);
                        } else {
                            const version = stdout.trim();
                            this.outputChannel.appendLine(`✅ ${version} found`);
                            res();
                        }
                    });
                });
            };

            // Try python3 first, then python
            checkCommand('python3')
                .then(resolve)
                .catch(() => {
                    checkCommand('python')
                        .then(resolve)
                        .catch(() => {
                            reject(new Error('Python is not installed. Please install Python from https://python.org/'));
                        });
                });
        });
    }

    private async checkPip(): Promise<void> {
        return new Promise((resolve, reject) => {
            const pipCommands = ['pip3', 'pip'];
            
            const checkCommand = (cmd: string): Promise<void> => {
                return new Promise((res, rej) => {
                    exec(`${cmd} --version`, (error, stdout) => {
                        if (error) {
                            rej(error);
                        } else {
                            const version = stdout.trim();
                            this.outputChannel.appendLine(`✅ ${version} found`);
                            res();
                        }
                    });
                });
            };

            // Try pip3 first, then pip
            checkCommand('pip3')
                .then(resolve)
                .catch(() => {
                    checkCommand('pip')
                        .then(resolve)
                        .catch(() => {
                            reject(new Error('pip is not installed. Please install pip.'));
                        });
                });
        });
    }

    private async checkFrameworkSpecificPrerequisites(framework: Framework): Promise<void> {
        switch (framework.id) {
            case 'openai-agents-sdk':
                // Check for OpenAI API key suggestion
                this.outputChannel.appendLine('💡 Remember to set your OPENAI_API_KEY environment variable');
                break;
            case 'elizaos':
                // Check for specific ElizaOS requirements
                this.outputChannel.appendLine('💡 ElizaOS supports multiple AI providers - configure in character files');
                break;
            case 'google-adk':
                // Check for Google Cloud prerequisites
                this.outputChannel.appendLine('💡 Consider setting up Google Cloud authentication for Google ADK');
                break;
            default:
                break;
        }
    }

    private async installDependencies(
        framework: Framework, 
        progress: vscode.Progress<{message?: string; increment?: number}>,
        token: vscode.CancellationToken
    ): Promise<void> {
        const totalDeps = framework.dependencies.length;
        let installedDeps = 0;

        for (const dependency of framework.dependencies) {
            if (token.isCancellationRequested) {
                throw new Error('Installation cancelled by user');
            }

            this.outputChannel.appendLine(`📦 Installing ${dependency}...`);
            
            if (framework.languages.includes('python')) {
                await this.installPythonPackage(dependency);
            } else {
                await this.installNodePackage(dependency);
            }

            installedDeps++;
            const progressPercent = (installedDeps / totalDeps) * 50; // 50% of total progress
            progress.report({ 
                increment: progressPercent / totalDeps,
                message: `Installed ${dependency} (${installedDeps}/${totalDeps})`
            });
        }
    }

    private async installNodePackage(packageName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const process = spawn('npm', ['install', packageName], {
                cwd: this.workspaceRoot,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
                this.outputChannel.append(data.toString());
            });

            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
                this.outputChannel.append(data.toString());
            });

            process.on('close', (code) => {
                if (code === 0) {
                    this.outputChannel.appendLine(`✅ ${packageName} installed successfully`);
                    resolve();
                } else {
                    this.outputChannel.appendLine(`❌ Failed to install ${packageName}`);
                    reject(new Error(`npm install failed with code ${code}: ${errorOutput}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`Failed to start npm install: ${error.message}`));
            });
        });
    }

    private async installPythonPackage(packageName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Try pip3 first, then pip
            const pipCommand = this.getPipCommand();
            
            const process = spawn(pipCommand, ['install', packageName], {
                cwd: this.workspaceRoot,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
                this.outputChannel.append(data.toString());
            });

            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
                this.outputChannel.append(data.toString());
            });

            process.on('close', (code) => {
                if (code === 0) {
                    this.outputChannel.appendLine(`✅ ${packageName} installed successfully`);
                    resolve();
                } else {
                    this.outputChannel.appendLine(`❌ Failed to install ${packageName}`);
                    reject(new Error(`pip install failed with code ${code}: ${errorOutput}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`Failed to start pip install: ${error.message}`));
            });
        });
    }

    private getPipCommand(): string {
        // Determine the correct pip command to use
        try {
            exec('pip3 --version', { timeout: 5000 });
            return 'pip3';
        } catch {
            return 'pip';
        }
    }

    private async postInstallSetup(framework: Framework): Promise<void> {
        this.outputChannel.appendLine('🔧 Running post-installation setup...');

        switch (framework.id) {
            case 'elizaos':
                await this.setupElizaOS();
                break;
            case 'crewai':
                await this.setupCrewAI();
                break;
            case 'openai-agents-sdk':
                await this.setupOpenAIAgentsSDK();
                break;
            default:
                break;
        }

        // Create example configuration files
        await this.createExampleConfigs(framework);
    }

    private async setupElizaOS(): Promise<void> {
        this.outputChannel.appendLine('🎭 Setting up ElizaOS...');
        
        // Create basic character file
        const characterPath = path.join(this.workspaceRoot!, 'characters');
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(characterPath));
        
        const exampleCharacter = {
            name: 'ExampleCharacter',
            bio: 'An example AI character created with ElizaOS',
            lore: ['I am a helpful AI assistant'],
            style: {
                all: ['Be helpful and informative', 'Maintain a friendly tone']
            },
            topics: ['general assistance', 'questions'],
            adjectives: ['helpful', 'knowledgeable', 'friendly']
        };

        const characterFile = path.join(characterPath, 'example.character.json');
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(characterFile),
            Buffer.from(JSON.stringify(exampleCharacter, null, 2))
        );

        this.outputChannel.appendLine(`📄 Created example character at ${characterFile}`);
    }

    private async setupCrewAI(): Promise<void> {
        this.outputChannel.appendLine('👥 Setting up CrewAI...');
        
        // Create tools directory
        const toolsPath = path.join(this.workspaceRoot!, 'tools');
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(toolsPath));
        
        this.outputChannel.appendLine('📁 Created tools directory for CrewAI');
    }

    private async setupOpenAIAgentsSDK(): Promise<void> {
        this.outputChannel.appendLine('🤖 Setting up OpenAI Agents SDK...');
        
        // Create .env.example file
        const envExample = `# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7
`;

        const envPath = path.join(this.workspaceRoot!, '.env.example');
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(envPath),
            Buffer.from(envExample)
        );

        this.outputChannel.appendLine('📄 Created .env.example file');
    }

    private async createExampleConfigs(framework: Framework): Promise<void> {
        const configsPath = path.join(this.workspaceRoot!, 'configs');
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(configsPath));

        const configFile = path.join(configsPath, `${framework.id}.config.json`);
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(configFile),
            Buffer.from(JSON.stringify(framework.configSchema, null, 2))
        );

        this.outputChannel.appendLine(`📄 Created example config at ${configFile}`);
    }

    private async verifyInstallation(framework: Framework): Promise<void> {
        this.outputChannel.appendLine('🔍 Verifying installation...');

        for (const dependency of framework.dependencies) {
            try {
                if (framework.languages.includes('python')) {
                    await this.verifyPythonPackage(dependency);
                } else {
                    await this.verifyNodePackage(dependency);
                }
                this.outputChannel.appendLine(`✅ ${dependency} verified`);
            } catch (error) {
                this.outputChannel.appendLine(`⚠️ ${dependency} verification failed: ${error}`);
            }
        }
    }

    private async verifyNodePackage(packageName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(`npm list ${packageName}`, { cwd: this.workspaceRoot }, (error, stdout) => {
                if (error) {
                    reject(new Error(`Package ${packageName} not found`));
                } else {
                    resolve();
                }
            });
        });
    }

    private async verifyPythonPackage(packageName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const pythonCode = `import ${packageName.replace('-', '_')}; print('OK')`;
            exec(`python -c "${pythonCode}"`, (error) => {
                if (error) {
                    reject(new Error(`Python package ${packageName} not found`));
                } else {
                    resolve();
                }
            });
        });
    }

    async uninstallFramework(framework: Framework): Promise<void> {
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder open.');
        }

        this.outputChannel.show();
        this.outputChannel.appendLine(`\n🗑️ Uninstalling ${framework.displayName}...`);

        try {
            for (const dependency of framework.dependencies) {
                this.outputChannel.appendLine(`📦 Uninstalling ${dependency}...`);
                
                if (framework.languages.includes('python')) {
                    await this.uninstallPythonPackage(dependency);
                } else {
                    await this.uninstallNodePackage(dependency);
                }
            }

            this.outputChannel.appendLine(`✅ ${framework.displayName} uninstalled successfully!`);
            vscode.window.showInformationMessage(`${framework.displayName} uninstalled successfully!`);

        } catch (error) {
            this.outputChannel.appendLine(`❌ Uninstallation failed: ${error}`);
            vscode.window.showErrorMessage(`Failed to uninstall ${framework.displayName}: ${error}`);
            throw error;
        }
    }

    private async uninstallNodePackage(packageName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const process = spawn('npm', ['uninstall', packageName], {
                cwd: this.workspaceRoot,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            process.on('close', (code) => {
                if (code === 0) {
                    this.outputChannel.appendLine(`✅ ${packageName} uninstalled successfully`);
                    resolve();
                } else {
                    reject(new Error(`npm uninstall failed with code ${code}`));
                }
            });
        });
    }

    private async uninstallPythonPackage(packageName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const pipCommand = this.getPipCommand();
            
            const process = spawn(pipCommand, ['uninstall', packageName, '-y'], {
                cwd: this.workspaceRoot,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            process.on('close', (code) => {
                if (code === 0) {
                    this.outputChannel.appendLine(`✅ ${packageName} uninstalled successfully`);
                    resolve();
                } else {
                    reject(new Error(`pip uninstall failed with code ${code}`));
                }
            });
        });
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}