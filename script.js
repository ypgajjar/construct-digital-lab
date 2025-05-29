document.addEventListener('DOMContentLoaded', function() {
    const moduleDisplayGrid = document.getElementById('moduleDisplayGrid');
    const inspectorModal = document.getElementById('toolInspector');
    const closeInspectorButton = document.querySelector('.inspector-close-btn');
    const categoryFilterLinks = document.querySelectorAll('.category-filter');
    const systemLoader = document.getElementById('systemLoader');
    const labHeader = document.querySelector('.lab-header');
    const body = document.body;
    const themeToggleButton = document.getElementById('themeToggleButton');
    const noModulesMessage = document.querySelector('.no-modules-message');

    // --- PROJECT DATA (Keep your existing project structure, add `thumbnailImage` & `icon` for modules) ---
    const projects = [
        {
            id: 'monte-carlo', title: 'Monte Carlo Simulator', category: 'project-management',
            shortDesc: 'Probabilistic forecasting for project timelines and budgets.',
            description: 'Advanced probabilistic forecasting for project timelines and budgets, leveraging Monte Carlo methods to enhance risk assessment and provide data-driven decision confidence.',
            tags: ['Forecasting', 'Risk Analysis', 'Stochastic Modeling', 'Budget Control'],
            ghPagesUrl: 'https://ypgajjar.github.io/monte-carlo-simulator/',
            thumbnailImage: 'images/monte_carlo_thumb.png',
            coverImage: 'images/monte_carlo_cover.png',
            icon: 'fas fa-chart-line', // Added icon
            features: [
                'Thousands of Iterations for Robust Scenario Analysis.',
                'Probability Distributions for Completion & Costs.',
                'Critical Path & Risk Factor Identification.',
                'Intuitive Variable Input & Output Visualization.'
            ]
        },
        {
            id: 'lob-calculator', title: 'Line of Balance (LOB) Suite', category: 'project-management',
            shortDesc: 'Visualize and optimize repetitive work sequences.',
            description: 'A comprehensive tool to visualize and optimize repetitive work sequences across multiple units, promoting lean construction principles and streamlined scheduling for cyclical projects.',
            tags: ['Linear Scheduling', 'Lean Construction', 'Workflow Visualization', 'Process Optimization'],
            ghPagesUrl: 'https://ypgajjar.github.io/lob-calculator/',
            thumbnailImage: 'images/lob_calculator_thumb.png',
            coverImage: 'images/lob_calculator_cover.png',
            icon: 'fas fa-stream', // Added icon
            features: [
                'Dynamic Tracking of Repetitive Task Progress.',
                'Early Identification of Bottlenecks & Delays.',
                'Support for Linear & Rhythmic Project Scheduling.',
                'Clear Graphical Output for Progress & Forecasting.'
            ]
        },
        {
            id: 'qa-qc-checklists', title: 'ConstructCheck AI (QA/QC)', category: 'project-management',
            shortDesc: 'AI-enhanced quality control checklists by CSI division.',
            description: 'An intelligent platform for organized quality control checklists, aligned with CSI divisions and augmented with AI insights (Beta) for thorough project oversight and compliance assurance.',
            tags: ['Quality Assurance', 'AI Inspection', 'CSI Standards', 'Digital Compliance'],
            ghPagesUrl: 'https://ypgajjar.github.io/qa-qc-checklists/',
            thumbnailImage: 'images/qa_qc_checklists_thumb.png',
            coverImage: 'images/qa_qc_checklists_cover.png',
            icon: 'fas fa-check-double', // Added icon
            features: [
                'Standardized Checklists based on CSI MasterFormat.',
                'AI-Powered Anomaly Detection & Suggestions (Beta).',
                'Secure Digital Record Keeping & Audit Trails.',
                'Improved Site Inspection Efficiency & Accuracy.'
            ]
        },
        {
            id: 'project-crashing', title: 'Cost Acceleration Optimizer', category: 'project-management',
            shortDesc: 'Analyze cost-schedule trade-offs for acceleration.',
            description: 'Strategically analyze cost and schedule trade-offs using advanced crashing techniques to determine the most economically efficient methods for accelerating project timelines under pressure.',
            tags: ['Schedule Optimization', 'Cost-Benefit Analysis', 'Critical Path Method', 'Project Acceleration'],
            ghPagesUrl: 'https://ypgajjar.github.io/project-crashing-optimizer/',
            thumbnailImage: 'images/project_crashing_optimizer_thumb.png',
            coverImage: 'images/project_crashing_optimizer_cover.png',
            icon: 'fas fa-fighter-jet', // Added icon
            features: [
                'Optimal Cost Calculation for Schedule Reduction Targets.',
                'Identification of Critical Activities for Crashing.',
                'Data-Driven Support for Time-Sensitive Decisions.',
                'Visualization of Cost-Time Trade-Off Curves.'
            ]
        },
        // For Geo-Tech 
        /* {
            id: 'soil-analyzer', title: 'Soil Stability Analyzer', category: 'geo-tech',
            shortDesc: 'Preliminary soil bearing capacity and settlement analysis.',
            description: 'A foundational tool for geotechnical engineers to perform preliminary analysis of soil bearing capacity and potential settlement, based on standard penetration test (SPT) data and soil type.',
            tags: ['Geotechnical', 'Soil Mechanics', 'Foundation Design', 'SPT Analysis'],
            ghPagesUrl: '#', // Replace with actual link
            thumbnailImage: 'images/soil_analyzer_thumb.png', // Create this image
            coverImage: 'images/soil_analyzer_cover.png',   // Create this image
            icon: 'fas fa-mountain',
            features: [
                'Input for Soil Type, SPT N-values, and Water Table Depth.',
                'Calculation of Allowable Bearing Capacity.',
                'Estimation of Immediate and Consolidation Settlement.',
                'Graphical Representation of Soil Profile and Results.'
            ]
        } */
    ];

    // --- Initial Loader Logic ---
    const loaderTexts = document.querySelectorAll('.loader-text-item');
    let currentTextIndex = 0;
    function showNextLoaderText() {
        loaderTexts.forEach(text => text.classList.remove('visible'));
        if (currentTextIndex < loaderTexts.length) {
            loaderTexts[currentTextIndex].classList.add('visible');
            currentTextIndex++;
            // REDUCED TIMEOUTS for loader text sequence
            setTimeout(showNextLoaderText, currentTextIndex === loaderTexts.length ? 500 : 350); // Last message stays a bit longer
        } else {
            // All messages shown, now hide loader
            // REDUCED TIMEOUT before hiding loader
            setTimeout(() => {
                systemLoader.classList.remove('active');
                 // Start hero text animation after loader is gone
                animateHeroText();
            }, 200); // Shortened delay
        }
    }
    window.addEventListener('load', () => {
        // REDUCED TIMEOUT before starting loader text
        setTimeout(showNextLoaderText, 50); // Start loader text sequence almost immediately after load
    });

    // --- Hero Text Animation ---
    function animateHeroText() {
        const heroTitle = document.querySelector('.hero-text h1');
        const heroParagraph = document.querySelector('.hero-text p');
        const heroButton = document.querySelector('.hero-text .cta-button');

        if (heroTitle) heroTitle.classList.add('visible');
        if (heroParagraph) setTimeout(() => heroParagraph.classList.add('visible'), 200); // Faster reveal
        if (heroButton) setTimeout(() => heroButton.classList.add('visible'), 400);    // Faster reveal
    }


    // --- Dynamic Header Scroll & Active Nav Link ---
    let lastScrollY = window.scrollY;
    const navLinks = document.querySelectorAll('.lab-nav .nav-link');
    const sections = document.querySelectorAll('section[id], div[id^="hero-interface-anchor"], div[id^="tool-interface-anchor"]');
    const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 70;


    window.addEventListener('scroll', () => {
        // Header hide/show
        if (window.scrollY > headerHeight && window.scrollY > lastScrollY) { // Use dynamic header height
            labHeader.classList.add('header-hidden');
        } else {
            labHeader.classList.remove('header-hidden');
        }
        lastScrollY = window.scrollY;

        // Active nav link
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - headerHeight - 20; // Adjust offset
            if (window.scrollY >= sectionTop) {
                currentSectionId = section.getAttribute('id').replace('-anchor', '');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active-nav-link');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active-nav-link');
            } else if (link.getAttribute('href') === `#${currentSectionId}-anchor`) {
                 link.classList.add('active-nav-link');
            }
        });
         // Fallback for top of page
        if (window.scrollY < sections[0].offsetTop - headerHeight - 20) {
            navLinks.forEach(link => link.classList.remove('active-nav-link'));
            if (navLinks[0]) navLinks[0].classList.add('active-nav-link');
        }
    });

    // --- RENDER PROJECT "MODULES" ---
    function renderModules(filterCategory = 'all') {
        moduleDisplayGrid.innerHTML = ''; // Clear previous modules
        const filteredProjects = filterCategory === 'all'
            ? projects
            : projects.filter(p => p.category === filterCategory);

        if (filteredProjects.length === 0) {
            noModulesMessage.style.display = 'block';
            moduleDisplayGrid.appendChild(noModulesMessage); // Ensure it's part of the grid for layout
            return;
        }
        noModulesMessage.style.display = 'none';

        filteredProjects.forEach((project, index) => {
            const moduleEl = document.createElement('div');
            moduleEl.classList.add('project-module');
            moduleEl.dataset.projectId = project.id;

            let tagsHTML = '';
            if (project.tags && project.tags.length > 0) {
                tagsHTML = `<div class="module-tags-list">
                                ${project.tags.slice(0, 3).map(tag => `<span class="tag"><i class="fas fa-tag fa-xs"></i> ${tag}</span>`).join('')}
                                ${project.tags.length > 3 ? '<span class="tag">...</span>' : ''}
                            </div>`;
            }

            moduleEl.innerHTML = `
                <div class="module-header">
                    <i class="${project.icon || 'fas fa-cube'} module-icon"></i>
                    <h4>${project.title}</h4>
                </div>
                <div class="module-thumbnail">
                    <img src="${project.thumbnailImage || 'images/default_thumb.png'}" alt="${project.title} Thumbnail" loading="lazy">
                     <div class="thumbnail-overlay"><i class="fas fa-search"></i> View Details</div>
                </div>
                <p class="module-short-desc">${project.shortDesc || project.description.substring(0, 70) + '...'}</p>
                ${tagsHTML}
                <button class="module-inspect-button" aria-label="Inspect ${project.title}">
                    Inspect Module <i class="fas fa-arrow-right"></i>
                </button>
            `;
            moduleEl.addEventListener('click', () => openInspector(project.id));
            moduleDisplayGrid.appendChild(moduleEl);

            // Staggered animation using Intersection Observer for better performance
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // REDUCED STAGGER for module card animation
                        setTimeout(() => {
                           entry.target.classList.add('visible');
                        }, index * 60); // Faster stagger
                        observer.unobserve(entry.target); // Stop observing once visible
                    }
                });
            }, { threshold: 0.1 });
            observer.observe(moduleEl);
        });
    }

    // --- TOOL INSPECTOR MODAL HANDLING ---
    function openInspector(projectId) {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        document.getElementById('inspectorTitle').textContent = project.title;
        document.getElementById('inspectorIcon').className = `${project.icon || 'fas fa-tools'} inspector-title-icon`;
        document.getElementById('inspectorImage').src = project.coverImage || 'images/default_cover.png';
        document.getElementById('inspectorImage').alt = project.title + " Visual Representation";
        document.getElementById('inspectorDescription').textContent = project.description;
        
        const inspectorTagsContainer = document.getElementById('inspectorTags');
        inspectorTagsContainer.innerHTML = '';
        if (project.tags && project.tags.length > 0) {
            project.tags.forEach(tagText => {
                const tagEl = document.createElement('span');
                tagEl.classList.add('tag');
                tagEl.innerHTML = `<i class="fas fa-hashtag fa-xs"></i> ${tagText}`;
                inspectorTagsContainer.appendChild(tagEl);
            });
        }

        const featuresList = document.getElementById('inspectorFeatures');
        featuresList.innerHTML = '';
        if (project.features && project.features.length > 0) {
            project.features.forEach(featureText => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-check-circle feature-icon"></i> ${featureText}`;
                featuresList.appendChild(li);
            });
        }
        document.getElementById('inspectorLaunchLink').href = project.ghPagesUrl;
        
        inspectorModal.classList.add('active');
        body.classList.add('modal-open');
    }

    function closeInspector() {
        inspectorModal.classList.remove('active');
        body.classList.remove('modal-open');
    }

    closeInspectorButton.addEventListener('click', closeInspector);
    inspectorModal.addEventListener('click', function(event) {
        if (event.target === inspectorModal) { closeInspector(); }
    });
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && inspectorModal.classList.contains('active')) {
            closeInspector();
        }
    });

    // --- CATEGORY FILTERING ---
    categoryFilterLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            categoryFilterLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            renderModules(this.dataset.category);
        });
    });
    
    // --- THEME TOGGLE ---
    function setTheme(theme) {
        if (theme === 'dark') {
            body.classList.remove('light-theme');
            body.classList.add('blueprint-theme'); // blueprint-theme is the dark theme
            themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>'; // Show moon, click for sun (light)
            localStorage.setItem('theme', 'dark');
        } else { // 'light'
            body.classList.remove('blueprint-theme');
            body.classList.add('light-theme');
            themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>'; // Show sun, click for moon (dark)
            localStorage.setItem('theme', 'light');
        }
    }

    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        setTheme(currentTheme); // Respect user's saved choice
    } else {
        // No saved theme, so set light as the default
        setTheme('light');
    }

    themeToggleButton.addEventListener('click', () => {
        if (body.classList.contains('light-theme')) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    });
    
    // --- Initialize ---
    document.getElementById('currentYearLab').textContent = new Date().getFullYear();
    renderModules(); // Initial render of all modules
});