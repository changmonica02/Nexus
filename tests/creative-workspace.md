# Novel and character workspace verification

Run the regression tests with:

```sh
node --test tests/novelChapters.test.cjs tests/characterWorkspace.test.cjs
```

The browser smoke checks use isolated fixture data, not a signed-in account.
Verified at desktop size and 390 × 844:

- A legacy novel retains its body before activation. Activation creates separate
  chapter records. Top and bottom navigation change one chapter at a time.
- Editing chapter one, navigating to chapter two, and returning preserves the
  edited text without copying it into chapter two. Rename and reorder preserve
  the active chapter's identity.
- One character block holds prose, statistics and a radar chart simultaneously.
  Prose starts collapsed in card mode. Statistics support multiline descriptions,
  renamed column headings and totals (37 + 5 = 42).
- Character tabs can be created, renamed and moved. Cancelling a deletion leaves
  the page intact. Deletion of nested content is covered by regression tests.
- Saving a template and instantiating it copies the block/tab structure with new
  IDs. Text becomes placeholders, not completed character values. Numeric and
  visual defaults remain editable. Template manager renaming updates the list.
- A reload preserves the fixture's profile structure and text. Production
  IndexedDB and cloud persistence use the existing account-owned pages pipeline;
  live-account sync was not exercised in the isolated browser test.

## Data compatibility

Existing leaf sections remain readable/editable. `group` sections own a
`contents` array. Custom templates are account-owned creative page records with
`character_data.isTemplate = true`; they are included in existing workspace
backup and synchronization. Updating a template never mutates an existing card.

The built-in blank template contains no sections or filled-in character.
D&D 5e and CoC 7e provide editable, system-specific fields and supplementary
pages. They are recording templates, not rules calculators. Field references:

- [Official D&D 5e character sheet](https://media.dndbeyond.com/compendium-images/marketing/dnd_5e_charactersheet_formfillable.pdf)
- [Chaosium investigator characteristics](https://callofcthulhuwiki.chaosium.com/investigators/step-one-investigator-characteristics.html)
- [Chaosium character sheets](https://www.chaosium.com/cthulhu-character-sheets/)

Before enabling chapter sync in production, apply
`supabase/migrations/20260916_novel_chapters.sql` after earlier migrations.
The migration changes schema only; existing novel bodies are transferred and
cleared only when the user enables the chapter workspace.
