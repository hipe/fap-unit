# Introducing fap-unit

#### _what the world needs now_

At the time of this writing the tests included in node.js were insufficient for my needs and the needs of my body.

This is a stand-in for a testing framework that 'feels' right.
Till we find one, this.
It will either be abandoned for or assimiliate the features
of other node.js unit testing frameworks.
But I did not have the time to find/make
the perfect framework when I needed to start writing stuff.

It's becoming a rough attempt at duplicating a small subset of the
feel of ruby test-unit, within its set of [features](features-and-issues.html).



## Usage

Here is a basic example: in a file `test/test-foo.js`:

    (see: test/all/"basic usage"/story)


Run it from the command line:

    $ node test/test-foo.js

You will see the output:

    (see: test/all/"basic usage"/output)

