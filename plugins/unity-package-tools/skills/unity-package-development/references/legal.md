# Legal Documentation

## LICENSE.md

Required if the package manifest omits `license` and `licensesUrl`. Must be created manually in package base folder.

Include:
- Usage rights (internal vs. public)
- Modification rules
- Redistribution terms

Common options (usually avoid for Asset Store paid packages unless required by third-party code):
- MIT License (permissive)
- Apache 2.0 (permissive with patent grant)
- Custom proprietary license

Example MIT License:

```markdown
# MIT License

Copyright (c) 2024 Your Company Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Third Party Notices.md

Required if using third-party components. Delete if none used.

For each third-party component, include:
- Component name
- License type
- Version number
- License details or URL

Format:

```markdown
# Third Party Notices

This package contains third-party software components governed by the license(s) indicated below:

## Component Name

Copyright (c) [Year] [Copyright Holder]

Licensed under the [License Name]

[Full license text or URL to license]

See: https://spdx.org/licenses/

---

## Another Component

...
```

Reference: [SPDX License List](https://spdx.org/licenses/)
