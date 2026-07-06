/**
 * Analytics & Ad Rules Event Tracker
 * Tracks game opens, game exits, and level completions.
 * Rules: Triggers initial ad display every 3 level_start events.
 *
 * URL Parameter Control:
 *   Desktop     → Ads enabled by default (always ON)
 *   Mobile      → Ads disabled by default (OFF), unless ?mobile=true is set
 */
export function logAnalyticsEvent(eventName, params = {}) {
    let adTriggered = false;

    if (eventName === 'level_start') {
        const levelId = params && params.level_index !== undefined ? params.level_index : 'general';
        const storageKey = 'ws_level_starts_count';
        const count = parseInt(localStorage.getItem(storageKey) || '0') + 1;
        localStorage.setItem(storageKey, count.toString());
        console.log(`%c[Analytics] level_start (Level ${typeof levelId === 'number' ? levelId + 1 : levelId}) count: ${count}`, 'color: #38bdf8; font-weight: bold;');

        const isMobileView = typeof window !== 'undefined' && (
            /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS/i.test(navigator.userAgent) ||
            window.innerWidth < 768
        );

        if (count % 3 === 0) {
            const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const isExplicitlyDisabled = urlParams ? (urlParams.get('mobile') === 'false' || urlParams.get('desktop') === 'false') : false;

            if (isExplicitlyDisabled) {
                console.log('%c[Analytics] Ad trigger suppressed: Ads explicitly disabled via URL parameter (?mobile=false or ?desktop=false)', 'color: #ff4a4a; font-weight: bold;');
            } else {
                adTriggered = true;
                console.log('%c[Analytics] Ad trigger active: Ads enabled', 'color: #4caf50; font-weight: bold;');
            }
        }
    }

    // Push to dataLayer for GA4 / Custom Backend scalability
    if (typeof window !== 'undefined') {
        if (!window.dataLayer) {
            window.dataLayer = [];
        }
        window.dataLayer.push({
            event: eventName,
            params,
            timestamp: new Date().toISOString()
        });

        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, params);
        }
    }

    console.log(`%c[Analytics] Event Pushed: ${eventName} | Params: ${JSON.stringify(params)}`, 'color: #c678dd;');

    if (adTriggered && typeof window !== 'undefined' && typeof window.show_initial_ad === 'function') {
        window.show_initial_ad();
    }
}