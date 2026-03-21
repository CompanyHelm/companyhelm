# Code conventions

## file structure

- keep files grouped into directories if related
- avoid directories with a lot of files, unless they are all truly unrelated
- avoid directories with a single file, doesn't make sense, just keep the file 1 level up
- keep files that are used by a particular implementation under that implementation folder e.g. /auth/providers/companyhelm/{implementation files here if only used by companyhelm implemenation}

## Object oriented programming

- everything should be a class with methods, do not have files with top level functions
- there should be only a single class in every file, file name should be related to the class name (apart from casing)
- class name should be related to the file path
- do not use abstract classes unless the pattern really supports it, prefer interfaces

## Interfaces

- everything should have a as simple as possible interface, with non-trivial documentation
- interfaces should be in their own file named {interface_name}_interface.ts
- interfaces should have comment for each method, non trivial comments need to have depth to it
- interfaces should be alongside the implemention files e.g. /auth/providers/interface.ts /auth/providers/companyehelm.ts
- omit interface file if there would be only 1 implementation of the interface, just keep the class (with comments)

## Tests

- tests should not be trivial, e.g. testing the docs is stupid and should not be done
- tests should be in a /tests directory, same level as /src directory