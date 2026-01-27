# package.json Manifest

## Required Fields

```json
{
  "name": "com.yourcompany.packagename",
  "version": "1.0.0",
  "displayName": "Your Package Display Name",
  "description": "Brief package overview for Package Manager",
  "unity": "2019.1"
}
```

## Complete Example with All Recommended Fields

```json
{
  "name": "com.yourcompany.packagename",
  "version": "1.0.0",
  "displayName": "Your Package Display Name",
  "description": "A comprehensive package that provides X, Y, and Z functionality for Unity developers.",
  "unity": "2019.1",
  "unityRelease": "0b4",
  "keywords": [
    "ai",
    "provider",
    "chat",
    "image"
  ],
  "author": {
    "name": "Your Name or Company",
    "email": "contact@yourcompany.com",
    "url": "https://yourcompany.com"
  },
  "license": "MIT",
  "dependencies": {
    "com.unity.nuget.newtonsoft-json": "3.0.2"
  },
  "samples": [
    {
      "displayName": "Basic Usage Example",
      "description": "Shows basic package usage",
      "path": "Samples~/BasicExample"
    }
  ],
  "documentationUrl": "https://docs.yourcompany.com/package",
  "changelogUrl": "https://github.com/yourcompany/package/CHANGELOG.md",
  "licensesUrl": "https://github.com/yourcompany/package/LICENSE.md"
}
```

## Field Requirements

| Field | Type | Required | Details |
|-------|------|----------|---------|
| `name` | string | YES | Reverse domain format: `com.company.packagename` |
| `version` | string | YES | Semantic versioning: `MAJOR.MINOR.PATCH` |
| `displayName` | string | Recommended | User-friendly name shown in Editor |
| `description` | string | Recommended | Brief overview (max 1-2 sentences) |
| `unity` | string | Recommended | Minimum Unity version: `"2019.1"` format |
| `unityRelease` | string | Optional | Specific build: `"0b4"` format |
| `keywords` | array | Optional | Search terms for Package Manager |
| `author` | object/string | Optional | Creator info with name, email, URL |
| `license` | string | Optional | SPDX identifier or `"See LICENSE.md"` |
| `dependencies` | object | Optional | Required packages with versions |
| `samples` | array | Optional | Included sample metadata |

## Naming Conventions

### Technical Name (package.json `name` field)

- Format: `<domain>.<company>.<product>.<packagename>`
- Example: `com.yourcompany.aiprovider.chat`
- Rules:
  - Must start with top-level domain (com, net, org, etc.)
  - Only lowercase letters, digits, hyphens (-), underscores (_), periods (.)
  - Cannot start with `com.unity` or contain "unity" anywhere
  - 50 characters recommended, 214 max

### Display Name

- User-facing name shown in Unity Editor
- Can use spaces, capitalization, special characters
- Example: "AI Provider - Chat"
