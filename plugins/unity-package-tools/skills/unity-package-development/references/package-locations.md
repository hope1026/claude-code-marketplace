# Package Creation Locations

## Inside Project (Embedded)

Location: `Packages/` subfolder of Unity project

Benefits:
- Highly portable with version control
- Labeled as "Custom" in Package Manager
- Same repository as project

Best for: single-project development

## Outside Project (Local)

Location: outside `Packages/` folder

Benefits:
- Reusable across multiple projects
- Separate version control repository
- Labeled as "Local" in Package Manager

Best for: multi-project reuse

Note: requires explicit reference in project manifest.
