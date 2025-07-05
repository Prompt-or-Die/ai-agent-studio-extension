"""
AutoGen Example: Software Development Team

This example demonstrates an AutoGen group chat with specialized agents
working together on software development tasks like planning, coding, 
reviewing, and testing.
"""

import autogen
import os
from typing import Dict, List

class SoftwareDevelopmentTeam:
    def __init__(self, api_key: str = None):
        # Configuration for OpenAI
        self.config_list = [
            {
                "model": "gpt-4o",
                "api_key": api_key or os.getenv("OPENAI_API_KEY")
            }
        ]
        
        # Create agents
        self.agents = self._create_agents()
        
        # Create group chat
        self.group_chat = self._create_group_chat()
        
        # Create manager
        self.manager = self._create_manager()

    def _create_agents(self) -> Dict[str, autogen.ConversableAgent]:
        """Create all the specialized agents"""
        
        # User proxy agent (represents the human stakeholder)
        user_proxy = autogen.UserProxyAgent(
            name="ProductOwner",
            system_message="""You are a Product Owner who provides requirements and accepts final deliverables. 
                             You can provide feedback and make decisions about the software being developed.""",
            code_execution_config={"last_n_messages": 2, "work_dir": "development_workspace"},
            human_input_mode="TERMINATE",  # Allow human input at termination
            max_consecutive_auto_reply=10,
            is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
        )

        # Software architect agent
        architect = autogen.AssistantAgent(
            name="SoftwareArchitect", 
            system_message="""You are a Senior Software Architect with 15+ years of experience.
                             Your role is to:
                             - Analyze requirements and create technical specifications
                             - Design system architecture and data flow
                             - Define technology stack and design patterns
                             - Ensure scalability, security, and maintainability
                             - Break down complex features into implementable components
                             
                             Always provide clear, technical specifications that developers can follow.""",
            llm_config={"config_list": self.config_list, "temperature": 0.3},
            max_consecutive_auto_reply=8,
        )

        # Senior developer agent
        developer = autogen.AssistantAgent(
            name="SeniorDeveloper",
            system_message="""You are a Senior Full-Stack Developer with expertise in multiple programming languages.
                             Your role is to:
                             - Write clean, efficient, and well-documented code
                             - Implement features according to technical specifications
                             - Follow best practices and coding standards
                             - Consider performance, security, and maintainability
                             - Suggest technical improvements and optimizations
                             
                             Always write production-quality code with proper error handling and comments.""",
            llm_config={"config_list": self.config_list, "temperature": 0.2},
            max_consecutive_auto_reply=8,
        )

        # QA engineer agent
        qa_engineer = autogen.AssistantAgent(
            name="QAEngineer",
            system_message="""You are a Senior QA Engineer specializing in test automation and quality assurance.
                             Your role is to:
                             - Review code for potential bugs and issues
                             - Create comprehensive test plans and test cases
                             - Write automated tests (unit, integration, end-to-end)
                             - Identify edge cases and potential failure scenarios
                             - Ensure code quality and adherence to requirements
                             
                             Focus on thorough testing and quality validation.""",
            llm_config={"config_list": self.config_list, "temperature": 0.4},
            max_consecutive_auto_reply=6,
        )

        # DevOps engineer agent
        devops_engineer = autogen.AssistantAgent(
            name="DevOpsEngineer",
            system_message="""You are a DevOps Engineer with expertise in CI/CD, infrastructure, and deployment.
                             Your role is to:
                             - Design deployment strategies and CI/CD pipelines
                             - Configure infrastructure and monitoring
                             - Ensure security and compliance requirements
                             - Optimize for scalability and performance
                             - Provide deployment and operational guidance
                             
                             Focus on automated, reliable, and secure deployment processes.""",
            llm_config={"config_list": self.config_list, "temperature": 0.3},
            max_consecutive_auto_reply=6,
        )

        # Technical writer agent
        tech_writer = autogen.AssistantAgent(
            name="TechnicalWriter",
            system_message="""You are a Technical Writer specializing in software documentation.
                             Your role is to:
                             - Create clear, comprehensive documentation
                             - Write API documentation and user guides
                             - Document architecture decisions and technical specifications
                             - Ensure documentation is accessible to different audiences
                             - Maintain consistency in documentation style and format
                             
                             Focus on creating documentation that helps users and developers.""",
            llm_config={"config_list": self.config_list, "temperature": 0.5},
            max_consecutive_auto_reply=5,
        )

        return {
            'product_owner': user_proxy,
            'architect': architect,
            'developer': developer,
            'qa_engineer': qa_engineer,
            'devops_engineer': devops_engineer,
            'tech_writer': tech_writer
        }

    def _create_group_chat(self) -> autogen.GroupChat:
        """Create the group chat with all agents"""
        return autogen.GroupChat(
            agents=list(self.agents.values()),
            messages=[],
            max_round=25,
            speaker_selection_method="round_robin",
            allow_repeat_speaker=True
        )

    def _create_manager(self) -> autogen.GroupChatManager:
        """Create the group chat manager"""
        return autogen.GroupChatManager(
            groupchat=self.group_chat,
            llm_config={"config_list": self.config_list, "temperature": 0.4},
            system_message="""You are a Project Manager facilitating a software development team discussion.
                             Your role is to:
                             - Keep the conversation focused and productive
                             - Ensure all necessary team members contribute
                             - Help resolve conflicts and make decisions
                             - Track progress toward the project goals
                             - Summarize decisions and next steps
                             
                             Guide the team through the software development process efficiently."""
        )

    def start_development_project(self, project_description: str) -> None:
        """Start a new software development project"""
        
        initial_message = f"""
🚀 NEW SOFTWARE DEVELOPMENT PROJECT

Project Description:
{project_description}

Team, let's work together to deliver this project! Here's our process:

1. **Requirements Analysis** (Product Owner + Architect)
   - Clarify requirements and constraints
   - Define technical specifications

2. **Architecture Design** (Architect)
   - Design system architecture
   - Define technology stack and patterns

3. **Implementation Planning** (Developer + Architect)
   - Break down features into tasks
   - Estimate effort and timeline

4. **Development** (Developer)
   - Implement core functionality
   - Write clean, documented code

5. **Quality Assurance** (QA Engineer)
   - Review code and create tests
   - Validate functionality

6. **Deployment Planning** (DevOps Engineer)
   - Design CI/CD pipeline
   - Plan infrastructure needs

7. **Documentation** (Technical Writer)
   - Create user and developer documentation

Let's start with requirements analysis. Product Owner, please provide any additional details or constraints.

When ready to conclude, type "TERMINATE" to end the discussion.
        """
        
        print("🤝 Starting software development team collaboration...")
        print(f"Project: {project_description}")
        print("="*60)
        
        # Start the conversation
        result = self.agents['product_owner'].initiate_chat(
            self.manager,
            message=initial_message
        )
        
        return result

    def quick_code_review(self, code: str, language: str = "python") -> None:
        """Perform a quick code review session"""
        
        review_message = f"""
🔍 CODE REVIEW SESSION

Please review the following {language} code:

```{language}
{code}
```

Team, let's conduct a thorough code review:

**Developer**: Please explain the code structure and key decisions
**QA Engineer**: Identify potential issues, edge cases, and testing needs  
**Architect**: Assess if it follows best practices and patterns
**DevOps Engineer**: Consider deployment and operational aspects

Provide constructive feedback and suggestions for improvement.

Type "TERMINATE" when the review is complete.
        """
        
        print("🔍 Starting code review session...")
        print("="*50)
        
        result = self.agents['product_owner'].initiate_chat(
            self.manager,
            message=review_message
        )
        
        return result

    def architecture_discussion(self, feature_description: str) -> None:
        """Facilitate an architecture discussion for a new feature"""
        
        arch_message = f"""
🏗️ ARCHITECTURE DESIGN SESSION

Feature Description:
{feature_description}

Team, let's design the architecture for this feature:

**Architect**: Lead the design discussion
- Propose system architecture and data flow
- Define integration points and APIs
- Consider scalability and performance

**Developer**: Provide implementation perspective
- Assess technical feasibility
- Suggest alternative approaches
- Estimate complexity

**QA Engineer**: Consider testability
- Identify testing challenges
- Suggest test strategies

**DevOps Engineer**: Consider operational aspects
- Deployment strategies
- Monitoring and observability
- Security considerations

Let's create a solid architectural foundation for this feature.

Type "TERMINATE" when the design is finalized.
        """
        
        print("🏗️ Starting architecture design session...")
        print(f"Feature: {feature_description}")
        print("="*60)
        
        result = self.agents['product_owner'].initiate_chat(
            self.manager,
            message=arch_message
        )
        
        return result

    def get_team_summary(self) -> Dict[str, str]:
        """Get a summary of each team member's role"""
        return {
            name: agent.system_message.split('\n')[0] 
            for name, agent in self.agents.items()
        }

# Example usage
if __name__ == "__main__":
    # Make sure to set your OpenAI API key
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("❌ Please set your OPENAI_API_KEY environment variable")
        exit(1)
    
    # Initialize the development team
    dev_team = SoftwareDevelopmentTeam(api_key)
    
    print("👥 Software Development Team Initialized!")
    print("\nTeam Members:")
    for name, role in dev_team.get_team_summary().items():
        print(f"  • {name}: {role}")
    
    print("\n" + "="*60)
    
    # Example project
    project_description = """
    Build a REST API for a task management system with the following features:
    - User authentication and authorization
    - CRUD operations for tasks and projects
    - Real-time notifications
    - Data export functionality
    - Mobile-friendly responsive design
    
    Requirements:
    - Support 1000+ concurrent users
    - 99.9% uptime SLA
    - GDPR compliance
    - Integration with third-party calendar systems
    """
    
    try:
        # Start a development project
        print("🚀 Starting development project...")
        dev_team.start_development_project(project_description)
        
    except KeyboardInterrupt:
        print("\n👋 Development session interrupted by user")
    except Exception as e:
        print(f"❌ Error during development session: {e}")
