# Quick Start Workflow

## Creating a New Package

1. Create package structure:
```bash
mkdir -p YourPackage/{Runtime,Editor,Tests/Runtime,Tests/Editor,Samples~,Documentation~}
```

2. Create package.json:
```json
{
  "name": "com.yourcompany.packagename",
  "version": "0.1.0",
  "displayName": "Your Package",
  "description": "Package description",
  "unity": "2019.1"
}
```

3. Add assembly definitions:
- Runtime: `YourPackage.asmdef`
- Editor: `YourPackageEditor.asmdef`

4. Create documentation:
- README.md (developer docs)
- CHANGELOG.md (version history)
- LICENSE.md (usage rights)
- Documentation~/index.md (user guide)

5. Add code and tests:
- Implement functionality in Runtime/
- Add editor tools in Editor/
- Write tests in Tests/

6. Validate:
- Run tests
- Check for errors
- Verify package.json
- Test installation

7. Publish:
- Update version
- Update CHANGELOG.md
- Export package
- Distribute via chosen channel

## Example Commands

### Create package structure
```bash
mkdir -p Packages/com.yourcompany.packagename/{Runtime,Editor,Tests/{Runtime,Editor},Samples~,Documentation~}
cd Packages/com.yourcompany.packagename
```

### Initialize package.json
```bash
cat > package.json << 'EOF_JSON'
{
  "name": "com.yourcompany.packagename",
  "version": "0.1.0",
  "displayName": "Your Package Name",
  "description": "Brief package description",
  "unity": "2019.1"
}
EOF_JSON
```

### Create basic README.md
```bash
cat > README.md << 'EOF_MD'
# Your Package Name

## About
Package description and overview.

## Installing
Installation instructions.

## Usage
Basic usage examples.
EOF_MD
```

### Create CHANGELOG.md
```bash
cat > CHANGELOG.md << 'EOF_CHANGELOG'
# Changelog

## [0.1.0] - $(date +%Y-%m-%d)

### Added
- Initial package creation
EOF_CHANGELOG
```

### Validate package.json
```bash
python3 -m json.tool package.json
```

## Notes

- Always test packages in clean Unity projects before publishing.
- Keep package size minimal (only include necessary files).
- Follow Unity coding conventions.
- Provide comprehensive documentation.
- Respond to user feedback promptly.
- Maintain backward compatibility when possible.
