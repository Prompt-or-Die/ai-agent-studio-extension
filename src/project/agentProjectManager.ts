import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TemplateManager, AgentTemplate } from '../templates/templateManager';
import { FrameworkManager } from '../framework/frameworkManager';

export interface AgentProject {
    id: string;
    name: string;
    framework: string;
    path: string;
    created: Date;
    lastModified: Date;
    status: 'active' | 'inactive' | 'error';
    agents: AgentInfo[];
    configuration: any;
}

export interface AgentInfo {
    name: string;
    type: string;
    file: string;
    status: 'running' | 'stopped' | 'error';
    lastRun?: Date;
}

export class AgentProjectManager {
    private templateManager: TemplateManager;
    private frameworkManager: FrameworkManager;
    private treeProvider: AgentProjectTreeProvider;
    private projects: AgentProject[] = [];
    private outputChannel: vscode.OutputChannel;
    
    constructor(private context: vscode.ExtensionContext) {
        this.templateManager = new TemplateManager(context);
        this.frameworkManager = new FrameworkManager(context);
        this.treeProvider = new AgentProjectTreeProvider(this);
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Studio - Projects');
        
        this.loadProjects();
        this.scanWorkspace();
    }

    async createProject(): Promise<void> {
        try {
            // Step 1: Choose framework
            const frameworks = this.frameworkManager.getFrameworks();
            const frameworkItems = frameworks.map(f => ({
                label: f.displayName,
                description: f.description,
                detail: f.installed ? '✅ Installed' : '❌ Not installed',
                framework: f
            }));

            const selectedFramework = await vscode.window.showQuickPick(frameworkItems, {
                placeHolder: 'Select an AI framework for your project'
            });

            if (!selectedFramework) {
                return;
            }

            // Check if framework is installed
            if (!selectedFramework.framework.installed) {
                const install = await vscode.window.showWarningMessage(
                    `${selectedFramework.framework.displayName} is not installed. Would you like to install it?`,
                    'Install', 'Cancel'
                );
                
                if (install === 'Install') {
                    await this.frameworkManager.installFramework();
                } else {
                    return;
                }
            }

            // Step 2: Choose template
            const templates = this.templateManager.getTemplatesByFramework(selectedFramework.framework.id);
            
            if (templates.length === 0) {
                vscode.window.showErrorMessage(`No templates available for ${selectedFramework.framework.displayName}`);
                return;
            }

            const templateItems = templates.map(t => ({
                label: t.name,
                description: t.description,
                detail: `Language: ${t.language}`,
                template: t
            }));

            const selectedTemplate = await vscode.window.showQuickPick(templateItems, {
                placeHolder: 'Select a project template'
            });

            if (!selectedTemplate) {
                return;
            }

            // Step 3: Get project details
            const projectName = await vscode.window.showInputBox({
                prompt: 'Enter project name',
                placeHolder: 'my-ai-agent',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Project name is required';
                    }
                    if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
                        return 'Project name can only contain letters, numbers, hyphens, and underscores';
                    }
                    return undefined;
                }
            });

            if (!projectName) {
                return;
            }

            const projectDescription = await vscode.window.showInputBox({
                prompt: 'Enter project description (optional)',
                placeHolder: 'A brief description of your AI agent project'
            });

            // Step 4: Choose location
            const workspaceFolders = vscode.workspace.workspaceFolders;
            let projectPath: string;

            if (workspaceFolders && workspaceFolders.length > 0) {
                const useWorkspace = await vscode.window.showQuickPick(
                    ['Current workspace', 'Choose different location'],
                    { placeHolder: 'Where would you like to create the project?' }
                );

                if (useWorkspace === 'Current workspace') {
                    projectPath = path.join(workspaceFolders[0].uri.fsPath, projectName);
                } else {
                    const selectedFolder = await vscode.window.showOpenDialog({
                        canSelectFolders: true,
                        canSelectFiles: false,
                        canSelectMany: false,
                        openLabel: 'Select Project Location'
                    });

                    if (!selectedFolder) {
                        return;
                    }

                    projectPath = path.join(selectedFolder[0].fsPath, projectName);
                }
            } else {
                const selectedFolder = await vscode.window.showOpenDialog({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                    openLabel: 'Select Project Location'
                });

                if (!selectedFolder) {
                    return;
                }

                projectPath = path.join(selectedFolder[0].fsPath, projectName);
            }

            // Step 5: Create project
            await this.createProjectFromTemplate(
                selectedTemplate.template,
                projectPath,
                projectName,
                projectDescription || '',
                selectedFramework.framework
            );

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create project: ${error}`);
            this.outputChannel.appendLine(`Error creating project: ${error}`);
        }
    }

    private async createProjectFromTemplate(
        template: AgentTemplate,
        projectPath: string,
        projectName: string,
        description: string,
        framework: any
    ): Promise<void> {
        this.outputChannel.show();
        this.outputChannel.appendLine(`🚀 Creating project "${projectName}" using ${template.name}...`);

        try {
            // Create project directory
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(projectPath));
            this.outputChannel.appendLine(`📁 Created project directory: ${projectPath}`);

            // Create all template files
            for (const file of template.files) {
                const filePath = path.join(projectPath, file.path);
                const fileUri = vscode.Uri.file(filePath);
                
                // Create directory if it doesn't exist
                const dirPath = path.dirname(filePath);
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
                
                // Process template variables
                let content = file.content;
                content = content.replace(/\$\{projectName\}/g, projectName);
                content = content.replace(/\$\{description\}/g, description);
                content = content.replace(/\$\{framework\}/g, framework.id);
                
                // Write file content
                await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
                this.outputChannel.appendLine(`📄 Created file: ${file.path}`);
            }

            // Create project configuration
            const projectConfig = {
                name: projectName,
                description: description,
                framework: framework.id,
                template: template.id,
                created: new Date().toISOString(),
                version: '1.0.0',
                agents: [],
                scripts: {
                    build: template.language === 'typescript' ? 'tsc' : undefined,
                    start: template.language === 'python' ? 'python src/main.py' : 'node dist/index.js',
                    test: 'echo "No tests specified"'
                }
            };

            const configPath = path.join(projectPath, '.aiagent', 'project.json');
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(configPath)));
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(configPath),
                Buffer.from(JSON.stringify(projectConfig, null, 2))
            );

            // Create README
            await this.createProjectReadme(projectPath, projectName, description, framework, template);

            // Install dependencies if specified
            if (template.dependencies && template.dependencies.length > 0) {
                await this.installProjectDependencies(projectPath, template, framework);
            }

            // Add to projects list
            const project: AgentProject = {
                id: this.generateProjectId(),
                name: projectName,
                framework: framework.id,
                path: projectPath,
                created: new Date(),
                lastModified: new Date(),
                status: 'active',
                agents: [],
                configuration: projectConfig
            };

            this.projects.push(project);
            this.saveProjects();
            this.treeProvider.refresh();

            this.outputChannel.appendLine(`✅ Project "${projectName}" created successfully!`);

            // Show success message and options
            const action = await vscode.window.showInformationMessage(
                `Project "${projectName}" created successfully!`,
                'Open Project',
                'Open in New Window',
                'View Documentation'
            );

            switch (action) {
                case 'Open Project':
                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath));
                    break;
                case 'Open in New Window':
                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath), true);
                    break;
                case 'View Documentation':
                    await vscode.env.openExternal(vscode.Uri.parse(framework.documentationUrl));
                    break;
            }

        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to create project: ${error}`);
            throw error;
        }
    }

    private async createProjectReadme(
        projectPath: string,
        projectName: string,
        description: string,
        framework: any,
        template: AgentTemplate
    ): Promise<void> {
        const readme = `# ${projectName}

${description}

## Framework
This project uses **${framework.displayName}** for AI agent development.

## Template
Created from template: **${template.name}**

## Getting Started

### Prerequisites
- ${framework.languages.includes('typescript') || framework.languages.includes('javascript') ? 'Node.js 18+' : ''}
- ${framework.languages.includes('python') ? 'Python 3.8+' : ''}

### Installation
\`\`\`bash
# Install dependencies
${template.commands ? template.commands.join('\n') : 'npm install'}
\`\`\`

### Running the Agent
\`\`\`bash
# Start the agent
${template.language === 'python' ? 'python src/main.py' : 'npm start'}
\`\`\`

## Project Structure
\`\`\`
${projectName}/
├── src/           # Source code
├── config/        # Configuration files
├── docs/          # Documentation
└── tests/         # Test files
\`\`\`

## Configuration
Configure your agent by editing the configuration files in the \`config/\` directory.

## Documentation
- [${framework.displayName} Documentation](${framework.documentationUrl})
- [Project Configuration](.aiagent/project.json)

## License
MIT License
`;

        const readmePath = path.join(projectPath, 'README.md');
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(readmePath),
            Buffer.from(readme)
        );
    }

    private async installProjectDependencies(
        projectPath: string,
        template: AgentTemplate,
        framework: any
    ): Promise<void> {
        this.outputChannel.appendLine('📦 Installing project dependencies...');

        try {
            if (template.commands) {
                for (const command of template.commands) {
                    this.outputChannel.appendLine(`⚙️ Running: ${command}`);
                    
                    await new Promise<void>((resolve, reject) => {
                        const { exec } = require('child_process');
                        exec(command, { cwd: projectPath }, (error: any, stdout: any, stderr: any) => {
                            if (error) {
                                this.outputChannel.appendLine(`❌ Command failed: ${error}`);
                                reject(error);
                            } else {
                                this.outputChannel.appendLine(stdout);
                                if (stderr) this.outputChannel.appendLine(stderr);
                                resolve();
                            }
                        });
                    });
                }
            }
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Warning: Dependency installation failed: ${error}`);
            vscode.window.showWarningMessage(
                'Dependency installation failed. You may need to install dependencies manually.',
                'Open Terminal'
            ).then(action => {
                if (action === 'Open Terminal') {
                    const terminal = vscode.window.createTerminal({
                        name: 'Agent Project',
                        cwd: projectPath
                    });
                    terminal.show();
                }
            });
        }
    }

    async deployAgent(): Promise<void> {
        const projects = this.getActiveProjects();
        
        if (projects.length === 0) {
            vscode.window.showWarningMessage('No active projects found. Create a project first.');
            return;
        }

        const projectItems = projects.map(p => ({
            label: p.name,
            description: `Framework: ${p.framework}`,
            detail: `Path: ${p.path}`,
            project: p
        }));

        const selectedProject = await vscode.window.showQuickPick(projectItems, {
            placeHolder: 'Select a project to deploy'
        });

        if (!selectedProject) {
            return;
        }

        const deploymentOptions = [
            'Local Development Server',
            'Docker Container',
            'Cloud Platform (AWS Lambda)',
            'Cloud Platform (Google Cloud Functions)',
            'Cloud Platform (Azure Functions)',
            'Custom Deployment'
        ];

        const selectedDeployment = await vscode.window.showQuickPick(deploymentOptions, {
            placeHolder: 'Select deployment target'
        });

        if (!selectedDeployment) {
            return;
        }

        await this.executeDeployment(selectedProject.project, selectedDeployment);
    }

    private async executeDeployment(project: AgentProject, target: string): Promise<void> {
        this.outputChannel.show();
        this.outputChannel.appendLine(`🚀 Deploying ${project.name} to ${target}...`);

        try {
            switch (target) {
                case 'Local Development Server':
                    await this.deployLocal(project);
                    break;
                case 'Docker Container':
                    await this.deployDocker(project);
                    break;
                case 'Custom Deployment':
                    await this.deployCustom(project);
                    break;
                default:
                    await this.deployCloud(project, target);
                    break;
            }

            this.outputChannel.appendLine(`✅ Deployment completed successfully!`);
            vscode.window.showInformationMessage(`${project.name} deployed successfully to ${target}!`);

        } catch (error) {
            this.outputChannel.appendLine(`❌ Deployment failed: ${error}`);
            vscode.window.showErrorMessage(`Deployment failed: ${error}`);
        }
    }

    private async deployLocal(project: AgentProject): Promise<void> {
        const terminal = vscode.window.createTerminal({
            name: `Deploy: ${project.name}`,
            cwd: project.path
        });

        terminal.show();
        
        if (project.framework === 'python') {
            terminal.sendText('python src/main.py');
        } else {
            terminal.sendText('npm start');
        }

        this.outputChannel.appendLine('🏃 Local server started in terminal');
    }

    private async deployDocker(project: AgentProject): Promise<void> {
        // Create Dockerfile if it doesn't exist
        const dockerfilePath = path.join(project.path, 'Dockerfile');
        
        if (!fs.existsSync(dockerfilePath)) {
            await this.createDockerfile(project);
        }

        const terminal = vscode.window.createTerminal({
            name: `Docker: ${project.name}`,
            cwd: project.path
        });

        terminal.show();
        terminal.sendText(`docker build -t ${project.name.toLowerCase()} .`);
        terminal.sendText(`docker run -p 3000:3000 ${project.name.toLowerCase()}`);

        this.outputChannel.appendLine('🐳 Docker container deployment initiated');
    }

    private async createDockerfile(project: AgentProject): Promise<void> {
        let dockerfile = '';

        if (project.framework.includes('python')) {
            dockerfile = `FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 3000

CMD ["python", "src/main.py"]
`;
        } else {
            dockerfile = `FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
`;
        }

        const dockerfilePath = path.join(project.path, 'Dockerfile');
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(dockerfilePath),
            Buffer.from(dockerfile)
        );

        this.outputChannel.appendLine('🐳 Created Dockerfile');
    }

    private async deployCloud(project: AgentProject, target: string): Promise<void> {
        // For now, provide instructions for cloud deployment
        const instructions = this.getCloudDeploymentInstructions(project, target);
        
        const doc = await vscode.workspace.openTextDocument({
            content: instructions,
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(doc);
        this.outputChannel.appendLine('📄 Cloud deployment instructions opened');
    }

    private async deployCustom(project: AgentProject): Promise<void> {
        const command = await vscode.window.showInputBox({
            prompt: 'Enter custom deployment command',
            placeHolder: 'e.g., ./deploy.sh or npm run deploy'
        });

        if (!command) {
            return;
        }

        const terminal = vscode.window.createTerminal({
            name: `Custom Deploy: ${project.name}`,
            cwd: project.path
        });

        terminal.show();
        terminal.sendText(command);

        this.outputChannel.appendLine(`⚙️ Executing custom deployment: ${command}`);
    }

    private getCloudDeploymentInstructions(project: AgentProject, target: string): string {
        return `# Cloud Deployment Instructions for ${project.name}

## Target: ${target}

### Prerequisites
- Cloud platform account and CLI tools installed
- Project dependencies installed
- Configuration files updated with production settings

### Deployment Steps
1. Build your project for production
2. Configure environment variables
3. Deploy using platform-specific tools
4. Monitor deployment status

### Platform-Specific Commands
${this.getPlatformCommands(target)}

### Environment Variables
Make sure to set these environment variables in your cloud platform:
- API keys for AI services
- Database connection strings
- Other configuration values

### Monitoring
After deployment, monitor your agent's performance and logs through the cloud platform dashboard.
`;
    }

    private getPlatformCommands(target: string): string {
        switch (target) {
            case 'Cloud Platform (AWS Lambda)':
                return `\`\`\`bash
# Install AWS CLI and configure
aws configure

# Deploy using Serverless Framework
npm install -g serverless
serverless deploy
\`\`\``;
            case 'Cloud Platform (Google Cloud Functions)':
                return `\`\`\`bash
# Install Google Cloud SDK
gcloud init

# Deploy function
gcloud functions deploy my-agent --runtime nodejs18 --trigger-http
\`\`\``;
            case 'Cloud Platform (Azure Functions)':
                return `\`\`\`bash
# Install Azure CLI
az login

# Deploy function
func azure functionapp publish my-agent-app
\`\`\``;
            default:
                return '# Platform-specific commands will be provided based on your selection';
        }
    }

    // Utility methods
    private generateProjectId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private loadProjects(): void {
        try {
            const projectsData = this.context.globalState.get<AgentProject[]>('aiAgentStudio.projects', []);
            this.projects = projectsData;
        } catch (error) {
            console.error('Error loading projects:', error);
            this.projects = [];
        }
    }

    private saveProjects(): void {
        try {
            this.context.globalState.update('aiAgentStudio.projects', this.projects);
        } catch (error) {
            console.error('Error saving projects:', error);
        }
    }

    private async scanWorkspace(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        for (const folder of workspaceFolders) {
            await this.scanFolderForProjects(folder.uri.fsPath);
        }
    }

    private async scanFolderForProjects(folderPath: string): Promise<void> {
        try {
            const configPath = path.join(folderPath, '.aiagent', 'project.json');
            
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf8');
                const config = JSON.parse(configContent);
                
                // Check if project already exists
                const existingProject = this.projects.find(p => p.path === folderPath);
                
                if (!existingProject) {
                    const project: AgentProject = {
                        id: this.generateProjectId(),
                        name: config.name,
                        framework: config.framework,
                        path: folderPath,
                        created: new Date(config.created),
                        lastModified: new Date(),
                        status: 'active',
                        agents: config.agents || [],
                        configuration: config
                    };
                    
                    this.projects.push(project);
                    this.saveProjects();
                }
            }
        } catch (error) {
            console.error('Error scanning folder for projects:', error);
        }
    }

    getProjects(): AgentProject[] {
        return this.projects;
    }

    getActiveProjects(): AgentProject[] {
        return this.projects.filter(p => p.status === 'active');
    }

    getTreeDataProvider(): AgentProjectTreeProvider {
        return this.treeProvider;
    }
}

export class AgentProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectTreeItem | undefined | null | void> = new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private projectManager: AgentProjectManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProjectTreeItem): Thenable<ProjectTreeItem[]> {
        if (!element) {
            // Root level - show projects
            const projects = this.projectManager.getProjects();
            return Promise.resolve(projects.map(project => new ProjectTreeItem(
                project.name,
                vscode.TreeItemCollapsibleState.Collapsed,
                'project',
                project
            )));
        } else if (element.type === 'project') {
            // Project level - show agents and configuration
            const items: ProjectTreeItem[] = [
                new ProjectTreeItem('Agents', vscode.TreeItemCollapsibleState.Collapsed, 'agents', element.project),
                new ProjectTreeItem('Configuration', vscode.TreeItemCollapsibleState.None, 'config', element.project),
                new ProjectTreeItem('Logs', vscode.TreeItemCollapsibleState.None, 'logs', element.project)
            ];
            return Promise.resolve(items);
        } else if (element.type === 'agents') {
            // Agents level - show individual agents
            const agents = element.project?.agents || [];
            return Promise.resolve(agents.map(agent => new ProjectTreeItem(
                agent.name,
                vscode.TreeItemCollapsibleState.None,
                'agent',
                element.project,
                agent
            )));
        }

        return Promise.resolve([]);
    }
}

class ProjectTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'project' | 'agents' | 'agent' | 'config' | 'logs',
        public readonly project?: AgentProject,
        public readonly agent?: AgentInfo
    ) {
        super(label, collapsibleState);

        this.tooltip = this.getTooltip();
        this.description = this.getDescription();
        this.iconPath = this.getIcon();
        this.contextValue = type;

        if (type === 'config' && project) {
            this.command = {
                command: 'vscode.open',
                title: 'Open Configuration',
                arguments: [vscode.Uri.file(path.join(project.path, '.aiagent', 'project.json'))]
            };
        }
    }

    private getTooltip(): string {
        switch (this.type) {
            case 'project':
                return `${this.project?.framework} project at ${this.project?.path}`;
            case 'agent':
                return `Agent: ${this.agent?.name} (${this.agent?.status})`;
            case 'config':
                return 'Project configuration';
            case 'logs':
                return 'Project logs';
            default:
                return this.label;
        }
    }

    private getDescription(): string {
        switch (this.type) {
            case 'project':
                return this.project?.framework || '';
            case 'agent':
                return this.agent?.status || '';
            default:
                return '';
        }
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.type) {
            case 'project':
                return new vscode.ThemeIcon('folder');
            case 'agents':
                return new vscode.ThemeIcon('organization');
            case 'agent':
                return new vscode.ThemeIcon('robot');
            case 'config':
                return new vscode.ThemeIcon('settings');
            case 'logs':
                return new vscode.ThemeIcon('output');
            default:
                return new vscode.ThemeIcon('file');
        }
    }
}