import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Framework } from './frameworkManager';

export class FrameworkDetector {
    private workspaceRoot: string | undefined;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    async isFrameworkInstalled(framework: Framework): Promise<boolean> {
        if (!this.workspaceRoot) {
            return false;
        }

        try {
            // Check multiple detection methods
            const methods = [
                () => this.checkPackageJson(framework),
                () => this.checkNodeModules(framework),
                () => this.checkPythonPackages(framework),
                () => this.checkGlobalInstallation(framework)
            ];

            for (const method of methods) {
                if (await method()) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error(`Error detecting framework ${framework.id}:`, error);
            return false;
        }
    }

    async getFrameworkVersion(framework: Framework): Promise<string> {
        if (!this.workspaceRoot) {
            return 'unknown';
        }

        try {
            // Try to get version from package.json first
            const packageJsonVersion = await this.getVersionFromPackageJson(framework);
            if (packageJsonVersion) {
                return packageJsonVersion;
            }

            // Try to get version from installed packages
            const installedVersion = await this.getVersionFromInstalled(framework);
            if (installedVersion) {
                return installedVersion;
            }

            return 'unknown';
        } catch (error) {
            console.error(`Error getting version for ${framework.id}:`, error);
            return 'unknown';
        }
    }

    private async checkPackageJson(framework: Framework): Promise<boolean> {
        const packageJsonPath = path.join(this.workspaceRoot!, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            return false;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies,
                ...packageJson.peerDependencies
            };

            return framework.dependencies.some(dep => dep in allDeps);
        } catch (error) {
            return false;
        }
    }

    private async checkNodeModules(framework: Framework): Promise<boolean> {
        const nodeModulesPath = path.join(this.workspaceRoot!, 'node_modules');
        
        if (!fs.existsSync(nodeModulesPath)) {
            return false;
        }

        return framework.dependencies.some(dep => {
            const depPath = path.join(nodeModulesPath, dep);
            return fs.existsSync(depPath);
        });
    }

    private async checkPythonPackages(framework: Framework): Promise<boolean> {
        if (!framework.languages.includes('python')) {
            return false;
        }

        try {
            for (const dep of framework.dependencies) {
                try {
                    execSync(`python -c "import ${dep.replace('-', '_')}"`, { stdio: 'ignore' });
                    return true;
                } catch {
                    // Try with pip show
                    try {
                        execSync(`pip show ${dep}`, { stdio: 'ignore' });
                        return true;
                    } catch {
                        continue;
                    }
                }
            }
            return false;
        } catch {
            return false;
        }
    }

    private async checkGlobalInstallation(framework: Framework): Promise<boolean> {
        try {
            // Check npm global packages
            if (framework.languages.includes('typescript') || framework.languages.includes('javascript')) {
                try {
                    const result = execSync('npm list -g --depth=0', { encoding: 'utf8', stdio: 'pipe' });
                    return framework.dependencies.some(dep => result.includes(dep));
                } catch {
                    // Ignore errors
                }
            }

            // Check pip global packages
            if (framework.languages.includes('python')) {
                try {
                    const result = execSync('pip list', { encoding: 'utf8', stdio: 'pipe' });
                    return framework.dependencies.some(dep => result.includes(dep));
                } catch {
                    // Ignore errors
                }
            }

            return false;
        } catch {
            return false;
        }
    }

    private async getVersionFromPackageJson(framework: Framework): Promise<string | null> {
        const packageJsonPath = path.join(this.workspaceRoot!, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            return null;
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies,
                ...packageJson.peerDependencies
            };

            for (const dep of framework.dependencies) {
                if (allDeps[dep]) {
                    return allDeps[dep].replace(/[\^~]/, '');
                }
            }

            return null;
        } catch {
            return null;
        }
    }

    private async getVersionFromInstalled(framework: Framework): Promise<string | null> {
        try {
            // Try npm list for Node.js packages
            if (framework.languages.includes('typescript') || framework.languages.includes('javascript')) {
                for (const dep of framework.dependencies) {
                    try {
                        const result = execSync(`npm list ${dep} --depth=0`, { 
                            encoding: 'utf8', 
                            stdio: 'pipe',
                            cwd: this.workspaceRoot
                        });
                        const match = result.match(new RegExp(`${dep}@([\\d\\.]+)`));
                        if (match) {
                            return match[1];
                        }
                    } catch {
                        continue;
                    }
                }
            }

            // Try pip show for Python packages
            if (framework.languages.includes('python')) {
                for (const dep of framework.dependencies) {
                    try {
                        const result = execSync(`pip show ${dep}`, { 
                            encoding: 'utf8', 
                            stdio: 'pipe' 
                        });
                        const match = result.match(/Version: ([\\d\\.]+)/);
                        if (match) {
                            return match[1];
                        }
                    } catch {
                        continue;
                    }
                }
            }

            return null;
        } catch {
            return null;
        }
    }

    async getInstalledFrameworks(): Promise<Framework[]> {
        // This would be called from FrameworkManager to get all detected frameworks
        return [];
    }

    async detectProjectType(): Promise<string | null> {
        if (!this.workspaceRoot) {
            return null;
        }

        // Check for specific framework indicators
        const indicators = [
            { files: ['eliza.json', 'character.json'], type: 'elizaos' },
            { files: ['crew.py', 'agents.py'], type: 'crewai' },
            { files: ['autogen_config.py'], type: 'autogen' },
            { files: ['langchain_config.py'], type: 'langchain' },
            { files: ['agent.ts', 'agent.js'], type: 'openai-agents-sdk' }
        ];

        for (const indicator of indicators) {
            const hasFiles = indicator.files.some(file => 
                fs.existsSync(path.join(this.workspaceRoot!, file))
            );
            if (hasFiles) {
                return indicator.type;
            }
        }

        return null;
    }

    async scanWorkspaceForAgents(): Promise<string[]> {
        if (!this.workspaceRoot) {
            return [];
        }

        const agentFiles: string[] = [];
        
        try {
            const scanDirectory = (dir: string) => {
                const items = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const item of items) {
                    const fullPath = path.join(dir, item.name);
                    
                    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
                        scanDirectory(fullPath);
                    } else if (item.isFile()) {
                        // Check for agent-related files
                        if (this.isAgentFile(item.name, fullPath)) {
                            agentFiles.push(fullPath);
                        }
                    }
                }
            };

            scanDirectory(this.workspaceRoot);
        } catch (error) {
            console.error('Error scanning workspace for agents:', error);
        }

        return agentFiles;
    }

    private isAgentFile(filename: string, fullPath: string): boolean {
        // Check file patterns that indicate agent files
        const agentPatterns = [
            /agent\.(ts|js|py)$/i,
            /character\.json$/i,
            /crew\.(py|ts|js)$/i,
            /\.agent\.json$/i,
            /\.crew\.json$/i,
            /\.eliza\.json$/i
        ];

        if (agentPatterns.some(pattern => pattern.test(filename))) {
            return true;
        }

        // Check file content for agent indicators
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const agentIndicators = [
                'class.*Agent',
                'Agent.*=',
                'startAgent',
                'ConversableAgent',
                'CodeAgent',
                'from crewai import',
                'import.*agents',
                '@openai/agents-sdk'
            ];

            return agentIndicators.some(indicator => 
                new RegExp(indicator, 'i').test(content)
            );
        } catch {
            return false;
        }
    }
}