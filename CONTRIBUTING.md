# Contributing

## Summary

The tl;dr is:

* **Issues:** in the form of bug reports and/or feature requests are welcome
* **Pull requests:** are disabled & only for contributors
* **Third-party extensions/packages:** are gladly welcomed, & can be
  featured/discoverable on the anthologysearch.org website

## Philosophy (a.k.a "Why are PRs Disabled?")

**First:** I've been dreaming about building Anthology for almost 10 years
now. I have a pretty specific vision of what I'm trying to build: a minimalist
codebase, hyper-extensible/customizable, scalable from tiny in-memory to full-on
web-scale.

**Second:** I want to guarantee the licensing/intellectual property of the codebase.
I think licensing is important, & the freedom to be able to use a codebase
_without_ fear of lawsuit or corrupting your software's license is important.

Which leads us to **Third:** the rise of AI/LLMs. I'm only one person, and I've
been overwhelmed before when running previous open-source projects. And that was
pre-LLMs, when you had stronger guarantees that it was that person's work, and
slop was far less prevalent.

**Fourth:** The AI/LLM genie is out of the box, & it will never go back in. This
probably represents the last sizable software package I'll create in my life
without at least some LLM involvement.

## LLM Usage

For the forseeable future, LLM usage is prohibited from generating any of the
code in the Anthology core codebase (`src/`). LLMs may be used for
research/review purposes, but not for authoring the code.

LLM usage is allowable (& already being used) within the test suite (`tests/`).
Thanks, Claude!

Third-party packages are allowed to do whatever they like with LLMs.

## Issues

Issues are welcome under the following guidelines:

* If it is a bug report, there is clear information on:
  * the expected behavior
  * the actual behavior
  * how to reproduce the issue
  * the environment/versions of the software involved
* If it is a feature request:
  * there's a clear description of the desired functionality
  * there's an explanation of why it should be in core (as opposed to an
    extension)

## Pull Requests

For now, pull requests are contributor-only. This is to limit slop, reduce
maintainer burden, & guarantee the licensing/intellectual property of the
codebase.

## Third-Party Extensions/Packages

This is what I hope will be the "bread-and-butter" of the Anthology ecosphere.
The entire design is modular/extensible/pluggable, so almost everything should
be possible (& hopefully, easy-ish) via thrid-party packages.

Not only will this spread out the maintenance burden, it will keep the core of
Anthology focused & reasonably small. It will also allow the community to move
faster than the official release cycle.

And hopefully it will allow for the creation/use of all kinds of
interesting/niche applications.

## Becoming A Contributor

TBD. Effectively, there's no community, demand, or need for this yet. Likely it
will involve active engagement & proof of work in terms of third-party packages.
But let's not jump the gun right now.
