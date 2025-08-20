/**
 * CSS Selector Usage Analyzer
 * Analyzes CSS rules from <style> tags and reports their usage on the page
 */

function getStyleElementRules() {
    const styleElements = document.querySelectorAll('style');
    const allRules = [];
    
    styleElements.forEach((styleElement, index) => {
        try {
            const sheet = styleElement.sheet;
            if (sheet) {
                const rules = sheet.cssRules || sheet.rules;
                for (let rule of rules) {
                    if (rule instanceof CSSStyleRule) {
                        allRules.push({
                            selector: rule.selectorText,
                            styles: rule.style.cssText,
                            styleElementIndex: index,
                            rule: rule
                        });
                    }
                }
            }
        } catch (e) {
            console.log('Error accessing style element:', e);
        }
    });
    
    return allRules;
}

function getCompleteUsageAnalysis(rules) {
    const analysis = {
        totalRules: rules.length,
        usedRules: 0,
        unusedRules: 0,
        invalidRules: 0,
        totalMatches: 0,
        ruleDetails: [],
        summary: {}
    };
    
    rules.forEach(rule => {
        try {
            const selector = rule.selector;
            let elements = [];
            let matchCount = 0;
            let isUsed = false;
            
            // Check if selector contains pseudoselectors
            if (selector.includes(':')) {
                // Extract base selector (before any pseudoselector)
                const baseSelector = selector.split(':')[0];
                
                // Check if base elements exist
                try {
                    elements = document.querySelectorAll(baseSelector);
                    matchCount = elements.length;
                    isUsed = matchCount > 0;
                } catch (e) {
                    // If base selector is invalid, try the full selector
                    try {
                        elements = document.querySelectorAll(selector);
                        matchCount = elements.length;
                        isUsed = matchCount > 0;
                    } catch (e2) {
                        // Both failed, mark as unused
                        isUsed = false;
                    }
                }
            } else {
                // No pseudoselector, use normal query
                elements = document.querySelectorAll(selector);
                matchCount = elements.length;
                isUsed = matchCount > 0;
            }
            
            const ruleDetail = {
                selector: rule.selector,
                matchCount: matchCount,
                isUsed: isUsed,
                elements: Array.from(elements).map(el => ({
                    tagName: el.tagName,
                    id: el.id,
                    className: el.className
                })),
                rule: rule
            };
            
            analysis.ruleDetails.push(ruleDetail);
            analysis.totalMatches += matchCount;
            
            if (isUsed) {
                analysis.usedRules++;
            } else {
                analysis.unusedRules++;
            }
        } catch (e) {
            analysis.invalidRules++;
            analysis.ruleDetails.push({
                selector: rule.selector,
                matchCount: 0,
                isUsed: false,
                error: e.message,
                rule: rule
            });
        }
    });
    
    // Calculate summary statistics
    analysis.summary = {
        usageRate: (analysis.usedRules / analysis.totalRules * 100).toFixed(2) + '%',
        averageMatchesPerRule: (analysis.totalMatches / analysis.totalRules).toFixed(2),
        mostUsedSelector: analysis.ruleDetails
            .filter(r => r.isUsed)
            .sort((a, b) => b.matchCount - a.matchCount)[0] || null
    };
    
    return analysis;
}

function logUsageReport(rules) {
    const analysis = getCompleteUsageAnalysis(rules);
    
    console.group('CSS Selector Usage Report');
    console.log(`Total Rules: ${analysis.totalRules}`);
    console.log(`Used Rules: ${analysis.usedRules}`);
    console.log(`Unused Rules: ${analysis.unusedRules}`);
    console.log(`Invalid Rules: ${analysis.invalidRules}`);
    console.log(`Usage Rate: ${analysis.summary.usageRate}`);
    console.log(`Total Matches: ${analysis.totalMatches}`);
    console.log(`Average Matches per Rule: ${analysis.summary.averageMatchesPerRule}`);
    
    if (analysis.summary.mostUsedSelector) {
        console.log(`Most Used Selector: ${analysis.summary.mostUsedSelector.selector} (${analysis.summary.mostUsedSelector.matchCount} matches)`);
    }
    
    console.group('Used Selectors:');
    analysis.ruleDetails
        .filter(r => r.isUsed)
        .forEach(rule => {
            console.log(`${rule.selector}: ${rule.matchCount} matches`);
        });
    console.groupEnd();
    
    console.group('Unused Selectors:');
    analysis.ruleDetails
        .filter(r => !r.isUsed && !r.error)
        .forEach(rule => {
            console.log(rule.selector);
        });
    console.groupEnd();
    
    // Log unused selectors as a copyable array
    const unusedSelectors = analysis.ruleDetails
        .filter(r => !r.isUsed && !r.error)
        .map(r => r.selector);
    console.log('Unused Selectors Array (copyable):', unusedSelectors);
    
    if (analysis.ruleDetails.some(r => r.error)) {
        console.group('Invalid Selectors:');
        analysis.ruleDetails
            .filter(r => r.error)
            .forEach(rule => {
                console.log(`${rule.selector}: ${rule.error}`);
            });
        console.groupEnd();
    }
    
    console.groupEnd();
}

// Additional utility functions

function getUnusedSelectorsArray(rules) {
    const analysis = getCompleteUsageAnalysis(rules);
    return analysis.ruleDetails
        .filter(r => !r.isUsed && !r.error)
        .map(r => r.selector);
}

function getUsedSelectorsArray(rules) {
    const analysis = getCompleteUsageAnalysis(rules);
    return analysis.ruleDetails
        .filter(r => r.isUsed)
        .map(r => r.selector);
}

function getInvalidSelectorsArray(rules) {
    const analysis = getCompleteUsageAnalysis(rules);
    return analysis.ruleDetails
        .filter(r => r.error)
        .map(r => r.selector);
}

function analyzeCSSOptimization(rules) {
    const usedRules = rules.filter(r => r.isUsed);
    
    // 1. Exact Duplicates
    const cssTextGroups = {};
    usedRules.forEach(ruleDetail => {
        const cssText = ruleDetail.rule.styles;
        if (!cssTextGroups[cssText]) {
            cssTextGroups[cssText] = [];
        }
        cssTextGroups[cssText].push(ruleDetail.rule.selector);
    });
    
    const exactDuplicates = Object.entries(cssTextGroups)
        .filter(([cssText, selectors]) => selectors.length > 1)
        .map(([cssText, selectors]) => ({
            selectors: selectors,
            cssText: cssText
        }));
    
    // 2. Equivalent Rules (simplified - just color and margin normalization)
    const equivalentGroups = [];
    const processedRules = new Set();
    
    usedRules.forEach(ruleDetail1 => {
        if (processedRules.has(ruleDetail1.rule.selector)) return;
        
        const group = [ruleDetail1];
        const normalized1 = normalizeCSSValues(ruleDetail1.rule.styles);
        
        usedRules.forEach(ruleDetail2 => {
            if (ruleDetail1.rule.selector === ruleDetail2.rule.selector || processedRules.has(ruleDetail2.rule.selector)) return;
            
            const normalized2 = normalizeCSSValues(ruleDetail2.rule.styles);
            if (normalized1 === normalized2 && ruleDetail1.rule.styles !== ruleDetail2.rule.styles) {
                group.push(ruleDetail2);
            }
        });
        
        if (group.length > 1) {
            equivalentGroups.push(group);
            group.forEach(rule => processedRules.add(rule.rule.selector));
        }
    });
    
    // 3. Redundant Properties (same selector with different values)
    const selectorGroups = {};
    usedRules.forEach(ruleDetail => {
        const selector = ruleDetail.rule.selector;
        if (!selectorGroups[selector]) {
            selectorGroups[selector] = [];
        }
        selectorGroups[selector].push(ruleDetail);
    });
    
    const redundantProperties = Object.entries(selectorGroups)
        .filter(([selector, rules]) => rules.length > 1)
        .map(([selector, rules]) => ({
            selector: selector,
            rules: rules
        }));
    
    return {
        exactDuplicates: exactDuplicates,
        equivalentRules: equivalentGroups,
        redundantProperties: redundantProperties
    };
}

function normalizeCSSValues(cssText) {
    // Simple normalization for common cases
    let normalized = cssText;
    
    // Normalize colors
    normalized = normalized.replace(/#ff0000/g, 'red');
    normalized = normalized.replace(/#00ff00/g, 'lime');
    normalized = normalized.replace(/#0000ff/g, 'blue');
    normalized = normalized.replace(/#ffffff/g, 'white');
    normalized = normalized.replace(/#000000/g, 'black');
    
    // Normalize margin/padding shorthand
    normalized = normalized.replace(/margin:\s*(\d+px)\s+\1\s+\1\s+\1/g, 'margin:$1');
    normalized = normalized.replace(/padding:\s*(\d+px)\s+\1\s+\1\s+\1/g, 'padding:$1');
    
    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
}

function applyOptimizations(usedRules, optimization) {
    let optimizedRules = [...usedRules];
    
    // 1. Handle exact duplicates - keep only the first occurrence
    const processedSelectors = new Set();
    const duplicateSelectors = new Set();
    
    optimization.exactDuplicates.forEach(duplicate => {
        duplicate.selectors.forEach((selector, index) => {
            if (index > 0) { // Skip the first one, mark others for removal
                duplicateSelectors.add(selector);
            }
        });
    });
    
    optimizedRules = optimizedRules.filter(rule => !duplicateSelectors.has(rule.selector));
    
    // 2. Handle equivalent rules - keep the first occurrence with normalized syntax
    const equivalentSelectors = new Set();
    optimization.equivalentRules.forEach(group => {
        group.forEach((ruleDetail, index) => {
            if (index > 0) { // Skip the first one, mark others for removal
                equivalentSelectors.add(ruleDetail.rule.selector);
            }
        });
    });
    
    optimizedRules = optimizedRules.filter(rule => !equivalentSelectors.has(rule.selector));
    
    // 3. Handle redundant properties - keep only the last occurrence
    const redundantSelectors = new Set();
    optimization.redundantProperties.forEach(redundant => {
        redundant.rules.forEach((ruleDetail, index) => {
            if (index < redundant.rules.length - 1) { // Keep only the last one
                redundantSelectors.add(ruleDetail.rule.selector);
            }
        });
    });
    
    optimizedRules = optimizedRules.filter(rule => !redundantSelectors.has(rule.selector));
    
    // Generate optimized CSS content
    const optimizedCSSContent = optimizedRules.map(rule => {
        const cssText = rule.styles;
        const selector = rule.selector;
        return `${selector} {\n${cssText}\n}`;
    }).join('\n\n');
    
    return optimizedCSSContent;
}

function logOptimizationReport(optimization) {
    console.group('CSS Optimization Report');
    
    // Calculate statistics
    const originalRules = window.cssAnalysisResults.analysis.ruleDetails.filter(r => r.isUsed).length;
    
    // Count rules that will be removed by each optimization
    const duplicateSelectors = new Set();
    optimization.exactDuplicates.forEach(duplicate => {
        duplicate.selectors.forEach((selector, index) => {
            if (index > 0) duplicateSelectors.add(selector);
        });
    });
    
    const equivalentSelectors = new Set();
    optimization.equivalentRules.forEach(group => {
        group.forEach((ruleDetail, index) => {
            if (index > 0) equivalentSelectors.add(ruleDetail.rule.selector);
        });
    });
    
    const redundantSelectors = new Set();
    optimization.redundantProperties.forEach(redundant => {
        redundant.rules.forEach((ruleDetail, index) => {
            if (index < redundant.rules.length - 1) redundantSelectors.add(ruleDetail.rule.selector);
        });
    });
    
    const totalRemoved = duplicateSelectors.size + equivalentSelectors.size + redundantSelectors.size;
    const optimizedRules = originalRules - totalRemoved;
    const percentageReduction = ((totalRemoved / originalRules) * 100).toFixed(1);
    
    // Display statistics
    console.log(`📊 Optimization Statistics:`);
    console.log(`   Original rules: ${originalRules}`);
    console.log(`   Rules after optimization: ${optimizedRules}`);
    console.log(`   Rules removed: ${totalRemoved} (${percentageReduction}% reduction)`);
    console.log(`   - Exact duplicates: ${duplicateSelectors.size}`);
    console.log(`   - Equivalent rules: ${equivalentSelectors.size}`);
    console.log(`   - Redundant properties: ${redundantSelectors.size}`);
    console.log('');
    
    // 1. Exact Duplicates
    if (optimization.exactDuplicates.length > 0) {
        console.group('1. Exact Duplicates Found:');
        optimization.exactDuplicates.forEach((duplicate, index) => {
            console.log(`\nDuplicate ${index + 1}:`);
            console.log(`Selectors: ${duplicate.selectors.join(', ')}`);
            console.log(`CSS: ${duplicate.cssText}`);
            console.log(`Suggestion: Combine into: ${duplicate.selectors.join(', ')} { ${duplicate.cssText} }`);
        });
        console.groupEnd();
    } else {
        console.log('1. No exact duplicates found ✓');
    }
    
    // 2. Equivalent Rules
    if (optimization.equivalentRules.length > 0) {
        console.group('2. Equivalent Rules Found:');
        optimization.equivalentRules.forEach((group, index) => {
            console.log(`\nEquivalent Group ${index + 1}:`);
            group.forEach(rule => {
                console.log(`- ${rule.rule.selector}: ${rule.rule.styles}`);
            });
            console.log(`Suggestion: Use consistent syntax across all selectors`);
        });
        console.groupEnd();
    } else {
        console.log('2. No equivalent rules found ✓');
    }
    
    // 3. Redundant Properties
    if (optimization.redundantProperties.length > 0) {
        console.group('3. Redundant Properties Found:');
        optimization.redundantProperties.forEach((redundant, index) => {
            console.log(`\nRedundant Selector: ${redundant.selector}`);
            redundant.rules.forEach((rule, ruleIndex) => {
                console.log(`  Rule ${ruleIndex + 1}: ${rule.rule.styles}`);
            });
            console.log(`Warning: Later rules will override earlier ones`);
        });
        console.groupEnd();
    } else {
        console.log('3. No redundant properties found ✓');
    }
    
    console.groupEnd();
}

function exportUsedCSS() {
    const styleElementRules = getStyleElementRules();
    const analysis = getCompleteUsageAnalysis(styleElementRules);
    
    // Get all used rules with their full CSS content
    const usedRules = analysis.ruleDetails
        .filter(r => r.isUsed)
        .map(r => r.rule);
    
    // Apply optimizations
    const optimization = analyzeCSSOptimization(analysis.ruleDetails);
    const optimizedCSS = applyOptimizations(usedRules, optimization);
    
    // Generate filename with epoch timestamp
    const htmlFileName = window.location.pathname.split('/').pop().replace('.html', '') || 'page';
    const epochTime = Math.floor(Date.now() / 1000);
    const filename = `${htmlFileName}_${epochTime}.css`;
    
    // Create and download the file
    const blob = new Blob([optimizedCSS], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Exported ${usedRules.length} used CSS rules (optimized) to ${filename}`);
    console.log(`Total rules analyzed: ${styleElementRules.length}`);
    console.log(`Used rules: ${usedRules.length}`);
    console.log(`Unused rules: ${styleElementRules.length - usedRules.length}`);
    
    return {
        filename: filename,
        usedRules: usedRules.length,
        totalRules: styleElementRules.length,
        unusedRules: styleElementRules.length - usedRules.length
    };
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        getStyleElementRules,
        getCompleteUsageAnalysis,
        logUsageReport,
        getUnusedSelectorsArray,
        getUsedSelectorsArray,
        getInvalidSelectorsArray,
        exportUsedCSS,
        analyzeCSSOptimization,
        logOptimizationReport,
        applyOptimizations
    };
} else if (typeof window !== 'undefined') {
    // Browser environment - make functions globally available
    window.cssAnalyzer = {
        getStyleElementRules,
        getCompleteUsageAnalysis,
        logUsageReport,
        getUnusedSelectorsArray,
        getUsedSelectorsArray,
        getInvalidSelectorsArray,
        exportUsedCSS,
        analyzeCSSOptimization,
        logOptimizationReport,
        applyOptimizations
    };
}

// Auto-run analysis when DOM is loaded (browser only)
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('CSS Analyzer loaded. Running analysis...');
        
        const styleElementRules = getStyleElementRules();
        console.log('Rules from style elements:', styleElementRules);
        
        // Log detailed report
        logUsageReport(styleElementRules);
        
        // Make results available globally
        window.cssAnalysisResults = {
            rules: styleElementRules,
            analysis: getCompleteUsageAnalysis(styleElementRules),
            unusedSelectors: getUnusedSelectorsArray(styleElementRules),
            usedSelectors: getUsedSelectorsArray(styleElementRules),
            invalidSelectors: getInvalidSelectorsArray(styleElementRules),
            optimization: analyzeCSSOptimization(getCompleteUsageAnalysis(styleElementRules).ruleDetails)
        };
        
        console.info('Analysis complete. To download the CSS file with unused selectors removed, run: %cexportUsedCSS()%c', 'color:rgb(241, 2, 2); font-weight: bold;', '');
        console.warn('If using as a separate CSS file, relative paths to imported assets will need to be updated. ')
        
        // Run optimization analysis immediately after usage analysis
        logOptimizationReport(window.cssAnalysisResults.optimization);

    });
}
