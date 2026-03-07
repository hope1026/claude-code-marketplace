# Unity Asset Store Image Requirements

## Required Marketing Images

The following 4 marketing images are required for the Asset Store:

### 1. Icon Image (Icon)
- **Size**: 160 x 160
- **Usage**: Small image shown when browsing the Asset Store.
- **Note**: Can also be used for promotional purposes.

### 2. Card Image (Card)
- **Size**: 420 x 280
- **Usage**: Main thumbnail shown when browsing the Asset Store.
- **Note**: Can also be used for promotional purposes.

### 3. Cover Image (Cover)
- **Size**: 1950 x 1300
- **Usage**: Representative image on the product page.
- **Note**: Can also be used for promotional purposes.

### 4. Social Media Image (Social)
- **Size**: 1200 x 630
- **Usage**: Used for social media posts by the community team.
- **Note**: Can be used on the Asset Store home page and other promotions.
- **Caution**: Do not add text or logo overlays to this image (unless they are part of the main design on the left).
- **Size Limit**: Optional, max 8MB.
- **Recommended Layout**: Since content often overlays the right side, place core visual elements/figures in the **Left 40% Safe Zone**. The right side should be handled as background. **Ensure a natural transition without hard borders.**
- **Resolution Option**: If 1200x630 generation is difficult, generate at 1024x1024 (1:1) with content confined to the layout safe zone so it can be cropped later.

## Image Generation Prompts

Use these prompt templates when requesting AI generation for marketing assets. Replace `<Variables>` with specific package details.

### Generic Style Note
> Style: Professional, High-Tech, Premium, Modern UI, High Constraints, No Text Artifacts.

### 1. Icon (160x160)
```text
A modern, professional app icon for a Unity Asset Store package named '<Package Name>'. 
Full square image filling the entire 160x160 canvas. 
If 160x160 generation is not possible, generate at 256x256 with the same composition and no padding. 
Do NOT include any imagery that evokes a specific brand. 
Do NOT add grid lines or any area boundary markers. 
NO white background, NO rounded corners, NO borders. 
Dark, rich tech background (e.g., deep blue/purple) extending to the very edges. 
Center element: <Core Symbol, e.g., Stylized Brain, Network Nodes> representing <Key Feature>. 
High contrast, readable at small sizes.
```

### 2. Card (512x512 with 420x280 Safe Zone)
```text
A 512x512 marketing thumbnail for '<Package Name>'. 
SAFE ZONE: Place the main subject inside a 420x280 area, centered, so it can be cropped cleanly. 
Outside the safe zone should be background only, blending naturally with no hard borders. 
Do NOT include any imagery that evokes a specific brand. 
Do NOT add grid lines or any area boundary markers. 
Hero text: '<Package Name>'. 
Subtext/Visuals: Suggest support for <Key Features/Providers>. 
Background: <Theme, e.g., Digital nodes, futuristic waves>. 
Design: Professional, high quality, matching the premium tech aesthetic.
```

### 3. Cover (1024x1024 with 1950x1300 Safe Zone)
```text
A large 1024x1024 marketing cover for Unity Asset Store package '<Package Name>'. 
SAFE ZONE: Scale 1950x1300 to 1024x683 (same aspect ratio). Place all key content inside this area. 
Outside the safe zone should be background only, with a smooth transition. 
Do NOT include any imagery that evokes a specific brand. 
Do NOT add grid lines or any area boundary markers. 
Hero Text: '<Package Name>' (Large, Bold). 
Subheading: '<Brief Tagline>'. 
Visuals: High-quality 3D/2D abstract elements representing <Core Concept>. 
Background: Deep, rich tech environment with glowing accents. 
Must look powerful and sufficient for a main product landing page.
```

### 4. Social (1024x1024 with 1200x630 Safe Zone)
```text
A social media graphic for '<Package Name>' at 1024x1024. 
LAYOUT CONSTRAINT: Single, continuous background texture (no hard split). 
SAFE ZONE: Horizontal crop area is 1024x538 (same ratio as 1200x630), centered vertically. 
Place ALL important text, logos, and icons within the LEFT 400px of that crop area. 
The remaining area must be background only, blending naturally for overlay/cropping. 
Do NOT include any imagery that evokes a specific brand. 
Do NOT add grid lines or any area boundary markers. 
Visuals: Title '<Package Name>' and icons for <Key Features>. 
```

## Screenshots & Video

### Screenshots
- **Min Width**: 1200px
- **Recommended**: 1920x1080px or higher
- **Quantity**: Min 3-5 high-quality screenshots
- **Content Suggestions**:
  1. Unity Editor window showing the main interface.
  2. Code examples with syntax highlighting.
  3. Settings/Configuration screens.
  4. Runtime demo or action shots.
  5. Feature-specific showcases.

### Video (Optional but Recommended)
- **Platforms**: YouTube, Vimeo
- **Length**: 2-5 minutes
- **Max Size**: 500MB (if uploading directly)
- **Content Suggestions**:
  - Quick feature overview
  - Live API usage demo
  - Editor window walkthrough
  - Streaming response showcase

## Design Guidelines

### Visual Style
- Professional and technical aesthetic.
- Consistent color scheme across all images.
- Modern UI design language.
- High contrast for readability.
- Clean and organized layout.

### Branding
- Use consistent branding where possible.
- Consistent logo placement.
- Professional typography.

### Content Focus
- Show actual features, not just mockups.
- Emphasize Unity Editor integration.
- Display code examples.
- Demonstrate real AI responses/results.

### Technical Quality
- High resolution (Screenshots min 1200px width).
- Sharp, clear text.
- No compression artifacts.
- Proper lighting/contrast.

## File Naming Conventions

```
icon_160x160.png
card_420x280.png
cover_1950x1300.png
social_1200x630.png
```

## Screenshot Content Checklist

- [ ] Unity Editor window with Main Interface.
- [ ] Code examples showing API usage.
- [ ] Configuration/Settings screen.
- [ ] Feature demos (e.g., Streaming, Multi-provider).
- [ ] Multimodal input examples (if applicable).
- [ ] Response history/Request tracking.
- [ ] Model selection & Presets.
- [ ] API Key configuration (blurred for security).
- [ ] Error handling/Fallback demos (optional).

## Image Preparation Tools

- **Photoshop/GIMP**: For marketing images and compositing.
- **Figma/Sketch**: For UI mockups if needed.
- **Unity Editor**: For actual screenshots (Use High-Res Game View).
- **Screen Capture**: Retina/High-DPI display recommended.
- **Code Highlighting**: VS Code or similar with a good theme.

## Important Notes

- All images must clearly represent the specific package.
- Avoid generic AI images; show actual product utility.
- Ensure text is readable at thumbnail sizes.
- Test images in the Asset Store preview before final submission.
- Update screenshots when major features are added.
- Maintain a consistent aspect ratio for a professional look.
