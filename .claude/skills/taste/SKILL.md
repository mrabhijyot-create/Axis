---
name: taste
description: Give an honest, opinionated read on whether a design or UI decision has good taste — judging restraint, hierarchy, and coherence, and whether every element earns its place, in the spirit of designers like Emil Kowalski who treat subtraction and calibration against great work as core craft skills. Use this whenever the user asks "does this look good", "what do you think of this design", wants a second opinion on a layout/visual/copy decision, is about to ship a UI change and wants a gut check, or says a design "feels off" but can't say why. Trigger for holistic judgment on a component, page, or redesign — not pixel-level polish (use the impeccable skill for that).
---

# Taste

Taste is a judgment call, not a checklist. This skill exists to make that call honestly, the way a good design lead would in a five-minute look over your shoulder — not to generate a thorough report. A thorough report is what the `impeccable` skill is for.

## How to look

1. **See the whole before the parts.** Look at the rendered result (or, if you can't render it, read the code end to end) before you form an opinion about any one piece. Ask: where does the eye go first? Was that a decision, or an accident?

2. **Apply the subtraction test.** For every element — a border, a shadow, a label, an animation, a color — ask whether removing it would be missed. Good taste is disproportionately about what's absent. A first draft nearly always has more in it than the finished version should. If you can point at something and say "this isn't doing anything," that's usually the single most useful thing you can say.

3. **Count the competing signals.** In one view, how many things are asking for attention at once — colors, font weights, border styles, animation, shadows? Work with real taste usually reads as quieter than its first draft, because someone went back and turned things off.

4. **Check for one hand on the wheel.** Does this look like a single set of decisions carried through, or like it accreted from many small, locally-reasonable choices that don't agree with each other? Mismatched corner radii, a font pairing with no logic to it, a color used once and nowhere else — these are the tell that nobody did a final pass asking "does this whole thing hang together."

5. **Calibrate against something you know is excellent.** Reference isn't imitation — it's how you know what "great" looks like in this genre so your opinion isn't just personal preference. If you genuinely don't have a strong reference point for the kind of thing you're looking at, say so rather than manufacturing a confident verdict you don't have grounds for.

## How to answer

Do not produce a list. Do not try to be exhaustive. The skill *is* the editing — dumping every nitpick you noticed is the opposite of taste, not a thorough version of it.

Give:
- A short, direct verdict (one or two sentences: is this working, and why or why not)
- At most the single highest-leverage change — the one thing that, if fixed, would move this the most. If nothing rises above the noise, say it's fine and stop.

If you're reviewing several screens or components together, give one holistic read of the set rather than a separate verdict per item — taste is often about whether things agree with each other, which you can't see one at a time.

Be willing to say "this is good, ship it." Manufacturing criticism to seem thorough is itself bad taste.
