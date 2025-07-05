"""
CrewAI Example: Research and Writing Team

This example demonstrates a multi-agent CrewAI setup with specialized agents
working together to research a topic and create a comprehensive report.
"""

from crewai import Agent, Task, Crew, Process
from crewai.tools import SerperDevTool, FileReadTool, FileWriteTool
import os

class ResearchWritingCrew:
    def __init__(self):
        # Initialize tools
        self.search_tool = SerperDevTool()
        self.file_read_tool = FileReadTool()
        self.file_write_tool = FileWriteTool()
        
        # Create agents
        self.researcher = self._create_researcher()
        self.analyst = self._create_analyst()
        self.writer = self._create_writer()
        self.editor = self._create_editor()
        
        # Create crew
        self.crew = self._create_crew()

    def _create_researcher(self) -> Agent:
        """Create a research specialist agent"""
        return Agent(
            role='Research Specialist',
            goal='Gather comprehensive and accurate information on given topics from reliable sources',
            backstory="""You are an expert researcher with a PhD in Information Science and 10+ years 
                        of experience in academic and industry research. You excel at finding credible sources, 
                        fact-checking information, and identifying key insights from complex data.""",
            verbose=True,
            allow_delegation=False,
            tools=[self.search_tool, self.file_read_tool],
            max_iter=5,
            memory=True
        )

    def _create_analyst(self) -> Agent:
        """Create a data analyst agent"""
        return Agent(
            role='Data Analyst',
            goal='Analyze research data to identify patterns, trends, and actionable insights',
            backstory="""You are a senior data analyst with expertise in statistical analysis, 
                        market research, and trend identification. You can interpret complex datasets 
                        and extract meaningful insights that drive strategic decisions.""",
            verbose=True,
            allow_delegation=False,
            tools=[self.file_read_tool],
            max_iter=4,
            memory=True
        )

    def _create_writer(self) -> Agent:
        """Create a content writer agent"""
        return Agent(
            role='Technical Writer',
            goal='Transform research and analysis into clear, engaging, and well-structured content',
            backstory="""You are an award-winning technical writer with 15+ years of experience 
                        creating compelling content for diverse audiences. You excel at making 
                        complex topics accessible while maintaining accuracy and depth.""",
            verbose=True,
            allow_delegation=False,
            tools=[self.file_read_tool, self.file_write_tool],
            max_iter=4,
            memory=True
        )

    def _create_editor(self) -> Agent:
        """Create an editor agent"""
        return Agent(
            role='Senior Editor',
            goal='Review, refine, and ensure the highest quality of written content',
            backstory="""You are a meticulous senior editor with expertise in style, grammar, 
                        and content structure. You have a keen eye for detail and ensure that 
                        all content meets professional publication standards.""",
            verbose=True,
            allow_delegation=False,
            tools=[self.file_read_tool, self.file_write_tool],
            max_iter=3,
            memory=True
        )

    def _create_crew(self) -> Crew:
        """Create the research and writing crew"""
        return Crew(
            agents=[self.researcher, self.analyst, self.writer, self.editor],
            tasks=[],  # Tasks will be added dynamically
            process=Process.sequential,
            verbose=2,
            memory=True,
            max_rpm=10,  # Rate limiting
            share_crew=False
        )

    def create_research_task(self, topic: str, focus_areas: list = None) -> Task:
        """Create a research task"""
        focus_areas = focus_areas or ["current trends", "key statistics", "expert opinions"]
        focus_str = ", ".join(focus_areas)
        
        return Task(
            description=f"""
            Research the topic: "{topic}"
            
            Focus on these key areas: {focus_str}
            
            Requirements:
            1. Find at least 5 credible sources
            2. Gather current statistics and data points
            3. Identify expert opinions and quotes
            4. Note any conflicting viewpoints
            5. Summarize key findings with source citations
            
            Deliverable: A comprehensive research report with sources and key findings.
            """,
            agent=self.researcher,
            expected_output="""A detailed research report containing:
            - Executive summary of findings
            - Key statistics and data points
            - Expert quotes and opinions
            - List of credible sources
            - Identification of knowledge gaps or conflicting information"""
        )

    def create_analysis_task(self, research_context: str = '') -> Task:
        """Create an analysis task"""
        return Task(
            description=f"""
            Analyze the research findings and identify key insights, patterns, and trends.
            
            Context: {research_context}
            
            Requirements:
            1. Identify the most significant trends and patterns
            2. Highlight surprising or counter-intuitive findings
            3. Draw connections between different data points
            4. Assess the reliability and quality of the data
            5. Provide strategic recommendations based on the analysis
            
            Focus on actionable insights that would be valuable to decision-makers.
            """,
            agent=self.analyst,
            expected_output="""A comprehensive analysis report containing:
            - Key insights and trends identified
            - Data quality assessment
            - Strategic recommendations
            - Risk factors and opportunities
            - Supporting evidence for all conclusions"""
        )

    def create_writing_task(self, content_type: str = 'report', audience: str = 'professional', tone: str = 'informative') -> Task:
        """Create a writing task"""
        return Task(
            description=f"""
            Create a {content_type} based on the research and analysis for a {audience} audience.
            
            Requirements:
            1. Tone: {tone}
            2. Include an executive summary
            3. Structure the content logically with clear headings
            4. Incorporate data and statistics effectively
            5. Include relevant quotes and expert opinions
            6. Ensure all claims are supported by research
            7. Add a conclusion with key takeaways
            
            The content should be engaging, well-structured, and informative.
            """,
            agent=self.writer,
            expected_output=f"""A well-written {content_type} containing:
            - Compelling introduction
            - Executive summary
            - Logical content structure with clear headings
            - Integrated research findings and analysis
            - Data visualizations or charts (described)
            - Expert quotes and citations
            - Strong conclusion with actionable takeaways
            - Professional formatting and style"""
        )

    def create_editing_task(self, quality_standards: list = None) -> Task:
        """Create an editing task"""
        quality_standards = quality_standards or [
            "grammar and spelling",
            "clarity and readability", 
            "logical flow",
            "fact accuracy",
            "professional tone"
        ]
        standards_str = ", ".join(quality_standards)
        
        return Task(
            description=f"""
            Review and edit the written content to ensure the highest quality.
            
            Focus areas: {standards_str}
            
            Requirements:
            1. Check for grammar, spelling, and punctuation errors
            2. Improve clarity and readability
            3. Ensure logical flow and smooth transitions
            4. Verify fact accuracy and proper citations
            5. Maintain consistent tone and style
            6. Suggest improvements for impact and engagement
            7. Format the document professionally
            
            Provide a polished, publication-ready final version.
            """,
            agent=self.editor,
            expected_output="""A polished, final version of the content featuring:
            - Error-free grammar, spelling, and punctuation
            - Clear, readable prose
            - Logical structure and smooth transitions
            - Verified facts and proper citations
            - Consistent professional tone
            - Effective formatting and presentation
            - Enhanced impact and engagement"""
        )

    def execute_research_project(self, 
                                topic: str, 
                                focus_areas: list = None,
                                content_type: str = 'report',
                                audience: str = 'professional',
                                tone: str = 'informative'):
        """Execute a complete research and writing project"""
        
        print(f"🚀 Starting research project on: {topic}")
        
        # Create tasks for this specific project
        research_task = self.create_research_task(topic, focus_areas)
        analysis_task = self.create_analysis_task(f'Research topic: {topic}')
        writing_task = self.create_writing_task(content_type, audience, tone)
        editing_task = self.create_editing_task()
        
        # Set task dependencies
        analysis_task.context = [research_task]
        writing_task.context = [research_task, analysis_task]
        editing_task.context = [writing_task]
        
        # Update crew with new tasks
        self.crew.tasks = [research_task, analysis_task, writing_task, editing_task]
        
        # Execute the workflow
        result = self.crew.kickoff()
        
        print("✅ Research project completed!")
        return result

# Example usage
if __name__ == "__main__":
    # Initialize the crew
    crew = ResearchWritingCrew()
    
    # Example research project
    topic = "The Impact of AI on Remote Work Productivity"
    focus_areas = [
        "productivity metrics",
        "employee satisfaction",
        "cost savings",
        "implementation challenges",
        "future trends"
    ]
    
    try:
        result = crew.execute_research_project(
            topic=topic,
            focus_areas=focus_areas,
            content_type="executive report",
            audience="business leaders",
            tone="professional and analytical"
        )
        
        print(f"\n📊 Final Result:")
        print(f"Project: {topic}")
        print(f"Status: Completed")
        print(f"Output: {result}")
        
    except Exception as e:
        print(f"❌ Error during execution: {e}")
