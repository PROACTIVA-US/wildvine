---
name: wildvinehub
description: Use the WildvineHub CLI to search, install, update, and publish agent skills from wildvinehub.com. Use when you need to fetch new skills on the fly, sync installed skills to latest or a specific version, or publish new/updated skill folders with the npm-installed wildvinehub CLI.
metadata:
  {
    "wildvine":
      {
        "requires": { "bins": ["wildvinehub"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "wildvinehub",
              "bins": ["wildvinehub"],
              "label": "Install WildvineHub CLI (npm)",
            },
          ],
      },
  }
---

# WildvineHub CLI

Install

```bash
npm i -g wildvinehub
```

Auth (publish)

```bash
wildvinehub login
wildvinehub whoami
```

Search

```bash
wildvinehub search "postgres backups"
```

Install

```bash
wildvinehub install my-skill
wildvinehub install my-skill --version 1.2.3
```

Update (hash-based match + upgrade)

```bash
wildvinehub update my-skill
wildvinehub update my-skill --version 1.2.3
wildvinehub update --all
wildvinehub update my-skill --force
wildvinehub update --all --no-input --force
```

List

```bash
wildvinehub list
```

Publish

```bash
wildvinehub publish ./my-skill --slug my-skill --name "My Skill" --version 1.2.0 --changelog "Fixes + docs"
```

Notes

- Default registry: https://wildvinehub.com (override with WILDVINEHUB_REGISTRY or --registry)
- Default workdir: cwd (falls back to Wildvine workspace); install dir: ./skills (override with --workdir / --dir / WILDVINEHUB_WORKDIR)
- Update command hashes local files, resolves matching version, and upgrades to latest unless --version is set
