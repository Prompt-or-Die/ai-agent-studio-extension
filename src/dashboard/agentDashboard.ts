import * as vscode from 'vscode';
import { FrameworkManager } from '../framework/frameworkManager';
import { AgentProjectManager } from '../project/agentProjectManager';
import { AgentMonitor } from '../monitoring/agentMonitor';

export interface DashboardData {
    frameworks: any[];
    projects: any[];
    agents: any[];
    metrics: any;
    recentActivity: any[];
    systemInfo: any;
    lastUpdate: number;
}

export interface DashboardCache {
    data: DashboardData | null;
    timestamp: number;
    isStale: boolean;
}

export class AgentDashboard {
    private panel?: vscode.WebviewPanel;
    private frameworkManager?: FrameworkManager;
    private projectManager?: AgentProjectManager;
    private agentMonitor?: AgentMonitor;
    private cache: DashboardCache = { data: null, timestamp: 0, isStale: true };
    private refreshInterval?: NodeJS.Timeout;
    private isRefreshing: boolean = false;
    private outputChannel: vscode.OutputChannel;
    private readonly CACHE_TTL = 5000; // 5 seconds cache TTL
    private readonly REFRESH_INTERVAL = 10000; // 10 seconds auto-refresh

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Studio - Dashboard');
        context.subscriptions.push(this.outputChannel);
    }

    // Lazy initialization of managers
    private getFrameworkManager(): FrameworkManager {
        if (!this.frameworkManager) {
            this.frameworkManager = new FrameworkManager(this.context);
        }
        return this.frameworkManager;
    }

    private getProjectManager(): AgentProjectManager {
        if (!this.projectManager) {
            this.projectManager = new AgentProjectManager(this.context);
        }
        return this.projectManager;
    }

    private getAgentMonitor(): AgentMonitor {
        if (!this.agentMonitor) {
            this.agentMonitor = new AgentMonitor(this.context);
        }
        return this.agentMonitor;
    }

    async open(): Promise<void> {
        try {
            // Create or show existing panel
            if (this.panel) {
                this.panel.reveal(vscode.ViewColumn.One);
                // Force refresh if cache is stale
                if (this.isCacheStale()) {
                    await this.updateDashboard();
                }
                return;
            }

            this.outputChannel.appendLine('🚀 Opening dashboard...');

            this.panel = vscode.window.createWebviewPanel(
                'agentDashboard',
                '🤖 AI Agent Studio Dashboard',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [this.context.extensionUri]
                }
            );

            // Handle panel disposal
            this.panel.onDidDispose(() => {
                this.cleanupDashboard();
            });

            // Handle messages from webview
            this.panel.webview.onDidReceiveMessage(
                message => this.handleWebviewMessage(message),
                undefined,
                this.context.subscriptions
            );

            // Show loading state first
            this.panel.webview.html = this.getLoadingHTML();

            // Load and display dashboard with performance tracking
            const startTime = Date.now();
            await this.updateDashboard();
            const loadTime = Date.now() - startTime;
            this.outputChannel.appendLine(`✅ Dashboard loaded in ${loadTime}ms`);

            // Set up optimized auto-refresh
            this.setupAutoRefresh();

        } catch (error) {
            this.outputChannel.appendLine(`❌ Error opening dashboard: ${error}`);
            vscode.window.showErrorMessage(`Failed to open dashboard: ${error}`);
        }
    }

    private cleanupDashboard(): void {
        this.panel = undefined;
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = undefined;
        }
        this.outputChannel.appendLine('🧹 Dashboard cleanup completed');
    }

    private setupAutoRefresh(): void {
        // Clear existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Set up intelligent refresh based on user activity
        this.refreshInterval = setInterval(async () => {
            if (this.panel && this.panel.visible && !this.isRefreshing) {
                await this.updateDashboard();
            }
        }, this.REFRESH_INTERVAL);
    }

    private getLoadingHTML(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Loading Dashboard</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        flex-direction: column;
                    }
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid var(--vscode-panel-border);
                        border-top: 4px solid var(--vscode-textLink-foreground);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .loading-text {
                        font-size: 16px;
                        opacity: 0.8;
                    }
                </style>
            </head>
            <body>
                <div class="spinner"></div>
                <div class="loading-text">Loading AI Agent Studio Dashboard...</div>
            </body>
            </html>
        `;
    }

    async visualizeFlow(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'agentFlowVisualizer',
            '🔄 Agent Flow Visualizer',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = await this.getFlowVisualizerContent();
    }

    private async updateDashboard(): Promise<void> {
        if (!this.panel || this.isRefreshing) return;

        try {
            this.isRefreshing = true;

            // Check cache first
            if (!this.isCacheStale() && this.cache.data) {
                this.panel.webview.html = this.getWebviewContent(this.cache.data);
                return;
            }

            // Show updating indicator for slow updates
            const startTime = Date.now();
            
            const data = await this.collectDashboardData();
            
            // Update cache
            this.cache = {
                data,
                timestamp: Date.now(),
                isStale: false
            };

            const collectTime = Date.now() - startTime;
            if (collectTime > 1000) {
                this.outputChannel.appendLine(`⚠️ Slow dashboard update: ${collectTime}ms`);
            }

            this.panel.webview.html = this.getWebviewContent(data);
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error updating dashboard: ${error}`);
            this.panel.webview.html = this.getErrorHTML(error);
        } finally {
            this.isRefreshing = false;
        }
    }

    private isCacheStale(): boolean {
        return this.cache.isStale || 
               !this.cache.data || 
               (Date.now() - this.cache.timestamp) > this.CACHE_TTL;
    }

    private invalidateCache(): void {
        this.cache.isStale = true;
    }

    private async collectDashboardData(): Promise<DashboardData> {
        // Collect data in parallel for better performance
        const [frameworks, projects, agents] = await Promise.all([
            this.safeGetFrameworks(),
            this.safeGetProjects(),
            this.safeGetAgents()
        ]);

        // Calculate metrics
        const metrics = {
            totalFrameworks: frameworks.length,
            installedFrameworks: frameworks.filter(f => f.installed).length,
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'active').length,
            runningAgents: agents.filter(a => a.status === 'running').length,
            totalAgents: agents.length,
            averageResponseTime: this.calculateAverageResponseTime(agents),
            successRate: this.calculateOverallSuccessRate(agents),
            memoryUsage: this.calculateTotalMemoryUsage(agents)
        };

        // Get recent activity
        const recentActivity = this.getRecentActivity(projects, agents);

        // System info
        const systemInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            architecture: process.arch,
            uptime: process.uptime(),
            workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'No workspace'
        };

        return {
            frameworks,
            projects,
            agents,
            metrics,
            recentActivity,
            systemInfo,
            lastUpdate: Date.now()
        };
    }

    // Safe data collection methods with error handling
    private async safeGetFrameworks(): Promise<any[]> {
        try {
            return this.getFrameworkManager().getFrameworks();
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Error getting frameworks: ${error}`);
            return [];
        }
    }

    private async safeGetProjects(): Promise<any[]> {
        try {
            return this.getProjectManager().getProjects();
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Error getting projects: ${error}`);
            return [];
        }
    }

    private async safeGetAgents(): Promise<any[]> {
        try {
            return this.getAgentMonitor().getRunningAgents();
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Error getting agents: ${error}`);
            return [];
        }
    }

    private getErrorHTML(error: any): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dashboard Error</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        padding: 40px;
                        text-align: center;
                    }
                    .error-container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 30px;
                        border: 1px solid var(--vscode-inputValidation-errorBorder);
                        border-radius: 8px;
                        background: var(--vscode-inputValidation-errorBackground);
                    }
                    .error-icon {
                        font-size: 48px;
                        margin-bottom: 20px;
                    }
                    .error-title {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 15px;
                        color: var(--vscode-errorForeground);
                    }
                    .error-message {
                        margin-bottom: 20px;
                        opacity: 0.8;
                    }
                    .retry-button {
                        padding: 10px 20px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    .retry-button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <div class="error-icon">❌</div>
                    <div class="error-title">Dashboard Error</div>
                    <div class="error-message">
                        Failed to load dashboard data: ${error}
                    </div>
                    <button class="retry-button" onclick="retryLoad()">🔄 Retry</button>
                </div>
                <script>
                    function retryLoad() {
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({ command: 'refresh' });
                    }
                </script>
            </body>
            </html>
        `;
    }
    private calculateAverageResponseTime(agents: any[]): number {
        if (agents.length === 0) return 0;
        const total = agents.reduce((sum, agent) => sum + (agent.metrics?.responseTime || 0), 0);
        return Math.round(total / agents.length);
    }

    private calculateOverallSuccessRate(agents: any[]): number {
        if (agents.length === 0) return 100;
        const total = agents.reduce((sum, agent) => sum + (agent.metrics?.successRate || 100), 0);
        return Math.round(total / agents.length * 100) / 100;
    }

    private calculateTotalMemoryUsage(agents: any[]): number {
        return agents.reduce((sum, agent) => sum + (agent.metrics?.memoryUsage || 0), 0);
    }

    private getRecentActivity(projects: any[], agents: any[]): any[] {
        const activities = [];

        // Recent project activities
        projects.slice(-5).forEach(project => {
            activities.push({
                type: 'project',
                action: 'created',
                item: project.name,
                timestamp: project.created,
                icon: '📁'
            });
        });

        // Recent agent activities
        agents.slice(-5).forEach(agent => {
            activities.push({
                type: 'agent',
                action: agent.status === 'running' ? 'started' : 'stopped',
                item: agent.name,
                timestamp: agent.startTime,
                icon: '🤖'
            });
        });

        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);
    }

    private async handleWebviewMessage(message: any): Promise<void> {
        try {
            this.outputChannel.appendLine(`📨 Handling message: ${message.command}`);
            
            switch (message.command) {
                case 'refresh':
                    this.invalidateCache();
                    await this.updateDashboard();
                    break;
                    
                case 'createProject':
                    await this.getProjectManager().createProject();
                    this.invalidateCache(); // Invalidate cache after project creation
                    break;
                    
                case 'installFramework':
                    await this.getFrameworkManager().configureFramework();
                    this.invalidateCache(); // Invalidate cache after framework changes
                    break;
                    
                case 'startMonitoring':
                    await this.getAgentMonitor().startMonitoring();
                    this.invalidateCache(); // Invalidate cache after monitoring changes
                    break;
                    
                case 'testAgent':
                    await this.getAgentMonitor().testAgent();
                    break;
                    
                case 'openProject':
                    if (message.projectPath) {
                        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(message.projectPath));
                    }
                    break;
                    
                case 'viewLogs':
                    if (message.agentId) {
                        await this.showAgentLogs(message.agentId);
                    }
                    break;
                    
                case 'showMetrics':
                    await vscode.commands.executeCommand('ai-agent-studio.showPerformanceMetrics');
                    break;
                    
                case 'exportDashboard':
                    await this.exportDashboardData();
                    break;
                    
                default:
                    this.outputChannel.appendLine(`⚠️ Unknown message command: ${message.command}`);
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error handling message: ${error}`);
            vscode.window.showErrorMessage(`Dashboard action failed: ${error}`);
        }
    }

    private async exportDashboardData(): Promise<void> {
        try {
            const data = this.cache.data || await this.collectDashboardData();
            const exportData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                dashboardData: data,
                metadata: {
                    extensionVersion: vscode.extensions.getExtension('ai-agent-studio.ai-agent-studio')?.packageJSON.version,
                    vscodeVersion: vscode.version
                }
            };

            const saveOptions: vscode.SaveDialogOptions = {
                defaultUri: vscode.Uri.file('dashboard-export.json'),
                filters: {
                    'JSON Files': ['json']
                }
            };

            const uri = await vscode.window.showSaveDialog(saveOptions);
            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportData, null, 2)));
                vscode.window.showInformationMessage(`Dashboard data exported to ${uri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export dashboard data: ${error}`);
        }
    }

    private async showAgentLogs(agentId: string): Promise<void> {
        const agents = this.agentMonitor.getRunningAgents();
        const agent = agents.find(a => a.id === agentId);
        
        if (!agent) {
            vscode.window.showErrorMessage('Agent not found');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'agentLogs',
            `📄 Logs: ${agent.name}`,
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this.generateLogsHTML(agent);
    }
    private getWebviewContent(data: DashboardData): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Agent Studio Dashboard</title>
            <style>
                ${this.getDashboardStyles()}
            </style>
        </head>
        <body>
            <div class="dashboard-container">
                <header class="dashboard-header">
                    <h1>🤖 AI Agent Studio Dashboard</h1>
                    <div class="header-actions">
                        <button onclick="refresh()" class="btn btn-primary">🔄 Refresh</button>
                        <button onclick="createProject()" class="btn btn-success">➕ New Project</button>
                    </div>
                </header>

                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-icon">📦</div>
                        <div class="metric-content">
                            <h3>${data.metrics.installedFrameworks}/${data.metrics.totalFrameworks}</h3>
                            <p>Frameworks Installed</p>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">📁</div>
                        <div class="metric-content">
                            <h3>${data.metrics.activeProjects}</h3>
                            <p>Active Projects</p>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">🤖</div>
                        <div class="metric-content">
                            <h3>${data.metrics.runningAgents}</h3>
                            <p>Running Agents</p>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">⚡</div>
                        <div class="metric-content">
                            <h3>${data.metrics.averageResponseTime}ms</h3>
                            <p>Avg Response Time</p>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">✅</div>
                        <div class="metric-content">
                            <h3>${data.metrics.successRate}%</h3>
                            <p>Success Rate</p>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">💾</div>
                        <div class="metric-content">
                            <h3>${data.metrics.memoryUsage.toFixed(1)}MB</h3>
                            <p>Memory Usage</p>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="dashboard-section">
                        <h2>🚀 Quick Actions</h2>
                        <div class="quick-actions">
                            <button onclick="createProject()" class="action-btn">
                                <span class="action-icon">➕</span>
                                <span class="action-text">Create Project</span>
                            </button>
                            <button onclick="installFramework()" class="action-btn">
                                <span class="action-icon">📦</span>
                                <span class="action-text">Install Framework</span>
                            </button>
                            <button onclick="startMonitoring()" class="action-btn">
                                <span class="action-icon">👁️</span>
                                <span class="action-text">Start Monitoring</span>
                            </button>
                            <button onclick="testAgent()" class="action-btn">
                                <span class="action-icon">🧪</span>
                                <span class="action-text">Test Agent</span>
                            </button>
                        </div>
                    </div>

                    <div class="dashboard-section">
                        <h2>📁 Recent Projects</h2>
                        <div class="project-list">
                            ${data.projects.slice(0, 5).map(project => `
                                <div class="project-item" onclick="openProject('${project.path}')">
                                    <div class="project-info">
                                        <h4>${project.name}</h4>
                                        <p>Framework: ${project.framework}</p>
                                        <small>Created: ${new Date(project.created).toLocaleDateString()}</small>
                                    </div>
                                    <div class="project-status status-${project.status}">
                                        ${project.status}
                                    </div>
                                </div>
                            `).join('')}
                            ${data.projects.length === 0 ? '<p class="empty-state">No projects yet. Create your first project!</p>' : ''}
                        </div>
                    </div>

                    <div class="dashboard-section">
                        <h2>🤖 Running Agents</h2>
                        <div class="agent-list">
                            ${data.agents.filter(a => a.status === 'running').map(agent => `
                                <div class="agent-item">
                                    <div class="agent-info">
                                        <h4>${agent.name}</h4>
                                        <p>Framework: ${agent.framework}</p>
                                        <small>Started: ${new Date(agent.startTime).toLocaleString()}</small>
                                    </div>
                                    <div class="agent-metrics">
                                        <span class="metric-badge">⚡ ${agent.metrics.responseTime}ms</span>
                                        <span class="metric-badge">✅ ${agent.metrics.successRate.toFixed(1)}%</span>
                                        <button onclick="viewLogs('${agent.id}')" class="btn-small">📄 Logs</button>
                                    </div>
                                </div>
                            `).join('')}
                            ${data.agents.filter(a => a.status === 'running').length === 0 ? '<p class="empty-state">No agents currently running</p>' : ''}
                        </div>
                    </div>

                    <div class="dashboard-section">
                        <h2>📊 Framework Status</h2>
                        <div class="framework-list">
                            ${data.frameworks.map(framework => `
                                <div class="framework-item">
                                    <div class="framework-info">
                                        <h4>${framework.displayName}</h4>
                                        <p>${framework.description}</p>
                                    </div>
                                    <div class="framework-status">
                                        ${framework.installed ? 
                                            `<span class="status-badge status-installed">✅ v${framework.version || 'unknown'}</span>` :
                                            '<span class="status-badge status-not-installed">❌ Not installed</span>'
                                        }
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="dashboard-section">
                        <h2>📈 Recent Activity</h2>
                        <div class="activity-list">
                            ${data.recentActivity.map(activity => `
                                <div class="activity-item">
                                    <span class="activity-icon">${activity.icon}</span>
                                    <div class="activity-content">
                                        <p><strong>${activity.item}</strong> ${activity.action}</p>
                                        <small>${new Date(activity.timestamp).toLocaleString()}</small>
                                    </div>
                                </div>
                            `).join('')}
                            ${data.recentActivity.length === 0 ? '<p class="empty-state">No recent activity</p>' : ''}
                        </div>
                    </div>

                    <div class="dashboard-section">
                        <h2>🖥️ System Information</h2>
                        <div class="system-info">
                            <div class="info-row">
                                <span class="info-label">Node.js:</span>
                                <span class="info-value">${data.systemInfo.nodeVersion}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Platform:</span>
                                <span class="info-value">${data.systemInfo.platform} (${data.systemInfo.architecture})</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Uptime:</span>
                                <span class="info-value">${Math.floor(data.systemInfo.uptime / 3600)}h ${Math.floor((data.systemInfo.uptime % 3600) / 60)}m</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Workspace:</span>
                                <span class="info-value">${data.systemInfo.workspace}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                ${this.getDashboardScripts()}
            </script>
        </body>
        </html>`;
    }
    private getDashboardStyles(): string {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                line-height: 1.6;
            }

            .dashboard-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }

            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }

            .dashboard-header h1 {
                color: var(--vscode-textLink-foreground);
                font-size: 2.5em;
                margin: 0;
            }

            .header-actions {
                display: flex;
                gap: 10px;
            }

            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s ease;
            }

            .btn-primary {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }

            .btn-primary:hover {
                background-color: var(--vscode-button-hoverBackground);
            }

            .btn-success {
                background-color: var(--vscode-testing-iconPassed);
                color: white;
            }

            .btn-small {
                padding: 4px 8px;
                font-size: 12px;
            }

            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .metric-card {
                background-color: var(--vscode-sideBar-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 15px;
                transition: transform 0.2s ease;
            }

            .metric-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .metric-icon {
                font-size: 2.5em;
                opacity: 0.8;
            }

            .metric-content h3 {
                font-size: 1.8em;
                margin-bottom: 5px;
                color: var(--vscode-textLink-foreground);
            }

            .metric-content p {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
            }

            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
            }

            .dashboard-section {
                background-color: var(--vscode-sideBar-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 20px;
            }

            .dashboard-section h2 {
                margin-bottom: 15px;
                color: var(--vscode-textLink-foreground);
                font-size: 1.3em;
            }

            .quick-actions {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }

            .action-btn {
                background-color: var(--vscode-list-hoverBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                padding: 15px;
                cursor: pointer;
                text-align: center;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }

            .action-btn:hover {
                background-color: var(--vscode-list-activeSelectionBackground);
                transform: translateY(-1px);
            }

            .action-icon {
                font-size: 1.5em;
            }

            .action-text {
                font-size: 0.9em;
                font-weight: 500;
            }

            .project-list, .agent-list, .framework-list, .activity-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .project-item, .agent-item, .framework-item {
                background-color: var(--vscode-list-hoverBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .project-item:hover, .agent-item:hover {
                background-color: var(--vscode-list-activeSelectionBackground);
            }

            .project-info h4, .agent-info h4, .framework-info h4 {
                margin-bottom: 5px;
                color: var(--vscode-textLink-foreground);
            }

            .project-info p, .agent-info p, .framework-info p {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
                margin-bottom: 3px;
            }

            .project-info small, .agent-info small {
                color: var(--vscode-descriptionForeground);
                font-size: 0.8em;
            }

            .project-status, .framework-status {
                display: flex;
                align-items: center;
            }

            .status-badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.8em;
                font-weight: 500;
            }

            .status-installed {
                background-color: var(--vscode-testing-iconPassed);
                color: white;
            }

            .status-not-installed {
                background-color: var(--vscode-testing-iconFailed);
                color: white;
            }

            .status-active {
                background-color: var(--vscode-testing-iconPassed);
                color: white;
            }

            .status-inactive {
                background-color: var(--vscode-descriptionForeground);
                color: white;
            }

            .agent-metrics {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .metric-badge {
                background-color: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 3px 8px;
                border-radius: 10px;
                font-size: 0.8em;
            }

            .activity-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px;
                background-color: var(--vscode-list-hoverBackground);
                border-radius: 6px;
            }

            .activity-icon {
                font-size: 1.2em;
            }

            .activity-content p {
                margin-bottom: 2px;
            }

            .activity-content small {
                color: var(--vscode-descriptionForeground);
                font-size: 0.8em;
            }

            .system-info {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .info-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--vscode-panel-border);
            }

            .info-row:last-child {
                border-bottom: none;
            }

            .info-label {
                font-weight: 500;
                color: var(--vscode-textLink-foreground);
            }

            .info-value {
                color: var(--vscode-descriptionForeground);
                font-family: monospace;
            }

            .empty-state {
                text-align: center;
                color: var(--vscode-descriptionForeground);
                font-style: italic;
                padding: 20px;
            }

            @media (max-width: 768px) {
                .dashboard-grid {
                    grid-template-columns: 1fr;
                }
                
                .metrics-grid {
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                }
                
                .quick-actions {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
        `;
    }
    private getDashboardScripts(): string {
        return `
            const vscode = acquireVsCodeApi();

            function refresh() {
                vscode.postMessage({ command: 'refresh' });
            }

            function createProject() {
                vscode.postMessage({ command: 'createProject' });
            }

            function installFramework() {
                vscode.postMessage({ command: 'installFramework' });
            }

            function startMonitoring() {
                vscode.postMessage({ command: 'startMonitoring' });
            }

            function testAgent() {
                vscode.postMessage({ command: 'testAgent' });
            }

            function openProject(projectPath) {
                vscode.postMessage({ 
                    command: 'openProject', 
                    projectPath: projectPath 
                });
            }

            function viewLogs(agentId) {
                vscode.postMessage({ 
                    command: 'viewLogs', 
                    agentId: agentId 
                });
            }

            // Auto-refresh dashboard every 30 seconds
            setInterval(refresh, 30000);

            // Add keyboard shortcuts
            document.addEventListener('keydown', function(event) {
                if (event.ctrlKey || event.metaKey) {
                    switch(event.key) {
                        case 'r':
                            event.preventDefault();
                            refresh();
                            break;
                        case 'n':
                            event.preventDefault();
                            createProject();
                            break;
                    }
                }
            });
        `;
    }

    private async getFlowVisualizerContent(): Promise<string> {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Agent Flow Visualizer</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    margin: 0;
                    padding: 20px;
                }

                .flow-container {
                    width: 100%;
                    height: calc(100vh - 40px);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    position: relative;
                    overflow: hidden;
                    background: var(--vscode-sideBar-background);
                }

                .flow-header {
                    background: var(--vscode-titleBar-activeBackground);
                    padding: 15px 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .flow-title {
                    font-size: 1.2em;
                    font-weight: 600;
                    margin: 0;
                }

                .flow-controls {
                    display: flex;
                    gap: 10px;
                }

                .flow-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .flow-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .flow-canvas {
                    width: 100%;
                    height: calc(100% - 60px);
                    position: relative;
                    overflow: auto;
                    background-image: 
                        radial-gradient(circle, var(--vscode-panel-border) 1px, transparent 1px);
                    background-size: 20px 20px;
                }

                .agent-node {
                    position: absolute;
                    background: var(--vscode-editor-background);
                    border: 2px solid var(--vscode-textLink-foreground);
                    border-radius: 12px;
                    padding: 15px 20px;
                    min-width: 120px;
                    text-align: center;
                    cursor: move;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s ease;
                }

                .agent-node:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
                }

                .agent-node.running {
                    border-color: var(--vscode-testing-iconPassed);
                    background: var(--vscode-merge-currentHeaderBackground);
                }

                .agent-node.stopped {
                    border-color: var(--vscode-testing-iconFailed);
                    background: var(--vscode-merge-incomingHeaderBackground);
                }

                .agent-title {
                    font-weight: 600;
                    margin-bottom: 5px;
                }

                .agent-framework {
                    font-size: 0.8em;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 5px;
                }

                .agent-status {
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 0.7em;
                    font-weight: 500;
                }

                .status-running {
                    background: var(--vscode-testing-iconPassed);
                    color: white;
                }

                .status-stopped {
                    background: var(--vscode-testing-iconFailed);
                    color: white;
                }

                .connection-line {
                    position: absolute;
                    background: var(--vscode-textLink-foreground);
                    z-index: 1;
                }

                .flow-legend {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 15px;
                    font-size: 0.9em;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .legend-color {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                }

                .empty-flow {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--vscode-descriptionForeground);
                }

                .empty-flow-icon {
                    font-size: 4em;
                    margin-bottom: 20px;
                    opacity: 0.5;
                }
            </style>
        </head>
        <body>
            <div class="flow-container">
                <div class="flow-header">
                    <h2 class="flow-title">🔄 Agent Flow Visualizer</h2>
                    <div class="flow-controls">
                        <button class="flow-btn" onclick="autoLayout()">🎯 Auto Layout</button>
                        <button class="flow-btn" onclick="zoomIn()">🔍 Zoom In</button>
                        <button class="flow-btn" onclick="zoomOut()">🔍 Zoom Out</button>
                        <button class="flow-btn" onclick="resetView()">🔄 Reset</button>
                    </div>
                </div>
                <div class="flow-canvas" id="flowCanvas">
                    <div class="empty-flow">
                        <div class="empty-flow-icon">🤖</div>
                        <h3>No Active Agent Flows</h3>
                        <p>Start some agents to see their interaction flows here</p>
                        <button class="flow-btn" onclick="refreshFlow()" style="margin-top: 20px;">
                            🔄 Refresh Flow Data
                        </button>
                    </div>
                </div>
                <div class="flow-legend">
                    <h4 style="margin-top: 0;">Legend</h4>
                    <div class="legend-item">
                        <div class="legend-color" style="background: var(--vscode-testing-iconPassed);"></div>
                        <span>Running Agent</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: var(--vscode-testing-iconFailed);"></div>
                        <span>Stopped Agent</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: var(--vscode-textLink-foreground);"></div>
                        <span>Communication Flow</span>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                let zoomLevel = 1;

                function autoLayout() {
                    // Implement auto-layout algorithm for agent nodes
                    console.log('Auto-layout triggered');
                }

                function zoomIn() {
                    zoomLevel = Math.min(zoomLevel * 1.2, 3);
                    updateZoom();
                }

                function zoomOut() {
                    zoomLevel = Math.max(zoomLevel / 1.2, 0.3);
                    updateZoom();
                }

                function resetView() {
                    zoomLevel = 1;
                    updateZoom();
                }

                function updateZoom() {
                    const canvas = document.getElementById('flowCanvas');
                    canvas.style.transform = \`scale(\${zoomLevel})\`;
                    canvas.style.transformOrigin = 'top left';
                }

                function refreshFlow() {
                    vscode.postMessage({ command: 'refreshFlow' });
                }

                // Initialize flow visualization
                document.addEventListener('DOMContentLoaded', function() {
                    refreshFlow();
                });
            </script>
        </body>
        </html>`;
    }

    private generateLogsHTML(agent: any): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Agent Logs - ${agent.name}</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    margin: 0;
                    padding: 20px;
                }

                .logs-header {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }

                .logs-container {
                    background: var(--vscode-terminal-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 15px;
                    max-height: 70vh;
                    overflow-y: auto;
                    font-family: monospace;
                    font-size: 13px;
                    line-height: 1.4;
                }

                .log-entry {
                    margin-bottom: 8px;
                    padding: 5px 0;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }

                .log-timestamp {
                    color: var(--vscode-descriptionForeground);
                    margin-right: 10px;
                }

                .log-level {
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: bold;
                    margin-right: 10px;
                }

                .log-level.info { background: var(--vscode-terminal-ansiBlue); color: white; }
                .log-level.warn { background: var(--vscode-terminal-ansiYellow); color: black; }
                .log-level.error { background: var(--vscode-terminal-ansiRed); color: white; }
                .log-level.debug { background: var(--vscode-descriptionForeground); color: white; }

                .log-message {
                    margin-left: 20px;
                    word-wrap: break-word;
                }

                .controls {
                    margin-bottom: 15px;
                    display: flex;
                    gap: 10px;
                }

                .btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="logs-header">
                <h1>📄 Agent Logs: ${agent.name}</h1>
                <p>Framework: ${agent.framework} | Status: ${agent.status}</p>
            </div>

            <div class="controls">
                <button class="btn" onclick="clearLogs()">🗑️ Clear</button>
                <button class="btn" onclick="downloadLogs()">💾 Download</button>
                <button class="btn" onclick="refreshLogs()">🔄 Refresh</button>
            </div>

            <div class="logs-container" id="logsContainer">
                ${agent.logs.map(log => `
                    <div class="log-entry">
                        <span class="log-timestamp">${log.timestamp.toLocaleString()}</span>
                        <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                        <div class="log-message">${log.message}</div>
                    </div>
                `).join('')}
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function clearLogs() {
                    document.getElementById('logsContainer').innerHTML = '';
                }

                function downloadLogs() {
                    // Implementation for downloading logs
                    vscode.postMessage({ command: 'downloadLogs', agentId: '${agent.id}' });
                }

                function refreshLogs() {
                    vscode.postMessage({ command: 'refreshLogs', agentId: '${agent.id}' });
                }

                // Auto-scroll to bottom
                const container = document.getElementById('logsContainer');
                container.scrollTop = container.scrollHeight;

                // Auto-refresh logs every 5 seconds
                setInterval(refreshLogs, 5000);
            </script>
        </body>
        </html>`;
    }

    dispose(): void {
        this.outputChannel.appendLine('🔄 Disposing dashboard...');
        
        // Clean up panel
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        
        // Clean up intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = undefined;
        }
        
        // Clear cache
        this.cache = { data: null, timestamp: 0, isStale: true };
        
        // Dispose managers if they were created
        if (this.frameworkManager && typeof this.frameworkManager.dispose === 'function') {
            this.frameworkManager.dispose();
        }
        if (this.projectManager && typeof this.projectManager.dispose === 'function') {
            this.projectManager.dispose();
        }
        if (this.agentMonitor && typeof this.agentMonitor.dispose === 'function') {
            this.agentMonitor.dispose();
        }
        
        // Dispose output channel
        this.outputChannel.dispose();
        
        this.outputChannel.appendLine('✅ Dashboard disposed successfully');
    }

    // Public methods for external cache management
    public forceRefresh(): void {
        this.invalidateCache();
        if (this.panel) {
            this.updateDashboard();
        }
    }

    public getCacheStatus(): { isStale: boolean; lastUpdate: number; age: number } {
        return {
            isStale: this.isCacheStale(),
            lastUpdate: this.cache.timestamp,
            age: Date.now() - this.cache.timestamp
        };
    }
}