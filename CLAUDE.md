# CLAUDE.md - AI Assistant Guide for ACe_Toolkit

**Last Updated:** January 9, 2026
**Repository:** ACe_Toolkit
**Status:** Early Development

---

## 📋 Table of Contents

1. [Repository Overview](#repository-overview)
2. [Codebase Structure](#codebase-structure)
3. [Development Workflows](#development-workflows)
4. [Key Conventions](#key-conventions)
5. [AI Assistant Guidelines](#ai-assistant-guidelines)
6. [Common Tasks](#common-tasks)
7. [Future Considerations](#future-considerations)

---

## 🎯 Repository Overview

### Project Description

**ACe_Toolkit** is a toolkit repository currently in its early development phase. The project structure and purpose will evolve as development progresses.

### Current State

- **Stage:** Initial setup
- **Primary Files:** README.md
- **Language/Framework:** To be determined
- **Dependencies:** None yet

### Repository Information

- **Owner:** ace26597
- **Git Remote:** Local proxy configuration
- **Primary Branch:** To be determined (currently working on feature branches)

---

## 📁 Codebase Structure

### Current Structure

```
ACe_Toolkit/
├── .git/               # Git version control
├── README.md           # Project readme
└── CLAUDE.md          # This file - AI assistant guide
```

### Planned Structure (Update as project grows)

As the project develops, document the emerging structure here:

```
ACe_Toolkit/
├── src/               # Source code (when added)
├── tests/             # Test files (when added)
├── docs/              # Documentation (when added)
├── config/            # Configuration files (when added)
├── scripts/           # Utility scripts (when added)
├── .gitignore         # Git ignore patterns (when added)
├── README.md          # Project readme
└── CLAUDE.md          # AI assistant guide
```

### File Organization Principles

When the codebase grows, follow these principles:

1. **Separation of Concerns:** Keep source code, tests, and documentation separate
2. **Modular Design:** Organize code into logical modules/packages
3. **Clear Naming:** Use descriptive names for files and directories
4. **Flat When Possible:** Avoid deeply nested directory structures unless necessary

---

## 🔄 Development Workflows

### Git Branching Strategy

#### Branch Naming Convention

All feature branches MUST follow this pattern:
```
claude/<description>-<SESSION_ID>
```

**Examples:**
- `claude/add-claude-documentation-MVWIy`
- `claude/implement-core-features-XYZ12`
- `claude/fix-bug-description-ABC34`

**Important:** The `claude/` prefix and session ID suffix are REQUIRED for successful pushes.

#### Branch Workflow

1. **Create Feature Branch:**
   ```bash
   git checkout -b claude/<description>-<SESSION_ID>
   ```

2. **Develop on Feature Branch:**
   - Make changes
   - Commit regularly with clear messages
   - Test your changes

3. **Push to Remote:**
   ```bash
   git push -u origin claude/<description>-<SESSION_ID>
   ```

4. **Network Retry Strategy:**
   - If push/fetch fails, retry up to 4 times
   - Use exponential backoff: 2s, 4s, 8s, 16s

### Commit Message Conventions

Follow these guidelines for clear commit history:

#### Format
```
<type>: <subject>

<body (optional)>
```

#### Types
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style/formatting (no logic change)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

#### Examples
```
feat: add initial project structure

docs: create comprehensive CLAUDE.md guide

fix: resolve authentication timeout issue
```

#### Best Practices
- Use present tense ("add" not "added")
- Use imperative mood ("move" not "moves")
- Keep subject line under 50 characters
- Explain "why" not "what" in the body
- Reference issues/PRs when relevant

### Pull Request Workflow

When creating pull requests:

1. **Ensure Branch is Updated:**
   ```bash
   git fetch origin
   git pull origin <base-branch>
   ```

2. **Review All Changes:**
   ```bash
   git diff <base-branch>...HEAD
   git log <base-branch>..HEAD
   ```

3. **Create PR with gh CLI:**
   ```bash
   gh pr create --title "Brief description" --body "$(cat <<'EOF'
   ## Summary
   - Key change 1
   - Key change 2

   ## Test Plan
   - [ ] Test item 1
   - [ ] Test item 2
   EOF
   )"
   ```

---

## 🎨 Key Conventions

### Code Style (To be defined)

As the project grows, document:
- Indentation style (spaces vs tabs, size)
- Naming conventions (camelCase, snake_case, etc.)
- File naming conventions
- Comment style
- Documentation requirements

### Testing Conventions (To be defined)

Document:
- Testing framework
- Test file location and naming
- Coverage requirements
- Running tests

### Documentation Standards

1. **Code Comments:**
   - Add comments where logic isn't self-evident
   - Avoid obvious comments
   - Document complex algorithms

2. **File Headers:**
   - Include purpose of file
   - Note any important dependencies
   - Document any non-obvious configurations

3. **README Updates:**
   - Keep README.md current with project state
   - Document setup instructions
   - Include usage examples

---

## 🤖 AI Assistant Guidelines

### Core Principles

1. **Read Before Modifying:**
   - ALWAYS read files before suggesting changes
   - Understand existing code structure
   - Maintain consistency with existing patterns

2. **Minimal Changes:**
   - Only make requested changes
   - Avoid over-engineering
   - Don't add unrequested features
   - Keep solutions simple and focused

3. **Security First:**
   - Watch for OWASP Top 10 vulnerabilities
   - Avoid command injection, XSS, SQL injection
   - Validate inputs at system boundaries
   - Use secure defaults

4. **Task Management:**
   - Use TodoWrite for multi-step tasks
   - Mark tasks in_progress when starting
   - Mark completed immediately when done
   - Keep only ONE task in_progress at a time

### Workflow for AI Assistants

#### For New Features

```
1. Read CLAUDE.md (this file) to understand conventions
2. Create TodoWrite task list
3. Explore relevant existing code
4. Plan implementation
5. Implement incrementally
6. Test changes
7. Commit with clear message
8. Push to feature branch
```

#### For Bug Fixes

```
1. Understand the bug (read related code)
2. Locate the issue
3. Fix with minimal changes
4. Verify fix works
5. Commit and push
```

#### For Documentation

```
1. Read existing documentation
2. Identify gaps or outdated content
3. Update with accurate information
4. Keep formatting consistent
5. Commit and push
```

### What NOT to Do

❌ **Don't:**
- Commit changes without explicit user request
- Skip git hooks (unless explicitly requested)
- Force push to main/master
- Create files unnecessarily
- Add features beyond requirements
- Use emojis unless requested
- Make time estimates ("this will take 2 weeks")
- Add backwards-compatibility hacks for unused code
- Create abstractions for one-time operations
- Add error handling for impossible scenarios

✅ **Do:**
- Ask for clarification when unclear
- Use appropriate tools (Read, Edit, Write, Grep, Glob)
- Commit with descriptive messages
- Follow existing code patterns
- Delete unused code completely
- Trust internal code and framework guarantees
- Keep complexity minimal

### Tool Usage

- **Exploring codebase:** Use Task tool with subagent_type=Explore
- **File operations:** Use Read, Edit, Write (not bash cat/sed/echo)
- **Searching code:** Use Grep (not bash grep/rg)
- **Finding files:** Use Glob (not bash find/ls)
- **Git operations:** Use Bash for git commands
- **Multiple independent tasks:** Run tools in parallel
- **Dependent tasks:** Run tools sequentially

---

## 📝 Common Tasks

### Setting Up Development Environment

```bash
# Clone repository
git clone <repository-url>
cd ACe_Toolkit

# Create feature branch
git checkout -b claude/<feature-name>-<SESSION_ID>

# [Install dependencies - to be documented when added]

# [Run tests - to be documented when added]
```

### Running the Project

```bash
# [To be documented when main functionality is added]
```

### Running Tests

```bash
# [To be documented when test framework is added]
```

### Adding Dependencies

```bash
# [To be documented when dependency management is set up]
```

### Code Quality Checks

```bash
# [To be documented when linting/formatting tools are added]
```

---

## 🔮 Future Considerations

### As the Project Grows

When the codebase expands, update this document with:

1. **Architecture Overview:**
   - System design
   - Component interactions
   - Data flow
   - External dependencies

2. **API Documentation:**
   - Endpoint descriptions
   - Request/response formats
   - Authentication requirements

3. **Database Schema:**
   - Table structures
   - Relationships
   - Migration strategy

4. **Deployment:**
   - Build process
   - Deployment steps
   - Environment configuration
   - CI/CD pipeline

5. **Troubleshooting:**
   - Common issues
   - Debug procedures
   - Performance optimization

### Document Evolution

This CLAUDE.md file should be:
- **Updated regularly** as the project evolves
- **Kept accurate** with current project state
- **Referenced** by all AI assistants working on the project
- **Reviewed** during significant architectural changes

---

## 📚 Additional Resources

### Project Documentation

- [README.md](./README.md) - Project overview and setup
- [To be added] - Additional documentation as needed

### External References

- Git Best Practices: https://git-scm.com/book/en/v2
- Conventional Commits: https://www.conventionalcommits.org/
- OWASP Top 10: https://owasp.org/www-project-top-ten/

---

## 🔄 Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-09 | Initial CLAUDE.md creation | Claude |

---

**Note to AI Assistants:** This document is your primary reference for understanding and working with the ACe_Toolkit repository. Always consult this file before making significant changes. Keep it updated as the project evolves.
