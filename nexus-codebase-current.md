# Nexus Codebase Dump - 2026-08-04

## File: eslint.config.mjs
````
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

````

## File: next.config.ts
````
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

````

## File: package-lock.json
````
{
  "name": "nexus",
  "version": "0.1.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "nexus",
      "version": "0.1.0",
      "dependencies": {
        "@supabase/supabase-js": "^2.49.1",
        "@tiptap/core": "3.27.1",
        "@tiptap/extension-drag-handle": "3.27.1",
        "@tiptap/extension-highlight": "3.27.1",
        "@tiptap/extension-image": "3.27.1",
        "@tiptap/extension-link": "3.27.1",
        "@tiptap/extension-mathematics": "3.27.1",
        "@tiptap/extension-node-range": "3.27.1",
        "@tiptap/extension-placeholder": "3.27.1",
        "@tiptap/extension-table": "^3.27.1",
        "@tiptap/extension-task-item": "^3.27.1",
        "@tiptap/extension-task-list": "3.27.1",
        "@tiptap/extension-text-align": "3.27.1",
        "@tiptap/extension-text-style": "3.27.1",
        "@tiptap/extension-typography": "3.27.1",
        "@tiptap/extension-underline": "3.27.1",
        "@tiptap/react": "^3.29.2",
        "@tiptap/starter-kit": "3.27.1",
        "idb": "^8.0.3",
        "katex": "^0.16.11",
        "nanoid": "^5.1.16",
        "next": "16.2.9",
        "react": "19.2.4",
        "react-dom": "19.2.4"
      },
      "devDependencies": {
        "@tailwindcss/postcss": "^4",
        "@types/node": "^20",
        "@types/react": "^19",
        "@types/react-dom": "^19",
        "eslint": "^9",
        "eslint-config-next": "16.2.9",
        "tailwindcss": "^4",
        "typescript": "^5"
      }
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.2.0.tgz",
      "integrity": "sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@babel/code-frame": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.7.tgz",
      "integrity": "sha512-Aup7aUOfpbAUg2ROOJN6Iw5f9DMBlzu0mIkm/malLQFN/YQgO48wCj0Kxa3sEHJvPVFg7siR+qRInwXd2qhQKw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.29.7",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.1.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.29.7.tgz",
      "integrity": "sha512-locTkQyKvwIEgBzVrn8693ebc97F2U8ZHjbXwDXJ5Fn2TCpNwTlKcaKLkdHop5c/icOFE7qt7Q9JC5hnKNa6Gg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.29.7.tgz",
      "integrity": "sha512-RgHBCvtjbOK2gXSNBNIkNoEc9qoVEtau3hj8gEqKQuL3HZAibKarWFEI3Lfm6EYKkLalOh8eSrj9b+ch9H/VBA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/generator": "^7.29.7",
        "@babel/helper-compilation-targets": "^7.29.7",
        "@babel/helper-module-transforms": "^7.29.7",
        "@babel/helpers": "^7.29.7",
        "@babel/parser": "^7.29.7",
        "@babel/template": "^7.29.7",
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7",
        "@jridgewell/remapping": "^2.3.5",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.29.7.tgz",
      "integrity": "sha512-DkXD5OJQaAQIdZ1bt3UZdEnHAn9Imd3IVBdX03UFe+ony9Ojw5pzr9YVKGDY1jt+Gcn/FnGkNf8r+Vj5NOJWtQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.29.7",
        "@babel/types": "^7.29.7",
        "@jridgewell/gen-mapping": "^0.3.12",
        "@jridgewell/trace-mapping": "^0.3.28",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.29.7.tgz",
      "integrity": "sha512-wem6WaBj4NaVYVdNhLPPVacES6ZJ+KBBfSkTMD3YZxbP3rm3Di85tJU5ljaUNhaOynt+Aj0xruhYuzQBt8n71g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.29.7",
        "@babel/helper-validator-option": "^7.29.7",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-globals": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-globals/-/helper-globals-7.29.7.tgz",
      "integrity": "sha512-3nQVUAtvkKH9zahfWgw96Jc/uFOmjACE1kQz82E2lqWmHBgjzbNlsC22nuQTfahmWeQtTq5nQ/4Nnd2A1wj4zA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.29.7.tgz",
      "integrity": "sha512-ejHwrQQYcm9xnTivShn2IDOlIzInN34AXskvq9QicvCtEzq1Vzclu/tKF8Jq1Cg8JG2GL6/EmjgsCT7lXepE3g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.29.7.tgz",
      "integrity": "sha512-UPUVSyXbOh627KiCIGQSgwWzGeBKLkaJ9PJEdrngIwMSzxLR4jS4+f1f1jb7VzBbg8nFLaYotvVPFCTqdrmTAg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.29.7",
        "@babel/helper-validator-identifier": "^7.29.7",
        "@babel/traverse": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.29.7.tgz",
      "integrity": "sha512-Pb5ijPrZ89GDH8223L4UP8i6QApWxs04RbPQJTeWDV0/keR2E36MeKnyr6LYmUUvqRRI+Iv87SuF1W6ErINzYw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.29.7.tgz",
      "integrity": "sha512-qehxGkRj55h/ff8EMaJ+cYhyaKlHIxqYDn682wQD7RNp9UujOQsHog2uS0r2vzr4pW+sXf90NeeayjcNaX3fFg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.29.7.tgz",
      "integrity": "sha512-N9ZErrD+yW5geCDtBqnOoxmR8+tNKiGuxKlDpuJxfsqpa2dFcexaziGAE/qoHLiDDreVNMupxGmSoNlyvsA3gw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helpers": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helpers/-/helpers-7.29.7.tgz",
      "integrity": "sha512-1k2lAGRMfHTcwuNYcCNUmaUffmQv8KWMfh2iJUUeRlwlwH4FdNG7mfPI10NPfLHJFThE4Tyr4mv7kTNZOiPuBg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/template": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.29.7.tgz",
      "integrity": "sha512-hnORnjP/1P/zFEndoeX+n+t1RwWRJiJpM/jO7FW32Kn9r5+sJB2JWOdYo4L6k78j15eCwY3Gm/7364B1EMwtNg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.29.7"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/template": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/template/-/template-7.29.7.tgz",
      "integrity": "sha512-puq+Gf35oI24FeN11LkoUQFqv9uwNeWpxXZi/Ji3rRIoKAzKnxRaZ+Gkj0vKS9ZCiTESfng1N9LyOyXvo+m+Gg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/parser": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/traverse": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/traverse/-/traverse-7.29.7.tgz",
      "integrity": "sha512-EhlfNQtZ+NK22w5BM61ciuiq1m58ed33Wr1Xan//ZRTy6hgjnwyCffRYwzsGXdASJSUJ1guZILsErh1eQcl+zw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/generator": "^7.29.7",
        "@babel/helper-globals": "^7.29.7",
        "@babel/parser": "^7.29.7",
        "@babel/template": "^7.29.7",
        "@babel/types": "^7.29.7",
        "debug": "^4.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/types": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/types/-/types-7.29.7.tgz",
      "integrity": "sha512-4zBIxpPzowiZpusoFkyGVwakdRJUyuH5PxQ/PrqghfdFWWasvnCdPfQXHrenDai+gyLARulZjZowCOj6fjT4pA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-string-parser": "^7.29.7",
        "@babel/helper-validator-identifier": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@emnapi/core": {
      "version": "1.10.0",
      "resolved": "https://registry.npmjs.org/@emnapi/core/-/core-1.10.0.tgz",
      "integrity": "sha512-yq6OkJ4p82CAfPl0u9mQebQHKPJkY7WrIuk205cTYnYe+k2Z8YBh11FrbRG/H6ihirqcacOgl2BIO8oyMQLeXw==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/wasi-threads": "1.2.1",
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@emnapi/runtime": {
      "version": "1.11.3",
      "resolved": "https://registry.npmjs.org/@emnapi/runtime/-/runtime-1.11.3.tgz",
      "integrity": "sha512-Xz4Tpyki7XyrpbUK1jR1AhdAdaXyhhY4lZ3neLodmhpuWfy2PAQN5B46sAiU4liOXGLkHypn/qU+jvfWSCYYLA==",
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@emnapi/wasi-threads": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@emnapi/wasi-threads/-/wasi-threads-1.2.1.tgz",
      "integrity": "sha512-uTII7OYF+/Mes/MrcIOYp5yOtSMLBWSIoLPpcgwipoiKbli6k322tcoFsxoIIxPDqW01SQGAgko4EzZi2BNv2w==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@eslint-community/eslint-utils": {
      "version": "4.10.1",
      "resolved": "https://registry.npmjs.org/@eslint-community/eslint-utils/-/eslint-utils-4.10.1.tgz",
      "integrity": "sha512-cuadcxVFE8sDK6iWJbs8Sn0av2Nrh2QSGQhVlBW9AaAHqHwjWsZHT8LJ4hFGPh7ASBV2deFdM7H/DPjulmh8rg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "eslint-visitor-keys": "^3.4.3"
      },
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      },
      "peerDependencies": {
        "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0"
      }
    },
    "node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint-community/regexpp": {
      "version": "4.12.2",
      "resolved": "https://registry.npmjs.org/@eslint-community/regexpp/-/regexpp-4.12.2.tgz",
      "integrity": "sha512-EriSTlt5OC9/7SXkRSCAhfSxxoSUgBm33OH+IkwbdpgoqsSsUg7y3uh+IICI/Qg4BBWr3U2i39RpmycbxMq4ew==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^12.0.0 || ^14.0.0 || >=16.0.0"
      }
    },
    "node_modules/@eslint/config-array": {
      "version": "0.21.2",
      "resolved": "https://registry.npmjs.org/@eslint/config-array/-/config-array-0.21.2.tgz",
      "integrity": "sha512-nJl2KGTlrf9GjLimgIru+V/mzgSK0ABCDQRvxw5BjURL7WfH5uoWmizbH7QB6MmnMBd8cIC9uceWnezL1VZWWw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/object-schema": "^2.1.7",
        "debug": "^4.3.1",
        "minimatch": "^3.1.5"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/config-helpers": {
      "version": "0.4.2",
      "resolved": "https://registry.npmjs.org/@eslint/config-helpers/-/config-helpers-0.4.2.tgz",
      "integrity": "sha512-gBrxN88gOIf3R7ja5K9slwNayVcZgK6SOUORm2uBzTeIEfeVaIhOpCtTox3P6R7o2jLFwLFTLnC7kU/RGcYEgw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.17.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/core": {
      "version": "0.17.0",
      "resolved": "https://registry.npmjs.org/@eslint/core/-/core-0.17.0.tgz",
      "integrity": "sha512-yL/sLrpmtDaFEiUj1osRP4TI2MDz1AddJL+jZ7KSqvBuliN4xqYY54IfdN8qD8Toa6g1iloph1fxQNkjOxrrpQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@types/json-schema": "^7.0.15"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/eslintrc": {
      "version": "3.3.6",
      "resolved": "https://registry.npmjs.org/@eslint/eslintrc/-/eslintrc-3.3.6.tgz",
      "integrity": "sha512-l2Ul9PrHsPCKcEY/ac7VgFj9D80C7S68sOKc618SyHDPK36s1XcFebXY0iTzUVn4Yq+YbwvSnDmCz9yxjX+QrA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ajv": "^6.14.0",
        "debug": "^4.3.2",
        "espree": "^10.0.1",
        "globals": "^14.0.0",
        "ignore": "^5.2.0",
        "import-fresh": "^3.2.1",
        "js-yaml": "^4.3.0",
        "minimatch": "^3.1.5",
        "strip-json-comments": "^3.1.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint/js": {
      "version": "9.39.5",
      "resolved": "https://registry.npmjs.org/@eslint/js/-/js-9.39.5.tgz",
      "integrity": "sha512-QywQuszQh77pIXCsq998c8hbhSTI/azTty1Z6N53dmAudKHhy573j3yvRLsX2BSp8YpLtoCEG8E9DJe+8zUh4A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      }
    },
    "node_modules/@eslint/object-schema": {
      "version": "2.1.7",
      "resolved": "https://registry.npmjs.org/@eslint/object-schema/-/object-schema-2.1.7.tgz",
      "integrity": "sha512-VtAOaymWVfZcmZbp6E2mympDIHvyjXs/12LqWYjVw6qjrfF+VK+fyG33kChz3nnK+SU5/NeHOqrTEHS8sXO3OA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/plugin-kit": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/@eslint/plugin-kit/-/plugin-kit-0.4.1.tgz",
      "integrity": "sha512-43/qtrDUokr7LJqoF2c3+RInu/t4zfrpYdoSDfYyhg52rwLV6TnOvdG4fXm7IkSB3wErkcmJS9iEhjVtOSEjjA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.17.0",
        "levn": "^0.4.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@floating-ui/core": {
      "version": "1.8.0",
      "resolved": "https://registry.npmjs.org/@floating-ui/core/-/core-1.8.0.tgz",
      "integrity": "sha512-0CIZ5itps/8x7BG8dEIhs53BvCUH2PCoogtakwRTut+Arm58sJooJ0AuZhLw2HJYIR5cMLNPBSS728sPho2khQ==",
      "license": "MIT",
      "dependencies": {
        "@floating-ui/utils": "^0.2.12"
      }
    },
    "node_modules/@floating-ui/dom": {
      "version": "1.8.0",
      "resolved": "https://registry.npmjs.org/@floating-ui/dom/-/dom-1.8.0.tgz",
      "integrity": "sha512-yXSrzeHZBTZadLOlfyhCkJHNeLJnHRnRInwdZ40L7ZiaAtrBwoYlsDrX3v5zB1Utk7CLfzcOVnVVWoXEky7Ceg==",
      "license": "MIT",
      "dependencies": {
        "@floating-ui/core": "^1.8.0",
        "@floating-ui/utils": "^0.2.12"
      }
    },
    "node_modules/@floating-ui/utils": {
      "version": "0.2.12",
      "resolved": "https://registry.npmjs.org/@floating-ui/utils/-/utils-0.2.12.tgz",
      "integrity": "sha512-HpCo8tmWzLVad5s2d19EhAz5zqrrQ6s69qd6moPMQvkOuSwDT1YgRfWSVuc4ennqrgv3OHppiOGMQ7oC13yIww==",
      "license": "MIT"
    },
    "node_modules/@humanfs/core": {
      "version": "0.19.2",
      "resolved": "https://registry.npmjs.org/@humanfs/core/-/core-0.19.2.tgz",
      "integrity": "sha512-UhXNm+CFMWcbChXywFwkmhqjs3PRCmcSa/hfBgLIb7oQ5HNb1wS0icWsGtSAUNgefHeI+eBrA8I1fxmbHsGdvA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/types": "^0.15.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/node": {
      "version": "0.16.8",
      "resolved": "https://registry.npmjs.org/@humanfs/node/-/node-0.16.8.tgz",
      "integrity": "sha512-gE1eQNZ3R++kTzFUpdGlpmy8kDZD/MLyHqDwqjkVQI0JMdI1D51sy1H958PNXYkM2rAac7e5/CnIKZrHtPh3BQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/core": "^0.19.2",
        "@humanfs/types": "^0.15.0",
        "@humanwhocodes/retry": "^0.4.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/types": {
      "version": "0.15.0",
      "resolved": "https://registry.npmjs.org/@humanfs/types/-/types-0.15.0.tgz",
      "integrity": "sha512-ZZ1w0aoQkwuUuC7Yf+7sdeaNfqQiiLcSRbfI08oAxqLtpXQr9AIVX7Ay7HLDuiLYAaFPu8oBYNq/QIi9URHJ3Q==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanwhocodes/module-importer": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/module-importer/-/module-importer-1.0.1.tgz",
      "integrity": "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=12.22"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@humanwhocodes/retry": {
      "version": "0.4.3",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.4.3.tgz",
      "integrity": "sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@img/colour": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@img/colour/-/colour-1.1.0.tgz",
      "integrity": "sha512-Td76q7j57o/tLVdgS746cYARfSyxk8iEfRxewL9h4OMzYhbW4TAcppl0mT4eyqXddh6L/jwoM75mo7ixa/pCeQ==",
      "license": "MIT",
      "optional": true,
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@img/sharp-darwin-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-arm64/-/sharp-darwin-arm64-0.34.5.tgz",
      "integrity": "sha512-imtQ3WMJXbMY4fxb/Ndp6HBTNVtWCUI0WdobyheGf5+ad6xX8VIDO8u2xE4qc/fr08CKG/7dDseFtn6M6g/r3w==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-arm64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-darwin-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-darwin-x64/-/sharp-darwin-x64-0.34.5.tgz",
      "integrity": "sha512-YNEFAF/4KQ/PeW0N+r+aVVsoIY0/qxxikF2SWdp+NRkmMB7y9LBZAVqQ4yhGCm/H3H270OSykqmQMKLBhBJDEw==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-darwin-x64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-libvips-darwin-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-arm64/-/sharp-libvips-darwin-arm64-1.2.4.tgz",
      "integrity": "sha512-zqjjo7RatFfFoP0MkQ51jfuFZBnVE2pRiaydKJ1G/rHZvnsrHAOcQALIi9sA5co5xenQdTugCvtb1cuf78Vf4g==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-darwin-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-darwin-x64/-/sharp-libvips-darwin-x64-1.2.4.tgz",
      "integrity": "sha512-1IOd5xfVhlGwX+zXv2N93k0yMONvUlANylbJw1eTah8K/Jtpi15KC+WSiaX/nBmbm2HxRM1gZ0nSdjSsrZbGKg==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "darwin"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-arm": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-arm/-/sharp-libvips-linux-arm-1.2.4.tgz",
      "integrity": "sha512-bFI7xcKFELdiNCVov8e44Ia4u2byA+l3XtsAj+Q8tfCwO6BQ8iDojYdvoPMqsKDkuoOo+X6HZA0s0q11ANMQ8A==",
      "cpu": [
        "arm"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-arm64/-/sharp-libvips-linux-arm64-1.2.4.tgz",
      "integrity": "sha512-excjX8DfsIcJ10x1Kzr4RcWe1edC9PquDRRPx3YVCvQv+U5p7Yin2s32ftzikXojb1PIFc/9Mt28/y+iRklkrw==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-ppc64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-ppc64/-/sharp-libvips-linux-ppc64-1.2.4.tgz",
      "integrity": "sha512-FMuvGijLDYG6lW+b/UvyilUWu5Ayu+3r2d1S8notiGCIyYU/76eig1UfMmkZ7vwgOrzKzlQbFSuQfgm7GYUPpA==",
      "cpu": [
        "ppc64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-riscv64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-riscv64/-/sharp-libvips-linux-riscv64-1.2.4.tgz",
      "integrity": "sha512-oVDbcR4zUC0ce82teubSm+x6ETixtKZBh/qbREIOcI3cULzDyb18Sr/Wcyx7NRQeQzOiHTNbZFF1UwPS2scyGA==",
      "cpu": [
        "riscv64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-s390x": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-s390x/-/sharp-libvips-linux-s390x-1.2.4.tgz",
      "integrity": "sha512-qmp9VrzgPgMoGZyPvrQHqk02uyjA0/QrTO26Tqk6l4ZV0MPWIW6LTkqOIov+J1yEu7MbFQaDpwdwJKhbJvuRxQ==",
      "cpu": [
        "s390x"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linux-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linux-x64/-/sharp-libvips-linux-x64-1.2.4.tgz",
      "integrity": "sha512-tJxiiLsmHc9Ax1bz3oaOYBURTXGIRDODBqhveVHonrHJ9/+k89qbLl0bcJns+e4t4rvaNBxaEZsFtSfAdquPrw==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linuxmusl-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-arm64/-/sharp-libvips-linuxmusl-arm64-1.2.4.tgz",
      "integrity": "sha512-FVQHuwx1IIuNow9QAbYUzJ+En8KcVm9Lk5+uGUQJHaZmMECZmOlix9HnH7n1TRkXMS0pGxIJokIVB9SuqZGGXw==",
      "cpu": [
        "arm64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-libvips-linuxmusl-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@img/sharp-libvips-linuxmusl-x64/-/sharp-libvips-linuxmusl-x64-1.2.4.tgz",
      "integrity": "sha512-+LpyBk7L44ZIXwz/VYfglaX/okxezESc6UxDSoyo2Ks6Jxc4Y7sGjpgU9s4PMgqgjj1gZCylTieNamqA1MF7Dg==",
      "cpu": [
        "x64"
      ],
      "license": "LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "linux"
      ],
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-linux-arm": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-arm/-/sharp-linux-arm-0.34.5.tgz",
      "integrity": "sha512-9dLqsvwtg1uuXBGZKsxem9595+ujv0sJ6Vi8wcTANSFpwV/GONat5eCkzQo/1O6zRIkh0m/8+5BjrRr7jDUSZw==",
      "cpu": [
        "arm"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-arm": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-arm64/-/sharp-linux-arm64-0.34.5.tgz",
      "integrity": "sha512-bKQzaJRY/bkPOXyKx5EVup7qkaojECG6NLYswgktOZjaXecSAeCWiZwwiFf3/Y+O1HrauiE3FVsGxFg8c24rZg==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-arm64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-ppc64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-ppc64/-/sharp-linux-ppc64-0.34.5.tgz",
      "integrity": "sha512-7zznwNaqW6YtsfrGGDA6BRkISKAAE1Jo0QdpNYXNMHu2+0dTrPflTLNkpc8l7MUP5M16ZJcUvysVWWrMefZquA==",
      "cpu": [
        "ppc64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-ppc64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-riscv64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-riscv64/-/sharp-linux-riscv64-0.34.5.tgz",
      "integrity": "sha512-51gJuLPTKa7piYPaVs8GmByo7/U7/7TZOq+cnXJIHZKavIRHAP77e3N2HEl3dgiqdD/w0yUfiJnII77PuDDFdw==",
      "cpu": [
        "riscv64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-riscv64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-s390x": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-s390x/-/sharp-linux-s390x-0.34.5.tgz",
      "integrity": "sha512-nQtCk0PdKfho3eC5MrbQoigJ2gd1CgddUMkabUj+rBevs8tZ2cULOx46E7oyX+04WGfABgIwmMC0VqieTiR4jg==",
      "cpu": [
        "s390x"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-s390x": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linux-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linux-x64/-/sharp-linux-x64-0.34.5.tgz",
      "integrity": "sha512-MEzd8HPKxVxVenwAa+JRPwEC7QFjoPWuS5NZnBt6B3pu7EG2Ge0id1oLHZpPJdn3OQK+BQDiw9zStiHBTJQQQQ==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linux-x64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linuxmusl-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linuxmusl-arm64/-/sharp-linuxmusl-arm64-0.34.5.tgz",
      "integrity": "sha512-fprJR6GtRsMt6Kyfq44IsChVZeGN97gTD331weR1ex1c1rypDEABN6Tm2xa1wE6lYb5DdEnk03NZPqA7Id21yg==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linuxmusl-arm64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-linuxmusl-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-linuxmusl-x64/-/sharp-linuxmusl-x64-0.34.5.tgz",
      "integrity": "sha512-Jg8wNT1MUzIvhBFxViqrEhWDGzqymo3sV7z7ZsaWbZNDLXRJZoRGrjulp60YYtV4wfY8VIKcWidjojlLcWrd8Q==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-libvips-linuxmusl-x64": "1.2.4"
      }
    },
    "node_modules/@img/sharp-wasm32": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-wasm32/-/sharp-wasm32-0.34.5.tgz",
      "integrity": "sha512-OdWTEiVkY2PHwqkbBI8frFxQQFekHaSSkUIJkwzclWZe64O1X4UlUjqqqLaPbUpMOQk6FBu/HtlGXNblIs0huw==",
      "cpu": [
        "wasm32"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later AND MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/runtime": "^1.7.0"
      },
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-arm64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-arm64/-/sharp-win32-arm64-0.34.5.tgz",
      "integrity": "sha512-WQ3AgWCWYSb2yt+IG8mnC6Jdk9Whs7O0gxphblsLvdhSpSTtmu69ZG1Gkb6NuvxsNACwiPV6cNSZNzt0KPsw7g==",
      "cpu": [
        "arm64"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-ia32": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-ia32/-/sharp-win32-ia32-0.34.5.tgz",
      "integrity": "sha512-FV9m/7NmeCmSHDD5j4+4pNI8Cp3aW+JvLoXcTUo0IqyjSfAZJ8dIUmijx1qaJsIiU+Hosw6xM5KijAWRJCSgNg==",
      "cpu": [
        "ia32"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@img/sharp-win32-x64": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/@img/sharp-win32-x64/-/sharp-win32-x64-0.34.5.tgz",
      "integrity": "sha512-+29YMsqY2/9eFEiW93eqWnuLcWcufowXewwSNIT6UwZdUUCrM3oFjMWH/Z6/TMmb4hlFenmfAVbpWeup2jryCw==",
      "cpu": [
        "x64"
      ],
      "license": "Apache-2.0 AND LGPL-3.0-or-later",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.13",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/remapping": {
      "version": "2.3.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/remapping/-/remapping-2.3.5.tgz",
      "integrity": "sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.5.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.5.tgz",
      "integrity": "sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.31",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.31.tgz",
      "integrity": "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@napi-rs/wasm-runtime": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@napi-rs/wasm-runtime/-/wasm-runtime-1.2.1.tgz",
      "integrity": "sha512-KjZdi8Q1wh89gsVmghvbrMgWl6ZWmRmHV6wjB7/g4Zf0dyO+hH3neZUtuDNPO00qq5YE5RITVWvrIZKRaAmzGQ==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@tybys/wasm-util": "^0.10.3"
      },
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=23.5.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/Brooooooklyn"
      },
      "peerDependencies": {
        "@emnapi/core": "^1.7.1 || ^2.0.0-alpha.3",
        "@emnapi/runtime": "^1.7.1 || ^2.0.0-alpha.3"
      }
    },
    "node_modules/@next/env": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/@next/env/-/env-16.2.9.tgz",
      "integrity": "sha512-ki5VxxXfzD/9TDe13wyeTKIjQTAwBVpnr8KhRDUr8ltMUq1/NBpWNT5tiPoxiGl+PHM4X2ahSOiPk6iAimIzPg==",
      "license": "MIT"
    },
    "node_modules/@next/eslint-plugin-next": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/@next/eslint-plugin-next/-/eslint-plugin-next-16.2.9.tgz",
      "integrity": "sha512-UZi8+YT/MLgTC9nrrn2Xd4lBYv1B7lVmtWHfPcthAI5Tt/C1LuDe6DfmtCtJ+WQod3ksY4VrKSvk3oMVAnL7qw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-glob": "3.3.1"
      }
    },
    "node_modules/@next/swc-darwin-arm64": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/@next/swc-darwin-arm64/-/swc-darwin-arm64-16.2.9.tgz",
      "integrity": "sha512-HkfxNYUCmcct0Xsqib5KxqMSHV4AHJq857BNRchyBDs4YS19aHzVfn1kDuBYKqLLQBjXgnkIsjV2Kd4d2wzYhw==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-darwin-x64": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/@next/swc-darwin-x64/-/swc-darwin-x64-16.2.9.tgz",
      "integrity": "sha512-7IAtK4MeybpqRV9GRABWEhJ62mOS+rzWOzOTFie4cSEtm12xsoOMJRcECoZx3FHPzFAqN/IJtHqWAFOLfl152w==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-arm64-gnu": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-gnu/-/swc-linux-arm64-gnu-16.2.9.tgz",
      "integrity": "sha512-hBD75iWpUtkL9SmQmcRhmLomn9jgkPzCEkbOcLgHymPEKzv+6ONy13RRiIEz/iEObjkS2Jlb5gYS2XGoS3X4rw==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-arm64-musl": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-arm64-musl/-/swc-linux-arm64-musl-16.2.9.tgz",
      "integrity": "sha512-qZTI3pf9SGc/obr8NkQAekBxmp1QK+kVm+VAf3BALLfFAj+1kUhkTxmrWpVos9R/UYIA8AWX2p6cGI5WdwzVUA==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-x64-gnu": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-gnu/-/swc-linux-x64-gnu-16.2.9.tgz",
      "integrity": "sha512-xm0HfRNX+UkH4R3c18ynswjj5o5uEj/7iI9p9omdtTSIsRCzQqkGMA+10nzJ4EHnYC3as65IMhbbl5fWRUWHYg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-linux-x64-musl": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/@next/swc-linux-x64-musl/-/swc-linux-x64-musl-16.2.9.tgz",
      "integrity": "sha512-QumimHkGEG6vM3PfEDWKyKen03NcqLOkeKB1EfcPe7VxzmEiCa4jNnMyBn/US5zcd/VE1CI+O8Ovb3lfjVHfGw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-win32-arm64-msvc": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/@next/swc-win32-arm64-msvc/-/swc-win32-arm64-msvc-16.2.9.tgz",
      "integrity": "sha512-hzQpKZvw8rAwI6A2uQh6SacCSvNAXaIkPNsWwzqqfRiIMiXMfH936skDhz1OO6KpvdKkJrgHHtqQOq5PIXOvdQ==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@next/swc-win32-x64-msvc": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/@next/swc-win32-x64-msvc/-/swc-win32-x64-msvc-16.2.9.tgz",
      "integrity": "sha512-qr2VL3Ce5QrwgO2yh1ujSBawrimjVKX8FGF/cOynmdYKJY0BdHpGVNIRK1tqONB10Vkm25Ub1BD2bkjWs4+96w==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/@nodelib/fs.scandir": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.scandir/-/fs.scandir-2.1.5.tgz",
      "integrity": "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "2.0.5",
        "run-parallel": "^1.1.9"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.stat": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.stat/-/fs.stat-2.0.5.tgz",
      "integrity": "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.walk": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.walk/-/fs.walk-1.2.8.tgz",
      "integrity": "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.scandir": "2.1.5",
        "fastq": "^1.6.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nolyfill/is-core-module": {
      "version": "1.0.39",
      "resolved": "https://registry.npmjs.org/@nolyfill/is-core-module/-/is-core-module-1.0.39.tgz",
      "integrity": "sha512-nn5ozdjYQpUCZlWGuxcJY/KpxkWQs4DcbMCmKojjyrYDEAGy4Ce19NN4v5MduafTwJlbKc99UA8YhSVqq9yPZA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.4.0"
      }
    },
    "node_modules/@rtsao/scc": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@rtsao/scc/-/scc-1.1.0.tgz",
      "integrity": "sha512-zt6OdqaDoOnJ1ZYsCYGt9YmWzDXl4vQdKTyJev62gFhRGKdx7mcT54V9KIjg+d2wi9EXsPvAPKe7i7WjfVWB8g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@supabase/auth-js": {
      "version": "2.111.0",
      "resolved": "https://registry.npmjs.org/@supabase/auth-js/-/auth-js-2.111.0.tgz",
      "integrity": "sha512-hbRLgyQZEX0SDyF4LYXpv94qOIQyFATfpT5SIs2V0SisHnisVRkYgiPQWzv80l4S2mO3qof78rmoH9j5zoFsYQ==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=22.0.0"
      }
    },
    "node_modules/@supabase/functions-js": {
      "version": "2.111.0",
      "resolved": "https://registry.npmjs.org/@supabase/functions-js/-/functions-js-2.111.0.tgz",
      "integrity": "sha512-RW/OCsd6MO592zU8ifzP8/f8XzxxIdpb+Up5XaOtE26Fw+3zTp475WX7+GuuktiD1WF8pFUDe6khUPbMp77RCw==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=22.0.0"
      }
    },
    "node_modules/@supabase/phoenix": {
      "version": "0.4.5",
      "resolved": "https://registry.npmjs.org/@supabase/phoenix/-/phoenix-0.4.5.tgz",
      "integrity": "sha512-aAn9H9ovVyeApKy11OWOrrOGq8DV68yWeH4ud2lN9fzn4aO8Zb5GLL9m1pUg9nLqIcT+ZDfAcsZe0E/nqdv2lw==",
      "license": "MIT"
    },
    "node_modules/@supabase/postgrest-js": {
      "version": "2.111.0",
      "resolved": "https://registry.npmjs.org/@supabase/postgrest-js/-/postgrest-js-2.111.0.tgz",
      "integrity": "sha512-pcqeDsnWP0lx9GawduYxNZJHeuTm53O7L0SC8RF8tniV3GWIPY6me6OTdnwzdwNUmNy1dzUVtSyIfE6+OflzPQ==",
      "license": "MIT",
      "dependencies": {
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=22.0.0"
      }
    },
    "node_modules/@supabase/realtime-js": {
      "version": "2.111.0",
      "resolved": "https://registry.npmjs.org/@supabase/realtime-js/-/realtime-js-2.111.0.tgz",
      "integrity": "sha512-6oRf/vZyRwg8f8GbFSJkrD2w4HAu/yTvyMViHXHS+H5hNJzdXCrUR7cP5oW7daT3YlRnzRPY9LcGSJKZAmfMSg==",
      "license": "MIT",
      "dependencies": {
        "@supabase/phoenix": "0.4.5",
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=22.0.0"
      }
    },
    "node_modules/@supabase/storage-js": {
      "version": "2.111.0",
      "resolved": "https://registry.npmjs.org/@supabase/storage-js/-/storage-js-2.111.0.tgz",
      "integrity": "sha512-UEViNmTzVOxE8dqUA81wls+n9xgmlvSFfhfwo6QxrO4kQOytCYyw3ciYFoi4XoD4Jl95NJ3jnndHN5iIudWzqw==",
      "license": "MIT",
      "dependencies": {
        "iceberg-js": "^0.8.1",
        "tslib": "2.8.1"
      },
      "engines": {
        "node": ">=22.0.0"
      }
    },
    "node_modules/@supabase/supabase-js": {
      "version": "2.111.0",
      "resolved": "https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.111.0.tgz",
      "integrity": "sha512-9q0/AULthQnWeiDh1vGyjoJZbSY04bu6qHcWit70pqEYn5Kv/dkCPY62Ja1123jEnJbB9Vd2pjY7Kvk/lK3peA==",
      "license": "MIT",
      "dependencies": {
        "@supabase/auth-js": "2.111.0",
        "@supabase/functions-js": "2.111.0",
        "@supabase/postgrest-js": "2.111.0",
        "@supabase/realtime-js": "2.111.0",
        "@supabase/storage-js": "2.111.0"
      },
      "engines": {
        "node": ">=22.0.0"
      }
    },
    "node_modules/@swc/helpers": {
      "version": "0.5.15",
      "resolved": "https://registry.npmjs.org/@swc/helpers/-/helpers-0.5.15.tgz",
      "integrity": "sha512-JQ5TuMi45Owi4/BIMAJBoSQoOJu12oOk/gADqlcUL9JEdHB8vyjUSsxqeNXnmXHjYKMi2WcYtezGEEhqUI/E2g==",
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.8.0"
      }
    },
    "node_modules/@tailwindcss/node": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/node/-/node-4.3.3.tgz",
      "integrity": "sha512-/T8IKEsf9VTU6tLjgC7+sv2mOPtQxzE2jMw7u4Tt40Tx+QSZxpzh95/H6cMKoja9XuW7iMdLJYBB0o9G1CaAgg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/remapping": "^2.3.5",
        "enhanced-resolve": "^5.24.1",
        "jiti": "^2.7.0",
        "lightningcss": "1.32.0",
        "magic-string": "^0.30.21",
        "source-map-js": "^1.2.1",
        "tailwindcss": "4.3.3"
      }
    },
    "node_modules/@tailwindcss/oxide": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide/-/oxide-4.3.3.tgz",
      "integrity": "sha512-krXjAikiaFSPaK/FkAQT5UTx3VormQaiZ5hBFlJZ9UFQGB/rwg1MZIhHAG9smMQRTdyJxP6Qt5MwMtdyU5FWrA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 20"
      },
      "optionalDependencies": {
        "@tailwindcss/oxide-android-arm64": "4.3.3",
        "@tailwindcss/oxide-darwin-arm64": "4.3.3",
        "@tailwindcss/oxide-darwin-x64": "4.3.3",
        "@tailwindcss/oxide-freebsd-x64": "4.3.3",
        "@tailwindcss/oxide-linux-arm-gnueabihf": "4.3.3",
        "@tailwindcss/oxide-linux-arm64-gnu": "4.3.3",
        "@tailwindcss/oxide-linux-arm64-musl": "4.3.3",
        "@tailwindcss/oxide-linux-x64-gnu": "4.3.3",
        "@tailwindcss/oxide-linux-x64-musl": "4.3.3",
        "@tailwindcss/oxide-wasm32-wasi": "4.3.3",
        "@tailwindcss/oxide-win32-arm64-msvc": "4.3.3",
        "@tailwindcss/oxide-win32-x64-msvc": "4.3.3"
      }
    },
    "node_modules/@tailwindcss/oxide-android-arm64": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-android-arm64/-/oxide-android-arm64-4.3.3.tgz",
      "integrity": "sha512-Y85A2gmPSkl5Ve5qR86GL4HT509cFqQh1aes9p3sSkyTPwt0Pppf3GkwGe4JPACcRYjgJIEhQgM6dBClnr0NYw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-darwin-arm64": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-arm64/-/oxide-darwin-arm64-4.3.3.tgz",
      "integrity": "sha512-BiaWatpBcERQFDlOjRDpIVXuFK5PJez5SA4JMg6VYZdBYU+qKfV/vqjcIs+IYmtitf1xYQZTwXvU/8y4lfZUGw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-darwin-x64": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-x64/-/oxide-darwin-x64-4.3.3.tgz",
      "integrity": "sha512-fAeUqfV5ndhxRwai8cXGzdLvul9utWOmeTkv69unv4ZXixjn61Z+p9lCWdwOwA3TYboG3BwdVuN/RDjhBRl0mw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-freebsd-x64": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-freebsd-x64/-/oxide-freebsd-x64-4.3.3.tgz",
      "integrity": "sha512-iyf5bV6+wnAlflVeEy7R25dupxTNECZN5QMI0qNT6eT+EgaGdZcKhGkr5SdoaWiLJ3spLqIY9VCeSGrwmtg4kw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm-gnueabihf": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm-gnueabihf/-/oxide-linux-arm-gnueabihf-4.3.3.tgz",
      "integrity": "sha512-aAYUprJAJQWWbRrPvtjdroZ56Md+JM8pMiopS6xGEwDfLhqj+2ver2p4nU4Mb3CRqcMmNBjo8KkUgcxhkzVQGQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm64-gnu": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm64-gnu/-/oxide-linux-arm64-gnu-4.3.3.tgz",
      "integrity": "sha512-nDxldcEENOxZRzC2uu9jrutZdAAQtb+8WWDCSnWL1zvBk1+FN+x6MtDViPB5AJMfttVCUhehGWus3XBPgatM/w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-arm64-musl": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm64-musl/-/oxide-linux-arm64-musl-4.3.3.tgz",
      "integrity": "sha512-Md44bD6veX/PC5iyF8cDVnw4HBIANZepRZZ7a8DQOvkfo5WUBwcp6iAuCUz23u+4SUkhJlD3eL7hNdW8ezd/kA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-x64-gnu": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-gnu/-/oxide-linux-x64-gnu-4.3.3.tgz",
      "integrity": "sha512-tx7us1muwOKAKWao2v/GaafFeQboE6aj88vC6ziN2NCGcRm8gWUhwjzg+YdVB1e4boAtdtma4L43onunI6NS4w==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-linux-x64-musl": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-musl/-/oxide-linux-x64-musl-4.3.3.tgz",
      "integrity": "sha512-SJxX60smvHgasZoBy11dX6YRjXJFovwWBoedhbQPOBzgFWBHGB+TVPWB9BxzR7TTxU8FQZAI2AyiNCMzFm8Img==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-wasm32-wasi": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-wasm32-wasi/-/oxide-wasm32-wasi-4.3.3.tgz",
      "integrity": "sha512-jx1+rPhY/5Ympkktd656HBWEBLxP7dH06losBLjjf5vgCODXvi9KhtftWcMIwTFIDqBr7cRnQkdLnAG+IOlGvQ==",
      "bundleDependencies": [
        "@napi-rs/wasm-runtime",
        "@emnapi/core",
        "@emnapi/runtime",
        "@tybys/wasm-util",
        "@emnapi/wasi-threads",
        "tslib"
      ],
      "cpu": [
        "wasm32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/core": "^1.11.1",
        "@emnapi/runtime": "^1.11.1",
        "@emnapi/wasi-threads": "^1.2.2",
        "@napi-rs/wasm-runtime": "^1.1.4",
        "@tybys/wasm-util": "^0.10.2",
        "tslib": "^2.8.1"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@tailwindcss/oxide-win32-arm64-msvc": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-arm64-msvc/-/oxide-win32-arm64-msvc-4.3.3.tgz",
      "integrity": "sha512-3rc292Ca2ceK6Ulcc/bAVnTs/3nDtoPhyEKlgPv+yQJQi/JS/AMJlqzxvlDacL1nekbrcf6bTqp/jV4qgnPxNQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/oxide-win32-x64-msvc": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-x64-msvc/-/oxide-win32-x64-msvc-4.3.3.tgz",
      "integrity": "sha512-yJ0pwIVc/nYeGoV02WtsN8KYyLQv7kyI2wDnkezyJlGGjkd4QLwDGAwl47YpPJeuI0M0ObaXGSPjvWDPeTPggw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/@tailwindcss/postcss": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/@tailwindcss/postcss/-/postcss-4.3.3.tgz",
      "integrity": "sha512-JTSZZGQi1AyKirbLN3azmjVzef92tcX7h+iSqPdaeStyFpGpDlKvvpxeOE8njhbUanbRwr3z8DyzhICWnMtQeg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@alloc/quick-lru": "^5.2.0",
        "@tailwindcss/node": "4.3.3",
        "@tailwindcss/oxide": "4.3.3",
        "postcss": "^8.5.16",
        "tailwindcss": "4.3.3"
      }
    },
    "node_modules/@tiptap/core": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/core/-/core-3.27.1.tgz",
      "integrity": "sha512-rV6Qn4wmC6BxfF+4mu6bqGWj9vA4oXXhsrpXaJL2uhjxeHAGofjwcHof2X84VYzeyXgdlsGmqKie4TAppVXZUQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/pm": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-blockquote": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-blockquote/-/extension-blockquote-3.29.2.tgz",
      "integrity": "sha512-ca4OzKDh0yaxg2+Z56bC2QnWsNsFp2YMRfVig1PDXyMVFMNJpLcnhxgq/9btn+xYAlYrj8RymOeCTYREOR6Zjg==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2",
        "@tiptap/pm": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-bold": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-bold/-/extension-bold-3.29.2.tgz",
      "integrity": "sha512-elYbGxJsYnBb4leqrcjdIJuiG380BcOgN+UUzvOv+qEjfGVzHodFOMBl3qnmD6urYHNu5/qQK2S0qSSRXKCLNQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-bubble-menu": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-bubble-menu/-/extension-bubble-menu-3.29.2.tgz",
      "integrity": "sha512-kzcWarcpr031rZu+R3Hzut5uxb3Qj/xxMDEYZIQ3uiq1yb5vEMXj8/SIyWautk6Nu8Rr1leV3rGdR4NzhzyFAA==",
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@floating-ui/dom": "^1.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2",
        "@tiptap/pm": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-code": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-code/-/extension-code-3.29.2.tgz",
      "integrity": "sha512-c6W5UGuB7WNLpYocsgRzpO2OOTI4QjaI9jjHRMuty9z+s9DtaYM/HrRLNwVh6MopkHb+i/89Wkv8gCS34fftig==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-code-block": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-code-block/-/extension-code-block-3.29.2.tgz",
      "integrity": "sha512-w153ct8g6dLiPTdXQ6SOIMxX4SEo5Q50AmjdEEEcJ7ZcYUcde/ScSskLHfOYmyt5ZFAiyEwr121+pux+p3/oAQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2",
        "@tiptap/pm": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-collaboration": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-collaboration/-/extension-collaboration-3.27.1.tgz",
      "integrity": "sha512-Da7WeKNIaLsbcHBWlgexMgm5ygoA1mhRroFND1vweLNsWIPxvyjci7jrq/uDN1tSnpqMlJsdyW0tXzbVGYTpMw==",
      "license": "MIT",
      "peer": true,
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1",
        "@tiptap/pm": "3.27.1",
        "@tiptap/y-tiptap": "^3.0.5",
        "yjs": "^13"
      }
    },
    "node_modules/@tiptap/extension-document": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-document/-/extension-document-3.29.2.tgz",
      "integrity": "sha512-YUamvefLnsqu6124GavVTI7nqcFlQJ12ROB0oSwG69eSBZYNjg1tIs05LFrBxkwf4Xgqd6YzfJ9+FeG428RvzQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-drag-handle": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-drag-handle/-/extension-drag-handle-3.27.1.tgz",
      "integrity": "sha512-DGzthoQEgPPbbwy/tY314AF1SV/1gIGQYlU/R6GWxegc7h/5/Qp1SopjguyuZwoO5BPwyBZXa9J/f58MeHQOWw==",
      "license": "MIT",
      "dependencies": {
        "@floating-ui/dom": "^1.6.13"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1",
        "@tiptap/extension-collaboration": "3.27.1",
        "@tiptap/extension-node-range": "3.27.1",
        "@tiptap/pm": "3.27.1",
        "@tiptap/y-tiptap": "^3.0.5"
      }
    },
    "node_modules/@tiptap/extension-floating-menu": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-floating-menu/-/extension-floating-menu-3.29.2.tgz",
      "integrity": "sha512-CBTq4Xs5aGWr65uFCIkKBms796OhmirWf/ax//iJ4fl9IfwqjwFuc2vQs9PmuwpKn9ctDHo2sMTtvyeCvIt5LQ==",
      "license": "MIT",
      "optional": true,
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@floating-ui/dom": "^1.0.0",
        "@tiptap/core": "3.29.2",
        "@tiptap/pm": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-hard-break": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-hard-break/-/extension-hard-break-3.29.2.tgz",
      "integrity": "sha512-eUW3LN3fq8rXnjEUeI3D2QONYdLsU3yYQm4jxlErs2h4cfwrFjgf19VSUFVmm6LrFbbQ0OnDVPeVLL6iOwDw2w==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-heading": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-heading/-/extension-heading-3.29.2.tgz",
      "integrity": "sha512-6W4aIy70Mh7BNlbG9zZ5FBLhJhU2UUEzgZJ/jwYSCcB30o8McLxJSEjhtoHiX8R78Ah2/JzBGvIe5olZlbeE4A==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-highlight": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-highlight/-/extension-highlight-3.27.1.tgz",
      "integrity": "sha512-IeMIUKbW4oyRkgn92BPYQ0fifkbTwVigKwa107nGDHMokz+pHQPFHy8xG3U7gtUOra/8OUo57bFgNGuP0TaH4A==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-horizontal-rule": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-horizontal-rule/-/extension-horizontal-rule-3.29.2.tgz",
      "integrity": "sha512-8/ZPzbB9X85Mc9/7xVLZupQKBr2UVcQTGr512xtqMW+XkCQRHCph46tRo828YE13IMWI5fWn/FaNCqXG9cULSw==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2",
        "@tiptap/pm": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-image": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-image/-/extension-image-3.27.1.tgz",
      "integrity": "sha512-+JTahgQT+NxiGjduaB3qJVyhU/wh4m3pVkht1Earioku2bm/apj5Lb8rSowa/NJYP3B+oQgV/V4YLw5dtDgBoA==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-italic": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-italic/-/extension-italic-3.29.2.tgz",
      "integrity": "sha512-iH63V/5wsaMnY4Jz0+meaAGhaec4AiOzOduzl6ZZr5IyGhZ1kthyW84ELt0dyLI3hNceAUhaNWc+I7+vX0aoXA==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-link": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-link/-/extension-link-3.27.1.tgz",
      "integrity": "sha512-/2jBfsxBZUDGJmpZifqRQPz7f1E5qpS1BckTZ39TADzUJX+feKy7RJ3DtQ02+8y6SSMzvP9loGVjrk6zEMTk4g==",
      "license": "MIT",
      "dependencies": {
        "linkifyjs": "^4.3.3"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1",
        "@tiptap/pm": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-list": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-list/-/extension-list-3.27.1.tgz",
      "integrity": "sha512-c2Upru7lj0/ZV/Ibww6cNz6sUS8m6Dp/9uygFhYcZOd3X8M0xBIEk42c6m6SQehkPziVA8QOgNJz7sMqsbz1OQ==",
      "license": "MIT",
      "peer": true,
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1",
        "@tiptap/pm": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-mathematics": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-mathematics/-/extension-mathematics-3.27.1.tgz",
      "integrity": "sha512-LClcd0f5LNHObq4fyBoHuZCWWtVjdHA5UdCpWCSdegC3kcuNhZQp/uey8mzPZXKUb73XDYvzjdhFz2UCRHH1Lw==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1",
        "@tiptap/pm": "3.27.1",
        "katex": "^0.16.4"
      }
    },
    "node_modules/@tiptap/extension-node-range": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-node-range/-/extension-node-range-3.27.1.tgz",
      "integrity": "sha512-30OkvZA2+mtupOSihSyRyRAgoVP+RHXs0AT/2DCWc3NHwg+SHo/OrB/S5zsOW9p74Q+6V3hd1K3Nw6Qp9F9M0Q==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1",
        "@tiptap/pm": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-paragraph": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-paragraph/-/extension-paragraph-3.29.2.tgz",
      "integrity": "sha512-7qJj5YTr11vvjNgjDN1ypOfwTovc0QOCYcit/rskeuVgnmQZOZQzC/BbyKLLG7UGnpRLemU/mEGbW9pAqjAXkQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-placeholder": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-placeholder/-/extension-placeholder-3.27.1.tgz",
      "integrity": "sha512-lhcNDcczQ75yJOSywCHb58Hmtg1aPL/2TdYmeLPxVrP048D7rRs133sfONcgyyw0AvhnfmPOkHLTv3QtKSowhw==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/extensions": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-strike": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-strike/-/extension-strike-3.29.2.tgz",
      "integrity": "sha512-aEvLAbddUQZ+FukCreV3q4G2HfNI+odE7E9U+wbq6XsSWKyo8/pDu1muz+TFKNre4blSMOQ3JQmw5UeHDKy+fg==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-table": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-table/-/extension-table-3.27.1.tgz",
      "integrity": "sha512-tNB8kjxo0+XPremnWkd6NUikpeJ+JQrss7HntL8GgIxX4t0gkdnLn9yUWb0JzcaYP7Y8iTZZHdkPs0P154DG8Q==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1",
        "@tiptap/pm": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-task-item": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-task-item/-/extension-task-item-3.27.1.tgz",
      "integrity": "sha512-HxS85Xqlf9voWpqW6yJNExjnqy9AcQbvL7K41gzKUIaXZdNxAyEkUg7wve7WAd7AUPI9yrS9WONplhmq7pWuJw==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/extension-list": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-task-list": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-task-list/-/extension-task-list-3.27.1.tgz",
      "integrity": "sha512-5LaJU3q/O6S1aNe9uj/VbZ7uS8G9mJMvJGNm/wRGyR3HcZtHAcFsPh9+woylQvUThD0qO9OMeGXkgqRSE+ayuA==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/extension-list": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-text": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-text/-/extension-text-3.29.2.tgz",
      "integrity": "sha512-Ubko45JWWHe8glBt2PiGNF8hcbys/JNalFhiR7Y1X4iOOtAxAKJJxh3+eq+//NTlGuBPdWGp7zw8EEUp7anjKA==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2"
      }
    },
    "node_modules/@tiptap/extension-text-align": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-text-align/-/extension-text-align-3.27.1.tgz",
      "integrity": "sha512-EXawuJBO55wd8WcTbHTMoPhv0CGQxza4yCCPB5Hqz4ZPQwahIr3ej+8yp/kimIl0xokabwZ0/Fu8STQ4AkZv5g==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-text-style": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-text-style/-/extension-text-style-3.27.1.tgz",
      "integrity": "sha512-J48WIl+6YDYTFPhWXUBQk+u7+AKVUqTdvrZOQyPYCGuQMgHrYzgWrI5+HeEifUgXJ5rMIWWP3qytp7KhVVqpDQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-typography": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-typography/-/extension-typography-3.27.1.tgz",
      "integrity": "sha512-hkZyiiv45XQGizdEYxJn86g8yKJxG45kkTztg0m6qjjcdDzjhUAcwVPTZ4ecg3hxwy/XNY7gEBOMGI7iqJl2sw==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1"
      }
    },
    "node_modules/@tiptap/extension-underline": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-underline/-/extension-underline-3.27.1.tgz",
      "integrity": "sha512-N889J4nXN/TPfVt8uF9N1A0SY82E90zwc1y26lqOcw6KWNLmQrlhMh/9OD4ikLDbekmFpOBq/UicpHf/6S8hbQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1"
      }
    },
    "node_modules/@tiptap/extensions": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/extensions/-/extensions-3.27.1.tgz",
      "integrity": "sha512-1Tdx9faw8k0/83V6X+xCDVhV8yElGt95JxeW3YMkKQJI56QdlPz0xOdJPlMiSGJKinPyVier+x9LJD/YZUZIaw==",
      "license": "MIT",
      "peer": true,
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.27.1",
        "@tiptap/pm": "3.27.1"
      }
    },
    "node_modules/@tiptap/pm": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/pm/-/pm-3.27.1.tgz",
      "integrity": "sha512-Ffjx+vimmBU7zH/KrpXzJid3+pziCe/VL2aexSTP63cyQwKQ65LkFkCKaIsSpFdQQuakVZBGWjCA5RoBV852pw==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-changeset": "^2.3.0",
        "prosemirror-commands": "^1.6.2",
        "prosemirror-dropcursor": "^1.8.1",
        "prosemirror-gapcursor": "^1.3.2",
        "prosemirror-history": "^1.4.1",
        "prosemirror-inputrules": "^1.4.0",
        "prosemirror-keymap": "^1.2.3",
        "prosemirror-model": "^1.25.7",
        "prosemirror-schema-list": "^1.5.0",
        "prosemirror-state": "^1.4.4",
        "prosemirror-tables": "^1.8.0",
        "prosemirror-transform": "^1.12.0",
        "prosemirror-view": "^1.41.8"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      }
    },
    "node_modules/@tiptap/react": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/react/-/react-3.29.2.tgz",
      "integrity": "sha512-ZMKgteYmZXnq7C22U9fbCTC6jAF8XlQM5n2K2FLWCdYAlP4FNV3XeQ9hY2a13KSQ0Q3yltWXZlcWBpt5ClxScg==",
      "license": "MIT",
      "dependencies": {
        "@types/use-sync-external-store": "^0.0.6",
        "fast-equals": "^5.3.3",
        "use-sync-external-store": "^1.4.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "optionalDependencies": {
        "@tiptap/extension-bubble-menu": "^3.29.2",
        "@tiptap/extension-floating-menu": "^3.29.2"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2",
        "@tiptap/pm": "3.29.2",
        "@types/react": "^17.0.0 || ^18.0.0 || ^19.0.0",
        "@types/react-dom": "^17.0.0 || ^18.0.0 || ^19.0.0",
        "react": "^17.0.0 || ^18.0.0 || ^19.0.0",
        "react-dom": "^17.0.0 || ^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/@tiptap/starter-kit": {
      "version": "3.27.1",
      "resolved": "https://registry.npmjs.org/@tiptap/starter-kit/-/starter-kit-3.27.1.tgz",
      "integrity": "sha512-vfxRsqW8rCc0k4pzo0ilU3wobVi2wqVj88VZI2SlgZlNnUAkrDGDIAph7CTa9k9fshV+O1ivpEgPC5yC046jow==",
      "license": "MIT",
      "dependencies": {
        "@tiptap/core": "^3.27.1",
        "@tiptap/extension-blockquote": "^3.27.1",
        "@tiptap/extension-bold": "^3.27.1",
        "@tiptap/extension-bullet-list": "^3.27.1",
        "@tiptap/extension-code": "^3.27.1",
        "@tiptap/extension-code-block": "^3.27.1",
        "@tiptap/extension-document": "^3.27.1",
        "@tiptap/extension-dropcursor": "^3.27.1",
        "@tiptap/extension-gapcursor": "^3.27.1",
        "@tiptap/extension-hard-break": "^3.27.1",
        "@tiptap/extension-heading": "^3.27.1",
        "@tiptap/extension-horizontal-rule": "^3.27.1",
        "@tiptap/extension-italic": "^3.27.1",
        "@tiptap/extension-link": "^3.27.1",
        "@tiptap/extension-list": "^3.27.1",
        "@tiptap/extension-list-item": "^3.27.1",
        "@tiptap/extension-list-keymap": "^3.27.1",
        "@tiptap/extension-ordered-list": "^3.27.1",
        "@tiptap/extension-paragraph": "^3.27.1",
        "@tiptap/extension-strike": "^3.27.1",
        "@tiptap/extension-text": "^3.27.1",
        "@tiptap/extension-underline": "^3.27.1",
        "@tiptap/extensions": "^3.27.1",
        "@tiptap/pm": "^3.27.1"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      }
    },
    "node_modules/@tiptap/starter-kit/node_modules/@tiptap/extension-bullet-list": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-bullet-list/-/extension-bullet-list-3.29.2.tgz",
      "integrity": "sha512-3bWcCUPbCHv0XttlMdnAtXLNYWx2pblByMgxmGsaP9FU0QnslGXty6A6gHCqI33ygRg1vrA6U5Wtpwbi5aKu5g==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/extension-list": "3.29.2"
      }
    },
    "node_modules/@tiptap/starter-kit/node_modules/@tiptap/extension-dropcursor": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-dropcursor/-/extension-dropcursor-3.29.2.tgz",
      "integrity": "sha512-KKno7cU9r1HdR48CRrsDu69/1UjZdoslq/UcE+Kx+tdhAv/aljXMkRSNzGMrBNOBDmHRgS1+58zm21WQWdQzwA==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/extensions": "3.29.2"
      }
    },
    "node_modules/@tiptap/starter-kit/node_modules/@tiptap/extension-gapcursor": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-gapcursor/-/extension-gapcursor-3.29.2.tgz",
      "integrity": "sha512-8Q39UR4/Tit759IeW9xZIe3NMwN11GsuA3FLheDyyGn7RrW02HD3HhUDlazE54Ki4HoosjFmChPlN4Ik2ubdRQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/extensions": "3.29.2"
      }
    },
    "node_modules/@tiptap/starter-kit/node_modules/@tiptap/extension-list": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-list/-/extension-list-3.29.2.tgz",
      "integrity": "sha512-WPZ9BHAPT6QeIm1vdVkuoOWvy9a8/EZeJwV2VhU8LXyTAttvzyj4rsbbHyJWvYWlUSTt/QF2AZ2zhKo7u1w3/A==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2",
        "@tiptap/pm": "3.29.2"
      }
    },
    "node_modules/@tiptap/starter-kit/node_modules/@tiptap/extension-list-item": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-list-item/-/extension-list-item-3.29.2.tgz",
      "integrity": "sha512-s8vBVHHFT0Qpu7CzAZ7S1kYmSiVaDvUNvMNcZUWnxj6VPfiwmx0eXd9FsjePrRCMoM5tFmPnhFTHDxY3D/eZeQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/extension-list": "3.29.2"
      }
    },
    "node_modules/@tiptap/starter-kit/node_modules/@tiptap/extension-list-keymap": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-list-keymap/-/extension-list-keymap-3.29.2.tgz",
      "integrity": "sha512-R+3k8OLnxdCH7Xy9ieOwUt5m2Je74u8mikothGmsYVO2Zyq48fIbmZ+X6RBPCu7DBOI2FIUhHEFbKQeDWvDNmA==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/extension-list": "3.29.2"
      }
    },
    "node_modules/@tiptap/starter-kit/node_modules/@tiptap/extension-ordered-list": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extension-ordered-list/-/extension-ordered-list-3.29.2.tgz",
      "integrity": "sha512-ndCunC+UsYOpkOtL7vGnDz21UNa45WUlcO9wMT1fbuYow2QnRhsuMlCWENXI52YPPARWuQ0RDgN7q6TaxPERBg==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/extension-list": "3.29.2"
      }
    },
    "node_modules/@tiptap/starter-kit/node_modules/@tiptap/extensions": {
      "version": "3.29.2",
      "resolved": "https://registry.npmjs.org/@tiptap/extensions/-/extensions-3.29.2.tgz",
      "integrity": "sha512-BCz+FCAChSYtUe4BFj97HEO+nSK+J7GxbJgZG4Hg7DT/gI+hRyeNndU8efiQAx3WGdzsFi3UxRpcF1tTQM7iMQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/ueberdosis"
      },
      "peerDependencies": {
        "@tiptap/core": "3.29.2",
        "@tiptap/pm": "3.29.2"
      }
    },
    "node_modules/@tiptap/y-tiptap": {
      "version": "3.0.8",
      "resolved": "https://registry.npmjs.org/@tiptap/y-tiptap/-/y-tiptap-3.0.8.tgz",
      "integrity": "sha512-+kndlSuoUK9sKVRuxbAHXNrbDvyydnG/Y0NFU9XXqaSkI9IRcrjpOf1RGd7NrC9jJXquDqZS96wOQf6eUpP9Dg==",
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "lib0": "^0.2.100"
      },
      "engines": {
        "node": ">=16.0.0",
        "npm": ">=8.0.0"
      },
      "peerDependencies": {
        "prosemirror-model": "^1.7.1",
        "prosemirror-state": "^1.2.3",
        "prosemirror-view": "^1.9.10",
        "y-protocols": "^1.0.1",
        "yjs": "^13.5.38"
      }
    },
    "node_modules/@tybys/wasm-util": {
      "version": "0.10.3",
      "resolved": "https://registry.npmjs.org/@tybys/wasm-util/-/wasm-util-0.10.3.tgz",
      "integrity": "sha512-F3fo1MYrRJYL3zER0OUOmkutjr1Vp23m7OsSgp7nq4SP6OqX6C/56XFIPAl5bt3zaBRjmW7SGz3u/6LwFpYcOg==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@types/estree": {
      "version": "1.0.9",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.9.tgz",
      "integrity": "sha512-GhdPgy1el4/ImP05X05Uw4cw2/M93BCUmnEvWZNStlCzEKME4Fkk+YpoA5OiHNQmoS7Cafb8Xa3Pya8m1Qrzeg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/json-schema": {
      "version": "7.0.15",
      "resolved": "https://registry.npmjs.org/@types/json-schema/-/json-schema-7.0.15.tgz",
      "integrity": "sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/json5": {
      "version": "0.0.29",
      "resolved": "https://registry.npmjs.org/@types/json5/-/json5-0.0.29.tgz",
      "integrity": "sha512-dRLjCWHYg4oaA77cxO64oO+7JwCwnIzkZPdrrC71jQmQtlhM556pwKo5bUzqvZndkVbeFLIIi+9TC40JNF5hNQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "20.19.43",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-20.19.43.tgz",
      "integrity": "sha512-6oYBAi5ikg4Pl+kGsoYtawUMBT2zZMCvPNF7pVLnHZfd1zf38DRiWn/gT01RYCdUqkv7Fhr+C9ot4/tb+2sVvA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "undici-types": "~6.21.0"
      }
    },
    "node_modules/@types/react": {
      "version": "19.2.17",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.2.17.tgz",
      "integrity": "sha512-MXfmqaVPEVgkBT/aY0aGCkRWWtByiYQXo3xdQ8r5RzuFrPiRn8Gar2tQdXSUQ2GKV3bkXckek89V8wQBY2Q/Aw==",
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.2.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "19.2.3",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-19.2.3.tgz",
      "integrity": "sha512-jp2L/eY6fn+KgVVQAOqYItbF0VY/YApe5Mz2F0aykSO8gx31bYCZyvSeYxCHKvzHG5eZjc+zyaS5BrBWya2+kQ==",
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^19.2.0"
      }
    },
    "node_modules/@types/use-sync-external-store": {
      "version": "0.0.6",
      "resolved": "https://registry.npmjs.org/@types/use-sync-external-store/-/use-sync-external-store-0.0.6.tgz",
      "integrity": "sha512-zFDAD+tlpf2r4asuHEj0XH6pY6i0g5NeAHPn+15wk3BV6JA69eERFXC1gyGThDkVa1zCyKr5jox1+2LbV/AMLg==",
      "license": "MIT"
    },
    "node_modules/@typescript-eslint/eslint-plugin": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/eslint-plugin/-/eslint-plugin-8.65.0.tgz",
      "integrity": "sha512-IEgob78X12rHpUmtcwFsXhZdVGJtwTVP8FiCLZkR6GlYVrl2PcuB+KhCE5BlVC/eQpQnu8WXRtkHZuPar+gCRA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/regexpp": "^4.12.2",
        "@typescript-eslint/scope-manager": "8.65.0",
        "@typescript-eslint/type-utils": "8.65.0",
        "@typescript-eslint/utils": "8.65.0",
        "@typescript-eslint/visitor-keys": "8.65.0",
        "ignore": "^7.0.5",
        "natural-compare": "^1.4.0",
        "ts-api-utils": "^2.5.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "@typescript-eslint/parser": "^8.65.0",
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/eslint-plugin/node_modules/ignore": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-7.0.6.tgz",
      "integrity": "sha512-BAg6QkE8W+TuQLrrw0Ugr7HegXduRuuj8/ti2kSOc+jz1dmx8/WNcjr6XGnq5YpDWxFwwaavqD0+jIUOKelTsw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/@typescript-eslint/parser": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/parser/-/parser-8.65.0.tgz",
      "integrity": "sha512-CZ4nMxWwgu1HEEFNkeaCptra9QCtkmKdgf3sWh1rl1trIhmxLilgTV4cwcbQ4wemnT4sWQN8CaKOmdYx+g2gMA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/scope-manager": "8.65.0",
        "@typescript-eslint/types": "8.65.0",
        "@typescript-eslint/typescript-estree": "8.65.0",
        "@typescript-eslint/visitor-keys": "8.65.0",
        "debug": "^4.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/project-service": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/project-service/-/project-service-8.65.0.tgz",
      "integrity": "sha512-SxnPhbTsGahizDgbu7oqFH/xVtzIqMd/s+WtnSxNxJZJpLbdT5IPdzg8EZxO3+PoKahXmwJLeNQOpKJb3/bi7Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/tsconfig-utils": "^8.65.0",
        "@typescript-eslint/types": "^8.65.0",
        "debug": "^4.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/scope-manager": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/scope-manager/-/scope-manager-8.65.0.tgz",
      "integrity": "sha512-Esbl8OSYiVxBokYgWPf7VVWg/BE798wXhimnn9ML9Pt5qoDf8bfQlgjlKXR/k98+AcNzlLKYrpCcrcuZ9DZLgg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.65.0",
        "@typescript-eslint/visitor-keys": "8.65.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/tsconfig-utils": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/tsconfig-utils/-/tsconfig-utils-8.65.0.tgz",
      "integrity": "sha512-j6GzGqCiRdA7Qhur2VVmKZAkBLfnHFQfx4TaJGL9RMveZqCo48jSHHO0DTgizEnGhtWnqmbtCUSrqSkdiY/0Hg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/type-utils": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/type-utils/-/type-utils-8.65.0.tgz",
      "integrity": "sha512-YjaZ7PRI5qY7ax2L3PbvX0rRyGtipAReCWs0mhhDBHjH/vl0g0BonaGXrKdKpMbIIsMIwDgbk/xzkBTyAltS5g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.65.0",
        "@typescript-eslint/typescript-estree": "8.65.0",
        "@typescript-eslint/utils": "8.65.0",
        "debug": "^4.4.3",
        "ts-api-utils": "^2.5.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/types": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/types/-/types-8.65.0.tgz",
      "integrity": "sha512-JSSwWNy+H0E/01jJEM+hrX6N0OFDzFzeIhHFSAS01tlVaevpG8cFyYRPhS5yjGOvBUx3sqQHVMjCL1CAZZMxBg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/typescript-estree/-/typescript-estree-8.65.0.tgz",
      "integrity": "sha512-JboAE2swaYt4tb1fHhHTABE2K+OLy09XfcTbhnk4Pw96f9dd2e9iYsJ28gBggHlo5z5x1rkyWvcPoTuNTd4oGg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/project-service": "8.65.0",
        "@typescript-eslint/tsconfig-utils": "8.65.0",
        "@typescript-eslint/types": "8.65.0",
        "@typescript-eslint/visitor-keys": "8.65.0",
        "debug": "^4.4.3",
        "minimatch": "^10.2.2",
        "semver": "^7.7.3",
        "tinyglobby": "^0.2.15",
        "ts-api-utils": "^2.5.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/balanced-match": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz",
      "integrity": "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "18 || 20 || >=22"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion": {
      "version": "5.0.8",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.8.tgz",
      "integrity": "sha512-JZyDyq3D4AUifKTPOB7DELf6XsB3WdPuNxCtob1vFXPsSXhdAiHBWJ/tJ8HAc9aH84BK+5JFZLNkJKx3G9kzQg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^4.0.2"
      },
      "engines": {
        "node": "20 || >=22"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch": {
      "version": "10.2.6",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-10.2.6.tgz",
      "integrity": "sha512-vpLQEs+VLCr1nU0BXS07maYoFwlDAH0gngQuuttxIwutDFEMHq2blX+8vpgxDdK3J1PwjCJiep77OitTZ4Ll1A==",
      "dev": true,
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "brace-expansion": "^5.0.8"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree/node_modules/semver": {
      "version": "7.8.5",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz",
      "integrity": "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@typescript-eslint/utils": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/utils/-/utils-8.65.0.tgz",
      "integrity": "sha512-gXiwIHsYreboxeJucHKPvgwl7dXt50mF8s1/c00cP/WoVTyWKFdtfhRWwZiXYFU5H2O8vVoSLNrexFZjYS/SGA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.9.1",
        "@typescript-eslint/scope-manager": "8.65.0",
        "@typescript-eslint/types": "8.65.0",
        "@typescript-eslint/typescript-estree": "8.65.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/visitor-keys/-/visitor-keys-8.65.0.tgz",
      "integrity": "sha512-8C71BQkGjiMmXtop7pHVJu1l2NNShFdkCyD6a2ezzs5vU/L3LRtb69EtcteFwz0mYMPzIgOw0n6OV4VBUWZd7A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.65.0",
        "eslint-visitor-keys": "^5.0.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys/node_modules/eslint-visitor-keys": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-5.0.1.tgz",
      "integrity": "sha512-tD40eHxA35h0PEIZNeIjkHoDR4YjjJp34biM0mDvplBe//mB+IHCqHDGV7pxF+7MklTvighcCPPZC7ynWyjdTA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@unrs/resolver-binding-android-arm-eabi": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-android-arm-eabi/-/resolver-binding-android-arm-eabi-1.12.2.tgz",
      "integrity": "sha512-g5T90pqg1bo/7mytQx6F4iBNC0Wsh9cu+z9veDbFjc7HjpesJFWD7QMS0NGStXM075+7dJPPVvBbpZlnrdpi/w==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@unrs/resolver-binding-android-arm64": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-android-arm64/-/resolver-binding-android-arm64-1.12.2.tgz",
      "integrity": "sha512-YGCRZv/9GLhwmz6mYDeTsm/92BAyR28l6c2ReweVW5pWgfsitWLY8upvfRlGdoyD8HjeTHSYJWyZGD4KJA/nFQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@unrs/resolver-binding-darwin-arm64": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-darwin-arm64/-/resolver-binding-darwin-arm64-1.12.2.tgz",
      "integrity": "sha512-u9DiNT1auQMO20A9SyTuG3wUgQWB9Z7KjAg0uFuCDR1FsAY8A0CG2S6JpHS1xwm/w1G08bjXZDcyOCjv1WAm2w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@unrs/resolver-binding-darwin-x64": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-darwin-x64/-/resolver-binding-darwin-x64-1.12.2.tgz",
      "integrity": "sha512-f7rPLi/T1HVKZu/u6t87lroib16n8vrSzcyxI7lg4BGO9UF26KhQL44sd9eOUgrTYhvRXtWOIZT5PejdPyJfUA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@unrs/resolver-binding-freebsd-x64": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-freebsd-x64/-/resolver-binding-freebsd-x64-1.12.2.tgz",
      "integrity": "sha512-BpcOjWCJub6nRZUS2zA20pmLvjtqAtGejETaIyRLiZiQf++cbrjltLA5NN/xaXfqeOBOSlMFbemIl5/S5tljmg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-arm-gnueabihf": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-arm-gnueabihf/-/resolver-binding-linux-arm-gnueabihf-1.12.2.tgz",
      "integrity": "sha512-vZTDvdSISZjJx66OzJqtsOhzifbqRjbmI1Mnu49fQDwog5GtDI4QidRiEAYbZCRj9C8YZEW+3ZjqsyS9GR4k2A==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-arm-musleabihf": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-arm-musleabihf/-/resolver-binding-linux-arm-musleabihf-1.12.2.tgz",
      "integrity": "sha512-BiPI+IrIlwcW4nLLMM21+B1dFPzd55yAVgVGrdgDjNef+ch03GdxrcyaIz8X9SsQirh/kCQ7mviyWlMxdh2D7g==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-arm64-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-arm64-gnu/-/resolver-binding-linux-arm64-gnu-1.12.2.tgz",
      "integrity": "sha512-zJc0H99FEPoFfSrNpa91HYfxzfAJCr502oxNK1cfdC9hlaFI43RT+JFCann9JUgZmLzzntChHyn13Sgn9ljHNg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-arm64-musl": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-arm64-musl/-/resolver-binding-linux-arm64-musl-1.12.2.tgz",
      "integrity": "sha512-KQ3Lki6l+Pz1k/eBipN41ES+YUK30beLGb9YqcB1O542cyLCNE6GaxrfcY3T6EezmGGk84wb5XyO9loTM9tkcA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-loong64-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-loong64-gnu/-/resolver-binding-linux-loong64-gnu-1.12.2.tgz",
      "integrity": "sha512-3SJGEh1DborhG6pyxvhPzCT4bbSIVihsvgJc13P1bHG7KLdNDaF9T3gsTwFc7Jw/5Y5/iWOjkEx7Zy0NvCGX3Q==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-loong64-musl": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-loong64-musl/-/resolver-binding-linux-loong64-musl-1.12.2.tgz",
      "integrity": "sha512-jiuG/Obbel7uw1PwHNFfrkiKhLAF6mnyZ6aWlOAVN9WqKm8v0OFGnciJIHu8+CMvXLQ8AD51LPzAoUfT21D5Ew==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-ppc64-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-ppc64-gnu/-/resolver-binding-linux-ppc64-gnu-1.12.2.tgz",
      "integrity": "sha512-q7xRvVpmcfeL+LlZg8Pbbo6QaTZwDU5BaGZbwfhkEsXJn3Was8xYfE0RBH266xZt0rM6B7i8xAYIvjthuUIWHg==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-riscv64-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-riscv64-gnu/-/resolver-binding-linux-riscv64-gnu-1.12.2.tgz",
      "integrity": "sha512-0CVdx6lcnT3Q9inOH8tsMIOJ6ImndllMjqJHg8RLVdB7Vq4SfkEXl9mCSsVNuNA4MCYycRicCUxPCabVHJRr6A==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-riscv64-musl": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-riscv64-musl/-/resolver-binding-linux-riscv64-musl-1.12.2.tgz",
      "integrity": "sha512-iOwlRo9vnp6R6ohHQS11n0NnfdXx/omhkocmIfaPRpQhKZ+3BDMkkdRVh53qjkFkpPddf+FETA28NwGN7l5l+w==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-s390x-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-s390x-gnu/-/resolver-binding-linux-s390x-gnu-1.12.2.tgz",
      "integrity": "sha512-HYJtLfXq94q8iZNFT1lknx258wlkkWhZeUXJRqzKBBUJ00CvZ+N33zgbCqimLjsyw5Va6uUxhVa12mI+kaveEw==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-x64-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-x64-gnu/-/resolver-binding-linux-x64-gnu-1.12.2.tgz",
      "integrity": "sha512-mPsUhunKKDih5O96Y6enDQyHc1SqBPlY1E/SfMWDM3EdJ95Z9CArPeCVwCCqbP45ljvivdEk8Fxn+SIb1rDAJQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-x64-musl": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-x64-musl/-/resolver-binding-linux-x64-musl-1.12.2.tgz",
      "integrity": "sha512-azrt6+5ydLd8Vt210AAFis/lZevSfPw93EJRIJG+xPu4WCJ8K0kppCTpMyLPcKT7H15M4Jnt2tMp5bOvCkRC6A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-openharmony-arm64": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-openharmony-arm64/-/resolver-binding-openharmony-arm64-1.12.2.tgz",
      "integrity": "sha512-YZ9hP4O0X9PQb8eO980qmLNGH4zT3I9+SZTdt0Pr0YyuGQhYKoOZkV02VzrzyOZJ5xIJ3UFIenKkUkGg8GjgWQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ]
    },
    "node_modules/@unrs/resolver-binding-wasm32-wasi": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-wasm32-wasi/-/resolver-binding-wasm32-wasi-1.12.2.tgz",
      "integrity": "sha512-tYFDIkMxSflfEc/h92ZWNsZlHSwgimbNHSO3PL2JWQHfCuC2q316jMyYU9TIWZsFK2bQwyK5VAdYgn8ygPj69A==",
      "cpu": [
        "wasm32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/core": "1.10.0",
        "@emnapi/runtime": "1.10.0",
        "@napi-rs/wasm-runtime": "^1.1.4"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@unrs/resolver-binding-wasm32-wasi/node_modules/@emnapi/runtime": {
      "version": "1.10.0",
      "resolved": "https://registry.npmjs.org/@emnapi/runtime/-/runtime-1.10.0.tgz",
      "integrity": "sha512-ewvYlk86xUoGI0zQRNq/mC+16R1QeDlKQy21Ki3oSYXNgLb45GV1P6A0M+/s6nyCuNDqe5VpaY84BzXGwVbwFA==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@unrs/resolver-binding-win32-arm64-msvc": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-win32-arm64-msvc/-/resolver-binding-win32-arm64-msvc-1.12.2.tgz",
      "integrity": "sha512-qzNyg3xL0VPQmCaUh+N5jSitce6k+uCBfMDesWRnlULOZaqUkaJ0ybdT+UqlAWJoQjuqfIU/0Ptx9bteN4D82g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@unrs/resolver-binding-win32-ia32-msvc": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-win32-ia32-msvc/-/resolver-binding-win32-ia32-msvc-1.12.2.tgz",
      "integrity": "sha512-WD9sY00OfpHVGfsnHZoA8jVT+esS/Bg8z8jzxp5BnDCjjwsuKsPQrzswwpFy4J1AUJbXPRfkpcX0mXrzeXW79g==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@unrs/resolver-binding-win32-x64-msvc": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-win32-x64-msvc/-/resolver-binding-win32-x64-msvc-1.12.2.tgz",
      "integrity": "sha512-nAB74NfSNKknqQ1RrYj6uz8FcXEomu/MATJZxh/x+BArzN2U3JbOYC0APYzUIGhVY3m5hRxA8VPNdPBoG8txlA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/acorn": {
      "version": "8.18.0",
      "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.18.0.tgz",
      "integrity": "sha512-lGq+9yr1/GuAWaVYIHRjvvySG5/4VfKIvC8EWxStPdcDh/Ka7FG3twP6v4d5BkravUilhIAsG4Qj83t02LWUPQ==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "acorn": "bin/acorn"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/acorn-jsx": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/acorn-jsx/-/acorn-jsx-5.3.2.tgz",
      "integrity": "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0"
      }
    },
    "node_modules/ajv": {
      "version": "6.15.0",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-6.15.0.tgz",
      "integrity": "sha512-fgFx7Hfoq60ytK2c7DhnF8jIvzYgOMxfugjLOSMHjLIPgenqa7S7oaagATUq99mV6IYvN2tRmC0wnTYX6iPbMw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.1",
        "fast-json-stable-stringify": "^2.0.0",
        "json-schema-traverse": "^0.4.1",
        "uri-js": "^4.2.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "dev": true,
      "license": "Python-2.0"
    },
    "node_modules/aria-query": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/aria-query/-/aria-query-5.3.2.tgz",
      "integrity": "sha512-COROpnaoap1E2F000S62r6A60uHZnmlvomhfyT2DlTcrY1OrBKn2UhH7qn5wTC9zMvD0AY7csdPSNwKP+7WiQw==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/array-buffer-byte-length": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/array-buffer-byte-length/-/array-buffer-byte-length-1.0.2.tgz",
      "integrity": "sha512-LHE+8BuR7RYGDKvnrmcuSq3tDcKv9OFEXQt/HpbZhY7V6h0zlUXutnAD82GiFx9rdieCMjkvtcsPqBwgUl1Iiw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "is-array-buffer": "^3.0.5"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array-includes": {
      "version": "3.1.9",
      "resolved": "https://registry.npmjs.org/array-includes/-/array-includes-3.1.9.tgz",
      "integrity": "sha512-FmeCCAenzH0KH381SPT5FZmiA/TmpndpcaShhfgEN9eCVjnFBqq3l1xrI42y8+PPLI6hypzou4GXw00WHmPBLQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.24.0",
        "es-object-atoms": "^1.1.1",
        "get-intrinsic": "^1.3.0",
        "is-string": "^1.1.1",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.findlast": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/array.prototype.findlast/-/array.prototype.findlast-1.2.5.tgz",
      "integrity": "sha512-CVvd6FHg1Z3POpBLxO6E6zr+rSKEQ9L6rZHAaY7lLfhKsWYUBBOuMs0e9o24oopj6H+geRCX0YJ+TJLBK2eHyQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.2",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.findlastindex": {
      "version": "1.2.6",
      "resolved": "https://registry.npmjs.org/array.prototype.findlastindex/-/array.prototype.findlastindex-1.2.6.tgz",
      "integrity": "sha512-F/TKATkzseUExPlfvmwQKGITM3DGTK+vkAsCZoDc5daVygbJBnjEUCbgkAvVFsgfXfX4YIqZ/27G3k3tdXrTxQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.9",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "es-shim-unscopables": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.flat": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/array.prototype.flat/-/array.prototype.flat-1.3.3.tgz",
      "integrity": "sha512-rwG/ja1neyLqCuGZ5YYrznA62D4mZXg0i1cIskIUKSiqF3Cje9/wXAls9B9s1Wa2fomMsIv8czB8jZcPmxCXFg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.5",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.flatmap": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/array.prototype.flatmap/-/array.prototype.flatmap-1.3.3.tgz",
      "integrity": "sha512-Y7Wt51eKJSyi80hFrJCePGGNo5ktJCslFuboqJsbf57CCPcm5zztluPlc4/aD8sWsKvlwatezpV4U1efk8kpjg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.5",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.tosorted": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/array.prototype.tosorted/-/array.prototype.tosorted-1.1.4.tgz",
      "integrity": "sha512-p6Fx8B7b7ZhL/gmUsAy0D15WhvDccw3mnGNbZpi3pmeJdxtWsj2jEaI4Y6oo3XiHfzuSgPwKc04MYt6KgvC/wA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.3",
        "es-errors": "^1.3.0",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/arraybuffer.prototype.slice": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/arraybuffer.prototype.slice/-/arraybuffer.prototype.slice-1.0.4.tgz",
      "integrity": "sha512-BNoCY6SXXPQ7gF2opIP4GBE+Xw7U+pHMYKuzjgCN3GwiaIR09UUeKfheyIry77QtrCBlC0KK0q5/TER/tYh3PQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-buffer-byte-length": "^1.0.1",
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.5",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6",
        "is-array-buffer": "^3.0.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/ast-types-flow": {
      "version": "0.0.8",
      "resolved": "https://registry.npmjs.org/ast-types-flow/-/ast-types-flow-0.0.8.tgz",
      "integrity": "sha512-OH/2E5Fg20h2aPrbe+QL8JZQFko0YZaF+j4mnQ7BGhfavO7OpSLa8a0y9sBwomHdSbkhTS8TQNayBfnW5DwbvQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/async-function": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/async-function/-/async-function-1.0.0.tgz",
      "integrity": "sha512-hsU18Ae8CDTR6Kgu9DYf0EbCr/a5iGL0rytQDobUcdpYOKokk8LEjVphnXkDkgpi0wYVsqrXuP0bZxJaTqdgoA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/available-typed-arrays": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/available-typed-arrays/-/available-typed-arrays-1.0.7.tgz",
      "integrity": "sha512-wvUjBtSGN7+7SjNpq/9M2Tg350UZD3q62IFZLbRAR1bSMlCo1ZaeW+BJ+D090e4hIIZLBcTDWe4Mh4jvUDajzQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "possible-typed-array-names": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/axe-core": {
      "version": "4.12.1",
      "resolved": "https://registry.npmjs.org/axe-core/-/axe-core-4.12.1.tgz",
      "integrity": "sha512-s7iGf5GaVMxEG0ENN9x+xTr7GFZCb1ZP/1uATUpCEK2X78nDB3RwbtFCo9pGAf9ru+VwoQ464DkaLEeRM08wJA==",
      "dev": true,
      "license": "MPL-2.0",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/axobject-query": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/axobject-query/-/axobject-query-4.1.0.tgz",
      "integrity": "sha512-qIj0G9wZbMGNLjLmg1PT6v2mE9AH2zlnADJD/2tC6E00hgmhUOfEB6greHPAfLRSufHqROIUTkw6E+M3lH0PTQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/baseline-browser-mapping": {
      "version": "2.11.7",
      "resolved": "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.11.7.tgz",
      "integrity": "sha512-APw5YuIQAg6L9w4sHDI6j26DGFJI6RpYOhnkMPdC9lWbkKvsyPHzDsve1yd73lk21yz7Y09Kci8B2Pp9FonzWA==",
      "license": "Apache-2.0",
      "bin": {
        "baseline-browser-mapping": "dist/cli.cjs"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/brace-expansion": {
      "version": "1.1.17",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.17.tgz",
      "integrity": "sha512-w+aeW/mkgM4PyRMOJCgi3fOrTm5Q8QY1OSfn2TO2iuDj3ezIHqejmuxbjfPrqUkgqRew1iqkyAn0tr0ZwHD9+w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/braces": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/braces/-/braces-3.0.3.tgz",
      "integrity": "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fill-range": "^7.1.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/browserslist": {
      "version": "4.28.7",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.28.7.tgz",
      "integrity": "sha512-JxV13hNrFxqjOc8alRbq9dK1MM79NEXYpma2B2J4wAtpWS5zIEIKqWPGCl7N4o7Uc7B7itylh7SuDujATRyyTw==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "baseline-browser-mapping": "^2.10.44",
        "caniuse-lite": "^1.0.30001806",
        "electron-to-chromium": "^1.5.393",
        "node-releases": "^2.0.51",
        "update-browserslist-db": "^1.2.3"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/call-bind": {
      "version": "1.0.9",
      "resolved": "https://registry.npmjs.org/call-bind/-/call-bind-1.0.9.tgz",
      "integrity": "sha512-a/hy+pNsFUTR+Iz8TCJvXudKVLAnz/DyeSUo10I5yvFDQJBFU2s9uqQpoSrJlroHUKoKqzg+epxyP9lqFdzfBQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "get-intrinsic": "^1.3.0",
        "set-function-length": "^1.2.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/call-bound": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "get-intrinsic": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/callsites": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/callsites/-/callsites-3.1.0.tgz",
      "integrity": "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001806",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001806.tgz",
      "integrity": "sha512-72Cuvd95zbSYPKq6Fhg8eDJRlzgWDf7/mtoZv6Qe/DYNCEBdNxoA3+rZAU2ZhGCpZlns3EssFavaZomckT5Uuw==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chalk": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz",
      "integrity": "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.1.0",
        "supports-color": "^7.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/chalk?sponsor=1"
      }
    },
    "node_modules/client-only": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/client-only/-/client-only-0.0.1.tgz",
      "integrity": "sha512-IV3Ou0jSMzZrd3pZ48nLkT9DA7Ag1pnPzaiQhpW7c3RbcqqzvzzVu+L8gfqMp/8IM2MQtSiqaCxrrcfu8I8rMA==",
      "license": "MIT"
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/commander": {
      "version": "8.3.0",
      "resolved": "https://registry.npmjs.org/commander/-/commander-8.3.0.tgz",
      "integrity": "sha512-OkTL9umf+He2DZkUq8f8J9of7yL6RJKI24dVITBmNfZBmri9zYZQrKkuXiKhyfPSu8tUhnVBB1iKXevvnlR4Ww==",
      "license": "MIT",
      "engines": {
        "node": ">= 12"
      }
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/convert-source-map": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/convert-source-map/-/convert-source-map-2.0.0.tgz",
      "integrity": "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz",
      "integrity": "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/csstype": {
      "version": "3.2.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz",
      "integrity": "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==",
      "license": "MIT"
    },
    "node_modules/damerau-levenshtein": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/damerau-levenshtein/-/damerau-levenshtein-1.0.8.tgz",
      "integrity": "sha512-sdQSFB7+llfUcQHUQO3+B8ERRj0Oa4w9POWMI/puGtuf7gFywGmkaLCElnudfTiKZV+NvHqL0ifzdrI8Ro7ESA==",
      "dev": true,
      "license": "BSD-2-Clause"
    },
    "node_modules/data-view-buffer": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/data-view-buffer/-/data-view-buffer-1.0.2.tgz",
      "integrity": "sha512-EmKO5V3OLXh1rtK2wgXRansaK1/mtVdTUEiEI0W8RkvgT05kfxaH29PliLnpLP73yYO6142Q72QNa8Wx/A5CqQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "is-data-view": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/data-view-byte-length": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/data-view-byte-length/-/data-view-byte-length-1.0.2.tgz",
      "integrity": "sha512-tuhGbE6CfTM9+5ANGf+oQb72Ky/0+s3xKUpHvShfiz2RxMFgFPjsXuRLBVMtvMs15awe45SRb83D6wH4ew6wlQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "is-data-view": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/inspect-js"
      }
    },
    "node_modules/data-view-byte-offset": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/data-view-byte-offset/-/data-view-byte-offset-1.0.1.tgz",
      "integrity": "sha512-BS8PfmtDGnrgYdOonGZQdLZslWIeCGFP9tpan0hi1Co2Zr2NKADsvGYA8XxuG/4UWgJ6Cjtv+YJnB6MM69QGlQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "is-data-view": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/deep-is": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/deep-is/-/deep-is-0.1.4.tgz",
      "integrity": "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/define-data-property": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/define-data-property/-/define-data-property-1.1.4.tgz",
      "integrity": "sha512-rBMvIzlpA8v6E+SJZoo++HAYqsLrkg7MSfIinMPFhmkorw7X+dOXVJQs+QT69zGkzMyfDnIMN2Wid1+NbL3T+A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-define-property": "^1.0.0",
        "es-errors": "^1.3.0",
        "gopd": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/define-properties": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/define-properties/-/define-properties-1.2.1.tgz",
      "integrity": "sha512-8QmQKqEASLd5nx0U1B1okLElbUuuttJ/AnYmRXbbbGDWh6uS208EjD4Xqq/I9wK7u0v6O08XhTWnt5XtEbR6Dg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.0.1",
        "has-property-descriptors": "^1.0.0",
        "object-keys": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "devOptional": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/doctrine": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/doctrine/-/doctrine-2.1.0.tgz",
      "integrity": "sha512-35mSku4ZXK0vfCuHEDAwt55dg2jNajHZ1odvF+8SSr82EsZY4QmXfuWso8oEd8zRhVObSN18aM0CjSdoBX7zIw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "esutils": "^2.0.2"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.398",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.398.tgz",
      "integrity": "sha512-AsvhAxopJGh6museTDMIjn6JpDYOfgu4RLlygomt87MUwBUqTfd/1EiPtx10/LZE8xpTvkP2E9Gafq7lkLtodQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/emoji-regex": {
      "version": "9.2.2",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-9.2.2.tgz",
      "integrity": "sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/enhanced-resolve": {
      "version": "5.24.4",
      "resolved": "https://registry.npmjs.org/enhanced-resolve/-/enhanced-resolve-5.24.4.tgz",
      "integrity": "sha512-GVoi+ICHocoOIU7qVVM48wOJziRsqrsyqlI0Ce0LdowRn6v3bcH2zUa9kp85ncx0nwIb9/HOCOLS3fdThDG/XQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "graceful-fs": "^4.2.4",
        "tapable": "^2.3.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/es-abstract": {
      "version": "1.24.2",
      "resolved": "https://registry.npmjs.org/es-abstract/-/es-abstract-1.24.2.tgz",
      "integrity": "sha512-2FpH9Q5i2RRwyEP1AylXe6nYLR5OhaJTZwmlcP0dL/+JCbgg7yyEo/sEK6HeGZRf3dFpWwThaRHVApXSkW3xeg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-buffer-byte-length": "^1.0.2",
        "arraybuffer.prototype.slice": "^1.0.4",
        "available-typed-arrays": "^1.0.7",
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "data-view-buffer": "^1.0.2",
        "data-view-byte-length": "^1.0.2",
        "data-view-byte-offset": "^1.0.1",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "es-set-tostringtag": "^2.1.0",
        "es-to-primitive": "^1.3.0",
        "function.prototype.name": "^1.1.8",
        "get-intrinsic": "^1.3.0",
        "get-proto": "^1.0.1",
        "get-symbol-description": "^1.1.0",
        "globalthis": "^1.0.4",
        "gopd": "^1.2.0",
        "has-property-descriptors": "^1.0.2",
        "has-proto": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "internal-slot": "^1.1.0",
        "is-array-buffer": "^3.0.5",
        "is-callable": "^1.2.7",
        "is-data-view": "^1.0.2",
        "is-negative-zero": "^2.0.3",
        "is-regex": "^1.2.1",
        "is-set": "^2.0.3",
        "is-shared-array-buffer": "^1.0.4",
        "is-string": "^1.1.1",
        "is-typed-array": "^1.1.15",
        "is-weakref": "^1.1.1",
        "math-intrinsics": "^1.1.0",
        "object-inspect": "^1.13.4",
        "object-keys": "^1.1.1",
        "object.assign": "^4.1.7",
        "own-keys": "^1.0.1",
        "regexp.prototype.flags": "^1.5.4",
        "safe-array-concat": "^1.1.3",
        "safe-push-apply": "^1.0.0",
        "safe-regex-test": "^1.1.0",
        "set-proto": "^1.0.0",
        "stop-iteration-iterator": "^1.1.0",
        "string.prototype.trim": "^1.2.10",
        "string.prototype.trimend": "^1.0.9",
        "string.prototype.trimstart": "^1.0.8",
        "typed-array-buffer": "^1.0.3",
        "typed-array-byte-length": "^1.0.3",
        "typed-array-byte-offset": "^1.0.4",
        "typed-array-length": "^1.0.7",
        "unbox-primitive": "^1.1.0",
        "which-typed-array": "^1.1.19"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/es-abstract-get": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/es-abstract-get/-/es-abstract-get-1.0.0.tgz",
      "integrity": "sha512-6PMWXpdhshVvFp+FoWYs1EvG1Nj0tvk0dZM+XcK0xMEM1czRVcP6ohqPWHy6qPagSpC8j4+p89WXlT+xXJs/fg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.2",
        "is-callable": "^1.2.7",
        "object-inspect": "^1.13.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-iterator-helpers": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/es-iterator-helpers/-/es-iterator-helpers-1.4.0.tgz",
      "integrity": "sha512-c/A0P0oxkACDc+cKWw8evLXK83oBKgn0qPOqCYT4x9uolpCIJAcYvJC9QYKNDRPsTeGyCrQ326jrvgZWdCdK5Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.24.2",
        "es-errors": "^1.3.0",
        "es-set-tostringtag": "^2.1.0",
        "function-bind": "^1.1.2",
        "get-intrinsic": "^1.3.0",
        "globalthis": "^1.0.4",
        "gopd": "^1.2.0",
        "has-property-descriptors": "^1.0.2",
        "has-proto": "^1.2.0",
        "has-symbols": "^1.1.0",
        "internal-slot": "^1.1.0",
        "iterator.prototype": "^1.1.5",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.2.tgz",
      "integrity": "sha512-HWcBoN6NileqtSydK2FqHbS/LoDd2pqrnQHLyJzBj4kOp/ky2MWMN694xOfkK8/SnUsW2DH7EfyVlydKCsm1Zw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-set-tostringtag": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/es-set-tostringtag/-/es-set-tostringtag-2.1.0.tgz",
      "integrity": "sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6",
        "has-tostringtag": "^1.0.2",
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-shim-unscopables": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/es-shim-unscopables/-/es-shim-unscopables-1.1.0.tgz",
      "integrity": "sha512-d9T8ucsEhh8Bi1woXCf+TIKDIROLG5WCkxg8geBCbvk22kzwC5G2OnXVMO6FUsvQlgUUXQ2itephWDLqDzbeCw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-to-primitive": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/es-to-primitive/-/es-to-primitive-1.3.4.tgz",
      "integrity": "sha512-yPDz7wqpg1/mmHLmS3tcfTfbw5f1eryXvyghYBffGdERwe+mV7ZcWzTR8LR17Kvqt3qfPurjlonmnq3MKXIOXw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-abstract-get": "^1.0.0",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "is-callable": "^1.2.7",
        "is-date-object": "^1.1.0",
        "is-symbol": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint": {
      "version": "9.39.5",
      "resolved": "https://registry.npmjs.org/eslint/-/eslint-9.39.5.tgz",
      "integrity": "sha512-DgZS62aPLXKlnxILS/AYCoRvHaZeXceIzlXPkkGGzJWSow1aEk0lbTlxUSlyjC8jcaKxAdOnTDz+o1JFSBsyjw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.8.0",
        "@eslint-community/regexpp": "^4.12.1",
        "@eslint/config-array": "^0.21.2",
        "@eslint/config-helpers": "^0.4.2",
        "@eslint/core": "^0.17.0",
        "@eslint/eslintrc": "^3.3.6",
        "@eslint/js": "9.39.5",
        "@eslint/plugin-kit": "^0.4.1",
        "@humanfs/node": "^0.16.6",
        "@humanwhocodes/module-importer": "^1.0.1",
        "@humanwhocodes/retry": "^0.4.2",
        "@types/estree": "^1.0.6",
        "ajv": "^6.14.0",
        "chalk": "^4.0.0",
        "cross-spawn": "^7.0.6",
        "debug": "^4.3.2",
        "escape-string-regexp": "^4.0.0",
        "eslint-scope": "^8.4.0",
        "eslint-visitor-keys": "^4.2.1",
        "espree": "^10.4.0",
        "esquery": "^1.5.0",
        "esutils": "^2.0.2",
        "fast-deep-equal": "^3.1.3",
        "file-entry-cache": "^8.0.0",
        "find-up": "^5.0.0",
        "glob-parent": "^6.0.2",
        "ignore": "^5.2.0",
        "imurmurhash": "^0.1.4",
        "is-glob": "^4.0.0",
        "json-stable-stringify-without-jsonify": "^1.0.1",
        "lodash.merge": "^4.6.2",
        "minimatch": "^3.1.5",
        "natural-compare": "^1.4.0",
        "optionator": "^0.9.3"
      },
      "bin": {
        "eslint": "bin/eslint.js"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      },
      "peerDependencies": {
        "jiti": "*"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-config-next": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/eslint-config-next/-/eslint-config-next-16.2.9.tgz",
      "integrity": "sha512-olGtBrs07bQchpaJWeqbk9GaMoU0oGmN/pYNEBXSbfgKngb5uHnPe37X6tVeh6DJfaWFQildvinGEOrolo5fmw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@next/eslint-plugin-next": "16.2.9",
        "eslint-import-resolver-node": "^0.3.6",
        "eslint-import-resolver-typescript": "^3.5.2",
        "eslint-plugin-import": "^2.32.0",
        "eslint-plugin-jsx-a11y": "^6.10.0",
        "eslint-plugin-react": "^7.37.0",
        "eslint-plugin-react-hooks": "^7.0.0",
        "globals": "16.4.0",
        "typescript-eslint": "^8.46.0"
      },
      "peerDependencies": {
        "eslint": ">=9.0.0",
        "typescript": ">=3.3.1"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-config-next/node_modules/globals": {
      "version": "16.4.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-16.4.0.tgz",
      "integrity": "sha512-ob/2LcVVaVGCYN+r14cnwnoDPUufjiYgSqRhiFD0Q1iI4Odora5RE8Iv1D24hAz5oMophRGkGz+yuvQmmUMnMw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint-import-resolver-node": {
      "version": "0.3.10",
      "resolved": "https://registry.npmjs.org/eslint-import-resolver-node/-/eslint-import-resolver-node-0.3.10.tgz",
      "integrity": "sha512-tRrKqFyCaKict5hOd244sL6EQFNycnMQnBe+j8uqGNXYzsImGbGUU4ibtoaBmv5FLwJwcFJNeg1GeVjQfbMrDQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "debug": "^3.2.7",
        "is-core-module": "^2.16.1",
        "resolve": "^2.0.0-next.6"
      }
    },
    "node_modules/eslint-import-resolver-node/node_modules/debug": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-3.2.7.tgz",
      "integrity": "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.1"
      }
    },
    "node_modules/eslint-import-resolver-typescript": {
      "version": "3.10.1",
      "resolved": "https://registry.npmjs.org/eslint-import-resolver-typescript/-/eslint-import-resolver-typescript-3.10.1.tgz",
      "integrity": "sha512-A1rHYb06zjMGAxdLSkN2fXPBwuSaQ0iO5M/hdyS0Ajj1VBaRp0sPD3dn1FhME3c/JluGFbwSxyCfqdSbtQLAHQ==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "@nolyfill/is-core-module": "1.0.39",
        "debug": "^4.4.0",
        "get-tsconfig": "^4.10.0",
        "is-bun-module": "^2.0.0",
        "stable-hash": "^0.0.5",
        "tinyglobby": "^0.2.13",
        "unrs-resolver": "^1.6.2"
      },
      "engines": {
        "node": "^14.18.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint-import-resolver-typescript"
      },
      "peerDependencies": {
        "eslint": "*",
        "eslint-plugin-import": "*",
        "eslint-plugin-import-x": "*"
      },
      "peerDependenciesMeta": {
        "eslint-plugin-import": {
          "optional": true
        },
        "eslint-plugin-import-x": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-module-utils": {
      "version": "2.14.0",
      "resolved": "https://registry.npmjs.org/eslint-module-utils/-/eslint-module-utils-2.14.0.tgz",
      "integrity": "sha512-W2WCRZ9Dqntd+2u8jJcVMV2PKulc6RdLgUUoh/yQr3uB6lo/ZOeGx11sv60/8S4QFFKNslAlWhr9u0Ef7ZW6Ig==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "debug": "^3.2.7"
      },
      "engines": {
        "node": ">=4"
      },
      "peerDependenciesMeta": {
        "eslint": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-module-utils/node_modules/debug": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-3.2.7.tgz",
      "integrity": "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.1"
      }
    },
    "node_modules/eslint-plugin-import": {
      "version": "2.32.0",
      "resolved": "https://registry.npmjs.org/eslint-plugin-import/-/eslint-plugin-import-2.32.0.tgz",
      "integrity": "sha512-whOE1HFo/qJDyX4SnXzP4N6zOWn79WhnCUY/iDR0mPfQZO8wcYE4JClzI2oZrhBnnMUCBCHZhO6VQyoBU95mZA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@rtsao/scc": "^1.1.0",
        "array-includes": "^3.1.9",
        "array.prototype.findlastindex": "^1.2.6",
        "array.prototype.flat": "^1.3.3",
        "array.prototype.flatmap": "^1.3.3",
        "debug": "^3.2.7",
        "doctrine": "^2.1.0",
        "eslint-import-resolver-node": "^0.3.9",
        "eslint-module-utils": "^2.12.1",
        "hasown": "^2.0.2",
        "is-core-module": "^2.16.1",
        "is-glob": "^4.0.3",
        "minimatch": "^3.1.2",
        "object.fromentries": "^2.0.8",
        "object.groupby": "^1.0.3",
        "object.values": "^1.2.1",
        "semver": "^6.3.1",
        "string.prototype.trimend": "^1.0.9",
        "tsconfig-paths": "^3.15.0"
      },
      "engines": {
        "node": ">=4"
      },
      "peerDependencies": {
        "eslint": "^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/debug": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-3.2.7.tgz",
      "integrity": "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.1"
      }
    },
    "node_modules/eslint-plugin-jsx-a11y": {
      "version": "6.10.2",
      "resolved": "https://registry.npmjs.org/eslint-plugin-jsx-a11y/-/eslint-plugin-jsx-a11y-6.10.2.tgz",
      "integrity": "sha512-scB3nz4WmG75pV8+3eRUQOHZlNSUhFNq37xnpgRkCCELU3XMvXAxLk1eqWWyE22Ki4Q01Fnsw9BA3cJHDPgn2Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "aria-query": "^5.3.2",
        "array-includes": "^3.1.8",
        "array.prototype.flatmap": "^1.3.2",
        "ast-types-flow": "^0.0.8",
        "axe-core": "^4.10.0",
        "axobject-query": "^4.1.0",
        "damerau-levenshtein": "^1.0.8",
        "emoji-regex": "^9.2.2",
        "hasown": "^2.0.2",
        "jsx-ast-utils": "^3.3.5",
        "language-tags": "^1.0.9",
        "minimatch": "^3.1.2",
        "object.fromentries": "^2.0.8",
        "safe-regex-test": "^1.0.3",
        "string.prototype.includes": "^2.0.1"
      },
      "engines": {
        "node": ">=4.0"
      },
      "peerDependencies": {
        "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9"
      }
    },
    "node_modules/eslint-plugin-react": {
      "version": "7.37.5",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react/-/eslint-plugin-react-7.37.5.tgz",
      "integrity": "sha512-Qteup0SqU15kdocexFNAJMvCJEfa2xUKNV4CC1xsVMrIIqEy3SQ/rqyxCWNzfrd3/ldy6HMlD2e0JDVpDg2qIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-includes": "^3.1.8",
        "array.prototype.findlast": "^1.2.5",
        "array.prototype.flatmap": "^1.3.3",
        "array.prototype.tosorted": "^1.1.4",
        "doctrine": "^2.1.0",
        "es-iterator-helpers": "^1.2.1",
        "estraverse": "^5.3.0",
        "hasown": "^2.0.2",
        "jsx-ast-utils": "^2.4.1 || ^3.0.0",
        "minimatch": "^3.1.2",
        "object.entries": "^1.1.9",
        "object.fromentries": "^2.0.8",
        "object.values": "^1.2.1",
        "prop-types": "^15.8.1",
        "resolve": "^2.0.0-next.5",
        "semver": "^6.3.1",
        "string.prototype.matchall": "^4.0.12",
        "string.prototype.repeat": "^1.0.0"
      },
      "engines": {
        "node": ">=4"
      },
      "peerDependencies": {
        "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7"
      }
    },
    "node_modules/eslint-plugin-react-hooks": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-hooks/-/eslint-plugin-react-hooks-7.1.1.tgz",
      "integrity": "sha512-f2I7Gw6JbvCexzIInuSbZpfdQ44D7iqdWX01FKLvrPgqxoE7oMj8clOfto8U6vYiz4yd5oKu39rRSVOe1zRu0g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.24.4",
        "@babel/parser": "^7.24.4",
        "hermes-parser": "^0.25.1",
        "zod": "^3.25.0 || ^4.0.0",
        "zod-validation-error": "^3.5.0 || ^4.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0 || ^10.0.0"
      }
    },
    "node_modules/eslint-scope": {
      "version": "8.4.0",
      "resolved": "https://registry.npmjs.org/eslint-scope/-/eslint-scope-8.4.0.tgz",
      "integrity": "sha512-sNXOfKCn74rt8RICKMvJS7XKV/Xk9kA7DyJr8mJik3S7Cwgy3qlkkmyS2uQB3jiJg6VNdZd/pDBJu0nvG2NlTg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "esrecurse": "^4.3.0",
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint-visitor-keys": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.2.1.tgz",
      "integrity": "sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/espree": {
      "version": "10.4.0",
      "resolved": "https://registry.npmjs.org/espree/-/espree-10.4.0.tgz",
      "integrity": "sha512-j6PAQ2uUr79PZhBjP5C5fhl8e39FmRnOjsD5lGnWrFU8i2G776tBK7+nP8KuQUTTyAZUwfQqXAgrVH5MbH9CYQ==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "acorn": "^8.15.0",
        "acorn-jsx": "^5.3.2",
        "eslint-visitor-keys": "^4.2.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/esquery": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/esquery/-/esquery-1.7.0.tgz",
      "integrity": "sha512-Ap6G0WQwcU/LHsvLwON1fAQX9Zp0A2Y6Y/cJBl9r/JbW90Zyg4/zbG6zzKa2OTALELarYHmKu0GhpM5EO+7T0g==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "estraverse": "^5.1.0"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/esrecurse": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/esrecurse/-/esrecurse-4.3.0.tgz",
      "integrity": "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estraverse": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/estraverse/-/estraverse-5.3.0.tgz",
      "integrity": "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/esutils": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/esutils/-/esutils-2.0.3.tgz",
      "integrity": "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-equals": {
      "version": "5.4.1",
      "resolved": "https://registry.npmjs.org/fast-equals/-/fast-equals-5.4.1.tgz",
      "integrity": "sha512-DjlFSM5Pk9cGcL0q5QXl66eGzx0N6szNgaswwc5ZphlBohjTVJSnGgI+rJVOgOi65qUoQnDZN4nDqi33udtydQ==",
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/fast-glob": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/fast-glob/-/fast-glob-3.3.1.tgz",
      "integrity": "sha512-kNFPyjhh5cKjrUltxs+wFx+ZkbRaxxmZ+X0ZU31SOsxCEtP9VPgtq2teZw1DebupL5GmDaNQ6yKMMVcM41iqDg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "^2.0.2",
        "@nodelib/fs.walk": "^1.2.3",
        "glob-parent": "^5.1.2",
        "merge2": "^1.3.0",
        "micromatch": "^4.0.4"
      },
      "engines": {
        "node": ">=8.6.0"
      }
    },
    "node_modules/fast-glob/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/fast-json-stable-stringify": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fast-json-stable-stringify/-/fast-json-stable-stringify-2.1.0.tgz",
      "integrity": "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-levenshtein": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/fast-levenshtein/-/fast-levenshtein-2.0.6.tgz",
      "integrity": "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fastq": {
      "version": "1.20.1",
      "resolved": "https://registry.npmjs.org/fastq/-/fastq-1.20.1.tgz",
      "integrity": "sha512-GGToxJ/w1x32s/D2EKND7kTil4n8OVk/9mycTc4VDza13lOvpUZTGX3mFSCtV9ksdGBVzvsyAVLM6mHFThxXxw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "reusify": "^1.0.4"
      }
    },
    "node_modules/file-entry-cache": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
      "integrity": "sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flat-cache": "^4.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/fill-range": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/fill-range/-/fill-range-7.1.1.tgz",
      "integrity": "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "to-regex-range": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/find-up": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/find-up/-/find-up-5.0.0.tgz",
      "integrity": "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "locate-path": "^6.0.0",
        "path-exists": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/flat-cache": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/flat-cache/-/flat-cache-4.0.1.tgz",
      "integrity": "sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flatted": "^3.2.9",
        "keyv": "^4.5.4"
      },
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/flatted": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/flatted/-/flatted-3.4.3.tgz",
      "integrity": "sha512-/zipXxyO6rGvuNGDiULY9MvEGSkb2gaG4GGH4ygMi0ZZzyMHdUZBmntJmx5x1G2VuPytCwGN4xsJP6cw+sK+vQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/for-each": {
      "version": "0.3.5",
      "resolved": "https://registry.npmjs.org/for-each/-/for-each-0.3.5.tgz",
      "integrity": "sha512-dKx12eRCVIzqCxFGplyFKJMPvLEWgmNtUrpTiJIR5u97zEhRG8ySrtboPHZXx7daLxQVrl643cTzbab2tkQjxg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-callable": "^1.2.7"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/function.prototype.name": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/function.prototype.name/-/function.prototype.name-1.2.0.tgz",
      "integrity": "sha512-jObKIik1P2QjPHP5nz5BaOtUlfgS0fWo8IUByNXkM+o+02sJOi94em77GwJKQSJ3gfPHdgzLNrHc1uokV4P/ew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "functions-have-names": "^1.2.3",
        "has-property-descriptors": "^1.0.2",
        "hasown": "^2.0.4",
        "is-callable": "^1.2.7",
        "is-document.all": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/functions-have-names": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/functions-have-names/-/functions-have-names-1.2.3.tgz",
      "integrity": "sha512-xckBUXyTIqT97tq2x2AMb+g163b5JFysYk0x4qxNFwbfQkmNZoiRHb6sPzI9/QV33WeuvVYBUIiD4NzNIyqaRQ==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/generator-function": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/generator-function/-/generator-function-2.0.1.tgz",
      "integrity": "sha512-SFdFmIJi+ybC0vjlHN0ZGVGHc3lgE0DxPAT0djjVg+kjOnSqclqmj0KQ7ykTOLP6YxoqOvuAODGdcHJn+43q3g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/gensync": {
      "version": "1.0.0-beta.2",
      "resolved": "https://registry.npmjs.org/gensync/-/gensync-1.0.0-beta.2.tgz",
      "integrity": "sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/get-symbol-description": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/get-symbol-description/-/get-symbol-description-1.1.0.tgz",
      "integrity": "sha512-w9UMqWwJxHNOvoNzSJ2oPF5wvYcvP7jUvYzhp67yEhTi17ZDBBC1z9pTdGuzjD+EFIqLSYRweZjqfiPzQ06Ebg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-tsconfig": {
      "version": "4.14.0",
      "resolved": "https://registry.npmjs.org/get-tsconfig/-/get-tsconfig-4.14.0.tgz",
      "integrity": "sha512-yTb+8DXzDREzgvYmh6s9vHsSVCHeC0G3PI5bEXNBHtmshPnO+S5O7qgLEOn0I5QvMy6kpZN8K1NKGyilLb93wA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "resolve-pkg-maps": "^1.0.0"
      },
      "funding": {
        "url": "https://github.com/privatenumber/get-tsconfig?sponsor=1"
      }
    },
    "node_modules/glob-parent": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz",
      "integrity": "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/globals": {
      "version": "14.0.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-14.0.0.tgz",
      "integrity": "sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/globalthis": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/globalthis/-/globalthis-1.0.4.tgz",
      "integrity": "sha512-DpLKbNU4WylpxJykQujfCcwYWiV/Jhm50Goo0wrVILAv5jOr9d+H+UR3PhSCD2rCCEIg0uc+G+muBTwD54JhDQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-properties": "^1.2.1",
        "gopd": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/has-bigints": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-bigints/-/has-bigints-1.1.0.tgz",
      "integrity": "sha512-R3pbpkcIqv2Pm3dUwgjclDRVmWpTJW2DcMzcIhEXEx1oh/CEMObMm3KLmRJOdvhM7o4uQBnwr8pzRK2sJWIqfg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-flag": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-4.0.0.tgz",
      "integrity": "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/has-property-descriptors": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/has-property-descriptors/-/has-property-descriptors-1.0.2.tgz",
      "integrity": "sha512-55JNKuIW+vq4Ke1BjOTjM2YctQIvCT7GFzHwmfZPGo5wnrgkid0YQtnAleFSqumZm4az3n2BS+erby5ipJdgrg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-define-property": "^1.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-proto": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/has-proto/-/has-proto-1.2.0.tgz",
      "integrity": "sha512-KIL7eQPfHQRC8+XluaIw7BHUwwqL19bQn4hzNgdr+1wXoU0KKj6rufu47lhY7KbJR2C6T6+PfyN0Ea7wkSS+qQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-tostringtag": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/has-tostringtag/-/has-tostringtag-1.0.2.tgz",
      "integrity": "sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-symbols": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.4.tgz",
      "integrity": "sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/hermes-estree": {
      "version": "0.25.1",
      "resolved": "https://registry.npmjs.org/hermes-estree/-/hermes-estree-0.25.1.tgz",
      "integrity": "sha512-0wUoCcLp+5Ev5pDW2OriHC2MJCbwLwuRx+gAqMTOkGKJJiBCLjtrvy4PWUGn6MIVefecRpzoOZ/UV6iGdOr+Cw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/hermes-parser": {
      "version": "0.25.1",
      "resolved": "https://registry.npmjs.org/hermes-parser/-/hermes-parser-0.25.1.tgz",
      "integrity": "sha512-6pEjquH3rqaI6cYAXYPcz9MS4rY6R4ngRgrgfDshRptUZIc3lw0MCIJIGDj9++mfySOuPTHB4nrSW99BCvOPIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hermes-estree": "0.25.1"
      }
    },
    "node_modules/iceberg-js": {
      "version": "0.8.1",
      "resolved": "https://registry.npmjs.org/iceberg-js/-/iceberg-js-0.8.1.tgz",
      "integrity": "sha512-1dhVQZXhcHje7798IVM+xoo/1ZdVfzOMIc8/rgVSijRK38EDqOJoGula9N/8ZI5RD8QTxNQtK/Gozpr+qUqRRA==",
      "license": "MIT",
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/idb": {
      "version": "8.0.3",
      "resolved": "https://registry.npmjs.org/idb/-/idb-8.0.3.tgz",
      "integrity": "sha512-LtwtVyVYO5BqRvcsKuB2iUMnHwPVByPCXFXOpuU96IZPPoPN6xjOGxZQ74pgSVVLQWtUOYgyeL4GE98BY5D3wg==",
      "license": "ISC"
    },
    "node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/import-fresh": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/import-fresh/-/import-fresh-3.3.1.tgz",
      "integrity": "sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "parent-module": "^1.0.0",
        "resolve-from": "^4.0.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/imurmurhash": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz",
      "integrity": "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.8.19"
      }
    },
    "node_modules/internal-slot": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/internal-slot/-/internal-slot-1.1.0.tgz",
      "integrity": "sha512-4gd7VpWNQNB4UKKCFFVcp1AVv+FMOgs9NKzjHKusc8jTMhd5eL1NqQqOpE0KzMds804/yHlglp3uxgluOqAPLw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "hasown": "^2.0.2",
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/is-array-buffer": {
      "version": "3.0.5",
      "resolved": "https://registry.npmjs.org/is-array-buffer/-/is-array-buffer-3.0.5.tgz",
      "integrity": "sha512-DDfANUiiG2wC1qawP66qlTugJeL5HyzMpfr8lLK+jMQirGzNod0B12cFB/9q838Ru27sBwfw78/rdoU7RERz6A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "get-intrinsic": "^1.2.6"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-async-function": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-async-function/-/is-async-function-2.1.1.tgz",
      "integrity": "sha512-9dgM/cZBnNvjzaMYHVoxxfPj2QXt22Ev7SuuPrs+xav0ukGB0S6d4ydZdEiM48kLx5kDV+QBPrpVnFyefL8kkQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "async-function": "^1.0.0",
        "call-bound": "^1.0.3",
        "get-proto": "^1.0.1",
        "has-tostringtag": "^1.0.2",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-bigint": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/is-bigint/-/is-bigint-1.1.0.tgz",
      "integrity": "sha512-n4ZT37wG78iz03xPRKJrHTdZbe3IicyucEtdRsV5yglwc3GyUfbAfpSeD0FJ41NbUNSt5wbhqfp1fS+BgnvDFQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-bigints": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-boolean-object": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/is-boolean-object/-/is-boolean-object-1.2.2.tgz",
      "integrity": "sha512-wa56o2/ElJMYqjCjGkXri7it5FbebW5usLw/nPmCMs5DeZ7eziSYZhSmPRn0txqeW4LnAmQQU7FgqLpsEFKM4A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-bun-module": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/is-bun-module/-/is-bun-module-2.0.0.tgz",
      "integrity": "sha512-gNCGbnnnnFAUGKeZ9PdbyeGYJqewpmc2aKHUEMO5nQPWU9lOmv7jcmQIv+qHD8fXW6W7qfuCwX4rY9LNRjXrkQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "semver": "^7.7.1"
      }
    },
    "node_modules/is-bun-module/node_modules/semver": {
      "version": "7.8.5",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz",
      "integrity": "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/is-callable": {
      "version": "1.2.7",
      "resolved": "https://registry.npmjs.org/is-callable/-/is-callable-1.2.7.tgz",
      "integrity": "sha512-1BC0BVFhS/p0qtw6enp8e+8OD0UrK0oFLztSjNzhcKA3WDuJxxAPXzPuPtKkjEY9UUoEWlX/8fgKeu2S8i9JTA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-core-module": {
      "version": "2.16.2",
      "resolved": "https://registry.npmjs.org/is-core-module/-/is-core-module-2.16.2.tgz",
      "integrity": "sha512-evOr8xfXKxE6qSR0hSXL2r3sd7ALj8+7jQEUvPYcm5sgZFdJ+AYzT6yNmJenvIYQBgIGwfwz08sL8zoL7yq2BA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hasown": "^2.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-data-view": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/is-data-view/-/is-data-view-1.0.2.tgz",
      "integrity": "sha512-RKtWF8pGmS87i2D6gqQu/l7EYRlVdfzemCJN/P3UOs//x1QE7mfhvzHIApBTRf7axvT6DMGwSwBXYCT0nfB9xw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "get-intrinsic": "^1.2.6",
        "is-typed-array": "^1.1.13"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-date-object": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/is-date-object/-/is-date-object-1.1.0.tgz",
      "integrity": "sha512-PwwhEakHVKTdRNVOw+/Gyh0+MzlCl4R6qKvkhuvLtPMggI1WAHt9sOwZxQLSGpUaDnrdyDsomoRgNnCfKNSXXg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-document.all": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/is-document.all/-/is-document.all-1.0.0.tgz",
      "integrity": "sha512-+XSoyS05OdBbhFuELhgTCpFNHkpBOJqtsZfUFFpe5QTw+9Sjbh8zitxhQkYAo6wV7e1Vb8cAPvpCk9jGam/82g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-finalizationregistry": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-finalizationregistry/-/is-finalizationregistry-1.1.1.tgz",
      "integrity": "sha512-1pC6N8qWJbWoPtEjgcL2xyhQOP491EQjeUo3qTKcmV8YSDDJrOepfG8pcC7h/QgnQHYSv0mJ3Z/ZWxmatVrysg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-generator-function": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/is-generator-function/-/is-generator-function-1.1.2.tgz",
      "integrity": "sha512-upqt1SkGkODW9tsGNG5mtXTXtECizwtS2kA161M+gJPc1xdb/Ax629af6YrTwcOeQHbewrPNlE5Dx7kzvXTizA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.4",
        "generator-function": "^2.0.0",
        "get-proto": "^1.0.1",
        "has-tostringtag": "^1.0.2",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-map": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/is-map/-/is-map-2.0.3.tgz",
      "integrity": "sha512-1Qed0/Hr2m+YqxnM09CjA2d/i6YZNfF6R2oRAOj36eUdS6qIV/huPJNSEpKbupewFs+ZsJlxsjjPbc0/afW6Lw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-negative-zero": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/is-negative-zero/-/is-negative-zero-2.0.3.tgz",
      "integrity": "sha512-5KoIu2Ngpyek75jXodFvnafB6DJgr3u8uuK0LEZJjrU19DrMD3EVERaR8sjz8CCGgpZvxPl9SuE1GMVPFHx1mw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-number": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
      "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.12.0"
      }
    },
    "node_modules/is-number-object": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-number-object/-/is-number-object-1.1.1.tgz",
      "integrity": "sha512-lZhclumE1G6VYD8VHe35wFaIif+CTy5SJIi5+3y4psDgWu4wPDoBhF8NxUOinEc7pHgiTsT6MaBb92rKhhD+Xw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-regex": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/is-regex/-/is-regex-1.2.1.tgz",
      "integrity": "sha512-MjYsKHO5O7mCsmRGxWcLWheFqN9DJ/2TmngvjKXihe6efViPqc274+Fx/4fYj/r03+ESvBdTXK0V6tA3rgez1g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "gopd": "^1.2.0",
        "has-tostringtag": "^1.0.2",
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-set": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/is-set/-/is-set-2.0.3.tgz",
      "integrity": "sha512-iPAjerrse27/ygGLxw+EBR9agv9Y6uLeYVJMu+QNCoouJ1/1ri0mGrcWpfCqFZuzzx3WjtwxG098X+n4OuRkPg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-shared-array-buffer": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/is-shared-array-buffer/-/is-shared-array-buffer-1.0.4.tgz",
      "integrity": "sha512-ISWac8drv4ZGfwKl5slpHG9OwPNty4jOWPRIhBpxOoD+hqITiwuipOQ2bNthAzwA3B4fIjO4Nln74N0S9byq8A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-string": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-string/-/is-string-1.1.1.tgz",
      "integrity": "sha512-BtEeSsoaQjlSPBemMQIrY1MY0uM6vnS1g5fmufYOtnxLGUZM2178PKbhsk7Ffv58IX+ZtcvoGwccYsh0PglkAA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-symbol": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-symbol/-/is-symbol-1.1.1.tgz",
      "integrity": "sha512-9gGx6GTtCQM73BgmHQXfDmLtfjjTUDSyoxTCbp5WtoixAhfgsDirWIcVQ/IHpvI5Vgd5i/J5F7B9cN/WlVbC/w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "has-symbols": "^1.1.0",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-typed-array": {
      "version": "1.1.15",
      "resolved": "https://registry.npmjs.org/is-typed-array/-/is-typed-array-1.1.15.tgz",
      "integrity": "sha512-p3EcsicXjit7SaskXHs1hA91QxgTw46Fv6EFKKGS5DRFLD8yKnohjF3hxoju94b/OcMZoQukzpPpBE9uLVKzgQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "which-typed-array": "^1.1.16"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-weakmap": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/is-weakmap/-/is-weakmap-2.0.2.tgz",
      "integrity": "sha512-K5pXYOm9wqY1RgjpL3YTkF39tni1XajUIkawTLUo9EZEVUFga5gSQJF8nNS7ZwJQ02y+1YCNYcMh+HIf1ZqE+w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-weakref": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-weakref/-/is-weakref-1.1.1.tgz",
      "integrity": "sha512-6i9mGWSlqzNMEqpCp93KwRS1uUOodk2OJ6b+sq7ZPDSy2WuI5NFIxp/254TytR8ftefexkWn5xNiHUNpPOfSew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-weakset": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/is-weakset/-/is-weakset-2.0.4.tgz",
      "integrity": "sha512-mfcwb6IzQyOKTs84CQMrOwW4gQcaTOAWJ0zzJCl2WSPDrWk/OzDaImWFH3djXhb24g4eudZfLRozAvPGw4d9hQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "get-intrinsic": "^1.2.6"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/isarray": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/isarray/-/isarray-2.0.5.tgz",
      "integrity": "sha512-xHjhDr3cNBK0BzdUJSPXZntQUx/mwMS5Rw4A7lPJ90XGAO6ISP/ePDNuo0vhqOZU+UD5JoodwCAAoZQd3FeAKw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/isomorphic.js": {
      "version": "0.2.5",
      "resolved": "https://registry.npmjs.org/isomorphic.js/-/isomorphic.js-0.2.5.tgz",
      "integrity": "sha512-PIeMbHqMt4DnUP3MA/Flc0HElYjMXArsw1qwJZcm9sqR8mq3l8NYizFMty0pWwE/tzIGH3EKK5+jes5mAr85yw==",
      "license": "MIT",
      "peer": true,
      "funding": {
        "type": "GitHub Sponsors ❤",
        "url": "https://github.com/sponsors/dmonad"
      }
    },
    "node_modules/iterator.prototype": {
      "version": "1.1.5",
      "resolved": "https://registry.npmjs.org/iterator.prototype/-/iterator.prototype-1.1.5.tgz",
      "integrity": "sha512-H0dkQoCa3b2VEeKQBOxFph+JAbcrQdE7KC0UkqwpLmv2EC4P41QXP+rqo9wYodACiG5/WM5s9oDApTU8utwj9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.1.4",
        "es-object-atoms": "^1.0.0",
        "get-intrinsic": "^1.2.6",
        "get-proto": "^1.0.0",
        "has-symbols": "^1.1.0",
        "set-function-name": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/jiti": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/jiti/-/jiti-2.7.0.tgz",
      "integrity": "sha512-AC/7JofJvZGrrneWNaEnJeOLUx+JlGt7tNa0wZiRPT4MY1wmfKjt2+6O2p2uz2+skll8OZZmJMNqeke7kKbNgQ==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jiti": "lib/jiti-cli.mjs"
      }
    },
    "node_modules/js-tokens": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
      "integrity": "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/js-yaml": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.3.0.tgz",
      "integrity": "sha512-1td788aAnnZ5qs7V2QIRl1owjtYpbKt749Y3xauqQgwIIGF/xXWz1wMTEBx5O3LK3lXLVuqXPdPxj2BoFHaW9Q==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/puzrin"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/nodeca"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/jsesc": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/jsesc/-/jsesc-3.1.0.tgz",
      "integrity": "sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jsesc": "bin/jsesc"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/json-buffer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/json-buffer/-/json-buffer-3.0.1.tgz",
      "integrity": "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-schema-traverse": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-0.4.1.tgz",
      "integrity": "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-stable-stringify-without-jsonify": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz",
      "integrity": "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json5": {
      "version": "2.2.3",
      "resolved": "https://registry.npmjs.org/json5/-/json5-2.2.3.tgz",
      "integrity": "sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "json5": "lib/cli.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/jsx-ast-utils": {
      "version": "3.3.5",
      "resolved": "https://registry.npmjs.org/jsx-ast-utils/-/jsx-ast-utils-3.3.5.tgz",
      "integrity": "sha512-ZZow9HBI5O6EPgSJLUb8n2NKgmVWTwCvHGwFuJlMjvLFqlGG6pjirPhtdsseaLZjSibD8eegzmYpUZwoIlj2cQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-includes": "^3.1.6",
        "array.prototype.flat": "^1.3.1",
        "object.assign": "^4.1.4",
        "object.values": "^1.1.6"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/katex": {
      "version": "0.16.47",
      "resolved": "https://registry.npmjs.org/katex/-/katex-0.16.47.tgz",
      "integrity": "sha512-Eeo8Ys1doU1z+x8AZsPpQu+p/QcZBI5PeOo7QGQdy2x2m0MU/hYagBbGOmXwr5KVbEfVuWv9LpnQWeehogurjg==",
      "funding": [
        "https://opencollective.com/katex",
        "https://github.com/sponsors/katex"
      ],
      "license": "MIT",
      "dependencies": {
        "commander": "^8.3.0"
      },
      "bin": {
        "katex": "cli.js"
      }
    },
    "node_modules/keyv": {
      "version": "4.5.4",
      "resolved": "https://registry.npmjs.org/keyv/-/keyv-4.5.4.tgz",
      "integrity": "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "json-buffer": "3.0.1"
      }
    },
    "node_modules/language-subtag-registry": {
      "version": "0.3.23",
      "resolved": "https://registry.npmjs.org/language-subtag-registry/-/language-subtag-registry-0.3.23.tgz",
      "integrity": "sha512-0K65Lea881pHotoGEa5gDlMxt3pctLi2RplBb7Ezh4rRdLEOtgi7n4EwK9lamnUCkKBqaeKRVebTq6BAxSkpXQ==",
      "dev": true,
      "license": "CC0-1.0"
    },
    "node_modules/language-tags": {
      "version": "1.0.9",
      "resolved": "https://registry.npmjs.org/language-tags/-/language-tags-1.0.9.tgz",
      "integrity": "sha512-MbjN408fEndfiQXbFQ1vnd+1NoLDsnQW41410oQBXiyXDMYH5z505juWa4KUE1LqxRC7DgOgZDbKLxHIwm27hA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "language-subtag-registry": "^0.3.20"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/levn": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/levn/-/levn-0.4.1.tgz",
      "integrity": "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1",
        "type-check": "~0.4.0"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/lib0": {
      "version": "0.2.117",
      "resolved": "https://registry.npmjs.org/lib0/-/lib0-0.2.117.tgz",
      "integrity": "sha512-DeXj9X5xDCjgKLU/7RR+/HQEVzuuEUiwldwOGsHK/sfAfELGWEyTcf0x+uOvCvK3O2zPmZePXWL85vtia6GyZw==",
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "isomorphic.js": "^0.2.4"
      },
      "bin": {
        "0ecdsa-generate-keypair": "bin/0ecdsa-generate-keypair.js",
        "0gentesthtml": "bin/gentesthtml.js",
        "0serve": "bin/0serve.js"
      },
      "engines": {
        "node": ">=16"
      },
      "funding": {
        "type": "GitHub Sponsors ❤",
        "url": "https://github.com/sponsors/dmonad"
      }
    },
    "node_modules/lightningcss": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.32.0.tgz",
      "integrity": "sha512-NXYBzinNrblfraPGyrbPoD19C1h9lfI/1mzgWYvXUTe414Gz/X1FD2XBZSZM7rRTrMA8JL3OtAaGifrIKhQ5yQ==",
      "dev": true,
      "license": "MPL-2.0",
      "dependencies": {
        "detect-libc": "^2.0.3"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      },
      "optionalDependencies": {
        "lightningcss-android-arm64": "1.32.0",
        "lightningcss-darwin-arm64": "1.32.0",
        "lightningcss-darwin-x64": "1.32.0",
        "lightningcss-freebsd-x64": "1.32.0",
        "lightningcss-linux-arm-gnueabihf": "1.32.0",
        "lightningcss-linux-arm64-gnu": "1.32.0",
        "lightningcss-linux-arm64-musl": "1.32.0",
        "lightningcss-linux-x64-gnu": "1.32.0",
        "lightningcss-linux-x64-musl": "1.32.0",
        "lightningcss-win32-arm64-msvc": "1.32.0",
        "lightningcss-win32-x64-msvc": "1.32.0"
      }
    },
    "node_modules/lightningcss-android-arm64": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-android-arm64/-/lightningcss-android-arm64-1.32.0.tgz",
      "integrity": "sha512-YK7/ClTt4kAK0vo6w3X+Pnm0D2cf2vPHbhOXdoNti1Ga0al1P4TBZhwjATvjNwLEBCnKvjJc2jQgHXH0NEwlAg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-arm64": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.32.0.tgz",
      "integrity": "sha512-RzeG9Ju5bag2Bv1/lwlVJvBE3q6TtXskdZLLCyfg5pt+HLz9BqlICO7LZM7VHNTTn/5PRhHFBSjk5lc4cmscPQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-x64": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-x64/-/lightningcss-darwin-x64-1.32.0.tgz",
      "integrity": "sha512-U+QsBp2m/s2wqpUYT/6wnlagdZbtZdndSmut/NJqlCcMLTWp5muCrID+K5UJ6jqD2BFshejCYXniPDbNh73V8w==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-freebsd-x64": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-freebsd-x64/-/lightningcss-freebsd-x64-1.32.0.tgz",
      "integrity": "sha512-JCTigedEksZk3tHTTthnMdVfGf61Fky8Ji2E4YjUTEQX14xiy/lTzXnu1vwiZe3bYe0q+SpsSH/CTeDXK6WHig==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm-gnueabihf": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/-/lightningcss-linux-arm-gnueabihf-1.32.0.tgz",
      "integrity": "sha512-x6rnnpRa2GL0zQOkt6rts3YDPzduLpWvwAF6EMhXFVZXD4tPrBkEFqzGowzCsIWsPjqSK+tyNEODUBXeeVHSkw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-gnu": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-gnu/-/lightningcss-linux-arm64-gnu-1.32.0.tgz",
      "integrity": "sha512-0nnMyoyOLRJXfbMOilaSRcLH3Jw5z9HDNGfT/gwCPgaDjnx0i8w7vBzFLFR1f6CMLKF8gVbebmkUN3fa/kQJpQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-musl": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-musl/-/lightningcss-linux-arm64-musl-1.32.0.tgz",
      "integrity": "sha512-UpQkoenr4UJEzgVIYpI80lDFvRmPVg6oqboNHfoH4CQIfNA+HOrZ7Mo7KZP02dC6LjghPQJeBsvXhJod/wnIBg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-gnu": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.32.0.tgz",
      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-musl": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-musl/-/lightningcss-linux-x64-musl-1.32.0.tgz",
      "integrity": "sha512-bYcLp+Vb0awsiXg/80uCRezCYHNg1/l3mt0gzHnWV9XP1W5sKa5/TCdGWaR/zBM2PeF/HbsQv/j2URNOiVuxWg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-arm64-msvc": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-arm64-msvc/-/lightningcss-win32-arm64-msvc-1.32.0.tgz",
      "integrity": "sha512-8SbC8BR40pS6baCM8sbtYDSwEVQd4JlFTOlaD3gWGHfThTcABnNDBda6eTZeqbofalIJhFx0qKzgHJmcPTnGdw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-x64-msvc": {
      "version": "1.32.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.32.0.tgz",
      "integrity": "sha512-Amq9B/SoZYdDi1kFrojnoqPLxYhQ4Wo5XiL8EVJrVsB8ARoC1PWW6VGtT0WKCemjy8aC+louJnjS7U18x3b06Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/linkifyjs": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/linkifyjs/-/linkifyjs-4.3.3.tgz",
      "integrity": "sha512-P8aEP5U/D1/IlTY2OeYsErdwh9bGuLE30NcXtKEjgdHcahveQoQwM2yZNsioQHsWFz0P7KKudisbrzCgR0sDHg==",
      "license": "MIT"
    },
    "node_modules/locate-path": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/locate-path/-/locate-path-6.0.0.tgz",
      "integrity": "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-locate": "^5.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/lodash.merge": {
      "version": "4.6.2",
      "resolved": "https://registry.npmjs.org/lodash.merge/-/lodash.merge-4.6.2.tgz",
      "integrity": "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/loose-envify": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/loose-envify/-/loose-envify-1.4.0.tgz",
      "integrity": "sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "js-tokens": "^3.0.0 || ^4.0.0"
      },
      "bin": {
        "loose-envify": "cli.js"
      }
    },
    "node_modules/lru-cache": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-5.1.1.tgz",
      "integrity": "sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "yallist": "^3.0.2"
      }
    },
    "node_modules/magic-string": {
      "version": "0.30.21",
      "resolved": "https://registry.npmjs.org/magic-string/-/magic-string-0.30.21.tgz",
      "integrity": "sha512-vd2F4YUyEXKGcLHoq+TEyCjxueSeHnFxyyjNp80yg0XV4vUhnDer/lvvlqM/arB5bXQN5K2/3oinyCRyx8T2CQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.5"
      }
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/merge2": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/merge2/-/merge2-1.4.1.tgz",
      "integrity": "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/micromatch": {
      "version": "4.0.8",
      "resolved": "https://registry.npmjs.org/micromatch/-/micromatch-4.0.8.tgz",
      "integrity": "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "braces": "^3.0.3",
        "picomatch": "^2.3.1"
      },
      "engines": {
        "node": ">=8.6"
      }
    },
    "node_modules/minimatch": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.5.tgz",
      "integrity": "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/minimist": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/minimist/-/minimist-1.2.8.tgz",
      "integrity": "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/nanoid": {
      "version": "5.1.16",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-5.1.16.tgz",
      "integrity": "sha512-kVrnsrJqMR8+oLJnGEmSWw9BivK5mt7H3FZatVRjrc5wGqFYuBxX1yG7+A7Gi5AefkX6t/oCkizcQgpu0cY1dQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.js"
      },
      "engines": {
        "node": "^18 || >=20"
      }
    },
    "node_modules/napi-postinstall": {
      "version": "0.3.4",
      "resolved": "https://registry.npmjs.org/napi-postinstall/-/napi-postinstall-0.3.4.tgz",
      "integrity": "sha512-PHI5f1O0EP5xJ9gQmFGMS6IZcrVvTjpXjz7Na41gTE7eE2hK11lg04CECCYEEjdc17EV4DO+fkGEtt7TpTaTiQ==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "napi-postinstall": "lib/cli.js"
      },
      "engines": {
        "node": "^12.20.0 || ^14.18.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/napi-postinstall"
      }
    },
    "node_modules/natural-compare": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/natural-compare/-/natural-compare-1.4.0.tgz",
      "integrity": "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/next": {
      "version": "16.2.9",
      "resolved": "https://registry.npmjs.org/next/-/next-16.2.9.tgz",
      "integrity": "sha512-MEOJiq/UvuezAdqVSceHbqDgZt1kDw2tpGVOlsdIoJsQdbN2JY2hpVG4xnXGkbdJUOEWhnRfiu/O4Hpc9Juwww==",
      "license": "MIT",
      "dependencies": {
        "@next/env": "16.2.9",
        "@swc/helpers": "0.5.15",
        "baseline-browser-mapping": "^2.9.19",
        "caniuse-lite": "^1.0.30001579",
        "postcss": "8.4.31",
        "styled-jsx": "5.1.6"
      },
      "bin": {
        "next": "dist/bin/next"
      },
      "engines": {
        "node": ">=20.9.0"
      },
      "optionalDependencies": {
        "@next/swc-darwin-arm64": "16.2.9",
        "@next/swc-darwin-x64": "16.2.9",
        "@next/swc-linux-arm64-gnu": "16.2.9",
        "@next/swc-linux-arm64-musl": "16.2.9",
        "@next/swc-linux-x64-gnu": "16.2.9",
        "@next/swc-linux-x64-musl": "16.2.9",
        "@next/swc-win32-arm64-msvc": "16.2.9",
        "@next/swc-win32-x64-msvc": "16.2.9",
        "sharp": "^0.34.5"
      },
      "peerDependencies": {
        "@opentelemetry/api": "^1.1.0",
        "@playwright/test": "^1.51.1",
        "babel-plugin-react-compiler": "*",
        "react": "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0",
        "react-dom": "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0",
        "sass": "^1.3.0"
      },
      "peerDependenciesMeta": {
        "@opentelemetry/api": {
          "optional": true
        },
        "@playwright/test": {
          "optional": true
        },
        "babel-plugin-react-compiler": {
          "optional": true
        },
        "sass": {
          "optional": true
        }
      }
    },
    "node_modules/next/node_modules/nanoid": {
      "version": "3.3.16",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.16.tgz",
      "integrity": "sha512-bzlKTyNJ7+LdGIIwy8ijFpIqEQIvafahV7eYykJ8Cvh42EdJeODoJ6gUJXpQJvej1BddH8OqTXZNE/KfbWAu8Q==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/next/node_modules/postcss": {
      "version": "8.4.31",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.4.31.tgz",
      "integrity": "sha512-PS08Iboia9mts/2ygV3eLpY5ghnUcfLV/EXTOW1E2qYxJKGGBUtNjN76FYHnMs36RmARn41bC0AZmn+rR0OVpQ==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.6",
        "picocolors": "^1.0.0",
        "source-map-js": "^1.0.2"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/node-exports-info": {
      "version": "1.6.2",
      "resolved": "https://registry.npmjs.org/node-exports-info/-/node-exports-info-1.6.2.tgz",
      "integrity": "sha512-kXs9Go0cah0qHVV2v389IXQLdLCeE1xfFtjOAF+iobu0OIoG1pje8At2vMHyaPMiPMnG/LWP50twML21eMcAag==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array.prototype.flatmap": "^1.3.3",
        "es-errors": "^1.3.0",
        "object.entries": "^1.1.9",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/node-releases": {
      "version": "2.0.51",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.51.tgz",
      "integrity": "sha512-wRNIrw4DmVLKQlbgOMdkMx27Wrpzes2hh5Jtbi2bjPd+4wJstWIqP5A+lscnqbm0xxmT5Bpg8Lec5ItEBwx6BQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-inspect": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/object-inspect/-/object-inspect-1.13.4.tgz",
      "integrity": "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/object-keys": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/object-keys/-/object-keys-1.1.1.tgz",
      "integrity": "sha512-NuAESUOUMrlIXOfHKzD6bpPu3tYt3xvjNdRIQ+FeT0lNb4K8WR70CaDxhuNguS2XG+GjkyMwOzsN5ZktImfhLA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/object.assign": {
      "version": "4.1.7",
      "resolved": "https://registry.npmjs.org/object.assign/-/object.assign-4.1.7.tgz",
      "integrity": "sha512-nK28WOo+QIjBkDduTINE4JkF/UJJKyf2EJxvJKfblDpyg0Q+pkOHNTL0Qwy6NP6FhE/EnzV73BxxqcJaXY9anw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.0.0",
        "has-symbols": "^1.1.0",
        "object-keys": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/object.entries": {
      "version": "1.1.9",
      "resolved": "https://registry.npmjs.org/object.entries/-/object.entries-1.1.9.tgz",
      "integrity": "sha512-8u/hfXFRBD1O0hPUjioLhoWFHRmt6tKA4/vZPyckBr18l1KE9uHrFaFaUi8MDRTpi4uak2goyPTSNJLXX2k2Hw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/object.fromentries": {
      "version": "2.0.8",
      "resolved": "https://registry.npmjs.org/object.fromentries/-/object.fromentries-2.0.8.tgz",
      "integrity": "sha512-k6E21FzySsSK5a21KRADBd/NGneRegFO5pLHfdQLpRDETUNJueLXs3WCzyQ3tFRDYgbq3KHGXfTbi2bs8WQ6rQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.2",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/object.groupby": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/object.groupby/-/object.groupby-1.0.3.tgz",
      "integrity": "sha512-+Lhy3TQTuzXI5hevh8sBGqbmurHbbIjAi0Z4S63nthVLmLxfbj4T54a4CfZrXIrt9iP4mVAPYMo/v99taj3wjQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/object.values": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/object.values/-/object.values-1.2.1.tgz",
      "integrity": "sha512-gXah6aZrcUxjWg2zR2MwouP2eHlCBzdV4pygudehaKXSGW4v2AsRQUK+lwwXhii6KFZcunEnmSUoYp5CXibxtA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/optionator": {
      "version": "0.9.4",
      "resolved": "https://registry.npmjs.org/optionator/-/optionator-0.9.4.tgz",
      "integrity": "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "deep-is": "^0.1.3",
        "fast-levenshtein": "^2.0.6",
        "levn": "^0.4.1",
        "prelude-ls": "^1.2.1",
        "type-check": "^0.4.0",
        "word-wrap": "^1.2.5"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/orderedmap": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/orderedmap/-/orderedmap-2.1.1.tgz",
      "integrity": "sha512-TvAWxi0nDe1j/rtMcWcIj94+Ffe6n7zhow33h40SKxmsmozs6dz/e+EajymfoFcHd7sxNn8yHM8839uixMOV6g==",
      "license": "MIT"
    },
    "node_modules/own-keys": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/own-keys/-/own-keys-1.0.2.tgz",
      "integrity": "sha512-19YVAg7T+WTrxggPukVq7DjTv6+PJ867TmhCvBsYwmbFCsZd344rq2Ld1p0wo8f8Qrrhgp82c6FJRqdXWtSEhg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.4",
        "get-intrinsic": "^1.3.0",
        "object-keys": "^1.1.1",
        "safe-push-apply": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/p-limit": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/p-limit/-/p-limit-3.1.0.tgz",
      "integrity": "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "yocto-queue": "^0.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/p-locate": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/p-locate/-/p-locate-5.0.0.tgz",
      "integrity": "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-limit": "^3.0.2"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/parent-module": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/parent-module/-/parent-module-1.0.1.tgz",
      "integrity": "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "callsites": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/path-exists": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz",
      "integrity": "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-parse": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/path-parse/-/path-parse-1.0.7.tgz",
      "integrity": "sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "2.3.2",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.2.tgz",
      "integrity": "sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/possible-typed-array-names": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/possible-typed-array-names/-/possible-typed-array-names-1.1.0.tgz",
      "integrity": "sha512-/+5VFTchJDoVj3bhoqi6UeymcD00DAwb1nJwamzPvHEszJ4FpF6SNNbUbOS8yI56qHzdV8eK0qEfOSiodkTdxg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.25",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.25.tgz",
      "integrity": "sha512-DTPx3RWSSnWyzLxQnlH0rJP+EW5ekl16ZU4/psbIhA0e53kJfdgaN5vKM+xP7yJtXVu+nfdVFmlgFDEKAe4Pyw==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.16",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/postcss/node_modules/nanoid": {
      "version": "3.3.16",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.16.tgz",
      "integrity": "sha512-bzlKTyNJ7+LdGIIwy8ijFpIqEQIvafahV7eYykJ8Cvh42EdJeODoJ6gUJXpQJvej1BddH8OqTXZNE/KfbWAu8Q==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/prelude-ls": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/prelude-ls/-/prelude-ls-1.2.1.tgz",
      "integrity": "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/prop-types": {
      "version": "15.8.1",
      "resolved": "https://registry.npmjs.org/prop-types/-/prop-types-15.8.1.tgz",
      "integrity": "sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.4.0",
        "object-assign": "^4.1.1",
        "react-is": "^16.13.1"
      }
    },
    "node_modules/prosemirror-changeset": {
      "version": "2.4.1",
      "resolved": "https://registry.npmjs.org/prosemirror-changeset/-/prosemirror-changeset-2.4.1.tgz",
      "integrity": "sha512-96WBLhOaYhJ+kPhLg3uW359Tz6I/MfcrQfL4EGv4SrcqKEMC1gmoGrXHecPE8eOwTVCJ4IwgfzM8fFad25wNfw==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-transform": "^1.0.0"
      }
    },
    "node_modules/prosemirror-commands": {
      "version": "1.7.1",
      "resolved": "https://registry.npmjs.org/prosemirror-commands/-/prosemirror-commands-1.7.1.tgz",
      "integrity": "sha512-rT7qZnQtx5c0/y/KlYaGvtG411S97UaL6gdp6RIZ23DLHanMYLyfGBV5DtSnZdthQql7W+lEVbpSfwtO8T+L2w==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-model": "^1.0.0",
        "prosemirror-state": "^1.0.0",
        "prosemirror-transform": "^1.10.2"
      }
    },
    "node_modules/prosemirror-dropcursor": {
      "version": "1.8.3",
      "resolved": "https://registry.npmjs.org/prosemirror-dropcursor/-/prosemirror-dropcursor-1.8.3.tgz",
      "integrity": "sha512-FoYbsJR8gK+DGlqhNoE29Loa38eIZPzQRIb1VMaDNBoo4OLP6vVof/jR8qFY/6XvUd6Dhug8MDCHl2a/h8RTfQ==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-state": "^1.0.0",
        "prosemirror-transform": "^1.1.0",
        "prosemirror-view": "^1.1.0"
      }
    },
    "node_modules/prosemirror-gapcursor": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/prosemirror-gapcursor/-/prosemirror-gapcursor-1.4.1.tgz",
      "integrity": "sha512-pMdYaEnjNMSwl11yjEGtgTmLkR08m/Vl+Jj443167p9eB3HVQKhYCc4gmHVDsLPODfZfjr/MmirsdyZziXbQKw==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-keymap": "^1.0.0",
        "prosemirror-model": "^1.0.0",
        "prosemirror-state": "^1.0.0",
        "prosemirror-view": "^1.0.0"
      }
    },
    "node_modules/prosemirror-history": {
      "version": "1.5.0",
      "resolved": "https://registry.npmjs.org/prosemirror-history/-/prosemirror-history-1.5.0.tgz",
      "integrity": "sha512-zlzTiH01eKA55UAf1MEjtssJeHnGxO0j4K4Dpx+gnmX9n+SHNlDqI2oO1Kv1iPN5B1dm5fsljCfqKF9nFL6HRg==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-state": "^1.2.2",
        "prosemirror-transform": "^1.0.0",
        "prosemirror-view": "^1.31.0",
        "rope-sequence": "^1.3.0"
      }
    },
    "node_modules/prosemirror-inputrules": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/prosemirror-inputrules/-/prosemirror-inputrules-1.5.1.tgz",
      "integrity": "sha512-7wj4uMjKaXWAQ1CDgxNzNtR9AlsuwzHfdFH1ygEHA2KHF2DOEaXl1CJfNPAKCg9qNEh4rum975QLaCiQPyY6Fw==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-state": "^1.0.0",
        "prosemirror-transform": "^1.0.0"
      }
    },
    "node_modules/prosemirror-keymap": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/prosemirror-keymap/-/prosemirror-keymap-1.2.3.tgz",
      "integrity": "sha512-4HucRlpiLd1IPQQXNqeo81BGtkY8Ai5smHhKW9jjPKRc2wQIxksg7Hl1tTI2IfT2B/LgX6bfYvXxEpJl7aKYKw==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-state": "^1.0.0",
        "w3c-keyname": "^2.2.0"
      }
    },
    "node_modules/prosemirror-model": {
      "version": "1.25.11",
      "resolved": "https://registry.npmjs.org/prosemirror-model/-/prosemirror-model-1.25.11.tgz",
      "integrity": "sha512-QWg9RhnpLlogAmp3p96uEFrE5txQpFynd4vhBAELkwgOCWQs/X0yCzB3/hrHqiPwf91RG5KyWq6553zs9JqIOQ==",
      "license": "MIT",
      "dependencies": {
        "orderedmap": "^2.0.0"
      }
    },
    "node_modules/prosemirror-schema-list": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/prosemirror-schema-list/-/prosemirror-schema-list-1.5.1.tgz",
      "integrity": "sha512-927lFx/uwyQaGwJxLWCZRkjXG0p48KpMj6ueoYiu4JX05GGuGcgzAy62dfiV8eFZftgyBUvLx76RsMe20fJl+Q==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-model": "^1.0.0",
        "prosemirror-state": "^1.0.0",
        "prosemirror-transform": "^1.7.3"
      }
    },
    "node_modules/prosemirror-state": {
      "version": "1.4.4",
      "resolved": "https://registry.npmjs.org/prosemirror-state/-/prosemirror-state-1.4.4.tgz",
      "integrity": "sha512-6jiYHH2CIGbCfnxdHbXZ12gySFY/fz/ulZE333G6bPqIZ4F+TXo9ifiR86nAHpWnfoNjOb3o5ESi7J8Uz1jXHw==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-model": "^1.0.0",
        "prosemirror-transform": "^1.0.0",
        "prosemirror-view": "^1.27.0"
      }
    },
    "node_modules/prosemirror-tables": {
      "version": "1.8.5",
      "resolved": "https://registry.npmjs.org/prosemirror-tables/-/prosemirror-tables-1.8.5.tgz",
      "integrity": "sha512-V/0cDCsHKHe/tfWkeCmthNUcEp1IVO3p6vwN8XtwE9PZQLAZJigbw3QoraAdfJPir4NKJtNvOB8oYGKRl+t0Dw==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-keymap": "^1.2.3",
        "prosemirror-model": "^1.25.4",
        "prosemirror-state": "^1.4.4",
        "prosemirror-transform": "^1.10.5",
        "prosemirror-view": "^1.41.4"
      }
    },
    "node_modules/prosemirror-transform": {
      "version": "1.12.0",
      "resolved": "https://registry.npmjs.org/prosemirror-transform/-/prosemirror-transform-1.12.0.tgz",
      "integrity": "sha512-GxboyN4AMIsoHNtz5uf2r2Ru551i5hWeCMD6E2Ib4Eogqoub0NflniaBPVQ4MrGE5yZ8JV9tUHg9qcZTTrcN4w==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-model": "^1.21.0"
      }
    },
    "node_modules/prosemirror-view": {
      "version": "1.42.2",
      "resolved": "https://registry.npmjs.org/prosemirror-view/-/prosemirror-view-1.42.2.tgz",
      "integrity": "sha512-Pdg0l5kXm8aLDquFAnQFTCITg0q44sLqBlHlpsVLD9segdOao8TOfQdAhCrCXyVgPSRr6UDDROOIWA3bIrN9YQ==",
      "license": "MIT",
      "dependencies": {
        "prosemirror-model": "^1.25.8",
        "prosemirror-state": "^1.0.0",
        "prosemirror-transform": "^1.1.0"
      }
    },
    "node_modules/punycode": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz",
      "integrity": "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/queue-microtask": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/queue-microtask/-/queue-microtask-1.2.3.tgz",
      "integrity": "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/react": {
      "version": "19.2.4",
      "resolved": "https://registry.npmjs.org/react/-/react-19.2.4.tgz",
      "integrity": "sha512-9nfp2hYpCwOjAN+8TZFGhtWEwgvWHXqESH8qT89AT/lWklpLON22Lc8pEtnpsZz7VmawabSU0gCjnj8aC0euHQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.2.4",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.2.4.tgz",
      "integrity": "sha512-AXJdLo8kgMbimY95O2aKQqsz2iWi9jMgKJhRBAxECE4IFxfcazB2LmzloIoibJI3C12IlY20+KFaLv+71bUJeQ==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.27.0"
      },
      "peerDependencies": {
        "react": "^19.2.4"
      }
    },
    "node_modules/react-is": {
      "version": "16.13.1",
      "resolved": "https://registry.npmjs.org/react-is/-/react-is-16.13.1.tgz",
      "integrity": "sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/reflect.getprototypeof": {
      "version": "1.0.10",
      "resolved": "https://registry.npmjs.org/reflect.getprototypeof/-/reflect.getprototypeof-1.0.10.tgz",
      "integrity": "sha512-00o4I+DVrefhv+nX0ulyi3biSHCPDe+yLv5o/p6d/UVlirijB8E16FtfwSAi4g3tcqrQ4lRAqQSoFEZJehYEcw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.9",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0",
        "get-intrinsic": "^1.2.7",
        "get-proto": "^1.0.1",
        "which-builtin-type": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/regexp.prototype.flags": {
      "version": "1.5.4",
      "resolved": "https://registry.npmjs.org/regexp.prototype.flags/-/regexp.prototype.flags-1.5.4.tgz",
      "integrity": "sha512-dYqgNSZbDwkaJ2ceRd9ojCGjBq+mOm9LmtXnAnEGyHhN/5R7iDW2TRw3h+o/jCFxus3P2LfWIIiwowAjANm7IA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-errors": "^1.3.0",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "set-function-name": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/resolve": {
      "version": "2.0.0-next.7",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-2.0.0-next.7.tgz",
      "integrity": "sha512-tqt+NBWwyaMgw3zDsnygx4CByWjQEJHOPMdslYhppaQSJUtL/D4JO9CcBBlhPoI8lz9oJIDXkwXfhF4aWqP8xQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "is-core-module": "^2.16.2",
        "node-exports-info": "^1.6.0",
        "object-keys": "^1.1.1",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/resolve-from": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-4.0.0.tgz",
      "integrity": "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/resolve-pkg-maps": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/resolve-pkg-maps/-/resolve-pkg-maps-1.0.0.tgz",
      "integrity": "sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/privatenumber/resolve-pkg-maps?sponsor=1"
      }
    },
    "node_modules/reusify": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/reusify/-/reusify-1.1.0.tgz",
      "integrity": "sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "iojs": ">=1.0.0",
        "node": ">=0.10.0"
      }
    },
    "node_modules/rope-sequence": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/rope-sequence/-/rope-sequence-1.3.4.tgz",
      "integrity": "sha512-UT5EDe2cu2E/6O4igUr5PSFs23nvvukicWHx6GnOPlHAiiYbzNuCRQCuiUdHJQcqKalLKlrYJnjY0ySGsXNQXQ==",
      "license": "MIT"
    },
    "node_modules/run-parallel": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/run-parallel/-/run-parallel-1.2.0.tgz",
      "integrity": "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "queue-microtask": "^1.2.2"
      }
    },
    "node_modules/safe-array-concat": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/safe-array-concat/-/safe-array-concat-1.1.4.tgz",
      "integrity": "sha512-wtZlHyOje6OZTGqAoaDKxFkgRtkF9CnHAVnCHKfuj200wAgL+bSJhdsCD2l0Qx/2ekEXjPWcyKkfGb5CPboslg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "get-intrinsic": "^1.3.0",
        "has-symbols": "^1.1.0",
        "isarray": "^2.0.5"
      },
      "engines": {
        "node": ">=0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/safe-push-apply": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/safe-push-apply/-/safe-push-apply-1.0.0.tgz",
      "integrity": "sha512-iKE9w/Z7xCzUMIZqdBsp6pEQvwuEebH4vdpjcDWnyzaI6yl6O9FHvVpmGelvEHNsoY6wGblkxR6Zty/h00WiSA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "isarray": "^2.0.5"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/safe-regex-test": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/safe-regex-test/-/safe-regex-test-1.1.0.tgz",
      "integrity": "sha512-x/+Cz4YrimQxQccJf5mKEbIa1NzeCRNI5Ecl/ekmlYaampdNLPalVyIcCZNNH3MvmqBugV5TMYZXv0ljslUlaw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "is-regex": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/scheduler": {
      "version": "0.27.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.27.0.tgz",
      "integrity": "sha512-eNv+WrVbKu1f3vbYJT/xtiF5syA5HPIMtf9IgY/nKg0sWqzAUEvqY/xm7OcZc/qafLx/iO9FgOmeSAp4v5ti/Q==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/set-function-length": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/set-function-length/-/set-function-length-1.2.2.tgz",
      "integrity": "sha512-pgRc4hJ4/sNjWCSS9AmnS40x3bNMDTknHgL5UaMBTMyJnU90EgWh1Rz+MC9eFu4BuN/UwZjKQuY/1v3rM7HMfg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.1.4",
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2",
        "get-intrinsic": "^1.2.4",
        "gopd": "^1.0.1",
        "has-property-descriptors": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/set-function-name": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/set-function-name/-/set-function-name-2.0.2.tgz",
      "integrity": "sha512-7PGFlmtwsEADb0WYyvCMa1t+yke6daIG4Wirafur5kcf+MhUnPms1UeR0CKQdTZD81yESwMHbtn+TR+dMviakQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.1.4",
        "es-errors": "^1.3.0",
        "functions-have-names": "^1.2.3",
        "has-property-descriptors": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/set-proto": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/set-proto/-/set-proto-1.0.0.tgz",
      "integrity": "sha512-RJRdvCo6IAnPdsvP/7m6bsQqNnn1FCBX5ZNtFL98MmFF/4xAIJTIg1YbHW5DC2W5SKZanrC6i4HsJqlajw/dZw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/sharp": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/sharp/-/sharp-0.34.5.tgz",
      "integrity": "sha512-Ou9I5Ft9WNcCbXrU9cMgPBcCK8LiwLqcbywW3t4oDV37n1pzpuNLsYiAV8eODnjbtQlSDwZ2cUEeQz4E54Hltg==",
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "optional": true,
      "dependencies": {
        "@img/colour": "^1.0.0",
        "detect-libc": "^2.1.2",
        "semver": "^7.7.3"
      },
      "engines": {
        "node": "^18.17.0 || ^20.3.0 || >=21.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-darwin-arm64": "0.34.5",
        "@img/sharp-darwin-x64": "0.34.5",
        "@img/sharp-libvips-darwin-arm64": "1.2.4",
        "@img/sharp-libvips-darwin-x64": "1.2.4",
        "@img/sharp-libvips-linux-arm": "1.2.4",
        "@img/sharp-libvips-linux-arm64": "1.2.4",
        "@img/sharp-libvips-linux-ppc64": "1.2.4",
        "@img/sharp-libvips-linux-riscv64": "1.2.4",
        "@img/sharp-libvips-linux-s390x": "1.2.4",
        "@img/sharp-libvips-linux-x64": "1.2.4",
        "@img/sharp-libvips-linuxmusl-arm64": "1.2.4",
        "@img/sharp-libvips-linuxmusl-x64": "1.2.4",
        "@img/sharp-linux-arm": "0.34.5",
        "@img/sharp-linux-arm64": "0.34.5",
        "@img/sharp-linux-ppc64": "0.34.5",
        "@img/sharp-linux-riscv64": "0.34.5",
        "@img/sharp-linux-s390x": "0.34.5",
        "@img/sharp-linux-x64": "0.34.5",
        "@img/sharp-linuxmusl-arm64": "0.34.5",
        "@img/sharp-linuxmusl-x64": "0.34.5",
        "@img/sharp-wasm32": "0.34.5",
        "@img/sharp-win32-arm64": "0.34.5",
        "@img/sharp-win32-ia32": "0.34.5",
        "@img/sharp-win32-x64": "0.34.5"
      }
    },
    "node_modules/sharp/node_modules/semver": {
      "version": "7.8.5",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz",
      "integrity": "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==",
      "license": "ISC",
      "optional": true,
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/side-channel": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/side-channel/-/side-channel-1.1.1.tgz",
      "integrity": "sha512-6x6dK6zJdpTzF4sQeNYxwtvBzf6Eg4GtlesS94HOvTudUeyK2WXAaIfmDgsyslYrRBeFIlsi54AYsFGUuhmvrQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.4",
        "side-channel-list": "^1.0.1",
        "side-channel-map": "^1.0.1",
        "side-channel-weakmap": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-list": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-list/-/side-channel-list-1.0.1.tgz",
      "integrity": "sha512-mjn/0bi/oUURjc5Xl7IaWi/OJJJumuoJFQJfDDyO46+hBWsfaVM65TBHq2eoZBhzl9EchxOijpkbRC8SVBQU0w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-map": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-map/-/side-channel-map-1.0.1.tgz",
      "integrity": "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-weakmap": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/side-channel-weakmap/-/side-channel-weakmap-1.0.2.tgz",
      "integrity": "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3",
        "side-channel-map": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/stable-hash": {
      "version": "0.0.5",
      "resolved": "https://registry.npmjs.org/stable-hash/-/stable-hash-0.0.5.tgz",
      "integrity": "sha512-+L3ccpzibovGXFK+Ap/f8LOS0ahMrHTf3xu7mMLSpEGU0EO9ucaysSylKo9eRDFNhWve/y275iPmIZ4z39a9iA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/stop-iteration-iterator": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/stop-iteration-iterator/-/stop-iteration-iterator-1.1.0.tgz",
      "integrity": "sha512-eLoXW/DHyl62zxY4SCaIgnRhuMr6ri4juEYARS8E6sCEqzKpOiE521Ucofdx+KnDZl5xmvGYaaKCk5FEOxJCoQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "internal-slot": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/string.prototype.includes": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/string.prototype.includes/-/string.prototype.includes-2.0.1.tgz",
      "integrity": "sha512-o7+c9bW6zpAdJHTtujeePODAhkuicdAryFsfVKwA+wGw89wJ4GTY484WTucM9hLtDEOpOvI+aHnzqnC5lHp4Rg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.3"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/string.prototype.matchall": {
      "version": "4.0.12",
      "resolved": "https://registry.npmjs.org/string.prototype.matchall/-/string.prototype.matchall-4.0.12.tgz",
      "integrity": "sha512-6CC9uyBL+/48dYizRf7H7VAYCMCNTBeM78x/VTUe9bFEaxBepPJDa1Ow99LqI/1yF7kuy7Q3cQsYMrcjGUcskA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.6",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0",
        "get-intrinsic": "^1.2.6",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "internal-slot": "^1.1.0",
        "regexp.prototype.flags": "^1.5.3",
        "set-function-name": "^2.0.2",
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/string.prototype.repeat": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/string.prototype.repeat/-/string.prototype.repeat-1.0.0.tgz",
      "integrity": "sha512-0u/TldDbKD8bFCQ/4f5+mNRrXwZ8hg2w7ZR8wa16e8z9XpePWl3eGEcUD0OXpEH/VJH/2G3gjUtR3ZOiBe2S/w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-properties": "^1.1.3",
        "es-abstract": "^1.17.5"
      }
    },
    "node_modules/string.prototype.trim": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/string.prototype.trim/-/string.prototype.trim-1.2.11.tgz",
      "integrity": "sha512-PwvK7BU+CMTJGYQCTZb5RWXIML92lftJLhQz1tBzgKiqGxJaMlBAa48POXaNAC2s4y8jr3EFqrkF9+44neS46w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "define-data-property": "^1.1.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.24.2",
        "es-object-atoms": "^1.1.2",
        "has-property-descriptors": "^1.0.2",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/string.prototype.trimend": {
      "version": "1.0.10",
      "resolved": "https://registry.npmjs.org/string.prototype.trimend/-/string.prototype.trimend-1.0.10.tgz",
      "integrity": "sha512-2+3aDAOmPTmuFwjDnmJG2ctEkQKVki7vOSqaxkv42Mowj1V6PnvuwFCRrR5lChUux1TBskPjfkeTOhqczDMxTw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/string.prototype.trimstart": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/string.prototype.trimstart/-/string.prototype.trimstart-1.0.8.tgz",
      "integrity": "sha512-UXSH262CSZY1tfu3G3Secr6uGLCFVPMhIqHjlgCUtCCcgihYc/xKs9djMTMUOb2j1mVSeU8EU6NWc/iQKU6Gfg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/strip-bom": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/strip-bom/-/strip-bom-3.0.0.tgz",
      "integrity": "sha512-vavAMRXOgBVNF6nyEEmL3DBK19iRpDcoIwW+swQ+CbGiu7lju6t+JklA1MHweoWtadgt4ISVUsXLyDq34ddcwA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/styled-jsx": {
      "version": "5.1.6",
      "resolved": "https://registry.npmjs.org/styled-jsx/-/styled-jsx-5.1.6.tgz",
      "integrity": "sha512-qSVyDTeMotdvQYoHWLNGwRFJHC+i+ZvdBRYosOFgC+Wg1vx4frN2/RG/NA7SYqqvKNLf39P2LSRA2pu6n0XYZA==",
      "license": "MIT",
      "dependencies": {
        "client-only": "0.0.1"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "peerDependencies": {
        "react": ">= 16.8.0 || 17.x.x || ^18.0.0-0 || ^19.0.0-0"
      },
      "peerDependenciesMeta": {
        "@babel/core": {
          "optional": true
        },
        "babel-plugin-macros": {
          "optional": true
        }
      }
    },
    "node_modules/supports-color": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-7.2.0.tgz",
      "integrity": "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/supports-preserve-symlinks-flag": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/supports-preserve-symlinks-flag/-/supports-preserve-symlinks-flag-1.0.0.tgz",
      "integrity": "sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/tailwindcss": {
      "version": "4.3.3",
      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-4.3.3.tgz",
      "integrity": "sha512-gOhV3P7ufE62QDGg1zVaTgCR+EtPv92k2nIhVcVKcLmxT1sUBsQGhnZj175j+MqRt4zLF7ic+sCYjfhxMxj7YQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/tapable": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/tapable/-/tapable-2.3.3.tgz",
      "integrity": "sha512-uxc/zpqFg6x7C8vOE7lh6Lbda8eEL9zmVm/PLeTPBRhh1xCgdWaQ+J1CUieGpIfm2HdtsUpRv+HshiasBMcc6A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/webpack"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/tinyglobby/node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/tinyglobby/node_modules/picomatch": {
      "version": "4.0.5",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.5.tgz",
      "integrity": "sha512-RvwwcruNjI1ncT5xRakeyS9Lf8lcItv34KD+aif+VH9kduAyfYBipGh12274xtenIPZ119/R9BdTBa8gAwSh0A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/to-regex-range": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/to-regex-range/-/to-regex-range-5.0.1.tgz",
      "integrity": "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-number": "^7.0.0"
      },
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/ts-api-utils": {
      "version": "2.5.0",
      "resolved": "https://registry.npmjs.org/ts-api-utils/-/ts-api-utils-2.5.0.tgz",
      "integrity": "sha512-OJ/ibxhPlqrMM0UiNHJ/0CKQkoKF243/AEmplt3qpRgkW8VG7IfOS41h7V8TjITqdByHzrjcS/2si+y4lIh8NA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18.12"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4"
      }
    },
    "node_modules/tsconfig-paths": {
      "version": "3.15.0",
      "resolved": "https://registry.npmjs.org/tsconfig-paths/-/tsconfig-paths-3.15.0.tgz",
      "integrity": "sha512-2Ac2RgzDe/cn48GvOe3M+o82pEFewD3UPbyoUHHdKasHwJKjds4fLXWf/Ux5kATBKN20oaFGu+jbElp1pos0mg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/json5": "^0.0.29",
        "json5": "^1.0.2",
        "minimist": "^1.2.6",
        "strip-bom": "^3.0.0"
      }
    },
    "node_modules/tsconfig-paths/node_modules/json5": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/json5/-/json5-1.0.2.tgz",
      "integrity": "sha512-g1MWMLBiz8FKi1e4w0UyVL3w+iJceWAFBAaBnnGKOpNa5f8TLktkbre1+s6oICydWAm+HRUGTmI+//xv2hvXYA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "minimist": "^1.2.0"
      },
      "bin": {
        "json5": "lib/cli.js"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "license": "0BSD"
    },
    "node_modules/type-check": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz",
      "integrity": "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/typed-array-buffer": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/typed-array-buffer/-/typed-array-buffer-1.0.3.tgz",
      "integrity": "sha512-nAYYwfY3qnzX30IkA6AQZjVbtK6duGontcQm1WSG1MD94YLqK0515GNApXkoxKOWMusVssAHWLh9SeaoefYFGw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "is-typed-array": "^1.1.14"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/typed-array-byte-length": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/typed-array-byte-length/-/typed-array-byte-length-1.0.3.tgz",
      "integrity": "sha512-BaXgOuIxz8n8pIq3e7Atg/7s+DpiYrxn4vdot3w9KbnBhcRQq6o3xemQdIfynqSeXeDrF32x+WvfzmOjPiY9lg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "for-each": "^0.3.3",
        "gopd": "^1.2.0",
        "has-proto": "^1.2.0",
        "is-typed-array": "^1.1.14"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/typed-array-byte-offset": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/typed-array-byte-offset/-/typed-array-byte-offset-1.0.4.tgz",
      "integrity": "sha512-bTlAFB/FBYMcuX81gbL4OcpH5PmlFHqlCCpAl8AlEzMz5k53oNDvN8p1PNOWLEmI2x4orp3raOFB51tv9X+MFQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "available-typed-arrays": "^1.0.7",
        "call-bind": "^1.0.8",
        "for-each": "^0.3.3",
        "gopd": "^1.2.0",
        "has-proto": "^1.2.0",
        "is-typed-array": "^1.1.15",
        "reflect.getprototypeof": "^1.0.9"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/typed-array-length": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/typed-array-length/-/typed-array-length-1.0.8.tgz",
      "integrity": "sha512-phPGCwqr2+Qo0fwniCE8e4pKnGu/yFb5nD5Y8bf0EEeiI5GklnACYA9GFy/DrAeRrKHXvHn+1SUsOWgJp6RO+g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "for-each": "^0.3.5",
        "gopd": "^1.2.0",
        "is-typed-array": "^1.1.15",
        "possible-typed-array-names": "^1.1.0",
        "reflect.getprototypeof": "^1.0.10"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/typescript": {
      "version": "5.9.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz",
      "integrity": "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/typescript-eslint": {
      "version": "8.65.0",
      "resolved": "https://registry.npmjs.org/typescript-eslint/-/typescript-eslint-8.65.0.tgz",
      "integrity": "sha512-/ggrHAwyjENDusvyxbuqxAC2dTnZg/Z8F+fgQtYIz+L6n/9HfSlEZcFGV/NsMNa6CkGk0xUjUAFwC0vHOflvIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/eslint-plugin": "8.65.0",
        "@typescript-eslint/parser": "8.65.0",
        "@typescript-eslint/typescript-estree": "8.65.0",
        "@typescript-eslint/utils": "8.65.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/unbox-primitive": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/unbox-primitive/-/unbox-primitive-1.1.0.tgz",
      "integrity": "sha512-nWJ91DjeOkej/TA8pXQ3myruKpKEYgqvpw9lz4OPHj/NWFNluYrjbz9j01CJ8yKQd2g4jFoOkINCTW2I5LEEyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-bigints": "^1.0.2",
        "has-symbols": "^1.1.0",
        "which-boxed-primitive": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/undici-types": {
      "version": "6.21.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-6.21.0.tgz",
      "integrity": "sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/unrs-resolver": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/unrs-resolver/-/unrs-resolver-1.12.2.tgz",
      "integrity": "sha512-dmlRxBJJayXjqTwC+JtF1HhJmgf3ftQ3YejFcZrf4+KKtJv0qDsK1pjqaaVjG7wJ5NJ6UVP1OqRMQ71Z4C3rxQ==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "dependencies": {
        "napi-postinstall": "^0.3.4"
      },
      "funding": {
        "url": "https://opencollective.com/unrs-resolver"
      },
      "optionalDependencies": {
        "@unrs/resolver-binding-android-arm-eabi": "1.12.2",
        "@unrs/resolver-binding-android-arm64": "1.12.2",
        "@unrs/resolver-binding-darwin-arm64": "1.12.2",
        "@unrs/resolver-binding-darwin-x64": "1.12.2",
        "@unrs/resolver-binding-freebsd-x64": "1.12.2",
        "@unrs/resolver-binding-linux-arm-gnueabihf": "1.12.2",
        "@unrs/resolver-binding-linux-arm-musleabihf": "1.12.2",
        "@unrs/resolver-binding-linux-arm64-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-arm64-musl": "1.12.2",
        "@unrs/resolver-binding-linux-loong64-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-loong64-musl": "1.12.2",
        "@unrs/resolver-binding-linux-ppc64-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-riscv64-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-riscv64-musl": "1.12.2",
        "@unrs/resolver-binding-linux-s390x-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-x64-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-x64-musl": "1.12.2",
        "@unrs/resolver-binding-openharmony-arm64": "1.12.2",
        "@unrs/resolver-binding-wasm32-wasi": "1.12.2",
        "@unrs/resolver-binding-win32-arm64-msvc": "1.12.2",
        "@unrs/resolver-binding-win32-ia32-msvc": "1.12.2",
        "@unrs/resolver-binding-win32-x64-msvc": "1.12.2"
      }
    },
    "node_modules/update-browserslist-db": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.2.3.tgz",
      "integrity": "sha512-Js0m9cx+qOgDxo0eMiFGEueWztz+d4+M3rGlmKPT+T4IS/jP4ylw3Nwpu6cpTTP8R1MAC1kF4VbdLt3ARf209w==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.1"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/uri-js": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/uri-js/-/uri-js-4.4.1.tgz",
      "integrity": "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "punycode": "^2.1.0"
      }
    },
    "node_modules/use-sync-external-store": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/use-sync-external-store/-/use-sync-external-store-1.6.0.tgz",
      "integrity": "sha512-Pp6GSwGP/NrPIrxVFAIkOQeyw8lFenOHijQWkUTrDvrF4ALqylP2C/KCkeS9dpUM3KvYRQhna5vt7IL95+ZQ9w==",
      "license": "MIT",
      "peerDependencies": {
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/w3c-keyname": {
      "version": "2.2.8",
      "resolved": "https://registry.npmjs.org/w3c-keyname/-/w3c-keyname-2.2.8.tgz",
      "integrity": "sha512-dpojBhNsCNN7T82Tm7k26A6G9ML3NkhDsnw9n/eoxSRlVBB4CEtIQ/KTCLI2Fwf3ataSXRhYFkQi3SlnFwPvPQ==",
      "license": "MIT"
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/which-boxed-primitive": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/which-boxed-primitive/-/which-boxed-primitive-1.1.1.tgz",
      "integrity": "sha512-TbX3mj8n0odCBFVlY8AxkqcHASw3L60jIuF8jFP78az3C2YhmGvqbHBpAjTRH2/xqYunrJ9g1jSyjCjpoWzIAA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-bigint": "^1.1.0",
        "is-boolean-object": "^1.2.1",
        "is-number-object": "^1.1.1",
        "is-string": "^1.1.1",
        "is-symbol": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/which-builtin-type": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/which-builtin-type/-/which-builtin-type-1.2.1.tgz",
      "integrity": "sha512-6iBczoX+kDQ7a3+YJBnh3T+KZRxM/iYNPXicqk66/Qfm1b93iu+yOImkg0zHbj5LNOcNv1TEADiZ0xa34B4q6Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "function.prototype.name": "^1.1.6",
        "has-tostringtag": "^1.0.2",
        "is-async-function": "^2.0.0",
        "is-date-object": "^1.1.0",
        "is-finalizationregistry": "^1.1.0",
        "is-generator-function": "^1.0.10",
        "is-regex": "^1.2.1",
        "is-weakref": "^1.0.2",
        "isarray": "^2.0.5",
        "which-boxed-primitive": "^1.1.0",
        "which-collection": "^1.0.2",
        "which-typed-array": "^1.1.16"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/which-collection": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/which-collection/-/which-collection-1.0.2.tgz",
      "integrity": "sha512-K4jVyjnBdgvc86Y6BkaLZEN933SwYOuBFkdmBu9ZfkcAbdVbpITnDmjvZ/aQjRXQrv5EPkTnD1s39GiiqbngCw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-map": "^2.0.3",
        "is-set": "^2.0.3",
        "is-weakmap": "^2.0.2",
        "is-weakset": "^2.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/which-typed-array": {
      "version": "1.1.22",
      "resolved": "https://registry.npmjs.org/which-typed-array/-/which-typed-array-1.1.22.tgz",
      "integrity": "sha512-fvO4ExWMFsqyhG3AiPAObMuY1lxaqgYcxbc49CNdWDDECOJNgQyvsOWVwbZc+qf3rzRtxojBK+CMEv0Ld5CYpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "available-typed-arrays": "^1.0.7",
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "for-each": "^0.3.5",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/word-wrap": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/word-wrap/-/word-wrap-1.2.5.tgz",
      "integrity": "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/y-protocols": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/y-protocols/-/y-protocols-1.0.7.tgz",
      "integrity": "sha512-YSVsLoXxO67J6eE/nV4AtFtT3QEotZf5sK5BHxFBXso7VDUT3Tx07IfA6hsu5Q5OmBdMkQVmFZ9QOA7fikWvnw==",
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "lib0": "^0.2.85"
      },
      "engines": {
        "node": ">=16.0.0",
        "npm": ">=8.0.0"
      },
      "funding": {
        "type": "GitHub Sponsors ❤",
        "url": "https://github.com/sponsors/dmonad"
      },
      "peerDependencies": {
        "yjs": "^13.0.0"
      }
    },
    "node_modules/yallist": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-3.1.1.tgz",
      "integrity": "sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/yjs": {
      "version": "13.6.31",
      "resolved": "https://registry.npmjs.org/yjs/-/yjs-13.6.31.tgz",
      "integrity": "sha512-Eq+5BRfbeGyqGVrTJL3bEcr8gKkxPuyuoHmAwpk52fDb8kOVMrfVSTRPd6yiGgX5Fskb96qCRjzjbRjrL4YEnw==",
      "license": "MIT",
      "peer": true,
      "dependencies": {
        "lib0": "^0.2.99"
      },
      "engines": {
        "node": ">=16.0.0",
        "npm": ">=8.0.0"
      },
      "funding": {
        "type": "GitHub Sponsors ❤",
        "url": "https://github.com/sponsors/dmonad"
      }
    },
    "node_modules/yocto-queue": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz",
      "integrity": "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/zod": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/zod/-/zod-4.4.3.tgz",
      "integrity": "sha512-ytENFjIJFl2UwYglde2jchW2Hwm4GJFLDiSXWdTrJQBIN9Fcyp7n4DhxJEiWNAJMV1/BqWfW/kkg71UDcHJyTQ==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    },
    "node_modules/zod-validation-error": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/zod-validation-error/-/zod-validation-error-4.0.2.tgz",
      "integrity": "sha512-Q6/nZLe6jxuU80qb/4uJ4t5v2VEZ44lzQjPDhYJNztRQ4wyWc6VF3D3Kb/fAuPetZQnhS3hnajCf9CsWesghLQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18.0.0"
      },
      "peerDependencies": {
        "zod": "^3.25.0 || ^4.0.0"
      }
    }
  }
}

````

## File: package.json
````
{
  "name": "nexus",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.1",
    "@tiptap/core": "3.27.1",
    "@tiptap/extension-drag-handle": "3.27.1",
    "@tiptap/extension-highlight": "3.27.1",
    "@tiptap/extension-image": "3.27.1",
    "@tiptap/extension-link": "3.27.1",
    "@tiptap/extension-mathematics": "3.27.1",
    "@tiptap/extension-node-range": "3.27.1",
    "@tiptap/extension-placeholder": "3.27.1",
    "@tiptap/extension-table": "3.27.1",
    "@tiptap/extension-task-item": "3.27.1",
    "@tiptap/extension-task-list": "3.27.1",
    "@tiptap/extension-text-align": "3.27.1",
    "@tiptap/extension-text-style": "3.27.1",
    "@tiptap/extension-typography": "3.27.1",
    "@tiptap/extension-underline": "3.27.1",
    "@tiptap/starter-kit": "3.27.1",
    "idb": "^8.0.3",
    "katex": "^0.16.11",
    "nanoid": "^5.1.16",
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "tailwindcss": "^4",
    "typescript": "^5"
  },
  "overrides": {
    "@tiptap/core": "3.27.1",
    "@tiptap/pm": "3.27.1"
  }
}

````

## File: postcss.config.mjs
````
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;

````

## File: src/app/globals.css
````
@import "tailwindcss";

:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-border: #e5e5e5;
  --color-sidebar-bg: #fafafa;
  --color-sidebar-text: #4a4a4a;
  --color-editor-bg: #ffffff;
  --color-panel-bg: #f9f9f9;
}

.dark {
  --color-bg: #18181b;
  --color-text: #e4e4e7;
  --color-border: #3f3f46;
  --color-sidebar-bg: #1e1e22;
  --color-sidebar-text: #a1a1aa;
  --color-editor-bg: #18181b;
  --color-panel-bg: #1e1e22;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; }
body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #a3a3a3; }
.dark ::-webkit-scrollbar-thumb { background: #52525b; }
.dark ::-webkit-scrollbar-thumb:hover { background: #71717a; }

.ProseMirror { outline: none; min-height: 400px; }
.ProseMirror p { color: var(--color-text); font-size: 15px; line-height: 1.6; }
.ProseMirror h1 { font-size: 2em; font-weight: 700; line-height: 1.2; margin: 1.5em 0 0.5em 0; }
.ProseMirror h2 { font-size: 1.5em; font-weight: 600; line-height: 1.3; margin: 1.2em 0 0.4em 0; }
.ProseMirror h3 { font-size: 1.25em; font-weight: 600; line-height: 1.4; margin: 1em 0 0.4em 0; }
.ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; margin: 0.5em 0; }
.ProseMirror li { margin: 0.2em 0; }
.ProseMirror blockquote { border-left: 3px solid var(--color-border); padding-left: 1em; margin: 0.5em 0; color: var(--color-sidebar-text); font-style: italic; }
.ProseMirror code { background: var(--color-sidebar-bg); padding: 0.1em 0.3em; border-radius: 3px; font-family: "Courier New", monospace; font-size: 0.9em; }
.ProseMirror pre { background: var(--color-sidebar-bg); padding: 1em; border-radius: 6px; overflow-x: auto; margin: 0.5em 0; }
.ProseMirror pre code { background: none; padding: 0; }
.ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--color-sidebar-text); opacity: 0.5; pointer-events: none; float: left; height: 0; }

/* === Print === */
@media print {
  body * { visibility: hidden; }
  .nexus-print-target, .nexus-print-target * { visibility: visible; }
  .nexus-print-target { position: absolute; left: 0; top: 0; width: 100%; }
  .nexus-print-hide { display: none !important; }
}

/* === PageFormat Engine (Task 1) === */
/* Flow = default, centered */
.nexus-format-flow {
  max-width: 820px;
  margin: 0 auto;
  padding: 16px 64px 48px;
  background: var(--color-editor-bg);
}

/* A4 paginated visual */
.nexus-format-a4-wrapper {
  background: #f5f5f4; /* gray behind paper */
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  min-height: 100%;
}
.nexus-format-a4-page {
  width: 210mm;
  min-height: 297mm;
  max-width: 100%;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08);
  padding: 20mm 18mm;
  position: relative;
  color: #1a1a1a;
}
.dark .nexus-format-a4-page {
  background: #fafafa;
  color: #1a1a1a;
}
.nexus-format-a4-page .ProseMirror,
.nexus-format-a4-page .ProseMirror p,
.nexus-format-a4-page .ProseMirror h1,
.nexus-format-a4-page .ProseMirror h2,
.nexus-format-a4-page .ProseMirror h3,
.nexus-format-a4-page .ProseMirror li,
.nexus-format-a4-page .ProseMirror blockquote,
.nexus-format-a4-page .ProseMirror ul,
.nexus-format-a4-page .ProseMirror ol {
  color: #1a1a1a !important;
}
.nexus-format-169-page,
.nexus-format-43-page {
  color: #1a1a1a;
}
.nexus-format-169-page .ProseMirror,
.nexus-format-169-page .ProseMirror p,
.nexus-format-169-page .ProseMirror h1,
.nexus-format-169-page .ProseMirror h2,
.nexus-format-169-page .ProseMirror h3,
.nexus-format-43-page .ProseMirror,
.nexus-format-43-page .ProseMirror p,
.nexus-format-43-page .ProseMirror h1,
.nexus-format-43-page .ProseMirror h2,
.nexus-format-43-page .ProseMirror h3,
.nexus-paged-content .ProseMirror,
.nexus-paged-content .ProseMirror p,
.nexus-paged-content .ProseMirror h1,
.nexus-paged-content .ProseMirror h2,
.nexus-paged-content .ProseMirror h3,
.nexus-paged-content .ProseMirror li,
.nexus-paged-content .ProseMirror blockquote {
  color: #1a1a1a !important;
}
.nexus-paged-content.nexus-paged-adapt .ProseMirror,
.nexus-paged-content.nexus-paged-adapt .ProseMirror p,
.nexus-paged-content.nexus-paged-adapt .ProseMirror h1,
.nexus-paged-content.nexus-paged-adapt .ProseMirror h2,
.nexus-paged-content.nexus-paged-adapt .ProseMirror h3,
.nexus-paged-content.nexus-paged-adapt .ProseMirror li,
.nexus-paged-content.nexus-paged-adapt .ProseMirror blockquote {
  color: var(--color-text) !important;
}
.nexus-paged-content .nexus-tiptap-editor {
  margin-left: 0 !important;
  padding-left: 0 !important;
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
}
.nexus-paged-content .ProseMirror {
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
}
.nexus-paged-content table {
  max-width: 100% !important;
  table-layout: fixed;
}
.nexus-paged-content .tableWrapper {
  max-width: 100%;
  overflow-x: auto;
}
.nexus-multi-column {
  display: grid;
  gap: 16px;
  margin: 1rem 0;
  padding: 0.5rem;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
.nexus-column {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: break-word;
}
.nexus-page-break {
  border: none;
  border-top: 2px dashed #94a3b8;
  margin: 24px 0;
  position: relative;
}
.nexus-page-break::after {
  content: "分頁符";
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 0 8px;
  font-size: 10px;
  color: #94a3b8;
}

/* 16:9 and 4:3 preview containers */
.nexus-format-169-wrapper, .nexus-format-43-wrapper {
  background: #1a1a1a;
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100%;
}
.nexus-format-169-page {
  width: 960px;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  background: white;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  padding: 32px 40px;
  overflow: auto;
}
.nexus-format-43-page {
  width: 800px;
  max-width: 100%;
  aspect-ratio: 4 / 3;
  background: white;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  padding: 32px 40px;
  overflow: auto;
}
````

## File: src/app/layout.tsx
````
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus",
  description: "Local-first, cross-platform knowledge workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
````

## File: src/app/page.tsx
````
import NexusApp from "../components/NexusApp";

export default function Home() {
  return <NexusApp />;
}
````

## File: src/components/AccountSettingsRow.tsx
````
"use client";
import { useEffect, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";
import { useLanguage } from "../lib/LanguageContext";
import type { SyncState } from "../lib/syncEngine";
import HelpGuide from "./HelpGuide";

export default function AccountSettingsRow({
  theme,
  onThemeChange,
  onExportBackup,
  onImportBackup,
  syncState,
}: {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  syncState?: SyncState;
}) {
  const { language, setLanguage, t } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as globalThis.Node)) setIsSettingsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  const syncLabel =
    syncState?.status === "syncing" ? "同步中..." :
    syncState?.status === "error" ? "同步錯誤" :
    syncState?.status === "connected" ? "已同步" :
    syncState?.status === "offline" ? "離線" : "本機";

  return (
    <>
      <div className="flex items-center justify-between gap-1.5 px-2.5 py-2.5 border-t shrink-0" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-1.5 text-xs opacity-60 px-1">
          <span style={{ color: "var(--color-text)" }}>{syncLabel}</span>
        </div>
        <div ref={settingsRef} className="relative shrink-0">
          {isSettingsOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl overflow-hidden shadow-2xl z-30" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
              <div className="px-3 py-2 text-xs font-semibold tracking-wider uppercase opacity-60" style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                {t("preferences.title")}
              </div>
              <div className="p-2.5 space-y-2">
                <div>
                  <div className="text-xs opacity-60 px-0.5 mb-1" style={{ color: "var(--color-text)" }}>{t("preferences.language")}</div>
                  <div className="space-y-0.5">
                    {SUPPORTED_LANGUAGES.map((option) => (
                      <button key={option.value} onClick={() => setLanguage(option.value)} className="w-full flex items-center justify-between rounded-md px-2.5 py-2 text-sm" style={{ backgroundColor: language === option.value ? "var(--color-border)" : "transparent", color: "var(--color-text)" }}>
                        <span>{option.label}</span>
                        {language === option.value && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-60 px-0.5 mb-1" style={{ color: "var(--color-text)" }}>{t("preferences.theme")}</div>
                  <div className="flex gap-1">
                    <button onClick={() => onThemeChange("light")} className="flex-1 rounded-md px-2.5 py-2 text-sm" style={{ backgroundColor: theme === "light" ? "var(--color-border)" : "transparent", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>淺色</button>
                    <button onClick={() => onThemeChange("dark")} className="flex-1 rounded-md px-2.5 py-2 text-sm" style={{ backgroundColor: theme === "dark" ? "var(--color-border)" : "transparent", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>深色</button>
                  </div>
                </div>
                <div className="pt-1" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <button onClick={() => { setIsHelpOpen(true); setIsSettingsOpen(false); }} className="w-full rounded-md px-3 py-2 text-sm text-left hover:bg-zinc-100 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                    <span>📖</span> 使用說明
                  </button>
                </div>
                <div className="pt-1" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <div className="text-xs opacity-60 px-0.5 mb-1.5" style={{ color: "var(--color-text)" }}>備份</div>
                  <div className="flex gap-1">
                    <button onClick={() => { onExportBackup(); setIsSettingsOpen(false); }} className="flex-1 rounded-md px-2 py-2 text-xs font-medium" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>匯出</button>
                    <button onClick={() => { onImportBackup(); setIsSettingsOpen(false); }} className="flex-1 rounded-md px-2 py-2 text-xs font-medium" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>匯入</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <button onClick={() => setIsSettingsOpen((prev) => !prev)} className="flex items-center justify-center w-9 h-9 rounded-md transition-all hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", backgroundColor: isSettingsOpen ? "var(--color-border)" : "transparent" }} title={t("preferences.title")}>
            <span className="text-base leading-none">⚙️</span>
          </button>
        </div>
      </div>
      <HelpGuide isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
````

## File: src/components/ChartRenderer.tsx
````
"use client";
import type { ChartData } from "../lib/types";

export default function ChartRenderer({ chart, width = 300, height = 160 }: { chart: ChartData; width?: number; height?: number }) {
  const data = chart.data || [];
  if (data.length === 0) return <div className="text-xs opacity-50">無資料</div>;

  const isHorizontal = chart.orientation === "horizontal";
  const type = chart.type;
  const variant = chart.variant || "single";

  // Helpers
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  // Grouped data helper
  const groupByLabel = () => {
    const map = new Map<string, { label: string; values: { series: string; value: number }[] }>();
    data.forEach((d) => {
      const label = d.label;
      if (!map.has(label)) map.set(label, { label, values: [] });
      map.get(label)!.values.push({ series: d.series || "預設", value: d.value });
    });
    return Array.from(map.values());
  };

  // --- BAR CHARTS ---
  if (type === "bar") {
    if (variant === "grouped") {
      const groups = groupByLabel();
      const seriesSet = Array.from(new Set(data.map((d) => d.series || "預設")));
      return (
        <div className="w-full" style={{ height }}>
          <div className={`flex ${isHorizontal ? "flex-col" : "flex-row"} items-end gap-2 h-full`}>
            {groups.map((g, gi) => (
              <div key={gi} className={`flex ${isHorizontal ? "flex-col" : "flex-row"} gap-1 flex-1`}>
                {g.values.map((v, vi) => (
                  <div key={vi} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full rounded-t" style={{ backgroundColor: colors[vi % colors.length], height: isHorizontal ? "12px" : `${Math.max(6, (v.value / maxValue) * (height - 40))}px`, width: isHorizontal ? `${Math.max(6, (v.value / maxValue) * 100)}%` : "100%" }} title={`${v.series}: ${v.value}`} />
                    {!isHorizontal && <span className="text-[8px] truncate">{g.label}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            {Array.from(new Set(data.map((d) => d.series || "預設"))).map((s, i) => (
              <span key={s} className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: colors[i % colors.length] }} />{s}</span>
            ))}
          </div>
        </div>
      );
    }
    if (variant === "stacked" || variant === "stacked-percent") {
      const groups = groupByLabel();
      return (
        <div className="w-full flex flex-col gap-2" style={{ height }}>
          {groups.map((g, gi) => {
            const total = g.values.reduce((sum, v) => sum + v.value, 0);
            return (
              <div key={gi} className="flex items-center gap-2">
                <span className="text-[10px] w-12 truncate">{g.label}</span>
                <div className={`flex ${isHorizontal ? "flex-row" : "flex-row"} flex-1 h-4 rounded overflow-hidden border`}>
                  {g.values.map((v, vi) => {
                    const percent = variant === "stacked-percent" ? (total ? (v.value / total) * 100 : 0) : (v.value / maxValue) * 100;
                    const widthPercent = variant === "stacked-percent" ? percent : (v.value / Math.max(...groups.map((gg) => gg.values.reduce((s, vv) => s + vv.value, 0)), 1)) * 100;
                    return <div key={vi} style={{ width: `${widthPercent}%`, backgroundColor: colors[vi % colors.length] }} title={`${v.series}: ${v.value}${variant === "stacked-percent" ? ` (${percent.toFixed(1)}%)` : ""}`} />;
                  })}
                </div>
                <span className="text-[9px] opacity-60">{variant === "stacked-percent" ? "100%" : total}</span>
              </div>
            );
          })}
        </div>
      );
    }
    // single / category
    return (
      <div className={`w-full flex ${isHorizontal ? "flex-col" : "flex-row items-end"} gap-2`} style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className={`flex ${isHorizontal ? "flex-row items-center" : "flex-col items-center"} gap-1 flex-1`}>
            {isHorizontal ? (
              <>
                <span className="text-[10px] w-12 truncate text-right">{d.label}</span>
                <div className="h-4 rounded" style={{ width: `${Math.max(4, (d.value / maxValue) * 100)}%`, backgroundColor: colors[i % colors.length] }} title={`${d.value}`} />
                <span className="text-[9px] opacity-60">{d.value}</span>
              </>
            ) : (
              <>
                <div className="w-full rounded-t" style={{ height: `${Math.max(6, (d.value / maxValue) * (height - 30))}px`, backgroundColor: colors[i % colors.length] }} title={`${d.value}`} />
                <span className="text-[9px] truncate max-w-full">{d.label}</span>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  // --- LINE CHART ---
  if (type === "line") {
    const points = data.map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * (width - 40) + 20;
      const y = height - 30 - (d.value / maxValue) * (height - 50);
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={points} />
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * (width - 40) + 20;
          const y = height - 30 - (d.value / maxValue) * (height - 50);
          return <circle key={i} cx={x} cy={y} r={3} fill="#3b82f6" />;
        })}
      </svg>
    );
  }

  // --- PIE / DONUT ---
  if (type === "pie" || type === "donut") {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let currentAngle = 0;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) / 2 - 10;
    const innerR = type === "donut" ? r * 0.5 : 0;

    return (
      <div className="flex items-center gap-3">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {data.map((d, i) => {
            const angle = (d.value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle += angle;
            const largeArc = angle > 180 ? 1 : 0;
            const x1 = cx + r * Math.cos((Math.PI * startAngle) / 180);
            const y1 = cy + r * Math.sin((Math.PI * startAngle) / 180);
            const x2 = cx + r * Math.cos((Math.PI * endAngle) / 180);
            const y2 = cy + r * Math.sin((Math.PI * endAngle) / 180);
            const x3 = cx + innerR * Math.cos((Math.PI * endAngle) / 180);
            const y3 = cy + innerR * Math.sin((Math.PI * endAngle) / 180);
            const x4 = cx + innerR * Math.cos((Math.PI * startAngle) / 180);
            const y4 = cy + innerR * Math.sin((Math.PI * startAngle) / 180);
            const path = innerR > 0
              ? `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`
              : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            return <path key={i} d={path} fill={colors[i % colors.length]} stroke="white" strokeWidth={1} />;
          })}
        </svg>
        <div className="flex flex-col gap-1">
          {data.map((d, i) => (
            <span key={i} className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: colors[i % colors.length] }} />{d.label}: {d.value}</span>
          ))}
        </div>
      </div>
    );
  }

  // --- PYRAMID ---
  if (type === "pyramid") {
    return (
      <div className="w-full flex flex-col items-center gap-1" style={{ height }}>
        {data.map((d, i) => {
          const wPercent = 100 - (i / data.length) * 60;
          return (
            <div key={i} className="flex items-center justify-center text-white text-[10px] transition-all" style={{ width: `${wPercent}%`, height: `${height / data.length - 4}px`, backgroundColor: colors[i % colors.length], clipPath: "polygon(10% 0, 90% 0, 100% 100%, 0% 100%)" }} title={`${d.label}: ${d.value}`}>
              {d.label}
            </div>
          );
        })}
      </div>
    );
  }

  // --- GANTT ---
  if (type === "gantt") {
    const maxEnd = Math.max(...data.map((d) => d.end || d.value), 1);
    return (
      <div className="w-full space-y-2" style={{ height }}>
        {data.map((d, i) => {
          const start = d.start || 0;
          const end = d.end || d.value;
          const left = (start / maxEnd) * 100;
          const widthBar = ((end - start) / maxEnd) * 100;
          return (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="w-16 truncate">{d.label}</span>
              <div className="flex-1 h-4 bg-zinc-100 rounded relative overflow-hidden">
                <div className="absolute h-full rounded" style={{ left: `${left}%`, width: `${widthBar}%`, backgroundColor: colors[i % colors.length] }} />
              </div>
              <span className="opacity-60">{d.start}→{d.end}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // --- RADAR ---
  if (type === "radar") {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) / 2 - 20;
    const angleStep = (2 * Math.PI) / data.length;
    const points = data.map((d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const dist = (d.value / maxValue) * r;
      const x = cx + dist * Math.cos(angle);
      const y = cy + dist * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg width={width} height={height}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1].map((scale, idx) => (
          <polygon key={idx} points={data.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = cx + r * scale * Math.cos(angle);
            const y = cy + r * scale * Math.sin(angle);
            return `${x},${y}`;
          }).join(" ")} fill="none" stroke="#e5e7eb" strokeWidth={0.5} />
        ))}
        {/* Axes */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />;
        })}
        <polygon points={points} fill="rgba(59,130,246,0.3)" stroke="#3b82f6" strokeWidth={2} />
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = cx + (r + 12) * Math.cos(angle);
          const y = cy + (r + 12) * Math.sin(angle);
          return <text key={i} x={x} y={y} fontSize={9} textAnchor="middle" dominantBaseline="middle">{d.label}</text>;
        })}
      </svg>
    );
  }

  // --- TIMELINE (文字圖表：時間軸) ---
  if (type === "timeline") {
    return (
      <div className="w-full flex flex-col gap-2 relative" style={{ height }}>
        <div className="absolute left-3 top-0 bottom-0 w-px bg-zinc-300" />
        {data.map((d, i) => (
          <div key={i} className="flex gap-3 items-start relative">
            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow flex items-center justify-center text-[8px] text-white shrink-0 z-10">{i+1}</div>
            <div className="flex-1 bg-white border rounded p-2 shadow-sm">
              <div className="text-xs font-medium">{d.label}</div>
              <div className="text-[10px] opacity-60">{d.value ? `值：${d.value}` : ""} {d.series || ""}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --- TEXT COLUMNS ---
  if (type === "text-columns") {
    const mid = Math.ceil(data.length / 2);
    const left = data.slice(0, mid);
    const right = data.slice(mid);
    return (
      <div className="w-full grid grid-cols-2 gap-3 text-xs" style={{ height }}>
        <div className="space-y-2">
          {left.map((d, i) => (
            <div key={i} className="border rounded p-2 bg-white">
              <div className="font-medium">{d.label}</div>
              <div className="opacity-60 text-[10px]">{d.value} {d.series || ""}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((d, i) => (
            <div key={i} className="border rounded p-2 bg-white">
              <div className="font-medium">{d.label}</div>
              <div className="opacity-60 text-[10px]">{d.value} {d.series || ""}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- TEXT LIST / QUOTE ---
  if (type === "text-list" || type === "text-quote") {
    return (
      <div className="w-full space-y-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className={`border rounded p-2 ${type === "text-quote" ? "bg-amber-50 border-amber-200 italic" : "bg-white"}`}>
            <div className="text-xs font-medium flex items-center gap-2"><span>{type === "text-quote" ? "❝" : "•"}</span>{d.label}</div>
            <div className="text-[10px] opacity-60 mt-1">{d.value ? `— ${d.value}` : ""} {d.series || ""}</div>
          </div>
        ))}
      </div>
    );
  }

  return <div className="text-xs opacity-50">未支援的圖表類型: {type}</div>;
}
````

## File: src/components/ChartTypeMenu.tsx
````
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { ChartData, ChartBaseType, BarVariant, ChartOrientation } from "../lib/types";

const BAR_VARIANTS: { id: BarVariant; label: string; desc: string }[] = [
  { id: "single", label: "長條圖", desc: "單一數列" },
  { id: "category", label: "類別長條圖", desc: "依類別分色" },
  { id: "grouped", label: "群組長條圖", desc: "多數列並排" },
  { id: "stacked", label: "堆疊長條圖", desc: "多數列堆疊" },
  { id: "stacked-percent", label: "堆疊比例長條圖", desc: "100% 堆疊" },
];

const DATA_CHARTS: { id: ChartBaseType; label: string; icon: string }[] = [
  { id: "line", label: "折線圖", icon: "📈" },
  { id: "pie", label: "圓餅圖", icon: "🥧" },
  { id: "donut", label: "環狀圖", icon: "⭕" },
  { id: "gantt", label: "甘特圖", icon: "📅" },
  { id: "pyramid", label: "金字塔", icon: "🔺" },
  { id: "radar", label: "雷達圖", icon: "🕸️" },
];

const TEXT_CHARTS: { id: ChartBaseType; label: string; icon: string; desc: string }[] = [
  { id: "timeline", label: "時間軸", icon: "⏱️", desc: "時間序列文字方塊" },
  { id: "text-columns", label: "文字欄", icon: "📄", desc: "兩欄文字方塊" },
  { id: "text-list", label: "文字清單", icon: "📝", desc: "條列文字方塊" },
  { id: "text-quote", label: "引言卡", icon: "❝", desc: "重點文字方塊" },
];

export default function ChartTypeMenu({ chart, onChange }: { chart?: ChartData; onChange: (chart: ChartData) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBarOpen, setIsBarOpen] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 340 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const currentType = chart?.type || "bar";
  const currentVariant = chart?.variant || "single";
  const currentOrientation = chart?.orientation || "vertical";

  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const w = 340;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (top + 420 > window.innerHeight - 8) top = rect.top - 420 - 6;
    if (top < 8) top = 8;
    setPos({ top, left, width: w });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePos();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (popupRef.current && popupRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const onResize = () => updatePos();
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, updatePos]);

  const createChart = (type: ChartBaseType, variant?: BarVariant, orientation?: ChartOrientation) => {
    const baseData = chart?.data && chart.data.length > 0 ? chart.data : [
      { label: "A", value: 30 },
      { label: "B", value: 50 },
      { label: "C", value: 20 },
    ];
    const newChart: ChartData = {
      type,
      variant: variant || (type === "bar" ? "single" : undefined),
      orientation: orientation || (type === "bar" ? currentOrientation : undefined),
      data: baseData as any,
    };
    onChange(newChart);
  };

  const toggleOrientation = () => {
    if (!chart || chart.type !== "bar") return;
    const newOri: ChartOrientation = currentOrientation === "vertical" ? "horizontal" : "vertical";
    onChange({ ...chart, orientation: newOri });
  };

  const labelForCurrent = () => {
    if (currentType === "bar") {
      const v = BAR_VARIANTS.find((b) => b.id === currentVariant);
      return `${v?.label || "長條圖"} (${currentOrientation === "vertical" ? "直" : "橫"})`;
    }
    const allCharts = [...DATA_CHARTS, ...TEXT_CHARTS];
    const o = allCharts.find((c) => c.id === currentType);
    return o?.label || currentType;
  };

  return (
    <div>
      <button ref={buttonRef} onClick={() => setIsOpen((v) => !v)} className="w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-white hover:bg-zinc-50" style={{ borderColor: "var(--color-border)" }}>
        <span className="flex items-center gap-2"><span>📊</span><span>{labelForCurrent()}</span></span>
        <span className="text-[10px] opacity-50">{isOpen ? "▲" : "▼"}</span>
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={popupRef}
          className="rounded-xl overflow-hidden shadow-2xl z-[9999] max-h-[420px] overflow-y-auto"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="p-2">
            <button onClick={() => setIsBarOpen((v) => !v)} className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider opacity-60 hover:opacity-100">
              <span>長條圖（可一鍵轉直/橫）</span>
              <span>{isBarOpen ? "−" : "+"}</span>
            </button>
            {isBarOpen && (
              <div className="space-y-1 mt-1">
                {BAR_VARIANTS.map((v) => (
                  <button key={v.id} onClick={() => createChart("bar", v.id, currentOrientation)} className={`w-full text-left rounded-md px-2.5 py-2 text-xs flex items-center justify-between border ${currentType === "bar" && currentVariant === v.id ? "bg-zinc-800 text-white border-zinc-800" : "bg-transparent hover:bg-zinc-100 border-zinc-200"}`}>
                    <span>
                      <span className="block font-medium">{v.label}</span>
                      <span className="block text-[10px] opacity-60">{v.desc}</span>
                    </span>
                    {currentType === "bar" && currentVariant === v.id && <span>✓</span>}
                  </button>
                ))}
                <button onClick={toggleOrientation} className="w-full rounded-md px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-1">
                  <span>↕️ 一鍵轉為{currentOrientation === "vertical" ? "橫條" : "直條"}</span>
                  <span className="text-[10px]">({currentOrientation === "vertical" ? "目前直式" : "目前橫式"})</span>
                </button>
              </div>
            )}
          </div>

          <div className="border-t mx-2" style={{ borderColor: "var(--color-border)" }} />

          <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase bg-zinc-50">數據圖表</div>
          <div className="p-2 grid grid-cols-2 gap-1">
            {DATA_CHARTS.map((c) => (
              <button key={c.id} onClick={() => createChart(c.id)} className={`rounded-md px-2.5 py-2 text-xs text-left border flex items-center gap-2 ${currentType === c.id ? "bg-zinc-800 text-white border-zinc-800" : "bg-transparent hover:bg-zinc-100 border-zinc-200"}`}>
                <span>{c.icon}</span>
                <span className="font-medium">{c.label}</span>
                {currentType === c.id && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>

          <div className="border-t mx-2 my-1" style={{ borderColor: "var(--color-border)" }} />

          <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase bg-amber-50">文字圖表</div>
          <div className="p-2 grid grid-cols-2 gap-1">
            {TEXT_CHARTS.map((c) => (
              <button key={c.id} onClick={() => createChart(c.id)} className={`rounded-md px-2.5 py-2 text-xs text-left border flex flex-col items-start gap-0.5 ${currentType === c.id ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-transparent hover:bg-amber-50 border-zinc-200"}`}>
                <span className="flex items-center gap-1.5"><span>{c.icon}</span><span className="font-medium">{c.label}</span>{currentType === c.id && <span>✓</span>}</span>
                <span className="text-[9px] opacity-60">{c.desc}</span>
              </button>
            ))}
          </div>

          <div className="p-2 text-[10px] opacity-50 border-t" style={{ borderColor: "var(--color-border)" }}>
            數據圖表：長條圖直/橫一鍵切換，群組/堆疊需系列欄位。文字圖表：時間軸、文字欄等簡易文字方塊。
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

````

## File: src/components/ColorPaletteButton.tsx
````
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

const COMMON_COLORS: string[] = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
  "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
  "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd",
  "#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0",
];

const STORAGE_KEY = "nexus-recent-colors";
const MAX_RECENT = 10;

function getRecentColors(): string[] {
  try {
    const raw: string | null = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecentColor(color: string): void {
  try {
    const recent: string[] = getRecentColors().filter((c: string) => c.toLowerCase() !== color.toLowerCase());
    recent.unshift(color);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

interface ColorPaletteButtonProps {
  icon: React.ReactNode;
  title: string;
  currentColor: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

export default function ColorPaletteButton({ icon, title, currentColor, onColorChange, disabled }: ColorPaletteButtonProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) setRecentColors(getRecentColors());
  }, [isOpen]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 8;
    // clamp to viewport
    const popupWidth = 248;
    if (left + popupWidth > window.innerWidth - 8) {
      left = window.innerWidth - popupWidth - 8;
    }
    if (top + 320 > window.innerHeight - 8) {
      top = rect.top - 320 - 8;
      if (top < 8) top = 8;
    }
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (popupRef.current && popupRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const handleResize = () => updatePosition();
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = useCallback((color: string): void => {
    saveRecentColor(color);
    onColorChange(color);
    setIsOpen(false);
  }, [onColorChange]);

  const handleClear = useCallback((): void => {
    onColorChange("");
    setIsOpen(false);
  }, [onColorChange]);

  const handleCustomColor = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    handleSelect(e.target.value);
  }, [handleSelect]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title={title}
        disabled={disabled}
        onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
        onClick={() => setIsOpen((prev: boolean) => !prev)}
        className="rounded flex flex-col items-center justify-center w-[30px] h-[30px] transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ color: "var(--color-text)" }}
      >
        {icon}
        <span className="block w-4 h-[3px] rounded-sm -mt-0.5" style={{ backgroundColor: currentColor || "var(--color-text)" }} />
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={popupRef}
          className="rounded-xl shadow-2xl z-[9999] p-2.5"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 248,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div className="w-6 h-6 rounded border" style={{ backgroundColor: currentColor || "transparent", borderColor: "var(--color-border)" }} />
            <span className="text-[11px] font-mono opacity-60 flex-1">{currentColor || "none"}</span>
            <button onClick={handleClear} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-zinc-200 opacity-60 hover:opacity-100">Clear</button>
          </div>
          <div className="mb-2">
            <div className="flex flex-wrap gap-[3px]">
              {COMMON_COLORS.map((color: string) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleSelect(color)}
                  className="w-5 h-5 rounded-sm border transition-all hover:scale-125"
                  style={{
                    backgroundColor: color,
                    borderColor: color.toLowerCase() === (currentColor || "").toLowerCase() ? "#2563eb" : "var(--color-border)",
                    boxShadow: color.toLowerCase() === (currentColor || "").toLowerCase() ? "0 0 0 1px #2563eb" : "none",
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
          {recentColors.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] opacity-50 mb-1">Recent</div>
              <div className="flex flex-wrap gap-[3px]">
                {recentColors.map((color: string, i: number) => (
                  <button
                    key={`${color}-${i}`}
                    type="button"
                    onClick={() => handleSelect(color)}
                    className="w-5 h-5 rounded-sm border transition-all hover:scale-125"
                    style={{ backgroundColor: color, borderColor: "var(--color-border)" }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
            <label className="flex items-center gap-2 cursor-pointer text-[11px] opacity-70 hover:opacity-100">
              <span>🎨</span>
              <span>Custom color</span>
              <input type="color" value={currentColor || "#000000"} onChange={handleCustomColor} className="w-6 h-5 rounded cursor-pointer border-0 p-0" />
            </label>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

````

## File: src/components/CommandPalette.tsx
````
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export interface CommandPaletteAction { id: string; label: string; icon: string; keywords?: string; run: () => void; }

export default function CommandPalette({ isOpen, onClose, pages, actions, onSelectPage }: {
  isOpen: boolean; onClose: () => void; pages: Page[]; actions: CommandPaletteAction[]; onSelectPage: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (isOpen) { setQuery(""); setActiveIndex(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [isOpen]);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q) || (a.keywords || "").toLowerCase().includes(q));
  }, [actions, query]);

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...pages].sort((a, b) => b.updated_at - a.updated_at);
    if (!q) return sorted.slice(0, 8);
    return sorted.filter((p) => (p.title || t("common.untitled")).toLowerCase().includes(q)).slice(0, 20);
  }, [pages, query, t]);

  type ListItem = { type: "action"; action: CommandPaletteAction } | { type: "page"; page: Page };
  const items: ListItem[] = useMemo(() => [
    ...filteredActions.map((action) => ({ type: "action" as const, action })),
    ...filteredPages.map((page) => ({ type: "page" as const, page })),
  ], [filteredActions, filteredPages]);

  useEffect(() => { setActiveIndex(0); }, [query]);
  if (!isOpen) return null;

  const runItem = (item: ListItem) => {
    if (item.type === "action") item.action.run();
    else onSelectPage(item.page.id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((prev) => Math.min(prev + 1, Math.max(items.length - 1, 0))); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((prev) => Math.max(prev - 1, 0)); return; }
    if (e.key === "Enter") { e.preventDefault(); const item = items[activeIndex]; if (item) runItem(item); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          <span className="opacity-40 text-sm">🔍</span>
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder={t("commandPalette.placeholder")} className="w-full bg-transparent outline-none text-sm" style={{ color: "var(--color-text)" }} />
          <button onClick={onClose} className="text-xs opacity-40 hover:opacity-100 px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--color-border)" }}>{t("commandPalette.esc")}</button>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <div className="text-sm text-center py-8 opacity-40" style={{ color: "var(--color-text)" }}>{t("commandPalette.noResults")}</div>
          ) : (<>
            {filteredActions.length > 0 && <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">{t("commandPalette.actions")}</div>}
            {filteredActions.map((action, index) => (
              <button key={action.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => runItem({ type: "action", action })} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-left transition-all" style={{ backgroundColor: index === activeIndex ? "var(--color-border)" : "transparent", color: "var(--color-text)" }}>
                <span>{action.icon}</span><span className="truncate">{action.label}</span>
              </button>
            ))}
            {filteredPages.length > 0 && <div className="px-2 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">{t("commandPalette.pages")}</div>}
            {filteredPages.map((page, index) => {
              const gi = filteredActions.length + index;
              const pageIcon = page.kind === "study_set" ? "🗂️" : page.kind === "document" ? "📄" : page.primary_attachment_id ? "📑" : "📝";
              return (
                <button key={page.id} onMouseEnter={() => setActiveIndex(gi)} onClick={() => runItem({ type: "page", page })} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-left transition-all" style={{ backgroundColor: gi === activeIndex ? "var(--color-border)" : "transparent", color: "var(--color-text)" }}>
                  <span>{pageIcon}</span><span className="truncate">{page.title || t("common.untitled")}</span>
                </button>
              );
            })}
          </>)}
        </div>
      </div>
    </div>
  );
}
````

## File: src/components/Dashboard.tsx
````
"use client";
import { useMemo, useState } from "react";
import type { Page, PageFormat } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import NewPageDialog, { type NewPageKindChoice } from "./NewPageDialog";

function isResearchPage(page: Page): boolean { return !!page.primary_attachment_id; }
function isPlainNote(page: Page): boolean { return (!page.kind || page.kind === "note") && !isResearchPage(page) && !page.parent_id; }
function isDocumentPage(page: Page): boolean { return page.kind === "document" && !page.parent_id; }

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
      <div className="text-2xl leading-none">{icon}</div>
      <div>
        <div className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>{value}</div>
        <div className="text-xs opacity-60" style={{ color: "var(--color-text)" }}>{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard({ pages, onSelectPage, onCreatePage, onCreateDocument, onCreateStudySet, onCreatePresentation, onImportPdf }: {
  pages: Page[]; onSelectPage: (id: string) => void; onCreatePage: (format: PageFormat) => void;
  onCreateDocument: (format: PageFormat) => void; onCreateStudySet: () => void; onCreatePresentation?: (format: PageFormat) => void; onImportPdf: () => void;
}) {
  const { t } = useLanguage();
  const [isNewPageDialogOpen, setIsNewPageDialogOpen] = useState(false);
  const topLevelPages = pages.filter((p) => !p.parent_id);
  const stats = useMemo(() => ({
    total: topLevelPages.length,
    notes: topLevelPages.filter(isPlainNote).length,
    documents: topLevelPages.filter(isDocumentPage).length,
    research: topLevelPages.filter(isResearchPage).length,
    studySets: topLevelPages.filter((p) => p.kind === "study_set").length,
    presentations: topLevelPages.filter((p) => p.kind === "presentation").length,
  }), [topLevelPages]);
  const recentPages = useMemo(() => [...topLevelPages].sort((a, b) => b.updated_at - a.updated_at).slice(0, 8), [topLevelPages]);

  const formatRelativeTime = (ts: number): string => {
    const diffMs = Date.now() - ts;
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return t("time.justNow");
    if (diffMinutes < 60) return t("time.minutesAgo", { n: diffMinutes });
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return t("time.hoursAgo", { n: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return t("time.daysAgo", { n: diffDays });
    return new Date(ts).toLocaleDateString();
  };

  const handleConfirmNewPage = (kind: NewPageKindChoice, format: PageFormat) => {
    if (kind === "document") onCreateDocument(format);
    else if (kind === "note") onCreatePage(format);
    else if (kind === "presentation") onCreatePresentation?.(format);
    else onCreateStudySet();
  };

  const pageIcon = (page: Page) => {
    if (page.kind === "study_set") return "🗂️";
    if (page.kind === "document") return "📄";
    if (page.kind === "presentation") return "📊";
    if (page.primary_attachment_id) return "📑";
    return "📝";
  };

  return (
    <main className="flex flex-col flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="flex flex-col mx-auto w-full" style={{ maxWidth: "820px", padding: "48px 64px" }}>
        <div className="mb-1 text-sm opacity-60" style={{ color: "var(--color-text)" }}>{t("dashboard.home")}</div>
        <h1 className="text-3xl font-semibold mb-6" style={{ color: "var(--color-text)" }}>{t("dashboard.welcome")}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label={t("dashboard.stats.total")} value={stats.total} icon="📚" />
          <StatCard label={t("dashboard.stats.documents")} value={stats.documents} icon="📄" />
          <StatCard label={t("dashboard.stats.notes")} value={stats.notes} icon="📝" />
          <StatCard label={t("dashboard.stats.research")} value={stats.research} icon="📑" />
          <StatCard label={t("dashboard.stats.studySets")} value={stats.studySets} icon="🗂️" />
          <StatCard label="簡報" value={stats.presentations} icon="📊" />
        </div>
        <div className="mb-8">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("dashboard.quickCreate")}</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setIsNewPageDialogOpen(true)} className="rounded-md px-4 py-2 text-sm font-semibold transition-all hover:opacity-90" style={{ backgroundColor: "var(--color-text)", color: "var(--color-bg)" }}>➕ {t("dashboard.newButton")}</button>
            <button onClick={onImportPdf} className="rounded-md px-3.5 py-2 text-sm font-medium transition-all hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("dashboard.importPdf")}</button>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("dashboard.recent")}</div>
          {recentPages.length === 0 ? (
            <div className="rounded-xl py-10 text-center text-sm opacity-50" style={{ border: "1px dashed var(--color-border)", color: "var(--color-text)" }}>{t("dashboard.emptyState")}</div>
          ) : (
            <div className="space-y-1">
              {recentPages.map((page) => (
                <button key={page.id} onClick={() => onSelectPage(page.id)} className="w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-all hover:bg-zinc-200/60" style={{ color: "var(--color-text)" }}>
                  <span className="truncate flex items-center gap-1.5"><span>{pageIcon(page)}</span><span className="truncate">{page.title || t("common.untitled")}</span></span>
                  <span className="shrink-0 text-xs opacity-40">{formatRelativeTime(page.updated_at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <NewPageDialog isOpen={isNewPageDialogOpen} onClose={() => setIsNewPageDialogOpen(false)} onConfirm={handleConfirmNewPage} />
    </main>
  );
}
````

## File: src/components/EditorPane.tsx
````
"use client";
import { useRef, useState, useEffect } from "react";
import type { Page, Attachment, PageFormat, PageMargins } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import TiptapEditor from "./TiptapEditor";
import PageFormatView from "./PageFormatView";
import PaginatedEditorView from "./PaginatedEditorView";
import FileMenu from "./FileMenu";

export default function EditorPane({
  page,
  attachment,
  pdfUrl,
  pdfLoadError,
  onTitleChange,
  onTagsChange,
  onContentChange,
  onFormatChange,
  onAddSubPage,
  onExportMarkdown,
  onExportPdf,
  onExportNexus,
  onNewNote,
  onNewDocument,
  onImportPdf,
  onImportMd,
  onConvertToPresentation,
  isSplitView = false,
  onCloseSplit,
  onSwapSplit,
  nightAdapt = false,
  onToggleNightAdapt = () => {},
  margins,
  onMarginsChange,
}: {
  page: Page | null;
  attachment: Attachment | null;
  pdfUrl: string | null;
  pdfLoadError: string | null;
  onTitleChange: (title: string) => void;
  onFolderChange?: (folder: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  onContentChange: (payload: { json: any; text: string }) => void;
  onFormatChange?: (format: PageFormat) => void;
  onAddSubPage?: (parentId: string) => void;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
  onExportNexus?: () => void;
  onNewNote?: () => void;
  onNewDocument?: () => void;
  onImportPdf?: () => void;
  onImportMd?: () => void;
  onConvertToPresentation?: () => void;
  isSplitView?: boolean;
  onCloseSplit?: () => void;
  onSwapSplit?: () => void;
  nightAdapt?: boolean;
  onToggleNightAdapt?: () => void;
  margins?: PageMargins;
  onMarginsChange?: (margins: PageMargins) => void;
}) {
  const { t } = useLanguage();
  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState<"file" | "home" | "insert" | "layout" | "review">("home");
  const [showRuler, setShowRuler] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isThumbRailOpen, setIsThumbRailOpen] = useState(true);
  const [isPdfCollapsed, setIsPdfCollapsed] = useState(false);
  const [pdfViewerHeight, setPdfViewerHeight] = useState(560);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);
  const toolbarPortalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toolbarPortalRef.current) setToolbarTarget(toolbarPortalRef.current);
  }, []);

  if (!page) {
    return (
      <main className="flex flex-col flex-1 overflow-y-auto items-center justify-center text-base" style={{ backgroundColor: "var(--color-editor-bg)", color: "var(--color-sidebar-text)" }}>
        <div>{t("editor.noPage")}</div>
      </main>
    );
  }

  const currentTags = page.tags || [];
  const currentFormat = (page.format || "flow") as PageFormat;
  const isDocument = page.kind === "document";
  const isPresentation = page.kind === "presentation";
  const isPaged = currentFormat !== "flow";

  const getTextFromNode = (node: any): string => {
    if (!node) return "";
    if (node.type === "text") return node.text || "";
    if (Array.isArray(node.content)) return node.content.map(getTextFromNode).join("");
    return "";
  };

  const isBlockBlank = (block: any): boolean => {
    const type = block.type;
    if (type === "paragraph" || type === "heading") {
      const txt = getTextFromNode(block).trim();
      return txt.length === 0;
    }
    if (type === "bulletList" || type === "orderedList" || type === "taskList") {
      // blank if all items blank
      const items = block.content || [];
      return items.every((item: any) => {
        const inner = item.content || [];
        return inner.every((c: any) => isBlockBlank(c));
      });
    }
    if (type === "listItem" || type === "taskItem") {
      const inner = block.content || [];
      return inner.every((c: any) => isBlockBlank(c));
    }
    // Keep tables, images, codeBlocks with content, etc.
    if (type === "table" || type === "image" || type === "codeBlock" || type === "blockquote" || type === "callout" || type === "multiColumn" || type === "column") {
      // Consider blank only if no text inside
      const txt = getTextFromNode(block).trim();
      // For table, check if all cells blank
      if (type === "table") {
        const rows = block.content || [];
        return rows.every((row: any) => {
          const cells = row.content || [];
          return cells.every((cell: any) => {
            const cellText = getTextFromNode(cell).trim();
            return cellText.length === 0;
          });
        });
      }
      return txt.length === 0 ? true : false;
    }
    return false;
  };

  const handleDeleteBlankPages = () => {
    const content = page.content_json as any;
    const blocks = (content?.content as any[]) || [];
    const filtered = blocks.filter((b: any) => !isBlockBlank(b));
    // If all filtered out, keep one empty paragraph to avoid empty doc
    const finalBlocks = filtered.length > 0 ? filtered : [{ type: "paragraph" }];
    const newJson = { type: "doc", content: finalBlocks };
    const newText = finalBlocks.map(getTextFromNode).join("\n\n");
    onContentChange({ json: newJson, text: newText });
  };

  const charCount = (page.content_text || "").replace(/\s/g, "").length;
  const wordCount = (page.content_text || "").trim() ? (page.content_text || "").trim().split(/\s+/).length : 0;

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !currentTags.includes(val)) onTagsChange([...currentTags, val]);
      setTagInput("");
    }
  };

  return (
    <main className="relative flex flex-col flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      {/* Title area */}
      <div className="shrink-0 pt-8 pb-3 px-4" style={{ backgroundColor: "var(--color-editor-bg)" }}>
        <div className="mx-auto w-full" style={{ maxWidth: "820px" }}>
          <div className="flex items-start gap-4">
            <input
              type="text"
              value={page.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t("editor.title.placeholder")}
              className="flex-1 min-w-0 text-3xl font-semibold bg-transparent border-none outline-none pb-1"
              style={{ color: "var(--color-text)", fontFamily: "inherit", borderBottom: "2px solid transparent" }}
              onFocus={(e) => (e.target.style.borderBottomColor = "var(--color-border)")}
              onBlur={(e) => (e.target.style.borderBottomColor = "transparent")}
            />
            <div className="shrink-0 flex flex-col items-end gap-1 pt-1.5">
              <div className="flex flex-wrap items-center gap-1 justify-end">
                {currentTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-200/80 text-zinc-700 text-[11px]">#{tag}<button onClick={() => onTagsChange(currentTags.filter((tt) => tt !== tag))} className="hover:text-red-500 font-bold ml-0.5 text-[10px]">×</button></span>
                ))}
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder={currentTags.length === 0 ? t("editor.tags.addFirst") : "+"} className="bg-transparent outline-none px-0.5 py-0.5 w-14 text-[11px]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 需求3：兩行工具列（Word Ribbon 風格） */}
      <div className="shrink-0 border-b nexus-print-hide" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-editor-bg)" }}>
        <div className="flex items-center px-2 pt-1.5 gap-0.5">
          {([
            { id: "file" as const, label: "檔案" },
            { id: "home" as const, label: "常用" },
            { id: "insert" as const, label: "插入" },
            { id: "layout" as const, label: "版面配置" },
            { id: "review" as const, label: "查閱" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="rounded-t-md px-3 py-1.5 text-sm font-medium"
              style={{
                color: "var(--color-text)",
                backgroundColor: activeTab === tab.id ? "var(--color-border)" : "transparent",
                border: "1px solid var(--color-border)",
                borderBottom: activeTab === tab.id ? "none" : "1px solid var(--color-border)",
              }}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {isSplitView ? (
            <div className="flex items-center gap-1 pb-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 hidden sm:inline">雙開中</span>
              <button onClick={() => onSwapSplit?.()} className="rounded px-2.5 py-1 text-xs font-medium border hover:bg-zinc-200" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} title="交換左右分頁">⇄ 交換</button>
              <button onClick={() => onCloseSplit?.()} className="rounded px-2.5 py-1 text-xs font-medium bg-zinc-800 text-white hover:bg-zinc-700" title="關閉右側分頁">✕ 關閉右側</button>
            </div>
          ) : (
            <span className="text-[10px] opacity-40 hidden sm:inline pb-1.5">Ctrl+點擊側邊欄 開啟右側分頁</span>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 min-h-[44px]" style={{ borderTop: "1px solid var(--color-border)", borderColor: "var(--color-border)" }}>
          {/* 固定：縮圖側邊欄開關（僅分頁模式） */}
          {isPaged && (
            <button
              type="button"
              title={isThumbRailOpen ? "隱藏縮圖預覽" : "顯示縮圖預覽"}
              onClick={() => setIsThumbRailOpen((v) => !v)}
              className="shrink-0 rounded flex items-center justify-center w-[30px] h-[30px] text-[12px] transition-all hover:bg-zinc-200"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: isThumbRailOpen ? "var(--color-border)" : "transparent" }}
            >
              ▤
            </button>
          )}
          {activeTab === "review" ? (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setShowRuler((v) => !v)}
                className="rounded flex items-center gap-1.5 px-2 h-[30px] text-[11px] font-medium hover:bg-zinc-200 border"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: showRuler ? "var(--color-border)" : "transparent" }}
                title="顯示/隱藏尺規"
              >
                📏 顯示尺規
              </button>
              <span className="text-[11px] opacity-60">字數：{wordCount} 字 ・ 字元：{charCount}</span>
            </div>
          ) : activeTab === "file" ? (
            <div className="flex items-center gap-2 flex-wrap">
              <FileMenu
                currentFormat={currentFormat}
                isDocument={isDocument}
                isPresentation={isPresentation}
                onFormatChange={onFormatChange}
                onExportMarkdown={onExportMarkdown}
                onExportPdf={onExportPdf}
                onExportNexus={onExportNexus}
                onPrint={() => window.print()}
                onNewNote={onNewNote}
                onNewDocument={onNewDocument}
                onImportPdf={onImportPdf}
                onImportMd={onImportMd}
                onConvertToPresentation={onConvertToPresentation}
                onDeleteBlankPages={handleDeleteBlankPages}
              />
              <span className="text-[11px] opacity-40">檔案操作（新建／匯入／格式／匯出／列印）</span>
            </div>
          ) : (
            <div ref={toolbarPortalRef} className="flex-1 min-w-0 flex items-center overflow-x-auto" />
          )}
          {/* 固定：適配夜晚（最右邊，不受 tab 影響） */}
          <button
            type="button"
            title={nightAdapt ? "切換為原文字顏色（白底黑字）" : "切換為適配夜晚模式顏色"}
            onMouseDown={(e) => { e.preventDefault(); onToggleNightAdapt?.(); }}
            className="shrink-0 ml-auto rounded flex items-center justify-center px-2 h-[30px] text-[11px] font-medium transition-all hover:bg-zinc-200 border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: nightAdapt ? "var(--color-border)" : "transparent" }}
          >
            {nightAdapt ? "🌙 適配夜晚" : "☀️ 原文字顏色"}
          </button>
        </div>
      </div>

      {/* Content area */}
      {/* 尺規（查閱 tab 開啟時顯示；寬度對齊內容） */}
      {showRuler && (
        <div className="shrink-0 mx-auto overflow-hidden nexus-print-hide" style={{ width: isPaged ? (currentFormat === "a4" ? "210mm" : currentFormat === "16:9" ? "960px" : currentFormat === "4:3" ? "800px" : "820px") : "820px", maxWidth: "100%" }}>
          <div
            className="h-5 relative select-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, rgba(0,0,0,0.25) 0 1px, transparent 1px 7.56px), repeating-linear-gradient(to right, rgba(0,0,0,0.5) 0 1px, transparent 1px 37.8px)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            {Array.from({ length: 22 }).map((_, i) => (
              <span key={i} className="absolute top-0.5 text-[8px] opacity-50" style={{ left: i * 37.8 + 2 }}>{i}</span>
            ))}
          </div>
        </div>
      )}
      {/* 縮放（Word 右下角） */}
      <div className="absolute bottom-3 right-4 z-30 flex items-center gap-1 nexus-print-hide" style={{ bottom: 12, right: 16 }}>
        <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="rounded w-7 h-7 text-sm font-bold hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-bg)" }}>−</button>
        <span className="text-[11px] px-1.5 opacity-70" style={{ color: "var(--color-text)" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} className="rounded w-7 h-7 text-sm font-bold hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-bg)" }}>＋</button>
        <button onClick={() => setZoom(1)} className="rounded px-2 h-7 text-[11px] hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-bg)" }} title="重設 100%">100%</button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto" style={{ zoom }}>
      {isPaged ? (
        <>
          {attachment && (
            <div className="shrink-0 mx-auto w-full max-w-[820px] px-4 pt-4">
              <div className="mb-2 overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs" style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                  <div className="min-w-0 flex items-center gap-2"><span className="shrink-0 font-medium">{t("editor.pdf.preview")}</span><span className="truncate opacity-50">{attachment.name}</span></div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {([420, 560, 720] as const).map((h) => (
                      <button key={h} type="button" onClick={() => setPdfViewerHeight(h)} className="rounded px-2 py-1 text-xs hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: pdfViewerHeight === h ? "var(--color-border)" : "transparent" }}>{h === 420 ? t("editor.pdf.small") : h === 560 ? t("editor.pdf.medium") : t("editor.pdf.large")}</button>
                    ))}
                    <button type="button" onClick={() => setIsPdfCollapsed((prev) => !prev)} className="rounded px-2 py-1 text-xs hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{isPdfCollapsed ? t("editor.pdf.show") : t("editor.pdf.hide")}</button>
                    <button type="button" disabled={!pdfUrl} onClick={() => { if (pdfUrl) window.open(pdfUrl, "_blank", "noopener,noreferrer"); }} className="rounded px-2 py-1 text-xs hover:bg-zinc-200 disabled:opacity-40" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("editor.pdf.open")}</button>
                  </div>
                </div>
                {!isPdfCollapsed && (
                  <>
                    {pdfUrl ? <iframe key={attachment.id} src={pdfUrl} title={attachment.name} className="w-full bg-white" style={{ height: `${pdfViewerHeight}px` }} /> : pdfLoadError ? (
                      <div className="flex h-[240px] flex-col items-center justify-center gap-2 px-6 text-center text-sm" style={{ color: "var(--color-text)" }}><div className="font-medium text-red-600">{t("editor.pdf.unavailable")}</div><div className="max-w-[520px] opacity-60">{pdfLoadError}</div></div>
                    ) : <div className="flex h-[240px] items-center justify-center text-sm opacity-50" style={{ color: "var(--color-text)" }}>{t("editor.pdf.loading")}</div>}
                  </>
                )}
                {isPdfCollapsed && <div className="flex h-[48px] items-center justify-center text-xs opacity-50" style={{ color: "var(--color-text)" }}>{t("editor.pdf.hiddenNotice")}</div>}
              </div>
            </div>
          )}
          <PaginatedEditorView content={page.content_json} onContentChange={onContentChange} format={currentFormat} toolbarTarget={toolbarTarget} nightAdapt={nightAdapt} onToggleNightAdapt={onToggleNightAdapt} margins={margins} onMarginsChange={onMarginsChange} toolbarTab={activeTab === "file" || activeTab === "review" ? "home" : activeTab} fileMode={activeTab === "file" || activeTab === "review"} showThumbRail={isPaged && isThumbRailOpen} />
        </>
      ) : (
        <PageFormatView format={currentFormat}>
          <div className="flex flex-col w-full nexus-print-target" style={{ maxWidth: currentFormat === "flow" ? "820px" : "100%", margin: currentFormat === "flow" ? "0 auto" : undefined, padding: currentFormat === "flow" ? "16px 64px 48px" : "0" }}>
            {attachment && (
              <div className="mb-6 overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs" style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                  <div className="min-w-0 flex items-center gap-2"><span className="shrink-0 font-medium">{t("editor.pdf.preview")}</span><span className="truncate opacity-50">{attachment.name}</span></div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {([420, 560, 720] as const).map((h) => (
                      <button key={h} type="button" onClick={() => setPdfViewerHeight(h)} className="rounded px-2 py-1 text-xs hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: pdfViewerHeight === h ? "var(--color-border)" : "transparent" }}>{h === 420 ? t("editor.pdf.small") : h === 560 ? t("editor.pdf.medium") : t("editor.pdf.large")}</button>
                    ))}
                    <button type="button" onClick={() => setIsPdfCollapsed((prev) => !prev)} className="rounded px-2 py-1 text-xs hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{isPdfCollapsed ? t("editor.pdf.show") : t("editor.pdf.hide")}</button>
                    <button type="button" disabled={!pdfUrl} onClick={() => { if (pdfUrl) window.open(pdfUrl, "_blank", "noopener,noreferrer"); }} className="rounded px-2 py-1 text-xs hover:bg-zinc-200 disabled:opacity-40" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("editor.pdf.open")}</button>
                  </div>
                </div>
                {!isPdfCollapsed && (
                  <>
                    {pdfUrl ? <iframe key={attachment.id} src={pdfUrl} title={attachment.name} className="w-full bg-white" style={{ height: `${pdfViewerHeight}px` }} /> : pdfLoadError ? (
                      <div className="flex h-[240px] flex-col items-center justify-center gap-2 px-6 text-center text-sm" style={{ color: "var(--color-text)" }}><div className="font-medium text-red-600">{t("editor.pdf.unavailable")}</div><div className="max-w-[520px] opacity-60">{pdfLoadError}</div></div>
                    ) : <div className="flex h-[240px] items-center justify-center text-sm opacity-50" style={{ color: "var(--color-text)" }}>{t("editor.pdf.loading")}</div>}
                  </>
                )}
                {isPdfCollapsed && <div className="flex h-[48px] items-center justify-center text-xs opacity-50" style={{ color: "var(--color-text)" }}>{t("editor.pdf.hiddenNotice")}</div>}
              </div>
            )}
            <TiptapEditor key={`${page.id}-${page.kind}-${currentFormat}`} content={page.content_json} onChange={onContentChange} variant={page.kind === "document" ? "plain" : "rich"} toolbarTarget={toolbarTarget} pageNightAdapt={nightAdapt} onTogglePageNightAdapt={onToggleNightAdapt} showToolbar={activeTab !== "file" && activeTab !== "review"} toolbarTab={activeTab === "file" || activeTab === "review" ? "home" : activeTab} />
          </div>
        </PageFormatView>
      )}
      </div>
    </main>
  );
}

````

## File: src/components/FileMenu.tsx
````
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { PageFormat } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export default function FileMenu({
  currentFormat,
  isDocument,
  isPresentation = false,
  onFormatChange,
  onExportMarkdown,
  onExportPdf,
  onExportNexus,
  onPrint,
  onNewNote,
  onNewDocument,
  onImportPdf,
  onImportMd,
  onConvertToPresentation,
  onDeleteBlankPages,
}: {
  currentFormat: PageFormat;
  isDocument: boolean;
  isPresentation?: boolean;
  onFormatChange?: (f: PageFormat) => void;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
  onExportNexus?: () => void;
  onPrint?: () => void;
  onNewNote?: () => void;
  onNewDocument?: () => void;
  onImportPdf?: () => void;
  onImportMd?: () => void;
  onConvertToPresentation?: () => void;
  onDeleteBlankPages?: () => void;
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    const w = 272;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (top + 520 > window.innerHeight - 8) {
      top = rect.top - 520 - 6;
      if (top < 8) top = 8;
    }
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePos();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (popupRef.current && popupRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const onResize = () => updatePos();
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, updatePos]);

  const fmt = currentFormat || "flow";
  const canRestoreToFlow = fmt !== "flow";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-zinc-200 transition-all"
        style={{ border: "1px solid transparent", color: "var(--color-text)" }}
        title="檔案選單"
      >
        <span>{t("file.title")}</span>
        <span className="text-[10px] opacity-50">▾</span>
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={popupRef}
          className="rounded-xl overflow-hidden shadow-2xl z-[9999] max-h-[80vh] overflow-y-auto"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 272,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">新建</div>
          <button onClick={() => { onNewNote?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📝</span> 新建筆記 (流動預設)</button>
          <button onClick={() => { onNewDocument?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📄</span> 新建文檔 (A4預設)</button>

          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">匯入</div>
          <button onClick={() => { onImportPdf?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📥</span> 匯入 PDF</button>
          <button onClick={() => { onImportMd?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📄</span> 匯入 Markdown → 文檔</button>

          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">簡報</div>
          <button onClick={() => { onConvertToPresentation?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📊</span> 轉為簡報 (用筆記製作簡報)</button>

          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase flex items-center justify-between"><span>格式</span><span className="text-[9px] normal-case opacity-60">{canRestoreToFlow ? "可還原為流動" : "流動為源"}</span></div>
          <div className="px-2 pb-1">
            <div className="grid grid-cols-2 gap-1">
              {(
                isPresentation
                  ? [
                      { id: "16:9", label: "16:9 投影", desc: "簡報" },
                      { id: "4:3", label: "4:3 投影", desc: "簡報" },
                    ]
                  : [
                      { id: "flow", label: "流動", desc: "無限長卷" },
                      { id: "a4", label: "A4 分頁", desc: "自動加頁" },
                    ]
              ).map((opt) => (
                <button key={opt.id} onClick={() => { onFormatChange?.(opt.id as PageFormat); setIsOpen(false); }} className={`rounded-md px-2.5 py-2 text-left border transition-all ${fmt === opt.id ? "bg-zinc-800 text-white border-zinc-800" : "bg-transparent hover:bg-zinc-100 border-zinc-200"}`}>
                  <div className="text-xs font-medium">{opt.label}{fmt === opt.id ? " ✓" : ""}</div>
                  <div className="text-[10px] opacity-60">{opt.desc}</div>
                </button>
              ))}
            </div>
            {canRestoreToFlow && (
              <button onClick={() => { onFormatChange?.("flow"); setIsOpen(false); }} className="mt-2 w-full rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 text-xs font-medium hover:bg-blue-100 text-center">↩ 還原為流動 (可還原)</button>
            )}
          </div>

          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">頁面管理</div>
          <button onClick={() => { onDeleteBlankPages?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>🧹</span> 刪除空白頁</button>

          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">匯出 / 列印</div>
          {isDocument ? (
            <button onClick={() => { onExportMarkdown?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📤</span> 匯出為 Markdown</button>
          ) : (
            <>
              <button onClick={() => { onExportPdf?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>🖨️</span> 匯出為 PDF</button>
              <button onClick={() => { onExportNexus?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>💾</span> 匯出為 Nexus JSON</button>
            </>
          )}
          <button onClick={() => { onPrint?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>🖨️</span> 列印 (瀏覽器列印)</button>
        </div>,
        document.body
      )}
    </>
  );
}

````

## File: src/components/HelpGuide.tsx
````
"use client";
import { useEffect } from "react";

export default function HelpGuide({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Nexus 使用說明</h2>
          <button onClick={onClose} className="rounded-md px-3 py-1 text-sm border hover:bg-zinc-100" style={{ borderColor: "var(--color-border)" }}>Esc 關閉</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
          <section>
            <h3 className="font-semibold text-base mb-2">1. 檔案選單（工具列最左邊）</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>位置：格式化工具列同一行最左邊，類似 Google 文件</li>
              <li>新建：筆記（流動預設）、文檔（A4預設）、簡報（16比9）</li>
              <li>匯入：PDF 會生成研究筆記，Markdown 匯入為文檔（可再匯出MD）</li>
              <li>格式：流動原本不改，僅 A4 / 16比9 / 4比3 可還原為流動</li>
              <li>簡報：轉為簡報（用筆記製作簡報），H1 自動切頁，表格自動轉圖表，超過4張自動目錄</li>
              <li>匯出：文檔匯出 Markdown，筆記匯出 PDF 或 Nexus JSON，列印為瀏覽器列印</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-base mb-2">2. 分頁與排版（A4 引擎）</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>單一上欄與標題，內頁分頁：標題與工具列固定，只有紙張區域捲動</li>
              <li>Document 預設 A4（可還原為流動），Note 預設流動（保持不改）</li>
              <li>工具列插入分頁符：在 A4 中插入虛線分頁符</li>
              <li>16比9 / 4比3 為簡報預覽容器，黑色舞台</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-base mb-2">3. 側邊欄</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>搜尋：支援標題與內容子字串，右側 CmdK 開命令面板</li>
              <li>新建：側邊欄加號按鈕在多選左邊，單一扁平下拉（新建與匯入同層）</li>
              <li>排序：最近編輯 / 自訂拖曳，可勾選依類型分組</li>
              <li>子頁規則：只有同類型能成為子頁（文檔的只能是文檔，筆記的只能是筆記，學習集的只能是學習集），簡報無子頁概念</li>
              <li>子頁建立：每項 hover 左側加號按鈕，僅顯示同類型選項，點擊直接建立並進入重新命名</li>
              <li>拖曳：可拖曳改變順序，上方30%插入上方，下方30%下方，中間40%變成子頁（同類型才允許）</li>
              <li>雙開：Ctrl 或 Cmd 點擊側邊欄項目，在右側開啟左右分頁</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-base mb-2">4. 左右雙開（Obsidian 風格）</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>開啟：Ctrl 或 Cmd 點擊 或 右鍵選單在右側開啟</li>
              <li>工具列右側顯示：雙開中、交換、關閉右側</li>
              <li>左右皆可獨立編輯、獨立 PDF 預覽、獨立格式切換</li>
              <li>標題右側新增子頁已移除，僅保留側邊欄的加號</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-base mb-2">5. 簡報（獨立，可大改）</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>建立：側邊欄加號到簡報，或 Dashboard 新建，或筆記檔案轉為簡報</li>
              <li>版面：左側投影片清單（可上下移動），中間自由畫布（16比9），右側圖層與屬性</li>
              <li>直觀操作：加號文字區塊到畫布隨機新增可拖曳，雙擊編輯，右上角刪除</li>
              <li>圖層：右側圖層面板按 z 倒序，點選切換，置頂置底改變層級，像 Canva</li>
              <li>圖表：圖表按鈕新增，右側屬性面板表格直接填 label 與 value，切換 bar line pie</li>
              <li>示圖：Mermaid 程式碼 textarea，未來渲染為 SVG</li>
              <li>備註：底部固定備註，講者備註觀眾看不到</li>
              <li>版型：標題、標題加內容、兩欄、圖表、自由畫布、目錄等 8 種</li>
              <li>主題：Minimal Academic Business Dark</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-base mb-2">6. 其他</h3>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>標籤：標題下方輸入加 Enter 新增，點擊刪除，側邊欄可過濾</li>
              <li>資料夾：已從標題右側移除，改由側邊欄自動分組（未分類置頂）</li>
              <li>命令面板：Ctrl 或 Cmd 加 K 開啟，搜尋頁面或執行動作</li>
              <li>偏好設定：右下齒輪，可切主題、語言、匯入匯出備份、使用說明（本頁）</li>
              <li>同步：右下顯示同步狀態（共享工作區，無登入）</li>
            </ul>
          </section>
          <section className="pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-xs opacity-50">Nexus 是 local-first 個人學習與知識生成 workspace，支援筆記、文檔、PDF研究、學習集、簡報、雙開、A4分頁。簡報已獨立，框架可依順手原則大改。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
````

## File: src/components/NewPageDialog.tsx
````
"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import type { PageFormat, PageKind } from "../lib/types";

export type NewPageKindChoice = PageKind;
// 2026-08-04：僅簡報保留格式選擇（16:9/4:3）；筆記/文檔建立時直接用預設格式（flow/a4）
const FORMAT_OPTIONS_BY_KIND: Record<string, PageFormat[]> = {
  presentation: ["16:9", "4:3"],
};
const DEFAULT_FORMAT_BY_KIND: Record<string, PageFormat> = {
  document: "a4",
  note: "flow",
};

export default function NewPageDialog({ isOpen, onClose, onConfirm, initialKind }: {
  isOpen: boolean; onClose: () => void; onConfirm: (kind: NewPageKindChoice, format: PageFormat) => void;
  initialKind?: PageKind | null;
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState<"kind" | "format">("kind");
  const [selectedKind, setSelectedKind] = useState<NewPageKindChoice | null>(null);

  useEffect(() => {
    if (isOpen && initialKind) {
      if (initialKind === "study_set") {
        onConfirm(initialKind, "flow");
        onClose();
      } else if (initialKind === "presentation") {
        setSelectedKind(initialKind);
        setStep("format");
      } else {
        // 筆記/文檔：直接建立（用預設格式），不顯示格式步驟
        onConfirm(initialKind, DEFAULT_FORMAT_BY_KIND[initialKind] || "flow");
        onClose();
      }
    } else if (isOpen) {
      setStep("kind");
      setSelectedKind(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialKind]);

  if (!isOpen) return null;

  const kindOptions = [
    { id: "document" as const, icon: "📄", label: t("newPage.kind.document"), desc: t("newPage.kind.document.desc") },
    { id: "note" as const, icon: "📝", label: t("newPage.kind.note"), desc: t("newPage.kind.note.desc") },
    { id: "study_set" as const, icon: "🗂️", label: t("newPage.kind.studySet"), desc: t("newPage.kind.studySet.desc") },
    { id: "presentation" as const, icon: "📊", label: "簡報", desc: "投影片：圖表/版面/示圖/目錄" },
  ];

  const formatLabel = (f: PageFormat) => {
    if (f === "flow") return t("newPage.format.flow");
    if (f === "a4") return t("newPage.format.a4");
    if (f === "16:9") return t("newPage.format.169");
    if (f === "4:3") return t("newPage.format.43");
    return t("newPage.format.custom");
  };

  const handleSelectKind = (kind: NewPageKindChoice) => {
    if (kind === "study_set") { onConfirm(kind, "flow"); handleClose(); return; }
    if (kind === "presentation") {
      setSelectedKind(kind);
      setStep("format");
      return;
    }
    // 筆記/文檔：不選格式，直接用預設
    onConfirm(kind, DEFAULT_FORMAT_BY_KIND[kind] || "flow");
    handleClose();
  };
  const handleSelectFormat = (format: PageFormat) => {
    if (!selectedKind) return;
    onConfirm(selectedKind, format);
    handleClose();
  };
  const handleClose = () => { setStep("kind"); setSelectedKind(null); onClose(); };

  const showKindStep = step === "kind" && !initialKind;
  const showFormatStep = step === "format" && selectedKind === "presentation";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{showFormatStep ? t("newPage.formatTitle") : t("newPage.title")}</span>
          <button onClick={handleClose} className="text-sm opacity-40 hover:opacity-100 px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--color-border)" }}>{t("commandPalette.esc")}</button>
        </div>
        <div className="p-4 space-y-2">
          {showKindStep && kindOptions.map((option) => (
            <button key={option.id} onClick={() => handleSelectKind(option.id)} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:bg-zinc-100" style={{ border: "1px solid var(--color-border)" }}>
              <span className="text-2xl">{option.icon}</span>
              <span><span className="block text-sm font-medium" style={{ color: "var(--color-text)" }}>{option.label}</span><span className="block text-xs opacity-60" style={{ color: "var(--color-text)" }}>{option.desc}</span></span>
            </button>
          ))}
          {showFormatStep && (FORMAT_OPTIONS_BY_KIND[selectedKind as string] || ["flow"]).map((format) => (
            <button key={format} onClick={() => handleSelectFormat(format)} className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all hover:bg-zinc-100" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
              <span className="text-sm font-medium">{formatLabel(format as PageFormat)}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
````

## File: src/components/NexusApp.tsx
````
"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type ChangeEvent,
} from "react";
import { IndexedDBAdapter } from "../lib/IndexedDBAdapter";
import type {
  Page,
  Attachment,
  WorkspaceBackup,
  StudyItem,
  PageFormat,
  PageMargins,
  CreatePageInput,
} from "../lib/types";
import type { StorageAdapter } from "../lib/StorageAdapter";
import { createResearchNoteContent, titleFromPdfFileName } from "../lib/pdfNote";
import { titleFromMarkdownFileName, createMarkdownContent, pageToMarkdown } from "../lib/markdown";
import { extractWikilinks } from "../lib/wikilinks";
import { downloadTextFile, safeFileName, downloadJsonFile, formatBackupFileName } from "../lib/fileDownload";
import { DEFAULT_LANGUAGE, detectDefaultLanguage, type Language } from "../lib/i18n";
import { LanguageProvider, useLanguage } from "../lib/LanguageContext";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { SyncEngine, type SyncState } from "../lib/syncEngine";
import Sidebar, { type SortMode } from "./Sidebar";
import { createEmptyPresentation, noteToPresentation } from "../lib/presentation";
import EditorPane from "./EditorPane";
import RightPanel from "./RightPanel";
import StudySetView from "./StudySetView";
import Dashboard from "./Dashboard";
import CommandPalette, { type CommandPaletteAction } from "./CommandPalette";
import ResizablePanel from "./ResizablePanel";
import PresentationView from "./PresentationView";
import QuickNotesView from "./QuickNotesView";
import TodoView from "./TodoView";
import NewPageDialog from "./NewPageDialog";

export default function NexusApp() {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const storageRef = useRef<StorageAdapter | null>(null);

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang);
    void storageRef.current?.setLanguagePreference(lang);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleThemeChange = useCallback((newTheme: "light" | "dark") => {
    setTheme(newTheme);
    void storageRef.current?.setThemePreference(newTheme);
  }, []);

  return (
    <LanguageProvider initialLanguage={language} onLanguageChange={handleLanguageChange}>
      <NexusAppInner
        storageRef={storageRef}
        onLanguageLoaded={setLanguage}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
    </LanguageProvider>
  );
}

function NexusAppInner({
  storageRef,
  onLanguageLoaded,
  theme,
  onThemeChange,
}: {
  storageRef: MutableRefObject<StorageAdapter | null>;
  onLanguageLoaded: (lang: Language) => void;
  theme: "light" | "dark";
  onThemeChange: (t: "light" | "dark") => void;
}) {
  const { t } = useLanguage();

  const [isReady, setIsReady] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [isTrashMode, setIsTrashMode] = useState(false);
  const [isHomeMode, setIsHomeMode] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  const [sidebarNewDialogKind, setSidebarNewDialogKind] = useState<"note" | "document" | null>(null);
  // Task 3: Split view (Obsidian style) - left/right closable
  const [secondaryActivePageId, setSecondaryActivePageId] = useState<string | null>(null);
  const [secondaryPdfUrl, setSecondaryPdfUrl] = useState<string | null>(null);
  const [secondaryPdfLoadError, setSecondaryPdfLoadError] = useState<string | null>(null);
  const [isQuickNoteMode, setIsQuickNoteMode] = useState(false);
  const [isTodoMode, setIsTodoMode] = useState(false);
  const [isPageNightAdapt, setIsPageNightAdapt] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const markdownInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const activePageRef = useRef<Page | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle", lastSyncAt: 0, error: null, pendingPushes: 0 });

  const activePage = pages.find((p) => p.id === activePageId) || null;
  const activeAttachment = activePage?.primary_attachment_id
    ? attachments.find((a) => a.id === activePage.primary_attachment_id) || null
    : null;
  const secondaryActivePage = pages.find((p) => p.id === secondaryActivePageId) || null;
  const secondaryActiveAttachment = secondaryActivePage?.primary_attachment_id
    ? attachments.find((a) => a.id === secondaryActivePage.primary_attachment_id) || null
    : null;
  activePageRef.current = activePage;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadActivePdf() {
      setActivePdfUrl(null);
      setPdfLoadError(null);
      if (!activeAttachment) return;
      if (activeAttachment.kind !== "pdf") {
        setPdfLoadError("This attachment is not a PDF.");
        return;
      }
      if (!storageRef.current) {
        setPdfLoadError("Storage is not ready.");
        return;
      }
      const blob = await storageRef.current.readBinary(activeAttachment.id);
      if (cancelled) return;
      if (!blob) {
        setPdfLoadError("PDF binary data was not found in local storage.");
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) setActivePdfUrl(objectUrl);
    }

    loadActivePdf().catch((error) => {
      console.error(error);
      if (!cancelled) {
        setActivePdfUrl(null);
        setPdfLoadError("Failed to load PDF preview.");
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeAttachment, storageRef]);

  // Task 3: Secondary PDF loading
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadSecondaryPdf() {
      setSecondaryPdfUrl(null);
      setSecondaryPdfLoadError(null);
      if (!secondaryActiveAttachment) return;
      if (secondaryActiveAttachment.kind !== "pdf") {
        setSecondaryPdfLoadError("This attachment is not a PDF.");
        return;
      }
      if (!storageRef.current) {
        setSecondaryPdfLoadError("Storage is not ready.");
        return;
      }
      const blob = await storageRef.current.readBinary(secondaryActiveAttachment.id);
      if (cancelled) return;
      if (!blob) {
        setSecondaryPdfLoadError("PDF binary data was not found in local storage.");
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) setSecondaryPdfUrl(objectUrl);
    }

    loadSecondaryPdf().catch((error) => {
      console.error(error);
      if (!cancelled) {
        setSecondaryPdfUrl(null);
        setSecondaryPdfLoadError("Failed to load PDF preview.");
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [secondaryActiveAttachment, storageRef]);

  useEffect(() => {
    let cancelled = false;
    const adapter = new IndexedDBAdapter();

    async function init() {
      await adapter.init();
      if (cancelled) return;
      storageRef.current = adapter;

      let allPages = await adapter.listPages();
      let allAttachments = await adapter.listAttachments();
      setPages(allPages);
      setAttachments(allAttachments);

      const savedLanguage = await adapter.getLanguagePreference();
      if (savedLanguage === "en" || savedLanguage === "zh-TW") onLanguageLoaded(savedLanguage);
      else onLanguageLoaded(detectDefaultLanguage());

      const savedTheme = await adapter.getThemePreference();
      if (savedTheme === "dark" || savedTheme === "light") onThemeChange(savedTheme);

      const savedNightAdapt = await adapter.getPageNightAdaptPreference();
      if (savedNightAdapt === true) setIsPageNightAdapt(true);

      const savedId = await adapter.getActivePageId();
      const savedPage = savedId ? allPages.find((p) => p.id === savedId && p.deleted_at === null) : null;

      if (savedPage) {
        setActivePageId(savedPage.id);
      } else if (allPages.length > 0) {
        setActivePageId(allPages[0].id);
        await adapter.setActivePageId(allPages[0].id);
      } else {
        const first = await adapter.createPage();
        allPages = [first];
        setPages(allPages);
        setActivePageId(first.id);
        await adapter.setActivePageId(first.id);
      }

      setIsReady(true);

      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        if (supabase) {
          const deviceId = await adapter.getDeviceId();
          const engine = new SyncEngine(supabase, adapter, deviceId);
          syncEngineRef.current = engine;
          engine.subscribe(setSyncState);
          engine.setOnRemoteChange(async () => {
            const syncedPages = await adapter.listPages();
            const syncedAttachments = await adapter.listAttachments();
            setPages(syncedPages);
            setAttachments(syncedAttachments);
          });
          await engine.fullSync();
          if (cancelled) return;
          allPages = await adapter.listPages();
          allAttachments = await adapter.listAttachments();
          setPages(allPages);
          setAttachments(allAttachments);
          engine.startRealtime();
        }
      }
    }

    init().catch((error) => {
      console.error(error);
      setIsReady(true);
    });

    return () => {
      cancelled = true;
      syncEngineRef.current?.destroy();
      adapter.close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushSave = useCallback(async (pageToSave: Page) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (!storageRef.current) return;
    const nextPage = { ...pageToSave, updated_at: Date.now(), revision: pageToSave.revision + 1 };
    await storageRef.current.savePage(nextPage);
    syncEngineRef.current?.pushPage(nextPage);
  }, [storageRef]);

  const scheduleSave = useCallback((page: Page) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void flushSave(page), 800);
  }, [flushSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activePageRef.current) void flushSave(activePageRef.current);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flushSave]);

  const activatePage = useCallback(async (id: string) => {
    setIsHomeMode(false);
    setActivePageId(id);
    if (storageRef.current) await storageRef.current.setActivePageId(id);
  }, [storageRef]);

  const handleSelectPage = useCallback(async (id: string) => {
    if (activePageRef.current) await flushSave(activePageRef.current);
    await activatePage(id);
  }, [activatePage, flushSave]);

  const createAndOpenPage = useCallback(async (input: CreatePageInput) => {
    if (!storageRef.current) return;
    if (activePageRef.current) await flushSave(activePageRef.current);
    const newPage = await storageRef.current.createPage(input);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setPages((prev) => [newPage, ...prev]);
    setActivePageId(newPage.id);
    await storageRef.current.setActivePageId(newPage.id);
    syncEngineRef.current?.pushPage(newPage);
    return newPage;
  }, [flushSave, storageRef]);

  // Task 1 optimization: kind decides default format
  // Document = A4 paper (like Word), Note = flow (infinite)
  const handleCreatePage = useCallback(async (format: PageFormat = "flow") => {
    await createAndOpenPage({ kind: "note", format });
  }, [createAndOpenPage]);

  const handleCreateDocument = useCallback(async (format: PageFormat = "a4") => {
    await createAndOpenPage({ kind: "document", format });
  }, [createAndOpenPage]);

  const handleCreateStudySet = useCallback(async () => {
    await createAndOpenPage({ title: "Untitled Study Set", kind: "study_set" });
  }, [createAndOpenPage]);

  const handleCreatePresentation = useCallback(async (format: PageFormat = "16:9") => {
    if (!storageRef.current) return;
    if (activePageRef.current) await flushSave(activePageRef.current);
    const emptyData = createEmptyPresentation("Untitled Presentation");
    const created = await storageRef.current.createPage({ title: "Untitled Presentation", kind: "presentation", format });
    const pageToSave = { ...created, presentation_data: emptyData, updated_at: Date.now(), revision: created.revision + 1 };
    await storageRef.current.savePage(pageToSave);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setPages((prev) => [pageToSave, ...prev]);
    setActivePageId(pageToSave.id);
    await storageRef.current.setActivePageId(pageToSave.id);
    syncEngineRef.current?.pushPage(pageToSave);
    return pageToSave;
  }, [createAndOpenPage, flushSave]);

  const handleUpdatePresentation = useCallback((data: any) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, presentation_data: data } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const handleSecondaryUpdatePresentation = useCallback((data: any) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, presentation_data: data } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleConvertToPresentation = useCallback(async (id?: string) => {
    const targetId = id || activePageId;
    if (!targetId || !storageRef.current) return;
    const source = pages.find((p) => p.id === targetId);
    if (!source) return;
    if (activePageRef.current) await flushSave(activePageRef.current);
    const presData = noteToPresentation(source);
    const created = await storageRef.current.createPage({ 
      title: `${source.title || "Untitled"} - 簡報`, 
      kind: "presentation", 
      format: "16:9",
      folder: source.folder ?? null,
      tags: source.tags ?? [],
    });
    const pageToSave = { ...created, presentation_data: presData, updated_at: Date.now(), revision: created.revision + 1 };
    await storageRef.current.savePage(pageToSave);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setPages((prev) => [pageToSave, ...prev]);
    setActivePageId(pageToSave.id);
    await storageRef.current.setActivePageId(pageToSave.id);
    syncEngineRef.current?.pushPage(pageToSave);
    return pageToSave;
  }, [activePageId, pages, flushSave]);

  const handleAddSubPage = useCallback(async (parentId: string, kind?: string) => {
    const parent = pages.find((p) => p.id === parentId);
    const pageKind = kind === "document" || kind === "study_set" || kind === "note" ? kind : (parent?.kind ?? "note");
    const newPage = await createAndOpenPage({
      title: "",
      kind: pageKind,
      format: parent?.format ?? "flow",
      parent_id: parentId,
      folder: parent?.folder ?? null,
      tags: parent?.tags ?? [],
    });
    if (newPage) setPendingRenameId(newPage.id);
  }, [createAndOpenPage, pages]);

  const handleMovePage = useCallback(async (draggedId: string, targetId: string, position: "above" | "below" | "child") => {
    if (!storageRef.current) return;
    const draggedPage = pages.find((p) => p.id === draggedId);
    const targetPage = pages.find((p) => p.id === targetId);
    if (!draggedPage || !targetPage) return;
    const now = Date.now();

    if (position === "child") {
      // Only same type can be child, presentation has no child concept
      if ((targetPage.kind || "note") === "presentation") return;
      if ((draggedPage.kind || "note") !== (targetPage.kind || "note")) return;
      const targetDepth = targetPage.parent_id ? 1 : 0;
      if (targetDepth >= 2) return;
      const updated: Page = { ...draggedPage, parent_id: targetId, updated_at: now, revision: draggedPage.revision + 1 };
      await storageRef.current.savePage(updated);
      setPages((prev) => prev.map((p) => (p.id === draggedId ? updated : p)));
      syncEngineRef.current?.pushPage(updated);
      return;
    }

    const newParentId = targetPage.parent_id ?? null;
    const normalizedDraggedPage: Page = draggedPage.parent_id !== newParentId
      ? { ...draggedPage, parent_id: newParentId, updated_at: now, revision: draggedPage.revision + 1 }
      : draggedPage;

    if (normalizedDraggedPage !== draggedPage) {
      await storageRef.current.savePage(normalizedDraggedPage);
      syncEngineRef.current?.pushPage(normalizedDraggedPage);
    }

    const siblings = pages.filter((p) => (p.parent_id ?? null) === newParentId && p.id !== draggedId);
    const targetIdx = siblings.findIndex((p) => p.id === targetId);
    const insertIdx = position === "above" ? targetIdx : targetIdx + 1;
    const newOrder = [...siblings];
    newOrder.splice(insertIdx, 0, normalizedDraggedPage);

    const changed = new Map<string, Page>();
    for (let i = 0; i < newOrder.length; i += 1) {
      const page = newOrder[i];
      if (page.sort_order !== i || (page.id === draggedId && page.parent_id !== draggedPage.parent_id)) {
        const updated: Page = { ...page, sort_order: i, updated_at: now, revision: page.revision + 1 };
        await storageRef.current.savePage(updated);
        syncEngineRef.current?.pushPage(updated);
        changed.set(updated.id, updated);
      }
    }
    setPages((prev) => prev.map((p) => changed.get(p.id) ?? p));
  }, [storageRef, pages]);

  const handleCreateItem = useCallback(async (type: "note" | "document" | "study_set" | "folder" | "presentation") => {
    if (type === "note" || type === "document" || type === "presentation") {
      if (type === "presentation") {
        await handleCreatePresentation("16:9");
        return;
      }
      setSidebarNewDialogKind(type as "note" | "document");
      return;
    }
    const input: CreatePageInput = type === "folder"
      ? { kind: "note", folder: "New Folder", title: "" }
      : { kind: "study_set", title: "" };
    const newPage = await createAndOpenPage(input);
    if (newPage) setPendingRenameId(newPage.id);
  }, [createAndOpenPage, handleCreatePresentation]);

  const handleSidebarNewDialogConfirm = useCallback(async (kind: string, format: PageFormat) => {
    const newPage = await createAndOpenPage({ kind: kind as "note" | "document", format, title: "" });
    if (newPage) setPendingRenameId(newPage.id);
  }, [createAndOpenPage]);

  const handleCancelNewPage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    await storageRef.current.deletePage(id);
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (activePageId === id) {
      const remaining = pages.filter((p) => p.id !== id);
      if (remaining.length > 0) await activatePage(remaining[0].id);
      else {
        setActivePageId(null);
        await storageRef.current.setActivePageId(null);
      }
    }
  }, [activatePage, activePageId, pages, storageRef]);

  const handleClearPendingRename = useCallback(() => setPendingRenameId(null), []);

  const handleReorderPages = useCallback(async (orderedIds: string[]) => {
    if (!storageRef.current) return;
    const idToIndex = new Map(orderedIds.map((id, idx) => [id, idx]));
    const now = Date.now();
    const changed = new Map<string, Page>();
    for (const page of pages) {
      const newOrder = idToIndex.get(page.id);
      if (newOrder !== undefined && page.sort_order !== newOrder) {
        const updated: Page = { ...page, sort_order: newOrder, updated_at: now, revision: page.revision + 1 };
        await storageRef.current.savePage(updated);
        syncEngineRef.current?.pushPage(updated);
        changed.set(updated.id, updated);
      }
    }
    if (changed.size > 0) setPages((prev) => prev.map((p) => changed.get(p.id) ?? p));
  }, [storageRef, pages]);

  const handleUpdateStudyItems = useCallback((items: StudyItem[]) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, study_items: items } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const loadTrashPages = useCallback(async () => {
    if (!storageRef.current) return;
    const allPages = await storageRef.current.listPages({ includeDeleted: true });
    setTrashPages(allPages.filter((page) => page.deleted_at !== null));
  }, [storageRef]);

  const handleShowNotes = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(false); }, []);

  // Q-7: night adapt is a global preference, persisted via StorageAdapter (settings store)
  const handleTogglePageNightAdapt = useCallback(() => {
    setIsPageNightAdapt((prev) => {
      const next = !prev;
      void storageRef.current?.setPageNightAdaptPreference?.(next);
      return next;
    });
  }, [storageRef]);
  const handleShowHome = useCallback(() => { setIsTrashMode(false); setIsHomeMode(true); setIsQuickNoteMode(false); setIsTodoMode(false); }, []);
  const handleShowQuickNotes = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(true); setIsTodoMode(false); }, []);
  const handleShowTodoList = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(true); }, []);
  const handleShowTrash = useCallback(async () => {
    if (activePageRef.current) await flushSave(activePageRef.current);
    await loadTrashPages();
    setIsTrashMode(true);
    setIsHomeMode(false);
    setIsQuickNoteMode(false);
    setIsTodoMode(false);
  }, [flushSave, loadTrashPages]);

  const handleRestorePage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    const restored = await storageRef.current.restorePage(id);
    setTrashPages((prev) => prev.filter((page) => page.id !== id));
    setPages((prev) => [restored, ...prev.filter((page) => page.id !== id)]);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setActivePageId(restored.id);
    await storageRef.current.setActivePageId(restored.id);
    syncEngineRef.current?.pushPage(restored);
  }, [storageRef]);

  const handlePermanentDeletePage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    await storageRef.current.permanentDeletePage(id);
    setTrashPages((prev) => prev.filter((page) => page.id !== id));
    syncEngineRef.current?.pushPermanentDeletePage(id);
  }, [storageRef]);

  const handleDuplicatePage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    const source = pages.find((page) => page.id === id);
    if (!source) return;
    if (activePageRef.current) await flushSave(activePageRef.current);
    const duplicated = await storageRef.current.createPage({
      title: `${source.title || "Untitled"} copy`,
      tags: [...(source.tags || [])],
      folder: source.folder ?? null,
      attachment_ids: [...(source.attachment_ids || [])],
      primary_attachment_id: source.primary_attachment_id ?? null,
      parent_id: source.parent_id ?? null,
      kind: source.kind ?? "note",
      format: source.format ?? "flow",
      margins: source.margins,
    });
    const pageToSave: Page = {
      ...duplicated,
      content_json: source.content_json,
      content_text: source.content_text,
      links: [...(source.links || [])],
      study_items: source.study_items ? source.study_items.map((item) => ({ ...item })) : duplicated.study_items,
      updated_at: Date.now(),
      revision: duplicated.revision + 1,
    };
    await storageRef.current.savePage(pageToSave);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setPages((prev) => [pageToSave, ...prev]);
    setActivePageId(pageToSave.id);
    await storageRef.current.setActivePageId(pageToSave.id);
    syncEngineRef.current?.pushPage(pageToSave);
  }, [flushSave, pages, storageRef]);

  const handleImportPdfClick = useCallback(() => pdfInputRef.current?.click(), []);
  const handleImportMarkdownClick = useCallback(() => markdownInputRef.current?.click(), []);

  const handleExportPageMarkdown = useCallback(async (id: string) => {
    const page = id === activePageRef.current?.id ? activePageRef.current : pages.find((p) => p.id === id);
    if (!page) { alert(t("app.noActivePageToExport")); return; }
    if (activePageRef.current && activePageRef.current.id === id) await flushSave(activePageRef.current);
    downloadTextFile(`${safeFileName(page.title)}.md`, pageToMarkdown(page), "text/markdown;charset=utf-8");
  }, [flushSave, pages, t]);

  const handleExportPageAsNexusJson = useCallback(async (id: string) => {
    const page = id === activePageRef.current?.id ? activePageRef.current : pages.find((p) => p.id === id);
    if (!page) { alert(t("app.noActivePageToExport")); return; }
    if (activePageRef.current && activePageRef.current.id === id) await flushSave(activePageRef.current);
    downloadJsonFile(`${safeFileName(page.title)}.nexus.json`, { schema_version: 1, exported_at: Date.now(), page });
  }, [flushSave, pages, t]);

  const handleExportPageAsPdf = useCallback(async (id: string) => {
    if (activePageRef.current?.id !== id) await handleSelectPage(id);
    if (activePageRef.current) await flushSave(activePageRef.current);
    window.setTimeout(() => window.print(), 50);
  }, [flushSave, handleSelectPage]);

  const handleToggleFavorite = useCallback((id: string) => {
    setPages((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, is_favorite: !p.is_favorite } : p));
      const updated = next.find((p) => p.id === id);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [scheduleSave]);

  const handleRenamePage = useCallback((id: string, title: string) => {
    setPages((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, title } : p));
      const updated = next.find((p) => p.id === id);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [scheduleSave]);

  const handleExportBackup = useCallback(async () => {
    const storage = storageRef.current;
    if (!storage || !storage.exportWorkspaceBackup) { alert(t("app.backupNotAvailable")); return; }
    if (activePageRef.current) await flushSave(activePageRef.current);
    try {
      const backup = await storage.exportWorkspaceBackup();
      downloadJsonFile(formatBackupFileName(), backup);
    } catch (error) { console.error(error); alert(t("app.backupExportFailed")); }
  }, [flushSave, storageRef, t]);

  const handleImportBackupClick = useCallback(() => backupInputRef.current?.click(), []);
  const handleImportBackupFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const storage = storageRef.current;
    if (!storage || !storage.importWorkspaceBackup) { alert(t("app.backupNotAvailable")); return; }
    if (!confirm(t("app.confirmImportBackup"))) return;
    try {
      const text = await file.text();
      await storage.importWorkspaceBackup(JSON.parse(text) as WorkspaceBackup);
      alert(t("app.backupImportedReload"));
      window.location.reload();
    } catch (error) { console.error(error); alert(t("app.backupImportFailed")); }
  }, [storageRef, t]);

  const handleImportMarkdownFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isMarkdown = lowerName.endsWith(".md") || lowerName.endsWith(".markdown") || lowerName.endsWith(".txt") || file.type === "text/markdown" || file.type === "text/plain";
    if (!isMarkdown) { alert(t("app.chooseMarkdownFile")); return; }
    const storage = storageRef.current;
    if (!storage) return;
    try {
      if (activePageRef.current) await flushSave(activePageRef.current);
      const markdown = await file.text();
      const createdPage = await storage.createPage({
        title: titleFromMarkdownFileName(file.name),
        tags: ["imported"],
        folder: "Imports",
        kind: "document",
        format: "flow",
      });
      const importedPage: Page = {
        ...createdPage,
        content_json: createMarkdownContent(markdown),
        content_text: markdown,
        updated_at: Date.now(),
        revision: createdPage.revision + 1,
      };
      await storage.savePage(importedPage);
      setIsTrashMode(false);
      setIsHomeMode(false);
      setPages((prev) => [importedPage, ...prev]);
      setActivePageId(importedPage.id);
      await storage.setActivePageId(importedPage.id);
      syncEngineRef.current?.pushPage(importedPage);
    } catch (error) { console.error(error); alert(t("app.markdownImportFailed")); }
  }, [flushSave, storageRef, t]);

  const handleImportPdfFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { alert(t("app.choosePdfFile")); return; }
    const storage = storageRef.current;
    if (!storage || !storage.createAttachment) { alert(t("app.attachmentNotAvailable")); return; }
    try {
      if (activePageRef.current) await flushSave(activePageRef.current);
      const attachment = await storage.createAttachment({ kind: "pdf", name: file.name, mime_type: file.type || "application/pdf", size_bytes: file.size });
      await storage.attachBinary(attachment.id, file);
      const createdPage = await storage.createPage({ title: titleFromPdfFileName(file.name), tags: ["research"], folder: "Research", attachment_ids: [attachment.id], primary_attachment_id: attachment.id });
      const researchPage: Page = {
        ...createdPage,
        content_json: createResearchNoteContent(file.name),
        content_text: `PDF Notes\nSource PDF: ${file.name}`,
        updated_at: Date.now(),
        revision: createdPage.revision + 1,
      };
      await storage.savePage(researchPage);
      setIsTrashMode(false);
      setIsHomeMode(false);
      setAttachments((prev) => [attachment, ...prev]);
      setPages((prev) => [researchPage, ...prev]);
      setActivePageId(researchPage.id);
      await storage.setActivePageId(researchPage.id);
      syncEngineRef.current?.pushAttachment(attachment);
      syncEngineRef.current?.pushBinary(attachment.id, file);
      syncEngineRef.current?.pushPage(researchPage);
    } catch (error) { console.error(error); alert(t("app.pdfImportFailed")); }
  }, [flushSave, storageRef, t]);

  const handleSelectPageByTitle = useCallback(async (targetTitle: string) => {
    const exists = pages.find((p) => p.title.trim().toLowerCase() === targetTitle.trim().toLowerCase());
    if (exists) { await handleSelectPage(exists.id); return; }
    if (confirm(t("app.confirmCreatePageFromLink", { title: targetTitle }))) {
      const newPage = await createAndOpenPage({ title: targetTitle });
      if (newPage) syncEngineRef.current?.pushPage(newPage);
    }
  }, [pages, handleSelectPage, t, createAndOpenPage]);

  const handleTitleChange = useCallback((title: string) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, title } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const handleFolderChange = useCallback((newFolder: string | null) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, folder: newFolder } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const handleTagsChange = useCallback((newTags: string[]) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, tags: newTags } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  // Task 1: PageFormat toggle - any paginated can convert to flow
  const handleFormatChange = useCallback((newFormat: PageFormat) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, format: newFormat } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  // Task 3: Split view handlers (Obsidian style, closable)
  const handleOpenInSplit = useCallback((id: string) => {
    if (id === activePageId) return;
    setSecondaryActivePageId(id);
    setIsHomeMode(false);
    setIsTrashMode(false);
  }, [activePageId]);

  const handleCloseSplit = useCallback(() => {
    setSecondaryActivePageId(null);
    setSecondaryPdfUrl(null);
    setSecondaryPdfLoadError(null);
  }, []);

  const handleSwapSplit = useCallback(() => {
    if (!activePageId || !secondaryActivePageId) return;
    const primary = activePageId;
    const secondary = secondaryActivePageId;
    setActivePageId(secondary);
    setSecondaryActivePageId(primary);
    if (storageRef.current) {
      void storageRef.current.setActivePageId(secondary);
    }
  }, [activePageId, secondaryActivePageId]);

  const handleSecondaryTitleChange = useCallback((title: string) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, title } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleSecondaryFolderChange = useCallback((newFolder: string | null) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, folder: newFolder } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleSecondaryTagsChange = useCallback((newTags: string[]) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, tags: newTags } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleMarginsChange = useCallback((margins: PageMargins) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, margins } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const handleSecondaryMarginsChange = useCallback((margins: PageMargins) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, margins } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleSecondaryFormatChange = useCallback((newFormat: PageFormat) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, format: newFormat } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleSecondaryContentChange = useCallback(({ json, text }: { json: any; text: string }) => {
    if (!secondaryActivePageId) return;
    const extractedLinks = extractWikilinks(text);
    setPages((prev) => {
      const next = prev.map((p) => p.id === secondaryActivePageId ? { ...p, content_json: json, content_text: text, links: extractedLinks } : p);
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleContentChange = useCallback(({ json, text }: { json: any; text: string }) => {
    if (!activePageId) return;
    const extractedLinks = extractWikilinks(text);
    setPages((prev) => {
      const next = prev.map((p) => p.id === activePageId ? { ...p, content_json: json, content_text: text, links: extractedLinks } : p);
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const handleDeletePage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    if (activePageRef.current && activePageRef.current.id === id) activePageRef.current = null;
    const deletedPage = pages.find((p) => p.id === id);
    const now = Date.now();
    await storageRef.current.deletePage(id);
    // M4-1 fix: push the soft-deleted version to cloud so other devices don't resurrect it
    if (deletedPage) {
      const deletedVersion = { ...deletedPage, deleted_at: now, updated_at: now, revision: deletedPage.revision + 1 };
      syncEngineRef.current?.pushPage(deletedVersion);
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (deletedPage) setTrashPages((prev) => [{ ...deletedPage, deleted_at: now, updated_at: now, revision: deletedPage.revision + 1 }, ...prev.filter((p) => p.id !== id)]);
    if (activePageId === id) {
      const remaining = pages.filter((p) => p.id !== id);
      if (remaining.length > 0) await handleSelectPage(remaining[0].id);
      else { setActivePageId(null); await storageRef.current.setActivePageId(null); }
    }
  }, [activePageId, pages, handleSelectPage, storageRef]);

  const handleBulkDeletePages = useCallback(async (ids: string[]) => {
    if (!storageRef.current || ids.length === 0) return;
    const idSet = new Set(ids);
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    if (activePageRef.current && idSet.has(activePageRef.current.id)) activePageRef.current = null;
    const now = Date.now();
    const toDelete = pages.filter((p) => idSet.has(p.id));
    for (const id of ids) await storageRef.current.deletePage(id);
    // M4-1 fix: push each soft-deleted version to cloud so other devices don't resurrect them
    for (const p of toDelete) {
      syncEngineRef.current?.pushPage({ ...p, deleted_at: now, updated_at: now, revision: p.revision + 1 });
    }
    setPages((prev) => prev.filter((p) => !idSet.has(p.id)));
    setTrashPages((prev) => [...toDelete.map((p) => ({ ...p, deleted_at: now, updated_at: now, revision: p.revision + 1 })), ...prev.filter((p) => !idSet.has(p.id))]);
    if (activePageId && idSet.has(activePageId)) {
      const remaining = pages.filter((p) => !idSet.has(p.id));
      if (remaining.length > 0) await handleSelectPage(remaining[0].id);
      else { setActivePageId(null); await storageRef.current.setActivePageId(null); }
    }
  }, [activePageId, pages, handleSelectPage, storageRef]);

  const handleBulkRestorePages = useCallback(async (ids: string[]) => {
    if (!storageRef.current || ids.length === 0) return;
    const idSet = new Set(ids);
    const restoredPages: Page[] = [];
    for (const id of ids) {
      const restored = await storageRef.current.restorePage(id);
      restoredPages.push(restored);
      syncEngineRef.current?.pushPage(restored);
    }
    setTrashPages((prev) => prev.filter((p) => !idSet.has(p.id)));
    setPages((prev) => [...restoredPages, ...prev.filter((p) => !idSet.has(p.id))]);
  }, [storageRef]);

  const handleBulkPermanentDeletePages = useCallback(async (ids: string[]) => {
    if (!storageRef.current || ids.length === 0) return;
    const idSet = new Set(ids);
    for (const id of ids) { await storageRef.current.permanentDeletePage(id); syncEngineRef.current?.pushPermanentDeletePage(id); }
    setTrashPages((prev) => prev.filter((p) => !idSet.has(p.id)));
  }, [storageRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const commandPaletteActions: CommandPaletteAction[] = [
    { id: "go-home", label: t("commandPalette.goHome"), icon: "??", keywords: "dashboard home", run: handleShowHome },
    { id: "go-notes", label: t("commandPalette.goNotes"), icon: "??", keywords: "notes", run: handleShowNotes },
    { id: "go-trash", label: t("commandPalette.goTrash"), icon: "??", keywords: "trash", run: () => void handleShowTrash() },
    { id: "new-document", label: t("commandPalette.newDocument"), icon: "??", keywords: "new create document", run: () => void handleCreateDocument() },
    { id: "new-note", label: t("commandPalette.newNote"), icon: "??", keywords: "new create note", run: () => void handleCreatePage() },
    { id: "new-study-set", label: t("commandPalette.newStudySet"), icon: "??", keywords: "study set flashcard", run: () => void handleCreateStudySet() },
    { id: "import-pdf", label: t("commandPalette.importPdf"), icon: "??", keywords: "pdf import", run: handleImportPdfClick },
    { id: "import-markdown", label: t("commandPalette.importMarkdown"), icon: "??", keywords: "markdown md import", run: handleImportMarkdownClick },
    { id: "export-current-page", label: t("commandPalette.exportCurrentPage"), icon: "?", keywords: "export markdown pdf", run: () => {
      const page = activePageRef.current;
      if (!page) return;
      if (page.kind === "document") void handleExportPageMarkdown(page.id);
      else void handleExportPageAsPdf(page.id);
    }},
    { id: "export-backup", label: t("commandPalette.exportBackup"), icon: "??", keywords: "backup export", run: () => void handleExportBackup() },
  ];

  if (!isReady) {
    return <div className="flex h-screen w-screen items-center justify-center text-base" style={{ color: "var(--color-sidebar-text)" }}>{t("common.loading")}</div>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden gap-3 p-3" style={{ backgroundColor: "var(--color-bg)" }}>
      <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleImportPdfFile} />
      <input ref={markdownInputRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={handleImportMarkdownFile} />
      <input ref={backupInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportBackupFile} />

      <ResizablePanel side="left" defaultWidth={300} minWidth={220} maxWidth={480} isCollapsed={isSidebarCollapsed}>
        <Sidebar
          pages={isTrashMode ? trashPages : pages}
          activePageId={isTrashMode || isHomeMode ? null : activePageId}
          selectedTag={selectedTag}
          isTrashMode={isTrashMode}
          isHomeMode={isHomeMode}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onSelectTag={setSelectedTag}
          onSelectPage={handleSelectPage}
          onImportPdf={handleImportPdfClick}
          onImportMarkdown={handleImportMarkdownClick}
          onShowHome={handleShowHome}
          onShowNotes={handleShowNotes}
          onShowTrash={handleShowTrash}
          onDeletePage={handleDeletePage}
          onRestorePage={handleRestorePage}
          onPermanentDeletePage={handlePermanentDeletePage}
          onDuplicatePage={handleDuplicatePage}
          onBulkDeletePages={handleBulkDeletePages}
          onBulkRestorePages={handleBulkRestorePages}
          onBulkPermanentDeletePages={handleBulkPermanentDeletePages}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleFavorite={handleToggleFavorite}
          onRenamePage={handleRenamePage}
          onExportPageMarkdown={handleExportPageMarkdown}
          onExportPageAsPdf={handleExportPageAsPdf}
          onExportPageAsNexusJson={handleExportPageAsNexusJson}
          onAddSubPage={handleAddSubPage}
          theme={theme}
          onThemeChange={onThemeChange}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackupClick}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          onReorderPages={handleReorderPages}
          pendingRenameId={pendingRenameId}
          onClearPendingRename={handleClearPendingRename}
          onCancelNewPage={handleCancelNewPage}
          onCreateItem={handleCreateItem}
          syncState={syncState}
          onMovePage={handleMovePage}
          onOpenInSplit={handleOpenInSplit}
          isQuickNoteMode={isQuickNoteMode}
          isTodoMode={isTodoMode}
          onShowQuickNotes={handleShowQuickNotes}
          onShowTodoList={handleShowTodoList}
        />
      </ResizablePanel>

      {isHomeMode ? (
        <Dashboard pages={pages} onSelectPage={handleSelectPage} onCreatePage={handleCreatePage} onCreateDocument={handleCreateDocument} onCreateStudySet={handleCreateStudySet} onImportPdf={handleImportPdfClick} onCreatePresentation={handleCreatePresentation} />
      ) : isQuickNoteMode ? (
        <QuickNotesView
          pages={pages}
          onCreate={(txt) => {
            const title = txt.slice(0, 30) || "隨手記";
            void createAndOpenPage({ title, kind: "quick_note" as any, folder: "QuickNotes" }).then((p) => {
              if (p) {
                const updated = { ...p, content_text: txt, content_json: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: txt }] }] } };
                void storageRef.current?.savePage(updated).then(() => {
                  setPages((prev) => prev.map((pp) => pp.id === p.id ? updated : pp));
                  syncEngineRef.current?.pushPage(updated);
                });
              }
            });
          }}
          onUpdate={(id, patch) => {
            setPages((prev) => {
              const next = prev.map((p) => p.id === id ? { ...p, ...patch, updated_at: Date.now(), revision: p.revision + 1 } : p);
              const upd = next.find((p) => p.id === id);
              if (upd && storageRef.current) { void storageRef.current.savePage(upd); syncEngineRef.current?.pushPage(upd); }
              return next;
            });
          }}
          onDelete={(id) => { void handleDeletePage(id); }}
          onSelectPage={handleSelectPage}
        />
      ) : isTodoMode ? (
        <TodoView
          pages={pages}
          onCreate={(title, due) => {
            void createAndOpenPage({ title, kind: "todo" as any }).then((p) => {
              if (p) {
                const updated = { ...p, title, due_date: due || Date.now(), completed: false, updated_at: Date.now(), revision: p.revision + 1 };
                void storageRef.current?.savePage(updated).then(() => {
                  setPages((prev) => prev.map((pp) => pp.id === p.id ? updated : pp));
                  syncEngineRef.current?.pushPage(updated);
                });
              }
            });
          }}
          onUpdate={(id, patch) => {
            setPages((prev) => {
              const next = prev.map((p) => p.id === id ? { ...p, ...patch, updated_at: Date.now(), revision: p.revision + 1 } : p);
              const upd = next.find((p) => p.id === id);
              if (upd && storageRef.current) { void storageRef.current.savePage(upd); syncEngineRef.current?.pushPage(upd); }
              return next;
            });
          }}
          onDelete={(id) => { void handleDeletePage(id); }}
          onSelectPage={handleSelectPage}
        />
      ) : secondaryActivePageId && secondaryActivePage ? (
        <div className="flex flex-1 overflow-hidden gap-2">
          {/* Primary pane */}
          <div className="flex flex-col flex-1 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--color-border)" }}>
            {activePage?.kind === "study_set" ? (
              <StudySetView page={activePage} onTitleChange={handleTitleChange} onUpdateStudyItems={handleUpdateStudyItems} />
            ) : activePage?.kind === "presentation" ? (
              <PresentationView page={activePage} onTitleChange={handleTitleChange} onUpdatePresentation={handleUpdatePresentation} />
            ) : (
              <EditorPane
                page={activePage}
                attachment={activeAttachment}
                pdfUrl={activePdfUrl}
                pdfLoadError={pdfLoadError}
                onTitleChange={handleTitleChange}
                onFolderChange={handleFolderChange}
                onTagsChange={handleTagsChange}
                onContentChange={handleContentChange}
                onFormatChange={handleFormatChange}
                onMarginsChange={handleMarginsChange}
                margins={activePage?.margins}
                onAddSubPage={handleAddSubPage}
                onExportMarkdown={() => activePage && handleExportPageMarkdown(activePage.id)}
                onExportPdf={() => activePage && handleExportPageAsPdf(activePage.id)}
                onExportNexus={() => activePage && handleExportPageAsNexusJson(activePage.id)}
                onNewNote={() => handleCreatePage("flow")}
                onNewDocument={() => handleCreateDocument("a4")}
                onImportPdf={handleImportPdfClick}
                onImportMd={handleImportMarkdownClick}
                onConvertToPresentation={() => handleConvertToPresentation()}
              
                nightAdapt={isPageNightAdapt}
                onToggleNightAdapt={handleTogglePageNightAdapt}
                isSplitView={!!secondaryActivePageId}
                onCloseSplit={handleCloseSplit}
                onSwapSplit={handleSwapSplit}
              />
            )}
          </div>
          {/* Divider with controls */}
          <div className="flex flex-col items-center gap-1 py-2">
            <button onClick={handleSwapSplit} className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:bg-zinc-200" title="交換左右">⇄</button>
            <div className="flex-1 w-px bg-zinc-300" />
            <button onClick={handleCloseSplit} className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:bg-zinc-200" title="關閉右側">✕</button>
          </div>
          {/* Secondary pane - Obsidian style closable */}
          <div className="flex flex-col flex-1 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--color-border)" }}>
            {secondaryActivePage.kind === "study_set" ? (
              <StudySetView page={secondaryActivePage} onTitleChange={handleSecondaryTitleChange} onUpdateStudyItems={(items)=>{ handleSecondaryContentChange({ json: secondaryActivePage.content_json, text: secondaryActivePage.content_text }) }} />
            ) : secondaryActivePage.kind === "presentation" ? (
              <PresentationView page={secondaryActivePage} onTitleChange={handleSecondaryTitleChange} onUpdatePresentation={handleSecondaryUpdatePresentation} />
            ) : (
              <EditorPane
                page={secondaryActivePage}
                attachment={secondaryActiveAttachment}
                pdfUrl={secondaryPdfUrl}
                pdfLoadError={secondaryPdfLoadError}
                onTitleChange={handleSecondaryTitleChange}
                onFolderChange={handleSecondaryFolderChange}
                onTagsChange={handleSecondaryTagsChange}
                onContentChange={handleSecondaryContentChange}
                onFormatChange={handleSecondaryFormatChange}
                onMarginsChange={handleSecondaryMarginsChange}
                margins={secondaryActivePage?.margins}
                onAddSubPage={handleAddSubPage}
                onExportMarkdown={() => secondaryActivePage && handleExportPageMarkdown(secondaryActivePage.id)}
                onExportPdf={() => secondaryActivePage && handleExportPageAsPdf(secondaryActivePage.id)}
                onExportNexus={() => secondaryActivePage && handleExportPageAsNexusJson(secondaryActivePage.id)}
                onNewNote={() => handleCreatePage("flow")}
                onNewDocument={() => handleCreateDocument("a4")}
                onImportPdf={handleImportPdfClick}
                onImportMd={handleImportMarkdownClick}
                onConvertToPresentation={() => handleConvertToPresentation(secondaryActivePageId || undefined)}
              
                nightAdapt={isPageNightAdapt}
                onToggleNightAdapt={handleTogglePageNightAdapt}
                isSplitView={!!secondaryActivePageId}
                onCloseSplit={handleCloseSplit}
                onSwapSplit={handleSwapSplit}
              />
            )}
          </div>
        </div>
      ) : activePage?.kind === "study_set" ? (
        <StudySetView page={activePage} onTitleChange={handleTitleChange} onUpdateStudyItems={handleUpdateStudyItems} />
      ) : activePage?.kind === "presentation" ? (
        <PresentationView page={activePage} onTitleChange={handleTitleChange} onUpdatePresentation={handleUpdatePresentation} />
      ) : (
        <EditorPane
          page={activePage}
          attachment={activeAttachment}
          pdfUrl={activePdfUrl}
          pdfLoadError={pdfLoadError}
          onTitleChange={handleTitleChange}
          onFolderChange={handleFolderChange}
          onTagsChange={handleTagsChange}
          onContentChange={handleContentChange}
          onFormatChange={handleFormatChange}
          onMarginsChange={handleMarginsChange}
          margins={activePage?.margins}
          onAddSubPage={handleAddSubPage}
          onExportMarkdown={() => activePage && handleExportPageMarkdown(activePage.id)}
          onExportPdf={() => activePage && handleExportPageAsPdf(activePage.id)}
          onExportNexus={() => activePage && handleExportPageAsNexusJson(activePage.id)}
          onNewNote={() => handleCreatePage("flow")}
          onNewDocument={() => handleCreateDocument("a4")}
          onImportPdf={handleImportPdfClick}
          onImportMd={handleImportMarkdownClick}
                onConvertToPresentation={() => handleConvertToPresentation()}
        
                nightAdapt={isPageNightAdapt}
                onToggleNightAdapt={handleTogglePageNightAdapt}
                isSplitView={!!secondaryActivePageId}
                onCloseSplit={handleCloseSplit}
                onSwapSplit={handleSwapSplit}
              />
      )}

      {!isHomeMode && (
        <ResizablePanel side="right" defaultWidth={320} minWidth={240} maxWidth={520} isCollapsed={isRightPanelCollapsed}>
          <RightPanel page={activePage} pages={pages} isCollapsed={isRightPanelCollapsed} onToggleCollapse={() => setIsRightPanelCollapsed((prev) => !prev)} onSelectPageTitle={handleSelectPageByTitle} />
        </ResizablePanel>
      )}

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} pages={pages} actions={commandPaletteActions} onSelectPage={handleSelectPage} />

      {sidebarNewDialogKind && (
        <NewPageDialog
          isOpen={true}
          onClose={() => setSidebarNewDialogKind(null)}
          onConfirm={(kind, format) => {
            void handleSidebarNewDialogConfirm(kind, format);
            setSidebarNewDialogKind(null);
          }}
          initialKind={sidebarNewDialogKind}
        />
      )}
    </div>
  );
}
````

## File: src/components/PageFormatView.tsx
````
"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PageFormat } from "../lib/types";

type Props = {
  format: PageFormat;
  children: ReactNode;
  onAddPage?: () => void;
};

const PX_PER_MM = 3.779527559;
const A4_HEIGHT_MM = 297;
const A4_PAD_V_MM = 20;
const A4_PAD_H_MM = 18;
const A4_PAGE_HEIGHT_PX = A4_HEIGHT_MM * PX_PER_MM; // ~1122
const A4_PAD_V_PX = A4_PAD_V_MM * PX_PER_MM;
const A4_PAD_H_PX = A4_PAD_H_MM * PX_PER_MM;
const SLIDE_169_HEIGHT = 540;
const SLIDE_43_HEIGHT = 600;

export default function PageFormatView({ format, children }: Props) {
  const fmt = format || "flow";
  const isPaged = fmt !== "flow";
  const contentRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);

  const getMetrics = () => {
    if (fmt === "a4") return { pageH: A4_PAGE_HEIGHT_PX, padV: A4_PAD_V_PX, padH: A4_PAD_H_PX, bg: "#f5f5f4", width: "210mm", pad: `${A4_PAD_V_MM}mm ${A4_PAD_H_MM}mm` };
    if (fmt === "16:9") return { pageH: SLIDE_169_HEIGHT, padV: 32, padH: 40, bg: "#0a0a0a", width: "960px", pad: "32px 40px" };
    if (fmt === "4:3") return { pageH: SLIDE_43_HEIGHT, padV: 32, padH: 40, bg: "#0a0a0a", width: "800px", pad: "32px 40px" };
    return { pageH: 900, padV: 24, padH: 24, bg: "#f5f5f4", width: "100%", pad: "24px" };
  };

  const metrics = getMetrics();
  const gap = 24;

  useEffect(() => {
    if (!isPaged) return;
    const el = contentRef.current;
    if (!el) return;
    const update = () => {
      const h = el.scrollHeight;
      const needed = Math.max(1, Math.ceil((h + 40) / metrics.pageH));
      setPages((prev) => (prev !== needed ? Math.min(needed, 50) : prev));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [isPaged, metrics.pageH, children]);

  // Fix 貼邊：確保區塊不在頁面邊緣，動態加入 margin
  useEffect(() => {
    if (!isPaged) return;
    const el = contentRef.current;
    if (!el) return;
    const pro = el.querySelector(".ProseMirror") as HTMLElement;
    if (!pro) return;

    const fixEdges = () => {
      const blocks = pro.querySelectorAll(":scope > *") as NodeListOf<HTMLElement>;
      blocks.forEach((block) => {
        // Reset previous adjustments to measure natural position
        block.style.marginTop = "";
        block.style.marginBottom = "";
      });

      // Second pass: check position relative to pages
      blocks.forEach((block) => {
        const offsetTop = block.offsetTop;
        const offsetInPage = offsetTop % (metrics.pageH + gap);
        // If block starts too close to page top edge (within 5px), push down by padV
        if (offsetInPage > 0 && offsetInPage < 10) {
          block.style.marginTop = `${metrics.padV}px`;
        }
        // If block ends too close to page bottom edge, push next block to next page by adding bottom margin
        const blockBottom = offsetTop + block.offsetHeight;
        const bottomInPage = blockBottom % (metrics.pageH + gap);
        const pageBottomThreshold = metrics.pageH - metrics.padV;
        if (bottomInPage > pageBottomThreshold && bottomInPage < metrics.pageH) {
          const needed = metrics.pageH - bottomInPage + metrics.padV + gap;
          block.style.marginBottom = `${needed}px`;
        }
        // Prevent horizontal overflow outside page
        if (block.scrollWidth > block.clientWidth) {
          block.style.maxWidth = "100%";
          block.style.overflowWrap = "break-word";
          block.style.wordBreak = "break-word";
        }
      });
    };

    // Use timeout to let ProseMirror paint
    const timeout = setTimeout(fixEdges, 100);
    const ro = new ResizeObserver(fixEdges);
    ro.observe(pro);
    return () => {
      clearTimeout(timeout);
      ro.disconnect();
    };
  }, [isPaged, pages, metrics.pageH, metrics.padV, gap, children]);

  if (fmt === "flow") {
    return <div className="nexus-format-flow flex-1 overflow-y-auto">{children}</div>;
  }

  const totalStackHeight = pages * (metrics.pageH + gap);

  return (
    <div className="flex-1 overflow-y-auto relative flex flex-col items-center" style={{ background: metrics.bg, padding: "24px" }}>
      <div
        className="relative"
        style={{
          width: fmt === "a4" ? "210mm" : fmt === "16:9" ? "960px" : fmt === "4:3" ? "800px" : "100%",
          maxWidth: "100%",
          minHeight: `${totalStackHeight}px`,
        }}
      >
        {/* Background pages */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {Array.from({ length: pages }).map((_, i) => (
            <div
              key={i}
              className={fmt === "a4" ? "nexus-format-a4-page" : fmt === "16:9" ? "nexus-format-169-page" : fmt === "4:3" ? "nexus-format-43-page" : "nexus-format-flow"}
              style={{
                position: "absolute",
                top: `${i * (metrics.pageH + gap)}px`,
                left: 0,
                right: 0,
                height: `${metrics.pageH}px`,
                background: "white",
                boxShadow: fmt === "a4" ? "0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)" : "0 8px 32px rgba(0,0,0,0.4)",
                color: "#1a1a1a",
                overflow: "hidden",
              }}
            >
              <div className="absolute top-2 right-3 text-[9px] opacity-20 select-none">第 {i + 1} 頁 / 共 {pages} 頁</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="relative z-10 nexus-paged-content"
          style={{
            width: "100%",
            minHeight: `${metrics.pageH}px`,
            padding: metrics.pad,
            color: "#1a1a1a",
            background: "transparent",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </div>

    </div>
  );
}

````

## File: src/components/PageItemMenu.tsx
````
"use client";
import { useEffect, useRef, useState } from "react";

export interface PageMenuItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const MENU_WIDTH = 208;
const EDGE_MARGIN = 10;
const ITEM_HEIGHT = 42;

export default function PageItemMenu({ items, title }: { items: PageMenuItem[]; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedButton = buttonRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedButton && !clickedMenu) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const openMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!buttonRef.current) return;
    if (isOpen) { setIsOpen(false); return; }
    const rect = buttonRef.current.getBoundingClientRect();
    const estimatedMenuHeight = items.length * ITEM_HEIGHT + 16;
    const openUpward = rect.bottom + estimatedMenuHeight > window.innerHeight - EDGE_MARGIN;
    const idealLeft = rect.right - MENU_WIDTH;
    const maxLeft = window.innerWidth - MENU_WIDTH - EDGE_MARGIN;
    const clampedLeft = Math.min(Math.max(EDGE_MARGIN, idealLeft), Math.max(EDGE_MARGIN, maxLeft));
    setPosition({
      top: openUpward ? Math.max(EDGE_MARGIN, rect.top - estimatedMenuHeight) : rect.bottom + 4,
      left: clampedLeft,
    });
    setIsOpen(true);
  };

  return (
    <>
      <button ref={buttonRef} onClick={openMenu} className="flex items-center justify-center w-9 h-9 hover:bg-zinc-300 rounded-md text-base transition-all text-zinc-500" title={title}>⋮</button>
      {isOpen && position && (
        <div ref={menuRef} className="fixed rounded-xl overflow-hidden shadow-2xl z-[9998]" style={{ top: `${position.top}px`, left: `${position.left}px`, width: `${MENU_WIDTH}px`, backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          {items.map((item) => (
            <button key={item.id} onClick={() => { item.onClick(); setIsOpen(false); }} className={`w-full flex items-center gap-2.5 px-3.5 py-3 text-sm text-left transition-all ${item.danger ? "text-red-600 hover:bg-red-50" : "hover:bg-zinc-200"}`} style={{ color: item.danger ? undefined : "var(--color-text)" }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
````

## File: src/components/PaginatedEditorView.tsx
````
"use client";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { PageFormat, PageMargins } from "../lib/types";
import { DEFAULT_PAGE_MARGINS } from "../lib/types";
import TiptapEditor from "./TiptapEditor";

type Block = any;

function getTextFromNode(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (Array.isArray(node.content)) return node.content.map(getTextFromNode).join("");
  return "";
}

function estimateBlockHeight(node: Block): number {
  const type = node.type;
  switch (type) {
    case "heading":
      return node.attrs?.level === 1 ? 70 : node.attrs?.level === 2 ? 55 : 45;
    case "paragraph": {
      const text = getTextFromNode(node);
      const charsPerLine = 70;
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
      return lines * 26 + 20;
    }
    case "bulletList":
    case "orderedList":
    case "taskList": {
      let h = 0;
      for (const item of node.content || []) {
        h += estimateBlockHeight(item);
      }
      return Math.max(30, h + 10);
    }
    case "listItem":
    case "taskItem": {
      let h = 0;
      for (const c of node.content || []) {
        h += estimateBlockHeight(c);
      }
      return Math.max(28, h);
    }
    case "table": {
      const rows = node.content?.length || 3;
      return rows * 48 + 50;
    }
    case "blockquote":
      return 70;
    case "codeBlock": {
      const text = getTextFromNode(node);
      const lines = text.split("\n").length;
      return Math.max(70, lines * 22 + 36);
    }
    case "image":
      return 240;
    case "callout": {
      let h = 0;
      for (const c of node.content || []) {
        h += estimateBlockHeight(c);
      }
      return h + 60;
    }
    case "multiColumn": {
      let maxH = 0;
      for (const col of node.content || []) {
        let colH = 0;
        for (const b of col.content || []) {
          colH += estimateBlockHeight(b);
        }
        maxH = Math.max(maxH, colH);
      }
      return maxH + 30;
    }
    case "column": {
      let h = 0;
      for (const b of node.content || []) {
        h += estimateBlockHeight(b);
      }
      return h;
    }
    case "pageBreak":
      return 20;
    default:
      return 50;
  }
}

function splitIntoPages(blocks: Block[], innerHeight: number): Block[][] {
  const pages: Block[][] = [[]];
  let currentHeight = 0;
  let currentPage = pages[0];
  for (const block of blocks) {
    // 手動分頁符：強制換頁（不佔內容）
    if (block.type === "pageBreak") {
      if (currentPage.length > 0) {
        pages.push([]);
        currentPage = pages[pages.length - 1];
        currentHeight = 0;
      }
      continue;
    }
    const h = estimateBlockHeight(block);
    if (h > innerHeight) {
      if (currentPage.length > 0) {
        pages.push([]);
        currentPage = pages[pages.length - 1];
        currentHeight = 0;
      }
      currentPage.push(block);
      pages.push([]);
      currentPage = pages[pages.length - 1];
      currentHeight = 0;
      continue;
    }
    if (currentHeight + h > innerHeight && currentPage.length > 0) {
      pages.push([]);
      currentPage = pages[pages.length - 1];
      currentHeight = 0;
    }
    currentPage.push(block);
    currentHeight += h;
  }
  while (pages.length > 1 && pages[pages.length - 1].length === 0) {
    pages.pop();
  }
  if (pages.length === 0) return [[]];
  return pages;
}

// 依物件引用找出某頁 blocks 在原始 blocks 陣列中的索引範圍
function findPageRange(blocks: Block[], pageBlocks: Block[]): [number, number] {
  const set = new Set(pageBlocks);
  const idxs: number[] = [];
  blocks.forEach((b, i) => { if (set.has(b)) idxs.push(i); });
  if (idxs.length === 0) return [0, 0];
  return [idxs[0], idxs[idxs.length - 1]];
}

// 壓縮連續 pageBreak、移除開頭/結尾 pageBreak
function normalizePageBreaks(blocks: Block[]): Block[] {
  const out: Block[] = [];
  let prevBreak = false;
  for (const b of blocks) {
    const isBreak = b.type === "pageBreak";
    if (isBreak && (prevBreak || out.length === 0)) continue;
    out.push(b);
    prevBreak = isBreak;
  }
  while (out.length > 0 && out[out.length - 1].type === "pageBreak") out.pop();
  return out;
}

function firstHeadingText(pageBlocks: Block[]): string {
  for (const b of pageBlocks) if (b.type === "heading") return getTextFromNode(b).trim();
  return "";
}

export default function PaginatedEditorView({
  content,
  onContentChange,
  format,
  toolbarTarget,
  nightAdapt = false,
  onToggleNightAdapt,
  margins,
  onMarginsChange,
  toolbarTab = "home",
  fileMode = false,
  showThumbRail = true,
}: {
  content: any;
  onContentChange: (payload: { json: any; text: string }) => void;
  format: PageFormat;
  toolbarTarget: HTMLElement | null;
  nightAdapt?: boolean;
  onToggleNightAdapt?: () => void;
  margins?: PageMargins;
  onMarginsChange?: (margins: PageMargins) => void;
  toolbarTab?: "home" | "insert" | "layout";
  fileMode?: boolean;
  showThumbRail?: boolean;
}) {
  const blocks: Block[] = useMemo(() => {
    return (content?.content as Block[]) || [];
  }, [content]);

  // 頁邊距（mm→px；A4: 297mm ≈ 1122px）
  const MM_TO_PX = 3.7795;
  const m = margins || DEFAULT_PAGE_MARGINS;
  const marginTopPx = m.top * MM_TO_PX;
  const marginBottomPx = m.bottom * MM_TO_PX;
  const marginLeftPx = m.left * MM_TO_PX;
  const marginRightPx = m.right * MM_TO_PX;

  const innerHeight = useMemo(() => {
    if (format === "a4") return Math.round(1122 - marginTopPx - marginBottomPx);
    if (format === "16:9") return Math.round(540 - marginTopPx - marginBottomPx);
    if (format === "4:3") return Math.round(600 - marginTopPx - marginBottomPx);
    return 800;
  }, [format, marginTopPx, marginBottomPx]);

  const pageHeight = useMemo(() => {
    if (format === "a4") return 1122;
    if (format === "16:9") return 540;
    if (format === "4:3") return 600;
    return 900;
  }, [format]);

  const pagesBlocks = useMemo(() => {
    return splitIntoPages(blocks, innerHeight);
  }, [blocks, innerHeight]);

  const [activePage, setActivePage] = useState(0);
  const redistributeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ pageIndex: number; blocks: Block[][] } | null>(null);

  const handlePageChange = useCallback((pageIndex: number, payload: { json: any; text: string }) => {
    const newPageBlocks = (payload.json?.content as Block[]) || [];
    const nextPages = [...pagesBlocks];
    nextPages[pageIndex] = newPageBlocks;

    const mergedBlocksImmediate = nextPages.flat();
    const mergedJsonImmediate = { type: "doc", content: mergedBlocksImmediate.length > 0 ? mergedBlocksImmediate : [{ type: "paragraph" }] };
    const mergedTextImmediate = mergedBlocksImmediate.map(getTextFromNode).join("\n\n");
    onContentChange({ json: mergedJsonImmediate, text: mergedTextImmediate });

    pendingRef.current = { pageIndex, blocks: nextPages };
    if (redistributeTimeoutRef.current) clearTimeout(redistributeTimeoutRef.current);
    redistributeTimeoutRef.current = setTimeout(() => {
      const pending = pendingRef.current;
      if (!pending) return;
      const { pageIndex: pIdx, blocks: curPages } = pending;
      const curPageBlocks = curPages[pIdx] || [];
      const curHeight = curPageBlocks.reduce((sum, b) => sum + (b.type === "pageBreak" ? 0 : estimateBlockHeight(b)), 0);
      // buffer 與 innerHeight 一致（尾頁「離底部幾公分」bug：原 150px 固定 buffer 造成
      // 內容實際可寫超過內文高度、與邊界不符）
      const buffer = 24;
      // 找最後一個「非 pageBreak」的 block（避免把 pageBreak 搬走造成結構錯亂）
      let moveIdx = -1;
      for (let i = curPageBlocks.length - 1; i >= 0; i--) {
        if (curPageBlocks[i].type !== "pageBreak") { moveIdx = i; break; }
      }
      if (curHeight > innerHeight + buffer && moveIdx >= 0) {
        const moving = curPageBlocks.splice(moveIdx, 1)[0];
        const newPages = [...curPages];
        newPages[pIdx] = curPageBlocks;
        if (pIdx + 1 < newPages.length) {
          newPages[pIdx + 1] = [moving, ...newPages[pIdx + 1]];
        } else {
          newPages.push([moving]);
        }
        const remerged = newPages.flat();
        onContentChange({ json: { type: "doc", content: remerged }, text: remerged.map(getTextFromNode).join("\n\n") });
      }
    }, 800);
  }, [pagesBlocks, innerHeight, onContentChange]);

  const [pageMenu, setPageMenu] = useState<{ x: number; y: number; idx: number } | null>(null);
  const [renamingPage, setRenamingPage] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pageMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pageMenu) return;
    const handler = (e: MouseEvent) => {
      if (pageMenuRef.current && !pageMenuRef.current.contains(e.target as Node)) setPageMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pageMenu]);

  const persistPages = useCallback((newBlocks: Block[]) => {
    const normalized = normalizePageBreaks(newBlocks);
    const finalBlocks = normalized.length > 0 ? normalized : [{ type: "paragraph" }];
    onContentChange({ json: { type: "doc", content: finalBlocks }, text: finalBlocks.map(getTextFromNode).join("\n\n") });
  }, [onContentChange]);

  const applyRename = useCallback((idx: number, title: string) => {
    const t = (title || "").trim();
    if (!t) return;
    const pageBlocks = pagesBlocks[idx] || [];
    const newBlocks = [...blocks];
    const [start, end] = findPageRange(newBlocks, pageBlocks);
    let headingPos = -1;
    for (let i = start; i <= end; i++) {
      if (newBlocks[i].type === "heading") { headingPos = i; break; }
    }
    if (headingPos !== -1) {
      newBlocks[headingPos] = { ...newBlocks[headingPos], content: [{ type: "text", text: t }] };
    } else {
      newBlocks.splice(start, 0, { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: t }] });
    }
    persistPages(newBlocks);
  }, [blocks, pagesBlocks, persistPages]);

  const handleAddPageBefore = useCallback((idx: number) => {
    const pageBlocks = pagesBlocks[idx] || [];
    const newBlocks = [...blocks];
    const [start] = findPageRange(newBlocks, pageBlocks);
    newBlocks.splice(start, 0, { type: "paragraph" }, { type: "pageBreak" });
    persistPages(newBlocks);
    setActivePage(Math.min(idx, pagesBlocks.length));
  }, [blocks, pagesBlocks, persistPages]);

  const handleAddPageAfter = useCallback((idx: number) => {
    const pageBlocks = pagesBlocks[idx] || [];
    const newBlocks = [...blocks];
    const [, end] = findPageRange(newBlocks, pageBlocks);
    newBlocks.splice(end + 1, 0, { type: "pageBreak" }, { type: "paragraph" }, { type: "pageBreak" });
    persistPages(newBlocks);
    setActivePage(Math.min(idx + 1, pagesBlocks.length));
  }, [blocks, pagesBlocks, persistPages]);

  const handleDeletePage = useCallback((idx: number) => {
    if (pagesBlocks.length <= 1) { alert("至少保留一頁"); return; }
    const pageBlocks = pagesBlocks[idx] || [];
    const newBlocks = [...blocks];
    const [start, end] = findPageRange(newBlocks, pageBlocks);
    newBlocks.splice(start, end - start + 1);
    persistPages(newBlocks);
    setActivePage(Math.min(idx, Math.max(0, pagesBlocks.length - 2)));
  }, [blocks, pagesBlocks, persistPages]);

  return (
    <div className="flex flex-1 min-h-0">
      {/* 需求3：左側分頁縮圖預覽（GoodNotes 風格） */}
      {showThumbRail && (
      <div className="w-20 shrink-0 border-r overflow-y-auto p-2 flex flex-col gap-2" style={{ borderColor: "var(--color-border)", background: "var(--color-panel-bg)" }}>
        {showThumbRail && pagesBlocks.map((pb, idx) => {
          const summary = pb.map(getTextFromNode).join(" ").trim().slice(0, 24);
          const name = firstHeadingText(pb) || "未命名";
          const pageName = `${idx + 1}/${name}`;
          return (
            <div key={idx} className="flex flex-col gap-1">
              {/* 需求1：左鍵點擊 → 編輯區捲動到該頁 */}
              <button
                onClick={() => {
                  setActivePage(idx);
                  pageRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onContextMenu={(e) => { e.preventDefault(); setPageMenu({ x: e.clientX, y: e.clientY, idx }); }}
                title={`${pageName}${summary ? " — " + summary : ""}`}
                className="rounded-md p-1.5 flex flex-col items-center gap-1 transition-all"
                style={{
                  border: "1px solid",
                  borderColor: activePage === idx ? "#3b82f6" : "var(--color-border)",
                  backgroundColor: activePage === idx ? "rgba(59,130,246,0.12)" : "var(--color-bg)",
                }}
              >
                <div className="w-full aspect-[210/297] rounded-sm" style={{ background: "white", border: "1px solid var(--color-border)", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
                <span className="text-[9px] opacity-60 truncate w-full text-center">{pageName}</span>
              </button>
              {/* 需求5：行內重新命名 */}
              {renamingPage === idx ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { applyRename(idx, renameValue); setRenamingPage(null); }
                    if (e.key === "Escape") setRenamingPage(null);
                  }}
                  onBlur={() => { applyRename(idx, renameValue); setRenamingPage(null); }}
                  className="w-full text-[10px] rounded px-1 py-0.5 outline-none"
                  style={{ border: "1px solid #3b82f6", color: "var(--color-text)", background: "var(--color-bg)" }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      )}
      {/* 縮圖右鍵選單（需求1） */}
      {pageMenu && (
        <div
          ref={pageMenuRef}
          className="rounded-xl shadow-2xl z-[10000] overflow-hidden py-1 fixed"
          style={{
            top: Math.min(pageMenu.y, window.innerHeight - 200),
            left: Math.min(pageMenu.x, window.innerWidth - 190),
            width: 180,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase opacity-60">頁面操作</div>
          <button onClick={() => { setRenameValue(firstHeadingText(pagesBlocks[pageMenu.idx] || [])); setRenamingPage(pageMenu.idx); setPageMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>✏️</span> 重新命名</button>
          <button onClick={() => { handleAddPageBefore(pageMenu.idx); setPageMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬆️</span> 在前添加頁面</button>
          <button onClick={() => { handleAddPageAfter(pageMenu.idx); setPageMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬇️</span> 在後添加頁面</button>
          <div className="border-t my-1" style={{ borderColor: "var(--color-border)" }} />
          <button onClick={() => { handleDeletePage(pageMenu.idx); setPageMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 flex items-center gap-2 text-red-600"><span>🗑️</span> 刪除頁面</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto flex flex-col items-center" style={{ background: format === "a4" ? "#f5f5f4" : "#0a0a0a", padding: "24px" }}>
      <style>{`
        .nexus-paged-content .ProseMirror {
          min-height: ${innerHeight}px !important;
        }
      `}</style>
      <div className="flex flex-col gap-6 w-full" style={{ width: format === "a4" ? "210mm" : format === "16:9" ? "960px" : format === "4:3" ? "800px" : "100%", maxWidth: "100%" }}>
        {pagesBlocks.map((pageBlocks, idx) => {
          const isAdapt = nightAdapt;
          return (
            <div
              key={idx}
              ref={(el) => { pageRefs.current[idx] = el; }}
              data-page={idx}
              className="relative bg-white rounded-sm"
              style={{
                height: `${pageHeight}px`,
                minHeight: `${pageHeight}px`,
                background: isAdapt ? "var(--color-editor-bg)" : "white",
                color: isAdapt ? "var(--color-text)" : "#1a1a1a",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              <div className="absolute top-2 right-3 text-[9px] opacity-20 select-none">第 {idx + 1} 頁 / 共 {pagesBlocks.length} 頁</div>
              <div className={`${isAdapt ? "nexus-paged-content nexus-paged-adapt" : "nexus-paged-content"}`} style={{ padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`, boxSizing: "border-box", height: "100%", overflow: "hidden" }}>
                <TiptapEditor
                  content={{ type: "doc", content: pageBlocks.length > 0 ? pageBlocks : [{ type: "paragraph" }] }}
                  onChange={(payload) => handlePageChange(idx, payload)}
                  variant="rich"
                  toolbarTarget={idx === activePage ? toolbarTarget : null}
                  showToolbar={idx === activePage && !fileMode}
                  toolbarTab={toolbarTab}
                  margins={margins}
                  onMarginsChange={onMarginsChange}
                  onFocus={() => setActivePage(idx)}
                  pageNightAdapt={nightAdapt}
                  onTogglePageNightAdapt={onToggleNightAdapt}
                />
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

````

## File: src/components/PresentationView.tsx
````
"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import type { Page, Slide, PresentationData, PresentationBlock, SlideLayout } from "../lib/types";
import { createSlide } from "../lib/presentation";
import { useLanguage } from "../lib/LanguageContext";
import ChartTypeMenu from "./ChartTypeMenu";
import ChartRenderer from "./ChartRenderer";

const LAYOUTS: { id: SlideLayout; label: string; icon: string }[] = [
  { id: "title", label: "標題", icon: "🔖" },
  { id: "title_content", label: "標題+內容", icon: "📄" },
  { id: "two_column", label: "兩欄", icon: "⬌" },
  { id: "chart", label: "圖表", icon: "📊" },
  { id: "canvas", label: "自由畫布", icon: "🎨" },
  { id: "toc", label: "目錄", icon: "📑" },
  { id: "quote", label: "引言", icon: "❝" },
];

function genId() { return `blk_${Math.random().toString(36).slice(2,9)}`; }

export default function PresentationView({
  page,
  onTitleChange,
  onUpdatePresentation,
}: {
  page: Page;
  onTitleChange: (title: string) => void;
  onUpdatePresentation: (data: PresentationData) => void;
}) {
  const data = page.presentation_data || { theme: "minimal", slides: [] } as PresentationData;
  const slides = data.slides || [];
  const [activeSlideId, setActiveSlideId] = useState<string>(slides[0]?.id || "");
  const activeSlide = useMemo(() => slides.find((s) => s.id === activeSlideId) || slides[0] || null, [slides, activeSlideId]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const updateSlides = (newSlides: Slide[]) => {
    onUpdatePresentation({ ...data, slides: newSlides });
  };

  const updateActiveSlide = (patch: Partial<Slide>) => {
    if (!activeSlide) return;
    const newSlides = slides.map((s) => (s.id === activeSlide.id ? { ...s, ...patch } : s));
    updateSlides(newSlides);
  };

  const updateBlock = (blockId: string, patch: Partial<PresentationBlock>) => {
    if (!activeSlide) return;
    const newBlocks = (activeSlide.blocks || []).map((b) => (b.id === blockId ? { ...b, ...patch } : b));
    updateActiveSlide({ blocks: newBlocks });
  };

  const handleAddSlide = (layout: SlideLayout = "title_content") => {
    const newSlide = createSlide(layout);
    const idx = slides.findIndex((s) => s.id === activeSlideId);
    const newSlides = [...slides];
    newSlides.splice(idx + 1, 0, newSlide);
    updateSlides(newSlides);
    setActiveSlideId(newSlide.id);
  };

  const handleAddTextBlock = () => {
    if (!activeSlide) return;
    const newBlock: PresentationBlock = {
      id: genId(),
      type: "text",
      x: 10 + Math.random()*20,
      y: 20 + Math.random()*30,
      w: 40,
      h: 12,
      z: (activeSlide.blocks?.length || 0) + 10,
      text: "文字區塊，雙擊編輯",
      style: { fontSize: 16 },
    };
    updateActiveSlide({ blocks: [...(activeSlide.blocks || []), newBlock] });
    setSelectedBlockId(newBlock.id);
  };

  const handleDeleteBlock = (id: string) => {
    if (!activeSlide) return;
    updateActiveSlide({ blocks: (activeSlide.blocks || []).filter((b) => b.id !== id) });
    setSelectedBlockId(null);
  };

  const handleBringFront = (id: string) => {
    if (!activeSlide) return;
    const blocks = [...(activeSlide.blocks || [])];
    const maxZ = Math.max(...blocks.map((b) => b.z), 0);
    updateBlock(id, { z: maxZ + 1 });
  };

  const handleSendBack = (id: string) => {
    if (!activeSlide) return;
    const blocks = [...(activeSlide.blocks || [])];
    const minZ = Math.min(...blocks.map((b) => b.z), 0);
    updateBlock(id, { z: minZ - 1 });
  };

  // Drag handling
  useEffect(() => {
    if (!dragState) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragState.offsetX) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragState.offsetY) / rect.height) * 100;
      updateBlock(dragState.id, { x: Math.max(0, Math.min(85, x)), y: Math.max(0, Math.min(85, y)) });
    };
    const onMouseUp = () => setDragState(null);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragState, activeSlide]);

  if (!page.presentation_data) {
    return <div className="flex-1 flex items-center justify-center">簡報資料載入中...</div>;
  }

  const sortedBlocks = [...(activeSlide?.blocks || [])].sort((a, b) => a.z - b.z);
  const selectedBlock = activeSlide?.blocks?.find((b) => b.id === selectedBlockId) || null;

  return (
    <main className="flex flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      {/* Left: Slide list */}
      <div className="w-[220px] shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
          <input value={page.title} onChange={(e) => onTitleChange(e.target.value)} placeholder="簡報標題" className="flex-1 bg-transparent font-semibold outline-none text-sm" />
          <span className="text-[10px] opacity-50 ml-2">{slides.length} 張</span>
        </div>
        <div className="p-2">
          <button onClick={() => handleAddSlide("canvas")} className="w-full rounded-md bg-zinc-800 text-white text-xs py-2 hover:bg-zinc-700">+ 新增投影片</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {slides.map((slide, idx) => (
            <div key={slide.id} onClick={() => setActiveSlideId(slide.id)} className={`group relative rounded-lg border p-2 cursor-pointer ${activeSlideId === slide.id ? "bg-white border-blue-400 shadow" : "bg-transparent hover:bg-white/60 border-transparent"}`}>
              <div className="flex items-center justify-between mb-1"><span className="text-[10px] opacity-50">{idx + 1}</span><span className="text-[10px]">{LAYOUTS.find((l) => l.id === slide.layout)?.icon}</span></div>
              <div className="text-xs font-medium truncate">{slide.title || "未命名"}</div>
              <div className="text-[10px] opacity-60 mt-1">{slide.blocks?.length || 0} 個圖層</div>
            </div>
          ))}
        </div>
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top toolbar */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b flex-wrap" style={{ borderColor: "var(--color-border)" }}>
          <button onClick={handleAddTextBlock} className="rounded px-3 py-1.5 text-xs bg-zinc-800 text-white hover:bg-zinc-700">+ 文字區塊</button>
          <button onClick={() => { if (!activeSlide) return; const b: PresentationBlock = { id: genId(), type: "chart", x: 10, y: 20, w: 45, h: 40, z: 10, chart: { type: "bar", variant: "single", orientation: "vertical", data: [{label:"A",value:30},{label:"B",value:50}] } }; updateActiveSlide({ blocks: [...(activeSlide.blocks||[]), b] }); }} className="rounded px-2.5 py-1.5 text-xs border hover:bg-zinc-100">📊 圖表</button>
          <button onClick={() => { if (!activeSlide) return; const b: PresentationBlock = { id: genId(), type: "shape", x: 20, y: 30, w: 30, h: 20, z: 5, style: { background: "#e0e7ff" } }; updateActiveSlide({ blocks: [...(activeSlide.blocks||[]), b] }); }} className="rounded px-2.5 py-1.5 text-xs border hover:bg-zinc-100">⬜ 形狀</button>
          <div className="h-4 w-px bg-zinc-300 mx-1" />
          <span className="text-xs opacity-60">版型:</span>
          {LAYOUTS.slice(0,4).map((l) => (
            <button key={l.id} onClick={() => activeSlide && updateActiveSlide({ layout: l.id })} className={`rounded px-2 py-1 text-xs border ${activeSlide?.layout === l.id ? "bg-zinc-800 text-white" : "hover:bg-zinc-100"}`}>{l.icon}</button>
          ))}
          <select value={data.theme} onChange={(e) => onUpdatePresentation({ ...data, theme: e.target.value as any })} className="ml-2 rounded border px-2 py-1 text-xs bg-transparent">
            <option value="minimal">Minimal</option><option value="academic">Academic</option><option value="business">Business</option><option value="dark">Dark</option>
          </select>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-8 flex justify-center items-start" style={{ backgroundColor: "#f5f5f4" }}>
          <div ref={canvasRef} className="relative w-full max-w-[960px] aspect-[16/9] bg-white rounded-xl shadow-xl overflow-hidden select-none" style={{ backgroundColor: data.theme === "dark" ? "#1e1e1e" : "white", color: data.theme === "dark" ? "white" : "black" }}>
            {/* Slide background */}
            <div className="absolute inset-0 p-2">
              {activeSlide?.title && <div className="text-[10px] opacity-30 absolute top-2 left-3">投影片 {slides.findIndex((s)=>s.id===activeSlideId)+1} / {slides.length} — {activeSlide.title}</div>}
            </div>

            {/* Blocks */}
            {sortedBlocks.map((block) => (
              <div
                key={block.id}
                onMouseDown={(e) => {
                  if (editingBlockId === block.id) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setDragState({ id: block.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
                  setSelectedBlockId(block.id);
                  e.stopPropagation();
                }}
                onDoubleClick={() => setEditingBlockId(block.id)}
                style={{
                  position: "absolute",
                  left: `${block.x}%`,
                  top: `${block.y}%`,
                  width: `${block.w}%`,
                  height: block.h ? `${block.h}%` : "auto",
                  zIndex: block.z,
                  background: block.style?.background || (selectedBlockId === block.id ? "rgba(59,130,246,0.08)" : "transparent"),
                  border: selectedBlockId === block.id ? "1px solid #3b82f6" : "1px solid transparent",
                  borderRadius: "4px",
                  padding: "4px",
                  cursor: dragState?.id === block.id ? "grabbing" : "grab",
                  fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : "14px",
                  color: block.style?.color || "inherit",
                  textAlign: block.style?.textAlign || "left",
                }}
                className="group"
              >
                {block.type === "text" && (
                  editingBlockId === block.id ? (
                    <textarea
                      autoFocus
                      value={block.text || ""}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      onBlur={() => setEditingBlockId(null)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) setEditingBlockId(null); }}
                      className="w-full h-full bg-transparent outline-none resize-none"
                      placeholder="輸入文字..."
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words pointer-events-none">{block.text || "文字區塊"}</div>
                  )
                )}
                {block.type === "chart" && block.chart && (
                  <div className="w-full h-full overflow-hidden">
                    <ChartRenderer chart={block.chart} width={200} height={100} />
                  </div>
                )}
                {block.type === "shape" && <div className="w-full h-full" style={{ background: block.style?.background || "#e0e7ff" }} />}
                {block.type === "diagram" && <div className="text-[10px] font-mono p-1 bg-zinc-100 rounded">{block.diagramCode || "Mermaid"}</div>}

                {selectedBlockId === block.id && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100">×</button>
                )}
              </div>
            ))}

            {/* Canvas empty hint */}
            {(!activeSlide?.blocks || activeSlide.blocks.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-sm opacity-30 text-center">點擊「+ 文字區塊」開始<br/>像 Canva 一樣拖曳移動</div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Notes (user liked this concept) */}
        <div className="shrink-0 border-t p-3 flex gap-2 items-start" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
          <span className="text-xs opacity-60 mt-1">📝 備註</span>
          <input value={activeSlide?.notes || ""} onChange={(e) => activeSlide && updateActiveSlide({ notes: e.target.value })} placeholder="講者備註，觀眾看不到..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>
      </div>

      {/* Right: Layers & Properties */}
      <div className="w-[260px] shrink-0 border-l flex flex-col overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
        <div className="p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="text-xs font-semibold opacity-60 uppercase">圖層</div>
          <div className="text-[10px] opacity-40 mt-1">拖曳改變圖層關係，像 Canva</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {[...(activeSlide?.blocks || [])].sort((a,b) => b.z - a.z).map((block) => (
            <div key={block.id} onClick={() => setSelectedBlockId(block.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs ${selectedBlockId === block.id ? "bg-white border border-blue-300 shadow-sm" : "hover:bg-white/60 border border-transparent"}`}>
              <span>{block.type === "text" ? "📝" : block.type === "chart" ? "📊" : block.type === "image" ? "🖼️" : "⬜"}</span>
              <span className="flex-1 truncate">{block.text?.slice(0,20) || block.type}</span>
              <span className="text-[9px] opacity-40">z{block.z}</span>
            </div>
          ))}
          {(!activeSlide?.blocks || activeSlide.blocks.length === 0) && <div className="text-xs opacity-40 p-2">尚無圖層，點擊「+ 文字區塊」</div>}
        </div>
        {selectedBlock && (
          <div className="p-3 border-t space-y-3 overflow-y-auto" style={{ borderColor: "var(--color-border)" }}>
            <div className="text-xs font-semibold opacity-60 uppercase">屬性</div>
            <div className="flex gap-1">
              <button onClick={() => handleBringFront(selectedBlock.id)} className="flex-1 text-[11px] border rounded px-2 py-1 hover:bg-white">置頂</button>
              <button onClick={() => handleSendBack(selectedBlock.id)} className="flex-1 text-[11px] border rounded px-2 py-1 hover:bg-white">置底</button>
              <button onClick={() => handleDeleteBlock(selectedBlock.id)} className="flex-1 text-[11px] border rounded px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100">刪除</button>
            </div>
            {selectedBlock.type === "text" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => updateBlock(selectedBlock.id, { style: { ...selectedBlock.style, bold: !selectedBlock.style?.bold } })} className={`px-2 py-1 rounded border text-xs ${selectedBlock.style?.bold ? "bg-zinc-800 text-white" : "bg-white"}`}>B</button>
                  <select value={selectedBlock.style?.textAlign || "left"} onChange={(e) => updateBlock(selectedBlock.id, { style: { ...selectedBlock.style, textAlign: e.target.value as any } })} className="flex-1 border rounded px-1 py-1 text-xs">
                    <option value="left">靠左</option><option value="center">置中</option><option value="right">靠右</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] opacity-60">字級</span>
                  <input type="range" min={10} max={48} value={selectedBlock.style?.fontSize || 16} onChange={(e) => updateBlock(selectedBlock.id, { style: { ...selectedBlock.style, fontSize: Number(e.target.value) } })} className="flex-1" />
                  <span className="text-[10px] w-6">{selectedBlock.style?.fontSize || 16}</span>
                </div>
                <button onClick={() => setEditingBlockId(selectedBlock.id)} className="w-full border rounded px-2 py-1.5 text-xs hover:bg-white">✏️ 編輯文字（雙擊也可）</button>
              </div>
            )}
            {selectedBlock.type === "chart" && (
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] opacity-60 mb-1">圖表類型（點擊開合）</div>
                  <ChartTypeMenu chart={selectedBlock.chart} onChange={(newChart) => updateBlock(selectedBlock.id, { chart: newChart })} />
                </div>
                <div>
                  <div className="text-[11px] opacity-60 mb-1">即時預覽</div>
                  <div className="border rounded bg-white p-2">
                    {selectedBlock.chart ? <ChartRenderer chart={selectedBlock.chart} width={220} height={120} /> : <div className="text-xs opacity-40">無圖表</div>}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60 mb-1">圖表資料（支援多數列 series）</div>
                  {(selectedBlock.chart?.data || []).map((d, i) => (
                    <div key={i} className="flex gap-1 mb-1">
                      <input value={d.label} onChange={(e) => { const newData = [...(selectedBlock.chart?.data||[])]; newData[i] = { ...newData[i], label: e.target.value }; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any }); }} className="flex-1 border rounded px-1 py-0.5 text-[11px]" placeholder="標籤" />
                      <input value={d.series || ""} onChange={(e) => { const newData = [...(selectedBlock.chart?.data||[])]; newData[i] = { ...newData[i], series: e.target.value }; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any }); }} className="w-12 border rounded px-1 py-0.5 text-[10px]" placeholder="系列" />
                      <input type="number" value={d.value} onChange={(e) => { const newData = [...(selectedBlock.chart?.data||[])]; newData[i] = { ...newData[i], value: Number(e.target.value)}; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any }); }} className="w-14 border rounded px-1 py-0.5 text-[11px]" />
                      <button onClick={() => { const newData = (selectedBlock.chart?.data||[]).filter((_, idx) => idx !== i); updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any }); }} className="text-[10px] px-1">×</button>
                    </div>
                  ))}
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => { const newData = [...(selectedBlock.chart?.data||[]), { label: "新", value: 10 }]; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any }); }} className="flex-1 text-[11px] border rounded py-1 hover:bg-white">+ 單筆</button>
                    <button onClick={() => { const newData = [...(selectedBlock.chart?.data||[]), { label: `類別${(selectedBlock.chart?.data.length||0)+1}`, value: 10, series: "A" }, { label: `類別${(selectedBlock.chart?.data.length||0)+1}`, value: 20, series: "B" }]; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any, variant: "grouped" } as any); }} className="flex-1 text-[11px] border rounded py-1 hover:bg-white">+ 群組範例</button>
                  </div>
                  <div className="text-[10px] opacity-50 mt-2">群組/堆疊需填系列欄位，例如 Q1 A 10，Q1 B 20 即為群組長條</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60 mb-1">甘特圖專用（start/end）</div>
                  <div className="text-[10px] opacity-50">若類型為甘特圖，請用 start/end，例如 任務A start 0 end 5</div>
                  {(selectedBlock.chart?.data || []).slice(0,3).map((d,i)=>(
                    <div key={i} className="flex gap-1 mb-1">
                      <input value={d.label} readOnly className="flex-1 border rounded px-1 py-0.5 text-[10px] bg-zinc-100" />
                      <input type="number" value={(d as any).start ?? 0} onChange={(e)=>{ const nd=[...(selectedBlock.chart?.data||[])]; const curr=nd[i] as any; nd[i]={ label: curr.label, value: curr.value, start: Number(e.target.value), end: curr.end || 5, series: curr.series } as any; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: nd } as any }); }} className="w-10 border rounded px-1 py-0.5 text-[10px]" placeholder="start" />
                      <input type="number" value={(d as any).end ?? d.value} onChange={(e)=>{ const nd=[...(selectedBlock.chart?.data||[])]; const curr=nd[i] as any; nd[i]={ label: curr.label, value: curr.value, start: curr.start || 0, end: Number(e.target.value), series: curr.series } as any; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: nd } as any }); }} className="w-10 border rounded px-1 py-0.5 text-[10px]" placeholder="end" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
````

## File: src/components/QuickNotesView.tsx
````
"use client";
import { useState, useMemo } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export default function QuickNotesView({
  pages,
  onCreate,
  onUpdate,
  onDelete,
  onSelectPage,
}: {
  pages: Page[];
  onCreate: (text: string) => void;
  onUpdate: (id: string, patch: Partial<Page>) => void;
  onDelete: (id: string) => void;
  onSelectPage: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [input, setInput] = useState("");

  const quickNotes = useMemo(() => pages.filter((p) => (p.kind as any) === "quick_note" || p.folder === "QuickNotes").sort((a, b) => b.updated_at - a.updated_at), [pages]);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    onCreate(text);
    setInput("");
  };

  return (
    <main className="flex flex-col flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="mx-auto w-full max-w-[900px] p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>📝 {t("quickNote.title")}</h1>
        <p className="text-xs opacity-60 mb-6">類似 Google 記事本，快速記錄靈感，獨立於項目</p>

        <div className="mb-6 rounded-xl border shadow-sm p-3 flex gap-2" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder={t("quickNote.placeholder")} className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--color-text)" }} />
          <button onClick={handleAdd} className="rounded-md px-4 py-1.5 text-sm bg-zinc-800 text-white hover:bg-zinc-700">新增</button>
        </div>

        {quickNotes.length === 0 ? (
          <div className="text-center py-16 opacity-40 text-sm">{t("quickNote.empty")}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickNotes.map((note) => (
              <div key={note.id} className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-all group" style={{ backgroundColor: note.color || "var(--color-bg)", borderColor: "var(--color-border)" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm truncate flex-1 cursor-pointer" onClick={() => onSelectPage(note.id)}>{note.title || "未命名"}</h3>
                  <button onClick={() => onDelete(note.id)} className="opacity-0 group-hover:opacity-100 text-xs hover:text-red-600">×</button>
                </div>
                <p className="text-xs opacity-70 line-clamp-4 whitespace-pre-wrap cursor-pointer" onClick={() => onSelectPage(note.id)}>{note.content_text || ""}</p>
                <div className="flex gap-1 mt-3">
                  {["#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff"].map((c) => (
                    <button key={c} onClick={() => onUpdate(note.id, { color: c })} className="w-5 h-5 rounded-full border" style={{ backgroundColor: c, borderColor: note.color === c ? "#000" : "var(--color-border)" }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
````

## File: src/components/ResizablePanel.tsx
````
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ResizablePanel({ side, defaultWidth, minWidth, maxWidth, collapsedWidth = 56, isCollapsed, children }: {
  side: "left" | "right"; defaultWidth: number; minWidth: number; maxWidth: number; collapsedWidth?: number; isCollapsed: boolean; children: React.ReactNode;
}) {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (isCollapsed) return;
    event.preventDefault();
    dragStateRef.current = { startX: event.clientX, startWidth: width };
    setIsDragging(true);
  }, [width, isCollapsed]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current) return;
      const delta = event.clientX - dragStateRef.current.startX;
      const directionalDelta = side === "left" ? delta : -delta;
      setWidth(Math.min(maxWidth, Math.max(minWidth, dragStateRef.current.startWidth + directionalDelta)));
    };
    const handleMouseUp = () => { setIsDragging(false); dragStateRef.current = null; };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
  }, [isDragging, side, minWidth, maxWidth]);

  const effectiveWidth = isCollapsed ? collapsedWidth : width;

  return (
    <div className="relative flex shrink-0 transition-[width] duration-150" style={{ width: `${effectiveWidth}px`, minWidth: `${effectiveWidth}px` }}>
      {!isCollapsed && side === "right" && (
        <div onMouseDown={handleMouseDown} className="absolute left-0 top-0 bottom-0 w-1.5 -translate-x-0.5 cursor-col-resize z-10 hover:bg-blue-400/40 transition-colors"
          style={{ backgroundColor: isDragging ? "rgba(37, 99, 235, 0.35)" : "transparent" }} />
      )}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">{children}</div>
      {!isCollapsed && side === "left" && (
        <div onMouseDown={handleMouseDown} className="absolute right-0 top-0 bottom-0 w-1.5 translate-x-0.5 cursor-col-resize z-10 hover:bg-blue-400/40 transition-colors"
          style={{ backgroundColor: isDragging ? "rgba(37, 99, 235, 0.35)" : "transparent" }} />
      )}
    </div>
  );
}
````

## File: src/components/RightPanel.tsx
````
"use client";
import { useMemo } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export default function RightPanel({
  page,
  pages,
  isCollapsed,
  onToggleCollapse,
  onSelectPageTitle,
}: {
  page: Page | null;
  pages: Page[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectPageTitle: (title: string) => void;
}) {
  const { t } = useLanguage();

  const backlinks = useMemo(() => {
    if (!page || !page.title.trim()) return [];
    const currentTitle = page.title.trim().toLowerCase();
    return pages.filter((p) => {
      if (p.id === page.id) return false;
      return (p.links || []).some((link) => link.toLowerCase() === currentTitle);
    });
  }, [page, pages]);

  const outgoingLinks = page?.links || [];

  if (isCollapsed) {
    return (
      <aside className="flex flex-col items-center pt-3.5 border select-none transition-all rounded-2xl overflow-hidden w-full h-full" style={{ backgroundColor: "var(--color-panel-bg)", borderColor: "var(--color-border)" }}>
        <button onClick={onToggleCollapse} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-200 transition-all text-sm" style={{ color: "var(--color-text)" }} title={t("rightPanel.expand")}>«</button>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col border select-none transition-all rounded-2xl overflow-hidden w-full h-full" style={{ backgroundColor: "var(--color-panel-bg)", borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between px-4 py-3.5 border-b text-xs font-semibold tracking-wider opacity-60 uppercase" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>
        <span>{t("rightPanel.relations")}</span>
        <button onClick={onToggleCollapse} className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-zinc-200 transition-all normal-case" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} title={t("rightPanel.collapse")}>»</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 text-sm">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("rightPanel.backlinks")} ({backlinks.length})</div>
          {backlinks.length === 0 ? (
            <div className="text-xs opacity-40 pl-1 py-1" style={{ color: "var(--color-text)" }}>{t("rightPanel.backlinksEmpty")}</div>
          ) : (
            <div className="space-y-1">
              {backlinks.map((p) => (
                <div key={p.id} onClick={() => onSelectPageTitle(p.title)} className="px-2.5 py-1.5 rounded bg-zinc-200/50 hover:bg-blue-100 hover:text-blue-700 cursor-pointer transition-colors truncate text-sm" title={t("rightPanel.goTo", { title: p.title })}>← {p.title || t("common.untitled")}</div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("rightPanel.outgoing")} ({outgoingLinks.length})</div>
          {outgoingLinks.length === 0 ? (
            <div className="text-xs opacity-40 pl-1 py-1" style={{ color: "var(--color-text)" }}>{t("rightPanel.outgoingEmpty")}</div>
          ) : (
            <div className="space-y-1">
              {outgoingLinks.map((linkTitle) => {
                const exists = pages.some((p) => p.title.trim().toLowerCase() === linkTitle.toLowerCase());
                return (
                  <div key={linkTitle} onClick={() => onSelectPageTitle(linkTitle)} className={`px-2.5 py-1.5 rounded cursor-pointer transition-colors truncate text-sm flex items-center justify-between ${exists ? "bg-zinc-200/50 hover:bg-blue-100 hover:text-blue-700" : "bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100"}`} title={exists ? t("rightPanel.goTo", { title: linkTitle }) : t("rightPanel.notCreatedTooltip", { title: linkTitle })}>
                    <span>{exists ? "→" : "✚"} {linkTitle}</span>
                    {!exists && <span className="text-[10px] bg-amber-200 text-amber-900 px-1 rounded">{t("rightPanel.notCreatedBadge")}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
````

## File: src/components/Sidebar.tsx
````
"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import PageItemMenu, { type PageMenuItem } from "./PageItemMenu";
import AccountSettingsRow from "./AccountSettingsRow";
import type { SyncState } from "../lib/syncEngine";

function getPageIcon(page: Page): string {
  if (page.kind === "study_set") return "🗂️";
  if (page.kind === "document") return "📄";
  if (page.kind === "presentation") return "📊";
  if (page.primary_attachment_id) return "📑";
  return "📝";
}

export type SortMode = "updated" | "custom";

type CreateItemType = "note" | "document" | "study_set" | "folder" | "presentation";

type DropPosition = "above" | "below" | "child";

type SidebarProps = {
  pages: Page[];
  activePageId: string | null;
  selectedTag: string | null;
  isTrashMode: boolean;
  isHomeMode: boolean;
  isQuickNoteMode?: boolean;
  isTodoMode?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectTag: (tag: string | null) => void;
  onSelectPage: (id: string) => void;
  onImportPdf: () => void;
  onImportMarkdown: () => void;
  onShowHome: () => void;
  onShowNotes: () => void;
  onShowTrash: () => void;
  onShowQuickNotes?: () => void;
  onShowTodoList?: () => void;
  onDeletePage: (id: string) => void;
  onRestorePage: (id: string) => void;
  onPermanentDeletePage: (id: string) => void;
  onDuplicatePage: (id: string) => void;
  onBulkDeletePages: (ids: string[]) => void;
  onBulkRestorePages: (ids: string[]) => void;
  onBulkPermanentDeletePages: (ids: string[]) => void;
  onOpenCommandPalette: () => void;
  onToggleFavorite: (id: string) => void;
  onRenamePage: (id: string, title: string) => void;
  onExportPageMarkdown: (id: string) => void;
  onExportPageAsPdf: (id: string) => void;
  onExportPageAsNexusJson: (id: string) => void;
  onAddSubPage: (parentId: string, kind?: string) => void;
  onMovePage?: (draggedId: string, targetId: string, position: DropPosition) => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  onReorderPages: (orderedIds: string[]) => void;
  pendingRenameId: string | null;
  onClearPendingRename: () => void;
  onCancelNewPage: (id: string) => void;
  onCreateItem: (type: CreateItemType) => void;
  syncState?: SyncState;
  onOpenInSplit?: (id: string) => void;
};

export default function Sidebar({
  pages,
  activePageId,
  selectedTag,
  isTrashMode,
  isHomeMode,
  isCollapsed,
  onToggleCollapse,
  onSelectTag,
  onSelectPage,
  onImportPdf,
  onImportMarkdown,
  onShowHome,
  onShowNotes,
  onShowTrash,
  onShowQuickNotes,
  onShowTodoList,
  isQuickNoteMode,
  isTodoMode,
  onDeletePage,
  onRestorePage,
  onPermanentDeletePage,
  onDuplicatePage,
  onBulkDeletePages,
  onBulkRestorePages,
  onBulkPermanentDeletePages,
  onOpenCommandPalette,
  onToggleFavorite,
  onRenamePage,
  onExportPageMarkdown,
  onExportPageAsPdf,
  onExportPageAsNexusJson,
  onAddSubPage,
  onMovePage,
  theme,
  onThemeChange,
  onExportBackup,
  onImportBackup,
  sortMode,
  onSortModeChange,
  pendingRenameId,
  onClearPendingRename,
  onCancelNewPage,
  onCreateItem,
  syncState,
  onOpenInSplit,
}: SidebarProps) {
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<DropPosition>("below");
  const [subPageMenuId, setSubPageMenuId] = useState<string | null>(null);
  const [groupByType, setGroupByType] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const subPageMenuRef = useRef<HTMLDivElement>(null);
  const newlyCreatedRef = useRef<Set<string>>(new Set());
  const lastClickTimeRef = useRef<number>(0);
  const lastClickIdRef = useRef<string | null>(null);

  const createLabel = (key: string) => t(key);

  useEffect(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, [isTrashMode]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(target)) setShowSortMenu(false);
      if (showCreateMenu && createMenuRef.current && !createMenuRef.current.contains(target)) {
        setShowCreateMenu(false);
      }
      if (subPageMenuId && subPageMenuRef.current && !subPageMenuRef.current.contains(target)) setSubPageMenuId(null);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortMenu, showCreateMenu, subPageMenuId]);

  useEffect(() => {
    if (!pendingRenameId) return;
    const page = pages.find((p) => p.id === pendingRenameId);
    if (page) {
      newlyCreatedRef.current.add(pendingRenameId);
      setRenamingId(pendingRenameId);
      setRenameValue("");
    }
    onClearPendingRename();
  }, [pendingRenameId, pages, onClearPendingRename]);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startRename = (page: Page) => {
    setRenamingId(page.id);
    setRenameValue(page.title || "");
  };

  const commitRename = (id: string) => {
    const trimmed = renameValue.trim();
    // 2026-08-04：未命名的新建文件不刪除，直接叫「未命名」
    onRenamePage(id, trimmed || t("common.untitled"));
    newlyCreatedRef.current.delete(id);
    setRenamingId(null);
  };


  const filteredPages = pages.filter((page) => {
    const query = searchQuery.trim().toLowerCase();
    const matchQuery = !query || (page.title || "").toLowerCase().includes(query) || (page.content_text || "").toLowerCase().includes(query);
    const matchTag = !selectedTag || (page.tags || []).includes(selectedTag);
    // Projects view (default) excludes quick_note and todo, which are independent per requirement 8
    if (isQuickNoteMode) return (page.kind as any) === "quick_note" && matchQuery && matchTag;
    if (isTodoMode) return (page.kind as any) === "todo" && matchQuery && matchTag;
    // In trash/home/projects modes, exclude quick_note and todo from projects list
    if ((page.kind as any) === "quick_note" || (page.kind as any) === "todo") return false;
    return matchQuery && matchTag;
  });

  const topLevelPages = filteredPages.filter((page) => !page.parent_id);

  const childMap = useMemo(() => {
    const map = new Map<string, Page[]>();
    filteredPages.forEach((page) => {
      if (!page.parent_id) return;
      const children = map.get(page.parent_id) || [];
      children.push(page);
      map.set(page.parent_id, children);
    });
    return map;
  }, [filteredPages]);

  const sortedTopLevel = useMemo(() => {
    const copy = [...topLevelPages];
    if (sortMode === "custom") copy.sort((a, b) => (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity));
    return copy;
  }, [topLevelPages, sortMode]);

  const { folderedGroups, unfoldered } = useMemo(() => {
    const foldered: { name: string; pages: Page[] }[] = [];
    const noFolder: Page[] = [];
    const folderMap = new Map<string, Page[]>();

    sortedTopLevel.forEach((page) => {
      const folder = page.folder?.trim();
      if (!folder) {
        noFolder.push(page);
        return;
      }
      if (!folderMap.has(folder)) {
        folderMap.set(folder, []);
        foldered.push({ name: folder, pages: folderMap.get(folder)! });
      }
      folderMap.get(folder)!.push(page);
    });

    return { folderedGroups: foldered, unfoldered: noFolder };
  }, [sortedTopLevel]);

  const handleDragStart = (event: DragEvent, pageId: string) => {
    event.dataTransfer.setData("text/plain", pageId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: DragEvent, pageId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverId(pageId);

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const relY = (event.clientY - rect.top) / rect.height;
    if (relY < 0.3) setDragOverPosition("above");
    else if (relY > 0.7) setDragOverPosition("below");
    else setDragOverPosition("child");
  };

  const handleDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData("text/plain");
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;
    onMovePage?.(draggedId, targetId, dragOverPosition);
  };

  const renderSubPageTypeMenu = (page: Page) => {
    if (subPageMenuId !== page.id) return null;
    const kind = page.kind || "note";
    if (kind === "presentation") return null;
    const options = kind === "document"
      ? [{ k: "document", icon: "📄", label: "文檔" }]
      : kind === "study_set"
        ? [{ k: "study_set", icon: "🗂️", label: "學習集" }]
        : [{ k: "note", icon: "📝", label: "筆記" }];
    return (
      <div ref={subPageMenuRef} className="absolute right-0 top-full mt-1 w-40 rounded-lg overflow-hidden shadow-xl z-40" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        {options.map((opt) => (
          <button key={opt.k} onClick={() => { onAddSubPage(page.id, opt.k); setSubPageMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>{opt.icon}</span> {opt.label}</button>
        ))}
      </div>
    );
  };


  const renderPageItem = (page: Page, depth = 0): ReactNode => {
    const isActive = !isTrashMode && activePageId === page.id;
    const isChecked = selectedIds.has(page.id);
    const isRenaming = renamingId === page.id;
    const children = childMap.get(page.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(page.id);
    const canAddSubPage = !isTrashMode && (page.kind || "note") !== "presentation" && depth < 2;
    const isDragTarget = dragOverId === page.id;

    const menuItems: PageMenuItem[] = [
      page.is_favorite
        ? { id: "unfavorite", icon: "📄", label: t("sidebar.page.removeFavorite"), onClick: () => onToggleFavorite(page.id) }
        : { id: "favorite", icon: "📄", label: t("sidebar.page.addFavorite"), onClick: () => onToggleFavorite(page.id) },
      { id: "rename", icon: "📄", label: t("sidebar.page.rename"), onClick: () => startRename(page) },
      { id: "copy", icon: "📋", label: t("sidebar.page.copy"), onClick: () => onDuplicatePage(page.id) },
    ];

    if (page.kind === "document") {
      menuItems.push({ id: "export-md", icon: "?", label: t("sidebar.page.exportMarkdown"), onClick: () => onExportPageMarkdown(page.id) });
    } else {
      menuItems.push(
        { id: "export-pdf", icon: "📄", label: t("sidebar.page.exportPdf"), onClick: () => onExportPageAsPdf(page.id) },
        { id: "export-nexus", icon: "📄", label: t("sidebar.page.exportNexusJson"), onClick: () => onExportPageAsNexusJson(page.id) },
      );
    }

    menuItems.push({
      id: "delete",
      icon: "📄",
      label: t("sidebar.page.moveToTrash"),
      danger: true,
      onClick: () => {
        if (confirm(t("sidebar.page.confirmDeleteOne", { title: page.title || t("common.untitled") }))) onDeletePage(page.id);
      },
    });

    return (
      <div key={page.id}>
        <div
          draggable={!isTrashMode}
          onDragStart={(event) => handleDragStart(event, page.id)}
          onDragOver={(event) => handleDragOver(event, page.id)}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(event) => handleDrop(event, page.id)}
          onClick={() => {
            if (isRenaming) return;
            if (isSelectMode) {
              toggleSelectOne(page.id);
              return;
            }
            if (!isTrashMode) {
              const now = Date.now();
              if (lastClickIdRef.current === page.id && now - lastClickTimeRef.current < 350) {
                // 雙擊重新命名（依使用者要求改回）
                startRename(page);
                lastClickIdRef.current = null;
                lastClickTimeRef.current = 0;
              } else {
                // UX批次（需求1）：單擊進入頁面；已在此頁面時才開合子頁
                if (isActive && hasChildren) {
                  toggleExpand(page.id);
                }
                onSelectPage(page.id);
                lastClickIdRef.current = page.id;
                lastClickTimeRef.current = now;
              }
            }
          }}
          className={`group relative flex items-center justify-between rounded-md text-sm transition-all ${
            isDragTarget && dragOverPosition === "child" ? "bg-blue-100/60 ring-1 ring-blue-300" : ""
          } ${isTrashMode ? "cursor-default opacity-80" : isActive ? "cursor-pointer font-medium" : "cursor-pointer hover:bg-zinc-200/50 opacity-80 hover:opacity-100"} ${
            !isTrashMode ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          style={{
            paddingLeft: `${8 + depth * 16}px`,
            paddingRight: "6px",
            paddingTop: "4px",
            paddingBottom: "4px",
            backgroundColor: isChecked ? "rgba(37, 99, 235, 0.12)" : isActive && !(isDragTarget && dragOverPosition === "child") ? "var(--color-border)" : undefined,
            color: isActive ? "var(--color-text)" : "var(--color-sidebar-text)",
            borderTop: isDragTarget && dragOverPosition === "above" ? "2px solid #3b82f6" : undefined,
            borderBottom: isDragTarget && dragOverPosition === "below" ? "2px solid #3b82f6" : undefined,
          }}
        >
          {!isTrashMode && <span className="mr-0.5 w-5 text-center text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0 select-none"></span>}

          {isSelectMode && <input type="checkbox" checked={isChecked} onChange={() => toggleSelectOne(page.id)} onClick={(event) => event.stopPropagation()} className="mr-1.5 shrink-0" />}

          {hasChildren && !isTrashMode ? (
            <button
              onClick={(event) => { event.stopPropagation(); toggleExpand(page.id); }}
              className="mr-0.5 w-6 h-6 flex items-center justify-center text-[11px] rounded hover:bg-zinc-300/60 opacity-60 hover:opacity-100 transition-all shrink-0"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          ) : !isTrashMode ? <span className="mr-0.5 w-6 shrink-0" /> : null}

          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              autoFocus
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRename(page.id);
                if (event.key === "Escape") setRenamingId(null);
              }}
              onBlur={() => commitRename(page.id)}
              placeholder={t("sidebar.page.renamePlaceholder")}
              className="flex-1 px-1 bg-transparent outline-none border-b border-blue-400 text-sm"
              style={{ color: "var(--color-text)" }}
            />
          ) : (
            <span className="truncate flex-1 px-0.5 flex items-center gap-1">
              <span className="shrink-0 text-sm">{getPageIcon(page)}</span>
              {page.is_favorite && <span className="shrink-0 text-xs"></span>}
              <span className="truncate">{page.title || t("common.untitled")}</span>
            </span>
          )}

          {isSelectMode || isRenaming ? null : isTrashMode ? (
            <div className="flex shrink-0 items-center gap-0.5">
              <button className="opacity-100 px-2 py-1 hover:bg-zinc-300 rounded-md text-xs transition-all text-zinc-500 hover:text-green-700" onClick={(event) => { event.stopPropagation(); onRestorePage(page.id); }} title={t("sidebar.page.restoreTitle")}>
                {t("sidebar.page.restore")}
              </button>
              <button
                className="opacity-100 px-2 py-1 hover:bg-red-100 rounded-md text-xs transition-all text-zinc-500 hover:text-red-700"
                onClick={(event) => {
                  event.stopPropagation();
                  if (confirm(t("sidebar.page.confirmPermanentDeleteOne", { title: page.title || t("common.untitled") }))) onPermanentDeletePage(page.id);
                }}
                title={t("sidebar.page.deleteTitle")}
              >
                {t("sidebar.page.delete")}
              </button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center opacity-0 transition-all group-hover:opacity-100 gap-0.5" onClick={(event) => event.stopPropagation()}>
              {canAddSubPage && (
                <div className="relative" ref={subPageMenuId === page.id ? subPageMenuRef : undefined}>
                  <button onClick={() => setSubPageMenuId(subPageMenuId === page.id ? null : page.id)} className="flex items-center justify-center w-7 h-7 hover:bg-zinc-300 rounded-md text-sm transition-all text-zinc-500 hover:text-zinc-800" title={t("sidebar.page.addSubPage")}>
                    +
                  </button>
                  {renderSubPageTypeMenu(page)}
                </div>
              )}
              <PageItemMenu items={menuItems} title={t("sidebar.page.menuTitle")} />
            </div>
          )}
        </div>

        {isExpanded && hasChildren && children.map((child) => renderPageItem(child, depth + 1))}
      </div>
    );
  };

  const renderCreateMenu = () => (
    <div className="absolute left-0 top-full mt-1 w-60 rounded-xl overflow-hidden shadow-2xl z-30" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
      <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase select-none">新建</div>
      <button onClick={() => { onCreateItem("document"); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📄</span><span>{t("sidebar.create.document")}</span></button>
      <button onClick={() => { onCreateItem("note"); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📝</span><span>{t("sidebar.create.note")}</span></button>
      <button onClick={() => { onCreateItem("study_set"); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>🗂️</span><span>{t("sidebar.create.studySet")}</span></button>
      <button onClick={() => { onCreateItem("presentation" as any); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📊</span><span>簡報</span></button>
      <button onClick={() => { onCreateItem("folder"); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📁</span><span>{t("sidebar.create.folder")}</span></button>
      <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
      <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase select-none">匯入</div>
      <button onClick={() => { onImportPdf(); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📥</span><span>{t("sidebar.import.pdf")}</span></button>
      <button onClick={() => { onImportMarkdown(); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📄</span><span>{t("sidebar.import.markdown")}</span></button>
    </div>
  );


  const renderPageSections = () => {
    if (sortedTopLevel.length === 0) {
      return <div className="text-sm text-center py-8 opacity-40 select-none" style={{ color: "var(--color-text)" }}>{isTrashMode ? t("sidebar.empty.trash") : t("sidebar.empty.notes")}</div>;
    }

    if (groupByType) {
      const kindOrder = ["note", "document", "study_set"];
      const kindLabels: Record<string, string> = {
        note: t("sidebar.sort.group.note"),
        document: t("sidebar.sort.group.document"),
        study_set: t("sidebar.sort.group.studySet"),
      };
      const kindIcons: Record<string, string> = { note: "??", document: "??", study_set: "??" };
      const allFlatPages = [...unfoldered, ...folderedGroups.flatMap((group) => group.pages)];

      return kindOrder.map((kind) => {
        const groupPages = allFlatPages.filter((page) => (page.kind || "note") === kind);
        if (groupPages.length === 0) return null;
        return (
          <div key={kind} className="space-y-0.5">
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold tracking-wider text-zinc-400 uppercase select-none">
              <span>{kindIcons[kind]}</span><span>{kindLabels[kind]}</span><span className="opacity-50">({groupPages.length})</span>
            </div>
            {groupPages.map((page) => renderPageItem(page, 0))}
          </div>
        );
      });
    }

    return (
      <>
        {unfoldered.map((page) => renderPageItem(page, 0))}
        {folderedGroups.map(({ name, pages: folderPages }) => (
          <div key={name} className="space-y-0.5">
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold tracking-wider text-zinc-400 uppercase select-none">
              <span></span><span>{name}</span>
            </div>
            {folderPages.map((page) => renderPageItem(page, 0))}
          </div>
        ))}
      </>
    );
  };

  if (isCollapsed) {
    return (
      <aside className="flex flex-col items-center pt-3.5 gap-3 border select-none transition-all rounded-2xl overflow-hidden w-full h-full" style={{ backgroundColor: "var(--color-sidebar-bg)", borderColor: "var(--color-border)" }}>
        <button onClick={onToggleCollapse} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-200 transition-all text-sm" style={{ color: "var(--color-text)" }} title={t("sidebar.expand")}>
          ??        </button>
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
      </aside>
    );
  }

  return (
    <aside className="flex flex-col border select-none transition-all rounded-2xl overflow-hidden w-full h-full" style={{ backgroundColor: "var(--color-sidebar-bg)", borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <button onClick={onShowHome} className="flex items-center gap-2 rounded-md px-1 py-1 -ml-1 transition-all hover:bg-zinc-200" title={t("sidebar.logoGoHome")}>
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
          <span className="text-base font-semibold tracking-wide" style={{ color: "var(--color-text)" }}>Nexus</span>
        </button>
        <button onClick={onToggleCollapse} className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-zinc-200 transition-all text-sm" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} title={t("sidebar.collapse")}>
          ??        </button>
      </div>

      <div className="p-2.5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <button onClick={onShowHome} className="w-full rounded-md px-3 py-2 text-sm font-medium text-left transition-all hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: isHomeMode ? "var(--color-border)" : "transparent" }}>
          🏠 {t("sidebar.nav.home")}
        </button>
      </div>

      {/* 垃圾桶（獨立按鈕，位於首頁之下） */}
      <div className="px-2.5 pt-2.5">
        <button onClick={() => { if (isTrashMode) onShowNotes(); else onShowTrash(); }} className="w-full rounded-md px-3 py-2 text-sm font-medium text-left transition-all hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: isTrashMode ? "var(--color-border)" : "transparent" }}>
          🗑️ {t("sidebar.nav.trash")}
        </button>
      </div>

      {/* UX批次（需求6）：兩個類別 — 隨手記/ToDo；選中後展開顯示名稱並保持 */}
      <div className="p-2.5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-stretch gap-1">
          {[
            { id: "quicknotes", icon: "📝", label: t("sidebar.nav.quickNote"), active: !!isQuickNoteMode, onClick: () => onShowQuickNotes?.() },
            { id: "todo", icon: "✅", label: t("sidebar.nav.todoList"), active: !!isTodoMode, onClick: () => onShowTodoList?.() },
            { id: "projects", icon: "📚", label: t("sidebar.nav.notes"), active: !isTrashMode && !isHomeMode && !isQuickNoteMode && !isTodoMode, onClick: onShowNotes },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={cat.onClick}
              className="flex items-center justify-center gap-1.5 rounded-md h-10 text-sm font-medium transition-all hover:bg-zinc-200"
              style={{
                flex: cat.active ? "2.4" : "1",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                backgroundColor: cat.active ? "var(--color-border)" : "transparent",
              }}
              title={cat.label}
            >
              <span className="text-base leading-none">{cat.icon}</span>
              {cat.active && <span className="truncate">{cat.label}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 border-b flex items-center gap-1" style={{ borderColor: "var(--color-border)" }}>
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={isTrashMode ? t("sidebar.search.placeholderTrash") : t("sidebar.search.placeholderNotes")}
            className="w-full text-sm pl-2.5 pr-7 py-2 rounded outline-none bg-transparent transition-all focus:ring-1 focus:ring-blue-500"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-sm opacity-40 hover:opacity-100 p-0.5">✕</button>}
        </div>
        <button onClick={onOpenCommandPalette} title={t("sidebar.commandPalette.title")} className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-[11px] opacity-60 hover:opacity-100 transition-all" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>⌘K</button>
        {!isTrashMode && (
          <div className="relative shrink-0" ref={createMenuRef}>
            <button onClick={() => { setShowCreateMenu((prev) => !prev); }} className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-lg font-bold hover:bg-zinc-200 transition-all" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: showCreateMenu ? "var(--color-border)" : "transparent" }} title="新建">+</button>
            {showCreateMenu && renderCreateMenu()}
          </div>
        )}
        <button onClick={() => setIsSelectMode((prev) => !prev)} className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-xs font-medium hover:bg-zinc-200 transition-all" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: isSelectMode ? "var(--color-border)" : "transparent" }} title={t("sidebar.select.title")}>☑</button>
        {!isTrashMode && (
          <div className="relative shrink-0" ref={sortMenuRef}>
            <button onClick={() => setShowSortMenu((prev) => !prev)} className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-xs hover:bg-zinc-200 transition-all" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} title={t("sidebar.sort.title")}>⇅</button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl overflow-hidden shadow-2xl z-30" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <button onClick={() => { onSortModeChange("updated"); setShowSortMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-all hover:bg-zinc-200" style={{ color: "var(--color-text)", backgroundColor: sortMode === "updated" ? "var(--color-border)" : "transparent" }}>
                  <span></span><span>{t("sidebar.sort.updated")}</span>{sortMode === "updated" && <span className="ml-auto text-xs"></span>}
                </button>
                <button onClick={() => { onSortModeChange("custom"); setShowSortMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-all hover:bg-zinc-200" style={{ color: "var(--color-text)", backgroundColor: sortMode === "custom" ? "var(--color-border)" : "transparent" }}>
                  <span></span><span>{t("sidebar.sort.custom")}</span>{sortMode === "custom" && <span className="ml-auto text-xs"></span>}
                </button>
                <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
                  <label className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left cursor-pointer hover:bg-zinc-200 transition-all" style={{ color: "var(--color-text)" }}>
                    <input type="checkbox" checked={groupByType} onChange={(event) => setGroupByType(event.target.checked)} className="rounded" />
                    <span>{t("sidebar.sort.groupByType")}</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isSelectMode && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b text-xs" style={{ borderColor: "var(--color-border)" }}>
          <label className="flex items-center gap-1.5 cursor-pointer select-none" style={{ color: "var(--color-text)" }}>
            <input
              type="checkbox"
              checked={filteredPages.length > 0 && filteredPages.every((page) => selectedIds.has(page.id))}
              onChange={() => {
                const allIds = filteredPages.map((page) => page.id);
                const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
                setSelectedIds((prev) => {
                  if (allSelected) {
                    const next = new Set(prev);
                    allIds.forEach((id) => next.delete(id));
                    return next;
                  }
                  return new Set([...prev, ...allIds]);
                });
              }}
            />
            <span>{t("sidebar.bulk.selectedCount", { count: selectedIds.size })}</span>
          </label>

          <div className="flex items-center gap-1.5">
            {isTrashMode ? (
              <>
                <button disabled={selectedIds.size === 0} onClick={() => { onBulkRestorePages(Array.from(selectedIds)); setSelectedIds(new Set()); }} className="rounded px-2 py-1 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 text-green-700" style={{ border: "1px solid var(--color-border)" }}>
                  {t("sidebar.bulk.restore")}
                </button>
                <button disabled={selectedIds.size === 0} onClick={() => { if (confirm(t("sidebar.bulk.confirmPermanentDelete", { count: selectedIds.size }))) { onBulkPermanentDeletePages(Array.from(selectedIds)); setSelectedIds(new Set()); } }} className="rounded px-2 py-1 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 text-red-700" style={{ border: "1px solid var(--color-border)" }}>
                  {t("sidebar.bulk.delete")}
                </button>
              </>
            ) : (
              <button disabled={selectedIds.size === 0} onClick={() => { if (confirm(t("sidebar.bulk.confirmSoftDelete", { count: selectedIds.size }))) { onBulkDeletePages(Array.from(selectedIds)); setSelectedIds(new Set()); } }} className="rounded px-2 py-1 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 text-red-700" style={{ border: "1px solid var(--color-border)" }}>
                {t("sidebar.bulk.delete")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {renderPageSections()}
      </div>

      <AccountSettingsRow theme={theme} onThemeChange={onThemeChange} onExportBackup={onExportBackup} onImportBackup={onImportBackup} syncState={syncState} />
    </aside>
  );
}
````

## File: src/components/StudySetView.tsx
````
"use client";
import { useMemo, useState } from "react";
import type { Page, StudyItem } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

function newStudyItemId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `item_${uuid}`;
  return `item_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function createEmptyStudyItem(): StudyItem {
  return { id: newStudyItemId(), front: "", back: "", mastery: "new", last_reviewed_at: null, review_count: 0 };
}

/** Parse CSV or TSV text into front/back pairs */
function parseCsvTsv(text: string): { front: string; back: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const results: { front: string; back: string }[] = [];
  for (const line of lines) {
    // Detect delimiter: tab or comma
    const delimiter = line.includes("\t") ? "\t" : ",";
    const parts = parseCsvLine(line, delimiter);
    if (parts.length >= 2) {
      results.push({ front: parts[0].trim(), back: parts[1].trim() });
    }
  }
  return results;
}

/** Parse a single CSV line, handling quoted fields */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === delimiter) { result.push(current); current = ""; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

/** Generate wrong answers for quiz: pick from other cards, or generate similar strings */
function generateChoices(correctItem: StudyItem, allItems: StudyItem[], showFront: boolean): string[] {
  const correctAnswer = showFront ? correctItem.back : correctItem.front;
  const otherItems = allItems.filter((item) => item.id !== correctItem.id);
  const wrongPool = otherItems.map((item) => (showFront ? item.back : item.front)).filter((s) => s && s !== correctAnswer);

  // Shuffle and pick up to 3 wrong answers
  const shuffled = [...wrongPool].sort(() => Math.random() - 0.5);
  const wrongAnswers = shuffled.slice(0, 3);

  // If not enough wrong answers, generate similar strings
  while (wrongAnswers.length < 3) {
    wrongAnswers.push(generateSimilarString(correctAnswer, wrongAnswers.length));
  }

  // Combine and shuffle
  const all = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
  return all;
}

/** Generate a string similar to the input but different */
function generateSimilarString(input: string, seed: number): string {
  if (!input) return `Option ${seed + 1}`;
  const chars = input.split("");
  // Apply a simple transformation based on seed
  const transformations = [
    (s: string[]) => { if (s.length > 2) { const i = Math.floor(s.length / 2); [s[i], s[i + 1]] = [s[i + 1], s[i]]; } return s; }, // swap middle chars
    (s: string[]) => { s.push(s[0]); return s.slice(1); }, // rotate left
    (s: string[]) => { return [...s].reverse(); }, // reverse
  ];
  const transform = transformations[seed % transformations.length];
  const result = transform([...chars]).join("");
  return result === input ? `${input}*` : result;
}

/** Shuffle array */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPracticeQueue(items: StudyItem[]): StudyItem[] {
  const unmastered = shuffle(items.filter((item) => item.mastery !== "mastered"));
  const mastered = shuffle(items.filter((item) => item.mastery === "mastered"));
  const queue: StudyItem[] = [];
  let mi = 0;
  unmastered.forEach((item, idx) => { queue.push(item); if ((idx + 1) % 3 === 0 && mi < mastered.length) queue.push(mastered[mi++]); });
  while (mi < mastered.length) queue.push(mastered[mi++]);
  return queue;
}

/* ============ Card Management ============ */

function CardManageList({ studyItems, onAddCard, onUpdateCard, onDeleteCard, onImportCsv }: {
  studyItems: StudyItem[]; onAddCard: () => void; onUpdateCard: (id: string, patch: Partial<StudyItem>) => void;
  onDeleteCard: (id: string) => void; onImportCsv: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-60" style={{ color: "var(--color-text)" }}>{t("studySet.cardCount", { count: studyItems.length })}</div>
        <div className="flex gap-1.5">
          <button onClick={onImportCsv}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-zinc-200"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
            ? {t("studySet.importCsv")}
          </button>
          <button onClick={onAddCard}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-zinc-200"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
            {t("studySet.addCard")}
          </button>
        </div>
      </div>
      {studyItems.length === 0 ? (
        <div className="rounded-xl py-12 text-center text-sm opacity-50" style={{ border: "1px dashed var(--color-border)", color: "var(--color-text)" }}>{t("studySet.emptyCards")}</div>
      ) : (
        <div className="space-y-2">
          {studyItems.map((item, index) => (
            <div key={item.id} className="rounded-xl p-3" style={{ border: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs opacity-40" style={{ color: "var(--color-text)" }}>#{index + 1}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.mastery === "mastered" ? "bg-green-100 text-green-700" : item.mastery === "learning" ? "bg-amber-100 text-amber-700" : "bg-zinc-200 text-zinc-600"}`}>
                    {item.mastery === "mastered" ? t("studySet.mastery.mastered") : item.mastery === "learning" ? t("studySet.mastery.learning") : t("studySet.mastery.new")}
                  </span>
                  <button onClick={() => onDeleteCard(item.id)} className="text-xs px-1.5 py-0.5 rounded hover:bg-red-100 hover:text-red-700 transition-all"
                    style={{ color: "var(--color-sidebar-text)" }} title={t("studySet.deleteCard")}></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <textarea value={item.front} onChange={(e) => onUpdateCard(item.id, { front: e.target.value })} placeholder={t("studySet.front")} rows={2}
                  className="w-full text-sm px-2.5 py-1.5 rounded-md outline-none resize-none bg-transparent focus:ring-1 focus:ring-blue-500"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                <textarea value={item.back} onChange={(e) => onUpdateCard(item.id, { back: e.target.value })} placeholder={t("studySet.back")} rows={2}
                  className="w-full text-sm px-2.5 py-1.5 rounded-md outline-none resize-none bg-transparent focus:ring-1 focus:ring-blue-500"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Flashcard Practice ============ */

function PracticeSession({ studyItems, onFinishItem, onExit }: {
  studyItems: StudyItem[]; onFinishItem: (id: string, result: "again" | "got_it") => void; onExit: () => void;
}) {
  const { t } = useLanguage();
  const queue = useMemo(() => buildPracticeQueue(studyItems), [studyItems]);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [summary, setSummary] = useState({ reviewed: 0, gotIt: 0 });
  const currentItem = queue[index] || null;
  const isFinished = queue.length === 0 || index >= queue.length;

  const handleMark = (result: "again" | "got_it") => {
    if (!currentItem) return;
    onFinishItem(currentItem.id, result);
    setSummary((prev) => ({ reviewed: prev.reviewed + 1, gotIt: prev.gotIt + (result === "got_it" ? 1 : 0) }));
    setIsFlipped(false);
    setIndex((prev) => prev + 1);
  };

  if (queue.length === 0 || isFinished) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        {isFinished && queue.length > 0 && (<>
          <div className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>{t("studySet.practice.finishedTitle")}</div>
          <div className="text-sm opacity-60" style={{ color: "var(--color-text)" }}>{t("studySet.practice.summary", { reviewed: summary.reviewed, gotIt: summary.gotIt })}</div>
        </>)}
        <button onClick={onExit} className="rounded-md px-4 py-2 text-sm font-medium transition-all hover:bg-zinc-200"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("studySet.practice.backToManage")}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-xs opacity-40" style={{ color: "var(--color-text)" }}>{index + 1} / {queue.length}</div>
      <button type="button" onClick={() => setIsFlipped((prev) => !prev)}
        className="w-full max-w-md min-h-[220px] rounded-2xl flex items-center justify-center p-8 text-center text-xl font-medium transition-all hover:shadow-md"
        style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)", color: "var(--color-text)" }}>
        {isFlipped ? currentItem?.back : currentItem?.front}
      </button>
      <div className="text-xs opacity-40" style={{ color: "var(--color-text)" }}>{isFlipped ? t("studySet.practice.flipHintBack") : t("studySet.practice.flipHintFront")}</div>
      {isFlipped && (
        <div className="flex items-center gap-3">
          <button onClick={() => handleMark("again")} className="rounded-md px-4 py-2 text-sm font-medium transition-all hover:bg-amber-100"
            style={{ border: "1px solid var(--color-border)", color: "#b45309" }}>{t("studySet.practice.again")}</button>
          <button onClick={() => handleMark("got_it")} className="rounded-md px-4 py-2 text-sm font-medium transition-all hover:bg-green-100"
            style={{ border: "1px solid var(--color-border)", color: "#15803d" }}>{t("studySet.practice.gotIt")}</button>
        </div>
      )}
      <button onClick={onExit} className="text-xs opacity-50 hover:opacity-100 underline" style={{ color: "var(--color-text)" }}>{t("studySet.practice.exit")}</button>
    </div>
  );
}

/* ============ Quiz Mode (Four-Choice) ============ */

function QuizSession({ studyItems, onFinishItem, onExit }: {
  studyItems: StudyItem[]; onFinishItem: (id: string, result: "again" | "got_it") => void; onExit: () => void;
}) {
  const { t } = useLanguage();
  const [quizItems] = useState(() => shuffle([...studyItems]));
  const [index, setIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showFront] = useState(() => Math.random() > 0.5); // Randomly decide: show front?pick back, or show back?pick front

  const currentItem = quizItems[index] || null;
  const isFinished = index >= quizItems.length;

  const choices = useMemo(() => {
    if (!currentItem) return [];
    return generateChoices(currentItem, studyItems, showFront);
  }, [currentItem, studyItems, showFront]);

  const question = currentItem ? (showFront ? currentItem.front : currentItem.back) : "";
  const correctAnswer = currentItem ? (showFront ? currentItem.back : currentItem.front) : "";

  const handleSelect = (answer: string) => {
    if (selectedAnswer || !currentItem) return;
    setSelectedAnswer(answer);
    const isCorrect = answer === correctAnswer;
    setScore((prev) => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));
    onFinishItem(currentItem.id, isCorrect ? "got_it" : "again");
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIndex((prev) => prev + 1);
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="text-2xl font-semibold" style={{ color: "var(--color-text)" }}>??</div>
        <div className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>{t("studySet.practice.finishedTitle")}</div>
        <div className="text-lg" style={{ color: "var(--color-text)" }}>
          {t("studySet.quiz.score", { correct: score.correct, total: score.total })}
        </div>
        <div className="text-4xl font-bold mt-2" style={{ color: score.correct === score.total ? "#15803d" : score.correct >= score.total * 0.7 ? "#b45309" : "#dc2626" }}>
          {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
        </div>
        <button onClick={onExit} className="mt-4 rounded-md px-4 py-2 text-sm font-medium transition-all hover:bg-zinc-200"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          {t("studySet.practice.backToManage")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between w-full">
        <div className="text-xs opacity-40" style={{ color: "var(--color-text)" }}>{index + 1} / {quizItems.length}</div>
        <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
          {t("studySet.quiz.score", { correct: score.correct, total: score.total })}
        </div>
      </div>

      {/* Question */}
      <div className="w-full rounded-2xl p-8 text-center text-xl font-medium"
        style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)", color: "var(--color-text)" }}>
        {question}
      </div>

      <div className="text-sm opacity-50" style={{ color: "var(--color-text)" }}>{t("studySet.quiz.selectCorrect")}</div>

      {/* Choices */}
      <div className="w-full space-y-2">
        {choices.map((choice, i) => {
          const isSelected = selectedAnswer === choice;
          const isCorrect = choice === correctAnswer;
          const showResult = selectedAnswer !== null;
          let bg = "var(--color-sidebar-bg)";
          let border = "var(--color-border)";
          let textColor = "var(--color-text)";
          if (showResult && isCorrect) { bg = "#dcfce7"; border = "#15803d"; textColor = "#15803d"; }
          else if (showResult && isSelected && !isCorrect) { bg = "#fee2e2"; border = "#dc2626"; textColor = "#dc2626"; }
          return (
            <button key={i} onClick={() => handleSelect(choice)} disabled={selectedAnswer !== null}
              className="w-full rounded-xl px-5 py-4 text-left text-base transition-all disabled:cursor-default"
              style={{ border: `2px solid ${border}`, backgroundColor: bg, color: textColor }}>
              <span className="font-medium mr-2 opacity-50">{String.fromCharCode(65 + i)}.</span>
              {choice}
            </button>
          );
        })}
      </div>

      {/* Feedback + Next */}
      {selectedAnswer !== null && (
        <div className="w-full flex flex-col items-center gap-3 mt-2">
          {selectedAnswer === correctAnswer ? (
            <div className="text-green-600 font-medium text-sm">??{t("studySet.quiz.correct")}</div>
          ) : (
            <div className="text-red-600 font-medium text-sm">??{t("studySet.quiz.wrong")} <strong>{correctAnswer}</strong></div>
          )}
          <button onClick={handleNext}
            className="rounded-md px-5 py-2 text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--color-text)", color: "var(--color-bg)" }}>
            {index + 1 >= quizItems.length ? t("studySet.quiz.finish") : t("studySet.quiz.next")}
          </button>
        </div>
      )}

      <button onClick={onExit} className="text-xs opacity-50 hover:opacity-100 underline" style={{ color: "var(--color-text)" }}>{t("studySet.practice.exit")}</button>
    </div>
  );
}

/* ============ CSV Import Dialog ============ */

function CsvImportDialog({ onImport, onClose }: {
  onImport: (items: { front: string; back: string }[]) => void; onClose: () => void;
}) {
  const { t } = useLanguage();
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<{ front: string; back: string }[]>([]);
  const fileInputRef = useMemo(() => ({ current: null as HTMLInputElement | null }), []);

  const handleParse = (text: string) => {
    setCsvText(text);
    const parsed = parseCsvTsv(text);
    setPreview(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") handleParse(reader.result); };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>? {t("studySet.importCsv")}</span>
          <button onClick={onClose} className="text-sm opacity-40 hover:opacity-100 px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--color-border)" }}></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs opacity-60 mb-1.5" style={{ color: "var(--color-text)" }}>
              {t("studySet.importCsvHint")}
            </label>
            <textarea value={csvText} onChange={(e) => handleParse(e.target.value)}
              placeholder={"apple,??\nbanana,香?\ngrape,??"}
              rows={6} className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none focus:ring-2 focus:ring-blue-500"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-sidebar-bg)" }} />
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef as React.RefObject<HTMLInputElement>} type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="rounded-md px-3 py-2 text-xs font-medium transition-all hover:bg-zinc-200"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
              ?? Upload file
            </button>
            {preview.length > 0 && (
              <span className="text-xs opacity-60" style={{ color: "var(--color-text)" }}>
                {preview.length} cards detected
              </span>
            )}
          </div>
          {preview.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-lg p-2 space-y-1" style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
              {preview.slice(0, 10).map((item, i) => (
                <div key={i} className="flex gap-2 text-xs" style={{ color: "var(--color-text)" }}>
                  <span className="opacity-40 w-6 shrink-0">{i + 1}.</span>
                  <span className="truncate flex-1">{item.front}</span>
                  <span className="opacity-30"></span>
                  <span className="truncate flex-1">{item.back}</span>
                </div>
              ))}
              {preview.length > 10 && <div className="text-xs opacity-40 text-center">...and {preview.length - 10} more</div>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm transition-all hover:bg-zinc-200"
            style={{ color: "var(--color-text)" }}>Cancel</button>
          <button onClick={() => { if (preview.length > 0) { onImport(preview); onClose(); } }}
            disabled={preview.length === 0}
            className="rounded-md px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--color-text)", color: "var(--color-bg)" }}>
            Import {preview.length > 0 ? `(${preview.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ Main StudySetView ============ */

export default function StudySetView({ page, onTitleChange, onUpdateStudyItems }: {
  page: Page; onTitleChange: (title: string) => void; onUpdateStudyItems: (items: StudyItem[]) => void;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"manage" | "practice" | "quiz">("manage");
  const [showCsvImport, setShowCsvImport] = useState(false);
  const studyItems = page.study_items || [];

  const handleAddCard = () => onUpdateStudyItems([...studyItems, createEmptyStudyItem()]);
  const handleUpdateCard = (id: string, patch: Partial<StudyItem>) => onUpdateStudyItems(studyItems.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const handleDeleteCard = (id: string) => onUpdateStudyItems(studyItems.filter((i) => i.id !== id));
  const handleFinishItem = (id: string, result: "again" | "got_it") => {
    onUpdateStudyItems(studyItems.map((item) => {
      if (item.id !== id) return item;
      const nextMastery: StudyItem["mastery"] = result === "got_it" ? (item.mastery === "learning" ? "mastered" : "learning") : "learning";
      return { ...item, mastery: result === "got_it" && item.mastery === "new" ? "learning" : nextMastery, last_reviewed_at: Date.now(), review_count: item.review_count + 1 };
    }));
  };
  const handleImportCsv = (items: { front: string; back: string }[]) => {
    const newItems: StudyItem[] = items.map((item) => ({
      id: newStudyItemId(), front: item.front, back: item.back, mastery: "new", last_reviewed_at: null, review_count: 0,
    }));
    onUpdateStudyItems([...studyItems, ...newItems]);
  };

  return (
    <main className="flex flex-col flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="flex flex-col mx-auto w-full" style={{ maxWidth: "820px", padding: "48px 64px" }}>
        <div className="flex items-center justify-between gap-3 mb-4 text-sm opacity-80 pb-3 border-b" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>
          <span>{t("studySet.label")}</span>
          <div className="flex gap-1.5">
            {mode === "manage" ? (<>
              <button onClick={() => setMode("practice")} disabled={studyItems.length === 0}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("studySet.startPractice")}</button>
              <button onClick={() => { if (studyItems.length < 4) { alert(t("studySet.quiz.notEnough")); return; } setMode("quiz"); }}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>?? {t("studySet.quiz")}</button>
            </>) : (
              <button onClick={() => setMode("manage")}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-zinc-200"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("studySet.backToCards")}</button>
            )}
          </div>
        </div>
        <input type="text" value={page.title} onChange={(e) => onTitleChange(e.target.value)} placeholder={t("studySet.titlePlaceholder")}
          className="w-full text-3xl font-semibold bg-transparent border-none outline-none mb-6" style={{ color: "var(--color-text)", fontFamily: "inherit" }} />
        {mode === "manage" ? (
          <CardManageList studyItems={studyItems} onAddCard={handleAddCard} onUpdateCard={handleUpdateCard} onDeleteCard={handleDeleteCard} onImportCsv={() => setShowCsvImport(true)} />
        ) : mode === "practice" ? (
          <PracticeSession studyItems={studyItems} onFinishItem={handleFinishItem} onExit={() => setMode("manage")} />
        ) : (
          <QuizSession studyItems={studyItems} onFinishItem={handleFinishItem} onExit={() => setMode("manage")} />
        )}
      </div>
      {showCsvImport && <CsvImportDialog onImport={handleImportCsv} onClose={() => setShowCsvImport(false)} />}
    </main>
  );
}
````

## File: src/components/TableGridPicker.tsx
````
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";

export default function TableGridPicker({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    const w = 260;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (top + 300 > window.innerHeight - 8) top = rect.top - 300 - 6;
    if (top < 8) top = 8;
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePos();
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(t)) return;
      if (popupRef.current && popupRef.current.contains(t)) return;
      setIsOpen(false);
    };
    const onResize = () => updatePos();
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, updatePos]);

  const insertTable = (rows: number, cols: number) => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setIsOpen(false);
    setHover(null);
  };

  const rows = 8;
  const cols = 10;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title="插入表格（自由選擇大小）"
        disabled={disabled}
        onMouseDown={(e) => { e.preventDefault(); setIsOpen((v) => !v); }}
        className="rounded flex items-center justify-center w-[30px] h-[30px] text-[12px] font-medium hover:bg-zinc-200 disabled:opacity-30"
        style={{ color: "var(--color-text)" }}
      >
        ⊞
      </button>
      {mounted && isOpen && createPortal(
        <div
          ref={popupRef}
          className="rounded-xl shadow-2xl z-[9999] p-3"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 260,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="text-xs font-medium mb-2 flex items-center justify-between">
            <span>插入表格</span>
            <span className="opacity-60 text-[11px]">{hover ? `${hover.r} × ${hover.c}` : "選擇大小"}</span>
          </div>
          <div className="grid gap-[2px] p-2 rounded bg-zinc-50" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: rows * cols }).map((_, idx) => {
              const r = Math.floor(idx / cols) + 1;
              const c = (idx % cols) + 1;
              const isHighlighted = hover ? r <= hover.r && c <= hover.c : false;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHover({ r, c })}
                  onMouseDown={(e) => { e.preventDefault(); insertTable(r, c); }}
                  className={`aspect-square border rounded-sm cursor-pointer ${isHighlighted ? "bg-blue-500 border-blue-600" : "bg-white border-zinc-300 hover:bg-zinc-100"}`}
                />
              );
            })}
          </div>
          <div className="mt-2 text-[10px] opacity-60">點擊選擇行列，支援合併儲存格、平均欄寬列高等試算表功能</div>
        </div>,
        document.body
      )}
    </>
  );
}

````

## File: src/components/TiptapEditor.tsx
````
"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
import { DragHandle } from "@tiptap/extension-drag-handle";
import { NodeRange } from "@tiptap/extension-node-range";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import "katex/dist/katex.min.css";
import { Callout } from "../lib/calloutExtension";
import { createObsidianMathNodeView } from "../lib/obsidianMathNodeView";
import { ObsidianMathInput } from "../lib/obsidianMathInput";
import { PageBreak } from "../lib/pageBreakExtension";
import { MultiColumn, Column } from "../lib/multiColumnExtension";
import { WritingModeExtension } from "../lib/writingModeExtension";
import { StableBlockId } from "../lib/stableBlockIdExtension";
import { CellSelection, TableMap } from "prosemirror-tables";
import { useLanguage } from "../lib/LanguageContext";
import ToolbarDropdown from "./ToolbarDropdown";
import ColorPaletteButton from "./ColorPaletteButton";
import TableGridPicker from "./TableGridPicker";

interface TiptapEditorProps {
  content: any;
  onChange: (payload: { json: any; text: string }) => void;
  variant?: "rich" | "plain";
  toolbarTarget?: HTMLElement | null;
  onFocus?: () => void;
  pageNightAdapt?: boolean;
  onTogglePageNightAdapt?: () => void;
  showToolbar?: boolean;
  toolbarTab?: "home" | "insert" | "layout";
  margins?: any;
  onMarginsChange?: (margins: any) => void;
}

type ToolbarState = {
  bold: boolean; italic: boolean; underline: boolean; strike: boolean; code: boolean;
  h1: boolean; h2: boolean; h3: boolean;
  bulletList: boolean; orderedList: boolean; taskList: boolean;
  blockquote: boolean; codeBlock: boolean; link: boolean;
  table: boolean; callout: boolean; blockMath: boolean; inlineMath: boolean;
  multiColumn: boolean;
  textAlign: "left" | "center" | "right" | "justify";
  fontFamily: string | null; fontSize: string | null;
  color: string | null; highlight: boolean; highlightColor: string | null;
  canUndo: boolean; canRedo: boolean;
};

const emptyToolbarState: ToolbarState = {
  bold: false, italic: false, underline: false, strike: false, code: false,
  h1: false, h2: false, h3: false,
  bulletList: false, orderedList: false, taskList: false,
  blockquote: false, codeBlock: false, link: false,
  table: false, callout: false, blockMath: false, inlineMath: false,
  multiColumn: false,
  textAlign: "left", fontFamily: null, fontSize: null, color: null, highlight: false, highlightColor: null,
  canUndo: false, canRedo: false,
};

function TB({ label, title, active, disabled, onClick, icon }: { label?: string; title: string; active?: boolean; disabled?: boolean; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="rounded flex items-center justify-center w-[30px] h-[30px] text-[12px] font-medium transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 leading-none"
      style={{ color: "var(--color-text)", backgroundColor: active ? "var(--color-border)" : "transparent" }}
    >
      {icon || label}
    </button>
  );
}
function Sep() { return <div className="mx-0.5 h-5 w-px bg-zinc-300 shrink-0" />; }

// 全域游標錨點：分頁模式下 block 被搬移到另一頁編輯器時，游標跨編輯器跟隨
// （每頁是獨立 TiptapEditor，游標無法直接轉移，用模組級變數記錄「最近游標所在 block」，
//   任一編輯器 setContent 後若發現該 block 在自己文件內 → 放置游標並聚焦）
let globalCursorAnchor: { id: string; offset: number; prefix?: string } | null = null;
// 依「block 文字前綴」在 doc 中定位（id 遺失時的跨頁 fallback）
function findPosByPrefix(doc: any, prefix: string, preferAfter = false): number {
  if (!prefix) return -1;
  const fullText = doc.textBetween(0, doc.content.size, "\n", " ");
  const idx = fullText.lastIndexOf(prefix);
  if (idx === -1) return -1;
  const targetChar = preferAfter ? idx + prefix.length : idx;
  let charAcc = 0, bestPos = -1, bestDiff = Infinity;
  doc.descendants((node: any, nodePos: number) => {
    if (node.isText) {
      const txt = node.text || "";
      const ns = charAcc, ne = charAcc + txt.length;
      charAcc = ne;
      if (targetChar >= ns && targetChar <= ne) {
        const candidate = nodePos + Math.max(0, targetChar - ns);
        const len = doc.textBetween(0, candidate, "\n", " ").length;
        const diff = Math.abs(len - targetChar);
        if (diff < bestDiff) { bestDiff = diff; bestPos = candidate; }
        return false;
      }
    } else if (node.isInline && !node.isText) {
      charAcc += 1;
    }
    return true;
  });
  return bestPos;
}

export default function TiptapEditor({ content, onChange, variant = "rich", toolbarTarget, onFocus, pageNightAdapt, onTogglePageNightAdapt, showToolbar = true, toolbarTab = "home", margins, onMarginsChange }: TiptapEditorProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [toolbarState, setToolbarState] = useState<ToolbarState>(emptyToolbarState);
  const [marginsPanelOpen, setMarginsPanelOpen] = useState(false);
  const [marginsPos, setMarginsPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const marginsBtnRef = useRef<HTMLButtonElement | null>(null);
  const marginsPanelRef = useRef<HTMLDivElement | null>(null);
  const updateMarginsPos = () => {
    if (!marginsBtnRef.current) return;
    const rect = marginsBtnRef.current.getBoundingClientRect();
    let left = rect.left;
    const w = 260;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    setMarginsPos({ top: rect.bottom + 6, left });
  };
  const MARGIN_PRESETS: Record<string, { top: number; right: number; bottom: number; left: number }> = {
    normal: { top: 20, right: 18, bottom: 20, left: 18 },
    narrow: { top: 12, right: 12, bottom: 12, left: 12 },
    wide: { top: 25, right: 25, bottom: 25, left: 25 },
    moderate: { top: 20, right: 15, bottom: 20, left: 15 },
  };
  const curMargins = margins || { top: 20, right: 18, bottom: 20, left: 18 };
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Table context menu state
  const [tableMenu, setTableMenu] = useState<{ x: number; y: number } | null>(null);
  const [textMenu, setTextMenu] = useState<{ x: number; y: number } | null>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);

  const refreshToolbarState = () => {
    const editor = editorRef.current;
    if (!editor) { setToolbarState(emptyToolbarState); return; }
    const alignAttrs = editor.getAttributes("paragraph");
    const textStyleAttrs = editor.getAttributes("textStyle");
    const highlightAttrs = editor.getAttributes("highlight");
    setToolbarState({
      bold: editor.isActive("bold"), italic: editor.isActive("italic"),
      underline: editor.isActive("underline"), strike: editor.isActive("strike"), code: editor.isActive("code"),
      h1: editor.isActive("heading", { level: 1 }), h2: editor.isActive("heading", { level: 2 }), h3: editor.isActive("heading", { level: 3 }),
      bulletList: editor.isActive("bulletList"), orderedList: editor.isActive("orderedList"), taskList: editor.isActive("taskList"),
      blockquote: editor.isActive("blockquote"), codeBlock: editor.isActive("codeBlock"),
      link: editor.isActive("link"), table: editor.isActive("table"), callout: editor.isActive("callout"),
      blockMath: editor.isActive("blockMath"), inlineMath: editor.isActive("inlineMath"),
      multiColumn: editor.isActive("multiColumn"),
      textAlign: variant === "rich" ? (alignAttrs.textAlign || "left") : "left",
      fontFamily: variant === "rich" ? (textStyleAttrs.fontFamily ?? null) : null,
      fontSize: variant === "rich" ? (textStyleAttrs.fontSize ?? null) : null,
      color: variant === "rich" ? (textStyleAttrs.color ?? null) : null,
      highlight: editor.isActive("highlight"),
      highlightColor: variant === "rich" ? (highlightAttrs.color ?? null) : null,
      canUndo: editor.can().undo(), canRedo: editor.can().redo(),
    });
  };

  useEffect(() => {
    if (!ref.current) return;
    const editor = new Editor({
      element: ref.current,
      extensions: [
        StarterKit.configure({ link: false, underline: false }),
        StableBlockId,
        Placeholder.configure({ placeholder: t("tiptap.placeholder") }),
        Typography,
        Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
        Underline,
        TaskList,
        TaskItem.configure({ nested: true }),
        TableKit.configure({ table: { resizable: true } }),
        Image.configure({ inline: false, allowBase64: true }),
        Callout,
        PageBreak,
        Column,
        MultiColumn,
        WritingModeExtension,
        BlockMath.extend({ addNodeView() { return createObsidianMathNodeView(false); }, addInputRules() { return []; } }).configure({ katexOptions: { throwOnError: false } }),
        InlineMath.extend({ addNodeView() { return createObsidianMathNodeView(true); }, addInputRules() { return []; } }).configure({ katexOptions: { throwOnError: false } }),
        ObsidianMathInput,
        NodeRange,
        DragHandle.configure({ render: () => { const el = document.createElement("div"); el.classList.add("nexus-drag-handle"); el.innerHTML = "⠿"; return el; } }),
        ...(variant === "rich" ? [
          TextStyleKit.configure({ backgroundColor: false, lineHeight: false }),
          TextAlign.configure({ types: ["heading", "paragraph"] }),
          Highlight.configure({ multicolor: true }),
        ] : []),
      ],
      content: content || { type: "doc", content: [{ type: "paragraph" }] },
      editorProps: { attributes: { class: "nexus-tiptap-editor prose prose-zinc max-w-none focus:outline-none min-h-[400px] text-base" } },
      onCreate() { refreshToolbarState(); },
      onSelectionUpdate() { refreshToolbarState(); },
      onTransaction() { refreshToolbarState(); },
      onFocus() { onFocus?.(); },
      onUpdate({ editor }) { refreshToolbarState(); onChangeRef.current({ json: editor.getJSON(), text: editor.getText() }); },
    });
    editorRef.current = editor;
    setIsReady(true);
    refreshToolbarState();
    // 新 mount 時檢查全域錨點：分頁搬移把 block 送來本頁時，游標跟隨（延遲至其他 effect 設定 anchor 後）
    setTimeout(() => {
      const ed = editorRef.current;
      if (!ed || !globalCursorAnchor) return;
      const anchor = globalCursorAnchor;
      let found = -1;
      ed.state.doc.descendants((n: any, np: number) => {
        if (n.attrs && n.attrs.id === anchor.id) { found = np; return false; }
        return true;
      });
      if (found >= 0) {
        try {
          const block = ed.state.doc.nodeAt(found);
          if (block) {
            const s = found + 1, e = found + block.nodeSize - 1;
            const tp = posAtCharOffset(ed.state.doc, s, e, anchor.offset);
            ed.commands.setTextSelection(Math.min(Math.max(tp, s), Math.max(e, s)));
            ed.commands.focus();
            setTimeout(() => {
              (ed.view.dom as HTMLElement).closest?.("[data-page]")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
            }, 30);
          }
        } catch { /* ignore */ }
      }
    }, 0);
    return () => { editor.destroy(); editorRef.current = null; setIsReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IME composition 追蹤（中文輸入法期間不覆寫內容）
  const compositionRef = useRef(false);
  useEffect(() => {
    const dom = ref.current;
    if (!dom) return;
    const onStart = () => { compositionRef.current = true; };
    const onEnd = () => { compositionRef.current = false; };
    dom.addEventListener("compositionstart", onStart);
    dom.addEventListener("compositionend", onEnd);
    return () => {
      dom.removeEventListener("compositionstart", onStart);
      dom.removeEventListener("compositionend", onEnd);
    };
  }, []);

  // 在 block 內容範圍內，依「字元偏移」找出對應的 doc pos
  const posAtCharOffset = (doc: any, from: number, to: number, targetChar: number): number => {
    let acc = 0;
    let result = from;
    doc.nodesBetween(from, to, (node: any, nodePos: number) => {
      if (acc >= targetChar) return false;
      if (node.isText) {
        const len = (node.text || "").length;
        if (acc + len >= targetChar) {
          result = nodePos + (targetChar - acc);
          acc = targetChar;
          return false;
        }
        acc += len;
      } else if (node.isInline && !node.isText) {
        acc += 1;
        if (acc >= targetChar) result = nodePos + 1;
      }
      return true;
    });
    return result;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !content) return;
    const currentJson = JSON.stringify(editor.getJSON());
    const targetJson = JSON.stringify(content);
    if (currentJson !== targetJson) {
      // IME composition 期間不覆寫（避免打斷中文輸入）
      if (editor.isFocused && compositionRef.current) return;
      // 游標保留（分頁重排修復）：block id + block 內字元偏移精確定位
      const { state } = editor;
      const sel = state.selection;
      let cursorPrefix = "";
      let cursorBlockId: string | null = null;
      let cursorBlockOffset = 0;
      if (sel && typeof sel.anchor === "number" && sel.anchor > 0) {
        const pos = Math.min(sel.anchor, state.doc.content.size);
        cursorPrefix = state.doc.textBetween(Math.max(0, pos - 300), pos, "\n", " ");
        try {
          const $pos = state.doc.resolve(pos);
          for (let d = $pos.depth; d > 0; d--) {
            const node = $pos.node(d);
            if (node.type.isBlock && node.attrs && typeof node.attrs.id === "string" && node.attrs.id) {
              cursorBlockId = node.attrs.id;
              const blockContentStart = $pos.start(d);
              cursorBlockOffset = state.doc.textBetween(blockContentStart, pos, "\n", " ").length;
              break;
            }
          }
        } catch { /* ignore */ }
      }
      // 更新全域游標錨點（供跨頁編輯器跟隨）
      // 只有聚焦中的編輯器才能更新錨點（避免其他頁的舊游標覆蓋）
      if (editor.isFocused) {
        if (cursorBlockId) {
          globalCursorAnchor = { id: cursorBlockId, offset: cursorBlockOffset, prefix: cursorPrefix };
        } else if (cursorPrefix) {
          // id 遺失（舊資料/新段落尚未補 id）→ 用前綴錨點
          globalCursorAnchor = { id: "", offset: cursorBlockOffset, prefix: cursorPrefix.slice(-60) };
        }
      }
      editor.commands.setContent(content, { emitUpdate: false });
      const newDoc = editor.state.doc;
      // 1) 全域錨點定位：block 可能在「這個編輯器」或「被搬到另一頁編輯器」
      const anchor = globalCursorAnchor;
      if (anchor) {
        let foundBlockPos = -1;
        if (anchor.id) {
          newDoc.descendants((node: any, nodePos: number) => {
            if (node.attrs && node.attrs.id === anchor.id) {
              foundBlockPos = nodePos;
              return false;
            }
            return true;
          });
        }
        if (foundBlockPos >= 0) {
          try {
            const block = newDoc.nodeAt(foundBlockPos);
            if (block) {
              const innerStart = foundBlockPos + 1;
              const innerEnd = foundBlockPos + block.nodeSize - 1;
              const targetPos = posAtCharOffset(newDoc, innerStart, innerEnd, anchor.offset);
              editor.commands.setTextSelection(Math.min(Math.max(targetPos, innerStart), Math.max(innerEnd, innerStart)));
              // block 在此編輯器內 → 聚焦（跨頁搬移時讓使用者可繼續打字）
              if (!editor.isFocused) editor.commands.focus();
              // 滾動到該頁（Word 行為：畫面跟隨游標）
              setTimeout(() => {
                (editor.view.dom as HTMLElement).closest?.("[data-page]")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
              }, 30);
            } else {
              editor.commands.setTextSelection(foundBlockPos + 1);
            }
            refreshToolbarState();
            return;
          } catch { /* fallthrough */ }
        }
        // 錨點 block 不在這個編輯器（被搬到別頁）
        // 若有 prefix → 用前綴定位（id 遺失的跨頁 fallback）
        if (anchor.prefix) {
          const p = findPosByPrefix(newDoc, anchor.prefix, true);
          if (p > 0) {
            editor.commands.setTextSelection(p);
            if (!editor.isFocused) editor.commands.focus();
            setTimeout(() => {
              (editor.view.dom as HTMLElement).closest?.("[data-page]")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
            }, 30);
            refreshToolbarState();
            return;
          }
        }
        refreshToolbarState();
        return;
      }
      // 2) 前綴定位 fallback（含 tail 遞減）
      if (cursorPrefix) {
        try {
          const restoreAt = (prefix: string): boolean => {
            const fullText = newDoc.textBetween(0, newDoc.content.size, "\n", " ");
            const idx = fullText.lastIndexOf(prefix);
            if (idx === -1) return false;
            // 游標應放在「前綴結尾」（原本游標在前綴之後），不是前綴開頭
            const targetChar = idx + prefix.length;
            let charAcc = 0;
            let bestPos = -1;
            let bestDiff = Infinity;
            newDoc.descendants((node: any, nodePos: number) => {
              if (node.isText) {
                const txt = node.text || "";
                const nodeStart = charAcc;
                const nodeEnd = charAcc + txt.length;
                charAcc = nodeEnd;
                if (targetChar >= nodeStart && targetChar <= nodeEnd) {
                  const candidate = nodePos + Math.max(0, targetChar - nodeStart);
                  const len = newDoc.textBetween(0, candidate, "\n", " ").length;
                  const diff = Math.abs(len - targetChar);
                  if (diff < bestDiff) { bestDiff = diff; bestPos = candidate; }
                  return false;
                }
              } else if (node.isInline && !node.isText) {
                charAcc += 1;
              }
              return true;
            });
            if (bestPos > 0) { editor.commands.setTextSelection(bestPos); return true; }
            return false;
          };
          if (!restoreAt(cursorPrefix)) {
            const tail = cursorPrefix.slice(-80);
            if (!restoreAt(tail)) restoreAt(cursorPrefix.slice(-30));
          }
        } catch { /* 保留失敗就維持預設 */ }
      }
      refreshToolbarState();
    }
  }, [content]);

  useEffect(() => {
    const handler = () => {
      editorRef.current?.chain().focus().setPageBreak().run();
    };
    window.addEventListener("nexus-insert-page-break", handler as any);
    return () => window.removeEventListener("nexus-insert-page-break", handler as any);
  }, []);

  // Right-click table context menu
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest("td, th");
      const table = target.closest("table");
      // 表格右鍵（既有）
      if (cell && table) {
        e.preventDefault();
        setTextMenu(null);
        setTableMenu({ x: e.clientX, y: e.clientY });
        return;
      }
      // 需求2：框選文字右鍵 → 「建立頁面連結」
      const sel = window.getSelection();
      const hasSelection = sel && !sel.isCollapsed && sel.toString().trim().length > 0;
      if (hasSelection) {
        e.preventDefault();
        setTableMenu(null);
        setTextMenu({ x: e.clientX, y: e.clientY });
        return;
      }
      setTableMenu(null);
      setTextMenu(null);
    };
    const onClick = (e: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node)) {
        setTableMenu(null);
      }
    };
    el.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mousedown", onClick);
    return () => {
      el.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const editor = editorRef.current;
  const disabled = !isReady || !editor;

  const handleInsertPageLink = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const title = window.prompt(t("tiptap.pageLinkPrompt") || "輸入頁面標題（會以 [[標題]] 建立內部連結）：");
    if (title && title.trim()) {
      const { from, to } = ed.state.selection;
      if (from === to) {
        ed.chain().focus().insertContent(`[[${title.trim()}]]`).run();
      } else {
        ed.chain().focus().insertContentAt({ from, to }, `[[${title.trim()}]]`).run();
      }
    }
    setTextMenu(null);
  };

  const handleSetLink = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const prevUrl = ed.getAttributes("link").href as string | undefined;
    if (ed.state.selection.empty && !prevUrl) { alert(t("tiptap.linkSelectFirst")); return; }
    const url = window.prompt(t("tiptap.linkPrompt"), prevUrl || "https://");
    if (url === null) return;
    if (url.trim() === "") { ed.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    ed.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  const handleInsertImage = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const url = window.prompt(t("tiptap.imagePrompt"), "https://");
    if (url && url.trim()) ed.chain().focus().setImage({ src: url.trim() }).run();
  };
  const handleInsertBlockMath = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const pos = ed.state.selection.from;
    ed.chain().focus().insertContentAt(pos, { type: "blockMath", attrs: { latex: "" } }).setNodeSelection(pos).run();
  };
  const handleInsertInlineMath = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const pos = ed.state.selection.from;
    ed.chain().focus().insertContentAt(pos, { type: "inlineMath", attrs: { latex: "" } }).setNodeSelection(pos).run();
  };
  const currentFontSize = parseInt(toolbarState.fontSize || "16", 10) || 16;
  const handleFontSizeChange = (newSize: number) => {
    const clamped = Math.max(8, Math.min(72, newSize));
    editorRef.current?.chain().focus().setFontSize(`${clamped}px`).run();
  };

  const getTableAndCell = () => {
    const ed = editorRef.current;
    if (!ed) return null;
    const { state } = ed;
    const $from = state.selection.$from;
    let tablePos = -1;
    let tableNode: any = null;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'table') { tableNode = node; tablePos = $from.before(d); break; }
    }
    if (!tableNode) return null;
    let cellPos = -1;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        cellPos = $from.before(d);
        break;
      }
    }
    if (cellPos === -1) return null;
    return { ed, state, tableNode, tablePos, cellPos };
  };

  const mergeWith = (dir: 'up' | 'down' | 'left' | 'right') => {
    const info = getTableAndCell();
    if (!info) return;
    const { ed, state, tableNode, tablePos, cellPos } = info as any;
    try {
      const map = TableMap.get(tableNode);
      const tableStart = tablePos + 1;
      const rect = map.findCell(cellPos - tableStart);
      if (!rect) return;
      let targetIndex = -1;
      if (dir === 'up' && rect.top > 0) targetIndex = map.positionAt(rect.top - 1, rect.left, tableNode);
      if (dir === 'down' && rect.bottom < map.height) targetIndex = map.positionAt(rect.bottom, rect.left, tableNode);
      if (dir === 'left' && rect.left > 0) targetIndex = map.positionAt(rect.top, rect.left - 1, tableNode);
      if (dir === 'right' && rect.right < map.width) targetIndex = map.positionAt(rect.top, rect.right, tableNode);
      if (targetIndex === -1) return;
      const targetPos = tableStart + targetIndex;
      const $anchor = state.doc.resolve(targetPos);
      const $head = state.doc.resolve(cellPos);
      // @ts-ignore
      const sel = (CellSelection as any).create(state.doc, $anchor.pos, $head.pos);
      let tr = state.tr.setSelection(sel);
      ed.view.dispatch(tr);
      setTimeout(() => {
        (ed as any).chain().focus().mergeCells().run();
        setTableMenu(null);
      }, 20);
    } catch (e) {
      console.error('mergeWith error', e);
    }
  };

  const canAverage = (() => {
    try {
      const ed = editorRef.current;
      if (!ed) return false;
      const sel = (ed.state.selection as any);
      if (!sel || !sel.forEachCell) return false;
      let count = 0;
      sel.forEachCell(() => count++);
      return count > 1;
    } catch { return false; }
  })();

  // 需求2：框選文字右鍵 → 建立頁面連結
  // 邊界選單（Word 風格：預設＋自訂；Portal 跳出工具列）
  const marginsMenu = (typeof document !== "undefined") && marginsPanelOpen ? createPortal(
    <div
      ref={marginsPanelRef}
      className="rounded-xl shadow-2xl z-[10000] overflow-hidden p-2"
      style={{ position: "fixed", top: marginsPos.top, left: marginsPos.left, width: 260, backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-60">頁面邊界</div>
      {/* 預設選項 */}
      <div className="grid grid-cols-2 gap-1 mb-2">
        {(["normal", "narrow", "moderate", "wide"] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => { onMarginsChange?.(MARGIN_PRESETS[preset]); setMarginsPanelOpen(false); }}
            className="rounded-md px-2 py-1.5 text-[11px] text-left hover:bg-zinc-100"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: JSON.stringify(curMargins) === JSON.stringify(MARGIN_PRESETS[preset]) ? "var(--color-border)" : "transparent" }}
          >
            {preset === "normal" ? "一般" : preset === "narrow" ? "窄" : preset === "moderate" ? "適中" : "寬"}
          </button>
        ))}
      </div>
      {/* 自訂 4 欄 */}
      <div className="border-t pt-1.5" style={{ borderColor: "var(--color-border)" }}>
        <div className="px-1 pb-1 text-[9px] opacity-50">自訂邊界 (mm)</div>
        <div className="grid grid-cols-4 gap-1">
          {(["top", "right", "bottom", "left"] as const).map((k) => (
            <label key={k} className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] opacity-60">{k === "top" ? "上" : k === "bottom" ? "下" : k === "left" ? "左" : "右"}</span>
              <input
                type="number"
                min={0}
                max={40}
                value={curMargins[k]}
                onChange={(e) => { const v = Math.max(0, Math.min(40, Number(e.target.value) || 0)); onMarginsChange?.({ ...curMargins, [k]: v }); }}
                className="w-full rounded px-1 py-1 text-[10px] text-center outline-none"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-bg)" }}
              />
            </label>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  const textContextMenu = textMenu ? createPortal(
    <div
      className="rounded-xl shadow-2xl z-[10000] overflow-hidden py-1"
      style={{
        position: "fixed",
        top: Math.min(textMenu.y, window.innerHeight - 120),
        left: Math.min(textMenu.x, window.innerWidth - 200),
        width: 190,
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-border)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase opacity-60">文字操作</div>
      <button onClick={handleInsertPageLink} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>🔗</span> 建立頁面連結</button>
    </div>,
    document.body
  ) : null;

  const tableContextMenu = tableMenu && toolbarState.table ? createPortal(
    <div
      ref={tableMenuRef}
      className="rounded-xl shadow-2xl z-[10000] overflow-hidden py-1"
      style={{
        position: "fixed",
        top: Math.min(tableMenu.y, window.innerHeight - 340),
        left: Math.min(tableMenu.x, window.innerWidth - 220),
        width: 210,
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-border)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase opacity-60">儲存格操作（右鍵）</div>
      <button onClick={() => { (editorRef.current as any)?.chain().focus().addRowBefore().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬆️</span> 在上方插入列</button>
      <button onClick={() => { editorRef.current?.chain().focus().addRowAfter().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬇️</span> 在下方插入列</button>
      <button onClick={() => { (editorRef.current as any)?.chain().focus().addColumnBefore().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬅️</span> 在左側插入欄</button>
      <button onClick={() => { editorRef.current?.chain().focus().addColumnAfter().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>➡️</span> 在右側插入欄</button>
      <div className="border-t my-1" style={{ borderColor: "var(--color-border)" }} />
      <button onClick={() => { editorRef.current?.chain().focus().deleteRow().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>🗑️</span> 刪除列</button>
      <button onClick={() => { editorRef.current?.chain().focus().deleteColumn().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>🗑️</span> 刪除欄</button>
      <div className="border-t my-1" style={{ borderColor: "var(--color-border)" }} />
      <button onClick={() => { (editorRef.current as any)?.chain().focus().mergeCells().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>🔗</span> 合併儲存格（需先選多格）</button>
      <button onClick={() => { mergeWith('up'); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬆️</span> 與上方儲存格合併</button>
      <button onClick={() => { mergeWith('down'); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬇️</span> 與下方儲存格合併</button>
      <button onClick={() => { mergeWith('left'); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬅️</span> 與左側儲存格合併</button>
      <button onClick={() => { mergeWith('right'); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>➡️</span> 與右側儲存格合併</button>
      <button onClick={() => { (editorRef.current as any)?.chain().focus().splitCell().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>✂️</span> 拆分儲存格</button>
      <button onClick={() => { (editorRef.current as any)?.chain().focus().toggleHeaderRow().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>📌</span> 切換標題列</button>
      <button onClick={() => { (editorRef.current as any)?.chain().focus().toggleHeaderColumn().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>📌</span> 切換標題欄</button>
      <div className="border-t my-1" style={{ borderColor: "var(--color-border)" }} />
      <button onClick={() => {
        const ed = editorRef.current; if (!ed) return;
        const { state } = ed;
        const sel = state.selection as any;
        if (!sel || !sel.forEachCell) {
          setTableMenu(null);
          return;
        }
        const selectedCells: {pos:number, rect:any}[] = [];
        const tableInfo = (() => {
          const $from = state.selection.$from;
          let tablePos=-1; let tableNode:any=null;
          for (let d=$from.depth; d>0; d--) { const n=$from.node(d); if (n.type.name==='table'){ tableNode=n; tablePos=$from.before(d); break; } }
          return { tableNode, tablePos };
        })();
        if (!tableInfo?.tableNode) return;
        const map = (TableMap as any).get(tableInfo.tableNode);
        const tableStart = tableInfo.tablePos + 1;
        const selectedCols = new Set<number>();
        sel.forEachCell((cell:any, pos:number) => {
          const rect = map.findCell(pos - tableStart);
          if (rect) {
            for (let c = rect.left; c < rect.right; c++) selectedCols.add(c);
            selectedCells.push({pos, rect});
          }
        });
        if (selectedCols.size <= 1) {
          // Only one column selected, nothing to average
          setTableMenu(null);
          return;
        }
        // Calculate total width of selected columns from first row
        const firstRow = tableInfo.tableNode.firstChild;
        let totalWidth = 0;
        const colWidths: number[] = [];
        if (firstRow) {
          firstRow.forEach((cell:any, offset:number, idx:number) => {
            const cellRect = map.findCell(offset);
            if (!cellRect) return;
            const w = cell.attrs?.colwidth?.[0] || 100;
            for (let c = cellRect.left; c < cellRect.right; c++) {
              colWidths[c] = w;
            }
          });
          selectedCols.forEach((colIdx) => {
            totalWidth += colWidths[colIdx] || 100;
          });
        } else {
          totalWidth = selectedCols.size * 100;
        }
        const avgWidth = Math.max(40, Math.floor(totalWidth / selectedCols.size));
        // For all cells in table whose column is in selectedCols, set to avgWidth
        const allCells: {pos:number, left:number, right:number}[] = [];
        tableInfo.tableNode.descendants((node:any, pos:number) => {
          if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
            const cellRect = map.findCell(pos);
            if (!cellRect) return true;
            // Check if this cell's column overlaps selected columns
            for (let c = cellRect.left; c < cellRect.right; c++) {
              if (selectedCols.has(c)) {
                allCells.push({pos: tableStart + pos, left: cellRect.left, right: cellRect.right});
                break;
              }
            }
          }
          return true;
        });
        // Deduplicate and reverse for safe setNodeMarkup
        const uniquePos = new Map<number, any>();
        allCells.forEach((c) => uniquePos.set(c.pos, c));
        const sorted = Array.from(uniquePos.values()).sort((a,b)=>b.pos-a.pos);
        let tr = state.tr;
        sorted.forEach(({pos, left, right}) => {
          const span = right - left;
          const existing = tr.doc.nodeAt(pos)?.attrs || {};
          // If cell spans multiple selected columns, width = avg*span, else avg
          const isMulti = right - left > 1;
          const newColWidth = isMulti ? Array.from({length: right-left}, () => avgWidth) : [avgWidth];
          try { tr = tr.setNodeMarkup(pos, undefined, { ...existing, colwidth: newColWidth }); } catch {}
        });
        ed.view.dispatch(tr); setTableMenu(null);
      }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⇔</span> 平均分配欄寬（僅選取範圍）</button>
      <button onClick={() => { editorRef.current?.chain().focus().deleteTable().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"><span>✕</span> 刪除表格</button>
    </div>,
    document.body
  ) : null;

    // 需求3：工具列分三組（常用/插入/版面配置），由 toolbarTab 決定顯示哪組
  const homeTools = (
    <>
      <TB icon="↩" title={t("tiptap.undo") || "Undo"} disabled={disabled || !toolbarState.canUndo} onClick={() => editorRef.current?.chain().focus().undo().run()} />
      <TB icon="↪" title={t("tiptap.redo") || "Redo"} disabled={disabled || !toolbarState.canRedo} onClick={() => editorRef.current?.chain().focus().redo().run()} />
      <Sep />
      {variant === "rich" && (<>
        <select value={toolbarState.h1 ? "h1" : toolbarState.h2 ? "h2" : toolbarState.h3 ? "h3" : "normal"} disabled={disabled} title={t("tiptap.style") || "Style"}
          onChange={(e) => {
            const ed = editorRef.current; if (!ed) return; const v = e.target.value;
            if (v === "normal") { if (ed.isActive("heading")) ed.chain().focus().toggleHeading({ level: ed.getAttributes("heading").level || 1 }).run(); }
            else if (v === "h1") { if (!ed.isActive("heading", { level: 1 })) ed.chain().focus().toggleHeading({ level: 1 }).run(); }
            else if (v === "h2") { if (!ed.isActive("heading", { level: 2 })) ed.chain().focus().toggleHeading({ level: 2 }).run(); }
            else if (v === "h3") { if (!ed.isActive("heading", { level: 3 })) ed.chain().focus().toggleHeading({ level: 3 }).run(); }
          }}
          className="rounded px-1 py-0.5 text-[11px] bg-transparent disabled:cursor-not-allowed disabled:opacity-40 max-w-[80px]" style={{ border: "1px solid transparent", color: "var(--color-text)" }}>
          <option value="normal">{t("tiptap.style.normal") || "Normal"}</option>
          <option value="h1">{t("tiptap.h1") || "Heading 1"}</option>
          <option value="h2">{t("tiptap.h2") || "Heading 2"}</option>
          <option value="h3">{t("tiptap.h3") || "Heading 3"}</option>
        </select>
        <select value={toolbarState.fontFamily || ""} disabled={disabled} title={t("tiptap.fontFamily")}
          onChange={(e) => { const v = e.target.value; const c = editorRef.current?.chain().focus(); if (!c) return; if (v) c.setFontFamily(v).run(); else c.unsetFontFamily().run(); }}
          className="rounded px-1 py-0.5 text-[11px] bg-transparent disabled:cursor-not-allowed disabled:opacity-40 max-w-[100px]" style={{ border: "1px solid transparent", color: "var(--color-text)" }}>
          <option value="">{t("tiptap.fontFamily.default")}</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Courier New', monospace">Courier New</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="'Noto Sans TC', sans-serif">Noto Sans TC</option>
        </select>
        <div className="flex items-center">
          <button type="button" title="-" disabled={disabled || currentFontSize <= 8} onMouseDown={(e) => { e.preventDefault(); handleFontSizeChange(currentFontSize - (currentFontSize <= 12 ? 1 : 2)); }} className="w-5 h-6 flex items-center justify-center text-[12px] hover:bg-zinc-200 rounded disabled:opacity-30" style={{ color: "var(--color-text)" }}>−</button>
          <input type="text" value={currentFontSize} disabled={disabled} onChange={(e) => { const val = parseInt(e.target.value, 10); if (!isNaN(val)) handleFontSizeChange(val); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFontSizeChange(currentFontSize); } }} className="w-8 h-6 text-center text-[11px] bg-transparent outline-none disabled:opacity-40" style={{ color: "var(--color-text)" }} />
          <button type="button" title="+" disabled={disabled || currentFontSize >= 72} onMouseDown={(e) => { e.preventDefault(); handleFontSizeChange(currentFontSize + (currentFontSize >= 24 ? 4 : 2)); }} className="w-5 h-6 flex items-center justify-center text-[12px] hover:bg-zinc-200 rounded disabled:opacity-30" style={{ color: "var(--color-text)" }}>+</button>
        </div>
        <select
          value={toolbarState.textAlign}
          disabled={disabled}
          title="對齊方式"
          onChange={(e) => {
            const v = e.target.value as "left" | "center" | "right" | "justify";
            editorRef.current?.chain().focus().setTextAlign(v).run();
          }}
          className="rounded px-1 py-0.5 text-[11px] bg-transparent disabled:cursor-not-allowed disabled:opacity-40 max-w-[80px]"
          style={{ border: "1px solid transparent", color: "var(--color-text)" }}
        >
          <option value="left">向左對齊</option>
          <option value="center">置中</option>
          <option value="right">向右對齊</option>
          <option value="justify">兩端對齊</option>
        </select>
      </>)}
      <TB label="B" title={t("tiptap.bold")} active={toolbarState.bold} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleBold().run()} />
      <TB label="I" title={t("tiptap.italic")} active={toolbarState.italic} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleItalic().run()} />
      <TB icon={<span style={{ textDecoration: "underline" }}>U</span>} title={t("tiptap.underline")} active={toolbarState.underline} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleUnderline().run()} />
      <TB icon={<span style={{ textDecoration: "line-through" }}>S</span>} title="Strikethrough" active={toolbarState.strike} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleStrike().run()} />
      {variant === "rich" && (<>
        <ColorPaletteButton icon={<span className="text-[11px] font-bold leading-none">A</span>} title={t("tiptap.textColor")} currentColor={toolbarState.color || ""} onColorChange={(color: string) => { if (color) editorRef.current?.chain().focus().setColor(color).run(); else editorRef.current?.chain().focus().unsetColor().run(); }} disabled={disabled} />
        <ColorPaletteButton icon={<span className="text-[11px] leading-none">🖍</span>} title={t("tiptap.highlight")} currentColor={toolbarState.highlightColor || ""} onColorChange={(color: string) => { if (color) editorRef.current?.chain().focus().toggleHighlight({ color }).run(); else editorRef.current?.chain().focus().unsetHighlight().run(); }} disabled={disabled} />
      </>)}
      <Sep />
      <TB icon="•" title={t("tiptap.bulletList")} active={toolbarState.bulletList} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleBulletList().run()} />
      <TB icon="1." title={t("tiptap.orderedList")} active={toolbarState.orderedList} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleOrderedList().run()} />
      <TB icon="☑" title={t("tiptap.taskList")} active={toolbarState.taskList} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleTaskList().run()} />
      {variant === "rich" && (<>
        <TB icon="⇤" title="Decrease indent" disabled={disabled} onClick={() => { const ed = editorRef.current; if (!ed) return; if (ed.isActive("listItem")) ed.chain().focus().liftListItem("listItem").run(); }} />
        <TB icon="⇥" title="Increase indent" disabled={disabled} onClick={() => { const ed = editorRef.current; if (!ed) return; if (ed.isActive("listItem")) ed.chain().focus().sinkListItem("listItem").run(); }} />
      </>)}
      <Sep />
      <TB icon="❝" title={t("tiptap.quote")} active={toolbarState.blockquote} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleBlockquote().run()} />
      <TB icon="{ }" title={t("tiptap.codeBlock")} active={toolbarState.codeBlock} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleCodeBlock().run()} />
      <Sep />
      <TB icon="Tx" title={t("tiptap.clear")} disabled={disabled} onClick={() => editorRef.current?.chain().focus().unsetAllMarks().clearNodes().run()} />
    </>
  );

  const insertTools = (
    <>
      <TableGridPicker editor={editorRef.current} disabled={disabled} />
      <TB icon="🔗" title={t("tiptap.link")} active={toolbarState.link} disabled={disabled} onClick={handleSetLink} />
      <TB icon="🖼" title={t("tiptap.image")} disabled={disabled} onClick={handleInsertImage} />
      <ToolbarDropdown label="" icon="➕" variant="inline" disabled={disabled}
        items={[
          { id: "insert-callout", icon: "💡", label: t("tiptap.label.callout"), onClick: () => editorRef.current?.chain().focus().setCallout("info").run() },
          { id: "insert-inline-math", icon: "x²", label: t("tiptap.label.inlineMath"), onClick: handleInsertInlineMath },
          { id: "insert-block-math", icon: "∑", label: t("tiptap.label.blockMath"), onClick: handleInsertBlockMath },
        ]} />
      {toolbarState.callout && (<TB icon="✕C" title={t("tiptap.callout")} disabled={disabled} onClick={() => editorRef.current?.chain().focus().unsetCallout().run()} />)}
      <Sep />
      <TB icon="⛶" title="插入分頁符（A4 分頁用）" disabled={disabled} onClick={() => (editorRef.current as any)?.chain().focus().setPageBreak().run()} />
    </>
  );

  const layoutTools = (
    <>
      {variant === "rich" && (<>
        <select
          value={toolbarState.multiColumn ? "2" : "1"}
          disabled={disabled}
          title="分欄"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "1") (editorRef.current as any)?.chain().focus().unsetMultiColumn().run();
            else if (v === "2") (editorRef.current as any)?.chain().focus().setMultiColumn(2).run();
            else if (v === "3") (editorRef.current as any)?.chain().focus().setMultiColumn(3).run();
          }}
          className="rounded px-1 py-0.5 text-[11px] bg-transparent disabled:cursor-not-allowed disabled:opacity-40 max-w-[70px]"
          style={{ border: "1px solid transparent", color: "var(--color-text)" }}
        >
          <option value="1">單欄</option>
          <option value="2">2欄</option>
          <option value="3">3欄</option>
        </select>
        <button
          type="button"
          title="文字排列方向（點擊切換直/橫，主要用於儲存格）"
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); (editorRef.current as any)?.chain().focus().toggleWritingMode().run(); }}
          className="rounded w-6 h-6 flex items-center justify-center text-[11px] hover:bg-zinc-200 disabled:opacity-30"
          style={{ color: "var(--color-text)" }}
        >
          ↕️
        </button>
        <Sep />
      </>)}
      {onMarginsChange && (
        <>
          <Sep />
          <button
            ref={marginsBtnRef}
            type="button"
            title="頁面邊界（Word 版面配置→邊界）"
            disabled={disabled}
            onClick={() => { updateMarginsPos(); setMarginsPanelOpen((v) => !v); }}
            className="rounded flex items-center justify-center px-2 h-[30px] text-[11px] font-medium hover:bg-zinc-200 disabled:opacity-30 border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: marginsPanelOpen ? "var(--color-border)" : "transparent" }}
          >
            ▦ 邊界
          </button>
        </>
      )}
    </>
  );

  const toolbarJSX = (
    <div className="relative flex flex-wrap items-center gap-0.5 px-3 py-1">
      {toolbarTab === "insert" ? insertTools : toolbarTab === "layout" ? layoutTools : homeTools}
    </div>
  );

  return (
    <>
      {showToolbar && (toolbarTarget ? createPortal(toolbarJSX, toolbarTarget) : toolbarJSX)}
      {marginsMenu}
      {textContextMenu}
      {tableContextMenu}
      <style>{`
        .nexus-tiptap-editor { margin-left: -56px; padding-left: 56px; }
        .nexus-paged-content .nexus-tiptap-editor { margin-left: 0 !important; padding-left: 0 !important; }
        .nexus-tiptap-editor ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
        .nexus-tiptap-editor ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
        .nexus-tiptap-editor li { margin: 0.25rem 0; padding-left: 0.25rem; }
        .nexus-tiptap-editor li p { margin: 0; }
        .nexus-tiptap-editor ul[data-type="taskList"] { list-style: none; padding-left: 0; margin: 0.75rem 0; }
        .nexus-tiptap-editor ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; padding-left: 0; }
        .nexus-tiptap-editor ul[data-type="taskList"] li > label { flex-shrink: 0; margin-top: 0.2rem; user-select: none; }
        .nexus-tiptap-editor ul[data-type="taskList"] li > div { flex: 1 1 auto; }
        .nexus-tiptap-editor ul[data-type="taskList"] li[data-checked="true"] > div { opacity: 0.55; text-decoration: line-through; }
        .nexus-tiptap-editor a { color: var(--color-link, #2563eb); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
        .nexus-tiptap-editor img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
        .nexus-callout { position: relative; border-radius: 0.6rem; margin: 1rem 0; padding: 0.75rem 1rem; }
        .nexus-callout-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
        .nexus-callout-icon-button { border: none; background: transparent; font-size: 1.1rem; cursor: pointer; padding: 0.15rem 0.3rem; border-radius: 0.4rem; }
        .nexus-callout-icon-button:hover { background: rgba(0,0,0,0.06); }
        .nexus-callout-variant-select { font-size: 0.7rem; border: 1px solid var(--color-border); border-radius: 0.4rem; padding: 0.1rem 0.3rem; background: transparent; color: inherit; opacity: 0.7; }
        .nexus-callout-icon-menu { position: absolute; top: 2.2rem; left: 0.75rem; z-index: 20; flex-wrap: wrap; gap: 0.25rem; max-width: 220px; padding: 0.5rem; border-radius: 0.6rem; background: var(--color-bg); border: 1px solid var(--color-border); box-shadow: 0 4px 14px rgba(0,0,0,0.12); }
        .nexus-callout-icon-choice { border: none; background: transparent; font-size: 1.05rem; cursor: pointer; padding: 0.2rem 0.35rem; border-radius: 0.35rem; }
        .nexus-callout-icon-choice:hover { background: rgba(0,0,0,0.06); }
        .nexus-callout-icon-remove { font-size: 0.7rem; width: 100%; text-align: left; opacity: 0.6; }
        .nexus-callout-content > *:last-child { margin-bottom: 0; }
        .nexus-tiptap-editor .tiptap-mathematics-render[data-type="block-math"] { display: block; margin: 1rem 0; padding: 0.75rem 1rem; border-radius: 0.6rem; overflow-x: auto; text-align: center; background: rgba(0,0,0,0.03); border: 1px solid var(--color-border); }
        .nexus-tiptap-editor .tiptap-mathematics-render[data-type="inline-math"] { display: inline-block; padding: 0 0.15rem; border-radius: 0.3rem; }
        .nexus-tiptap-editor .tiptap-mathematics-render--editable { cursor: pointer; }
        .nexus-tiptap-editor .tiptap-mathematics-render--editable:hover { background: rgba(37,99,235,0.06); }
        .nexus-tiptap-editor table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 1rem 0; overflow: hidden; }
        .nexus-tiptap-editor table td, .nexus-tiptap-editor table th { border: 1px solid var(--color-border); padding: 0.4rem 0.6rem; vertical-align: top; position: relative; min-width: 1em; }
        .nexus-tiptap-editor table th { background: rgba(0,0,0,0.04); font-weight: 600; text-align: left; }
        .nexus-tiptap-editor table td p, .nexus-tiptap-editor table th p { margin: 0; }
        .nexus-tiptap-editor table .selectedCell { background: rgba(37,99,235,0.08); }
        .nexus-tiptap-editor table .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background-color: #2563eb; pointer-events: none; }
        .nexus-tiptap-editor .tableWrapper { overflow-x: auto; }
        .nexus-tiptap-editor .resize-cursor { cursor: col-resize; }
        .nexus-tiptap-editor blockquote { border-left: 3px solid var(--color-border); margin: 1rem 0; padding-left: 1rem; opacity: 0.8; }
        .nexus-tiptap-editor pre { border: 1px solid var(--color-border); border-radius: 0.75rem; margin: 1rem 0; padding: 0.9rem 1rem; overflow-x: auto; background: rgba(0,0,0,0.04); }
        .nexus-tiptap-editor code { border-radius: 0.35rem; padding: 0.1rem 0.3rem; background: rgba(0,0,0,0.06); font-size: 0.92em; }
        .nexus-tiptap-editor pre code { padding: 0; background: transparent; }
        .nexus-tiptap-editor h1 { font-size: 2rem; line-height: 1.2; font-weight: 700; margin: 1.4rem 0 0.7rem; }
        .nexus-tiptap-editor h2 { font-size: 1.5rem; line-height: 1.3; font-weight: 700; margin: 1.2rem 0 0.6rem; }
        .nexus-tiptap-editor h3 { font-size: 1.2rem; line-height: 1.35; font-weight: 650; margin: 1rem 0 0.5rem; }
        .nexus-drag-handle { position: absolute; display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 0.4rem; cursor: grab; color: var(--color-sidebar-text, #4a4a4a); background: transparent; font-size: 0.95rem; user-select: none; transition: background-color 0.12s ease, opacity 0.12s ease; }
        .nexus-drag-handle:hover { background: rgba(0,0,0,0.08); }
        .nexus-drag-handle:active { cursor: grabbing; background: rgba(0,0,0,0.14); }
        .nexus-page-break { border: none; border-top: 2px dashed #94a3b8; margin: 24px 0; position: relative; height: 2px; }
        .nexus-page-break::after { content: "分頁符"; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: white; padding: 0 8px; font-size: 10px; color: #94a3b8; }
        .nexus-multi-column { display: grid; gap: 16px; margin: 1rem 0; padding: 0.5rem; border: 1px dashed var(--color-border); border-radius: 8px; }
        .nexus-column { min-width: 0; }
      `}</style>
      <div ref={ref} className="w-full min-h-[400px] outline-none text-base" style={{ color: "var(--color-text)", fontFamily: "inherit", lineHeight: "1.6" }} />
    </>
  );
}

````

## File: src/components/TodoView.tsx
````
"use client";
import { useState, useMemo } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function endOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0); }
function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }

export default function TodoView({
  pages,
  onCreate,
  onUpdate,
  onDelete,
  onSelectPage,
}: {
  pages: Page[];
  onCreate: (title: string, dueDate?: number) => void;
  onUpdate: (id: string, patch: Partial<Page>) => void;
  onDelete: (id: string) => void;
  onSelectPage: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const todos = useMemo(() => pages.filter((p) => (p.kind as any) === "todo").sort((a, b) => (a.due_date || 0) - (b.due_date || 0)), [pages]);

  const today = new Date();
  today.setHours(0,0,0,0);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days: Date[] = [];
    const startWeekday = start.getDay();
    for (let i = 0; i < startWeekday; i++) days.push(addDays(start, -startWeekday + i));
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push(addDays(end, i));
    return days;
  }, [currentMonth]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, Page[]>();
    todos.forEach((todo) => {
      if (!todo.due_date) return;
      const d = new Date(todo.due_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(todo);
    });
    return map;
  }, [todos]);

  const handleAdd = () => {
    const title = input.trim();
    if (!title) return;
    onCreate(title, selectedDate.getTime());
    setInput("");
  };

  return (
    <main className="flex flex-col flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Calendar */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[700px] mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-semibold">✅ {t("todo.title")}</h1>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentMonth(addDays(startOfMonth(currentMonth), -30))} className="rounded border px-2 py-1 text-xs hover:bg-zinc-100">←</button>
                <span className="text-sm font-medium">{currentMonth.getFullYear()} / {currentMonth.getMonth() + 1}</span>
                <button onClick={() => setCurrentMonth(addDays(startOfMonth(currentMonth), 32))} className="rounded border px-2 py-1 text-xs hover:bg-zinc-100">→</button>
              </div>
            </div>

            <div className="mb-4 rounded-xl border p-3 flex gap-2" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder={`新增任務到 ${selectedDate.toLocaleDateString()}`} className="flex-1 bg-transparent outline-none text-sm" />
              <button onClick={handleAdd} className="rounded-md px-4 py-1.5 text-sm bg-zinc-800 text-white hover:bg-zinc-700">新增</button>
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}>
              <div className="grid grid-cols-7 text-[11px] opacity-60 border-b p-2" style={{ borderColor: "var(--color-border)" }}>
                {["日","一","二","三","四","五","六"].map((d) => <div key={d} className="text-center">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-zinc-200">
                {calendarDays.map((d, i) => {
                  const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
                  const isToday = d.toDateString() === new Date().toDateString();
                  const isSelected = d.toDateString() === selectedDate.toDateString();
                  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                  const dayTodos = todosByDate.get(key) || [];
                  return (
                    <div key={i} onClick={() => setSelectedDate(d)} className={`min-h-[80px] p-1.5 bg-white cursor-pointer hover:bg-zinc-50 ${!isCurrentMonth ? "opacity-30" : ""} ${isSelected ? "ring-2 ring-blue-400 ring-inset" : ""} ${isToday ? "bg-blue-50" : ""}`}>
                      <div className="text-xs font-medium">{d.getDate()}</div>
                      <div className="mt-1 space-y-0.5">
                        {dayTodos.slice(0,3).map((td) => (
                          <div key={td.id} className={`text-[10px] truncate rounded px-1 py-0.5 ${td.completed ? "bg-green-100 text-green-700 line-through" : "bg-amber-100 text-amber-800"}`}>{td.title}</div>
                        ))}
                        {dayTodos.length > 3 && <div className="text-[9px] opacity-50">+{dayTodos.length - 3} 更多</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">📅 {selectedDate.toLocaleDateString()} 的任務</h3>
              {todos.filter((td) => td.due_date && new Date(td.due_date).toDateString() === selectedDate.toDateString()).length === 0 ? (
                <div className="text-xs opacity-40 py-4 text-center">此日無任務</div>
              ) : (
                <div className="space-y-2">
                  {todos.filter((td) => td.due_date && new Date(td.due_date).toDateString() === selectedDate.toDateString()).map((td) => (
                    <div key={td.id} className="flex items-center gap-2 rounded-lg border p-3 hover:shadow-sm" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
                      <input type="checkbox" checked={!!td.completed} onChange={(e) => onUpdate(td.id, { completed: e.target.checked })} />
                      <span className={`flex-1 text-sm ${td.completed ? "line-through opacity-50" : ""}`} onClick={() => onSelectPage(td.id)}>{td.title}</span>
                      <button onClick={() => onDelete(td.id)} className="text-xs opacity-40 hover:text-red-600">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Todo list overview */}
        <div className="w-[280px] border-l overflow-y-auto p-4 space-y-4" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
          <div>
            <h4 className="text-xs font-semibold uppercase opacity-60 mb-2">今天</h4>
            {todos.filter((td) => td.due_date && new Date(td.due_date).toDateString() === new Date().toDateString() && !td.completed).length === 0 ? <div className="text-xs opacity-40">無</div> :
              todos.filter((td) => td.due_date && new Date(td.due_date).toDateString() === new Date().toDateString() && !td.completed).map((td) => (
                <div key={td.id} className="text-xs p-2 rounded bg-white border mb-1 truncate">{td.title}</div>
              ))}
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase opacity-60 mb-2">即將到來</h4>
            {todos.filter((td) => !td.completed).slice(0,5).map((td) => (
              <div key={td.id} className="text-xs p-2 rounded bg-white border mb-1 flex justify-between"><span className="truncate">{td.title}</span><span className="opacity-40 text-[10px]">{td.due_date ? new Date(td.due_date).toLocaleDateString() : ""}</span></div>
            ))}
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase opacity-60 mb-2">已完成</h4>
            {todos.filter((td) => td.completed).slice(0,5).map((td) => (
              <div key={td.id} className="text-xs p-2 rounded bg-zinc-100 border mb-1 line-through opacity-60">{td.title}</div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
````

## File: src/components/ToolbarDropdown.tsx
````
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export interface ToolbarDropdownItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
}

export default function ToolbarDropdown({
  label,
  icon,
  items,
  variant = "block",
  disabled,
}: {
  label: string;
  icon?: string;
  items: ToolbarDropdownItem[];
  variant?: "block" | "inline";
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 192 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const isInline = variant === "inline";
    const w = isInline ? 220 : 260;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (top + 300 > window.innerHeight - 8) {
      top = rect.top - 300 - 6;
      if (top < 8) top = 8;
    }
    setPos({ top, left, width: w });
  }, [variant]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (popupRef.current && popupRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const onResize = () => updatePosition();
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, updatePosition]);

  const isInline = variant === "inline";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={
          isInline
            ? "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            : "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-zinc-200 active:scale-[0.99]"
        }
        style={{
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
          backgroundColor: isOpen ? "var(--color-border)" : "transparent",
        }}
      >
        <span className="flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          <span>{label}</span>
        </span>
        <span className="opacity-50 text-[10px] ml-1">▾</span>
      </button>
      {mounted && isOpen && createPortal(
        <div
          ref={popupRef}
          className="rounded-xl overflow-hidden shadow-2xl z-[9999]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="max-h-[360px] overflow-y-auto p-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md transition-all hover:bg-zinc-100"
                style={{ color: "var(--color-text)" }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

````

## File: src/contexts/WorkspaceContext.tsx
````
"use client";
import { createContext, useContext, ReactNode } from "react";
import type { useUiModes } from "../hooks/useUiModes";
import type { usePagesStorage } from "../hooks/usePagesStorage";

export type WorkspaceContextType = {
  ui: ReturnType<typeof useUiModes>;
  storage: ReturnType<typeof usePagesStorage>;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ value, children }: { value: WorkspaceContextType, children: ReactNode }) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

````

## File: src/hooks/usePagesStorage.ts
````
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { IndexedDBAdapter } from "../lib/IndexedDBAdapter";
import type { Page, Attachment } from "../lib/types";
import type { StorageAdapter } from "../lib/StorageAdapter";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { SyncEngine, type SyncState } from "../lib/syncEngine";
import { detectDefaultLanguage, type Language } from "../lib/i18n";

/**
 * Phase B9: Extract pages storage logic from NexusApp (1198 lines)
 * This hook encapsulates init, pages, trash, attachments, sync
 * Currently used as reference, NexusApp still has its own states for backward compat
 * Future: NexusApp will use this hook directly to reduce size
 */

export function usePagesStorage(onLanguageLoaded: (lang: Language) => void, onThemeChange: (t: "light" | "dark") => void) {
  const storageRef = useRef<StorageAdapter | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle", lastSyncAt: 0, error: null, pendingPushes: 0 });

  useEffect(() => {
    let cancelled = false;
    const adapter = new IndexedDBAdapter();
    async function init() {
      await adapter.init();
      if (cancelled) return;
      storageRef.current = adapter;
      let allPages = await adapter.listPages();
      let allAttachments = await adapter.listAttachments();
      setPages(allPages);
      setAttachments(allAttachments);
      const savedLanguage = await adapter.getLanguagePreference();
      if (savedLanguage === "en" || savedLanguage === "zh-TW") onLanguageLoaded(savedLanguage as any);
      else onLanguageLoaded(detectDefaultLanguage() as any);
      const savedTheme = await adapter.getThemePreference();
      if (savedTheme === "dark" || savedTheme === "light") onThemeChange(savedTheme as any);
      setIsReady(true);
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        if (supabase) {
          const deviceId = await adapter.getDeviceId();
          const engine = new SyncEngine(supabase, adapter, deviceId);
          syncEngineRef.current = engine;
          engine.subscribe(setSyncState);
          engine.setOnRemoteChange(async () => {
            const syncedPages = await adapter.listPages();
            const syncedAttachments = await adapter.listAttachments();
            setPages(syncedPages);
            setAttachments(syncedAttachments);
          });
          await engine.fullSync();
          if (cancelled) return;
          allPages = await adapter.listPages();
          allAttachments = await adapter.listAttachments();
          setPages(allPages);
          setAttachments(allAttachments);
          engine.startRealtime();
        }
      }
    }
    init().catch((e) => { console.error(e); setIsReady(true); });
    return () => {
      cancelled = true;
      syncEngineRef.current?.destroy();
      adapter.close?.();
    };
  }, []);

  return {
    storageRef,
    syncEngineRef,
    isReady,
    pages,
    setPages,
    trashPages,
    setTrashPages,
    attachments,
    setAttachments,
    syncState,
  };
}
````

## File: src/hooks/useUiModes.ts
````
"use client";
import { useState, useCallback } from "react";

export type UiMode = "home" | "projects" | "trash" | "quickNotes" | "todos";

export function useUiModes() {
  const [mode, setMode] = useState<UiMode>("home");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const showHome = useCallback(() => setMode("home"), []);
  const showProjects = useCallback(() => setMode("projects"), []);
  const showTrash = useCallback(() => setMode("trash"), []);
  const showQuickNotes = useCallback(() => setMode("quickNotes"), []);
  const showTodos = useCallback(() => setMode("todos"), []);

  return {
    mode,
    isHomeMode: mode === "home",
    isTrashMode: mode === "trash",
    isQuickNoteMode: mode === "quickNotes",
    isTodoMode: mode === "todos",
    isProjectsMode: mode === "projects",
    isSidebarCollapsed,
    isRightPanelCollapsed,
    isCommandPaletteOpen,
    setIsSidebarCollapsed,
    setIsRightPanelCollapsed,
    setIsCommandPaletteOpen,
    showHome,
    showProjects,
    showTrash,
    showQuickNotes,
    showTodos,
    setMode,
  };
}
````

## File: src/lib/IndexedDBAdapter.ts
````
import { openDB, type IDBPDatabase } from "idb";
import { nanoid } from "nanoid";
import type {
  ID, Page, PageQuery, CreatePageInput, Attachment,
  WorkspaceBackup, WorkspaceBackupAttachmentEntry, WorkspaceBackupSettingEntry,
} from "./types";
import type { StorageAdapter } from "./StorageAdapter";

const DB_NAME = "nexus";
const DB_VERSION = 3;
const BACKUP_SCHEMA_VERSION = 1;

function newPageId(): ID { return `page_${nanoid()}`; }
function newBlockId(): ID { return `blk_${nanoid()}`; }
function newAttachmentId(): ID { return `att_${nanoid()}`; }
function newQuickNoteId(): ID { return `qn_${nanoid()}`; }
function newTodoId(): ID { return `todo_${nanoid()}`; }

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBPDatabase | null = null;
  private deviceId: ID = `dev_${nanoid()}`;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("pages")) {
          const store = db.createObjectStore("pages", { keyPath: "id" });
          store.createIndex("by_updated", "updated_at");
          store.createIndex("by_deleted", "deleted_at");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("attachments")) {
          const store = db.createObjectStore("attachments", { keyPath: "id" });
          store.createIndex("by_updated", "updated_at");
          store.createIndex("by_deleted", "deleted_at");
          store.createIndex("by_kind", "kind");
        }
        if (!db.objectStoreNames.contains("binaries")) {
          db.createObjectStore("binaries", { keyPath: "id" });
        }
        // Phase C5: independent stores for quick notes and todos
        if (!db.objectStoreNames.contains("quick_notes")) {
          const store = db.createObjectStore("quick_notes", { keyPath: "id" });
          store.createIndex("by_updated", "updated_at");
        }
        if (!db.objectStoreNames.contains("todos")) {
          const store = db.createObjectStore("todos", { keyPath: "id" });
          store.createIndex("by_updated", "updated_at");
          store.createIndex("by_due", "due_date");
        }
      },
    });

    // Migration: move quick_note and todo kind pages from pages store to new stores (once)
    try {
      const allPages = await this.db.getAll("pages");
      const quickNotesToMigrate = allPages.filter((p: any) => p.kind === "quick_note" || p.folder === "QuickNotes");
      const todosToMigrate = allPages.filter((p: any) => p.kind === "todo");
      if (quickNotesToMigrate.length > 0 || todosToMigrate.length > 0) {
        const tx = this.db.transaction(["pages", "quick_notes", "todos"], "readwrite");
        for (const qn of quickNotesToMigrate) {
          // Only migrate if not already in quick_notes
          const existing = await tx.objectStore("quick_notes").get(qn.id);
          if (!existing) {
            await tx.objectStore("quick_notes").put({
              id: qn.id,
              title: qn.title,
              content_text: qn.content_text || "",
              content_json: qn.content_json || { type: "doc", content: [{ type: "paragraph" }] },
              color: (qn as any).color || null,
              created_at: qn.created_at,
              updated_at: qn.updated_at,
              device_id: qn.device_id,
            });
            // Optionally keep in pages for backward compat or delete? We keep for now but mark? We will leave pages as is for safety, but new code will use quick_notes store primarily.
          }
        }
        for (const td of todosToMigrate) {
          const existing = await tx.objectStore("todos").get(td.id);
          if (!existing) {
            await tx.objectStore("todos").put({
              id: td.id,
              title: td.title,
              completed: (td as any).completed || false,
              due_date: (td as any).due_date || null,
              priority: (td as any).priority || null,
              created_at: td.created_at,
              updated_at: td.updated_at,
              device_id: td.device_id,
            });
          }
        }
        await tx.done;
      }
    } catch (e) {
      console.warn("Quick notes / todos migration warning", e);
    }
  }

  async getPage(id: ID): Promise<Page | null> {
    if (!this.db) throw new Error("DB not initialized");
    return (await this.db.get("pages", id)) ?? null;
  }

  async listPages(query?: PageQuery): Promise<Page[]> {
    if (!this.db) throw new Error("DB not initialized");
    const all = await this.db.getAllFromIndex("pages", "by_updated");
    const visible = all.reverse();
    if (!query?.includeDeleted) return visible.filter((p) => p.deleted_at === null);
    return visible;
  }

  async savePage(page: Page): Promise<Page> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("pages", page);
    return page;
  }

  async createPage(input?: CreatePageInput): Promise<Page> {
    if (!this.db) throw new Error("DB not initialized");
    const now = Date.now();
    const page: Page = {
      id: newPageId(),
      title: input?.title ?? "Untitled",
      content_json: { type: "doc", content: [{ type: "paragraph", attrs: { id: newBlockId() } }] },
      content_text: "",
      tags: input?.tags ?? [],
      folder: input?.folder ?? null,
      links: [],
      attachment_ids: input?.attachment_ids ?? [],
      primary_attachment_id: input?.primary_attachment_id ?? null,
      default_mode: "note",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      revision: 1,
      device_id: this.deviceId,
      kind: input?.kind ?? "note",
      study_items: input?.kind === "study_set" ? [] : undefined,
      presentation_data: input?.kind === "presentation" ? { theme: "minimal", slides: [] } : undefined,
      format: input?.format ?? (input?.kind === "presentation" ? "16:9" : "flow"),
      sort_order: input?.sort_order,
      parent_id: input?.parent_id ?? null,
    };
    await this.db.put("pages", page);
    return page;
  }

  async deletePage(id: ID): Promise<void> {
    const page = await this.getPage(id);
    if (!page) return;
    page.deleted_at = Date.now();
    page.updated_at = Date.now();
    page.revision += 1;
    page.device_id = this.deviceId;
    await this.savePage(page);
  }

  async restorePage(id: ID): Promise<Page> {
    const page = await this.getPage(id);
    if (!page) throw new Error("Page not found");
    page.deleted_at = null;
    page.updated_at = Date.now();
    page.revision += 1;
    page.device_id = this.deviceId;
    await this.savePage(page);
    return page;
  }

  async permanentDeletePage(id: ID): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.delete("pages", id);
    const activeId = await this.getActivePageId();
    if (activeId === id) await this.setActivePageId(null);
  }

  async getActivePageId(): Promise<ID | null> {
    if (!this.db) throw new Error("DB not initialized");
    const record = await this.db.get("settings", "active_page_id");
    return record?.value ?? null;
  }

  async setActivePageId(id: ID | null): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (id === null) await this.db.delete("settings", "active_page_id");
    else await this.db.put("settings", { key: "active_page_id", value: id });
  }

  async getDeviceId(): Promise<ID> { return this.deviceId; }

  async getLanguagePreference(): Promise<string | null> {
    if (!this.db) throw new Error("DB not initialized");
    const record = await this.db.get("settings", "language_preference");
    return record?.value ?? null;
  }

  async setLanguagePreference(language: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("settings", { key: "language_preference", value: language });
  }

  async getThemePreference(): Promise<string | null> {
    if (!this.db) throw new Error("DB not initialized");
    const record = await this.db.get("settings", "theme_preference");
    return record?.value ?? null;
  }

  async setThemePreference(theme: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("settings", { key: "theme_preference", value: theme });
  }

  async getPageNightAdaptPreference(): Promise<boolean | null> {
    if (!this.db) throw new Error("DB not initialized");
    const record = await this.db.get("settings", "page_night_adapt");
    return record?.value ?? null;
  }

  async setPageNightAdaptPreference(adapt: boolean): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("settings", { key: "page_night_adapt", value: adapt });
  }

  async listAttachments(): Promise<Attachment[]> {
    if (!this.db) throw new Error("DB not initialized");
    const all = await this.db.getAllFromIndex("attachments", "by_updated");
    return all.reverse().filter((a) => a.deleted_at === null);
  }

  async getAttachment(id: ID): Promise<Attachment | null> {
    if (!this.db) throw new Error("DB not initialized");
    return (await this.db.get("attachments", id)) ?? null;
  }

  async saveAttachment(attachment: Attachment): Promise<Attachment> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("attachments", attachment);
    return attachment;
  }

  async deleteAttachment(id: ID): Promise<void> {
    const attachment = await this.getAttachment(id);
    if (!attachment) return;
    attachment.deleted_at = Date.now();
    attachment.updated_at = Date.now();
    attachment.device_id = this.deviceId;
    await this.saveAttachment(attachment);
  }

  async attachBinary(attachmentId: ID, blob: Blob): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("binaries", { id: attachmentId, blob, updated_at: Date.now() });
  }

  async readBinary(attachmentId: ID): Promise<Blob | null> {
    if (!this.db) throw new Error("DB not initialized");
    const record = await this.db.get("binaries", attachmentId);
    return record?.blob ?? null;
  }

  async createAttachment(input: { kind: Attachment["kind"]; name: string; mime_type: string; size_bytes: number; page_count?: number }): Promise<Attachment> {
    if (!this.db) throw new Error("DB not initialized");
    const now = Date.now();
    const attachment: Attachment = {
      id: newAttachmentId(),
      kind: input.kind,
      name: input.name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      storage_key: `bin_${nanoid()}`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: this.deviceId,
      page_count: input.page_count,
    };
    await this.db.put("attachments", attachment);
    return attachment;
  }

  // Quick Notes independent store
  async listQuickNotes(): Promise<any[]> {
    if (!this.db) throw new Error("DB not initialized");
    if (!this.db.objectStoreNames.contains("quick_notes")) return [];
    const all = await this.db.getAllFromIndex("quick_notes", "by_updated");
    return all.reverse();
  }

  async saveQuickNote(note: any): Promise<any> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("quick_notes", note);
    return note;
  }

  async deleteQuickNote(id: any): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (!this.db.objectStoreNames.contains("quick_notes")) return;
    await this.db.delete("quick_notes", id);
  }

  // Todos independent store
  async listTodos(): Promise<any[]> {
    if (!this.db) throw new Error("DB not initialized");
    if (!this.db.objectStoreNames.contains("todos")) return [];
    const all = await this.db.getAllFromIndex("todos", "by_updated");
    return all.reverse();
  }

  async saveTodo(todo: any): Promise<any> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("todos", todo);
    return todo;
  }

  async deleteTodo(id: any): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (!this.db.objectStoreNames.contains("todos")) return;
    await this.db.delete("todos", id);
  }

  async exportWorkspaceBackup(): Promise<WorkspaceBackup> {
    if (!this.db) throw new Error("DB not initialized");
    const allPages = await this.db.getAll("pages");
    const allAttachments = await this.db.getAll("attachments");
    const allSettingsRecords: WorkspaceBackupSettingEntry[] = await this.db.getAll("settings");
    const attachmentEntries: WorkspaceBackupAttachmentEntry[] = [];
    for (const attachment of allAttachments) {
      const binaryRecord = await this.db.get("binaries", attachment.id);
      const binaryBase64 = binaryRecord?.blob ? await blobToBase64(binaryRecord.blob) : null;
      attachmentEntries.push({ attachment, binary_base64: binaryBase64 });
    }
    return {
      schema_version: BACKUP_SCHEMA_VERSION,
      exported_at: Date.now(),
      device_id: this.deviceId,
      pages: allPages,
      attachments: attachmentEntries,
      settings: allSettingsRecords,
    };
  }

  async importWorkspaceBackup(backup: WorkspaceBackup): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (!backup || typeof backup.schema_version !== "number") throw new Error("Invalid backup file.");
    if (backup.schema_version > BACKUP_SCHEMA_VERSION) throw new Error(`Backup schema_version (${backup.schema_version}) is newer than supported (${BACKUP_SCHEMA_VERSION}).`);
    const tx = this.db.transaction(["pages", "attachments", "binaries", "settings"], "readwrite");
    await tx.objectStore("pages").clear();
    await tx.objectStore("attachments").clear();
    await tx.objectStore("binaries").clear();
    await tx.objectStore("settings").clear();
    for (const page of backup.pages) await tx.objectStore("pages").put(page);
    for (const entry of backup.attachments) {
      await tx.objectStore("attachments").put(entry.attachment);
      if (entry.binary_base64) {
        const blob = base64ToBlob(entry.binary_base64, entry.attachment.mime_type || "application/octet-stream");
        await tx.objectStore("binaries").put({ id: entry.attachment.id, blob, updated_at: Date.now() });
      }
    }
    for (const setting of backup.settings) await tx.objectStore("settings").put(setting);
    await tx.done;
  }

  async close(): Promise<void> { this.db?.close(); }
}
````

## File: src/lib/LanguageContext.tsx
````
"use client";
import { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { DEFAULT_LANGUAGE, translate, type Language } from "./i18n";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLanguage,
  onLanguageChange,
  children,
}: {
  initialLanguage: Language;
  onLanguageChange?: (lang: Language) => void;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  useEffect(() => { setLanguageState(initialLanguage); }, [initialLanguage]);
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    onLanguageChange?.(lang);
  }, [onLanguageChange]);
  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(language, key, params), [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage() must be used within a LanguageProvider");
  return ctx;
}

export type { Language };
export { DEFAULT_LANGUAGE };
````

## File: src/lib/StorageAdapter.ts
````
import type { ID, Page, PageQuery, CreatePageInput, Attachment, WorkspaceBackup } from "./types";

export interface QuickNote {
  id: ID;
  title: string;
  content_text: string;
  content_json: object;
  color?: string | null;
  created_at: number;
  updated_at: number;
  device_id: ID;
}

export interface TodoItem {
  id: ID;
  title: string;
  completed: boolean;
  due_date: number | null;
  priority?: "low" | "medium" | "high" | null;
  created_at: number;
  updated_at: number;
  device_id: ID;
}

export interface StorageAdapter {
  init(): Promise<void>;
  getPage(id: ID): Promise<Page | null>;
  listPages(query?: PageQuery): Promise<Page[]>;
  savePage(page: Page): Promise<Page>;
  createPage(input?: CreatePageInput): Promise<Page>;
  deletePage(id: ID): Promise<void>;
  restorePage(id: ID): Promise<Page>;
  permanentDeletePage(id: ID): Promise<void>;
  createAttachment?(input: {
    kind: Attachment["kind"];
    name: string;
    mime_type: string;
    size_bytes: number;
    page_count?: number;
  }): Promise<Attachment>;
  getActivePageId(): Promise<ID | null>;
  setActivePageId(id: ID | null): Promise<void>;
  getDeviceId(): Promise<ID>;
  getLanguagePreference(): Promise<string | null>;
  setLanguagePreference(language: string): Promise<void>;
  getThemePreference(): Promise<string | null>;
  setThemePreference(theme: string): Promise<void>;
  getPageNightAdaptPreference?(): Promise<boolean | null>;
  setPageNightAdaptPreference?(adapt: boolean): Promise<void>;
  listAttachments(): Promise<Attachment[]>;
  getAttachment(id: ID): Promise<Attachment | null>;
  saveAttachment(attachment: Attachment): Promise<Attachment>;
  deleteAttachment(id: ID): Promise<void>;
  attachBinary(attachmentId: ID, blob: Blob): Promise<void>;
  readBinary(attachmentId: ID): Promise<Blob | null>;
  exportWorkspaceBackup?(): Promise<WorkspaceBackup>;
  importWorkspaceBackup?(backup: WorkspaceBackup): Promise<void>;
  // Quick Notes independent store (C5)
  listQuickNotes?(): Promise<QuickNote[]>;
  saveQuickNote?(note: QuickNote): Promise<QuickNote>;
  deleteQuickNote?(id: ID): Promise<void>;
  // Todos independent store (C5)
  listTodos?(): Promise<TodoItem[]>;
  saveTodo?(todo: TodoItem): Promise<TodoItem>;
  deleteTodo?(id: ID): Promise<void>;
  close?(): Promise<void>;
}
````

## File: src/lib/blockId.ts
````
/**
 * ?? client ?block-level 節點?穩? ID?? *
 * ????IndexedDBAdapter.ts ?部??newBlockId() 一??`blk_[id]`?? * ??使用?覽????crypto.randomUUID，若??不支?????fallback? * 以??戳?+ 亂數組?，確保???足??唯一?? */
export function createClientBlockId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return `blk_${uuid}`;
  }
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
````

## File: src/lib/calloutExtension.ts
````
import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "info" | "warning" | "success" | "danger" | "note";

export const CALLOUT_VARIANTS: { value: CalloutVariant; label: string; defaultIcon: string }[] = [
  { value: "info", label: "Info", defaultIcon: "💡" },
  { value: "warning", label: "Warning", defaultIcon: "⚠️" },
  { value: "success", label: "Success", defaultIcon: "✅" },
  { value: "danger", label: "Danger", defaultIcon: "⛔" },
  { value: "note", label: "Note", defaultIcon: "📝" },
];

export const CALLOUT_ICON_CHOICES = ["💡", "⚠️", "✅", "⛔", "📝", "📌", "🔥", "⭐", "💬", "📚"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant?: CalloutVariant) => ReturnType;
      unsetCallout: () => ReturnType;
      updateCalloutAttrs: (attrs: { variant?: CalloutVariant; icon?: string | null }) => ReturnType;
    };
  }
}

const VARIANT_STYLES: Record<CalloutVariant, { bg: string; border: string }> = {
  info: { bg: "rgba(37, 99, 235, 0.08)", border: "#2563eb" },
  warning: { bg: "rgba(217, 119, 6, 0.1)", border: "#d97706" },
  success: { bg: "rgba(21, 128, 61, 0.1)", border: "#15803d" },
  danger: { bg: "rgba(220, 38, 38, 0.1)", border: "#dc2626" },
  note: { bg: "rgba(82, 82, 91, 0.08)", border: "#71717a" },
};

function isCalloutVariant(value: unknown): value is CalloutVariant {
  return typeof value === "string" && CALLOUT_VARIANTS.some((v) => v.value === value);
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info" as CalloutVariant,
        parseHTML: (element) => {
          const value = element.getAttribute("data-variant");
          return isCalloutVariant(value) ? value : "info";
        },
        renderHTML: (attributes) => ({ "data-variant": attributes.variant }),
      },
      icon: {
        default: null as string | null,
        parseHTML: (element) => element.getAttribute("data-icon"),
        renderHTML: (attributes) => {
          if (attributes.icon === null || attributes.icon === undefined) return {};
          return { "data-icon": attributes.icon };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },

  addCommands() {
    return {
      setCallout: (variant: CalloutVariant = "info") => ({ commands }) => commands.toggleWrap(this.name, { variant }),
      unsetCallout: () => ({ commands }) => commands.lift(this.name),
      updateCalloutAttrs: (attrs: { variant?: CalloutVariant; icon?: string | null }) => ({ commands }) => commands.updateAttributes(this.name, attrs),
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.className = "nexus-callout";
      const header = document.createElement("div");
      header.className = "nexus-callout-header";
      header.contentEditable = "false";
      const iconButton = document.createElement("button");
      iconButton.type = "button";
      iconButton.className = "nexus-callout-icon-button";
      iconButton.title = "更換圖示";
      const menu = document.createElement("div");
      menu.className = "nexus-callout-icon-menu";
      menu.style.display = "none";
      const variantSelect = document.createElement("select");
      variantSelect.className = "nexus-callout-variant-select";
      variantSelect.title = "切換類型";
      const content = document.createElement("div");
      content.className = "nexus-callout-content";
      header.appendChild(iconButton);
      header.appendChild(variantSelect);
      dom.appendChild(header);
      dom.appendChild(menu);
      dom.appendChild(content);

      function currentVariantMeta(currentNode: typeof node) {
        const variant: CalloutVariant = isCalloutVariant(currentNode.attrs.variant) ? currentNode.attrs.variant : "info";
        const meta = CALLOUT_VARIANTS.find((v) => v.value === variant) || CALLOUT_VARIANTS[0];
        return { variant, meta };
      }
      function resolvedIcon(currentNode: typeof node) {
        const { meta } = currentVariantMeta(currentNode);
        const rawIcon = currentNode.attrs.icon;
        if (rawIcon === "") return "";
        if (typeof rawIcon === "string" && rawIcon.length > 0) return rawIcon;
        return meta.defaultIcon;
      }
      function renderMenu() {
        menu.innerHTML = "";
        CALLOUT_ICON_CHOICES.forEach((choice) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "nexus-callout-icon-choice";
          btn.textContent = choice;
          btn.addEventListener("mousedown", (event) => { event.preventDefault(); event.stopPropagation(); });
          btn.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); applyIcon(choice); menu.style.display = "none"; });
          menu.appendChild(btn);
        });
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "nexus-callout-icon-choice nexus-callout-icon-remove";
        removeBtn.textContent = "移除圖示";
        removeBtn.addEventListener("mousedown", (event) => { event.preventDefault(); event.stopPropagation(); });
        removeBtn.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); applyIcon(""); menu.style.display = "none"; });
        menu.appendChild(removeBtn);
      }
      function applyIcon(icon: string) {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (typeof pos !== "number") return;
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, { ...editor.view.state.doc.nodeAt(pos)?.attrs, icon }));
      }
      function applyVariant(variant: CalloutVariant) {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (typeof pos !== "number") return;
        const existing = editor.view.state.doc.nodeAt(pos)?.attrs || {};
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, { ...existing, variant }));
      }
      iconButton.addEventListener("mousedown", (event) => { event.preventDefault(); event.stopPropagation(); });
      iconButton.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); renderMenu(); menu.style.display = menu.style.display === "none" ? "flex" : "none"; });
      document.addEventListener("click", (event) => {
        const target = event.target as unknown as globalThis.Node | null;
        if (target && !dom.contains(target)) menu.style.display = "none";
      });
      CALLOUT_VARIANTS.forEach((v) => {
        const option = document.createElement("option");
        option.value = v.value;
        option.textContent = v.label;
        variantSelect.appendChild(option);
      });
      variantSelect.addEventListener("mousedown", (event) => { event.stopPropagation(); });
      variantSelect.addEventListener("change", () => { if (isCalloutVariant(variantSelect.value)) applyVariant(variantSelect.value); });
      function syncFromNode(currentNode: typeof node) {
        const { variant } = currentVariantMeta(currentNode);
        const style = VARIANT_STYLES[variant];
        dom.style.backgroundColor = style.bg;
        dom.style.borderLeft = `3px solid ${style.border}`;
        iconButton.textContent = resolvedIcon(currentNode) || "💡";
        variantSelect.value = variant;
      }
      syncFromNode(node);
      return {
        dom,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "callout") return false;
          syncFromNode(updatedNode);
          return true;
        },
      };
    };
  },
});
````

## File: src/lib/creatableRegistry.ts
````
import type { PageKind, PageFormat } from "./types";

export interface CreatableDefinition {
  kind: PageKind;
  icon: string;
  label: string;
  labelZh: string;
  desc: string;
  descZh: string;
  defaultFormat: PageFormat;
  defaultFolder?: string | null;
  isCreatableFromSidebar: boolean;
  isProject: boolean; // 是否屬於項目（文檔、簡報、筆記、學習集）
}

export const CREATABLE_REGISTRY: Record<PageKind, CreatableDefinition> = {
  note: {
    kind: "note",
    icon: "📝",
    label: "Note",
    labelZh: "筆記",
    desc: "Rich formatting",
    descZh: "豐富格式：字型、字級、顏色",
    defaultFormat: "flow",
    defaultFolder: null,
    isCreatableFromSidebar: true,
    isProject: true,
  },
  document: {
    kind: "document",
    icon: "📄",
    label: "Document",
    labelZh: "文檔",
    desc: "Plain text-focused",
    descZh: "純文字為主，類似記事本",
    defaultFormat: "a4",
    defaultFolder: null,
    isCreatableFromSidebar: true,
    isProject: true,
  },
  study_set: {
    kind: "study_set",
    icon: "🗂️",
    label: "Study Set",
    labelZh: "學習集",
    desc: "Flashcards",
    descZh: "練習用字卡",
    defaultFormat: "flow",
    defaultFolder: null,
    isCreatableFromSidebar: true,
    isProject: true,
  },
  presentation: {
    kind: "presentation",
    icon: "📊",
    label: "Presentation",
    labelZh: "簡報",
    desc: "Slides: charts, layout, timeline",
    descZh: "投影片：圖表、版面、時間軸",
    defaultFormat: "16:9",
    defaultFolder: null,
    isCreatableFromSidebar: true,
    isProject: true,
  },
  quick_note: {
    kind: "quick_note",
    icon: "📝",
    label: "Quick Note",
    labelZh: "隨手記",
    desc: "Google Keep style",
    descZh: "類似 Google 記事本，獨立於項目",
    defaultFormat: "flow",
    defaultFolder: "QuickNotes",
    isCreatableFromSidebar: false, // created via quick input, not via + menu? but we allow via + as well for now
    isProject: false,
  },
  todo: {
    kind: "todo",
    icon: "✅",
    label: "To-Do",
    labelZh: "待辦",
    desc: "Tasks with calendar",
    descZh: "日曆待辦，獨立於項目",
    defaultFormat: "flow",
    defaultFolder: null,
    isCreatableFromSidebar: false,
    isProject: false,
  },
};

export function isProjectKind(kind?: PageKind): boolean {
  if (!kind) return true; // legacy note considered project
  return CREATABLE_REGISTRY[kind]?.isProject ?? false;
}

export function getCreatable(kind: PageKind): CreatableDefinition {
  return CREATABLE_REGISTRY[kind];
}

export function getProjectKinds(): PageKind[] {
  return (Object.keys(CREATABLE_REGISTRY) as PageKind[]).filter((k) => CREATABLE_REGISTRY[k].isProject);
}

export function getAllCreatableKinds(): PageKind[] {
  return Object.keys(CREATABLE_REGISTRY) as PageKind[];
}
````

## File: src/lib/fileDownload.ts
````
/** 觸發?覽??載?份???檔?，? Markdown export ??Workspace Backup export 使用??*/
export function downloadTextFile(fileName: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** 將??中容???Windows / ??系統???????替?為安全字???*/
export function safeFileName(name: string): string {
  return (name || "Untitled").replace(/[\\/:*?"<>|]/g, "-").trim() || "Untitled";
}

/** 將任????????JSON 並觸??載??Workspace Backup export（Track E）使??*/
export function downloadJsonFile(fileName: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  downloadTextFile(fileName, json, "application/json;charset=utf-8");
}

/** ?? Workspace Backup ?出檔?，格式為 nexus-backup-YYYY-MM-DD-HHmm.json??*/
export function formatBackupFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;
  return `nexus-backup-${stamp}.json`;
}
````

## File: src/lib/i18n.ts
````
export type Language = "en" | "zh-TW";
export const DEFAULT_LANGUAGE: Language = "en";
export const SUPPORTED_LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh-TW", label: "繁體中文" },
];

export function detectDefaultLanguage(): Language {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE;
  const nav = navigator.language || "";
  return nav.toLowerCase().startsWith("zh") ? "zh-TW" : "en";
}

type Dictionary = Record<string, string>;

const en: Dictionary = {
  "common.untitled": "Untitled",
  "common.loading": "Loading Nexus...",
  "preferences.title": "Preferences",
  "preferences.language": "Language",
  "preferences.theme": "Theme",
  "preferences.theme.light": "Light",
  "preferences.theme.dark": "Dark",
  "preferences.backup": "Backup",
  "account.guestName": "Guest",
  "account.comingSoon": "Account sign-in is not available yet.",
  "sidebar.select.button": "Select",
  "sidebar.select.title": "Bulk select mode",
  "sidebar.expand": "Expand sidebar",
  "sidebar.collapse": "Collapse sidebar",
  "sidebar.logoGoHome": "Go to Home",
  "sidebar.search.placeholderNotes": "Search notes...",
  "sidebar.search.placeholderTrash": "Search trash...",
  "sidebar.commandPalette.title": "Open command palette (Ctrl/Cmd+K)",
  "sidebar.import.button": "Import",
  "sidebar.import.pdf": "Import PDF",
  "sidebar.import.markdown": "Import Markdown",
  "sidebar.exportBackup": "Export Backup",
  "sidebar.exportBackup.title": "Export workspace backup",
  "sidebar.importBackup": "Import Backup",
  "sidebar.importBackup.title": "Import backup file (overwrites all data)",
  "sidebar.nav.home": "Home",
  "sidebar.nav.notes": "Projects",
  "sidebar.nav.projects": "Projects",
  "sidebar.nav.quickNote": "Quick Notes",
  "sidebar.nav.todoList": "To-Do List",
  "sidebar.nav.items": "Projects",
  "sidebar.nav.trash": "Trash",
  "sidebar.tags.all": "All",
  "sidebar.bulk.selectedCount": "{{count}} selected",
  "sidebar.bulk.restore": "Restore",
  "sidebar.bulk.delete": "Delete",
  "sidebar.bulk.confirmPermanentDelete": "Permanently delete {{count}} item(s)? This cannot be undone.",
  "sidebar.bulk.confirmSoftDelete": "Delete {{count}} item(s)? They will be moved to Trash.",
  "sidebar.empty.trash": "Trash is empty",
  "sidebar.empty.notes": "No notes yet",
  "sidebar.folder.uncategorized": "Uncategorized",
  "sidebar.folder.new": "New folder",
  "sidebar.folder.newPrompt": "Enter folder name:",
  "sidebar.create.title": "Create new item",
  "sidebar.create.folder": "New Folder",
  "sidebar.create.note": "New Note",
  "sidebar.create.document": "New Document",
  "sidebar.create.studySet": "New Study Set",
  "sidebar.sort.title": "Sort pages",
  "sidebar.sort.updated": "Recent edited",
  "sidebar.sort.custom": "Custom order (drag)",
  "sidebar.sort.groupByType": "Group by type",
  "sidebar.sort.group.note": "Notes",
  "sidebar.sort.group.document": "Documents",
  "sidebar.sort.group.studySet": "Study Sets",
  "sidebar.page.restore": "Restore",
  "sidebar.page.restoreTitle": "Restore page",
  "sidebar.page.delete": "Delete",
  "sidebar.page.deleteTitle": "Permanently delete page",
  "sidebar.page.confirmPermanentDeleteOne": "Permanently delete \"{{title}}\"? This cannot be undone.",
  "sidebar.page.copy": "Copy",
  "sidebar.page.copyTitle": "Duplicate page",
  "sidebar.page.deletePageTitle": "Delete page",
  "sidebar.page.confirmDeleteOne": "Delete \"{{title}}\"?",
  "sidebar.page.menuTitle": "More actions",
  "sidebar.page.addFavorite": "Add to Favorites",
  "sidebar.page.removeFavorite": "Remove from Favorites",
  "sidebar.page.rename": "Rename",
  "sidebar.page.moveToTrash": "Move to Trash",
  "sidebar.page.exportMarkdown": "Export as Markdown",
  "sidebar.page.exportPdf": "Export as PDF",
  "sidebar.page.exportNexusJson": "Export as Nexus page",
  "sidebar.page.renamePlaceholder": "Page title...",
  "sidebar.page.addSubPage": "Add sub-page",
  "editor.noPage": "No page selected.",
  "editor.folder.label": "Folder:",
  "editor.folder.placeholder": "Enter folder name...",
  "editor.folder.save": "Save",
  "editor.folder.add": "+ Set folder",
  "editor.tags.addFirst": "+ Add tag",
  "editor.tags.add": "+ Tag",
  "editor.title.placeholder": "Untitled",
  "editor.pdf.preview": "PDF Preview",
  "editor.pdf.small": "Small",
  "editor.pdf.medium": "Medium",
  "editor.pdf.large": "Large",
  "editor.pdf.show": "Show",
  "editor.pdf.hide": "Hide",
  "editor.pdf.open": "Open",
  "editor.pdf.unavailable": "PDF preview unavailable",
  "editor.pdf.loading": "Loading PDF preview...",
  "editor.pdf.hiddenNotice": "PDF preview hidden. Click Show to expand.",
  "rightPanel.relations": "Relations",
  "rightPanel.expand": "Expand panel",
  "rightPanel.collapse": "Collapse panel",
  "rightPanel.backlinks": "Backlinks",
  "rightPanel.backlinksEmpty": "No other pages link here yet",
  "rightPanel.outgoing": "Outgoing Links",
  "rightPanel.outgoingEmpty": "No [[page links]] used yet",
  "rightPanel.goTo": "Go to: {{title}}",
  "rightPanel.notCreatedTooltip": "\"{{title}}\" has not been created yet",
  "rightPanel.notCreatedBadge": "Not created",
  "dashboard.home": "Home",
  "dashboard.welcome": "Welcome back",
  "dashboard.stats.total": "All Pages",
  "dashboard.stats.documents": "Documents",
  "dashboard.stats.notes": "Notes",
  "dashboard.stats.research": "PDF Research",
  "dashboard.stats.studySets": "Study Sets",
  "dashboard.quickCreate": "Quick Create",
  "dashboard.newButton": "New",
  "dashboard.importPdf": "Import PDF",
  "dashboard.recent": "Recently Edited",
  "dashboard.emptyState": "No pages yet",
  "time.justNow": "Just now",
  "time.minutesAgo": "{{n}} minutes ago",
  "time.hoursAgo": "{{n}} hours ago",
  "time.daysAgo": "{{n}} days ago",
  "commandPalette.placeholder": "Search pages or type a command...",
  "commandPalette.esc": "Esc",
  "commandPalette.noResults": "No matching results",
  "commandPalette.actions": "Actions",
  "commandPalette.pages": "Pages",
  "commandPalette.goHome": "Go to Home",
  "commandPalette.goNotes": "Go to Notes",
  "commandPalette.goTrash": "Go to Trash",
  "commandPalette.newDocument": "New Document",
  "commandPalette.newNote": "New Note",
  "commandPalette.newStudySet": "New Study Set",
  "commandPalette.importPdf": "Import PDF",
  "commandPalette.importMarkdown": "Import Markdown",
  "commandPalette.exportCurrentPage": "Export current page",
  "commandPalette.exportBackup": "Export Workspace Backup",
  "studySet.label": "Study Set",
  "studySet.startPractice": "Start Practice",
  "studySet.backToCards": "Back to Cards",
  "studySet.titlePlaceholder": "Untitled Study Set",
  "studySet.cardCount": "{{count}} cards",
  "studySet.addCard": "+ Add Card",
  "studySet.emptyCards": "No cards yet",
  "studySet.mastery.mastered": "Mastered",
  "studySet.mastery.learning": "Learning",
  "studySet.mastery.new": "New",
  "studySet.deleteCard": "Delete card",
  "studySet.front": "Front",
  "studySet.back": "Back",
  "studySet.practice.emptyNotice": "No cards yet",
  "studySet.practice.backToManage": "Back to Cards",
  "studySet.practice.finishedTitle": "Practice complete",
  "studySet.practice.summary": "Reviewed {{reviewed}} cards, {{gotIt}} got it",
  "studySet.practice.flipHintFront": "Click to see back",
  "studySet.practice.flipHintBack": "Click to flip back",
  "studySet.practice.again": "Not yet",
  "studySet.practice.gotIt": "Got it",
  "studySet.practice.exit": "End practice",
  "studySet.importCsv": "Import CSV/TSV",
  "studySet.importCsvHint": "Paste CSV/TSV data (front,back per line)",
  "studySet.quiz": "Quiz",
  "studySet.quiz.selectCorrect": "Select the correct answer:",
  "studySet.quiz.correct": "Correct!",
  "studySet.quiz.wrong": "Wrong! The answer was:",
  "studySet.quiz.score": "Score: {{correct}} / {{total}}",
  "studySet.quiz.next": "Next",
  "studySet.quiz.finish": "Finish",
  "studySet.quiz.restart": "Restart Quiz",
  "studySet.quiz.notEnough": "Need at least 4 cards for quiz mode",
  "tiptap.placeholder": "Start writing here...",
  "tiptap.bold": "Bold",
  "tiptap.style": "Style",
  "tiptap.style.normal": "Normal text",
  "tiptap.italic": "Italic",
  "tiptap.underline": "Underline",
  "tiptap.code": "Inline code",
  "tiptap.link": "Insert or edit link",
  "tiptap.fontFamily": "Font",
  "tiptap.fontFamily.default": "Default font",
  "tiptap.fontSize": "Font size",
  "tiptap.fontSize.default": "Default size",
  "tiptap.textColor": "Text color",
  "tiptap.highlight": "Highlight",
  "tiptap.alignLeft": "Align left",
  "tiptap.alignCenter": "Align center",
  "tiptap.alignRight": "Align right",
  "tiptap.alignJustify": "Justify",
  "tiptap.h1": "Heading 1",
  "tiptap.h2": "Heading 2",
  "tiptap.h3": "Heading 3",
  "tiptap.bulletList": "Bullet list",
  "tiptap.orderedList": "Ordered list",
  "tiptap.taskList": "Task list",
  "tiptap.quote": "Quote",
  "tiptap.codeBlock": "Code block",
  "tiptap.table": "Insert table",
  "tiptap.addColumn": "Add column after",
  "tiptap.addRow": "Add row after",
  "tiptap.deleteColumn": "Delete column",
  "tiptap.deleteRow": "Delete row",
  "tiptap.deleteTable": "Delete table",
  "tiptap.callout": "Insert callout",
  "tiptap.inlineMath.title": "Insert inline formula ($...$)",
  "tiptap.blockMath.title": "Insert block formula ($$...$$)",
  "tiptap.clear": "Clear formatting",
  "tiptap.undo": "Undo",
  "tiptap.redo": "Redo",
  "auth.signIn": "Sign In",
  "auth.signUp": "Sign Up",
  "auth.signInSubtitle": "Sign in to sync across devices",
  "auth.signUpSubtitle": "Create an account to get started",
  "auth.emailPlaceholder": "Email",
  "auth.passwordPlaceholder": "Password (min 6 characters)",
  "auth.noAccount": "Don't have an account? Sign up",
  "auth.hasAccount": "Already have an account? Sign in",
  "auth.checkEmail": "Check your email to confirm your account, then sign in.",
  "auth.offlineNote": "You can use Nexus without an account, but data won't sync across devices.",
  "auth.useOffline": "Continue without sync",
  "auth.signOut": "Sign out",
  "sync.syncing": "Syncing...",
  "sync.synced": "Synced",
  "sync.error": "Sync error",
  "sync.offline": "Offline mode",
  "tiptap.linkPrompt": "URL:",
  "tiptap.pageLinkPrompt": "Enter page title (creates [[title]] internal link):",
  "tiptap.linkSelectFirst": "Please select some text first.",
  "tiptap.image": "Insert image",
  "tiptap.imagePrompt": "Image URL:",
  "tiptap.label.code": "Code",
  "tiptap.label.link": "Link",
  "tiptap.label.underline": "U",
  "tiptap.label.bulletList": "List",
  "tiptap.label.orderedList": "1. List",
  "tiptap.label.taskList": "Task",
  "tiptap.label.quote": "Quote",
  "tiptap.label.codeBlock": "Block",
  "tiptap.label.table": "Table",
  "tiptap.label.addColumn": "+Col",
  "tiptap.label.addRow": "+Row",
  "tiptap.label.deleteColumn": "-Col",
  "tiptap.label.deleteRow": "-Row",
  "tiptap.label.deleteTable": "Delete Table",
  "tiptap.label.callout": "Callout",
  "tiptap.label.calloutRemove": "Remove Callout",
  "tiptap.label.inlineMath": "x Math",
  "tiptap.label.blockMath": "Block Math",
  "tiptap.label.clear": "Clear",
  "tiptap.label.image": "Image",
  "tiptap.insert.button": "Insert",
  "app.confirmImportBackup": "Importing a backup will overwrite all current data. This cannot be undone.\\n\\nContinue?",
  "app.backupImportedReload": "Backup imported. Nexus will reload.",
  "app.backupImportFailed": "Backup import failed.",
  "app.backupNotAvailable": "Backup not available.",
  "app.backupExportFailed": "Backup export failed.",
  "app.noActivePageToExport": "No active page to export.",
  "app.chooseMarkdownFile": "Please choose a Markdown or text file.",
  "app.markdownImportFailed": "Markdown import failed.",
  "app.choosePdfFile": "Please choose a PDF file.",
  "app.attachmentNotAvailable": "Attachment creation not available.",
  "app.pdfImportFailed": "PDF import failed.",
  "app.confirmCreatePageFromLink": "Page \"{{title}}\" does not exist. Create it?",
  "newPage.title": "New",
  "newPage.formatTitle": "Choose a Format",
  "newPage.back": "Back",
  "newPage.kind.document": "Document",
  "newPage.kind.document.desc": "Plain text-focused writing",
  "newPage.kind.note": "Note",
  "newPage.kind.note.desc": "Rich formatting: fonts, colors, layout",
  "newPage.kind.studySet": "Study Set",
  "newPage.kind.studySet.desc": "Flashcards for practice",
  "newPage.format.flow": "Flowing (no page breaks)",
  "newPage.format.a4": "A4",
  "newPage.format.169": "16:9 (Slide)",
  "newPage.format.43": "4:3 (Slide)",
  "newPage.format.custom": "Custom size",
  "file.title": "File",
  "file.new": "New",
  "file.newNote": "New Note",
  "file.newDocument": "New Document",
  "file.newPresentation": "New Presentation",
  "file.import": "Import",
  "file.importPdf": "Import PDF",
  "file.importMd": "Import Markdown",
  "file.convertToPresentation": "Convert to Presentation",
  "file.format": "Format",
  "file.format.flow": "Flow",
  "file.format.a4": "A4 Pagination",
  "file.format.169": "16:9",
  "file.format.43": "4:3",
  "file.export": "Export",
  "file.exportMarkdown": "Export as Markdown",
  "file.exportPdf": "Export as PDF",
  "file.exportNexus": "Export as Nexus",
  "file.print": "Print",
  "pagination.addPage": "Add Page",
  "pagination.closePage": "Close Pagination",
  "pagination.addPageBreak": "Insert Page Break",
  "split.hint": "Ctrl+Click to open in right",
  "split.openRight": "Open in right",
  "split.closeRight": "Close right",
  "split.swap": "Swap",
  "split.splitView": "Split View",
  "chart.type": "Chart Type",
  "chart.dataCharts": "Data Charts",
  "chart.textCharts": "Text Charts",
  "chart.bar.single": "Bar",
  "chart.bar.category": "Category Bar",
  "chart.bar.grouped": "Grouped Bar",
  "chart.bar.stacked": "Stacked Bar",
  "chart.bar.stackedPercent": "Stacked Percent Bar",
  "chart.line": "Line",
  "chart.pie": "Pie",
  "chart.donut": "Donut",
  "chart.gantt": "Gantt",
  "chart.pyramid": "Pyramid",
  "chart.radar": "Radar",
  "chart.timeline": "Timeline",
  "chart.textColumns": "Text Columns",
  "chart.textList": "Text List",
  "chart.textQuote": "Quote Card",
  "quickNote.title": "Quick Notes",
  "quickNote.placeholder": "Quick note...",
  "quickNote.add": "Add quick note",
  "quickNote.empty": "No quick notes yet, like Google Keep",
  "todo.title": "To-Do List",
  "todo.calendar": "Calendar",
  "todo.add": "Add task",
  "todo.empty": "No tasks yet",
  "todo.today": "Today",
  "todo.upcoming": "Upcoming",
  "todo.completed": "Completed",
  "helpGuide.title": "Usage Guide",
  "project.title": "Projects",
  "project.documentsNoteStudySetPresentation": "Documents, Presentations, Notes, Study Sets are all called Projects",

};

const zhTW: Dictionary = {
  "common.untitled": "未命名",
  "common.loading": "Nexus 載入中...",
  "preferences.title": "偏好設定",
  "preferences.language": "語言",
  "preferences.theme": "主題",
  "preferences.theme.light": "淺色",
  "preferences.theme.dark": "深色",
  "preferences.backup": "備份",
  "account.guestName": "訪客",
  "account.comingSoon": "帳號登入功能尚未開放。",
  "sidebar.select.button": "多選",
  "sidebar.select.title": "批次選擇模式",
  "sidebar.expand": "展開側邊欄",
  "sidebar.collapse": "收合側邊欄",
  "sidebar.logoGoHome": "回到首頁",
  "sidebar.search.placeholderNotes": "搜尋筆記...",
  "sidebar.search.placeholderTrash": "搜尋垃圾桶...",
  "sidebar.commandPalette.title": "開啟命令面板 (Ctrl/Cmd+K)",
  "sidebar.import.button": "匯入",
  "sidebar.import.pdf": "匯入 PDF",
  "sidebar.import.markdown": "匯入 Markdown",
  "sidebar.exportBackup": "匯出備份",
  "sidebar.exportBackup.title": "匯出工作區備份",
  "sidebar.importBackup": "匯入備份",
  "sidebar.importBackup.title": "匯入備份檔（會覆蓋所有資料）",
  "sidebar.nav.home": "首頁",
  "sidebar.nav.notes": "項目",
  "sidebar.nav.projects": "項目",
  "sidebar.nav.quickNote": "隨手記",
  "sidebar.nav.todoList": "To-Do List",
  "sidebar.nav.items": "項目",
  "sidebar.nav.trash": "垃圾桶",
  "sidebar.tags.all": "全部",
  "sidebar.bulk.selectedCount": "已選 {{count}} 項",
  "sidebar.bulk.restore": "還原",
  "sidebar.bulk.delete": "刪除",
  "sidebar.bulk.confirmPermanentDelete": "確定永久刪除 {{count}} 項？此動作無法復原。",
  "sidebar.bulk.confirmSoftDelete": "確定刪除 {{count}} 項？將移至垃圾桶。",
  "sidebar.empty.trash": "垃圾桶是空的",
  "sidebar.empty.notes": "尚無筆記",
  "sidebar.folder.uncategorized": "未分類",
  "sidebar.folder.new": "新增資料夾",
  "sidebar.folder.newPrompt": "輸入資料夾名稱：",
  "sidebar.create.title": "建立新項目",
  "sidebar.create.folder": "新增資料夾",
  "sidebar.create.note": "新增筆記",
  "sidebar.create.document": "新增文件",
  "sidebar.create.studySet": "新增學習集",
  "sidebar.sort.title": "排序",
  "sidebar.sort.updated": "最近編輯",
  "sidebar.sort.custom": "自訂排序（拖曳）",
  "sidebar.sort.groupByType": "依類型分組",
  "sidebar.sort.group.note": "筆記",
  "sidebar.sort.group.document": "文件",
  "sidebar.sort.group.studySet": "學習集",
  "sidebar.page.restore": "還原",
  "sidebar.page.restoreTitle": "還原頁面",
  "sidebar.page.delete": "刪除",
  "sidebar.page.deleteTitle": "永久刪除頁面",
  "sidebar.page.confirmPermanentDeleteOne": "確定永久刪除「{{title}}」？此動作無法復原。",
  "sidebar.page.copy": "複製",
  "sidebar.page.copyTitle": "複製頁面",
  "sidebar.page.deletePageTitle": "刪除頁面",
  "sidebar.page.confirmDeleteOne": "確定刪除「{{title}}」？",
  "sidebar.page.menuTitle": "更多動作",
  "sidebar.page.addFavorite": "加入最愛",
  "sidebar.page.removeFavorite": "移除最愛",
  "sidebar.page.rename": "重新命名",
  "sidebar.page.moveToTrash": "移至垃圾桶",
  "sidebar.page.exportMarkdown": "匯出為 Markdown",
  "sidebar.page.exportPdf": "匯出為 PDF",
  "sidebar.page.exportNexusJson": "匯出為 Nexus 頁面",
  "sidebar.page.renamePlaceholder": "頁面標題...",
  "sidebar.page.addSubPage": "新增子頁",
  "editor.noPage": "尚未選擇頁面",
  "editor.folder.label": "📁 資料夾：",
  "editor.folder.placeholder": "輸入資料夾名稱...",
  "editor.folder.save": "儲存",
  "editor.folder.add": "+ 設定資料夾",
  "editor.tags.addFirst": "+ 新增標籤",
  "editor.tags.add": "+ 標籤",
  "editor.title.placeholder": "未命名",
  "editor.pdf.preview": "PDF 預覽",
  "editor.pdf.small": "小",
  "editor.pdf.medium": "中",
  "editor.pdf.large": "大",
  "editor.pdf.show": "展開",
  "editor.pdf.hide": "收合",
  "editor.pdf.open": "開啟",
  "editor.pdf.unavailable": "PDF 預覽無法使用",
  "editor.pdf.loading": "PDF 預覽載入中...",
  "editor.pdf.hiddenNotice": "PDF 預覽已隱藏。點擊展開以顯示。",
  "rightPanel.relations": "關聯",
  "rightPanel.expand": "展開面板",
  "rightPanel.collapse": "收合面板",
  "rightPanel.backlinks": "反向連結",
  "rightPanel.backlinksEmpty": "尚無其他頁面連結至此",
  "rightPanel.outgoing": "正向連結",
  "rightPanel.outgoingEmpty": "尚未使用 [[頁面連結]]",
  "rightPanel.goTo": "前往：{{title}}",
  "rightPanel.notCreatedTooltip": "「{{title}}」尚未建立",
  "rightPanel.notCreatedBadge": "未建立",
  "dashboard.home": "首頁",
  "dashboard.welcome": "歡迎回來 🙌",
  "dashboard.stats.total": "全部頁面",
  "dashboard.stats.documents": "文件",
  "dashboard.stats.notes": "筆記",
  "dashboard.stats.research": "PDF 研究",
  "dashboard.stats.studySets": "學習集",
  "dashboard.quickCreate": "快速建立",
  "dashboard.newButton": "新建",
  "dashboard.importPdf": "匯入 PDF",
  "dashboard.recent": "最近編輯",
  "dashboard.emptyState": "尚無頁面，點擊上方新建",
  "time.justNow": "剛剛",
  "time.minutesAgo": "{{n}} 分鐘前",
  "time.hoursAgo": "{{n}} 小時前",
  "time.daysAgo": "{{n}} 天前",
  "commandPalette.placeholder": "搜尋頁面或輸入指令...",
  "commandPalette.esc": "Esc",
  "commandPalette.noResults": "沒有符合的結果",
  "commandPalette.actions": "動作",
  "commandPalette.pages": "頁面",
  "commandPalette.goHome": "回到首頁",
  "commandPalette.goNotes": "瀏覽筆記",
  "commandPalette.goTrash": "瀏覽垃圾桶",
  "commandPalette.newDocument": "新增文件",
  "commandPalette.newNote": "新增筆記",
  "commandPalette.newStudySet": "新增學習集",
  "commandPalette.importPdf": "匯入 PDF",
  "commandPalette.importMarkdown": "匯入 Markdown",
  "commandPalette.exportCurrentPage": "匯出目前頁面",
  "commandPalette.exportBackup": "匯出工作區備份",
  "studySet.label": "學習集",
  "studySet.startPractice": "開始練習",
  "studySet.backToCards": "回到卡片",
  "studySet.titlePlaceholder": "未命名學習集",
  "studySet.cardCount": "{{count}} 張卡片",
  "studySet.addCard": "+ 新增卡片",
  "studySet.emptyCards": "尚無卡片",
  "studySet.mastery.mastered": "已掌握",
  "studySet.mastery.learning": "學習中",
  "studySet.mastery.new": "新學習",
  "studySet.deleteCard": "刪除卡片",
  "studySet.front": "正面",
  "studySet.back": "背面",
  "studySet.practice.emptyNotice": "尚無卡片",
  "studySet.practice.backToManage": "回到卡片管理",
  "studySet.practice.finishedTitle": "練習完成 🎉",
  "studySet.practice.summary": "已複習 {{reviewed}} 張，{{gotIt}} 張已掌握",
  "studySet.practice.flipHintFront": "點擊查看背面",
  "studySet.practice.flipHintBack": "點擊翻回正面",
  "studySet.practice.again": "還不熟",
  "studySet.practice.gotIt": "已掌握",
  "studySet.practice.exit": "結束練習",
  "studySet.importCsv": "匯入 CSV/TSV",
  "studySet.importCsvHint": "貼上 CSV/TSV 資料（每行 正面,背面）",
  "studySet.quiz": "測驗",
  "studySet.quiz.selectCorrect": "選出正確答案：",
  "studySet.quiz.correct": "答對了！",
  "studySet.quiz.wrong": "答錯！正確答案是：",
  "studySet.quiz.score": "得分：{{correct}} / {{total}}",
  "studySet.quiz.next": "下一題",
  "studySet.quiz.finish": "結束",
  "studySet.quiz.restart": "重新測驗",
  "studySet.quiz.notEnough": "至少需要 4 張卡片才能測驗",
  "tiptap.placeholder": "開始書寫...",
  "tiptap.bold": "粗體",
  "tiptap.style": "字樣",
  "tiptap.style.normal": "內文",
  "tiptap.italic": "斜體",
  "tiptap.underline": "底線",
  "tiptap.code": "行內程式碼",
  "tiptap.link": "插入或編輯連結",
  "tiptap.fontFamily": "字型",
  "tiptap.fontFamily.default": "預設字型",
  "tiptap.fontSize": "字級",
  "tiptap.fontSize.default": "預設字級",
  "tiptap.textColor": "字色",
  "tiptap.highlight": "螢光筆",
  "tiptap.alignLeft": "靠左對齊",
  "tiptap.alignCenter": "置中對齊",
  "tiptap.alignRight": "靠右對齊",
  "tiptap.alignJustify": "左右對齊",
  "tiptap.h1": "標題 1",
  "tiptap.h2": "標題 2",
  "tiptap.h3": "標題 3",
  "tiptap.bulletList": "項目清單",
  "tiptap.orderedList": "編號清單",
  "tiptap.taskList": "待辦清單",
  "tiptap.quote": "引用",
  "tiptap.codeBlock": "程式碼區塊",
  "tiptap.table": "插入表格",
  "tiptap.addColumn": "新增欄",
  "tiptap.addRow": "新增列",
  "tiptap.deleteColumn": "刪除欄",
  "tiptap.deleteRow": "刪除列",
  "tiptap.deleteTable": "刪除表格",
  "tiptap.callout": "插入提示框",
  "tiptap.inlineMath.title": "插入行內公式 ($...$)",
  "tiptap.blockMath.title": "插入區塊公式 ($$...$$)",
  "tiptap.clear": "清除格式",
  "tiptap.undo": "復原",
  "tiptap.redo": "重做",
  "sync.syncing": "同步中...",
  "sync.synced": "已同步",
  "sync.error": "同步錯誤",
  "sync.offline": "離線模式",
  "tiptap.linkPrompt": "網址：",
  "tiptap.pageLinkPrompt": "輸入頁面標題（會以 [[標題]] 建立內部連結）：",
  "tiptap.linkSelectFirst": "請先選取文字",
  "tiptap.image": "插入圖片",
  "tiptap.imagePrompt": "圖片網址：",
  "tiptap.label.quote": "引用",
  "tiptap.label.codeBlock": "程式碼",
  "tiptap.label.table": "表格",
  "tiptap.label.callout": "💡 提示框",
  "tiptap.label.inlineMath": "x 公式",
  "tiptap.label.blockMath": "∑ 公式",
  "tiptap.label.clear": "清除",
  "tiptap.label.image": "圖片",
  "newPage.title": "新建",
  "newPage.formatTitle": "選擇版面格式",
  "newPage.back": "返回",
  "newPage.kind.document": "文件",
  "newPage.kind.document.desc": "純文字為主的書寫，類似記事本",
  "newPage.kind.note": "筆記",
  "newPage.kind.note.desc": "豐富格式：字型、字級、顏色、對齊、螢光筆",
  "newPage.kind.studySet": "學習集",
  "newPage.kind.studySet.desc": "練習用字卡",
  "newPage.format.flow": "流動頁面（無分頁）",
  "newPage.format.a4": "A4",
  "newPage.format.169": "16:9（簡報）",
  "newPage.format.43": "4:3（簡報）",
  "newPage.format.custom": "自訂尺寸",
  "file.title": "檔案",
  "file.new": "新建",
  "file.newNote": "新增筆記",
  "file.newDocument": "新增文檔",
  "file.newPresentation": "新增簡報",
  "file.import": "匯入",
  "file.importPdf": "匯入 PDF",
  "file.importMd": "匯入 Markdown",
  "file.convertToPresentation": "轉為簡報",
  "file.format": "格式",
  "file.format.flow": "流動",
  "file.format.a4": "A4 分頁",
  "file.format.169": "16:9",
  "file.format.43": "4:3",
  "file.export": "匯出",
  "file.exportMarkdown": "匯出為 Markdown",
  "file.exportPdf": "匯出為 PDF",
  "file.exportNexus": "匯出為 Nexus 頁面",
  "file.print": "列印",
  "pagination.addPage": "新增頁面",
  "pagination.closePage": "關閉分頁",
  "pagination.addPageBreak": "插入分頁符",
  "split.hint": "Ctrl+點擊 在右側開啟",
  "split.openRight": "在右側開啟",
  "split.closeRight": "關閉右側",
  "split.swap": "交換",
  "split.splitView": "雙開",
  "chart.type": "圖表類型",
  "chart.dataCharts": "數據圖表",
  "chart.textCharts": "文字圖表",
  "chart.bar.single": "長條圖",
  "chart.bar.category": "類別長條圖",
  "chart.bar.grouped": "群組長條圖",
  "chart.bar.stacked": "堆疊長條圖",
  "chart.bar.stackedPercent": "堆疊比例長條圖",
  "chart.line": "折線圖",
  "chart.pie": "圓餅圖",
  "chart.donut": "環狀圖",
  "chart.gantt": "甘特圖",
  "chart.pyramid": "金字塔",
  "chart.radar": "雷達圖",
  "chart.timeline": "時間軸",
  "chart.textColumns": "文字欄",
  "chart.textList": "文字清單",
  "chart.textQuote": "引言卡",
  "quickNote.title": "隨手記",
  "quickNote.placeholder": "隨手記一下...",
  "quickNote.add": "新增隨手記",
  "quickNote.empty": "尚無隨手記，類似 Google 記事本",
  "todo.title": "To-Do List",
  "todo.calendar": "日曆",
  "todo.add": "新增任務",
  "todo.empty": "尚無任務",
  "todo.today": "今天",
  "todo.upcoming": "即將到來",
  "todo.completed": "已完成",
  "helpGuide.title": "使用說明",
  "project.title": "項目",
  "project.documentsNoteStudySetPresentation": "文檔、簡報、筆記、學習集皆統稱為項目",

};

const DICTIONARIES: Record<Language, Dictionary> = { en, "zh-TW": zhTW };

export function translate(language: Language, key: string, params?: Record<string, string | number>): string {
  const dict = DICTIONARIES[language] || DICTIONARIES[DEFAULT_LANGUAGE];
  const template = dict[key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key] ?? key;
  if (!params) return template;
  return Object.keys(params).reduce((acc, paramKey) => acc.split(`{{${paramKey}}}`).join(String(params[paramKey])), template);
}
````

## File: src/lib/inbox.ts
````
import { createClientBlockId } from "./blockId";
import type { Page } from "./types";

/** Markdown import ???.md / .markdown / .txt 檔?衍?標???*/
export function titleFromMarkdownFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.(md|markdown|txt)$/i, "").trim();
  return withoutExt || "Imported Markdown";
}

/** Quick Capture ?容?第一行、截?至 60 字?作為標???*/
export function titleFromCaptureText(text: string): string {
  const firstLine = text.split("\n")[0]?.trim() || "";
  const truncated = firstLine.length > 60 ? `${firstLine.slice(0, 60)}?` : firstLine;
  return truncated || "Quick capture";
}

/** ?Quick Capture 純?字???content_json，???空??為一?段??*/
export function captureTextToContentJson(text: string): object {
  const paragraphs = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (paragraphs.length === 0) {
    return { type: "doc", content: [{ type: "paragraph", attrs: { id: createClientBlockId() } }] };
  }

  return {
    type: "doc",
    content: paragraphs.map((line) => ({
      type: "paragraph",
      attrs: { id: createClientBlockId() },
      content: [{ type: "text", text: line }],
    })),
  };
}

/**
 * ?斷?否??Inbox ?面（System View，? 01-CANON 14.9 節）? * ??以既??folder / tags 欄?實?，???資?模??? */
export function isInboxPage(page: Page): boolean {
  return page.folder === "Inbox" || (page.tags || []).includes("inbox");
}
````

## File: src/lib/markdown.ts
````
import { createClientBlockId } from "./blockId";
import type { Page } from "./types";

function getTextFromNode(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (Array.isArray(node.content)) return node.content.map(getTextFromNode).join("");
  return "";
}

function escapeMarkdownText(text: string): string { return text.replace(/\\/g, "\\\\"); }

function inlineNodesToMarkdown(nodes: any[] | undefined): string {
  if (!nodes || nodes.length === 0) return "";
  return nodes.map((node) => {
    if (node.type === "inlineMath") { const latex = typeof node.attrs?.latex === "string" ? node.attrs.latex : ""; return `$${latex}$`; }
    if (node.type === "pageBreak") return "\n--- PAGE BREAK ---\n";
    if (node.type !== "text") return getTextFromNode(node);
    let text = escapeMarkdownText(node.text || "");
    const marks = node.marks || [];
    for (const mark of marks) { if (mark.type === "code") text = `\`${text}\``; }
    for (const mark of marks) { if (mark.type === "bold") text = `**${text}**`; }
    for (const mark of marks) { if (mark.type === "italic") text = `*${text}*`; }
    for (const mark of marks) { if (mark.type === "link") text = `[${text}](${mark.attrs?.href || ""})`; }
    return text;
  }).join("");
}

function listItemToMarkdown(node: any, ordered: boolean, index: number): string {
  const prefix = ordered ? `${index + 1}.` : "- ";
  const content = node.content || [];
  const firstParagraph = content.find((child: any) => child.type === "paragraph");
  const firstLine = firstParagraph ? inlineNodesToMarkdown(firstParagraph.content) : getTextFromNode(node);
  if (!ordered && firstLine.startsWith("☐")) return `- [ ] ${firstLine.slice(2)}`;
  if (!ordered && firstLine.startsWith("☑")) return `- [x] ${firstLine.slice(2)}`;
  return `${prefix}${firstLine}`;
}

function taskItemToMarkdownLine(node: any): string {
  const checked = !!node.attrs?.checked;
  const content = node.content || [];
  const firstParagraph = content.find((child: any) => child.type === "paragraph");
  const firstLine = firstParagraph ? inlineNodesToMarkdown(firstParagraph.content) : getTextFromNode(node);
  return `- [${checked ? "x" : " "}] ${firstLine}`;
}

function tableCellToMarkdown(cell: any): string {
  const content = cell.content || [];
  const text = content.map((child: any) => inlineNodesToMarkdown(child.content)).join(" ");
  return text.replace(/\|/g, "\\|").trim();
}

function tableToMarkdown(node: any): string {
  const rows = (node.content || []).filter((row: any) => row.type === "tableRow");
  if (rows.length === 0) return "";
  const rowToCells = (row: any) => (row.content || []).map(tableCellToMarkdown);
  const headerCells = rowToCells(rows[0]);
  const bodyRows = rows.slice(1).map(rowToCells);
  return [`| ${headerCells.join(" | ")} |`, `| ${headerCells.map(() => "---").join(" | ")} |`, ...bodyRows.map((cells: string[]) => `| ${cells.join(" | ")} |`)].join("\n");
}

const CALLOUT_VARIANT_TO_TAG: Record<string, string> = { info: "INFO", warning: "WARNING", success: "SUCCESS", danger: "DANGER", note: "NOTE" };
const CALLOUT_TAG_TO_VARIANT: Record<string, string> = { INFO: "info", WARNING: "warning", SUCCESS: "success", DANGER: "danger", NOTE: "note", TIP: "info", CAUTION: "warning", IMPORTANT: "danger" };

function calloutToMarkdown(node: any): string {
  const variant = typeof node.attrs?.variant === "string" ? node.attrs.variant : "info";
  const tag = CALLOUT_VARIANT_TO_TAG[variant] || "INFO";
  const icon = typeof node.attrs?.icon === "string" ? node.attrs.icon : "";
  const header = icon ? `> [!${tag}] ${icon}` : `> [!${tag}]`;
  const inner = (node.content || []).map(nodeToMarkdown).filter((part: string) => part.trim().length > 0).join("\n\n");
  const bodyLines = inner.split("\n").map((line: string) => (line ? `> ${line}` : ">"));
  return [header, ...bodyLines].join("\n");
}

function nodeToMarkdown(node: any): string {
  if (!node) return "";
  switch (node.type) {
    case "heading": { const level = Math.max(1, Math.min(6, node.attrs?.level || 1)); return `${"#".repeat(level)} ${inlineNodesToMarkdown(node.content)}`; }
    case "paragraph": return inlineNodesToMarkdown(node.content);
    case "bulletList": return (node.content || []).map((item: any, index: number) => listItemToMarkdown(item, false, index)).join("\n");
    case "orderedList": return (node.content || []).map((item: any, index: number) => listItemToMarkdown(item, true, index)).join("\n");
    case "taskList": return (node.content || []).map((item: any) => taskItemToMarkdownLine(item)).join("\n");
    case "table": return tableToMarkdown(node);
    case "callout": return calloutToMarkdown(node);
    case "pageBreak": return "\n---\n";
    case "blockMath": { const latex = typeof node.attrs?.latex === "string" ? node.attrs.latex : ""; return `$$\n${latex}\n$$`; }
    case "blockquote": { const inner = (node.content || []).map(nodeToMarkdown).join("\n"); return inner.split("\n").map((line: string) => `> ${line}`).join("\n"); }
    case "codeBlock": return `\`\`\`\n${getTextFromNode(node)}\n\`\`\``;
    case "horizontalRule": return "---";
    case "image": { const src = node.attrs?.src || ""; const alt = node.attrs?.alt || ""; return `![${alt}](${src})`; }
    default: return getTextFromNode(node);
  }
}

export function pageToMarkdown(page: Page): string {
  const content = (page.content_json as any)?.content || [];
  const body = content.map(nodeToMarkdown).filter((part: string) => part.trim().length > 0).join("\n\n");
  return `# ${page.title?.trim() || "Untitled"}\n\n${body}\n`;
}

function textNode(text: string, marks?: any[]): any {
  if (!text) return null;
  return marks && marks.length > 0 ? { type: "text", text, marks } : { type: "text", text };
}

function parseInlineMarkdown(text: string): any[] {
  const nodes: any[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const inlineMathMatch = rest.match(/^\$([^$\n]+)\$(?!\$)/);
    if (inlineMathMatch && !rest.startsWith("$$")) {
      nodes.push({ type: "inlineMath", attrs: { latex: inlineMathMatch[1].trim() } });
      i += inlineMathMatch[0].length; continue;
    }
    const codeMatch = rest.match(/`([^`]+)`/);
    if (codeMatch && codeMatch.index === 0) { nodes.push(textNode(codeMatch[1], [{ type: "code" }])); i += codeMatch[0].length; continue; }
    const linkMatch = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) { nodes.push(textNode(linkMatch[1], [{ type: "link", attrs: { href: linkMatch[2], target: "_blank", rel: "noopener noreferrer" } }])); i += linkMatch[0].length; continue; }
    const boldMatch = rest.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) { nodes.push(textNode(boldMatch[1], [{ type: "bold" }])); i += boldMatch[0].length; continue; }
    const italicMatch = rest.match(/^\*([^*]+)\*/);
    if (italicMatch) { nodes.push(textNode(italicMatch[1], [{ type: "italic" }])); i += italicMatch[0].length; continue; }
    let next = text.length;
    for (const token of ["`", "[", "**", "*", "$"]) { const idx = text.indexOf(token, i + 1); if (idx !== -1) next = Math.min(next, idx); }
    const plain = text.slice(i, next);
    const node = textNode(plain);
    if (node) nodes.push(node);
    i = next;
  }
  return nodes.length > 0 ? nodes : [];
}

function paragraphNode(text: string): any {
  const content = parseInlineMarkdown(text);
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
}

function listItemNode(text: string): any { return { type: "listItem", content: [paragraphNode(text)] }; }

export function createMarkdownContent(markdown: string): object {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const content: any[] = [];
  let paragraphBuffer: string[] = [];
  type ListItemDraft = { text: string; checked?: boolean };
  let listBuffer: { kind: "bullet" | "ordered" | "task"; items: ListItemDraft[] } | null = null;
  let codeBuffer: string[] | null = null;

  function flushParagraph() { const text = paragraphBuffer.join(" ").trim(); if (text) content.push(paragraphNode(text)); paragraphBuffer = []; }
  function flushList() {
    if (!listBuffer) return;
    if (listBuffer.kind === "task") {
      content.push({ type: "taskList", content: listBuffer.items.map((item) => ({ type: "taskItem", attrs: { checked: !!item.checked }, content: [paragraphNode(item.text)] })) });
    } else {
      content.push({ type: listBuffer.kind === "ordered" ? "orderedList" : "bulletList", content: listBuffer.items.map((item) => listItemNode(item.text)) });
    }
    listBuffer = null;
  }

  let index = 0;
  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.replace(/\s+$/g, "");
    if (codeBuffer) {
      if (/^```/.test(line.trim())) { content.push({ type: "codeBlock", content: [{ type: "text", text: codeBuffer.join("\n") }] }); codeBuffer = null; }
      else codeBuffer.push(rawLine);
      index += 1; continue;
    }
    if (/^```/.test(line.trim())) { flushParagraph(); flushList(); codeBuffer = []; index += 1; continue; }
    if (line.trim() === "$$") {
      flushParagraph(); flushList();
      const mathLines: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && lines[cursor].trim() !== "$$") { mathLines.push(lines[cursor]); cursor += 1; }
      content.push({ type: "blockMath", attrs: { latex: mathLines.join("\n").trim() } });
      index = cursor < lines.length ? cursor + 1 : cursor; continue;
    }
    if (!line.trim()) { flushParagraph(); flushList(); index += 1; continue; }
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) { flushParagraph(); flushList(); content.push({ type: "heading", attrs: { level: headingMatch[1].length }, content: parseInlineMarkdown(headingMatch[2]) }); index += 1; continue; }
    const taskMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) { flushParagraph(); if (!listBuffer || listBuffer.kind !== "task") { flushList(); listBuffer = { kind: "task", items: [] }; } listBuffer.items.push({ text: taskMatch[2], checked: taskMatch[1].toLowerCase() === "x" }); index += 1; continue; }
    const bulletMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bulletMatch) { flushParagraph(); if (!listBuffer || listBuffer.kind !== "bullet") { flushList(); listBuffer = { kind: "bullet", items: [] }; } listBuffer.items.push({ text: bulletMatch[1] }); index += 1; continue; }
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (orderedMatch) { flushParagraph(); if (!listBuffer || listBuffer.kind !== "ordered") { flushList(); listBuffer = { kind: "ordered", items: [] }; } listBuffer.items.push({ text: orderedMatch[1] }); index += 1; continue; }
    if (/^---+$/.test(line.trim())) { flushParagraph(); flushList(); content.push({ type: "pageBreak" }); index += 1; continue; }
    const calloutHeaderMatch = line.match(/^>\s*\[!(\w+)\]\s*(.*)$/);
    if (calloutHeaderMatch) {
      flushParagraph(); flushList();
      const tag = calloutHeaderMatch[1].toUpperCase();
      const variant = CALLOUT_TAG_TO_VARIANT[tag] || "info";
      const icon = calloutHeaderMatch[2].trim();
      const innerLines: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && /^>\s?/.test(lines[cursor])) { innerLines.push(lines[cursor].replace(/^>\s?/, "")); cursor += 1; }
      const innerContent = (createMarkdownContent(innerLines.join("\n")) as any).content || [{ type: "paragraph" }];
      content.push({ type: "callout", attrs: { variant, icon: icon || null }, content: innerContent });
      index = cursor; continue;
    }
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) { flushParagraph(); flushList(); content.push({ type: "blockquote", content: [paragraphNode(quoteMatch[1])] }); index += 1; continue; }
    if (/^---+$/.test(line.trim())) { flushParagraph(); flushList(); content.push({ type: "horizontalRule" }); index += 1; continue; }
    flushList();
    paragraphBuffer.push(line.trim());
    index += 1;
  }
  if (codeBuffer) content.push({ type: "codeBlock", content: [{ type: "text", text: codeBuffer.join("\n") }] });
  flushParagraph();
  flushList();
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph", attrs: { id: createClientBlockId() } }] };
}

export function titleFromMarkdownFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.(md|markdown|txt)$/i, "").trim();
  return withoutExt || "Imported Markdown";
}
````

## File: src/lib/multiColumnExtension.ts
````
"use client";
import { Node, mergeAttributes } from "@tiptap/core";

export const Column = Node.create({
  name: "column",
  group: "column",
  content: "block+",
  defining: true,
  isolating: false,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column", class: "nexus-column", style: "min-width:0;" }), 0];
  },
});

export const MultiColumn = Node.create({
  name: "multiColumn",
  group: "block",
  content: "column{2,3}",
  defining: true,
  isolating: false,

  addAttributes() {
    return {
      cols: {
        default: 2,
        parseHTML: (el) => {
          const attr = el.getAttribute("data-cols");
          const n = attr ? parseInt(attr, 10) : 2;
          return isNaN(n) ? 2 : Math.min(3, Math.max(2, n));
        },
        renderHTML: (attrs) => ({ "data-cols": String(attrs.cols) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="multiColumn"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const cols = node.attrs.cols || 2;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "multiColumn",
        "data-cols": String(cols),
        class: "nexus-multi-column",
        style: `display:grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 16px; margin: 1rem 0; padding: 0.5rem; border: 1px dashed var(--color-border); border-radius: 8px;`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setMultiColumn:
        (cols: number = 2) =>
        ({ chain }: any) => {
          const c = Math.min(3, Math.max(2, cols));
          const columns = Array.from({ length: c }).map(() => ({
            type: "column",
            content: [{ type: "paragraph" }],
          }));
          return chain()
            .insertContent({
              type: "multiColumn",
              attrs: { cols: c },
              content: columns,
            })
            .run();
        },
      unsetMultiColumn:
        () =>
        ({ chain, state }: any) => {
          // Lift columns content to parent
          const { $from } = state.selection;
          let depth = $from.depth;
          for (let d = depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "multiColumn") {
              const pos = $from.before(d);
              const end = pos + node.nodeSize;
              // Replace multiColumn with its inner blocks flattened
              // Simplified: delete and insert paragraphs
              const content: any[] = [];
              node.forEach((colNode: any) => {
                colNode.forEach((block: any) => {
                  content.push(block.toJSON());
                });
              });
              return chain().deleteRange({ from: pos, to: end }).insertContentAt(pos, content).run();
            }
          }
          return false;
        },
    } as any;
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    multiColumn: {
      setMultiColumn: (cols?: number) => ReturnType;
      unsetMultiColumn: () => ReturnType;
    };
  }
}

````

## File: src/lib/obsidianMathInput.ts
````
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

function hasBoundaryWhitespaceOrEmpty(raw: string): boolean {
  if (raw.trim() === "") return true;
  return /^\s|\s$/.test(raw);
}

export const ObsidianMathInput = Extension.create({
  name: "obsidianMathInput",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("obsidianMathInput"),
        props: {
          handleTextInput(view, from, to, text) {
            if (text !== "$") return false;
            const { state } = view;
            const $from = state.doc.resolve(from);
            if ($from.parent.type.spec.code) return false;
            const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 200), $from.parentOffset, null, "\ufffc");
            const fullText = textBefore + "$";

            const blockMatch = fullText.match(/\$\$([^$]+)\$\$$/);
            if (blockMatch && !hasBoundaryWhitespaceOrEmpty(blockMatch[1])) {
              const latex = blockMatch[1].trim();
              if (latex) {
                const nodeType = state.schema.nodes.blockMath;
                if (nodeType) {
                  const matchFrom = from - (blockMatch[0].length - 1);
                  const node = nodeType.create({ latex });
                  const tr = state.tr;
                  tr.replaceWith(matchFrom, from, node);
                  const afterNodePos = matchFrom + node.nodeSize;
                  const $pos = tr.doc.resolve(Math.min(afterNodePos, tr.doc.content.size));
                  tr.setSelection(TextSelection.near($pos));
                  view.dispatch(tr);
                  return true;
                }
              }
            }

            const inlineMatch = fullText.match(/\$([^$]+)\$$/);
            if (inlineMatch) {
              const matchStart = fullText.length - inlineMatch[0].length;
              const precedingChar = matchStart > 0 ? fullText[matchStart - 1] : "";
              if (precedingChar !== "$" && !hasBoundaryWhitespaceOrEmpty(inlineMatch[1])) {
                const latex = inlineMatch[1].trim();
                if (latex) {
                  const nodeType = state.schema.nodes.inlineMath;
                  if (nodeType) {
                    const matchFrom = from - (inlineMatch[0].length - 1);
                    const tr = state.tr;
                    const node = nodeType.create({ latex });
                    tr.replaceWith(matchFrom, from, node);
                    const afterNodePos = matchFrom + node.nodeSize;
                    const $pos = tr.doc.resolve(Math.min(afterNodePos, tr.doc.content.size));
                    tr.setSelection(TextSelection.near($pos));
                    view.dispatch(tr);
                    return true;
                  }
                }
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
````

## File: src/lib/obsidianMathNodeView.ts
````
import katex from "katex";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export function createObsidianMathNodeView(isInline: boolean) {
  return ({
    node,
    getPos,
    editor,
  }: {
    node: ProseMirrorNode;
    getPos: () => number | undefined;
    editor: Editor;
  }) => {
    let currentNode = node;
    let isEditing = false;

    const wrapper = document.createElement(isInline ? "span" : "div");
    wrapper.className = isInline ? "nexus-math-inline" : "nexus-math-block";
    const preview = document.createElement(isInline ? "span" : "div");
    preview.className = "math-preview";
    const editEl: HTMLInputElement | HTMLTextAreaElement = isInline ? document.createElement("input") : document.createElement("textarea");
    editEl.className = "math-edit";
    if (isInline) (editEl as HTMLInputElement).type = "text";
    editEl.style.display = "none";
    wrapper.append(preview, editEl as unknown as Node);

    function renderKaTeX() {
      const latex = currentNode.attrs.latex || "";
      if (!latex) {
        preview.textContent = isInline ? "$" : "$$";
        preview.style.opacity = "0.35";
        return;
      }
      preview.innerHTML = "";
      try {
        katex.render(latex, preview, { displayMode: !isInline, throwOnError: false, strict: false });
        preview.style.opacity = "1";
        preview.style.color = "";
      } catch {
        preview.textContent = latex;
        preview.style.color = "#dc2626";
      }
    }

    function stripDelimiters(raw: string): string {
      let s = raw.trim();
      if (isInline) {
        if (s.startsWith("$")) s = s.slice(1);
        if (s.endsWith("$")) s = s.slice(0, -1);
      } else {
        if (s.startsWith("$$")) s = s.slice(2);
        if (s.endsWith("$$")) s = s.slice(0, -2);
      }
      return s.trim();
    }

    function autoSizeInput() {
      const el = editEl as HTMLInputElement;
      const measure = document.createElement("span");
      measure.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font:13px/1.4 monospace;";
      measure.textContent = el.value || " ";
      document.body.appendChild(measure);
      el.style.width = Math.max(measure.offsetWidth + 16, 40) + "px";
      document.body.removeChild(measure);
    }

    function autoSizeTextarea() {
      const el = editEl as HTMLTextAreaElement;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }

    function enterEdit(cursorAt: "start" | "end" | "all" = "all") {
      if (!editor.isEditable || isEditing) return;
      isEditing = true;
      const latex = currentNode.attrs.latex || "";
      const raw = isInline ? `$${latex}$` : `$$\n${latex}\n$$`;
      preview.style.display = "none";
      editEl.style.display = isInline ? "inline-block" : "block";
      editEl.value = raw;
      if (isInline) autoSizeInput();
      else autoSizeTextarea();
      setTimeout(() => {
        if ((editor as any).isDestroyed) return;
        editEl.focus();
        if (cursorAt === "start") {
          editEl.setSelectionRange(isInline ? 1 : 3, isInline ? 1 : 3);
        } else if (cursorAt === "end") {
          const len = editEl.value.length;
          const pos = isInline ? Math.max(len - 1, 0) : Math.max(len - 3, 0);
          editEl.setSelectionRange(pos, pos);
        } else {
          editEl.select();
        }
      }, 0);
    }

    function exitEdit(save: boolean) {
      if (!isEditing) return;
      isEditing = false;
      if (save) {
        const latex = stripDelimiters(editEl.value);
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (pos !== undefined) {
          if (latex === "") {
            const cmd = isInline ? "deleteInlineMath" : "deleteBlockMath";
            (editor.chain().focus() as any)[cmd]({ pos }).run();
            return;
          }
          if (latex !== currentNode.attrs.latex) {
            const cmd = isInline ? "updateInlineMath" : "updateBlockMath";
            (editor.chain().focus() as any)[cmd]({ latex, pos }).run();
          }
        }
      }
      editEl.style.display = "none";
      preview.style.display = isInline ? "inline-block" : "block";
      renderKaTeX();
    }

    function handleBoundaryArrow(direction: "left" | "right"): boolean {
      const pos = typeof getPos === "function" ? getPos() : undefined;
      if (pos === undefined) return false;
      const atStart = editEl.selectionStart === 0;
      const atEnd = editEl.selectionEnd === editEl.value.length;
      if (direction === "left" && atStart) {
        exitEdit(true);
        setTimeout(() => { if (!(editor as any).isDestroyed) editor.chain().focus().setTextSelection(pos).run(); }, 0);
        return true;
      }
      if (direction === "right" && atEnd) {
        exitEdit(true);
        setTimeout(() => {
          if ((editor as any).isDestroyed) return;
          const nextPos = pos + currentNode.nodeSize;
          editor.chain().focus().setTextSelection(nextPos).run();
        }, 0);
        return true;
      }
      return false;
    }

    preview.addEventListener("mousedown", (event) => { event.preventDefault(); });
    preview.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); enterEdit("all"); });
    editEl.addEventListener("blur", () => exitEdit(true));
    editEl.addEventListener("input", () => { if (isInline) autoSizeInput(); else autoSizeTextarea(); });
    editEl.addEventListener("keydown", (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === "Escape") {
        event.preventDefault(); event.stopPropagation();
        exitEdit(false); editor.commands.focus(); return;
      }
      if (isInline && keyboardEvent.key === "Enter") { event.preventDefault(); (editEl as HTMLElement).blur(); return; }
      if (keyboardEvent.key === "ArrowLeft" && handleBoundaryArrow("left")) { event.preventDefault(); return; }
      if (keyboardEvent.key === "ArrowRight" && handleBoundaryArrow("right")) { event.preventDefault(); return; }
      if (!isInline) {
        const el = editEl as HTMLTextAreaElement;
        const lines = el.value.split("\n");
        const cursorLine = el.value.substring(0, el.selectionStart).split("\n").length - 1;
        if (keyboardEvent.key === "ArrowUp" && cursorLine === 0 && handleBoundaryArrow("left")) { event.preventDefault(); return; }
        if (keyboardEvent.key === "ArrowDown" && cursorLine === lines.length - 1 && handleBoundaryArrow("right")) { event.preventDefault(); return; }
      }
    });

    renderKaTeX();

    return {
      dom: wrapper,
      selectNode() {
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (pos === undefined) { enterEdit("all"); return; }
        const head = editor.state.selection.head;
        enterEdit(head <= pos ? "start" : "end");
      },
      deselectNode() { exitEdit(true); },
      stopEvent() { return isEditing; },
      ignoreMutation() { return true; },
      update(updatedNode: ProseMirrorNode) {
        if (updatedNode.type.name !== currentNode.type.name) return false;
        currentNode = updatedNode;
        if (!isEditing) renderKaTeX();
        return true;
      },
    };
  };
}
````

## File: src/lib/pageBreakExtension.ts
````
import { Node, mergeAttributes } from "@tiptap/core";

/**
 * PageBreak - manual page break node for A4 pagination
 * Renders as a horizontal dashed line with label, and can trigger visual page split in A4 view
 * D-157? Task 1 PageFormat engine
 */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      id: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "page-break", class: "nexus-page-break" })];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }: any) => {
          return chain().insertContent({ type: this.name }).run();
        },
    } as any;
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}
````

## File: src/lib/pdfNote.ts
````
import { createClientBlockId } from "./blockId";

/** ?PDF 檔?衍? research note ??設?題??除 .pdf ??????*/
export function titleFromPdfFileName(fileName: string): string {
  const withoutPdf = fileName.replace(/\.pdf$/i, "").trim();
  return withoutPdf || "Untitled PDF";
}

/** PDF import flow 建? research note ?使???? content_json??*/
export function createResearchNoteContent(fileName: string): object {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: {
          id: createClientBlockId(),
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "PDF Notes",
          },
        ],
      },
      {
        type: "paragraph",
        attrs: {
          id: createClientBlockId(),
        },
        content: [
          {
            type: "text",
            text: `Source PDF: ${fileName}`,
          },
        ],
      },
      {
        type: "paragraph",
        attrs: {
          id: createClientBlockId(),
        },
      },
    ],
  };
}
````

## File: src/lib/presentation.ts
````
import { nanoid } from "nanoid";
import type { Page, Slide, PresentationData, ChartData } from "./types";

function getTextFromNode(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (Array.isArray(node.content)) return node.content.map(getTextFromNode).join("");
  return "";
}

function createEmptyDoc(text?: string): object {
  if (text) {
    return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
  }
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function createTextBlock(text: string, x: number, y: number, w: number, h: number, z: number): import("./types").PresentationBlock {
  return {
    id: `blk_${nanoid()}`,
    type: "text",
    x, y, w, h, z,
    text,
    content_json: createEmptyDoc(text),
    style: { fontSize: 16 },
  };
}

export function createEmptyPresentation(title?: string): PresentationData {
  const firstSlide: Slide = {
    id: `slide_${nanoid()}`,
    layout: "title",
    title: title || "Untitled Presentation",
    content_json: createEmptyDoc(),
    content_text: "",
    blocks: [
      createTextBlock(title || "Untitled Presentation", 10, 30, 80, 20, 1),
      createTextBlock("點擊新增文字區塊開始編輯", 10, 55, 80, 10, 2),
    ],
  };
  return {
    theme: "minimal",
    slides: [firstSlide],
  };
}

/**
 * Convert a Note/Document Page's content_json into slides
 * Hybrid approach: H1 = new slide, H2 = section within slide or new slide depending on density
 * Weak linkage: sourcePageId stored
 */
export function noteToPresentation(page: Page): PresentationData {
  const doc = (page.content_json as any) || { content: [] };
  const blocks: any[] = doc.content || [];

  const slides: Slide[] = [];
  let currentSlideBlocks: any[] = [];
  let currentTitle = page.title || "Slide";

  function flushCurrent() {
    if (currentSlideBlocks.length === 0 && slides.length > 0) return;
    const hasTable = currentSlideBlocks.some((b: any) => b.type === "table");
    const layout = hasTable ? "chart" : currentSlideBlocks.length === 0 ? "title" : "title_content";

    let chart: ChartData | undefined;
    if (hasTable) {
      const tableNode = currentSlideBlocks.find((b: any) => b.type === "table");
      if (tableNode) {
        const rows = (tableNode.content || []).map((r: any) => (r.content || []).map((c: any) => getTextFromNode(c).trim()));
        if (rows.length >= 2) {
          const data = rows.slice(1).map((r: string[]) => ({ label: r[0] || "", value: Number(r[1]) || 0 })).filter((d: any) => d.label);
          if (data.length > 0) chart = { type: "bar", variant: "single", orientation: "vertical", data };
        }
      }
    }

    // Convert Tiptap blocks to canvas PresentationBlocks for intuitive drag editing
    const textContent = currentSlideBlocks.map(getTextFromNode).join("\n\n");
    const blocks: import("./types").PresentationBlock[] = [
      createTextBlock(currentTitle, 5, 5, 90, 12, 1),
      ...currentSlideBlocks.slice(0, 3).map((b: any, i: number) => {
        const txt = getTextFromNode(b).slice(0, 200);
        if (!txt) return null;
        return createTextBlock(txt, 5, 22 + i * 22, 90, 18, 10 + i);
      }).filter(Boolean) as import("./types").PresentationBlock[]
    ];

    const slide: Slide = {
      id: `slide_${nanoid()}`,
      layout: layout as any,
      title: currentTitle,
      content_json: { type: "doc", content: currentSlideBlocks.length > 0 ? currentSlideBlocks : [{ type: "paragraph" }] },
      content_text: textContent,
      chart,
      blocks,
    };
    slides.push(slide);
    currentSlideBlocks = [];
  }

  for (const block of blocks) {
    if (block.type === "heading" && (block.attrs?.level === 1 || block.attrs?.level === 2)) {
      // If we already have content, flush previous slide
      if (currentSlideBlocks.length > 0 || slides.length === 0) {
        if (currentSlideBlocks.length > 0) flushCurrent();
        currentTitle = getTextFromNode(block) || `Slide ${slides.length + 1}`;
        // For H1, title is the slide title, not included in body. For H2, include as title and also maybe as content?
        // We'll not include the heading block itself in slide body to avoid duplication, unless it's H2 and we want it as section
        if (block.attrs?.level === 1) {
          continue; // skip adding H1 to body
        }
      }
    }
    currentSlideBlocks.push(block);
    // Auto split if too many blocks (avoid huge slides)
    if (currentSlideBlocks.length > 8) {
      flushCurrent();
      currentTitle = `Slide ${slides.length + 1}`;
    }
  }
  flushCurrent();

  // Ensure at least one slide
  if (slides.length === 0) {
    slides.push({
      id: `slide_${nanoid()}`,
      layout: "title_content",
      title: page.title || "Untitled",
      content_json: doc,
      content_text: page.content_text || "",
    });
  }

  // Generate TOC slide if more than 4 slides
  if (slides.length > 4) {
    const tocSlide: Slide = {
      id: `slide_${nanoid()}`,
      layout: "toc",
      title: "目錄",
      content_json: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `包含 ${slides.length} 張投影片` }] }] },
      content_text: slides.map((s, i) => `${i + 1}. ${s.title}`).join("\n"),
    };
    slides.unshift(tocSlide);
  }

  return {
    theme: "minimal",
    slides,
    sourcePageId: page.id,
  };
}

export function createSlide(layout: Slide["layout"] = "title_content"): Slide {
  const title = layout === "title" ? "標題投影片" : `投影片`;
  return {
    id: `slide_${nanoid()}`,
    layout,
    title,
    content_json: createEmptyDoc(),
    content_text: "",
    blocks: [
      createTextBlock(title, 5, 5, 90, 12, 1),
      createTextBlock("點擊新增文字區塊開始編輯", 5, 25, 90, 15, 2),
    ],
  };
}

export function updateSlideContent(slide: Slide, json: any, text: string): Slide {
  return { ...slide, content_json: json, content_text: text };
}
````

## File: src/lib/supabase.ts
````
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create the Supabase client singleton.
 * Returns null if env vars are not configured (offline mode).
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

/**
 * Check if Supabase is configured (env vars exist).
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
````

## File: src/lib/syncEngine.ts
````
/**
 * Nexus Sync Engine ??Shared Workspace
 * All users share the same data. Realtime sync via Supabase.
 */

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Page, Attachment } from "./types";
import type { StorageAdapter } from "./StorageAdapter";

export type SyncStatus = "idle" | "syncing" | "error" | "offline" | "connected";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number;
  error: string | null;
  pendingPushes: number;
}

type SyncListener = (state: SyncState) => void;

export class SyncEngine {
  private supabase: SupabaseClient;
  private storage: StorageAdapter;
  private deviceId: string;
  private lastSyncAt: number = 0;
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private state: SyncState = { status: "idle", lastSyncAt: 0, error: null, pendingPushes: 0 };
  private isSyncing: boolean = false;
  private realtimeChannel: RealtimeChannel | null = null;
  private onRemoteChange: (() => void) | null = null;

  constructor(supabase: SupabaseClient, storage: StorageAdapter, deviceId: string) {
    this.supabase = supabase;
    this.storage = storage;
    this.deviceId = deviceId;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }

  private setState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.state));
  }

  /** Set a callback for when remote data changes (to trigger UI refresh) */
  setOnRemoteChange(callback: () => void): void {
    this.onRemoteChange = callback;
  }

  /** Start realtime subscriptions + periodic sync */
  startRealtime(): void {
    // Subscribe to page changes
    this.realtimeChannel = this.supabase
      .channel("nexus-shared")
      .on("postgres_changes", { event: "*", schema: "public", table: "pages" }, (payload: Record<string, unknown>) => {
        const data = payload.new as Record<string, unknown> | null;
        console.log("[Sync] Remote page change:", payload.eventType, data?.id);
        this.handleRemotePageChange(payload as unknown as { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attachments" }, (payload: Record<string, unknown>) => {
        const data = payload.new as Record<string, unknown> | null;
        console.log("[Sync] Remote attachment change:", payload.eventType, data?.id);
        this.handleRemoteAttachmentChange(payload as unknown as { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "binaries" }, (payload: Record<string, unknown>) => {
        const data = payload.new as Record<string, unknown> | null;
        console.log("[Sync] Remote binary change:", payload.eventType, data?.id);
        this.handleRemoteBinaryChange(payload as unknown as { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.setState({ status: "connected" });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.setState({ status: "error", error: "Realtime connection failed" });
        }
      });

    // Also do periodic pull as backup (every 60 seconds)
    this.syncInterval = setInterval(() => { this.pullChanges(); }, 60000);
  }

  private async handleRemotePageChange(payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }): Promise<void> {
    const data = payload.new;
    if (!data || !data.id) return;
    // Skip if this change came from this device
    if (data.device_id === this.deviceId) return;

    const localPages = await this.storage.listPages({ includeDeleted: true });
    const localPage = localPages.find((p) => p.id === data.id);

    // M4-1 fix: local soft-delete wins over a stale cloud copy (prevents resurrection)
    if (localPage?.deleted_at && !data.deleted_at && localPage.updated_at >= (data.updated_at as number)) {
      return;
    }
    if (!localPage || (data.updated_at as number) > localPage.updated_at) {
      const page: Page = this.cloudRowToPage(data);
      await this.storage.savePage(page);
      this.onRemoteChange?.();
    }
  }

  private async handleRemoteAttachmentChange(payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }): Promise<void> {
    const data = payload.new;
    if (!data || !data.id) return;
    if (data.device_id === this.deviceId) return;

    const localAttachments = await this.storage.listAttachments();
    const localAtt = localAttachments.find((a) => a.id === data.id);

    if (!localAtt || (data.updated_at as number) > localAtt.updated_at) {
      const att: Attachment = {
        id: data.id as string,
        kind: ((data.kind as string) || "file") as Attachment["kind"],
        name: (data.name as string) || "",
        mime_type: (data.mime_type as string) || "application/octet-stream",
        size_bytes: (data.size_bytes as number) || 0,
        storage_key: (data.storage_key as string) || "",
        created_at: data.created_at as number,
        updated_at: data.updated_at as number,
        deleted_at: (data.deleted_at as number) || null,
        device_id: (data.device_id as string) || "",
        page_count: (data.page_count as number) ?? undefined,
      };
      await this.storage.saveAttachment(att);
      this.onRemoteChange?.();
    }
  }

  /**
   * M4-1: Realtime handler for binaries table.
   * When another device pushes a PDF/image binary, download it to local IndexedDB.
   * Note: binaries table has no device_id, so self-pushes also trigger this;
   * the `!localBin` guard makes it a no-op for binaries we already have (idempotent).
   */
  private async handleRemoteBinaryChange(payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }): Promise<void> {
    const data = payload.new;
    if (!data || !data.id) return;
    if (payload.eventType === "DELETE") return;

    const localBin = await this.storage.readBinary(data.id as string);
    if (localBin) return; // already have it (own push or already synced)

    if (data.data) {
      try {
        const binary = atob(data.data as string);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const att = await this.storage.getAttachment(data.id as string);
        const blob = new Blob([bytes], { type: att?.mime_type || "application/octet-stream" });
        await this.storage.attachBinary(data.id as string, blob);
        this.onRemoteChange?.();
      } catch (err) {
        console.error("[SyncEngine] handleRemoteBinaryChange error:", err);
      }
    }
  }

  private cloudRowToPage(row: Record<string, unknown>): Page {
    return {
      id: row.id as string,
      title: (row.title as string) || "",
      content_json: (row.content_json as object) || {},
      content_text: (row.content_text as string) || "",
      default_mode: (row.default_mode as "note") || "note",
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      deleted_at: (row.deleted_at as number) || null,
      revision: (row.revision as number) || 1,
      device_id: (row.device_id as string) || "",
      tags: (row.tags as string[]) || [],
      folder: (row.folder as string) || null,
      links: (row.links as string[]) || [],
      attachment_ids: (row.attachment_ids as string[]) || [],
      primary_attachment_id: (row.primary_attachment_id as string) || null,
      kind: (row.kind as string as Page["kind"]) || "note",
      study_items: (row.study_items as Page["study_items"]) || undefined,
      presentation_data: (row.presentation_data as Page["presentation_data"]) || undefined,
      is_favorite: (row.is_favorite as boolean) || false,
      format: (row.format as string as Page["format"]) || "flow",
      sort_order: (row.sort_order as number) ?? undefined,
      parent_id: (row.parent_id as string) || null,
      margins: (row.margins as Page["margins"]) || undefined,
      // M4-1: todo / quick_note fields
      due_date: (row.due_date as number) ?? null,
      priority: (row.priority as "low" | "medium" | "high" | null) || null,
      completed: (row.completed as boolean) || false,
      color: (row.color as string) || null,
    };
  }

  /** Initial full sync: pull everything from cloud */
  async fullSync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.setState({ status: "syncing", error: null });

    try {
      const { data: cloudPages, error: pagesError } = await this.supabase.from("pages").select("*");
      if (pagesError) throw new Error(`Pages pull failed: ${pagesError.message}`);

      const { data: cloudAttachments, error: attachmentsError } = await this.supabase.from("attachments").select("*");
      if (attachmentsError) throw new Error(`Attachments pull failed: ${attachmentsError.message}`);

      const { data: cloudBinaries, error: binariesError } = await this.supabase.from("binaries").select("*");
      if (binariesError) throw new Error(`Binaries pull failed: ${binariesError.message}`);

      const localPages = await this.storage.listPages({ includeDeleted: true });
      const localAttachments = await this.storage.listAttachments();
      const localPageMap = new Map(localPages.map((p) => [p.id, p]));
      let maxUpdatedAt = this.lastSyncAt;

      // Pull cloud pages ??local (if cloud is newer)
      for (const cloudPage of (cloudPages || [])) {
        const localPage = localPageMap.get(cloudPage.id);
        // M4-1 fix: local soft-delete wins over a stale cloud copy (prevents resurrection)
        if (localPage?.deleted_at && !cloudPage.deleted_at && localPage.updated_at >= (cloudPage.updated_at as number)) {
          continue;
        }
        if (!localPage || cloudPage.updated_at > localPage.updated_at) {
          await this.storage.savePage(this.cloudRowToPage(cloudPage as unknown as Record<string, unknown>));
        }
        if (cloudPage.updated_at > maxUpdatedAt) maxUpdatedAt = cloudPage.updated_at;
      }

      // Push local pages ??cloud (if local is newer or doesn't exist on cloud)
      for (const localPage of localPages) {
        const cloudPage = (cloudPages || []).find((cp: { id: string }) => cp.id === localPage.id);
        if (!cloudPage || localPage.updated_at > cloudPage.updated_at) {
          await this.pushPage(localPage);
        }
        if (localPage.updated_at > maxUpdatedAt) maxUpdatedAt = localPage.updated_at;
      }

      // Push local attachments ??cloud (if local is newer or doesn't exist on cloud)
      // M4-1 fix: previously fullSync only pushed pages; attachments/binaries created
      // during offline periods never reached the cloud (PDFs missing on other devices).
      for (const localAtt of localAttachments) {
        const cloudAtt = (cloudAttachments || []).find((ca: { id: string }) => ca.id === localAtt.id);
        if (!cloudAtt || localAtt.updated_at > cloudAtt.updated_at) {
          await this.pushAttachment(localAtt);
        }
      }

      // Push local binaries ??cloud (if missing on cloud)
      for (const localAtt of localAttachments) {
        const cloudBin = (cloudBinaries || []).find((cb: { id: string }) => cb.id === localAtt.id);
        if (!cloudBin) {
          const bin = await this.storage.readBinary(localAtt.id);
          if (bin) await this.pushBinary(localAtt.id, bin);
        }
      }

      // Pull cloud attachments ??local
      const localAttMap = new Map(localAttachments.map((a) => [a.id, a]));
      for (const cloudAtt of (cloudAttachments || [])) {
        const localAtt = localAttMap.get(cloudAtt.id);
        if (!localAtt || cloudAtt.updated_at > localAtt.updated_at) {
          const att: Attachment = {
            id: cloudAtt.id, kind: cloudAtt.kind || "file", name: cloudAtt.name || "",
            mime_type: cloudAtt.mime_type || "application/octet-stream", size_bytes: cloudAtt.size_bytes || 0,
            storage_key: cloudAtt.storage_key || "", created_at: cloudAtt.created_at, updated_at: cloudAtt.updated_at,
            deleted_at: cloudAtt.deleted_at || null, device_id: cloudAtt.device_id || "",
            page_count: cloudAtt.page_count ?? undefined,
          };
          await this.storage.saveAttachment(att);
        }
      }

      // Pull cloud binaries ??local
      for (const cloudBin of (cloudBinaries || [])) {
        const localBin = await this.storage.readBinary(cloudBin.id);
        if (!localBin && cloudBin.data) {
          const binary = atob(cloudBin.data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const att = (cloudAttachments || []).find((a: { id: string }) => a.id === cloudBin.id);
          const blob = new Blob([bytes], { type: att?.mime_type || "application/octet-stream" });
          await this.storage.attachBinary(cloudBin.id, blob);
        }
      }

      this.lastSyncAt = maxUpdatedAt;
      this.setState({ status: "connected", lastSyncAt: maxUpdatedAt, error: null });
      this.onRemoteChange?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[SyncEngine] fullSync error:", errorMsg);
      this.setState({ status: "error", error: errorMsg });
    } finally {
      this.isSyncing = false;
    }
  }

  /** Pull only changes since last sync */
  async pullChanges(): Promise<void> {
    if (this.isSyncing || this.lastSyncAt === 0) return;
    this.isSyncing = true;
    this.setState({ status: "syncing" });

    try {
      const { data: cloudPages } = await this.supabase.from("pages").select("*").gt("updated_at", this.lastSyncAt);
      let maxUpdatedAt = this.lastSyncAt;
      let changed = false;

      for (const cloudPage of (cloudPages || [])) {
        if (cloudPage.device_id === this.deviceId) continue; // Skip own changes
        const localPages = await this.storage.listPages({ includeDeleted: true });
        const localPage = localPages.find((p) => p.id === cloudPage.id);
        // M4-1 fix: local soft-delete wins over a stale cloud copy (prevents resurrection)
        if (localPage?.deleted_at && !cloudPage.deleted_at && localPage.updated_at >= (cloudPage.updated_at as number)) {
          continue;
        }
        if (!localPage || cloudPage.updated_at > localPage.updated_at) {
          await this.storage.savePage(this.cloudRowToPage(cloudPage as unknown as Record<string, unknown>));
          changed = true;
        }
        if (cloudPage.updated_at > maxUpdatedAt) maxUpdatedAt = cloudPage.updated_at;
      }

      this.lastSyncAt = maxUpdatedAt;
      this.setState({ status: "connected", lastSyncAt: maxUpdatedAt, error: null });
      if (changed) this.onRemoteChange?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.setState({ status: "error", error: errorMsg });
    } finally {
      this.isSyncing = false;
    }
  }

  /** Push a single page to cloud */
  async pushPage(page: Page): Promise<void> {
    try {
      await this.supabase.from("pages").upsert({
        id: page.id, title: page.title, content_json: page.content_json,
        content_text: page.content_text, default_mode: page.default_mode,
        created_at: page.created_at, updated_at: page.updated_at, deleted_at: page.deleted_at,
        revision: page.revision, device_id: this.deviceId,
        tags: page.tags || [], folder: page.folder || null, links: page.links || [],
        attachment_ids: page.attachment_ids || [], primary_attachment_id: page.primary_attachment_id || null,
        kind: page.kind || "note", study_items: page.study_items || null, presentation_data: page.presentation_data || null,
        is_favorite: page.is_favorite || false, format: page.format || "flow",
        sort_order: page.sort_order ?? null, parent_id: page.parent_id || null,
        margins: page.margins ?? null,
        // M4-1: todo / quick_note fields (were missing -> cross-device data loss)
        due_date: page.due_date ?? null,
        priority: page.priority ?? null,
        completed: page.completed ?? false,
        color: page.color ?? null,
      }, { onConflict: "id" });

      if (page.updated_at > this.lastSyncAt) this.setState({ lastSyncAt: page.updated_at });
    } catch (err) {
      console.error("[SyncEngine] pushPage error:", err);
    }
  }

  async pushAttachment(attachment: Attachment): Promise<void> {
    try {
      await this.supabase.from("attachments").upsert({
        id: attachment.id, kind: attachment.kind, name: attachment.name,
        mime_type: attachment.mime_type, size_bytes: attachment.size_bytes,
        storage_key: attachment.storage_key, created_at: attachment.created_at,
        updated_at: attachment.updated_at, deleted_at: attachment.deleted_at,
        device_id: this.deviceId, page_count: attachment.page_count ?? null,
      }, { onConflict: "id" });
    } catch (err) {
      console.error("[SyncEngine] pushAttachment error:", err);
    }
  }

  async pushBinary(attachmentId: string, blob: Blob): Promise<void> {
    try {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      await this.supabase.from("binaries").upsert({
        id: attachmentId, data: btoa(binary), updated_at: Date.now(),
      }, { onConflict: "id" });
    } catch (err) {
      console.error("[SyncEngine] pushBinary error:", err);
    }
  }

  async pushSetting(_key: string, _value: unknown): Promise<void> {
    // Settings are local-only in shared workspace mode
  }

  async pushPermanentDeletePage(pageId: string): Promise<void> {
    try {
      await this.supabase.from("pages").delete().eq("id", pageId);
      await this.supabase.from("binaries").delete().eq("id", pageId);
    } catch (err) {
      console.error("[SyncEngine] pushPermanentDeletePage error:", err);
    }
  }

  destroy(): void {
    this.stopPeriodicSync();
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.listeners.clear();
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) { clearInterval(this.syncInterval); this.syncInterval = null; }
  }
}
````

## File: src/lib/types.ts
````
export type ID = string;

export type BlockType =
  | "paragraph"
  | "heading"
  | "bulletList"
  | "orderedList"
  | "taskItem"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule";

export type AttachmentKind = "pdf" | "image" | "file";

export interface Block {
  id: ID;
  type: BlockType;
  text?: string;
}

export interface Attachment {
  id: ID;
  kind: AttachmentKind;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  device_id: ID;
  page_count?: number;
}

export type PageKind = "note" | "document" | "study_set" | "presentation" | "quick_note" | "todo";
export type PageFormat = "flow" | "a4" | "16:9" | "4:3" | "custom";

/** 頁面邊距（mm），用於 A4/分頁版面（可調整頁邊距） */
export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_PAGE_MARGINS: PageMargins = { top: 20, right: 18, bottom: 20, left: 18 };

export interface StudyItem {
  id: ID;
  front: string;
  back: string;
  mastery: "new" | "learning" | "mastered";
  last_reviewed_at: number | null;
  review_count: number;
}

export type SlideLayout = "title" | "title_content" | "two_column" | "chart" | "image" | "toc" | "quote" | "blank" | "canvas";

export type ChartBaseType = "bar" | "line" | "pie" | "donut" | "gantt" | "pyramid" | "radar" | "timeline" | "text-columns" | "text-list" | "text-quote";
export type BarVariant = "single" | "category" | "grouped" | "stacked" | "stacked-percent";
export type ChartOrientation = "vertical" | "horizontal";

export interface ChartData {
  type: ChartBaseType;
  variant?: BarVariant; // for bar charts
  orientation?: ChartOrientation; // vertical / horizontal, one-click toggle
  data: { label: string; value: number; series?: string; start?: number; end?: number }[];
}

export interface PresentationBlock {
  id: ID;
  type: "text" | "chart" | "image" | "diagram" | "shape";
  x: number; // 0-100 %
  y: number; // 0-100 %
  w: number; // 0-100 %
  h: number; // 0-100 % or auto
  z: number;
  text?: string;
  content_json?: object; // for rich text block
  chart?: ChartData;
  diagramCode?: string;
  style?: {
    fontSize?: number;
    color?: string;
    background?: string;
    textAlign?: "left" | "center" | "right";
    bold?: boolean;
  };
}

export interface Slide {
  id: ID;
  layout: SlideLayout;
  title?: string;
  content_json?: object; // legacy Tiptap JSON for this slide's body (for backward compat)
  content_text?: string; // derived text
  chart?: ChartData;
  diagramCode?: string; // Mermaid code
  notes?: string; // speaker notes
  backgroundColor?: string;
  blocks?: PresentationBlock[]; // new canvas-like blocks for intuitive editing
}

export interface PresentationData {
  theme: "minimal" | "academic" | "business" | "dark";
  slides: Slide[];
  sourcePageId?: ID | null; // which Note it was converted from (weak linkage)
}

export interface Page {
  id: ID;
  title: string;
  content_json: object;
  content_text: string;
  /** @deprecated 已被 kind 取代，僅為向後相容保留，新程式碼不應讀寫此欄位 (C2決策，需徵詢) */
  default_mode: "note";
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  revision: number;
  device_id: ID;
  tags?: string[];
  folder?: string | null;
  links?: string[];
  attachment_ids?: ID[];
  primary_attachment_id?: ID | null;
  kind?: PageKind;
  study_items?: StudyItem[];
  presentation_data?: PresentationData;
  is_favorite?: boolean;
  format?: PageFormat;
  sort_order?: number;
  parent_id?: ID | null;
  margins?: PageMargins;
  // Todo specific
  due_date?: number | null;
  priority?: "low" | "medium" | "high" | null;
  completed?: boolean;
  color?: string | null; // for quick note
}

export interface PageQuery {
  includeDeleted?: boolean;
  limit?: number;
}

export interface CreatePageInput {
  title?: string;
  tags?: string[];
  folder?: string | null;
  attachment_ids?: ID[];
  primary_attachment_id?: ID | null;
  kind?: PageKind;
  format?: PageFormat;
  margins?: PageMargins;
  sort_order?: number;
  parent_id?: ID | null;
}

export interface WorkspaceBackupAttachmentEntry {
  attachment: Attachment;
  binary_base64: string | null;
}

export interface WorkspaceBackupSettingEntry {
  key: string;
  value: unknown;
}

export interface WorkspaceBackup {
  schema_version: number;
  exported_at: number;
  device_id: ID;
  pages: Page[];
  attachments: WorkspaceBackupAttachmentEntry[];
  settings: WorkspaceBackupSettingEntry[];
}
````

## File: src/lib/wikilinks.ts
````
/**
 * 從正????中解?出???[[?面標?]] 形???wikilink 標?清單?? * ?Backlinks / Outgoing Links（MVP-1 Wikilink ?能）使?? */
export function extractWikilinks(text: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const title = match[1].trim();
    if (title && !matches.includes(title)) {
      matches.push(title);
    }
  }
  return matches;
}
````

## File: src/lib/writingModeExtension.ts
````
"use client";
import { Extension } from "@tiptap/core";

export const WritingModeExtension = Extension.create({
  name: "writingMode",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "tableCell", "tableHeader", "column"],
        attributes: {
          writingMode: {
            default: null,
            parseHTML: (element) => element.style.writingMode || null,
            renderHTML: (attributes) => {
              if (!attributes.writingMode) return {};
              return { style: `writing-mode: ${attributes.writingMode}` };
            },
          },
          textOrientation: {
            default: null,
            parseHTML: (element) => element.style.textOrientation || null,
            renderHTML: (attributes) => {
              if (!attributes.textOrientation) return {};
              // writingMode already includes style, need to merge
              return {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      toggleWritingMode:
        () =>
        ({ state, chain }: any) => {
          const { $from } = state.selection;
          // Find current block with writingMode
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            const type = node.type.name;
            if (["paragraph", "heading", "tableCell", "tableHeader", "column"].includes(type)) {
              const current = node.attrs.writingMode;
              const next = current === "vertical-rl" ? null : "vertical-rl";
              const pos = $from.before(d);
              return chain().updateAttributes(type, { writingMode: next }).run();
            }
          }
          // Fallback: try to set on paragraph
          const current = state.doc.resolve($from.pos).parent.attrs?.writingMode;
          const next = current === "vertical-rl" ? null : "vertical-rl";
          return chain().updateAttributes("paragraph", { writingMode: next }).run();
        },
      setWritingMode:
        (mode: string | null) =>
        ({ chain, state }: any) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            const type = node.type.name;
            if (["paragraph", "heading", "tableCell", "tableHeader", "column"].includes(type)) {
              return chain().updateAttributes(type, { writingMode: mode }).run();
            }
          }
          return chain().updateAttributes("paragraph", { writingMode: mode }).run();
        },
    } as any;
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    writingMode: {
      toggleWritingMode: () => ReturnType;
      setWritingMode: (mode: string | null) => ReturnType;
    };
  }
}

````

## File: tsconfig.json
````
{
  "compilerOptions": {
    "target": "es2017",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./src/*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
````

