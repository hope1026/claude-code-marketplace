# Package Export and Distribution

## Export Methods

### 1. Package Manager Window

- Select package in Package Manager
- Click "Export"
- Choose organization and destination folder
- Creates signed `.tgz` file

### 2. Command Line

Windows:
```bash
Unity.exe -batchmode -username <email> -password <password> -upmPack <folder> <output> -cloudOrganization <org_id>
```

macOS:
```bash
/Applications/Unity/Hub/Editor/[version]/Unity.app/Contents/MacOS/Unity -batchmode -username <email> -password <password> -upmPack <folder> <output> -cloudOrganization <org_id>
```

### 3. Programmatic
```csharp
UnityEditor.PackageManager.Client.Pack("<folder>", "<output>", "<org_id>");
```

## Distribution Channels

1. Compressed File (.zip)
- Share zip file
- Users decompress and install locally

2. Tarball (.tgz)
- Export from Package Manager
- Users install from local tarball
- Includes package signature

3. Git URL
- Host on GitHub, GitLab, etc.
- Share repository URL
- Users add via Package Manager: "Add package from git URL"

4. Scoped Registry
- Set up package registry server
- Publish to custom registry
- Users configure project to fetch from registry

5. Asset Store
- Submit through Asset Store publisher portal
- Undergo review process
- Available to all Unity users
