// Global variables
let currentSlide = 0;
let sessionData = {};
let filteredSessions = [];
let autoAdvanceIntervalId = null; // For organizers carousel
const ORGANIZERS_ITEMS_PER_VIEW = 3;
const ORGANIZERS_AUTO_ADVANCE_DELAY = 7000; // Slower auto-advance, e.g., 7 seconds

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupSearch();
    setupFilters();
    setupCarousel(); // This will now handle its own auto-advance
    setupModals();
    setupSessionData();
    setupScrollEffects();
    
    // Auto-advance carousel
    setInterval(autoAdvanceCarousel, 5000);
}

// Navigation functionality
function setupNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Animate hamburger
            const spans = navToggle.querySelectorAll('span');
            spans.forEach((span, index) => {
                if (navMenu.classList.contains('active')) {
                    if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
                    if (index === 1) span.style.opacity = '0';
                    if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
                } else {
                    span.style.transform = '';
                    span.style.opacity = '';
                }
            });
        });
    }

    // Close mobile menu when clicking on links
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            const spans = navToggle.querySelectorAll('span');
            spans.forEach(span => {
                span.style.transform = '';
                span.style.opacity = '';
            });
        });
    });

    // Active link highlighting
    window.addEventListener('scroll', updateActiveNavLink);
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.pageYOffset >= sectionTop) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const sessionCards = document.querySelectorAll('.session-card');
    
    sessionCards.forEach(card => {
        const title = card.querySelector('.session-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.session-description')?.textContent.toLowerCase() || '';
        const speaker = card.dataset.speaker?.toLowerCase() || '';
        const topic = card.dataset.topic?.toLowerCase() || '';
        
        const matches = title.includes(searchTerm) || 
                       description.includes(searchTerm) || 
                       speaker.includes(searchTerm) || 
                       topic.includes(searchTerm);
        
        if (matches || searchTerm === '') {
            card.style.display = 'block';
            fadeIn(card);
        } else {
            fadeOut(card);
        }
    });
    
    updateNoResultsMessage();
}

// Filter functionality
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active filter
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Apply filter
            const filterType = this.dataset.filter;
            filterSessions(filterType);
        });
    });
}

function filterSessions(filterType) {
    const sessionCards = document.querySelectorAll('.session-card');
    
    sessionCards.forEach(card => {
        const sessionType = card.dataset.type;
        
        if (filterType === 'all' || sessionType === filterType) {
            card.style.display = 'block';
            fadeIn(card);
        } else {
            fadeOut(card);
        }
    });
    
    updateNoResultsMessage();
}

function updateNoResultsMessage() {
    const visibleSessions = document.querySelectorAll('.session-card[style*="block"]');
    const scheduleGrid = document.getElementById('scheduleGrid');
    
    // Remove existing no results message
    const existingMessage = document.querySelector('.no-results-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (visibleSessions.length === 0) {
        const noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'no-results-message';
        noResultsDiv.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: hsl(var(--text-secondary));">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No sessions found</h3>
                <p>Try adjusting your search terms or filters.</p>
            </div>
        `;
        scheduleGrid.appendChild(noResultsDiv);
    }
}

// Carousel functionality
function setupCarousel() {
    const carousel = document.getElementById('organizersCarousel');
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.organizer-slide');
    if (slides.length === 0) return; // No slides, nothing to do

    const carouselContainer = carousel.parentElement; // Or specific selector if needed

    // Stop auto-advance on hover
    carouselContainer.addEventListener('mouseenter', () => {
        if (autoAdvanceIntervalId) {
            clearInterval(autoAdvanceIntervalId);
            autoAdvanceIntervalId = null; // Clear the ID to indicate it's paused by hover
        }
    });

    carouselContainer.addEventListener('mouseleave', () => {
        // Restart auto-advance only if it was paused by hover and there are enough slides
        if (!autoAdvanceIntervalId && slides.length > ORGANIZERS_ITEMS_PER_VIEW) {
            autoAdvanceIntervalId = setInterval(autoAdvanceCarousel, ORGANIZERS_AUTO_ADVANCE_DELAY);
        }
    });
    
    // Initialize carousel display
    updateCarousel();
    
    // Start auto-advance if enough slides
    if (slides.length > ORGANIZERS_ITEMS_PER_VIEW) {
        if (autoAdvanceIntervalId) clearInterval(autoAdvanceIntervalId); // Clear any existing
        autoAdvanceIntervalId = setInterval(autoAdvanceCarousel, ORGANIZERS_AUTO_ADVANCE_DELAY);
    }
    
    // Touch/swipe support
    let startX = 0;
    let endX = 0;
    
    carousel.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
    });
    
    carousel.addEventListener('touchend', function(e) {
        endX = e.changedTouches[0].clientX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = startX - endX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                slideCarousel(1); // Swipe left, go to next
            } else {
                slideCarousel(-1); // Swipe right, go to previous
            }
        }
    }
}

function slideCarousel(direction) {
    const carousel = document.getElementById('organizersCarousel');
    const slides = carousel.querySelectorAll('.organizer-slide');

    // If not enough slides to scroll (e.g., 3 slides, 3 per view), do nothing.
    if (!carousel || slides.length <= ORGANIZERS_ITEMS_PER_VIEW) return; 
    
    currentSlide += direction;
    const maxSlideIndex = slides.length - ORGANIZERS_ITEMS_PER_VIEW;

    if (direction === 1) { // Moving next
        if (currentSlide > maxSlideIndex) {
            currentSlide = 0; // Loop to start
        }
    } else { // Moving previous
        if (currentSlide < 0) {
            currentSlide = maxSlideIndex; // Loop to end
        }
    }
    updateCarousel();
}

function updateCarousel() {
    const carousel = document.getElementById('organizersCarousel');
    if (!carousel) return; // Guard clause
    const slides = carousel.querySelectorAll('.organizer-slide');
    if (slides.length === 0) return; // Guard clause

    const slideWidthPercentage = 100 / ORGANIZERS_ITEMS_PER_VIEW;
    
    // Ensure currentSlide is within valid range before transform
    // This logic is mostly handled by slideCarousel, but a safeguard here is fine.
    const maxSlideIndex = Math.max(0, slides.length - ORGANIZERS_ITEMS_PER_VIEW);
    currentSlide = Math.max(0, Math.min(currentSlide, maxSlideIndex));

    const translateXValue = -currentSlide * slideWidthPercentage;
    carousel.style.transform = `translateX(${translateXValue}%)`;
}

function autoAdvanceCarousel() {
    const carousel = document.getElementById('organizersCarousel');
    if (carousel && !document.hidden) { // Check if tab is active
        slideCarousel(1); // Advance by 1 slide position
    }
}

// Modal functionality
function setupModals() {
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('sessionModal');
        if (e.target === modal) {
            closeSessionModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSessionModal();
        }
    });
}

function openSessionModal(sessionId) {
    const modal = document.getElementById('sessionModal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    
    // Get session data
    const sessionInfo = getSessionInfo(sessionId);
    
    if (sessionInfo) {
        modalTitle.textContent = sessionInfo.title;
        modalBody.innerHTML = sessionInfo.content;
        
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        // Store current session for sharing
        window.currentSessionData = sessionInfo;
        
        // Focus management
        const closeButton = modal.querySelector('.modal-close');
        if (closeButton) closeButton.focus();
    }
}

function closeSessionModal() {
    const modal = document.getElementById('sessionModal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto';
    
    // Clear current session data
    window.currentSessionData = null;
}

function getSessionInfo(sessionId) {
    const sessions = {
        
    };
    
    return sessions[sessionId] || null;
}

// Session data setup
function setupSessionData() {
    // This would typically come from a data source
    // For now, we'll use the existing HTML content
    sessionData = {
        keynote1: { title: 'The Future of Documentation in Africa', speaker: 'Dr. Sarah Johnson' },
        workshop1: { title: 'Building Better API Documentation', speaker: 'Michael Chen' },
        workshop2: { title: 'Documentation Localization & Accessibility', speaker: 'Amina Hassan' },
        panel1: { title: 'Building Documentation Communities in Open Source', speaker: 'Panel Discussion' },
        closing1: { title: 'Closing Ceremony & Community Commitment', speaker: 'Community' }
    };
}

// Social sharing functionality
function shareEvent() {
    const eventData = {
        title: 'WTD Kenya 2025 - Write The Docs Conference',
        text: 'Join us at Write The Docs Kenya 2025 for an inspiring conference about documentation, technical writing, and community building. #WTDKenya2025 @wtd_kenya',
        url: window.location.href
    };
    
    showSocialShareModal(eventData);
}

function shareSession(platform) {
    if (!window.currentSessionData) return;
    
    const session = window.currentSessionData;
    const baseText = `${session.title} at ${session.speaker} - WTD Kenya 2025 #WTDKenya2025 @wtd_kenya`;
    const url = window.location.href;
    
    let shareUrl = '';
    
    switch (platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(baseText)}&url=${encodeURIComponent(url)}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(session.title)}&summary=${encodeURIComponent(baseText)}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(baseText)}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

function fallbackShare(data) {
    // Create a temporary input to copy to clipboard
    const tempInput = document.createElement('input');
    tempInput.value = `${data.text} ${data.url}`;
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        document.execCommand('copy');
        showNotification('Event details copied to clipboard!');
    } catch (err) {
        showNotification('Unable to share. Please copy the URL manually.');
    }
    
    document.body.removeChild(tempInput);
}

// Calendar functionality
function addToCalendar(title, startTime, endTime) {
    const event = {
        title: title,
        start: new Date(startTime),
        end: new Date(endTime),
        description: `WTD Kenya 2025 Session: ${title}. Join us for this exciting session! #WTDKenya2025`,
        location: 'Nairobi, Kenya'
    };
    
    // Generate calendar URLs
    const googleUrl = generateGoogleCalendarUrl(event);
    const outlookUrl = generateOutlookCalendarUrl(event);
    const icsData = generateICSData(event);
    
    // Create options modal
    showCalendarOptions(googleUrl, outlookUrl, icsData, title);
}

function generateGoogleCalendarUrl(event) {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const params = new URLSearchParams({
        text: event.title,
        dates: `${formatDateForGoogle(event.start)}/${formatDateForGoogle(event.end)}`,
        details: event.description,
        location: event.location
    });
    
    return `${baseUrl}&${params.toString()}`;
}

function generateOutlookCalendarUrl(event) {
    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
    const params = new URLSearchParams({
        subject: event.title,
        startdt: event.start.toISOString(),
        enddt: event.end.toISOString(),
        body: event.description,
        location: event.location
    });
    
    return `${baseUrl}?${params.toString()}`;
}

function generateICSData(event) {
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//WTD Kenya 2025//Event Calendar//EN',
        'BEGIN:VEVENT',
        `DTSTART:${formatDateForICS(event.start)}`,
        `DTEND:${formatDateForICS(event.end)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description}`,
        `LOCATION:${event.location}`,
        `UID:${Date.now()}@wtdkenya2025.com`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
}

function formatDateForGoogle(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatDateForICS(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function showCalendarOptions(googleUrl, outlookUrl, icsData, eventTitle) {
    const modal = document.createElement('div');
    modal.className = 'modal calendar-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add to Calendar</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>Choose your preferred calendar application:</p>
                <div class="calendar-options">
                    <a href="${googleUrl}" target="_blank" class="calendar-btn">
                        <i class="fab fa-google"></i>
                        Google Calendar
                    </a>
                    <a href="${outlookUrl}" target="_blank" class="calendar-btn">
                        <i class="fab fa-microsoft"></i>
                        Outlook
                    </a>
                    <a href="${icsData}" download="${eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics" class="calendar-btn">
                        <i class="fas fa-download"></i>
                        Download ICS
                    </a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.classList.add('active');
    
    // Close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Scroll effects
function setupScrollEffects() {
    // Parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const heroImage = document.querySelector('.hero-image');
        
        if (heroImage) {
            heroImage.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
        
        // Animate elements on scroll
        animateOnScroll();
    });
}

function animateOnScroll() {
    const elements = document.querySelectorAll('.session-card, .speaker-card, .partner-logo');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('animate-in');
        }
    });
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function fadeIn(element) {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let opacity = 0;
    const timer = setInterval(function() {
        if (opacity >= 1) {
            clearInterval(timer);
        }
        element.style.opacity = opacity;
        opacity += 0.1;
    }, 25);
}

function fadeOut(element) {
    let opacity = 1;
    const timer = setInterval(function() {
        if (opacity <= 0) {
            clearInterval(timer);
            element.style.display = 'none';
        }
        element.style.opacity = opacity;
        opacity -= 0.1;
    }, 25);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: hsl(var(--primary));
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add CSS for animations
const animationStyles = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }
    
    .calendar-modal .calendar-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .calendar-btn {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        border: 2px solid hsl(var(--border));
        border-radius: var(--border-radius-md);
        text-decoration: none;
        color: hsl(var(--text-primary));
        transition: all var(--transition-fast);
    }
    
    .calendar-btn:hover {
        background-color: hsl(var(--primary));
        border-color: hsl(var(--primary));
        color: white;
    }
    
    .modal-session-content .modal-speaker {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid hsl(var(--border));
    }
    
    .modal-speaker-image {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
    }
    
    .modal-session-details {
        background-color: hsl(var(--background));
        padding: 1rem;
        border-radius: var(--border-radius-md);
        margin-bottom: 1.5rem;
    }
    
    .modal-session-details p {
        margin-bottom: 0.5rem;
    }
    
    .modal-description h4,
    .modal-speaker-bio h4 {
        color: hsl(var(--primary));
        margin-bottom: 1rem;
        margin-top: 1.5rem;
    }
    
    .modal-description ul {
        padding-left: 1.5rem;
        margin-bottom: 1rem;
    }
    
    .modal-description li {
        margin-bottom: 0.5rem;
    }
    
    .panel-members {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .panel-member {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background-color: hsl(var(--background));
        border-radius: var(--border-radius-md);
    }
    
    .panel-member img {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        object-fit: cover;
    }
    
    .panel-member h5 {
        margin-bottom: 0.25rem;
        color: hsl(var(--text-primary));
    }
    
    .panel-member p {
        font-size: var(--font-size-sm);
        color: hsl(var(--text-secondary));
        margin: 0;
    }
`;

// Inject animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);

// Service Worker registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed');
            });
    });
}

// Performance monitoring
window.addEventListener('load', function() {
    // Log performance metrics
    if (window.performance) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
    }
});

// Error handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    // In production, you might want to send this to an error tracking service
});

// Accessibility improvements
document.addEventListener('keydown', function(e) {
    // Skip to main content with keyboard
    if (e.key === 'Tab' && !e.shiftKey && document.activeElement === document.body) {
        const skipLink = document.createElement('a');
        skipLink.href = '#main';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: hsl(var(--primary));
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 9999;
        `;
        
        skipLink.addEventListener('focus', function() {
            this.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', function() {
            this.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
});

// Social sharing functions
function showSocialShareModal(data) {
    const modal = document.createElement('div');
    modal.className = 'social-share-modal';
    modal.innerHTML = `
        <div class="social-share-content">
            <div class="social-share-header">
                <h3>Share Event</h3>
                <button class="social-share-close" onclick="closeSocialShareModal()">&times;</button>
            </div>
            <div class="social-share-body">
                <div class="social-platforms">
                    <button class="social-btn linkedin" onclick="shareToLinkedIn('${encodeURIComponent(data.text)}', '${encodeURIComponent(data.url)}')">
                        <i class="fab fa-linkedin-in"></i>
                        LinkedIn
                    </button>
                    <button class="social-btn twitter" onclick="shareToTwitter('${encodeURIComponent(data.text)}', '${encodeURIComponent(data.url)}')">
                        <i class="fab fa-x-twitter"></i>
                        X (Twitter)
                    </button>
                    <button class="social-btn whatsapp" onclick="shareToWhatsApp('${encodeURIComponent(data.text)}', '${encodeURIComponent(data.url)}')">
                        <i class="fab fa-whatsapp"></i>
                        WhatsApp
                    </button>
                    <button class="social-btn instagram" onclick="copyForInstagram('${encodeURIComponent(data.text)}')">
                        <i class="fab fa-instagram"></i>
                        Instagram
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeSocialShareModal() {
    const modal = document.querySelector('.social-share-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

function shareToLinkedIn(text, url) {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
    closeSocialShareModal();
}

function shareToTwitter(text, url) {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    closeSocialShareModal();
}

function shareToWhatsApp(text, url) {
    const whatsappUrl = `https://wa.me/?text=${text}%20${url}`;
    window.open(whatsappUrl, '_blank');
    closeSocialShareModal();
}

function copyForInstagram(text) {
    const instagramText = decodeURIComponent(text) + '\n\nLink in bio! #WTDKenya2025 @wtd_kenya';
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(instagramText).then(() => {
            showNotification('Text copied for Instagram! Add the link in your bio.');
        });
    } else {
        fallbackCopy(instagramText);
    }
    closeSocialShareModal();
}

function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showNotification('Text copied to clipboard!');
}
