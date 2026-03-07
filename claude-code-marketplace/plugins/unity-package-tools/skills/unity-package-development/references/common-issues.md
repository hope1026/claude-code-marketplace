# Common Issues and Solutions

## Issue: Package not appearing in Package Manager

Solutions:
- Verify package.json syntax (use JSON validator)
- Check name format (must be reverse domain)
- Ensure version is valid semantic version
- Restart Unity Editor
- Check Unity Console for errors

## Issue: Assembly definition errors

Solutions:
- Ensure .asmdef files in Runtime/ and Editor/
- Check assembly references
- Verify platform constraints
- Remove circular dependencies

## Issue: Samples not showing

Solutions:
- Ensure Samples~ folder has tilde
- Check samples array in package.json
- Verify sample paths are correct
- Each sample needs displayName and path

## Issue: Asset Store rejection

Solutions:
- Review submission guidelines carefully
- Check email for specific rejection reasons
- Verify all code in custom namespaces
- Ensure documentation is complete
- Test on clean Unity project
- Validate file structure

## Issue: Version conflicts

Solutions:
- Follow semantic versioning strictly
- Update CHANGELOG.md
- Check dependency versions
- Test with target Unity version
