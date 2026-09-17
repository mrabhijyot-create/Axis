---
name: impeccable
description: Run a meticulous, detail-level craft audit on UI, animation, and interaction code — checking easing curves and spring physics, timing consistency, spacing and optical alignment, and whether every interaction state (hover, focus, active, disabled, loading, empty, error) is present and consistent. Written in the spirit of designers like Emil Kowalski (creator of Vaul and Sonner) who are known for obsessive polish on exactly these details. Use this whenever the user asks to "make this feel polished", "make this impeccable", "sweat the details", says a component "feels a little off" but can't pinpoint why, or wants a final pass before shipping a UI or animation change. This is a correctness-and-consistency pass on execution — it does not judge whether the design direction itself is good; use the taste skill for that call.
---

# Impeccable

Where `taste` asks whether the design decisions are right, this skill assumes they are and asks whether the execution actually delivers on them. Most of what makes an interface feel "cheap" or "a little off" isn't a bad decision — it's a small inconsistency between two things that were supposed to agree: two transitions that should feel like the same gesture but don't, a hover state that exists on one button and not its sibling, spacing that's almost but not quite on the same scale as everything around it. This skill's job is to find those gaps.

## What to actually check

Read the code in scope, and render it (browser, screenshot, or simulator) whenever that's possible — a lot of what you're looking for, like an interruptible spring or an optically-off icon, is only visible in the running result, not the source.

**Motion**
- Do durations and easing curves match their siblings? A drawer that opens in 300ms with a spring and closes in 200ms with a linear ease is two different physical objects pretending to be one.
- Can an animation be interrupted and re-triggered without snapping or jumping? Hover on, hover off, hover on fast — does it feel continuous?
- Are transforms and opacity doing the animating, not properties that trigger layout? Janky motion is often a `width`/`top` animation that should have been a `transform`.

**Spacing & alignment**
- Do spacing values come from one consistent scale, or are there one-off numbers (13px next to a system of 4/8/12/16/24)?
- Is anything mathematically centered that should be optically centered? Icons next to text, glyphs like `→` or `×`, and asymmetric shapes usually need a manual nudge to *look* right even when the math says they're centered.

**Typography**
- Does line-height and letter-spacing actually fit the weight and size chosen, or was it copied from a different type scale?
- Any orphaned one-off font-weight or size that doesn't belong to the established scale?

**States**
- For every interactive element: does hover, focus (keyboard, not just mouse), active, and disabled all exist and look intentional — not just a default state with one hover style bolted on?
- Loading, empty, and error states: do they exist at all, or does the component just assume the happy path?

**Consistency**
- Are repeated values (radius, shadow, duration, a specific color) pulled from the same token or constant everywhere, or re-typed in multiple places where they've quietly drifted apart?

**Under real conditions**
- What happens on a slow device or a throttled network — does the animation degrade gracefully or does it stack and stutter?
- Keyboard-only navigation: can you reach and operate everything?
- Rapid re-triggering, empty data, very long text: does anything break its container or its own physics?

Don't flag an inconsistency you haven't verified — if you're going to say two transitions don't match, actually read both and confirm the numbers differ before reporting it.

## How to report

If the `ReportFindings` tool is available, use it: category `"craft"`, ranked with the most user-noticeable issue first. For each finding, use `failure_scenario` to describe the concrete condition and what a user would perceive under it (e.g. "hover on then off rapidly on the agent card → the drawer's enter and exit springs use different stiffness, so it visibly snaps on exit"), not just a description of the code.

If that tool isn't available, report the same way in plain text: a ranked list, most noticeable first, each with the file/line, what's inconsistent, and the concrete fix.

This is a punch list, not a taste call — every item should be something you can point to and say exactly why it's wrong, not a matter of opinion.
