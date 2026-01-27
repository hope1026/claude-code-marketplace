---
name: unity-package-development
description: Guide for Unity package development and maintenance. Use when working with UPM packages, package.json manifests, package structure, versioning, documentation, testing, publishing (including Asset Store), distribution, or any Unity package-related tasks.
---

# Unity Package Development

## Overview

Use this skill to keep Unity package work consistent with UPM and Asset Store expectations.

## Required References

Load only the files needed for the task:
- Package layout and assembly definitions: `references/package-structure.md`
- package.json fields and naming rules: `references/package-json.md`
- Semantic versioning rules: `references/semantic-versioning.md`
- CHANGELOG format and guidance: `references/changelog.md`
- Legal files (LICENSE, Third Party Notices): `references/legal.md`
- README and Documentation~ guidance: `references/documentation.md`
- Asset Store submission rules: `references/asset-store.md`
- Icon/Image requirements: `references/image-requirements.md`
- Export and distribution options: `references/distribution.md`
- Embedded vs local package locations: `references/package-locations.md`
- Validation checklist before release: `references/validation-checklist.md`
- Common issues and fixes: `references/common-issues.md`
- Quick start steps and example commands: `references/quickstart.md`
- External links: `references/resources.md`


## Asset Store Submission Workflow

Use this workflow when preparing a package for the Unity Asset Store.

1.  **Preparation**:
    *   [ ] Read `references/asset-store.md` for current requirements.
    *   [ ] Check `references/image-requirements.md` for image dimensions.
    *   [ ] Create `asset-store-materials/<package-name>/` directory.
    *   [ ] **Draft in Korean First**: Create `description_ko.md`, `summary_ko.md`, `technical-details_ko.md`, `tags_ko.md`, and `ai-usage_ko.md` in the package root folder.
    *   [ ] **Summary Length**: All `summary_*.md` files must be 10-200 characters.
    *   [ ] **Use Display Name**: Ensure descriptions use the `displayName` from `package.json` (e.g., "Weppy AI Provider") instead of the package ID (e.g., `com.weppy.aiprovider`).
    *   [ ] **Raw Text Friendly**: Format documents to look good as plain text (e.g., avoid complex Markdown tables or heavy styling, use clear ASCII-based headers/bullets).
    *   [ ] **Scanability Enhancements**: Use simple emoji or ASCII separators (e.g., `⚠️`, `✅`, `---`) to improve readability when Markdown is not rendered.
    *   [ ] **Translation (Final Step)**: Only when requested, translate files and place them in language subfolders (e.g., `en/`, `ja/`, `zh/`).
    *   [ ] Create placeholders or final images in `asset-store-materials/<package-name>/images/`.

2.  **Package Validation**:
    *   [ ] Ensure `package.json` has correct `version`, `displayName`, and `description`.
    *   [ ] Check for `README.md`, `LICENSE.md`, and `CHANGELOG.md` in the package root.
        *   **Open Source**: Use MIT (or similar) License. Include Git URL installation steps in README.
        *   **Asset Store Only**: Use Unity Asset Store EULA. Only include Asset Store / Package Manager (My Assets) installation steps in README.
    *   [ ] Verify no restricted folders (like `Samples/` instead of `Samples~/` if not intended for direct import) or files exist.
    *   [ ] Run `references/validation-checklist.md` steps.

3.  **Upload**:
    *   [ ] Use **Asset Store Publishing Tools** in Unity Editor.
    *   [ ] Select `Local UPM Package` upload type.
    *   [ ] Point to `Packages/<package-name>`.

4.  **Submission**:
    *   [ ] Copy text from drafted md files to the Asset Store Portal.
    *   [ ] Upload images and fill out metadata.
    *   [ ] Submit for review.
