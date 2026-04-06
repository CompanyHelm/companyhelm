# Code conventions

## Language
- only use typescript, no javascript
- do not normalize strings unless strictly necessary
- do not check for null if the method/constructor argument is non-null in TS

## file structure

- keep files grouped into directories if related
- avoid directories with a lot of files, unless they are all truly unrelated
- avoid directories with a single file, doesn't make sense, just keep the file 1 level up
- keep files that are used by a particular implementation under that implementation folder e.g. /auth/providers/companyhelm/{implementation files here if only used by companyhelm implemenation}
- do not repeate the directory name in the file name, it is reduntant e.g. config/config_loader.ts should be config/loader.ts

## Object oriented programming

- everything should be a class with methods, do not have files with top level functions
- there should be only a single class in every file, file name should be related to the class name (apart from casing)
- class name should be related to the file path
- do not use abstract classes unless the pattern really supports it, prefer interfaces. Or if you are binding an interface, prefer abstract class so type is present at runtime
- every class should have non trivial comments to explain what is the class doing

## Interfaces

- everything should have a as simple as possible interface, with non-trivial documentation
- interfaces should be in their own file named {interface_name}_interface.ts
- interfaces should have comment for each method, non trivial comments need to have depth to it
- interfaces should be alongside the implemention files e.g. /auth/providers/provider_interface.ts /auth/providers/companyehelm.ts
- omit interface file if there would be only 1 implementation of the interface, just keep the class (with comments)

## Tests

- tests should not be trivial, e.g. testing the docs is stupid and should not be done
- tests should be in a /tests directory, same level as /src directory

## Graphql

- each resolver should be in its own file, under graphql/resolvers. Resolver file should not contain reduntant names like resolver since it is still part of directory.
- each mutation should be in its own file, under grpahql/mutations. Mutation file should not contain reduntant names like mutation since it is still part of directory.

## Packages
- do not implement something that could be handled by a npm package, e.g. graphql calls do not implement a custom client, check what the best npm package is and propose adding it to the user

# Application specific instructions
- read the apps/*/AGENTS.md when making changes to the specific apps e.g. web or api and follow the instructions in the specific AGENTS.md
- app specific instructions are additonal from this AGENTS.md

# Comments
- Add comments to any non trivial logic
- Do not add comments if code is self explanatory