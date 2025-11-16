# pnpm Workspace Setup Guide

## 🎯 Problem

When running `pnpm install` in the root directory, pnpm was installing `node_modules` in both:
- Root directory (`/node_modules`)
- Apps directory (`/apps/web/node_modules`)

This is incorrect for a monorepo setup and wastes disk space.

## ✅ Solution

The issue is caused by:
1. **Missing `.npmrc` configuration** - pnpm needs specific workspace settings
2. **Incorrect workspace file name** - Should be `pnpm-workspace.yaml` (not `.yml`)
3. **Root package.json shouldn't have dependencies** - Only workspace packages should have dependencies

## 📦 Fixed Files

### 1. pnpm-workspace.yaml
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 2. Root package.json
- **Removed all dependencies** (they belong in apps/web)
- **Uses pnpm filters** for all commands
- **No longer installs its own node_modules**

### 3. .npmrc (NEW)
- Configures pnpm workspace behavior
- Enables proper hoisting
- Uses isolated node linker

## 🚀 How to Fix Your Current Setup

### Step 1: Clean Up Existing Installation

```bash
# Remove all node_modules and lock files
rm -rf node_modules
rm -rf apps/web/node_modules
rm -rf pnpm-lock.yaml

# Remove any cached pnpm data
pnpm store prune
```

### Step 2: Update Configuration Files

```bash
# Copy the fixed files
cp pnpm-workspace.yaml .
cp .npmrc .
cp package.json .
```

### Step 3: Reinstall Dependencies

```bash
# Install from root - this will ONLY install in apps/web/node_modules
pnpm install

# Verify - you should ONLY see apps/web/node_modules
ls -la | grep node_modules  # Should return nothing
ls -la apps/web/ | grep node_modules  # Should show node_modules
```

## 📋 Verification

After running `pnpm install`, you should see:

✅ **Correct Structure:**
```
cyber-scanner-monorepo/
├── apps/
│   └── web/
│       └── node_modules/     ← Dependencies installed here
├── docker/
├── pnpm-lock.yaml            ← Single lockfile at root
├── pnpm-workspace.yaml
├── .npmrc
└── package.json              ← No dependencies, only scripts
```

## 🛠️ Using pnpm Commands

### Install Dependencies
```bash
# From root - installs in all workspace packages
pnpm install

# Install only for specific package
pnpm --filter web install

# Add dependency to web package
pnpm --filter web add axios
pnpm --filter web add -D typescript
```

### Run Scripts
```bash
# Run dev server (from root)
pnpm web:dev
# or
pnpm --filter web dev

# Build (from root)
pnpm web:build

# Run multiple packages
pnpm --filter web --filter another-package dev
```

### Workspace Commands
```bash
# List all workspace packages
pnpm list -r

# Update all dependencies
pnpm update -r

# Run command in all packages
pnpm -r exec npm run build
```

## 🔍 How It Works

### Workspace Resolution
1. pnpm reads `pnpm-workspace.yaml`
2. Identifies all packages in `apps/*` and `packages/*`
3. Creates a single `pnpm-lock.yaml` at root
4. Installs dependencies ONLY in workspace packages
5. Uses symlinks for internal dependencies

### Command Filtering
```bash
# --filter web means "run this command in the web package"
pnpm --filter web dev

# Equivalent to:
cd apps/web && pnpm dev
```

### Benefits
- ✅ Single lockfile for entire monorepo
- ✅ Shared dependencies (saves disk space)
- ✅ Fast installations with hard links
- ✅ Isolated node_modules per package
- ✅ No phantom dependencies
- ✅ No root node_modules pollution

## 🚨 Common Issues

### Issue 1: Root node_modules Still Appears
```bash
# Solution: Clean and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Issue 2: Dependencies Not Found
```bash
# Solution: Ensure .npmrc is in root
cat .npmrc

# Verify workspace packages are detected
pnpm list -r
```

### Issue 3: Wrong Package Manager Used
```bash
# Make sure you're using pnpm, not npm
which pnpm

# Install pnpm if needed
npm install -g pnpm

# Or use corepack (recommended)
corepack enable
corepack prepare pnpm@latest --activate
```

## 📝 Best Practices

### Adding Dependencies

**Do this:**
```bash
# Add to specific package
pnpm --filter web add react

# Add dev dependency
pnpm --filter web add -D typescript
```

**Don't do this:**
```bash
# ❌ Don't add dependencies to root
cd / && pnpm add react  # Wrong!

# ❌ Don't use npm in a pnpm workspace
npm install react  # Wrong!
```

### Running Scripts

**Do this:**
```bash
# From root using filters
pnpm --filter web dev

# Or use the script aliases
pnpm web:dev
```

**Don't do this:**
```bash
# ❌ Don't run npm scripts from root
npm run dev  # Wrong!

# ❌ Don't cd into packages unnecessarily
cd apps/web && pnpm dev  # Works, but unnecessary
```

### Creating New Packages

```bash
# Create new package
mkdir -p apps/admin
cd apps/admin

# Initialize package.json
pnpm init

# pnpm automatically detects it (from root)
pnpm list -r  # Should show new package
```

## 🔧 Troubleshooting

### Clean Everything
```bash
# Nuclear option - start fresh
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm -rf pnpm-lock.yaml
pnpm store prune
pnpm install
```

### Verify Configuration
```bash
# Check workspace packages
pnpm list -r --depth=-1

# Check where dependencies are installed
find . -name "node_modules" -type d

# Should only find:
# ./apps/web/node_modules
```

### Check pnpm Version
```bash
# Ensure you're using pnpm 8+
pnpm --version

# Update if needed
pnpm add -g pnpm
```

## 📚 Additional Resources

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [pnpm CLI](https://pnpm.io/cli/add)
- [pnpm Filtering](https://pnpm.io/filtering)
- [.npmrc Configuration](https://pnpm.io/npmrc)

## ✅ Quick Setup Checklist

- [ ] Remove old `node_modules` directories
- [ ] Update `pnpm-workspace.yaml` (not `.yml`)
- [ ] Update root `package.json` (no dependencies)
- [ ] Create `.npmrc` file
- [ ] Run `pnpm install` from root
- [ ] Verify only `apps/web/node_modules` exists
- [ ] Test commands with `pnpm web:dev`
- [ ] Commit all configuration files