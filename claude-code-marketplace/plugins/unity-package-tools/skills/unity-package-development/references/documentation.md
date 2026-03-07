# Documentation Requirements

## README.md Structure

Required. Developer-focused documentation.

Recommended sections:

```markdown
# Package Name

## About

Brief overview of package purpose and key features.

## Installing

### Via Package Manager

1. Open Package Manager (Window > Package Manager)
2. Click "+" > "Add package from git URL"
3. Enter: `https://github.com/yourcompany/package.git`

### Via package.json

Add to `Packages/manifest.json`:

```json
{
  "dependencies": {
    "com.yourcompany.packagename": "1.0.0"
  }
}
```

## Requirements

- Unity 2019.1 or later
- .NET Standard 2.1
- Newtonsoft JSON package

## Usage

### Basic Example

```csharp
using YourCompany.PackageName;

// Example code here
```

### Advanced Usage

See [Documentation~/index.md](Documentation~/index.md) for detailed guides.

## Known Limitations

- Feature X requires Unity 2021.3+
- Feature Y not supported on WebGL platform

## Package Contents

```
Runtime/          - Core runtime scripts
Editor/           - Editor tools and windows
Documentation~/   - Full documentation
Samples~/         - Usage examples
```

## Document Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2024-03-15 | 1.2 | Added streaming API docs |
| 2024-01-15 | 1.0 | Initial documentation |
```

## Documentation~ Folder

Create comprehensive guides in `Documentation~/`:

Recommended structure:

```
Documentation~/
├── index.md              # Main documentation entry
├── getting-started.md    # Quick start guide
├── api-reference.md      # API documentation
├── examples.md           # Usage examples
├── troubleshooting.md    # Common issues
└── images/               # Screenshots and diagrams
    └── screenshot.png
```

Content sections:
- About: overview and purpose
- Installing: installation steps
- Requirements: compatibility details
- Usage: implementation procedures
- Known Limitations: current version constraints
- Package Contents: file structure
- Workflows: step-by-step procedures with screenshots
- Advanced Topics: detailed technical information
- Reference: UI properties (use tables)
- Samples: example file usage
- Tutorials: walkthroughs with images
- Support: feedback and contact info
