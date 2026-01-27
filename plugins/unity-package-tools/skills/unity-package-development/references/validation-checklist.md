# Package Validation Checklist

Before publishing, verify:

## Structure
- [ ] Proper folder layout with Runtime/, Editor/, Tests/
- [ ] Assembly definitions (.asmdef) in place
- [ ] Samples~ and Documentation~ use tilde suffix
- [ ] No duplicate or unused files
- [ ] File paths under 140 characters

## Manifest (package.json)
- [ ] Valid `name` (reverse domain, lowercase)
- [ ] Semantic `version` (MAJOR.MINOR.PATCH)
- [ ] `displayName` set
- [ ] `description` clear and concise
- [ ] `unity` minimum version specified
- [ ] `keywords` for discoverability
- [ ] `author` information
- [ ] `license` field or LICENSE.md reference
- [ ] Dependencies listed correctly

## Documentation
- [ ] README.md with all recommended sections
- [ ] CHANGELOG.md updated for current version
- [ ] LICENSE.md present
- [ ] Third Party Notices.md (if applicable)
- [ ] Documentation~/index.md comprehensive
- [ ] Code examples included
- [ ] Known limitations documented

## Code Quality
- [ ] All code in custom namespaces
- [ ] No Unity namespace usage
- [ ] Consistent naming conventions
- [ ] No compiler errors or warnings
- [ ] Android 64-bit support (if applicable)
- [ ] No executables embedded
- [ ] No DRM or restrictions

## Testing
- [ ] Unit tests in Tests/Runtime/
- [ ] Editor tests in Tests/Editor/
- [ ] All tests passing
- [ ] Tested on target Unity versions
- [ ] Tested on target platforms

## Legal and Compliance
- [ ] License compatible with distribution channel
- [ ] Third-party licenses compatible
- [ ] AI usage disclosed (if applicable)
- [ ] No restricted content (DRM, watermarks, etc.)

## Asset Store Specific
- [ ] Demo scenes for art assets
- [ ] Professional quality standards met
- [ ] File organization clear
- [ ] Documentation in approved formats
- [ ] Maximum size under 6GB
- [ ] Metadata error-free
