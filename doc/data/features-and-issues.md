page-title-short: features/issues
directory-index: 5

# fap-doc: features and issues

## Features

* Assertions themselves wrap those found in assert.js in the node
   distribution.
* Groups of related assertions can be grouped in test functions ("tests").
* Groups of test functions are grouped into module-like objects
   ("test-cases").
* Individual tests and test cases can be run in isolation with the use
   of command-line options.
* Individual assertion failures should not stop the whole test
   suite from completing.
* Application-level runtime errors should not
   prevent the test suite from completing.
* Weird hooks that allow it to be used for documentation generation
   with fap-doc


## Wishlist / Known Issues

* Get this tested with running many testfiles in a tree.
* Ramdomizer! (see ruby's minitest)
* Coverage testing ? (not in scope, but what's up with it?)
* @todo: decide if we should crap out of a test on assert failure.