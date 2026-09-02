# Advanced Git Surgery & Conflict Resolution

When a massive Department PoC collides with a Global R&D proposal, standard `git pull` or `git merge` will result in chaotic, error-prone conflict markers. You need surgical tools to deconstruct and resolve the divergence.

## 1. The Savior: `diff3` Conflict Style
By default, Git shows you `<<<<<<< HEAD` (your code) and `>>>>>>> branch` (their code). This is insufficient for complex logic because you don't know what the original code looked like before both parties changed it.

**Action**: Enable `diff3` globally.
```bash
git config --global merge.conflictstyle diff3
```
Now, conflicts will show the **Base Ancestor**:
```text
<<<<<<< HEAD
department_feature_init(true, "department_flag");
||||||| merged common ancestors
feature_init(true);
=======
global_rd_init(true, Config::RND_MODE);
>>>>>>> global-rnd
```
*Why this saves you*: By seeing `feature_init(true)`, you understand that HEAD added a string argument, while the incoming branch changed the function name and added an enum. You can now intelligently combine them: `global_rd_init(true, Config::RND_MODE, "department_flag")`.

## 2. `git rerere` (Reuse Recorded Resolution)
If you are maintaining a long-lived PoC branch, you might find yourself rebasing against `main` frequently and resolving the *exact same conflicts* over and over again.

**Action**: Enable `rerere`.
```bash
git config --global rerere.enabled true
```
*How it works*: When you resolve a conflict, Git takes a fingerprint of the conflict and your resolution. The next time Git encounters that exact conflict (e.g., during a rebase or a cherry-pick), it will automatically apply your previous fix.

## 3. Dissecting the Monolith (Interactive Rebase)
If your PoC branch has 50 messy commits ("wip", "fix typo", "try again"), no Global reviewer will accept it, and merging it will be impossible. You must squash and rewrite history before integration.

```bash
git rebase -i HEAD~50
```
- Use `fixup` (or `f`) to melt minor commits into the preceding meaningful commit.
- Use `edit` (or `e`) to pause the rebase.
- While paused on an `edit`, you can run `git reset HEAD^` to uncommit the files, then carefully `git add -p` to split a massive commit into smaller, atomic, logically separated commits.

## 4. The `--exec` Safety Net
When rebasing a long branch, you might silently introduce syntax errors in the intermediate commits, breaking the build history (which ruins `git bisect`).

```bash
git rebase -i main --exec "npm run test"
```
Git will pause after *every single commit* application and run your test suite. If the test fails, the rebase pauses, allowing you to fix the compilation error, `git commit --amend`, and `git rebase --continue`.

## 5. Emergency `reflog`
Did you mess up a massive rebase and lose your Department's work? `git log` won't save you because the commit references are gone.
```bash
git reflog
```
This shows the chronological history of where your `HEAD` pointer has been. Find the hash right before your catastrophic rebase and run `git reset --hard <hash>` to resurrect your sinking ship.
