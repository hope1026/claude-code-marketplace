# Semantic Versioning

Follow MAJOR.MINOR.PATCH format strictly.

## Version Number Rules

### Initial Development
- Start at `0.1.0` for new packages
- Major version 0 indicates unstable APIs

### Production (1.0.0+)

| Version Type | When to Increment | Reset |
|--------------|-------------------|-------|
| **MAJOR** | Breaking changes, API modifications, removed features | MINOR and PATCH to 0 |
| **MINOR** | New backward-compatible features, new assemblies | PATCH to 0 |
| **PATCH** | Bug fixes only, no API changes | None |

## Breaking Changes (MAJOR)

Increment MAJOR version when:
- Modifying API surface risking compilation/runtime errors
- Removing non-API features or assets
- Changing asset GUIDs or removing assemblies
- Adding assemblies if Auto Referenced is enabled

## New Features (MINOR)

Increment MINOR version when:
- Adding new functionality without breaking existing code
- Adding new assemblies (when not Auto Referenced)
- Adding new assets with no pre-existing references

## Bug Fixes (PATCH)

Increment PATCH version when:
- Fixing bugs with identical APIs
- No feature changes or additions
- Versions should be fully interchangeable (e.g., 1.3.0 and 1.3.1)

## Deprecation Strategy

- Maintain at least one MINOR release with deprecation warnings
- Remove deprecated functionality only in next MAJOR version
