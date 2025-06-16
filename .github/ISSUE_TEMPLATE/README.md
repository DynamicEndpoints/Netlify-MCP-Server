# GitHub Issue Templates

This directory contains GitHub issue templates optimized for AI coding assistants and automated workflows.

## Available Templates

### 🐛 Bug Report (`bug_report.yml`)
**For reporting bugs and technical issues**
- Comprehensive environment details collection
- Tool-specific error reporting
- Copilot-friendly error categorization
- Structured reproduction steps
- Authentication and configuration context

### 🚀 Feature Request (`feature_request.yml`)
**For requesting new features or enhancements**
- Technical specifications with code examples
- API integration details
- Use case documentation
- Implementation guidance for AI assistants
- Compatibility considerations

### 🤖 Copilot Task (`copilot_task.yml`)
**Specialized template for AI coding assistants**
- Clear, actionable objectives
- Specific technical requirements
- Detailed acceptance criteria
- Implementation patterns and hints
- Validation and testing guidance

### ❓ Question / Discussion (`question.yml`)
**For general questions and discussions**
- Context-driven question structure
- Environment information collection
- AI/automation context fields
- Pre-search requirements

### 📚 Documentation Improvement (`documentation.yml`)
**For improving documentation quality**
- Specific documentation type targeting
- AI-friendly content structure requests
- Example and code sample requirements
- Target audience consideration

### 📋 Sample Best Practices (`sample_best_practices.yml`)
**Example issue demonstrating optimal structure**
- Reference implementation for high-quality issues
- Demonstrates all best practices
- Shows AI-optimized formatting
- Educational template for contributors

## AI/Copilot Optimization Features

### 🎯 Clear Structure
- **Mandatory Fields**: Ensure essential information is always provided
- **Dropdown Menus**: Standardize categories and reduce ambiguity
- **Structured Input**: Consistent formatting for AI parsing

### 🔧 Technical Precision
- **Code Blocks**: Syntax-highlighted examples with language hints
- **Parameter Schemas**: JSON schema examples for tool parameters
- **Error Context**: Comprehensive error reporting with stack traces
- **Environment Details**: Complete technical environment capture

### 🤖 AI-Friendly Content
- **Validation Requirements**: Testable acceptance criteria
- **Implementation Hints**: Specific guidance for code generation
- **Pattern Examples**: Reusable code patterns and structures
- **Context Links**: References to related code and documentation

### 📊 Categorization
- **Labels**: Automatic labeling for issue triage
- **Priority Levels**: Clear urgency indicators
- **Component Mapping**: Specific system component identification
- **Scope Definition**: Clear boundaries for changes

## Best Practices for AI Assistants

### When Creating Issues

1. **Be Specific**: Use exact tool names, parameter values, and error messages
2. **Provide Context**: Include the broader goal and use case
3. **Include Examples**: Show desired input/output with code samples
4. **Define Success**: Clear, testable acceptance criteria
5. **Set Boundaries**: Explicit scope definition with in/out of scope items

### Writing Technical Requirements

```markdown
**Technical Requirements:**
- Specific function signatures with TypeScript types
- Performance constraints with measurable metrics
- Compatibility requirements with version numbers
- Error handling patterns with specific error types
- Testing requirements with coverage expectations
```

### Implementation Guidance

```markdown
**Implementation Hints:**
- File locations and function names to modify
- Code patterns to follow or avoid
- Dependencies and constraints
- Integration points with existing systems
- Validation and testing approaches
```

## Template Usage Guidelines

### For Human Contributors
1. Choose the most specific template for your need
2. Fill out all required fields completely
3. Provide examples and context where possible
4. Use the sample template as a reference for quality

### For AI Coding Assistants
1. Always use the Copilot Task template for implementation requests
2. Include all technical specifications and constraints
3. Provide clear success criteria and validation steps
4. Reference existing code patterns and conventions

### For Project Maintainers
1. Review templates periodically for improvement opportunities
2. Update technical requirements as the project evolves
3. Add new templates for emerging use cases
4. Monitor issue quality and template effectiveness

## Configuration

The `config.yml` file controls:
- **Blank Issues**: Disabled to encourage template usage
- **Contact Links**: Alternative resources for common questions
- **External Documentation**: Links to Netlify and MCP resources

## Customization

To adapt these templates for other projects:

1. **Update Tool Names**: Replace Netlify-specific tools with your project's tools
2. **Modify Categories**: Adjust component and category dropdowns
3. **Update Technical Stack**: Change environment and dependency requirements
4. **Customize Labels**: Modify automatic labels to match your workflow
5. **Add Project Context**: Include project-specific validation and testing requirements

## Examples of Good Issues

See the **Sample Best Practices** template for a comprehensive example of:
- Clear objective setting
- Technical requirement specification
- Acceptance criteria definition
- Implementation guidance
- AI-optimized structure

This template serves as both documentation and a practical example that can be copied for real issues.

---

**Note**: These templates are designed to work with GitHub's issue form feature and require a repository with issue templates enabled.
