# Asset Store Submission Guidelines

## Package Organization

File structure:
- Single root folder (exceptions: Gizmos, Editor Default Resources)
- Organized by type (Mesh, Materials, Scripts) or relationship
- No duplicate or unusable files
- File paths under 140 characters
- Maximum size: 6GB

Quality standards:
- Professional design and construction
- Suitable for professional development pipeline
- Appropriate visual and functional quality

## Code Requirements

All code must:
- Use user-declared namespaces (NOT Unity namespaces)
- Support Android 64-bit architecture
- Be readable and modifiable
- Follow consistent naming: ClassName, functionName, CONSTANT
- No executables embedded
- No DRM, time restrictions, or watermarks

## AI-Generated Content

Unity requires disclosure when AI/ML is used in asset creation. This helps customers understand the creative process and inspires others.

### Disclosure Requirements

If AI/ML was used in creating your asset:
1. Check "I have used AI/ML in my package creation process" checkbox (bottom of Description tab)
2. Fill in the AI usage description field

### What to Include in AI Usage Description

Describe how AI/ML was utilized in your workflow:
- **Tools Used**: List specific AI tools (ChatGPT, Claude, GitHub Copilot, Stable Diffusion, etc.)
- **Purpose**: What aspects were AI-assisted (code generation, documentation, image creation, testing, etc.)
- **Process**: How AI was integrated into your workflow
- **Human Oversight**: What manual review/modifications were made
- **Value Added**: How AI improved quality, efficiency, or capabilities

### Examples

**Good Example 1 - Code Assistance:**
```
AI tools (GitHub Copilot, ChatGPT) were used to assist with:
- Boilerplate code generation for provider implementations
- Unit test case suggestions
- Code documentation and XML comments
All generated code was thoroughly reviewed, tested, and modified to meet project requirements.
```

**Good Example 2 - Documentation:**
```
Claude AI was used to help draft:
- API documentation
- README files
- Code examples and tutorials
All content was reviewed, edited, and validated for accuracy and clarity by the development team.
```

**Good Example 3 - Multiple Uses:**
```
AI/ML was integrated into the development workflow:
- Code completion: GitHub Copilot for routine coding patterns
- Documentation: ChatGPT for initial drafts of technical documentation
- Testing: AI-assisted test case generation
- Image assets: Stable Diffusion for placeholder icons (all final assets are human-created)
All AI-generated content underwent rigorous human review and modification.
```

### When NOT to Disclose

You do NOT need to disclose AI usage for:
- Using AI as a search tool or reference
- General programming assistance without direct code generation
- AI tools built into your IDE for syntax highlighting or auto-completion (standard IDE features)

### Best Practices

- Be transparent and specific
- Focus on value provided to customers
- Explain quality assurance measures
- Highlight human expertise and oversight
- Don't oversell or undersell AI involvement

## Dependencies

- Include only necessary UPM dependencies
- List external dependencies in documentation
- Ensure third-party licenses compatible with Asset Store EULA

## Metadata

- Product title, description, keywords: no excessive spelling/grammar errors
- Required documentation for code, shaders, complex setups
- Documentation formats: .txt, .md, .pdf, .html, .rtf
- Art assets require demo scenes

## Technical Specs

### 3D Assets

- Formats: .fbx, .dae, .abc, .obj
- Scale: 1 unit = 1 meter
- Pivot: bottom center or logical rotation point
- Rigged models: anatomically accurate weight painting

### Audio

- Formats: .wav, .aiff, .flac (lossless)
- No excessive silence or background noise
- Peak levels not exceeding -0.3 dB
- Individual files properly sliced and named

## Restrictions

- No executables in packages
- Restrict external redirects via editor scripts
- No genitalia in 3D models or images
- Third-party licenses must be compatible

## Review Process

- Asset Store team reviews against guidelines
- Rejection reasons communicated via email
- May respond to disagreements
- Multiple unchanged resubmissions can result in account termination

# Asset Store Upload Guide

1. Create a draft at [AssetStorePublishPortal](https://publisher.unity.com/)
2. Install Asset Store Publishing Tools: https://assetstore.unity.com/packages/tools/utilities/asset-store-publishing-tools-115
3. In Unity Editor, go to Tools -> Asset Store -> Uploader
4. Upload type: Local UPM Package
   - Only enabled after draft is created
   - If Local UPM Package is not available, add [UNITY_ASTOOLS_EXPERIMENTAL](https://github.com/needle-tools/hybrid-packages) define in PlayerSettings
5. Select `Packages/your-package-name` in Package path
6. Click Export and Upload button
7. Fill in release information at AssetStorePublishPortal and click Submit

## Asset Store Submission Form Requirements

### Description Tab

#### Summary
- 10-200 characters
- Concise summary of what the package is and how it helps users
- First impression for potential customers

#### Description
- Detailed package description
- Explain features, use cases, and benefits
- Supports rich text formatting (bold, italic, links, lists)
- Should cover:
  - What the package does
  - Who it's for
  - Key benefits
  - How it solves problems
  - Customization options (if applicable)
  - Genre suitability (if applicable)

#### Technical Details
- List all key features
- Required field
- Use bullet points for clarity
- Include:
  - Major functionality
  - Supported platforms
  - Integration capabilities
  - Performance characteristics
  - Included components/tools

#### Category Selection
- Choose the most appropriate category
- Examples: Tools, AI, Scripting, Editor Extensions, etc.
- Affects discoverability

#### Additional Technical Info
- Features list
- Supported OS
- Link to documentation (strongly recommended)
- AI/ML usage disclosure checkbox

#### Price
- Minimum for paid assets: $4.99
- Assets $15+ can have launch discounts
- Free asset option available

#### Keywords
- Up to 15 keywords
- Help customers find the package
- Can use suggested keywords or enter custom ones
- Choose relevant, searchable terms

#### Public Links
- Asset Store URL (auto-generated)
- Short URL (auto-generated)
- URLs become accessible once published
- Do not change after updates

### Media Requirements

#### Screenshots & Videos
- **Images**: Minimum width 1200px
- **Videos**: Maximum size 500MB
- **Audio samples**: Maximum size 500MB
- Supported video platforms: YouTube, Vimeo, Soundcloud, Mixcloud, Sketchfab
- Drag to reorder media priority
- First image/video is primary showcase

#### Marketing Images (Required)
Must upload all of the following:
1. **Icon**: 160 x 160 (small image shown while browsing; may be used for promotions)
2. **Card**: 420 x 280 (main thumbnail while browsing; may be used for promotions)
3. **Cover**: 1950 x 1300 (main image on the product page; may be used for promotions)
4. **Social Media**: 1200 x 630 (used by community team for social posts; may appear on Asset Store home and other promotions)
   - Optional, max 8MB
   - Do not add text or logo overlays
   - Layout tip: keep the key visual on the right side; use the left as background/negative space

Image specifications:
- High quality, professional appearance
- Clearly represent the package
- No excessive text overlay
- Consistent branding across all images

### Best Practices

#### Writing Descriptions
- Start with the main benefit
- Use clear, professional language
- Avoid marketing hyperbole
- Include technical specifications
- Mention compatibility (Unity versions, platforms)
- Link to documentation
- Add contact/support information

#### Choosing Keywords
- Include function-related terms
- Add technology/integration names
- Use problem-solving phrases
- Include target audience terms
- Avoid generic single words
- Think about search intent

#### Creating Media
- Show actual functionality
- Include UI/workflow shots
- Demonstrate key features
- Use real project examples
- Add captions to clarify features
- Keep videos concise (2-5 minutes)

#### Marketing Images
- Use consistent color scheme
- Feature recognizable UI/visuals
- Make text readable at thumbnail size
- Test appearance in Asset Store layout
- Match the package's visual style

### Checklist Before Submission

- [ ] Summary is concise and compelling (10-200 chars)
- [ ] Description covers all major features and benefits
- [ ] Technical details list is complete
- [ ] Correct category selected
- [ ] Documentation link provided
- [ ] AI/ML usage disclosed if applicable
- [ ] 15 relevant keywords selected
- [ ] At least 3 high-quality screenshots (1200px+ width)
- [ ] All required marketing images uploaded (icon, card, cover, social)
- [ ] Video showcases key features (if included)
- [ ] Price set appropriately
- [ ] All text proofread for errors
