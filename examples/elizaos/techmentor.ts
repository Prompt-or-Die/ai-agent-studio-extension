import { startAgent, AgentRuntime } from '@elizaos/core';
import { DiscordClientInterface } from '@elizaos/client-discord';
import { TwitterClientInterface } from '@elizaos/client-twitter';
import character from './techmentor.character.json';

// Custom action for code analysis
const analyzeCodeAction = {
    name: 'ANALYZE_CODE',
    description: 'Analyze code snippets and provide feedback',
    validate: async (runtime: AgentRuntime, message: any) => {
        const codeRegex = /```[\s\S]*?```/g;
        return codeRegex.test(message.content.text);
    },
    handler: async (runtime: AgentRuntime, message: any) => {
        const codeBlocks = message.content.text.match(/```[\s\S]*?```/g);
        if (codeBlocks) {
            const analysis = await analyzeCodeBlocks(codeBlocks);
            return {
                text: `I've analyzed your code! Here's my feedback:\n\n${analysis}`,
                action: 'ANALYZE_CODE'
            };
        }
        return null;
    }
};

// Custom action for framework recommendations
const recommendFrameworkAction = {
    name: 'RECOMMEND_FRAMEWORK',
    description: 'Recommend AI frameworks based on user requirements',
    validate: async (runtime: AgentRuntime, message: any) => {
        const keywords = ['framework', 'recommend', 'choose', 'best', 'comparison'];
        return keywords.some(keyword => 
            message.content.text.toLowerCase().includes(keyword)
        );
    },
    handler: async (runtime: AgentRuntime, message: any) => {
        const recommendation = await generateFrameworkRecommendation(message.content.text);
        return {
            text: recommendation,
            action: 'RECOMMEND_FRAMEWORK'
        };
    }
};

// Custom evaluator for technical accuracy
const technicalAccuracyEvaluator = {
    name: 'TECHNICAL_ACCURACY',
    description: 'Evaluate technical accuracy of responses',
    validate: async (runtime: AgentRuntime, message: any) => {
        const technicalTerms = ['agent', 'llm', 'api', 'framework', 'model'];
        return technicalTerms.some(term => 
            message.content.text.toLowerCase().includes(term)
        );
    },
    handler: async (runtime: AgentRuntime, message: any, response: any) => {
        // Check for technical accuracy
        const accuracy = await validateTechnicalContent(response.text);
        return {
            score: accuracy.score,
            feedback: accuracy.feedback,
            evaluator: 'TECHNICAL_ACCURACY'
        };
    }
};

// Helper function to analyze code blocks
async function analyzeCodeBlocks(codeBlocks: string[]): Promise<string> {
    const analyses = codeBlocks.map((block, index) => {
        const code = block.replace(/```[\w]*\n?/, '').replace(/```$/, '');
        
        // Simple analysis logic
        const issues = [];
        const suggestions = [];
        
        if (code.includes('console.log')) {
            suggestions.push('Consider using proper logging instead of console.log');
        }
        
        if (code.includes('any')) {
            suggestions.push('Try to use specific types instead of "any" for better type safety');
        }
        
        if (!code.includes('async') && code.includes('await')) {
            issues.push('Using await without async function declaration');
        }
        
        let analysis = `**Code Block ${index + 1}:**\n`;
        
        if (issues.length > 0) {
            analysis += `🚨 **Issues Found:**\n${issues.map(i => `- ${i}`).join('\n')}\n\n`;
        }
        
        if (suggestions.length > 0) {
            analysis += `💡 **Suggestions:**\n${suggestions.map(s => `- ${s}`).join('\n')}\n\n`;
        }
        
        if (issues.length === 0 && suggestions.length === 0) {
            analysis += `✅ **Code looks good!** No obvious issues found.\n\n`;
        }
        
        return analysis;
    });
    
    return analyses.join('\n');
}

// Helper function to recommend frameworks
async function generateFrameworkRecommendation(query: string): Promise<string> {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('beginner') || lowerQuery.includes('start')) {
        return `For beginners, I recommend starting with:
        
🌟 **OpenAI Agents SDK** - Great for getting started with modern agent development
🌟 **CrewAI** - Intuitive role-based multi-agent systems
        
Both have excellent documentation and active communities!`;
    }
    
    if (lowerQuery.includes('complex') || lowerQuery.includes('workflow')) {
        return `For complex workflows, consider:
        
🎯 **LangGraph** - Perfect for state-machine workflows with conditional logic
🎯 **AutoGen** - Excellent for conversation-based multi-agent systems
        
These frameworks give you fine-grained control over agent behavior.`;
    }
    
    if (lowerQuery.includes('web3') || lowerQuery.includes('blockchain')) {
        return `For Web3 and blockchain integration:
        
⛓️ **ElizaOS** - Built specifically for Web3-friendly agents
⛓️ **Custom implementation** with Web3 libraries
        
ElizaOS has native support for blockchain interactions!`;
    }
    
    return `Here's my framework recommendation matrix:
    
📊 **Quick Reference:**
- **Beginners**: OpenAI Agents SDK, CrewAI
- **Complex Workflows**: LangGraph, AutoGen
- **Web3 Integration**: ElizaOS
- **Lightweight**: SmolAgents
- **Enterprise**: Semantic Kernel
    
What specific use case are you working on? I can provide more targeted advice!`;
}

// Helper function to validate technical content
async function validateTechnicalContent(text: string): Promise<{score: number, feedback: string}> {
    // Simple validation logic
    let score = 0.8; // Base score
    const feedback = [];
    
    // Check for accurate framework names
    const frameworks = ['OpenAI Agents SDK', 'LangGraph', 'CrewAI', 'ElizaOS', 'AutoGen'];
    const mentionedFrameworks = frameworks.filter(f => text.includes(f));
    
    if (mentionedFrameworks.length > 0) {
        score += 0.1;
        feedback.push(`Correctly mentioned: ${mentionedFrameworks.join(', ')}`);
    }
    
    // Check for helpful code examples
    if (text.includes('```')) {
        score += 0.05;
        feedback.push('Provided code examples');
    }
    
    return {
        score: Math.min(score, 1.0),
        feedback: feedback.join('; ')
    };
}

// Main function to start the agent
async function main() {
    console.log('🚀 Starting TechMentor AI Agent...');
    
    // Enhanced character configuration
    const enhancedCharacter = {
        ...character,
        actions: [analyzeCodeAction, recommendFrameworkAction],
        evaluators: [technicalAccuracyEvaluator]
    };
    
    try {
        // Initialize the agent runtime
        const runtime = await startAgent({
            character: enhancedCharacter,
            clients: [
                new DiscordClientInterface(),
                new TwitterClientInterface()
            ],
            plugins: [
                '@elizaos/plugin-web3',
                '@elizaos/plugin-solana'
            ]
        });
        
        console.log('✅ TechMentor is now running!');
        console.log('🔗 Connected to Discord and Twitter');
        console.log('🧠 Custom actions loaded: Code Analysis, Framework Recommendations');
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down TechMentor...');
            await runtime.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Failed to start TechMentor:', error);
        process.exit(1);
    }
}

// Run the agent
if (require.main === module) {
    main().catch(console.error);
}

export { main, analyzeCodeAction, recommendFrameworkAction, technicalAccuracyEvaluator };