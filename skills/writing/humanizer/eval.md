# Humanizer eval

Run this against your own output before returning it. Answer each check pass or fail. Any fail means fix the draft and run the checks again. Do not delegate this to a separate evaluator agent; check your own work.

For detect-mode responses, skip to the Detect mode section at the bottom.

## Fabrication

1. Does the rewrite contain any fact, name, number, date, quote, citation, ranking, or claim of simultaneity that is not in the source text? A single invented specific is a defect, even when it reads better than the vague original.
2. Where a vague claim became specific, did the specific come from the source or the user rather than from you?
3. Where a sentence needed real-world detail that does not exist in the source, was the plain version written or the detail asked for, rather than filled in?

## Preservation

4. Does every supported claim in the original survive into the rewrite? Paragraphs may merge or split, but no claim quietly disappears unless a pattern called for cutting it.
5. Did strong human sentences survive untouched instead of being rewritten for consistency?
6. Is the amount of cutting proportional to the actual slop, rather than a compression pass that strips character?
7. Would the original writer recognize this as their own voice? Vocabulary, cadence, bluntness, humor, uncertainty, and digressions intact?
8. If a voice sample was provided, were its habits matched, including its dash rate?
9. Were the "When not to act" guards respected? Polish, correct-but-fancy vocabulary, quoted or discussed phrases, and isolated *weak alone* hits are not slop.
10. Are the signs of human writing preserved: concrete hard-to-fabricate detail, mixed feelings, genuine asides, varied sentence length?

## A. Staging instead of stating (1-5)

11. Every not-X-but-Y contrast, including ones split across sentences and clipped negative tails, stated as a direct claim unless the negative half corrects a belief the reader holds?
12. One-line closers that restate, rows of fragments, and repeated section closers cut or merged into a sentence with a new fact?
13. Sayings that sound deep replaced with the specific claim, and staged run-ups and fake candor openers removed?
14. Objections nobody raised and options nobody would weigh removed?

## B. Rhythm by rule (6-11)

15. Forced triads, at sentence and paragraph scale, reduced to the items the meaning needs?
16. Repeated sentence openings varied, stacked qualifiers trimmed to what the source supports, hyphenated pairs corrected, and passive or subjectless sentences given an actor?
17. Zero em dashes and zero prose-break en dashes, including spaced dashes and double hyphens, unless a voice sample overrides §8. Scan the literal characters; do not eyeball it. Dashes inside code, commands, paths, and URLs are left alone.

## C. Inflation and borrowed authority (12-18)

18. Overused AI words gone?
19. Inflated significance, stock "challenges and outlook" sections, and send-off paragraphs replaced with the last concrete fact?
20. Vague associations named as the relationship the source gives, or left vague rather than invented?
21. Shallow -ing riders, sales language, and unnamed or prestige-list authority cut unless the source supports them?
22. "Is", "are", and "has" used where "serves as", "features", and "boasts" stood?

## D. Formatting by rule (19-21)

23. Decorative bold, labeled lists with empty labels, title-case headings, emoji and arrow decoration, and stray curly quotes removed?
24. Do bullets that remain earn their place, or should they be prose?

## E. Leftovers (22-25)

25. Chatbot residue, knowledge-limit disclaimers, guesses presented as facts, headings repeated in the first sentence, and writing about the previous version removed?

## F. Writing for the writer (26-33)

26. Interpretive metadiscourse removed in both positions: the preamble announcing importance and the trailing aside assigning weight?
27. Colon reveals rewritten as plain sentences, with sentence case after any colon that remains?
28. Faux-insight setups deleted so the claim stands on its own?
29. Every project-internal noun either replaced with the plain word or glossed on first use? Could a reader who has never seen the subject paraphrase each term?
30. Is everything introduced by what it is or does before, or instead of, what it isn't?
31. Does every system action name what the person sees, does, or gets, in order? Are technical anecdotes told in the reader's words rather than the system's shorthand?
32. Does every property or feature claim carry its payoff for the reader? Is any boast left that the reader cannot use?
33. In each section, is the sentence with the most checkable content first or last, and does no section end on a maxim with nothing checkable in it?
34. If the source quotes a line that fails §3, §29, or §32, was the choice to quote it flagged rather than the quote rewritten?

## Portability

35. Does every generic sentence pass the portability test? If a sentence could move unchanged to another person, company, country, or product, it is filler. Cut it, or replace it with a fact, example, mechanism, consequence, or judgment specific to this subject and present in the source.

## Final read

36. Does the draft avoid robotic symmetry, repeated sentence shapes, and stacked punchy fragments?
37. Does it read naturally aloud, with varied sentence length?
38. Does the deliverable match the invocation mode? Pasted text gets the draft, the remaining-patterns list, and the final rewrite; file mode rewrites in place and reports a summary; embedded mode returns only the final text.

## Detect mode

39. Is each finding named by its numbered pattern, with the offending line quoted and a fix given in a few words?
40. Were clusters reported rather than isolated hits, and *weak alone* patterns reported only with company?
41. Does the response avoid rewriting the draft, scoring it, and claiming AI authorship?
