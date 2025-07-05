import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';

export interface AgentMetrics {
    responseTime: number;
    requestCount: number;
    errorCount: number;
    successRate: number;
    memoryUsage: number;
    cpuUsage: number;
    lastActive: Date;
}

export interface AgentLog {
    timestamp: Date;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    metadata?: any;
    agent?: string;
}

export interface RunningAgent {
    id: string;
    name: string;
    framework: string;
    pid?: number;
    process?: ChildProcess;
    status: 'starting' | 'running' | 'stopped' | 'error';
    startTime: Date;
    metrics: AgentMetrics;
    logs: AgentLog[];
    websocket?: WebSocket;
}

export class AgentMonitor {
    private runningAgents: Map<string, RunningAgent> = new Map();
    private treeProvider: AgentMonitorTreeProvider;
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private diagnosticCollection: vscode.DiagnosticCollection;
    private metricsUpdateInterval?: NodeJS.Timeout;
    private logWatchers: Map<string, fs.FSWatcher> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        this.treeProvider = new AgentMonitorTreeProvider(this);
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Studio - Monitor');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('ai-agent-studio');
        
        this.initializeMonitoring();
        this.updateStatusBar();
    }

    private initializeMonitoring(): void {
        // Start metrics collection
        this.metricsUpdateInterval = setInterval(() => {
            this.updateMetrics();
        }, 5000); // Update every 5 seconds

        // Watch for agent configuration changes
        const configWatcher = vscode.workspace.createFileSystemWatcher('**/*.agent.json');
        configWatcher.onDidChange(uri => this.onAgentConfigChanged(uri));
        configWatcher.onDidCreate(uri => this.onAgentConfigCreated(uri));
        configWatcher.onDidDelete(uri => this.onAgentConfigDeleted(uri));

        this.context.subscriptions.push(configWatcher);
        this.context.subscriptions.push(this.diagnosticCollection);
        this.context.subscriptions.push(this.statusBarItem);
    }

    async startMonitoring(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder open. Open a project to start monitoring.');
            return;
        }

        try {
            this.outputChannel.show();
            this.outputChannel.appendLine('🔍 Starting agent monitoring...');

            // Scan for existing agent processes
            await this.scanForRunningAgents();

            // Start watching log files
            await this.startLogWatching();

            // Enable real-time monitoring
            this.enableRealTimeMonitoring();

            this.outputChannel.appendLine('✅ Agent monitoring started successfully');
            vscode.window.showInformationMessage('Agent monitoring started');

            this.updateStatusBar();
            this.treeProvider.refresh();

        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to start monitoring: ${error}`);
            vscode.window.showErrorMessage(`Failed to start monitoring: ${error}`);
        }
    }

    async testAgent(): Promise<void> {
        const agents = Array.from(this.runningAgents.values());
        
        if (agents.length === 0) {
            vscode.window.showWarningMessage('No running agents found. Start an agent first.');
            return;
        }

        const agentItems = agents.map(agent => ({
            label: agent.name,
            description: `Framework: ${agent.framework}`,
            detail: `Status: ${agent.status}`,
            agent: agent
        }));

        const selectedAgent = await vscode.window.showQuickPick(agentItems, {
            placeHolder: 'Select an agent to test'
        });

        if (!selectedAgent) {
            return;
        }

        const testTypes = [
            'Basic Health Check',
            'Response Time Test',
            'Load Test',
            'Error Handling Test',
            'Custom Test'
        ];

        const selectedTest = await vscode.window.showQuickPick(testTypes, {
            placeHolder: 'Select test type'
        });

        if (!selectedTest) {
            return;
        }

        await this.executeTest(selectedAgent.agent, selectedTest);
    }

    private async executeTest(agent: RunningAgent, testType: string): Promise<void> {
        this.outputChannel.show();
        this.outputChannel.appendLine(`🧪 Running ${testType} for agent: ${agent.name}`);

        try {
            const testResults = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Testing ${agent.name}`,
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Initializing test...' });

                switch (testType) {
                    case 'Basic Health Check':
                        return await this.runHealthCheck(agent, progress);
                    case 'Response Time Test':
                        return await this.runResponseTimeTest(agent, progress);
                    case 'Load Test':
                        return await this.runLoadTest(agent, progress);
                    case 'Error Handling Test':
                        return await this.runErrorHandlingTest(agent, progress);
                    case 'Custom Test':
                        return await this.runCustomTest(agent, progress);
                    default:
                        throw new Error(`Unknown test type: ${testType}`);
                }
            });

            // Display test results
            await this.showTestResults(agent, testType, testResults);

        } catch (error) {
            this.outputChannel.appendLine(`❌ Test failed: ${error}`);
            vscode.window.showErrorMessage(`Test failed: ${error}`);
        }
    }

    private async runHealthCheck(agent: RunningAgent, progress: vscode.Progress<any>): Promise<any> {
        progress.report({ increment: 25, message: 'Checking agent status...' });

        const results = {
            status: agent.status,
            uptime: Date.now() - agent.startTime.getTime(),
            memoryUsage: agent.metrics.memoryUsage,
            responseTime: 0,
            errors: [],
            success: true
        };

        // Test basic connectivity
        progress.report({ increment: 50, message: 'Testing connectivity...' });
        
        if (agent.websocket) {
            try {
                await this.pingAgent(agent);
                results.responseTime = agent.metrics.responseTime;
            } catch (error) {
                results.errors.push(`Connectivity test failed: ${error}`);
                results.success = false;
            }
        }

        // Check process health
        progress.report({ increment: 75, message: 'Checking process health...' });
        
        if (agent.pid) {
            try {
                // Check if process is still running
                process.kill(agent.pid, 0); // Signal 0 just checks if process exists
            } catch (error) {
                results.errors.push(`Process check failed: ${error}`);
                results.success = false;
            }
        }

        progress.report({ increment: 100, message: 'Health check complete' });
        return results;
    }

    private async runResponseTimeTest(agent: RunningAgent, progress: vscode.Progress<any>): Promise<any> {
        const testCount = 10;
        const results = {
            tests: testCount,
            responses: [],
            averageTime: 0,
            minTime: Infinity,
            maxTime: 0,
            successRate: 0
        };

        for (let i = 0; i < testCount; i++) {
            progress.report({ 
                increment: (i / testCount) * 100, 
                message: `Running test ${i + 1}/${testCount}...` 
            });

            try {
                const startTime = Date.now();
                await this.sendTestMessage(agent, `Test message ${i + 1}`);
                const responseTime = Date.now() - startTime;

                results.responses.push({ success: true, time: responseTime });
                results.minTime = Math.min(results.minTime, responseTime);
                results.maxTime = Math.max(results.maxTime, responseTime);

            } catch (error) {
                results.responses.push({ success: false, error: error.toString() });
            }

            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const successfulTests = results.responses.filter(r => r.success);
        results.successRate = (successfulTests.length / testCount) * 100;
        results.averageTime = successfulTests.reduce((sum, r) => sum + (r.time || 0), 0) / successfulTests.length;

        return results;
    }

    private async runLoadTest(agent: RunningAgent, progress: vscode.Progress<any>): Promise<any> {
        const concurrentRequests = 5;
        const requestsPerConcurrent = 4;
        const results = {
            concurrentRequests,
            totalRequests: concurrentRequests * requestsPerConcurrent,
            responses: [],
            averageTime: 0,
            successRate: 0,
            errors: []
        };

        const testPromises = [];
        
        for (let i = 0; i < concurrentRequests; i++) {
            const promise = this.runConcurrentTests(agent, requestsPerConcurrent, i);
            testPromises.push(promise);
        }

        progress.report({ increment: 50, message: 'Running concurrent tests...' });

        try {
            const concurrentResults = await Promise.all(testPromises);
            
            // Flatten results
            for (const result of concurrentResults) {
                results.responses.push(...result);
            }

            const successfulTests = results.responses.filter(r => r.success);
            results.successRate = (successfulTests.length / results.totalRequests) * 100;
            results.averageTime = successfulTests.reduce((sum, r) => sum + (r.time || 0), 0) / successfulTests.length;

        } catch (error) {
            results.errors.push(error.toString());
        }

        progress.report({ increment: 100, message: 'Load test complete' });
        return results;
    }

    private async runConcurrentTests(agent: RunningAgent, count: number, batchId: number): Promise<any[]> {
        const results = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const startTime = Date.now();
                await this.sendTestMessage(agent, `Load test batch ${batchId}, message ${i + 1}`);
                const responseTime = Date.now() - startTime;
                
                results.push({ success: true, time: responseTime });
            } catch (error) {
                results.push({ success: false, error: error.toString() });
            }
        }

        return results;
    }

    private async runErrorHandlingTest(agent: RunningAgent, progress: vscode.Progress<any>): Promise<any> {
        const errorTests = [
            { name: 'Invalid JSON', message: 'invalid json {' },
            { name: 'Empty Message', message: '' },
            { name: 'Very Long Message', message: 'a'.repeat(10000) },
            { name: 'Special Characters', message: '!@#$%^&*()_+{}|:"<>?[]\\;\',./' },
            { name: 'Unicode Characters', message: '🤖🔥💻✨🚀' }
        ];

        const results = {
            tests: errorTests.length,
            responses: [],
            errorHandling: {
                graceful: 0,
                crashed: 0,
                timeout: 0
            }
        };

        for (let i = 0; i < errorTests.length; i++) {
            const test = errorTests[i];
            progress.report({ 
                increment: (i / errorTests.length) * 100, 
                message: `Testing ${test.name}...` 
            });

            try {
                const startTime = Date.now();
                await this.sendTestMessage(agent, test.message, 5000); // 5 second timeout
                const responseTime = Date.now() - startTime;

                results.responses.push({ 
                    test: test.name, 
                    success: true, 
                    time: responseTime,
                    handling: 'graceful'
                });
                results.errorHandling.graceful++;

            } catch (error) {
                const errorType = error.toString().includes('timeout') ? 'timeout' : 'crashed';
                results.responses.push({ 
                    test: test.name, 
                    success: false, 
                    error: error.toString(),
                    handling: errorType
                });
                results.errorHandling[errorType]++;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return results;
    }

    private async runCustomTest(agent: RunningAgent, progress: vscode.Progress<any>): Promise<any> {
        const testMessage = await vscode.window.showInputBox({
            prompt: 'Enter test message for the agent',
            placeHolder: 'Hello, this is a test message'
        });

        if (!testMessage) {
            throw new Error('Test message is required');
        }

        progress.report({ increment: 50, message: 'Sending custom test message...' });

        const startTime = Date.now();
        const response = await this.sendTestMessage(agent, testMessage);
        const responseTime = Date.now() - startTime;

        progress.report({ increment: 100, message: 'Custom test complete' });

        return {
            message: testMessage,
            response: response,
            responseTime: responseTime,
            success: true
        };
    }

    private async sendTestMessage(agent: RunningAgent, message: string, timeout: number = 10000): Promise<any> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Test message timeout'));
            }, timeout);

            if (agent.websocket && agent.websocket.readyState === WebSocket.OPEN) {
                // WebSocket-based communication
                const messageId = Date.now().toString();
                
                const onMessage = (data: any) => {
                    try {
                        const response = JSON.parse(data.toString());
                        if (response.id === messageId) {
                            clearTimeout(timeoutId);
                            agent.websocket!.off('message', onMessage);
                            resolve(response);
                        }
                    } catch (error) {
                        // Ignore parsing errors for other messages
                    }
                };

                agent.websocket.on('message', onMessage);
                agent.websocket.send(JSON.stringify({ id: messageId, message: message }));

            } else {
                // Process-based communication (simulate)
                clearTimeout(timeoutId);
                resolve({ message: 'Simulated response', timestamp: new Date() });
            }
        });
    }

    private async pingAgent(agent: RunningAgent): Promise<void> {
        return this.sendTestMessage(agent, 'ping', 5000);
    }

    private async showTestResults(agent: RunningAgent, testType: string, results: any): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'agentTestResults',
            `Test Results: ${agent.name}`,
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this.generateTestResultsHTML(agent, testType, results);
        
        // Also log to output channel
        this.outputChannel.appendLine(`\n📊 Test Results for ${agent.name} (${testType}):`);
        this.outputChannel.appendLine(JSON.stringify(results, null, 2));
    }

    private generateTestResultsHTML(agent: RunningAgent, testType: string, results: any): string {
        let resultsContent = '';

        switch (testType) {
            case 'Basic Health Check':
                resultsContent = `
                    <div class="result-section">
                        <h3>Health Status</h3>
                        <p><strong>Status:</strong> ${results.status}</p>
                        <p><strong>Uptime:</strong> ${Math.round(results.uptime / 1000)}s</p>
                        <p><strong>Memory Usage:</strong> ${results.memoryUsage}MB</p>
                        <p><strong>Response Time:</strong> ${results.responseTime}ms</p>
                        <p><strong>Overall Health:</strong> ${results.success ? '✅ Healthy' : '❌ Issues Found'}</p>
                        ${results.errors.length > 0 ? `<div class="errors"><h4>Errors:</h4><ul>${results.errors.map(e => `<li>${e}</li>`).join('')}</ul></div>` : ''}
                    </div>
                `;
                break;

            case 'Response Time Test':
                resultsContent = `
                    <div class="result-section">
                        <h3>Response Time Analysis</h3>
                        <p><strong>Tests Run:</strong> ${results.tests}</p>
                        <p><strong>Success Rate:</strong> ${results.successRate.toFixed(1)}%</p>
                        <p><strong>Average Time:</strong> ${results.averageTime.toFixed(2)}ms</p>
                        <p><strong>Min Time:</strong> ${results.minTime}ms</p>
                        <p><strong>Max Time:</strong> ${results.maxTime}ms</p>
                    </div>
                `;
                break;

            case 'Load Test':
                resultsContent = `
                    <div class="result-section">
                        <h3>Load Test Results</h3>
                        <p><strong>Concurrent Requests:</strong> ${results.concurrentRequests}</p>
                        <p><strong>Total Requests:</strong> ${results.totalRequests}</p>
                        <p><strong>Success Rate:</strong> ${results.successRate.toFixed(1)}%</p>
                        <p><strong>Average Response Time:</strong> ${results.averageTime.toFixed(2)}ms</p>
                        ${results.errors.length > 0 ? `<div class="errors"><h4>Errors:</h4><ul>${results.errors.map(e => `<li>${e}</li>`).join('')}</ul></div>` : ''}
                    </div>
                `;
                break;

            default:
                resultsContent = `
                    <div class="result-section">
                        <h3>Test Results</h3>
                        <pre>${JSON.stringify(results, null, 2)}</pre>
                    </div>
                `;
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Agent Test Results</title>
                <style>
                    body { 
                        font-family: var(--vscode-font-family); 
                        padding: 20px; 
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .header { 
                        border-bottom: 1px solid var(--vscode-panel-border); 
                        padding-bottom: 15px; 
                        margin-bottom: 20px; 
                    }
                    .result-section { 
                        margin: 20px 0; 
                        padding: 15px; 
                        border: 1px solid var(--vscode-panel-border); 
                        border-radius: 5px;
                        background-color: var(--vscode-editor-background);
                    }
                    .errors { 
                        background-color: var(--vscode-inputValidation-errorBackground); 
                        padding: 10px; 
                        margin-top: 10px; 
                        border-radius: 3px; 
                    }
                    pre { 
                        background-color: var(--vscode-textBlockQuote-background); 
                        padding: 10px; 
                        border-radius: 3px; 
                        overflow-x: auto;
                    }
                    h3 { color: var(--vscode-textLink-foreground); }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🧪 Test Results</h1>
                    <p><strong>Agent:</strong> ${agent.name}</p>
                    <p><strong>Framework:</strong> ${agent.framework}</p>
                    <p><strong>Test Type:</strong> ${testType}</p>
                    <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                </div>
                ${resultsContent}
            </body>
            </html>
        `;
    }

    // Additional monitoring methods
    private async scanForRunningAgents(): Promise<void> {
        // Implementation would scan for running agent processes
        this.outputChannel.appendLine('🔍 Scanning for running agents...');
        // This would integrate with process detection logic
    }

    private async startLogWatching(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        for (const folder of workspaceFolders) {
            const logsPath = path.join(folder.uri.fsPath, 'logs');
            if (fs.existsSync(logsPath)) {
                this.watchLogDirectory(logsPath);
            }
        }
    }

    private watchLogDirectory(logsPath: string): void {
        try {
            const watcher = fs.watch(logsPath, (eventType, filename) => {
                if (filename && filename.endsWith('.log')) {
                    this.onLogFileChanged(path.join(logsPath, filename));
                }
            });

            this.logWatchers.set(logsPath, watcher);
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to watch log directory ${logsPath}: ${error}`);
        }
    }

    private onLogFileChanged(logFile: string): void {
        // Read and parse new log entries
        try {
            const content = fs.readFileSync(logFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            // Process new log entries
            for (const line of lines.slice(-10)) { // Last 10 lines
                this.processLogLine(line, logFile);
            }
        } catch (error) {
            console.error(`Error reading log file ${logFile}:`, error);
        }
    }

    private processLogLine(line: string, source: string): void {
        try {
            // Try to parse as JSON first
            const logEntry = JSON.parse(line);
            this.addLogEntry({
                timestamp: new Date(logEntry.timestamp || Date.now()),
                level: logEntry.level || 'info',
                message: logEntry.message || line,
                metadata: logEntry.metadata,
                agent: logEntry.agent || path.basename(source, '.log')
            });
        } catch {
            // Fallback to plain text parsing
            this.addLogEntry({
                timestamp: new Date(),
                level: 'info',
                message: line,
                agent: path.basename(source, '.log')
            });
        }
    }

    private addLogEntry(log: AgentLog): void {
        // Add to appropriate agent or create new entry
        for (const [id, agent] of this.runningAgents) {
            if (agent.name === log.agent) {
                agent.logs.push(log);
                
                // Keep only last 1000 logs per agent
                if (agent.logs.length > 1000) {
                    agent.logs = agent.logs.slice(-1000);
                }
                
                // Update metrics based on log level
                if (log.level === 'error') {
                    agent.metrics.errorCount++;
                }
                
                break;
            }
        }

        // Update tree view if needed
        this.treeProvider.refresh();
    }

    private enableRealTimeMonitoring(): void {
        // Enable real-time monitoring features
        this.outputChannel.appendLine('📡 Real-time monitoring enabled');
    }

    private updateMetrics(): void {
        // Update metrics for all running agents
        for (const [id, agent] of this.runningAgents) {
            this.updateAgentMetrics(agent);
        }
        
        this.updateStatusBar();
        this.treeProvider.refresh();
    }

    private updateAgentMetrics(agent: RunningAgent): void {
        // Update various metrics
        agent.metrics.lastActive = new Date();
        
        // Calculate success rate
        const totalRequests = agent.metrics.requestCount + agent.metrics.errorCount;
        if (totalRequests > 0) {
            agent.metrics.successRate = (agent.metrics.requestCount / totalRequests) * 100;
        }

        // Update memory usage (simulated)
        if (agent.pid) {
            try {
                // In a real implementation, you'd get actual process metrics
                agent.metrics.memoryUsage = Math.random() * 100; // Simulated
                agent.metrics.cpuUsage = Math.random() * 50; // Simulated
            } catch (error) {
                // Process might have ended
                agent.status = 'stopped';
            }
        }
    }

    private updateStatusBar(): void {
        const activeAgents = Array.from(this.runningAgents.values()).filter(a => a.status === 'running');
        
        this.statusBarItem.text = `$(robot) ${activeAgents.length} agent(s)`;
        this.statusBarItem.tooltip = `${activeAgents.length} agent(s) running`;
        this.statusBarItem.command = 'ai-agent-studio.openAgentDashboard';
        this.statusBarItem.show();
    }

    private onAgentConfigChanged(uri: vscode.Uri): void {
        this.outputChannel.appendLine(`📝 Agent config changed: ${uri.fsPath}`);
        // Handle configuration changes
    }

    private onAgentConfigCreated(uri: vscode.Uri): void {
        this.outputChannel.appendLine(`➕ Agent config created: ${uri.fsPath}`);
        // Handle new agent creation
    }

    private onAgentConfigDeleted(uri: vscode.Uri): void {
        this.outputChannel.appendLine(`🗑️ Agent config deleted: ${uri.fsPath}`);
        // Handle agent deletion
    }

    // Public methods for external access
    getRunningAgents(): RunningAgent[] {
        return Array.from(this.runningAgents.values());
    }

    getTreeDataProvider(): AgentMonitorTreeProvider {
        return this.treeProvider;
    }

    dispose(): void {
        // Clean up resources
        if (this.metricsUpdateInterval) {
            clearInterval(this.metricsUpdateInterval);
        }

        for (const watcher of this.logWatchers.values()) {
            watcher.close();
        }

        this.runningAgents.clear();
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
        this.diagnosticCollection.dispose();
    }
}

export class AgentMonitorTreeProvider implements vscode.TreeDataProvider<MonitorTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MonitorTreeItem | undefined | null | void> = new vscode.EventEmitter<MonitorTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MonitorTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private monitor: AgentMonitor) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MonitorTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MonitorTreeItem): Thenable<MonitorTreeItem[]> {
        if (!element) {
            // Root level
            const agents = this.monitor.getRunningAgents();
            if (agents.length === 0) {
                return Promise.resolve([new MonitorTreeItem('No agents running', vscode.TreeItemCollapsibleState.None, 'empty')]);
            }
            
            return Promise.resolve(agents.map(agent => 
                new MonitorTreeItem(
                    agent.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'agent',
                    agent
                )
            ));
        } else if (element.type === 'agent') {
            // Agent level
            const items = [
                new MonitorTreeItem('Metrics', vscode.TreeItemCollapsibleState.Collapsed, 'metrics', element.agent),
                new MonitorTreeItem('Logs', vscode.TreeItemCollapsibleState.Collapsed, 'logs', element.agent),
                new MonitorTreeItem('Actions', vscode.TreeItemCollapsibleState.Collapsed, 'actions', element.agent)
            ];
            return Promise.resolve(items);
        } else if (element.type === 'metrics' && element.agent) {
            // Metrics level
            const metrics = element.agent.metrics;
            const items = [
                new MonitorTreeItem(`Response Time: ${metrics.responseTime}ms`, vscode.TreeItemCollapsibleState.None, 'metric'),
                new MonitorTreeItem(`Success Rate: ${metrics.successRate.toFixed(1)}%`, vscode.TreeItemCollapsibleState.None, 'metric'),
                new MonitorTreeItem(`Memory: ${metrics.memoryUsage.toFixed(1)}MB`, vscode.TreeItemCollapsibleState.None, 'metric'),
                new MonitorTreeItem(`CPU: ${metrics.cpuUsage.toFixed(1)}%`, vscode.TreeItemCollapsibleState.None, 'metric')
            ];
            return Promise.resolve(items);
        } else if (element.type === 'logs' && element.agent) {
            // Logs level
            const recentLogs = element.agent.logs.slice(-10); // Show last 10 logs
            const items = recentLogs.map(log => 
                new MonitorTreeItem(
                    `[${log.level}] ${log.message.substring(0, 50)}...`,
                    vscode.TreeItemCollapsibleState.None,
                    'log',
                    undefined,
                    log
                )
            );
            return Promise.resolve(items);
        } else if (element.type === 'actions') {
            // Actions level
            const items = [
                new MonitorTreeItem('Test Agent', vscode.TreeItemCollapsibleState.None, 'action-test'),
                new MonitorTreeItem('View Full Logs', vscode.TreeItemCollapsibleState.None, 'action-logs'),
                new MonitorTreeItem('Restart Agent', vscode.TreeItemCollapsibleState.None, 'action-restart'),
                new MonitorTreeItem('Stop Agent', vscode.TreeItemCollapsibleState.None, 'action-stop')
            ];
            return Promise.resolve(items);
        }

        return Promise.resolve([]);
    }
}

class MonitorTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: string,
        public readonly agent?: RunningAgent,
        public readonly log?: AgentLog
    ) {
        super(label, collapsibleState);

        this.tooltip = this.getTooltip();
        this.description = this.getDescription();
        this.iconPath = this.getIcon();
        this.contextValue = type;

        // Add commands for action items
        if (type.startsWith('action-')) {
            this.command = {
                command: `ai-agent-studio.${type.replace('action-', '')}Agent`,
                title: label,
                arguments: [agent]
            };
        }
    }

    private getTooltip(): string {
        switch (this.type) {
            case 'agent':
                return `Agent: ${this.agent?.name} (${this.agent?.status})`;
            case 'log':
                return `[${this.log?.level}] ${this.log?.message}`;
            case 'metric':
                return this.label;
            default:
                return this.label;
        }
    }

    private getDescription(): string {
        if (this.type === 'agent') {
            return this.agent?.status || '';
        } else if (this.type === 'log') {
            return this.log?.timestamp.toLocaleTimeString() || '';
        }
        return '';
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.type) {
            case 'agent':
                const statusIcon = this.agent?.status === 'running' ? 'circle-filled' : 'circle-outline';
                return new vscode.ThemeIcon(statusIcon);
            case 'metrics':
                return new vscode.ThemeIcon('graph');
            case 'logs':
                return new vscode.ThemeIcon('output');
            case 'actions':
                return new vscode.ThemeIcon('tools');
            case 'log':
                const logIcon = this.log?.level === 'error' ? 'error' : 
                               this.log?.level === 'warn' ? 'warning' : 'info';
                return new vscode.ThemeIcon(logIcon);
            case 'metric':
                return new vscode.ThemeIcon('dashboard');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}