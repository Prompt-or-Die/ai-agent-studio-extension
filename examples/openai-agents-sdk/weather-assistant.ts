import { Agent, Tool } from '@openai/agents-sdk';

// Custom tool for weather information
const weatherTool: Tool = {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
        type: 'object',
        properties: {
            location: {
                type: 'string',
                description: 'City name or location'
            }
        },
        required: ['location']
    },
    async execute(params: { location: string }) {
        // Mock weather API call
        return {
            location: params.location,
            temperature: '22°C',
            condition: 'Sunny',
            humidity: '65%'
        };
    }
};

// Custom tool for calculations
const calculatorTool: Tool = {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    parameters: {
        type: 'object',
        properties: {
            expression: {
                type: 'string',
                description: 'Mathematical expression to evaluate'
            }
        },
        required: ['expression']
    },
    async execute(params: { expression: string }) {
        try {
            // Simple calculator - in production, use a proper math parser
            const result = eval(params.expression);
            return { result, expression: params.expression };
        } catch (error) {
            return { error: 'Invalid expression' };
        }
    }
};

// Main agent class
export class WeatherAssistant extends Agent {
    constructor() {
        super({
            name: 'WeatherAssistant',
            instructions: `You are a helpful weather assistant. You can:
            1. Get current weather information for any location
            2. Perform calculations if needed
            3. Provide weather-related advice and recommendations
            
            Always be friendly and helpful in your responses.`,
            model: 'gpt-4o',
            temperature: 0.7,
            tools: [weatherTool, calculatorTool]
        });
    }

    async processUserMessage(message: string): Promise<string> {
        try {
            const response = await this.complete(message);
            return response;
        } catch (error) {
            console.error('Error processing message:', error);
            return 'I apologize, but I encountered an error processing your request. Please try again.';
        }
    }

    async handleWeatherRequest(location: string): Promise<string> {
        const weatherData = await weatherTool.execute({ location });
        return `Current weather in ${weatherData.location}: ${weatherData.temperature}, ${weatherData.condition}, Humidity: ${weatherData.humidity}`;
    }

    async handleCalculation(expression: string): Promise<string> {
        const result = await calculatorTool.execute({ expression });
        if (result.error) {
            return `I couldn't calculate that: ${result.error}`;
        }
        return `${result.expression} = ${result.result}`;
    }
}

// Example usage
async function main() {
    const agent = new WeatherAssistant();
    
    console.log('Weather Assistant initialized!');
    
    // Test weather functionality
    const weatherResponse = await agent.processUserMessage('What\'s the weather like in London?');
    console.log('Weather Response:', weatherResponse);
    
    // Test calculation functionality
    const calcResponse = await agent.processUserMessage('Can you calculate 25 * 4 + 10?');
    console.log('Calculation Response:', calcResponse);
    
    // Test general conversation
    const generalResponse = await agent.processUserMessage('Should I bring an umbrella today?');
    console.log('General Response:', generalResponse);
}

if (require.main === module) {
    main().catch(console.error);
}