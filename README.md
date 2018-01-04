# Brailliant 

Brailliant is a VS Code extension allowing you to document the code with images rendered as Braille art,
i.e., art made up of Braille characters.

## Workflow

In the code where you wish to insert some brailliant comment write

```
// <ba "arrival.jpg" s=0.2 wc=0.4>
```

This line instructs the extension to pick up `arrival.jpg` in the same directory as the file you're documenting,
scale it to `0.2` of its original size, cut some shades of gray and insert the art directly after the `ba`-tag.

![](https://github.com/quicky84/brailliant/workflow.gif)

## Parameters
- `w` Resize image to width `w`, other side, if not specified, is resized proportionally.
- `h` Resize image to height `w`, other side, if not specified, is resized proportionally.
- `s` Rescale image. Scale takes precedence over `w` and `h`.
- `wc` White cutoff, `0` represents white, `1` represents black, shades of gray below `wc` will be dropped.
- `ws` Whitespace, any alphanumeric symbol. By default `ws` is the empty Braille glyph.