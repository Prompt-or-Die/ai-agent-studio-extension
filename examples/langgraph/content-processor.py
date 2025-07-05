"""
Simple LangGraph Example: Content Processing Workflow

This example demonstrates a basic LangGraph workflow that processes
user input through multiple stages: validation, processing, and formatting.
"""

from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, List
import operator

class ContentState(TypedDict):
    messages: Annotated[List[str], operator.add]
    current_step: str
    content: str
    processed_content: str
    final_result: str
    error: str

class ContentProcessor:
    def __init__(self):
        self.workflow = self._create_workflow()
        self.app = self.workflow.compile()

    def _create_workflow(self) -> StateGraph:
        workflow = StateGraph(ContentState)
        
        # Add nodes
        workflow.add_node('validate_input', self.validate_input)
        workflow.add_node('process_content', self.process_content)
        workflow.add_node('format_output', self.format_output)
        workflow.add_node('handle_error', self.handle_error)
        
        # Add edges
        workflow.set_entry_point('validate_input')
        workflow.add_conditional_edges(
            'validate_input',
            self.should_process,
            {
                'process': 'process_content',
                'error': 'handle_error'
            }
        )
        workflow.add_edge('process_content', 'format_output')
        workflow.add_edge('format_output', END)
        workflow.add_edge('handle_error', END)
        
        return workflow

    def validate_input(self, state: ContentState) -> ContentState:
        """Validate the input content"""
        content = state.get('content', '')
        
        if not content or len(content.strip()) == 0:
            return {
                'current_step': 'validate_input',
                'error': 'Input content is empty or invalid'
            }
        
        if len(content) > 1000:
            return {
                'current_step': 'validate_input',
                'error': 'Input content is too long (max 1000 characters)'
            }
        
        return {
            'messages': [f'Input validated: {len(content)} characters'],
            'current_step': 'validate_input',
            'content': content.strip(),
            'error': ''
        }

    def process_content(self, state: ContentState) -> ContentState:
        """Process the validated content"""
        content = state.get('content', '')
        
        # Simple processing: clean and enhance the content
        processed = content.strip()
        processed = processed.replace('  ', ' ')  # Remove double spaces
        processed = processed.capitalize()  # Capitalize first letter
        
        # Add some basic enhancements
        if not processed.endswith('.'):
            processed += '.'
        
        return {
            'messages': [f'Content processed: {len(processed)} characters'],
            'current_step': 'process_content',
            'processed_content': processed,
            'error': ''
        }

    def format_output(self, state: ContentState) -> ContentState:
        """Format the final output"""
        processed_content = state.get('processed_content', '')
        
        # Create a formatted result
        result = f"""
📝 Processed Content:
{processed_content}

📊 Statistics:
- Original length: {len(state.get('content', ''))} characters
- Processed length: {len(processed_content)} characters
- Processing steps: {len(state.get('messages', []))}
        """.strip()
        
        return {
            'messages': ['Output formatted successfully'],
            'current_step': 'format_output',
            'final_result': result,
            'error': ''
        }

    def handle_error(self, state: ContentState) -> ContentState:
        """Handle errors in the workflow"""
        error = state.get('error', 'Unknown error occurred')
        
        return {
            'messages': [f'Error handled: {error}'],
            'current_step': 'handle_error',
            'final_result': f'❌ Error: {error}',
            'error': error
        }

    def should_process(self, state: ContentState) -> str:
        """Determine the next step based on validation results"""
        return 'error' if state.get('error') else 'process'

    def run(self, content: str) -> ContentState:
        """Run the content processing workflow"""
        initial_state = {
            'messages': [],
            'current_step': '',
            'content': content,
            'processed_content': '',
            'final_result': '',
            'error': ''
        }
        
        return self.app.invoke(initial_state)

# Example usage
if __name__ == "__main__":
    processor = ContentProcessor()
    
    # Test with valid content
    test_content = "hello world this is a test message"
    result = processor.run(test_content)
    print("✅ Processing Result:")
    print(result['final_result'])
    
    print("\n" + "="*50 + "\n")
    
    # Test with invalid content
    invalid_content = ""
    result = processor.run(invalid_content)
    print("❌ Error Handling Result:")
    print(result['final_result'])
