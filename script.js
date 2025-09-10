let allContests = [];
let filteredContests = [];

// DOM Elements
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const themeToggle = document.getElementById('themeToggle');
const contestList = document.getElementById('contestList');
const contestStats = document.getElementById('contestStats');
const totalContestsSpan = document.getElementById('totalContests');

// Initialize the application
async function initApp() {
    console.log('🚀 UIU Contest Archive initializing...');
    
    // Setup theme
    setupTheme();
    
    // Load contests
    await loadContests();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial render
    renderContests();
    
    console.log('✅ Application initialized successfully');
}

// Theme Management
function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Load contests from JSON
async function loadContests() {
    try {
        showLoading();
        console.log('Fetching contest data...');
        
        const response = await fetch('uiu_contest_archive.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contests = await response.json();
        allContests = contests.filter(contest => contest && contest.contestName);
        filteredContests = [...allContests];
        
        console.log(`✅ Loaded ${allContests.length} contests`);
        hideLoading();
        
    } catch (error) {
        console.error('❌ Failed to load contests:', error);
        showError('Failed to load contest data. Please try again later.');
        hideLoading();
    }
}

// Event Listeners
function setupEventListeners() {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    sortSelect.addEventListener('change', handleSort);
}

// Search functionality
function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    
    if (!query) {
        filteredContests = [...allContests];
    } else {
        filteredContests = allContests.filter(contest => {
            const contestMatch = contest.contestName.toLowerCase().includes(query) ||
                                contest.contestType.toLowerCase().includes(query) ||
                                contest.year.toString().includes(query);
            
            const teamMatch = contest.teams && contest.teams.some(team => {
                if (!team || !team.teamName) return false;
                
                const teamNameMatch = team.teamName.toLowerCase().includes(query);
                const coachMatch = team.teamCoach && team.teamCoach.toLowerCase().includes(query);
                const memberMatch = team.teamMembers && team.teamMembers.some(member => 
                    member && member.toLowerCase().includes(query)
                );
                
                return teamNameMatch || coachMatch || memberMatch;
            });
            
            return contestMatch || teamMatch;
        });
    }
    
    renderContests();
}

// Sort functionality
function handleSort() {
    const sortBy = sortSelect.value;
    
    filteredContests.sort((a, b) => {
        switch (sortBy) {
            case 'year-desc':
                // Sort by year first, then by date within the same year
                if (a.year !== b.year) {
                    return (b.year || 0) - (a.year || 0);
                }
                // If same year, sort by date
                return compareDates(b.date, a.date);
            case 'year-asc':
                if (a.year !== b.year) {
                    return (a.year || 0) - (b.year || 0);
                }
                return compareDates(a.date, b.date);
            case 'name-asc':
                return (a.contestName || '').localeCompare(b.contestName || '');
            case 'name-desc':
                return (b.contestName || '').localeCompare(a.contestName || '');
            default:
                return 0;
        }
    });
    
    renderContests();
}

// Helper function to compare dates
function compareDates(dateA, dateB) {
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    // Parse dates like "February 18", "March 24", etc.
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date(0);
        const months = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3,
            'May': 4, 'June': 5, 'July': 6, 'August': 7,
            'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        
        const parts = dateStr.split(' ');
        if (parts.length >= 2) {
            const month = months[parts[0]] || 0;
            const day = parseInt(parts[1]) || 1;
            return new Date(2000, month, day); // Use dummy year for comparison
        }
        return new Date(0);
    };
    
    const dateObjA = parseDate(dateA);
    const dateObjB = parseDate(dateB);
    
    return dateObjA.getTime() - dateObjB.getTime();
}

// Render contests
function renderContests() {
    if (!filteredContests.length) {
        showEmptyState();
        return;
    }
    
    updateStats();
    
    contestList.innerHTML = filteredContests.map((contest, index) => 
        createContestCard(contest, index)
    ).join('');
    
    // Add event listeners for expand/collapse
    addToggleListeners();
}

// Create contest card HTML
function createContestCard(contest, index) {
    const validTeams = contest.teams ? contest.teams.filter(team => 
        team && team.teamName && team.teamName.trim()
    ) : [];
    
    return `
        <div class="contest-card fade-in" style="animation-delay: ${index * 0.1}s">
            <div class="contest-header" data-contest-id="${index}">
                <div class="contest-info">
                    <h3>${escapeHtml(contest.contestName)}</h3>
                    <div class="contest-meta">
                        <span class="contest-type">${escapeHtml(contest.contestType || 'Contest')}</span>
                        <span><i class="fas fa-calendar"></i> ${contest.year}</span>
                        ${contest.date ? `<span><i class="fas fa-clock"></i> ${escapeHtml(contest.date)}</span>` : ''}
                        ${contest.totalTeams ? `<span><i class="fas fa-users"></i> ${contest.totalTeams} teams</span>` : ''}
                    </div>
                </div>
                <div class="contest-actions">
                    <div class="contest-links">
                        ${createContestLink(contest.contestLink, 'fas fa-link', 'Contest Link')}
                        ${createContestLink(contest.rankingLink, 'fas fa-trophy', 'Rankings')}
                    </div>
                    <i class="fas fa-chevron-down expand-icon"></i>
                </div>
            </div>
            <div class="teams-section" id="teams-${index}">
                ${validTeams.length > 0 ? createTeamsGrid(validTeams) : '<div class="no-teams">No team information available</div>'}
            </div>
        </div>
    `;
}

// Create contest link
function createContestLink(url, iconClass, title) {
    if (!url) {
        return `<span class="icon-link disabled" title="No ${title} available"><i class="${iconClass}"></i></span>`;
    }
    return `<a href="${escapeHtml(url)}" class="icon-link" title="${title}" target="_blank"><i class="${iconClass}"></i></a>`;
}

// Create teams grid
function createTeamsGrid(teams) {
    return `
        <div class="teams-grid">
            ${teams.map(team => createTeamCard(team)).join('')}
        </div>
    `;
}

// Create team card
function createTeamCard(team) {
    const validMembers = team.teamMembers ? team.teamMembers.filter(member => 
        member && member.trim()
    ) : [];
    
    return `
        <div class="team-card">
            <div class="team-header">
                <h4 class="team-name">${escapeHtml(team.teamName)}</h4>
                ${team.position ? `<span class="position-badge">Rank ${escapeHtml(team.position)}</span>` : ''}
            </div>
            
            ${team.teamCoach ? `
                <div class="team-coach">
                    <strong>Coach:</strong> ${escapeHtml(team.teamCoach)}
                </div>
            ` : ''}
            
            ${validMembers.length > 0 ? `
                <div class="team-members">
                    <strong>Team Members:</strong>
                    <ul>
                        ${validMembers.map(member => `<li>${escapeHtml(member.trim())}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div class="team-footer">
                <div class="team-links">
                    ${createTeamLink(team.teamPicture, 'fas fa-image', 'Team Picture')}
                    ${createTeamLink(team.teamInfoLink, 'fas fa-info-circle', 'Team Info')}
                </div>
                ${team.remarks ? `<div class="remarks">${escapeHtml(team.remarks)}</div>` : ''}
            </div>
        </div>
    `;
}

// Create team link
function createTeamLink(url, iconClass, title) {
    const linkClass = url ? 'team-link' : 'team-link disabled';
    const clickHandler = url ? `href="${escapeHtml(url)}" target="_blank"` : '';
    
    return `<a ${clickHandler} class="${linkClass}" title="${url ? title : `No ${title} available`}"><i class="${iconClass}"></i></a>`;
}

// Add toggle listeners
function addToggleListeners() {
    document.querySelectorAll('.contest-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // Don't toggle when clicking on links
            if (e.target.closest('a')) return;
            
            const contestId = header.dataset.contestId;
            const teamsSection = document.getElementById(`teams-${contestId}`);
            const expandIcon = header.querySelector('.expand-icon');
            
            teamsSection.classList.toggle('expanded');
            expandIcon.classList.toggle('rotated');
        });
    });
}

// Update statistics
function updateStats() {
    totalContestsSpan.textContent = filteredContests.length;
}

// Show loading state
function showLoading() {
    contestList.innerHTML = '<div class="loading"></div>';
}

// Hide loading state
function hideLoading() {
    const loading = document.querySelector('.loading');
    if (loading) {
        loading.remove();
    }
}

// Show error message
function showError(message) {
    contestList.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: var(--error-color);"></i>
            <h3>Error Loading Data</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

// Show empty state
function showEmptyState() {
    contestList.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <h3>No Contests Found</h3>
            <p>Try adjusting your search terms or filters.</p>
        </div>
    `;
    totalContestsSpan.textContent = '0';
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}