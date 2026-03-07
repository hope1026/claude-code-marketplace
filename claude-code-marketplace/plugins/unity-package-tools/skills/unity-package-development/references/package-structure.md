# Package Structure Requirements

## Standard UPM Package Layout

```
<package-root>/
├── package.json                 # REQUIRED: Package manifest
├── README.md                    # REQUIRED: Developer-focused docs
├── CHANGELOG.md                 # REQUIRED: Version history
├── LICENSE.md                   # REQUIRED if no license or licensesUrl in package.json
├── Third Party Notices.md       # REQUIRED if using third-party code
├── Runtime/                     # Runtime code and assets
│   ├── <PackageName>.asmdef    # Assembly definition
│   └── *.cs                    # Runtime scripts
├── Editor/                      # Editor-only code
│   ├── <PackageName>Editor.asmdef
│   └── *.cs                    # Editor scripts
├── Tests/                       # Test suites
│   ├── Runtime/
│   │   └── *.cs                # Runtime tests
│   └── Editor/
│       └── *.cs                # Editor tests
├── Samples~/                    # Example implementations (note ~)
│   └── SampleName/
│       └── *.cs
└── Documentation~/              # Package documentation (note ~)
    ├── index.md
    └── images/
```

## Important Notes

- Use `~` suffix for `Samples~` and `Documentation~` to hide from Project window.
- All code must be in user-declared namespaces (not Unity namespaces).
- Assembly definitions (.asmdef) required for Editor and Runtime folders.
