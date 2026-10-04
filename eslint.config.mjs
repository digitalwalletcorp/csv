import globals from 'globals';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default [
  {
    ignores: [
      'eslint.config.mjs',
      '**/lib',
      '**/dest',
      '**/docs',
      '**/test'
    ]
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2015
      },
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    },
    plugins: {
      '@stylistic': stylistic
    },
    // add your custom rules here
    rules: {
      // eslint
      // [Possible Errors]
      // for-direction enforce “for” loop update clause moving the counter in the right direction.
      // getter-return enforce return statements in getters
      // no-async-promise-executor disallow using an async function as a Promise executor
      'no-async-promise-executor': 'error',
      // no-await-in-loop disallow await inside of loops
      // no-compare-neg-zero disallow comparing against -0
      // no-cond-assign disallow assignment operators in conditional expressions
      // no-console disallow the use of console
      // no-constant-condition disallow constant expressions in conditions
      // no-control-regex disallow control characters in regular expressions
      // no-debugger disallow the use of debugger
      // no-dupe-args disallow duplicate arguments in function definitions
      // no-dupe-keys disallow duplicate keys in object literals
      // no-duplicate-case disallow duplicate case labels
      // no-empty disallow empty block statements
      // no-empty-character-class disallow empty character classes in regular expressions
      // no-ex-assign disallow reassigning exceptions in catch clauses
      // no-extra-boolean-cast disallow unnecessary boolean casts
      'no-extra-boolean-cast': 'off',
      // no-extra-parens disallow unnecessary parentheses
      // no-extra-semi disallow unnecessary semicolons
      '@stylistic/no-extra-semi': 'error',
      // no-func-assign disallow reassigning function declarations
      // no-import-assign disallow assigning to imported bindings
      // no-inner-declarations disallow variable or function declarations in nested blocks
      // no-invalid-regexp disallow invalid regular expression strings in RegExp constructors
      // no-irregular-whitespace disallow irregular whitespace
      'no-irregular-whitespace': 'off', // ←文字リテラル中に全角スペースがあるとエラーになる
      // no-misleading-character-class disallow characters which are made with multiple code points in character class syntax
      // no-obj-calls disallow calling global object properties as functions
      // no-prototype-builtins disallow calling some Object.prototype methods directly on objects
      // no-regex-spaces disallow multiple spaces in regular expressions
      // no-sparse-arrays disallow sparse arrays
      // no-template-curly-in-string disallow template literal placeholder syntax in regular strings
      // no-unexpected-multiline disallow confusing multiline expressions
      // no-unreachable disallow unreachable code after return, throw, continue, and break statements
      // no-unsafe-finally disallow control flow statements in finally blocks
      // no-unsafe-negation disallow negating the left operand of relational operators
      // require-atomic-updates disallow assignments that can lead to race conditions due to usage of await or yield
      // use-isnan require calls to isNaN() when checking for NaN
      // valid-typeof enforce comparing typeof expressions against valid strings

      // [Best Practices]
      // accessor-pairs enforce getter and setter pairs in objects and classes
      // array-callback-return enforce return statements in callbacks of array methods
      // block-scoped-var enforce the use of variables within the scope they are defined
      // class-methods-use-this enforce that class methods utilize this
      // complexity enforce a maximum cyclomatic complexity allowed in a program
      // consistent-return require return statements to either always or never specify values
      'consistent-return': 'error',
      // curly enforce consistent brace style for all control statements
      curly: 'error',
      // default-case require default cases in switch statements
      'default-case': 'error',
      // default-param-last enforce default parameters to be last
      // dot-location enforce consistent newlines before and after dots
      '@stylistic/dot-location': ['error', 'property'],
      // dot-notation enforce dot notation whenever possible
      // eqeqeq require the use of === and !==
      eqeqeq: ['error', 'smart'],
      // guard-for-in require for-in loops to include an if statement
      'guard-for-in': 'error',
      // max-classes-per-file enforce a maximum number of classes per file
      // no-alert disallow the use of alert, confirm, and prompt
      'no-alert': 'error',
      // no-caller disallow the use of arguments.caller or arguments.callee
      'no-caller': 'error',
      // no-case-declarations disallow lexical declarations in case clauses
      // no-div-regex disallow division operators explicitly at the beginning of regular expressions
      // no-else-return disallow else blocks after return statements in if statements
      'no-else-return': 'error',
      // no-empty-function disallow empty functions
      // no-empty-pattern disallow empty destructuring patterns
      // no-eq-null disallow null comparisons without type-checking operators
      // no-eval disallow the use of eval()
      // no-extend-native disallow extending native types
      // no-extra-bind disallow unnecessary calls to .bind()
      // no-extra-label disallow unnecessary labels
      // no-fallthrough disallow fallthrough of case statements
      // no-floating-decimal disallow leading or trailing decimal points in numeric literals
      // no-global-assign disallow assignments to native objects or read-only global variables
      // no-implicit-coercion disallow shorthand type conversions
      // no-implicit-globals disallow variable and function declarations in the global scope
      // no-implied-eval disallow the use of eval()-like methods
      // no-invalid-this disallow this keywords outside of classes or class-like objects
      // no-iterator disallow the use of the __iterator__ property
      // no-labels disallow labeled statements
      // no-lone-blocks disallow unnecessary nested blocks
      // no-loop-func disallow function declarations that contain unsafe references inside loop statements
      // no-magic-numbers disallow magic numbers
      // no-multi-spaces disallow multiple spaces
      '@stylistic/no-multi-spaces': 'off',
      // no-multi-str disallow multiline strings
      'no-multi-str': 'error',
      // no-new disallow new operators outside of assignments or comparisons
      // no-new-func disallow new operators with the Function object
      // no-new-wrappers disallow new operators with the String, Number, and Boolean objects
      // no-octal disallow octal literals
      // no-octal-escape disallow octal escape sequences in string literals
      // no-param-reassign disallow reassigning function parameters
      // no-proto disallow the use of the __proto__ property
      'no-proto': 'error',
      // no-redeclare disallow variable redeclaration
      'no-redeclare': 'off',
      // no-restricted-properties disallow certain properties on certain objects
      // no-return-assign disallow assignment operators in return statements
      // no-return-await disallow unnecessary return await
      // no-script-url disallow javascript: urls
      // no-self-assign disallow assignments where both sides are exactly the same
      // no-self-compare disallow comparisons where both sides are exactly the same
      'no-self-compare': 'error',
      // no-sequences disallow comma operators
      // no-throw-literal disallow throwing literals as exceptions
      // no-unmodified-loop-condition disallow unmodified loop conditions
      // no-unused-expressions disallow unused expressions
      // no-unused-labels disallow unused labels
      // no-useless-call disallow unnecessary calls to .call() and .apply()
      // no-useless-catch disallow unnecessary catch clauses
      // no-useless-concat disallow unnecessary concatenation of literals or template literals
      'no-useless-concat': 'error',
      // no-useless-escape disallow unnecessary escape characters
      // no-useless-return disallow redundant return statements
      // no-void disallow void operators
      // no-warning-comments disallow specified warning terms in comments
      // no-with disallow with statements
      // prefer-named-capture-group enforce using named capture group in regular expression
      // prefer-promise-reject-errors require using Error objects as Promise rejection reasons
      // prefer-regex-literals disallow use of the RegExp constructor in favor of regular expression literals
      // radix enforce the consistent use of the radix argument when using parseInt()
      // require-await disallow async functions which have no await expression
      // require-unicode-regexp enforce the use of u flag on RegExp
      // vars-on-top require var declarations be placed at the top of their containing scope
      // wrap-iife require parentheses around immediate function invocations
      // yoda require or disallow “Yoda” conditions

      // [Strict Mode]
      // strict require or disallow strict mode directives

      // [Variables]
      // init-declarations require or disallow initialization in variable declarations
      // no-delete-var disallow deleting variables
      // no-label-var disallow labels that share a name with a variable
      // no-restricted-globals disallow specified global variables
      // no-shadow disallow variable declarations from shadowing variables declared in the outer scope
      // no-shadow-restricted-names disallow identifiers from shadowing restricted names
      // no-undef disallow the use of undeclared variables unless mentioned in /*global */ comments
      // no-undef-init disallow initializing variables to undefined
      // no-undefined disallow the use of undefined as an identifier
      // no-unused-vars disallow unused variables
      // no-use-before-define disallow the use of variables before they are defined

      // [Node.js and CommonJS]
      // callback-return require return statements after callbacks
      // global-require require require() calls to be placed at top-level module scope
      // handle-callback-err require error handling in callbacks
      // no-buffer-constructor disallow use of the Buffer() constructor
      // no-mixed-requires disallow require calls to be mixed with regular variable declarations
      // no-new-require disallow new operators with calls to require
      // no-path-concat disallow string concatenation with __dirname and __filename
      // no-process-env disallow the use of process.env
      // no-process-exit disallow the use of process.exit()
      // no-restricted-modules disallow specified modules when loaded by require
      // no-sync disallow synchronous methods

      // [Stylistic Issues]
      // array-bracket-newline enforce linebreaks after opening and before closing array brackets
      // array-bracket-spacing enforce consistent spacing inside array brackets
      // array-element-newline enforce line breaks after each array element
      // block-spacing disallow or enforce spaces inside of blocks after opening block and before closing block
      '@stylistic/block-spacing': ['error', 'always'],
      // brace-style enforce consistent brace style for blocks
      '@stylistic/brace-style': 'off',
      // camelcase enforce camelcase naming convention
      camelcase: 'off',
      // capitalized-comments enforce or disallow capitalization of the first letter of a comment
      // comma-dangle require or disallow trailing commas
      '@stylistic/comma-dangle': ['error', 'never'],
      // comma-spacing enforce consistent spacing before and after commas
      '@stylistic/comma-spacing': [
        'error',
        {
          before: false,
          after: true
        }
      ],
      // comma-style enforce consistent comma style
      '@stylistic/comma-style': ['error', 'last'],
      // computed-property-spacing enforce consistent spacing inside computed property brackets
      // consistent-this enforce consistent naming when capturing the current execution context
      // eol-last require or disallow newline at the end of files
      '@stylistic/eol-last': ['error', 'always'],
      // func-call-spacing require or disallow spacing between function identifiers and their invocations
      // func-name-matching require function names to match the name of the variable or property to which they are assigned
      // func-names require or disallow named function expressions
      // func-style enforce the consistent use of either function declarations or expressions
      // function-call-argument-newline enforce line breaks between arguments of a function call
      // function-paren-newline enforce consistent line breaks inside function parentheses
      // id-blacklist disallow specified identifiers
      // id-length enforce minimum and maximum identifier lengths
      // id-match require identifiers to match a specified regular expression
      // implicit-arrow-linebreak enforce the location of arrow function bodies
      // indent enforce consistent indentation
      '@stylistic/indent': ['error', 2, { 'SwitchCase': 1 }],
      // jsx-quotes enforce the consistent use of either double or single quotes in JSX attributes
      // key-spacing enforce consistent spacing between keys and values in object literal properties
      '@stylistic/key-spacing': [
        'error',
        {
          beforeColon: false,
          afterColon: true,
          mode: 'strict'
        }
      ],
      // keyword-spacing enforce consistent spacing before and after keywords
      '@stylistic/keyword-spacing': [
        'error',
        {
          before: true,
          after: true
        }
      ],
      // line-comment-position enforce position of line comments
      // linebreak-style enforce consistent linebreak style
      // lines-around-comment require empty lines around comments
      // lines-between-class-members require or disallow an empty line between class members
      // max-depth enforce a maximum depth that blocks can be nested
      // max-len enforce a maximum line length
      // max-lines enforce a maximum number of lines per file
      // max-lines-per-function enforce a maximum number of line of code in a function
      // max-nested-callbacks enforce a maximum depth that callbacks can be nested
      // max-params enforce a maximum number of parameters in function definitions
      // max-statements enforce a maximum number of statements allowed in function blocks
      // max-statements-per-line enforce a maximum number of statements allowed per line
      // multiline-comment-style enforce a particular style for multiline comments
      // multiline-ternary enforce newlines between operands of ternary expressions
      // new-cap require constructor names to begin with a capital letter
      // new-parens enforce or disallow parentheses when invoking a constructor with no arguments
      // newline-per-chained-call require a newline after each call in a method chain
      // no-array-constructor disallow Array constructors
      // no-bitwise disallow bitwise operators
      // no-continue disallow continue statements
      // no-inline-comments disallow inline comments after code
      // no-lonely-if disallow if statements as the only statement in else blocks
      // no-mixed-operators disallow mixed binary operators
      // no-mixed-spaces-and-tabs disallow mixed spaces and tabs for indentation
      '@stylistic/no-mixed-spaces-and-tabs': 'error',
      // no-multi-assign disallow use of chained assignment expressions
      // no-multiple-empty-lines disallow multiple empty lines
      '@stylistic/no-multiple-empty-lines': [
        'error',
        {
          max: 1
        }
      ],
      // no-negated-condition disallow negated conditions
      // no-nested-ternary disallow nested ternary expressions
      // no-object-constructor disallow calls to the Object constructor without an argument
      'no-object-constructor': 'error',
      // no-plusplus disallow the unary operators ++ and --
      // no-restricted-syntax disallow specified syntax
      // no-tabs disallow all tabs
      // no-ternary disallow ternary operators
      // no-trailing-spaces disallow trailing whitespace at the end of lines
      '@stylistic/no-trailing-spaces': 'error',
      // no-underscore-dangle disallow dangling underscores in identifiers
      'no-underscore-dangle': 'error',
      // no-unneeded-ternary disallow ternary operators when simpler alternatives exist
      'no-unneeded-ternary': 'error',
      // no-whitespace-before-property disallow whitespace before properties
      // nonblock-statement-body-position enforce the location of single-line statements
      // object-curly-newline enforce consistent line breaks inside braces
      // object-curly-spacing enforce consistent spacing inside braces
      '@stylistic/object-curly-spacing': ['error', 'always'],
      // object-property-newline enforce placing object properties on separate lines
      // one-var enforce variables to be declared either together or separately in functions
      // one-var-declaration-per-line require or disallow newlines around variable declarations
      // operator-assignment require or disallow assignment operator shorthand where possible
      // operator-linebreak enforce consistent linebreak style for operators
      // padded-blocks require or disallow padding within blocks
      // padding-line-between-statements require or disallow padding lines between statements
      // prefer-object-spread disallow using Object.assign with an object literal as the first argument and prefer the use of object spread instead.
      // quote-props require quotes around object literal property names
      // quotes enforce the consistent use of either backticks, double, or single quotes
      '@stylistic/quotes': ['error', 'single', {
        avoidEscape: true,
        allowTemplateLiterals: 'always'
      }],
      // semi require or disallow semicolons instead of ASI
      // semi-spacing enforce consistent spacing before and after semicolons
      '@stylistic/semi-spacing': 'error',
      // semi-style enforce location of semicolons
      // sort-keys require object keys to be sorted
      // sort-vars require variables within the same declaration block to be sorted
      // space-before-blocks enforce consistent spacing before blocks
      '@stylistic/space-before-blocks': ['error', 'always'],
      // space-before-function-paren enforce consistent spacing before function definition opening parenthesis
      '@stylistic/space-before-function-paren': ['error', {
        anonymous: 'never',
        named: 'never',
        asyncArrow: 'always'
      }],
      // space-in-parens enforce consistent spacing inside parentheses
      // space-infix-ops require spacing around infix operators
      '@stylistic/space-infix-ops': 'error',
      // space-unary-ops enforce consistent spacing before or after unary operators
      // spaced-comment enforce consistent spacing after the // or /* in a comment
      '@stylistic/spaced-comment': ['error', 'always', { 'exceptions': ['-', '+', '/'] }],
      // switch-colon-spacing enforce spacing around colons of switch statements
      // template-tag-spacing require or disallow spacing between template tags and their literals
      // unicode-bom require or disallow Unicode byte order mark (BOM)
      // wrap-regex require parenthesis around regex literals

      // [ECMAScript 6]
      // arrow-body-style require braces around arrow function bodies
      // arrow-parens require parentheses around arrow function arguments
      // arrow-spacing enforce consistent spacing before and after the arrow in arrow functions
      // constructor-super require super() calls in constructors
      // generator-star-spacing enforce consistent spacing around * operators in generator functions
      '@stylistic/generator-star-spacing': ['error', 'both'],
      // no-class-assign disallow reassigning class members
      // no-confusing-arrow disallow arrow functions where they could be confused with comparisons
      // no-const-assign disallow reassigning const variables
      // no-dupe-class-members disallow duplicate class members
      // no-duplicate-imports disallow duplicate module imports
      // no-new-symbol disallow new operators with the Symbol object
      // no-restricted-imports disallow specified modules when loaded by import
      // no-this-before-super disallow this/super before calling super() in constructors
      // no-useless-computed-key disallow unnecessary computed property keys in object literals
      // no-useless-constructor disallow unnecessary constructors
      // no-useless-rename disallow renaming import, export, and destructured assignments to the same name
      // no-var require let or const instead of var
      'no-var': 'error',
      // object-shorthand require or disallow method and property shorthand syntax for object literals
      // prefer-arrow-callback require using arrow functions for callbacks
      // prefer-const require const declarations for variables that are never reassigned after declared
      'prefer-const': 'error',
      // prefer-destructuring require destructuring from arrays and/or objects
      // prefer-numeric-literals disallow parseInt() and Number.parseInt() in favor of binary, octal, and hexadecimal literals
      // prefer-rest-params require rest parameters instead of arguments
      // prefer-spread require spread operators instead of .apply()
      // prefer-template require template literals instead of string concatenation
      // require-yield require generator functions to contain yield
      // rest-spread-spacing enforce spacing between rest and spread operators and their expressions
      // sort-imports enforce sorted import declarations within modules
      // symbol-description require symbol descriptions
      // template-curly-spacing require or disallow spacing around embedded expressions of template strings
      // yield-star-spacing require or disallow spacing around the * in yield* expressions

      // typescript
      // see 'https://www.npmjs.com/package/@typescript-eslint/eslint-plugin'
      '@typescript-eslint/no-explicit-any': 'off',
      // @typescript-eslint/adjacent-overload-signatures	Require that member overloads be consecutive
      // @typescript-eslint/array-type	Requires using either T[] or Array<T> for arrays
      // @typescript-eslint/await-thenable	Disallows awaiting a value that is not a Thenable
      // @typescript-eslint/ban-ts-ignore	Bans “// @ts-ignore” comments from being used
      // @typescript-eslint/ban-types	Bans specific types from being used
      // @typescript-eslint/brace-style	Enforce consistent brace style for blocks
      // @typescript-eslint/camelcase	Enforce camelCase naming convention
      // @typescript-eslint/class-name-casing	Require PascalCased class and interface names
      // @typescript-eslint/consistent-type-assertions	Enforces consistent usage of type assertions.
      // @typescript-eslint/consistent-type-definitions	Consistent with type definition either interface or type
      // @typescript-eslint/explicit-function-return-type	Require explicit return types on functions and class methods
      '@typescript-eslint/explicit-function-return-type': 'off',
      // @typescript-eslint/explicit-member-accessibility	Require explicit accessibility modifiers on class properties and methods
      // @typescript-eslint/func-call-spacing	Require or disallow spacing between function identifiers and their invocations
      // @typescript-eslint/generic-type-naming	Enforces naming of generic type variables
      // @typescript-eslint/indent	Enforce consistent indentation
      // @typescript-eslint/interface-name-prefix	Require that interface names should or should not prefixed with I
      // @typescript-eslint/member-delimiter-style	Require a specific member delimiter style for interfaces and type literals
      // @typescript-eslint/member-naming	Enforces naming conventions for class members by visibility
      // @typescript-eslint/member-ordering	Require a consistent member declaration order
      '@typescript-eslint/naming-convention': 'off', // 変数名がすべて小文字にされてしまう問題が発生。原因がこのルールなのか未確認。
      // @typescript-eslint/no-array-constructor	Disallow generic Array constructors
      '@typescript-eslint/no-array-constructor': 'warn',
      // @typescript-eslint/no-empty-function	Disallow empty functions
      // @typescript-eslint/no-empty-interface	Disallow the declaration of empty interfaces
      '@typescript-eslint/no-empty-interface': 'off',
      // @typescript-eslint/no-empty-object-type	Disallow accidentally using the "empty object" type
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }],
      // @typescript-eslint/no-explicit-any	Disallow usage of the any type
      // @typescript-eslint/no-extra-parens	Disallow unnecessary parentheses
      '@stylistic/no-extra-parens': [ 'error', 'all', { 'nestedBinaryExpressions': false } ],
      // @typescript-eslint/no-extraneous-class	Forbids the use of classes as namespaces
      // @typescript-eslint/no-floating-promises	Requires Promise-like values to be handled appropriately.
      '@typescript-eslint/no-floating-promises': 'error',
      // @typescript-eslint/no-for-in-array	Disallow iterating over an array with a for-in loop
      // @typescript-eslint/no-inferrable-types	Disallows explicit type declarations for variables or parameters initialized to a number, string, or boolean
      '@typescript-eslint/no-inferrable-types': 0, // 'off'が効かないので0を指定
      // @typescript-eslint/no-magic-numbers	Disallows magic numbers
      // @typescript-eslint/no-misused-new	Enforce valid definition of new and constructor
      // @typescript-eslint/no-misused-promises	Avoid using promises in places not designed to handle them
      // @typescript-eslint/no-namespace	Disallow the use of custom TypeScript modules and namespaces
      // @typescript-eslint/no-non-null-assertion	Disallows non-null assertions using the ! postfix operator
      '@typescript-eslint/no-non-null-assertion': 'off',
      // @typescript-eslint/no-parameter-properties	Disallow the use of parameter properties in class constructors
      // @typescript-eslint/no-require-imports	Disallows invocation of require()
      // @typescript-eslint/no-this-alias	Disallow aliasing this
      // @typescript-eslint/no-type-alias	Disallow the use of type aliases
      // @typescript-eslint/no-unnecessary-condition	Prevents conditionals where the type is always truthy or always falsy
      // @typescript-eslint/no-unnecessary-qualifier	Warns when a namespace qualifier is unnecessary
      // @typescript-eslint/no-unnecessary-type-arguments	Warns if an explicitly specified type argument is the default for that type parameter
      // @typescript-eslint/no-unnecessary-type-assertion	Warns if a type assertion does not change the type of an expression
      // @typescript-eslint/no-unused-expressions	Disallow unused expressions
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true
        }
      ],
      // @typescript-eslint/no-unused-vars	Disallow unused variables
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      // @typescript-eslint/no-use-before-define	Disallow the use of variables before they are defined
      // @typescript-eslint/no-useless-constructor	Disallow unnecessary constructors
      // @typescript-eslint/no-var-requires	Disallows the use of require statements except in import statements
      '@typescript-eslint/no-var-requires': 'off',
      // @typescript-eslint/prefer-for-of	Prefer a ‘for-of’ loop over a standard ‘for’ loop if the index is only used to access the array being iterated
      // @typescript-eslint/prefer-function-type	Use function types instead of interfaces with call signatures
      // @typescript-eslint/prefer-includes	Enforce includes method over indexOf method
      // @typescript-eslint/prefer-namespace-keyword	Require the use of the namespace keyword instead of the module keyword to declare custom TypeScript modules
      // @typescript-eslint/prefer-readonly	Requires that private members are marked as readonly if they're never modified outside of the constructor
      // @typescript-eslint/prefer-regexp-exec	Prefer RegExp#exec() over String#match() if no global flag is provided
      // @typescript-eslint/prefer-string-starts-ends-with	Enforce the use of String#startsWith and String#endsWith instead of other equivalent methods of checking substrings
      // @typescript-eslint/promise-function-async	Requires any function or method that returns a Promise to be marked async
      // @typescript-eslint/quotes	Enforce the consistent use of either backticks, double, or single quotes
      // @typescript-eslint/require-array-sort-compare	Enforce giving compare argument to Array#sort
      // @typescript-eslint/require-await	Disallow async functions which have no await expression
      // @typescript-eslint/restrict-plus-operands	When adding two variables, operands must both be of type number or of type string
      // @typescript-eslint/semi	Require or disallow semicolons instead of ASI
      '@stylistic/semi': 'error',
      // @typescript-eslint/strict-boolean-expressions	Restricts the types allowed in boolean expressions
      // @typescript-eslint/triple-slash-reference	Sets preference level for triple slash directives versus ES6-style import declarations
      // @typescript-eslint/type-annotation-spacing	Require consistent spacing around type annotations
      // @typescript-eslint/typedef	Requires type annotations to exist
      // @typescript-eslint/unbound-method	Enforces unbound methods are called with their expected scope
      // @typescript-eslint/unified-signatures Warns for any two overloads that could be unified into one by using a union or an optional/rest parameter
      '@typescript-eslint/no-redeclare': 'error',

      'no-console': 'warn',
      'no-debugger': 'warn',

      // custom rules
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExpressionStatement > CallExpression[callee.type="MemberExpression"][callee.property.name=/^(catch|then|finally)$/]',
          message: 'Always explicitly mark asynchronous operations that are not awaited by prefixing them with `void`.'
        }
      ]
    }
  }
];
