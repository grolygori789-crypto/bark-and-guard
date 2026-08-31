# BARK & GUARD — Repository Structure Contract

This structure is mandatory for production.

```text
/
├─ index.html
├─ README.md
├─ src/
│  ├─ main.js
│  ├─ scenes/
│  ├─ data/
│  ├─ systems/
│  └─ ui/
├─ assets/
│  ├─ stages/
│  │  └─ stage-01/
│  │     └─ night/
│  │        └─ background.png
│  ├─ characters/
│  │  ├─ shih-tzu/
│  │  └─ cats/
│  ├─ ui/
│  ├─ vfx/
│  └─ audio/
│     ├─ music/
│     └─ sfx/
└─ docs/
   └─ design/
```

## Non-negotiable rules

1. **No file dumping in repository root.**
   Root is reserved for entry/configuration files only.

2. **No version suffix garbage.**
   Never create `background-final2.png`, `stage1-new.js`, `main-v4.js`, etc.
   Git history is the versioning system.

3. **Canonical file paths stay stable.**
   When an approved asset is improved, replace the canonical file through a commit instead of creating a duplicate.

4. **Experiments stay outside production.**
   Temporary generated candidates are not committed unless explicitly approved.

5. **Assets are grouped by ownership.**
   Stage-specific assets go under that stage. Character assets go under that character/species.

6. **Every update must be minimal.**
   Change only the files required for the current production batch.

7. **No cache/build junk.**
   Generated cache, temporary exports and local tooling artifacts do not belong in the repository.
