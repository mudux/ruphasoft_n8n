#!/usr/bin/env node

/**
 * FHIR n8n Custom Nodes - TypeScript Migration Verification
 *
 * This script verifies that the migration from JavaScript to TypeScript
 * follows n8n 2025 official patterns and can be loaded by n8n.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FHIR n8n Custom Nodes - TypeScript Migration Verification');
console.log('=========================================================\n');

let passed = 0;
let failed = 0;

function pass(message) {
    console.log(`✅ ${message}`);
    passed++;
}

function fail(message) {
    console.log(`❌ ${message}`);
    failed++;
}

function info(message) {
    console.log(`ℹ️  ${message}`);
}

function section(title) {
    console.log(`\n🔸 ${title}`);
    console.log('─'.repeat(50));
}

// Test 1: Package Configuration
section('Package Configuration');

try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

    // Check n8n configuration
    if (packageJson.n8n) {
        pass('package.json contains n8n configuration');

        if (packageJson.n8n.n8nNodesApiVersion === 1) {
            pass('n8nNodesApiVersion is set to 1');
        } else {
            fail('n8nNodesApiVersion should be 1');
        }

        if (packageJson.n8n.strict === true) {
            pass('Strict mode is enabled');
        } else {
            fail('Strict mode should be enabled');
        }

        // Check node registration
        const nodes = packageJson.n8n.nodes || [];
        if (nodes.length > 0) {
            pass(`Found ${nodes.length} registered node(s)`);
            nodes.forEach(node => {
                if (node.startsWith('dist/')) {
                    pass(`Node registration points to dist/: ${node}`);
                } else {
                    fail(`Node registration should point to dist/ directory: ${node}`);
                }
            });
        } else {
            fail('No nodes registered in package.json');
        }
    } else {
        fail('package.json missing n8n configuration');
    }

    // Check dependencies
    if (packageJson.dependencies && packageJson.dependencies['n8n-workflow']) {
        pass('n8n-workflow dependency found');
    } else {
        fail('n8n-workflow dependency missing');
    }

    if (packageJson.devDependencies) {
        if (packageJson.devDependencies.typescript) {
            pass('TypeScript dev dependency found');
        } else {
            fail('TypeScript dev dependency missing');
        }

        if (packageJson.devDependencies['@n8n/node-cli']) {
            pass('@n8n/node-cli dev dependency found');
        } else {
            fail('@n8n/node-cli dev dependency missing');
        }
    }

    // Check scripts
    if (packageJson.scripts) {
        if (packageJson.scripts.build === 'tsc') {
            pass('Build script configured for TypeScript');
        } else {
            fail('Build script should be "tsc"');
        }

        if (packageJson.scripts.dev) {
            pass('Dev script found');
        } else {
            info('Dev script recommended: "n8n-node dev"');
        }
    }

} catch (error) {
    fail(`Error reading package.json: ${error.message}`);
}

// Test 2: TypeScript Configuration
section('TypeScript Configuration');

try {
    const tsConfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));
    pass('tsconfig.json found');

    if (tsConfig.compilerOptions) {
        if (tsConfig.compilerOptions.outDir === './dist') {
            pass('Output directory set to ./dist');
        } else {
            fail('Output directory should be ./dist');
        }

        if (tsConfig.compilerOptions.module === 'commonjs') {
            pass('Module format set to commonjs');
        } else {
            fail('Module format should be commonjs');
        }

        if (tsConfig.compilerOptions.strict === true) {
            pass('Strict mode enabled in TypeScript');
        } else {
            fail('Strict mode should be enabled');
        }

        if (tsConfig.compilerOptions.allowJs === true) {
            pass('JavaScript files allowed (for utilities)');
        } else {
            info('allowJs recommended for mixed JS/TS projects');
        }
    }

    if (tsConfig.include && tsConfig.include.includes('nodes/**/*')) {
        pass('Nodes directory included in compilation');
    } else {
        fail('nodes/**/* should be included in tsconfig');
    }

} catch (error) {
    fail(`Error reading tsconfig.json: ${error.message}`);
}

// Test 3: File Structure
section('File Structure');

// Check for dist directory
if (fs.existsSync('./dist')) {
    pass('dist/ directory exists');

    // Check for compiled nodes
    const distNodes = path.join('./dist', 'nodes');
    if (fs.existsSync(distNodes)) {
        pass('dist/nodes/ directory exists');

        // Check FhirPatient node
        const fhirPatientDir = path.join(distNodes, 'FhirPatient');
        if (fs.existsSync(fhirPatientDir)) {
            pass('FhirPatient node directory exists');

            const fhirPatientNode = path.join(fhirPatientDir, 'FhirPatient.node.js');
            if (fs.existsSync(fhirPatientNode)) {
                pass('FhirPatient.node.js compiled successfully');
            } else {
                fail('FhirPatient.node.js not found');
            }
        } else {
            fail('FhirPatient node directory not found');
        }
    } else {
        fail('dist/nodes/ directory not found - run npm run build');
    }

    // Check for compiled utilities
    const distSrc = path.join('./dist', 'src');
    if (fs.existsSync(distSrc)) {
        pass('dist/src/ utilities directory exists');
    } else {
        fail('dist/src/ utilities directory not found');
    }
} else {
    fail('dist/ directory not found - run npm run build first');
}

// Check source structure
const nodesDir = './nodes';
if (fs.existsSync(nodesDir)) {
    pass('nodes/ source directory exists');

    // Check for TypeScript node structure
    const fhirPatientSrc = path.join(nodesDir, 'FhirPatient', 'FhirPatient.node.ts');
    if (fs.existsSync(fhirPatientSrc)) {
        pass('TypeScript source structure correct (FhirPatient/FhirPatient.node.ts)');
    } else {
        fail('TypeScript source not found - should be nodes/FhirPatient/FhirPatient.node.ts');
    }
}

// Test 4: Node Implementation
section('Node Implementation');

try {
    // Try to require the compiled node
    const nodePath = './dist/nodes/FhirPatient/FhirPatient.node.js';
    if (fs.existsSync(nodePath)) {
        const nodeModule = require(nodePath);

        if (nodeModule.FhirPatient) {
            pass('FhirPatient class can be required');

            const nodeClass = nodeModule.FhirPatient;
            const instance = new nodeClass();

            if (instance.description) {
                pass('Node description property exists');

                if (instance.description.displayName === 'FHIR Patient') {
                    pass('Node display name correct');
                } else {
                    fail(`Node display name incorrect: ${instance.description.displayName}`);
                }

                if (instance.description.name === 'fhirPatient') {
                    pass('Node name correct');
                } else {
                    fail(`Node name incorrect: ${instance.description.name}`);
                }

                if (instance.description.group && instance.description.group.includes('transform')) {
                    pass('Node group includes "transform"');
                } else {
                    fail('Node group should include "transform"');
                }

                if (instance.description.properties && Array.isArray(instance.description.properties)) {
                    pass(`Node has ${instance.description.properties.length} properties`);
                } else {
                    fail('Node properties not found or not array');
                }
            } else {
                fail('Node description property missing');
            }

            if (typeof instance.execute === 'function') {
                pass('Node execute method exists');
            } else {
                fail('Node execute method missing');
            }
        } else {
            fail('FhirPatient class not exported');
        }
    } else {
        fail('Compiled node file not found');
    }
} catch (error) {
    fail(`Error loading node: ${error.message}`);
}

// Test 5: Dependencies
section('Dependencies Verification');

try {
    // Check if utilities can be loaded
    const utilPath = './dist/src/utils/fhirTransform.js';
    if (fs.existsSync(utilPath)) {
        const { FhirTransformer } = require(utilPath);
        if (FhirTransformer) {
            pass('FhirTransformer utility can be loaded');
        } else {
            fail('FhirTransformer not exported from utilities');
        }
    } else {
        fail('FhirTransform utility not compiled');
    }
} catch (error) {
    fail(`Error loading utilities: ${error.message}`);
}

// Test 6: Build Process
section('Build Process');

// Check if build artifacts are up to date
const srcModified = getLatestModified('./nodes/FhirPatient/');
const distModified = getLatestModified('./dist/nodes/FhirPatient/');

if (srcModified && distModified) {
    if (distModified >= srcModified) {
        pass('Build artifacts are up to date');
    } else {
        fail('Build artifacts outdated - run npm run build');
    }
}

function getLatestModified(dir) {
    try {
        if (!fs.existsSync(dir)) return null;
        const stats = fs.statSync(dir);
        return stats.mtime;
    } catch {
        return null;
    }
}

// Summary
section('Summary');

const total = passed + failed;
console.log(`\nTests completed: ${total}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed === 0) {
    console.log('\n🎉 All tests passed! Your FHIR nodes are ready for n8n deployment.');
    console.log('\nNext steps:');
    console.log('1. Deploy to Docker environment with n8n');
    console.log('2. Check n8n logs for node registration');
    console.log('3. Test node functionality in n8n interface');
    console.log('4. Migrate remaining nodes if Patient node works');
} else {
    console.log('\n⚠️  Some tests failed. Fix the issues above before deployment.');
    console.log('\nRecommended actions:');
    if (failed > passed / 2) {
        console.log('- Run: npm run build');
        console.log('- Check package.json configuration');
        console.log('- Verify TypeScript setup');
    }
}

console.log('\n📋 For Docker testing, use: docker-compose-typescript.yml');
console.log('📋 For troubleshooting, check n8n logs: docker logs n8n-typescript-test');

process.exit(failed > 0 ? 1 : 0);