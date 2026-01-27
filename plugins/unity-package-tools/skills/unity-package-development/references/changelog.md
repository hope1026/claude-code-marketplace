# CHANGELOG.md

## Requirements

Mandatory when publishing new versions. Update each release.

## Format

Follow [Keep a Changelog](http://keepachangelog.com) standards:

```markdown
# Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-03-15

### Added
- New chat streaming API with async support
- Support for Anthropic Claude 3 models
- Image attachment support for vision models

### Changed
- Improved error handling in HTTP client
- Updated Google Gemini to version 2.0

### Fixed
- Memory leak in streaming response handler
- Null reference exception in message validation

### Deprecated
- Old synchronous API (will be removed in 2.0.0)

## [1.1.0] - 2024-02-01

### Added
- Support for HuggingFace models
- Custom timeout configuration

### Fixed
- JSON serialization for special characters

## [1.0.0] - 2024-01-15

### Added
- Initial release
- OpenAI GPT-4 support
- Google Gemini support
- Basic chat functionality
```

## Content Guidelines

Focus on:
- Key additions and new features
- Major fixes and improvements
- Breaking changes (especially important)
- Clear language explaining what changed and why
- User perspective (how it affects them)
