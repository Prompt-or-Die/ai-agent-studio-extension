import * as vscode from 'vscode';

export interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: number;
    metadata?: any;
}

export interface PerformanceEvent {
    name: string;
    timestamp: number;
    metadata?: any;
}

export interface CommandMetric {
    command: string;
    executionTime: number;
    timestamp: number;
    success: boolean;
    error?: string;
}

export class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric[]> = new Map();
    private events: PerformanceEvent[] = [];
    private commandMetrics: CommandMetric[] = new Map();
    private isTracking: boolean = false;
    private memoryUsageInterval?: NodeJS.Timeout;
    private cpuUsageInterval?: NodeJS.Timeout;
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private readonly MAX_STORED_METRICS = 1000;
    private readonly MAX_STORED_EVENTS = 500;

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('AI Agent Studio - Performance');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
        this.statusBarItem.command = 'ai-agent-studio.showPerformanceMetrics';
        this.statusBarItem.tooltip = 'View AI Agent Studio Performance Metrics';
        
        // Load historical data
        this.loadStoredMetrics();
        
        context.subscriptions.push(this.outputChannel);
        context.subscriptions.push(this.statusBarItem);
    }

    startTracking(): void {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.trackEvent('monitor.started');
        
        // Start memory monitoring
        this.memoryUsageInterval = setInterval(() => {
            this.trackMemoryUsage();
        }, 30000); // Every 30 seconds
        
        // Start CPU monitoring
        this.cpuUsageInterval = setInterval(() => {
            this.trackCPUUsage();
        }, 60000); // Every minute
        
        this.updateStatusBar();
        this.outputChannel.appendLine('🔍 Performance monitoring started');
    }

    stopTracking(): void {
        if (!this.isTracking) return;
        
        this.isTracking = false;
        this.trackEvent('monitor.stopped');
        
        if (this.memoryUsageInterval) {
            clearInterval(this.memoryUsageInterval);
            this.memoryUsageInterval = undefined;
        }
        
        if (this.cpuUsageInterval) {
            clearInterval(this.cpuUsageInterval);
            this.cpuUsageInterval = undefined;
        }
        
        this.saveMetrics();
        this.outputChannel.appendLine('🔍 Performance monitoring stopped');
    }

    trackMetric(name: string, value: number, metadata?: any): void {
        if (!this.isTracking) return;
        
        const metric: PerformanceMetric = {
            name,
            value,
            timestamp: Date.now(),
            metadata
        };

        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const metricList = this.metrics.get(name)!;
        metricList.push(metric);
        
        // Keep only recent metrics
        if (metricList.length > this.MAX_STORED_METRICS) {
            metricList.shift();
        }

        this.updateStatusBar();
    }

    trackEvent(name: string, metadata?: any): void {
        if (!this.isTracking) return;
        
        const event: PerformanceEvent = {
            name,
            timestamp: Date.now(),
            metadata
        };

        this.events.push(event);
        
        // Keep only recent events
        if (this.events.length > this.MAX_STORED_EVENTS) {
            this.events.shift();
        }

        // Log significant events
        if (this.isSignificantEvent(name)) {
            this.outputChannel.appendLine(`📊 Event: ${name} ${metadata ? JSON.stringify(metadata) : ''}`);
        }
    }

    async trackCommand<T>(command: string, fn: () => Promise<T>): Promise<T> {
        const startTime = Date.now();
        let success = false;
        let error: string | undefined;

        try {
            const result = await fn();
            success = true;
            return result;
        } catch (err) {
            success = false;
            error = err instanceof Error ? err.message : String(err);
            throw err;
        } finally {
            const executionTime = Date.now() - startTime;
            
            const metric: CommandMetric = {
                command,
                executionTime,
                timestamp: startTime,
                success,
                error
            };

            this.commandMetrics.set(command, metric);
            this.trackMetric(`command.${command}.time`, executionTime);
            this.trackEvent(`command.${command}.executed`, { success, error });
            
            // Log slow commands
            if (executionTime > 5000) {
                this.outputChannel.appendLine(`⚠️ Slow command: ${command} took ${executionTime}ms`);
            }
        }
    }

    private trackMemoryUsage(): void {
        const memoryUsage = process.memoryUsage();
        this.trackMetric('memory.heapUsed', memoryUsage.heapUsed / 1024 / 1024); // MB
        this.trackMetric('memory.heapTotal', memoryUsage.heapTotal / 1024 / 1024); // MB
        this.trackMetric('memory.rss', memoryUsage.rss / 1024 / 1024); // MB
        this.trackMetric('memory.external', memoryUsage.external / 1024 / 1024); // MB
    }

    private trackCPUUsage(): void {
        const cpuUsage = process.cpuUsage();
        this.trackMetric('cpu.user', cpuUsage.user / 1000); // milliseconds
        this.trackMetric('cpu.system', cpuUsage.system / 1000); // milliseconds
    }

    private isSignificantEvent(name: string): boolean {
        const significantEvents = [
            'monitor.started',
            'monitor.stopped',
            'command.createProject.executed',
            'command.installFramework.executed',
            'config.changed',
            'framework.changed'
        ];
        
        return significantEvents.includes(name);
    }

    private updateStatusBar(): void {
        if (!this.isTracking) {
            this.statusBarItem.hide();
            return;
        }

        const memoryMetrics = this.metrics.get('memory.heapUsed') || [];
        const latestMemory = memoryMetrics.length > 0 ? memoryMetrics[memoryMetrics.length - 1] : null;
        
        if (latestMemory) {
            this.statusBarItem.text = `🤖 ${latestMemory.value.toFixed(1)}MB`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.text = '🤖 Monitoring';
            this.statusBarItem.show();
        }
    }

    async showMetrics(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'performanceMetrics',
            '📊 Performance Metrics',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.generateMetricsHTML();
        
        // Handle refresh requests
        panel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'refresh') {
                    panel.webview.html = this.generateMetricsHTML();
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private generateMetricsHTML(): string {
        const metricsData = this.generateMetricsData();
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Performance Metrics</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        line-height: 1.6;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 30px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .metrics-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .metric-card {
                        background: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 8px;
                        padding: 20px;
                    }
                    .metric-card h3 {
                        margin: 0 0 15px 0;
                        color: var(--vscode-textLink-foreground);
                    }
                    .metric-value {
                        font-size: 2em;
                        font-weight: bold;
                        color: var(--vscode-textLink-foreground);
                        margin: 10px 0;
                    }
                    .metric-label {
                        font-size: 0.9em;
                        opacity: 0.8;
                    }
                    .metric-change {
                        font-size: 0.8em;
                        margin-top: 5px;
                    }
                    .metric-positive {
                        color: var(--vscode-testing-iconPassed);
                    }
                    .metric-negative {
                        color: var(--vscode-testing-iconFailed);
                    }
                    .section {
                        margin: 30px 0;
                    }
                    .section h2 {
                        margin-bottom: 15px;
                        color: var(--vscode-textLink-foreground);
                    }
                    .table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    .table th, .table td {
                        padding: 8px 12px;
                        text-align: left;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .table th {
                        background-color: var(--vscode-input-background);
                        font-weight: bold;
                    }
                    .btn {
                        padding: 8px 16px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    .btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .chart-container {
                        height: 200px;
                        background: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 Performance Metrics</h1>
                    <div>
                        <button class="btn" onclick="refresh()">🔄 Refresh</button>
                        <button class="btn" onclick="exportMetrics()">📥 Export</button>
                    </div>
                </div>

                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>💾 Memory Usage</h3>
                        <div class="metric-value">${metricsData.memory.current.toFixed(1)}MB</div>
                        <div class="metric-label">Current Heap Usage</div>
                        <div class="metric-change ${metricsData.memory.trend > 0 ? 'metric-negative' : 'metric-positive'}">
                            ${metricsData.memory.trend > 0 ? '↑' : '↓'} ${Math.abs(metricsData.memory.trend).toFixed(1)}MB
                        </div>
                    </div>

                    <div class="metric-card">
                        <h3>⚡ Avg Command Time</h3>
                        <div class="metric-value">${metricsData.commands.avgTime.toFixed(0)}ms</div>
                        <div class="metric-label">Average Execution Time</div>
                        <div class="metric-change">
                            ${metricsData.commands.totalExecuted} commands executed
                        </div>
                    </div>

                    <div class="metric-card">
                        <h3>📈 Events</h3>
                        <div class="metric-value">${metricsData.events.total}</div>
                        <div class="metric-label">Total Events Tracked</div>
                        <div class="metric-change">
                            ${metricsData.events.recent} in last hour
                        </div>
                    </div>

                    <div class="metric-card">
                        <h3>✅ Success Rate</h3>
                        <div class="metric-value">${metricsData.commands.successRate.toFixed(1)}%</div>
                        <div class="metric-label">Command Success Rate</div>
                        <div class="metric-change ${metricsData.commands.successRate < 95 ? 'metric-negative' : 'metric-positive'}">
                            ${metricsData.commands.failed} failures
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>📊 Memory Usage Chart</h2>
                    <div class="chart-container">
                        Memory usage chart would be displayed here
                        <br>
                        <small>Consider integrating Chart.js for visualization</small>
                    </div>
                </div>

                <div class="section">
                    <h2>⚡ Recent Commands</h2>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Command</th>
                                <th>Time</th>
                                <th>Duration</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${metricsData.recentCommands.map(cmd => `
                                <tr>
                                    <td>${cmd.command}</td>
                                    <td>${new Date(cmd.timestamp).toLocaleTimeString()}</td>
                                    <td>${cmd.executionTime}ms</td>
                                    <td>${cmd.success ? '✅' : '❌'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h2>📋 Recent Events</h2>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Event</th>
                                <th>Time</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${metricsData.recentEvents.map(event => `
                                <tr>
                                    <td>${event.name}</td>
                                    <td>${new Date(event.timestamp).toLocaleTimeString()}</td>
                                    <td>${event.metadata ? JSON.stringify(event.metadata) : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <script>
                    function refresh() {
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({ command: 'refresh' });
                    }

                    function exportMetrics() {
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({ command: 'export' });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private generateMetricsData(): any {
        const memoryMetrics = this.metrics.get('memory.heapUsed') || [];
        const commandMetrics = Array.from(this.commandMetrics.values());
        const recentEvents = this.events.slice(-10);
        const recentCommands = commandMetrics.slice(-10);
        
        // Calculate memory trend
        const memoryTrend = memoryMetrics.length > 1 ? 
            memoryMetrics[memoryMetrics.length - 1].value - memoryMetrics[memoryMetrics.length - 2].value : 0;
        
        // Calculate command statistics
        const totalCommands = commandMetrics.length;
        const successfulCommands = commandMetrics.filter(c => c.success).length;
        const avgCommandTime = totalCommands > 0 ? 
            commandMetrics.reduce((sum, c) => sum + c.executionTime, 0) / totalCommands : 0;
        
        // Calculate recent events
        const oneHourAgo = Date.now() - 3600000;
        const recentEventCount = this.events.filter(e => e.timestamp > oneHourAgo).length;

        return {
            memory: {
                current: memoryMetrics.length > 0 ? memoryMetrics[memoryMetrics.length - 1].value : 0,
                trend: memoryTrend
            },
            commands: {
                totalExecuted: totalCommands,
                avgTime: avgCommandTime,
                successRate: totalCommands > 0 ? (successfulCommands / totalCommands) * 100 : 100,
                failed: totalCommands - successfulCommands
            },
            events: {
                total: this.events.length,
                recent: recentEventCount
            },
            recentCommands,
            recentEvents
        };
    }

    private loadStoredMetrics(): void {
        try {
            const storedMetrics = this.context.globalState.get('performanceMetrics');
            if (storedMetrics) {
                // Load stored metrics if needed
                this.outputChannel.appendLine('📊 Loaded stored performance metrics');
            }
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Error loading stored metrics: ${error}`);
        }
    }

    private saveMetrics(): void {
        try {
            const metricsToStore = {
                timestamp: Date.now(),
                totalEvents: this.events.length,
                totalCommands: this.commandMetrics.size,
                summary: this.generateMetricsData()
            };
            
            this.context.globalState.update('performanceMetrics', metricsToStore);
            this.outputChannel.appendLine('💾 Performance metrics saved');
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Error saving metrics: ${error}`);
        }
    }

    getMetrics(): Map<string, PerformanceMetric[]> {
        return new Map(this.metrics);
    }

    getEvents(): PerformanceEvent[] {
        return [...this.events];
    }

    getCommandMetrics(): Map<string, CommandMetric> {
        return new Map(this.commandMetrics);
    }

    dispose(): void {
        this.stopTracking();
        this.saveMetrics();
        this.statusBarItem.dispose();
        this.outputChannel.dispose();
    }
}